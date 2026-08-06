// src/lib/lanes/online/notLanguage.ts — CÁI NÀY KHÔNG PHẢI TIẾNG NGƯỜI.
//
// Hai chốt chặn, cùng một câu hỏi: chuỗi này có phải một câu ai đó đã nói không? Không hỏi nó thuộc tiếng
// nào — việc đó của `directionRouter.ts`. Chỉ hỏi có đáng đưa lên tường và đọc lên loa không.
//
// Cả hai đều đo được từ bản ghi thật, không phải phòng xa. Số liệu dưới đây lấy trên TOÀN BỘ kho log của
// máy này (2659 dòng, mọi buổi đã ghi tính tới 06/08/2026), không phải một phiên.
//
// ── 1. KHÔNG CÓ CHỮ NÀO ────────────────────────────────────────────────────────────────────────────────
//
// Phiên 14:47 kết thúc bằng một dòng có nội dung đúng bằng một dấu nháy kép:
//
//     #62 "Cái chức danh"        #63 "tôi được là cái gì?"        #64 "\""
//
// Người nói: «Và nó không còn giới hạn cái chuyện là: "Cái lương tôi bao nhiêu? … Cái chức danh tôi được
// là cái gì?"». Nấc "nhả câu sớm" cắt ở mỗi dấu hỏi, còn dấu nháy ĐÓNG thì tới trong mảnh sau — nên nó ở
// lại một mình và thành một "câu" riêng: một dòng trên tường khán giả, một lượt gọi bộ dịch, một lượt đọc
// lên loa, cho đúng một ký tự dấu.
//
// VÌ SAO KHÔNG ĐẶT SÀN THEO ĐỘ DÀI — đây là chỗ tôi đã suýt làm sai. Cùng phiên đó có 7 dòng dưới 15 chữ,
// và nếu chặn theo độ dài thì mất luôn:
//
//     #14  「うん。」 → "Ừm."        ← một tiếng đáp thật, trong một buổi phỏng vấn nó LÀ một lượt nói
//
// Nên luật là "không có lấy MỘT chữ cái hay chữ số nào", chứ không phải "ngắn quá". Dòng `"` có 0 chữ;
// dòng 「うん。」 có 2. Một cái là rác, một cái là người ta đang nói.
//
// ── 2. CHÁO ÂM TIẾT ────────────────────────────────────────────────────────────────────────────────────
//
// Khi tiếng vào đổi ngôn ngữ, máy nghe còn kẹt ở ngôn ngữ cũ và nó PHIÊN ÂM tiếng mới bằng bảng chữ cũ.
// Phiên 14:47, đúng chỗ nối giữa đoạn tiếng Nhật và đoạn tiếng Việt, ba dòng liền:
//
//     #40  えっと、うーん、ラ-、ト-、イ-、カ-ン-ベ-、サ-オ-、テ-ミ-…      (20 nhóm gạch)
//     #41  …ドゥン-、ラ-、ト-ア-ッ-ケ-オ-。                              (25 nhóm gạch)
//     #42  チ-イ-ラ-モ-、ケ-イ-、ケ-イ-、ケ-イ-、ケ-イ-…                  (40 nhóm gạch)
//
// Ba câu, khoảng 15 giây, dịch ra thành "la-, to-, i-, ka-n-be-" rồi đọc lên loa. Không lớp nào bắt được:
// nhãn máy nghe nói `ja`, mặt chữ là kana nên bằng chứng chữ CŨNG nói `ja`. Mọi lớp đồng thuận, mọi lớp
// đều sai — vì cả hai đều đọc cùng một thứ do chính máy nghe viết ra.
//
// Chốt này không sửa chiều. Nó chỉ nói: chuỗi này không phải chữ, đừng đưa đi đâu cả.
//
// NGƯỠNG, VÀ VÌ SAO PHẢI HAI ĐIỀU KIỆN CHỨ KHÔNG MỘT — đo trên cả 2659 dòng:
//
//     dòng THẬT nhiều gạch nhất:   5 nhóm   ("それですね。はい。で、えーと、私は、お-- ついた-- あ、この辺りは…")
//     ba dòng cháo:               20, 25, 40 nhóm
//
//   · chỉ đếm SỐ NHÓM thì một dòng dài lê thê có 8 chỗ lắp bắp rải rác sẽ bị oan → cần thêm tỉ lệ;
//   · chỉ đo TỈ LỆ thì bắt nhầm ngay: "Thì em cứ l-l-lên-" có tỉ lệ 0,167 — cao hơn ngưỡng — mà đó là
//     một người đang nói lắp thật.
//
// Nên phải khớp CẢ HAI. Với ngưỡng dưới đây, trên toàn bộ 2659 dòng chỉ đúng ba dòng cháo bị bắt, không
// một dòng thật nào. Khoảng cách giữa 5 và 20 là bốn lần — không phải một ngưỡng đặt sát mép.
//
// ĐẾM THEO NHÓM, KHÔNG THEO TỪNG DẤU: máy nghe viết lắp bắp bằng gạch ĐÔI ("và khi mà-- một khi mà"), nên
// đếm lẻ từng dấu sẽ thổi phồng đúng những dòng thật cần tha. Cháo thì dùng gạch ĐƠN sau mỗi âm tiết, nên
// đếm theo nhóm không hề làm nó nhẹ đi.
//
// KHÔNG tính 「ー」 (U+30FC): đó là dấu kéo dài của tiếng Nhật, có trong コーヒー, サービス — chữ thật. Ba dòng
// cháo đo được dùng gạch ASCII `-` (U+002D). Nhầm hai thứ này là xoá tiếng Nhật thật.
//
// ── CHÁO KHÔNG CÓ GẠCH THÌ SAO — đã hỏi, đã đo, và câu trả lời là ĐỪNG ─────────────────────────────────
//
// Chốt này chỉ bắt được dạng có gạch nối. Dạng không gạch — một dải katakana dài mà không có lấy một chữ
// hiragana nào — về lý là bắt được, vì hiragana gánh ngữ pháp tiếng Nhật nên một câu tiếng Nhật thật
// không thể vắng nó (cùng lý lẽ với `latinRunWeak` trong `directionRouter.ts`).
//
// Nhưng quét cả 2659 dòng: đúng MỘT dòng có ≥20 katakana và 0 hiragana, và nó chính là dòng cháo 40 gạch
// ở trên — đã bị bắt rồi. Dạng không gạch CHƯA TỪNG XẢY RA. Dựng chốt cho một hình dạng chưa ai thấy là
// đổi một rủi ro đo được (xoá nhầm 「コーヒーとサービス」, tên riêng, thực đơn) lấy một lợi ích tưởng tượng.
//
// Nếu về sau nó xuất hiện thật, log sẽ chỉ ra — và lúc đó mới có số để đặt ngưỡng.
//
// Pure module: không React, không fetch, không DOM, không đồng hồ.

/**
 * Bao nhiêu NHÓM gạch nối thì bắt đầu nghi là cháo âm tiết.
 *
 * Dòng thật nhiều gạch nhất trong toàn kho log là 5 nhóm; ba dòng cháo là 20, 25, 40. Lấy 8 — trên mức
 * thật đo được 60%, dưới mức cháo thấp nhất 2,5 lần.
 */
export const SOUP_MIN_GROUPS = 8;

/**
 * Và bấy nhiêu nhóm đó phải DÀY tới mức này (nhóm chia cho số ký tự).
 *
 * Một dòng 500 chữ có 8 chỗ lắp bắp rải rác là chuyện bình thường của tiếng nói (tỉ lệ ~0,016). Cháo thì
 * 0,328 trở lên. 0,15 nằm giữa, gần gấp đôi bên dưới và chưa tới một nửa bên trên.
 */
export const SOUP_MIN_RATE = 0.15;

/** Gạch nối ASCII và nguyên rộng. CỐ Ý không có 「ー」 — xem chú thích đầu tệp. */
const HYPHEN_GROUP = /[-－]+/gu;

/**
 * Chuỗi này không có lấy một chữ cái hay chữ số nào ⇒ không ai nói ra nó được.
 *
 * Dấu câu, dấu nháy, khoảng trắng, ký hiệu — bao nhiêu cũng vậy. Chỉ cần MỘT chữ là qua: 「うん。」 qua,
 * "Ừ" qua, "5" qua. Sàn thấp nhất có thể mà vẫn chặn được dòng chỉ có một dấu nháy.
 */
export function hasNoLetters(text: string): boolean {
    return !/[\p{L}\p{N}]/u.test(text);
}

/**
 * Máy nghe đang phiên âm một thứ tiếng nó không nhận ra, từng âm tiết một, ngăn bằng gạch nối.
 *
 * Phải khớp CẢ HAI điều kiện — xem chú thích đầu tệp cho lý do và cho hai ca phản chứng đo được.
 */
export function isSyllableSoup(text: string): boolean {
    const length = Array.from(text).length;
    if (!length) return false;
    const groups = (text.match(HYPHEN_GROUP) ?? []).length;
    if (groups < SOUP_MIN_GROUPS) return false;
    return groups / length >= SOUP_MIN_RATE;
}
