// tests/sourceAttribution.test.ts — CÂU VỪA RỒI VÀO MÁY BẰNG CỔNG NÀO.
//
// Lớp này không đoán ngôn ngữ. Nó trả lời một câu hỏi vật lý: trong khoảng thời gian của câu vừa chốt,
// đường nào có tiếng — micro trong phòng, hay tiếng đang phát ra từ chính máy này (Teams/Zoom).
//
// Vì sao đáng có một bộ test riêng: đây là bằng chứng MẠNH NHẤT trong cả đường ống (router đặt nó trên
// mọi thứ, chỉ dưới khoá chương trình), nên một lỗi ở đây không hiện ra thành "máy đoán sai một câu" mà
// thành "cả buổi dịch ngược, rất tự tin". Ba thứ phải đúng:
//
//   1. LUẬT BẤT ĐỐI XỨNG. Trong phòng có tiếng vọng: đầu cầu bên kia phát ra loa rồi quay lại chính mic.
//      Nên "bên nào to hơn" là luật SAI. Đúng là: đường tiếng máy có tiếng ⇒ phía bên kia đang nói, hết,
//      vì không thứ gì trong phòng làm cho máy tính tự phát ra tiếng.
//   2. CỬA SỔ. Cửa sổ thật là từ câu chốt trước tới câu này, chặn trên 12s. Không chặn thì câu đầu phiên
//      (và câu sau một quãng im dài) sẽ tính cả tiếng của mười phút trước.
//   3. IM LẶNG THÌ NÓI KHÔNG BIẾT. Không đường nào đủ tiếng ⇒ `null`, để phía gọi rơi về cách đoán cũ.
//      Bịa một câu trả lời ở đây là bịa ra bằng chứng mạnh nhất bảng.

import { describe, it, expect } from 'vitest';
import {
    createSourceAttributor,
    SOURCE_MIN_VOICED_MS,
    SOURCE_WINDOW_MAX_MS,
} from '../src/lib/lanes/online/sourceAttribution';

/** Một gói tiếng ~256ms. `mic`/`sys` = số mili-giây CÓ TIẾNG đo được trong gói đó, từng đường. */
const PACKET_MS = 256;

/** Rải `n` gói liên tiếp từ mốc `at`, mỗi gói mang cùng một cặp số. Trả về mốc của gói cuối. */
function feed(
    a: ReturnType<typeof createSourceAttributor>,
    at: number,
    n: number,
    mic: number,
    sys: number,
): number {
    let t = at;
    for (let i = 0; i < n; i += 1) {
        t += PACKET_MS;
        a.observe(t, mic, sys);
    }
    return t;
}

describe('luật bất đối xứng — tiếng máy có tiếng là bằng chứng phòng KHÔNG tạo ra được', () => {
    it('1 · chỉ micro có tiếng ⇒ người trong phòng nói', () => {
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 8, PACKET_MS, 0);
        const v = a.verdictFor(1_000, end);
        expect(v?.source).toBe('mic');
        expect(v?.overlapped).toBe(false);
    });

    it('2 · chỉ đường tiếng máy có tiếng ⇒ đầu cầu bên kia nói', () => {
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 8, 0, PACKET_MS);
        expect(a.verdictFor(1_000, end)?.source).toBe('system');
    });

    it('3 · CẢ HAI cùng có tiếng ⇒ vẫn là tiếng máy, và đây là chỗ mọi luật "bên nào to hơn" chết', () => {
        // Cảnh thật: đầu cầu Nhật nói → loa Jabra phát ra → chính mic Jabra thu lại. Mic nghe được NHIỀU
        // hơn hẳn đường tiếng máy (nó thu cả tiếng vọng lẫn tiếng giấy tờ, ho, ghế kéo trong phòng), nên
        // luật tỉ lệ sẽ gán câu này cho phòng và dịch ngược nguyên lượt của khách.
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 10, PACKET_MS, 100);
        const v = a.verdictFor(1_000, end);
        expect(v?.source).toBe('system');
        expect(v?.overlapped).toBe(true);
        expect(v!.micVoicedMs).toBeGreaterThan(v!.sysVoicedMs); // mic to hơn thật, và vẫn không thắng
        expect(a.stats().overlapped).toBe(1);
    });

    it('4 · một chút tiếng lọt vào đường máy KHÔNG đủ để cướp câu — có sàn', () => {
        // Tiếng "ting" của Teams, một nhịp nhạc chờ, nửa giây ai đó bật video: chưa phải người nói.
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 10, PACKET_MS, 20); // 200ms tiếng máy, dưới sàn 300ms
        expect(a.verdictFor(1_000, end)?.source).toBe('mic');
        expect(SOURCE_MIN_VOICED_MS).toBeGreaterThanOrEqual(200);
    });
});

describe('im lặng thì nói không biết — không được bịa bằng chứng mạnh nhất bảng', () => {
    it('5 · không đường nào đủ tiếng ⇒ null, và đếm riêng ra', () => {
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 4, 10, 10);
        expect(a.verdictFor(1_000, end)).toBeNull();
        expect(a.stats().unattributed).toBe(1);
        expect(a.stats().mic + a.stats().system).toBe(0);
    });

    it('6 · chưa có gói nào (câu đầu phiên tới trước gói tiếng đầu tiên) ⇒ null, không nổ', () => {
        const a = createSourceAttributor();
        expect(a.verdictFor(0, 5_000)).toBeNull();
    });
});

describe('cửa sổ — tiếng của mười phút trước không nói gì về câu vừa rồi', () => {
    it('7 · chỉ tính từ câu chốt TRƯỚC trở đi, không tính cả buổi', () => {
        const a = createSourceAttributor();
        // Lượt 1: đầu cầu bên kia nói dài.
        const firstEnd = feed(a, 1_000, 12, 0, PACKET_MS);
        expect(a.verdictFor(1_000, firstEnd)?.source).toBe('system');
        // Lượt 2, ngay sau đó: người trong phòng đáp lại. Nếu cửa sổ không bắt đầu từ mốc chốt trước thì
        // tiếng của lượt 1 vẫn nằm trong tổng, và luật bất đối xứng sẽ gán lượt 2 cho đầu cầu bên kia.
        const secondEnd = feed(a, firstEnd, 8, PACKET_MS, 0);
        expect(a.verdictFor(firstEnd, secondEnd)?.source).toBe('mic');
    });

    it('8 · chặn trên 12s: câu sau một quãng im dài không được kéo theo tiếng của trước đó', () => {
        const a = createSourceAttributor();
        // Đầu cầu bên kia nói, rồi im rất lâu, rồi người trong phòng nói một câu ngắn.
        const talk = feed(a, 1_000, 12, 0, PACKET_MS);
        const late = talk + SOURCE_WINDOW_MAX_MS + 5_000;
        const end = feed(a, late, 8, PACKET_MS, 0);
        // `startAt` là mốc chốt trước (rất xa), nên chỉ có chặn trên mới cứu được câu này.
        expect(a.verdictFor(talk, end)?.source).toBe('mic');
        expect(SOURCE_WINDOW_MAX_MS).toBeLessThanOrEqual(20_000);
    });

    it('9 · gói tới SAU mốc chốt không được tính vào câu đã chốt', () => {
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 8, PACKET_MS, 0);
        feed(a, end, 12, 0, PACKET_MS); // người kia bắt đầu nói, sau khi câu này đã chốt
        expect(a.verdictFor(1_000, end)?.source).toBe('mic');
    });

    it('10 · gói cũ bị cắt bớt nhưng KHÔNG được cắt vào phần đang cần', () => {
        // Bộ nhớ phải có trần, nếu không một buổi bốn tiếng là một mảng vài trăm nghìn phần tử. Nhưng cắt
        // quá tay thì `verdictFor` mất chính đoạn tiếng của câu vừa rồi và trả `null` — tức là bằng chứng
        // mạnh nhất bảng lặng lẽ biến mất giữa buổi, không có gì đỏ lên.
        const a = createSourceAttributor();
        let t = 0;
        for (let i = 0; i < 4_000; i += 1) { t += PACKET_MS; a.observe(t, 0, PACKET_MS); }
        const start = t - 3_000;
        expect(a.verdictFor(start, t)?.source).toBe('system');
    });
});

describe('sổ sách — để đọc log sau buổi, không để đoán lúc chạy', () => {
    it('11 · đếm đủ bốn loại kết cục', () => {
        const a = createSourceAttributor();
        const one = feed(a, 1_000, 8, PACKET_MS, 0);
        a.verdictFor(1_000, one);
        const two = feed(a, one, 8, 0, PACKET_MS);
        a.verdictFor(one, two);
        const three = feed(a, two, 8, PACKET_MS, PACKET_MS);
        a.verdictFor(two, three);
        const four = feed(a, three, 4, 5, 5);
        a.verdictFor(three, four);
        expect(a.stats()).toEqual({ mic: 1, system: 2, unattributed: 1, overlapped: 1 });
    });

    it('12 · phiên mới dọn sạch cả tiếng lẫn sổ — không để buổi trước quyết chiều của buổi này', () => {
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 12, 0, PACKET_MS);
        a.verdictFor(1_000, end);
        a.reset();
        expect(a.stats()).toEqual({ mic: 0, system: 0, unattributed: 0, overlapped: 0 });
        expect(a.verdictFor(1_000, end)).toBeNull();
    });

    it('13 · số mili-giây báo ra là số ĐO ĐƯỢC, không phải nhãn tròn trịa', () => {
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 5, 100, 400);
        const v = a.verdictFor(1_000, end);
        expect(v?.micVoicedMs).toBe(500);
        expect(v?.sysVoicedMs).toBe(2_000);
    });
});
