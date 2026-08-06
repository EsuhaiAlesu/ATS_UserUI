// tests/echoGuard.test.ts — MÁY NGHE ĐỌC LẠI ĐOẠN VỪA RỒI.
//
// Dữ liệu của bộ test này lấy NGUYÊN VĂN từ bản ghi 06/08/2026 (`online_20260806-131634.json`), phiên
// người vận hành chạy thử và báo "asr hay bị lặp". 7/60 dòng lặp = 12%, khoảng cách 1–3 dòng. Không phải
// ví dụ nghĩ ra: mỗi khẳng định dưới đây là một dòng đã thật sự lên tường hai lần.
//
// Hai lớp sẵn có đều trượt, và trượt vì lý do khác nhau:
//   · `stripPromotedPrefix` chỉ trừ trong MỘT lượt — sang lượt sau `promotedPrefix` đã bị xoá;
//   · chốt chặn cũ so `transcript === previousFinalTranscript`: sâu 1 bậc, và so BẰNG NHAU.
// Sáu trong bảy ca nằm ở khoảng cách 2–3, ca còn lại dài hơn bản cũ nên cũng không "bằng nhau".

import { describe, it, expect } from 'vitest';
import { judgeEcho, rememberEcho, ECHO_MEMORY, ECHO_MIN_CHARS, ECHO_OVERLAP_MIN_CHARS } from '../src/lib/lanes/online/echoGuard';

// ── nguyên văn từ bản ghi ────────────────────────────────────────────────────────────────────────────
const L1 = 'Hãy làm một phiên bản khác. Mình đã đi qua những cái giai đoạn để mình hiểu mình hơn.';
const L2 = 'Mình sẽ đối diện với những cái hoang mang trong một trạng thái hiểu mình hơn một chút.';
const L3 = 'Hãy làm một phiên bản khác. Mình đã đi qua những cái giai đoạn để mình hiểu mình hơn. Ừm, mình sẽ đối diện với';
const L13 = '...sẽ tạo được nhiều. Tại vì cái thời điểm đó là, đây không phải là một công việc, ừm, được coi là ổn định.';
const L7 = 'Tự tự hào hay là sự kiên trì, bất cứ điều gì.';
const L9 = 'Tự tự hào hay là sự kiên trì, bất cứ điều gì. Thì nghĩ khoai sẽ chọn trước hai viên này. Một viên màu xanh đậm';

describe('bao hàm — câu chốt lại NGUYÊN VĂN đoạn đã nhả', () => {
    it('1 · dòng 16 lặp nguyên văn dòng 13 (cách 3) — chốt chặn sâu-1 cũ không với tới', () => {
        const recent = [L13, 'Và nếu mà mẹ nhìn thấy cái điều này thì mẹ sẽ nghĩ tại sao lo cho m-mình ăn học mà mình lại đi bỏ nghề.', 'Tại vì cái việc học đại học trên Sài Gòn...'];
        const v = judgeEcho(L13, recent);
        expect(v.kind).toBe('repeat');
        expect(v.text).toBe('');
    });

    it('2 · máy nghe lùi về một đoạn NGẮN HƠN nằm gọn trong câu đã nhả ⇒ cũng là lặp', () => {
        const v = judgeEcho('Tại vì cái thời điểm đó là, đây không phải là một công việc', [L13]);
        expect(v.kind).toBe('repeat');
    });

    it('3 · khác biệt khoảng trắng không được cứu một câu lặp', () => {
        expect(judgeEcho(L13.replace(/ /g, '  '), [L13]).kind).toBe('repeat');
    });
});

describe('cắt tiền tố — câu mới NUỐT câu cũ rồi nói tiếp', () => {
    it('4 · dòng 9 = dòng 7 + phần mới ⇒ chỉ nhả phần mới', () => {
        const v = judgeEcho(L9, [L7, 'Thì nghĩ phải sẽ chọn trước hai viên này. Ừm.']);
        expect(v.kind).toBe('trimmed');
        expect(v.text).toBe('Thì nghĩ khoai sẽ chọn trước hai viên này. Một viên màu xanh đậm');
        expect(v.removedChars).toBeGreaterThan(30);
    });

    it('5 · dòng 3 nuốt dòng 1 — cắt xong phần còn lại vẫn phải là chữ đọc được, không dính liền từ', () => {
        const v = judgeEcho(L3, [L1, L2]);
        expect(v.kind).toBe('trimmed');
        expect(v.text).toBe('Ừm, mình sẽ đối diện với');
        // Cắt trên chuỗi đã bỏ khoảng trắng rồi ghép lại là tự tay dán liền hai từ. Không được có chỗ nào
        // hai từ dính vào nhau, và chữ đầu không được mất.
        expect(v.text.startsWith('Ừm')).toBe(true);
    });

    it('6 · cắt NHIỀU LẦN: một câu nuốt trọn hai câu liền trước', () => {
        const a = 'Khoai và em của khoai cũng đều đi học đại học hết.';
        const b = 'Nhưng mà đối với mẹ là đó là một sự tự hào.';
        const v = judgeEcho(`${a} ${b} Con của tui đi học đại học.`, [a, b]);
        expect(v.kind).toBe('trimmed');
        expect(v.text).toBe('Con của tui đi học đại học.');
    });

    it('7 · máy nghe SỬA một chữ trong đoạn cũ ⇒ KHÔNG cắt, giữ nguyên cả câu', () => {
        // Cắt mù là nuốt chữ, mà nuốt thì không ai thấy; lặp thì thấy được. Đây là chỗ đánh đổi có chủ ý,
        // và nó phải được ghim lại, nếu không một bản "cải tiến" sau này sẽ đổi nó mà không ai hay.
        const v = judgeEcho('Tự hào hay là sự kiên trì, bất cứ điều gì. Thì nghĩ khoai sẽ chọn.', [L7]);
        expect(v.kind).toBe('fresh');
        expect(v.text).toContain('Tự hào hay là sự kiên trì');
    });
});

describe('dấu câu do MÁY chấm vào không được cứu một câu lặp — phiên 14:43 ngày 06/08', () => {
    // Nấc "nhả câu sớm" cắt câu ở dấu chấm và CHẤM DẤU CHẤM vào chỗ cắt. Máy nghe thì đọc lại đoạn đó rồi
    // nói tiếp, nên bản sau không có dấu chấm ở giữa. Bản đầu của echoGuard chỉ bỏ qua khoảng trắng nên
    // lệch đúng một ký tự và cả câu dài lên tường lần thứ hai. Hai ca dưới đây nguyên văn từ phiên đó.
    const Q1 = 'Quyền lực mềm chính là quyền lực có thể giữ được lâu bền nhiều hơn so với các quyền lực cứng.';
    const Q2 = 'Quyền lực mềm chính là quyền lực có thể giữ được lâu bền nhiều hơn so với các quyền lực cứng về sức mạnh kinh tế hay là sức mạnh về quân sự.';

    it('16 · dấu chấm giữa câu do nhả sớm chấm vào ⇒ vẫn cắt được', () => {
        const v = judgeEcho(Q2, [Q1]);
        expect(v.kind).toBe('trimmed');
        expect(v.text).toBe('về sức mạnh kinh tế hay là sức mạnh về quân sự.');
    });

    it('17 · cặp nháy máy nghe lúc có lúc không ⇒ vẫn nhận ra là lặp', () => {
        const a = 'Và đó cũng là một trong những cái động lực khiến cho khoai cần phải tìm ra một cái hướng đi nào đó nhanh nhất để mà hoàn thành được cái cột mốc đó. Em cảm thấy ấm áp khi nghe hai chữ đủ đầy. Ừm.';
        expect(judgeEcho('Em cảm thấy ấm áp khi nghe hai chữ "đủ đầy". Ừm.', [a]).kind).toBe('repeat');
    });

    it('18 · phần đuôi cắt xong không được mở đầu bằng dấu câu thừa', () => {
        const v = judgeEcho(`${Q1} , ... về sức mạnh kinh tế.`, [Q1]);
        expect(v.kind).toBe('trimmed');
        expect(v.text).toBe('về sức mạnh kinh tế.');
    });

    it('19 · bỏ qua dấu KHÔNG được nới lỏng luật "sai một chữ thì không cắt"', () => {
        const v = judgeEcho('Quyền lực mềm chính là quyền lực có thể giữ được lâu dài nhiều hơn so với các quyền lực cứng về sức mạnh kinh tế.', [Q1]);
        expect(v.kind).toBe('fresh');
    });

    it('20 · máy nghe lắp bắp NGAY TRONG một câu thì tệp này không với tới — ghim lại giới hạn đã biết', () => {
        // Nguyên văn phiên 14:43: một dòng duy nhất chứa hai lần cùng một mệnh đề. echoGuard chỉ so câu
        // mới với các câu ĐÃ NHẢ, không bao giờ nhìn vào bên trong một câu. Ghim để đừng ai tưởng đã xong.
        const stutter = 'và trong đó có bao gồm sự theo đuổi về mặt tài chính, mưu, lưu vui. và trong đó có bao gồm sự theo đuổi về mặt tài chính, mưu lưuu.';
        expect(judgeEcho(stutter, []).kind).toBe('fresh');
    });
});

describe('chồng-đuôi — câu mới mở đầu bằng ĐUÔI của câu đã nhả', () => {
    const TAIL = 'Và đó cũng là một trong những cái động lực khiến cho khoai cần phải tìm ra một cái hướng đi nào đó nhanh nhất để mà hoàn thành được cái cột mốc đó. Em cảm thấy ấm áp khi nghe hai chữ đủ đầy. Ừm.';

    it('21 · nguyên văn phiên 14:43 — cắt tiền tố không với tới, chồng-đuôi thì với tới', () => {
        const next = 'Em cảm thấy ấm áp khi nghe hai chữ đủ đầy. Ừm. Vì trong những cái hành trình làm việc của các bạn trẻ hay là những điều mình hay nghe.';
        const v = judgeEcho(next, [TAIL]);
        expect(v.kind).toBe('trimmed');
        expect(v.text).toBe('Vì trong những cái hành trình làm việc của các bạn trẻ hay là những điều mình hay nghe.');
    });

    it('22 · mẩu chồng NGẮN thì KHÔNG cắt — người ta hay mở câu sau bằng mấy chữ vừa nói', () => {
        // "...có một cái nơi ở ở Sài Gòn này." rồi "Sài Gòn này thì..." — mẩu chồng dưới sàn ⇒ giữ nguyên.
        const v = judgeEcho('Sài Gòn này thì đắt đỏ hơn quê mình rất là nhiều.', ['Để mà có một cái nơi ở ở Sài Gòn này.']);
        expect(v.kind).toBe('fresh');
        expect(ECHO_OVERLAP_MIN_CHARS).toBeGreaterThan(ECHO_MIN_CHARS);
    });

    it('24 · máy nghe lắp bắp khác đi một chữ cái ⇒ cắt xong còn sót mẩu cụt; CỐ Ý để vậy', () => {
        // Phiên 14:43: câu trước kết bằng "mưu lưuu.", câu sau chép lại thành "mưu lưuuu." — thừa một chữ
        // cái. Mẩu chồng dừng ở "lưuu" nên đầu câu còn lại một chữ "u." lạc lõng. Muốn dọn nốt thì phải
        // xoá mù mấy chữ cái đầu câu, mà làm vậy là ăn mất "Ừ.", "Dạ." thật. Một chữ cái thừa thì NHÌN
        // THẤY và sửa được; một tiếng bị nuốt thì không ai biết. Ghim lại để đừng ai "dọn" nhầm hướng.
        const prev = 'và trong đó có bao gồm sự theo đuổi về mặt tài chính, mưu, lưu vui. và trong đó có bao gồm sự theo đuổi về mặt tài chính, mưu lưuu.';
        const v = judgeEcho('và trong đó có bao gồm sự theo đuổi về mặt tài chính, mưu lưuuu. Nhưng thật ra nó không phải là theo đuổi những điều xa xỉ.', [prev]);
        expect(v.kind).toBe('trimmed');
        expect(v.text).toBe('u. Nhưng thật ra nó không phải là theo đuổi những điều xa xỉ.');
    });

    it('23 · chồng-đuôi cũng khớp theo CHỮ, sai một chữ thì không cắt', () => {
        const next = 'Em cảm thấy ấm áp khi nghe hai từ đủ đầy. Ừm. Vì trong những cái hành trình làm việc của các bạn trẻ.';
        expect(judgeEcho(next, [TAIL]).kind).toBe('fresh');
    });
});

describe('sàn an toàn — câu ngắn lặp lại là chuyện bình thường của tiếng nói', () => {
    it('8 · "Ừm." không bao giờ được dùng làm dao cắt câu sau', () => {
        const v = judgeEcho('Ừm. Lúc này anh có thể chọn những viên sỏi.', ['Ừm.']);
        expect(v.kind).toBe('fresh');
        expect(v.text.startsWith('Ừm.')).toBe(true);
    });

    it('9 · và một câu ngắn lặp lại thật thì vẫn được nhả, không bị bỏ', () => {
        for (const t of ['Ừm.', 'Vâng ạ.', 'Dạ không.']) {
            expect(judgeEcho(t, [t]).kind, t).toBe('fresh');
        }
        expect(ECHO_MIN_CHARS).toBeGreaterThanOrEqual(8);
    });

    it('10 · bộ nhớ rỗng ⇒ không đụng gì vào câu', () => {
        expect(judgeEcho(L1, [])).toEqual({ kind: 'fresh', text: L1, removedChars: 0 });
    });

    it('11 · câu rỗng không làm nổ gì cả', () => {
        expect(judgeEcho('   ', [L1]).kind).toBe('fresh');
    });
});

describe('bộ nhớ ngắn', () => {
    it('12 · giữ đúng N câu gần nhất, cũ nhất rơi ra', () => {
        let mem: string[] = [];
        for (let i = 1; i <= ECHO_MEMORY + 3; i += 1) mem = rememberEcho(mem, `câu số ${i}`);
        expect(mem).toHaveLength(ECHO_MEMORY);
        expect(mem[0]).toBe(`câu số ${4}`);
        expect(mem.at(-1)).toBe(`câu số ${ECHO_MEMORY + 3}`);
    });

    it('13 · đủ sâu cho ca xa nhất đo được (khoảng cách 3)', () => {
        expect(ECHO_MEMORY).toBeGreaterThanOrEqual(4);
    });

    it('14 · không sửa mảng đang có — một bản ghi cũ không được đổi sau lưng', () => {
        const before = rememberEcho([], L1);
        const after = rememberEcho(before, L2);
        expect(before).toEqual([L1]);
        expect(after).toEqual([L1, L2]);
    });

    it('15 · câu rỗng không chiếm chỗ trong bộ nhớ', () => {
        expect(rememberEcho([L1], '  ')).toEqual([L1]);
    });
});
