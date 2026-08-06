// src/lib/lanes/online/echoGuard.ts — MÁY NGHE ĐỌC LẠI ĐOẠN VỪA RỒI.
//
// Chốt lượt (`commit`) KHÔNG xoá ngữ cảnh của máy nghe. Nó đóng một lượt, nhưng lượt kế tiếp có thể mở ra
// bằng chính những chữ vừa đóng lại, rồi nói tiếp. Nhìn từ hội trường: một câu đã lên tường, đã được đọc
// lên loa, rồi ba câu sau nó lên tường lần nữa — lần này nằm trong một khối dài hơn.
//
// Đo được, không phải phỏng đoán. Bản ghi 06/08 (`online_20260806-131634.json`, 60 dòng) có 7 dòng lặp,
// tức 12%, khoảng cách từ 1 tới 3 dòng:
//
//     dòng 3  = dòng 1 + dòng 2 + phần mới     dòng 16 = dòng 13, nguyên văn
//     dòng 9  = dòng 7 + phần mới              dòng 17 = dòng 14, nguyên văn
//
// VÌ SAO HAI LỚP SẴN CÓ ĐỀU TRƯỢT:
//
//   · `stripPromotedPrefix` chỉ trừ TRONG MỘT LƯỢT. `promotedPrefix` là tiền tố của một lượt cụ thể và bị
//     xoá ngay khi lượt đó chốt — đúng, nhưng nó không nói gì về lượt SAU.
//   · chốt chặn lặp cũ so `transcript === previousFinalTranscript`: MỘT biến (sâu đúng 1 bậc) và MỘT phép
//     so BẰNG NHAU. Sáu trong bảy ca trên nằm ở khoảng cách 2–3, còn ca duy nhất ở khoảng cách 1 cũng lọt
//     vì bản mới DÀI HƠN bản cũ chứ không giống hệt.
//
// Nên tệp này đổi hai thứ, đúng hai thứ đó: nhớ NHIỀU câu, và so theo BAO HÀM thay vì bằng nhau.
//
// LUẬT AN TOÀN — cắt mù là nuốt chữ, và nuốt thì không ai thấy. Chỉ cắt khi khớp CHÍNH XÁC theo CHỮ. Máy
// nghe chép lại đoạn cũ có SỬA một chữ ⇒ không khớp ⇒ giữ nguyên cả câu. Đó là lặp một lần trên tường, và
// lặp thì nhìn thấy được. Đổi lấy cái thấy được là cố ý, giống hệt lý lẽ đã viết ở `stripPromotedPrefix`.
//
// KHỚP THEO CHỮ, KHÔNG THEO DẤU — đo được ở phiên 14:43 ngày 06/08:
//
//     đã nhả:  "...so với các quyền lực cứng."
//     chốt sau: "...so với các quyền lực cứng về sức mạnh kinh tế hay là sức mạnh về quân sự."
//
// Bản đầu của tệp này chỉ bỏ qua khoảng trắng, nên nó dừng ngay ở dấu chấm: câu đã nhả có "cứng." còn câu
// sau có "cứng về" — lệch một ký tự, và cả câu dài lên tường lần thứ hai. Dấu chấm đó KHÔNG do người nói
// mà do chính nấc "nhả câu sớm" chấm vào lúc cắt. Cùng phiên còn một ca nữa: `hai chữ "đủ đầy"` với cặp
// nháy, so với `hai chữ đủ đầy` không nháy. Nên phép so bỏ qua luôn dấu câu và dấu nháy — chỉ chữ mới
// tính. Bỏ qua dấu KHÔNG nới lỏng luật an toàn ở trên: sai một CHỮ thì vẫn không cắt.
//
// Pure module: không React, không fetch, không DOM, không đồng hồ.

/** Nhớ bao nhiêu câu đã nhả. Bản ghi 06/08 có ca xa nhất là 3; lấy gấp đôi cho chắc. */
export const ECHO_MEMORY = 6;

/**
 * Đoạn trùng phải dài bằng này (đã bỏ khoảng trắng và dấu câu) mới được coi là tiếng vọng.
 *
 * Dưới ngưỡng thì trùng nhau là chuyện bình thường của tiếng nói: "Ừm.", "Vâng ạ.", "Dạ không." lặp lại
 * hàng chục lần trong một buổi và mỗi lần đều là một lần người ta thật sự nói. Bằng đúng con số của chốt
 * chặn cũ (`REPEAT_GUARD_MIN_CHARS`), để việc nới rộng này không kéo theo một ngưỡng thứ hai phải chỉnh.
 */
export const ECHO_MIN_CHARS = 12;

/**
 * Sàn RIÊNG, cao hơn, cho phép cắt "đuôi câu cũ = đầu câu mới".
 *
 * Cắt tiền tố thì cả câu cũ phải nằm gọn ở đầu câu mới — trùng cỡ đó gần như chắc chắn là máy đọc lại.
 * Cắt chồng-đuôi thì chỉ cần một MẨU cuối của câu cũ khớp đầu câu mới, mà người ta vẫn hay bắt đầu câu
 * sau bằng chính mấy chữ vừa nói ("...ở Sài Gòn này. Sài Gòn này thì..."). Nên mẩu đó phải dài gấp đôi
 * mới được động dao: dưới ngưỡng đó thì thà để lặp một lần trên tường còn hơn nuốt chữ người nói.
 */
export const ECHO_OVERLAP_MIN_CHARS = 24;

export interface EchoVerdict {
    /**
     * `fresh`   — không dính gì tới các câu đã nhả; dùng nguyên văn.
     * `trimmed` — phần ĐẦU trùng câu cũ đã bị trừ; phần đuôi là chữ mới, vẫn phải nhả.
     * `repeat`  — cả câu nằm gọn trong một câu đã nhả; không còn gì mới, bỏ hẳn.
     */
    kind: 'fresh' | 'trimmed' | 'repeat';
    /** Chữ còn lại để dùng. Rỗng khi `repeat`. */
    text: string;
    /** Số ký tự (đã bỏ khoảng trắng) bị trừ đi — để đọc log, không để đoán. */
    removedChars: number;
}

/**
 * Ký tự KHÔNG tính khi so hai câu: khoảng trắng, dấu câu, dấu nháy — nửa rộng lẫn nguyên rộng.
 *
 * Máy nghe tự thêm/bớt những thứ này giữa hai lần chép cùng một đoạn (xem chú thích đầu tệp), nên để
 * chúng dự phần vào phép so là tự làm hỏng phép so.
 */
const SOFT = /[\s.,;:!?…·、。，；：！？"'“”‘’「」『』]/u;

/** Bỏ hết ký tự mềm — dùng ĐỂ SO và ĐỂ ĐO ĐỘ DÀI, không bao giờ dùng làm chữ nhả ra. */
const bare = (s: string): string => Array.from(s).filter((c) => !SOFT.test(c)).join('');

/** Dấu thừa còn sót ở đầu phần đuôi sau khi cắt. Không đụng dấu nháy: nháy mở đầu là chữ thật. */
const LEADING_JUNK = /^[\s.,;:!?…·、。，；：！？]+/u;

/**
 * `text` có mở đầu bằng `head` không, nếu bỏ qua mọi khác biệt về khoảng trắng và dấu câu?
 *
 * Trả về vị trí TRONG `text` ngay sau phần khớp, hoặc -1. Phải đi từng ký tự chứ không so hai chuỗi đã
 * lọc, vì cái cần cuối cùng là một vị trí cắt trên chuỗi GỐC — cắt trên chuỗi đã lọc rồi ghép lại là tự
 * tay dán liền hai từ.
 */
function prefixEnd(text: string, head: string): number {
    let i = 0;
    let j = 0;
    while (j < head.length) {
        while (j < head.length && SOFT.test(head[j])) j += 1;
        if (j >= head.length) break;
        while (i < text.length && SOFT.test(text[i])) i += 1;
        if (i >= text.length || text[i] !== head[j]) return -1;
        i += 1;
        j += 1;
    }
    return i;
}

/** Vị trí trong `text` ngay sau ký tự-CHỮ thứ `count` (ký tự mềm không đếm). */
function contentIndex(text: string, count: number): number {
    let seen = 0;
    for (let i = 0; i < text.length; i += 1) {
        if (SOFT.test(text[i])) continue;
        seen += 1;
        if (seen === count) return i + 1;
    }
    return text.length;
}

/**
 * ĐUÔI của `head` có trùng ĐẦU của `text` không — mẩu trùng dài nhất, và phải dài ít nhất `floor` chữ.
 *
 * Ca đo được ở phiên 14:43: câu đã nhả kết thúc bằng "Em cảm thấy ấm áp khi nghe hai chữ đủ đầy. Ừm." và
 * câu sau MỞ ĐẦU bằng đúng chừng đó rồi mới nói tiếp. Cắt tiền tố không với tới, vì cả câu cũ không nằm ở
 * đầu câu mới — chỉ có cái đuôi của nó nằm ở đó.
 *
 * Trả về vị trí cắt trên chuỗi GỐC, hoặc -1.
 */
function overlapEnd(text: string, head: string, floor: number): number {
    const bareText = bare(text);
    const bareHead = bare(head);
    const max = Math.min(bareText.length, bareHead.length);
    for (let k = max; k >= floor; k -= 1) {
        if (bareHead.endsWith(bareText.slice(0, k))) return contentIndex(text, k);
    }
    return -1;
}

/**
 * Câu vừa chốt có phải tiếng vọng của những câu đã nhả không.
 *
 * `recent` xếp theo thứ tự nhả, cũ trước mới sau. Cắt LẶP LẠI cho tới khi không cắt được nữa: bản ghi
 * 06/08 có dòng nuốt trọn HAI dòng liền trước nó, nên cắt một lần là vẫn còn lặp một nửa.
 */
export function judgeEcho(
    text: string,
    recent: readonly string[],
    minChars: number = ECHO_MIN_CHARS,
): EchoVerdict {
    const original = text.trim();
    if (!original) return { kind: 'fresh', text: '', removedChars: 0 };

    // Chỉ những câu cũ ĐỦ DÀI mới được quyền cắt. Một câu cũ ngắn ("Ừm.") mà được dùng làm dao thì nó là
    // tiền tố của gần như mọi thứ, và mỗi lần cắt là một lần nuốt mất chữ đầu của câu mới.
    const knives = recent.map((r) => r.trim()).filter((r) => bare(r).length >= minChars);
    if (!knives.length) return { kind: 'fresh', text: original, removedChars: 0 };

    const startChars = bare(original).length;
    let cur = original;
    let cut = true;

    while (cut && cur) {
        cut = false;
        // BAO HÀM trước: cả câu này nằm gọn trong một câu đã nhả ⇒ không còn gì mới. Đây là ca chiếm đa số
        // trong bản ghi (máy nghe chốt lại NGUYÊN VĂN đoạn cũ), và nó phải được hỏi trước phép cắt tiền tố
        // — cắt xong mới phát hiện chẳng còn gì thì đã đi qua một vòng vô ích.
        const bareCur = bare(cur);
        if (bareCur.length >= minChars && knives.some((k) => bare(k).includes(bareCur))) {
            return { kind: 'repeat', text: '', removedChars: startChars };
        }
        for (const knife of knives) {
            // Tiền tố trước, chồng-đuôi sau: tiền tố là ca chặt chẽ hơn (cả câu cũ nằm gọn ở đầu câu mới)
            // nên phải được thử trước, và nó có sàn thấp hơn.
            let end = prefixEnd(cur, knife);
            if (end < 0) end = overlapEnd(cur, knife, Math.max(minChars, ECHO_OVERLAP_MIN_CHARS));
            if (end < 0) continue;
            cur = cur.slice(end).replace(LEADING_JUNK, '').trim();
            cut = true;
            break;
        }
    }

    const removed = startChars - bare(cur).length;
    if (!cur) return { kind: 'repeat', text: '', removedChars: startChars };
    if (!removed) return { kind: 'fresh', text: original, removedChars: 0 };
    return { kind: 'trimmed', text: cur, removedChars: removed };
}

/** Ghi câu vừa nhả vào bộ nhớ ngắn, cũ nhất rơi ra. Trả về mảng MỚI (không sửa mảng đang có). */
export function rememberEcho(recent: readonly string[], text: string, max: number = ECHO_MEMORY): string[] {
    const value = text.trim();
    if (!value) return recent.slice();
    return [...recent, value].slice(-max);
}
