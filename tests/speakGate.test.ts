// tests/speakGate.test.ts — R5: HIỆN và ĐỌC không được chờ chung một lúc.
//
// Bất đối xứng đã nằm sẵn trong lane, viết ngay trên chỗ gọi giọng đọc: "bỏ đọc một câu thì khán phòng
// ĐỌC thay vì NGHE, còn đọc sai một câu là một tràng tiếng đè lên câu kế tiếp". Phụ đề có `lid`, viết đè
// lên chính nó, người ta thấy nó đổi. Giọng đọc thì đã ra loa rồi, mất 3-4 giây để nói xong, không thu về
// được. Nên phụ đề bắn NGAY theo chiều tạm, còn giọng đọc CHỜ trọng tài chốt — có hạn giờ.
//
// Hai điều bộ test này canh chặt nhất, vì hỏng cái nào cũng là hỏng ngoài hội trường:
//   · HẾT GIỜ KHÔNG PHẢI LÀ PHÁN QUYẾT. Trọng tài im lặng không có nghĩa là câu sai chiều. Nếu để hết giờ
//     đọc thành `changed` thì mỗi lần mạng chậm là cả buổi câm.
//   · ĐƯỜNG ĐÃ CHỐT PHẢI THẲNG. Hôm nay trọng tài trả lời đồng bộ ngay trong `acceptFinalText`, tức là
//     luôn chốt xong trước khi giọng đọc hỏi tới. Thêm dù một nhịp `await` thật vào đường đó là làm chậm
//     một thứ đang chạy tốt, để đổi lấy một thứ chưa ai dùng.

import { describe, it, expect } from 'vitest';
import { createSpeakGate } from '../src/lib/lanes/online/speakGate';

describe('đường đã chốt — phải thẳng, không chờ ai', () => {
    it('1 · chốt trước khi hỏi ⇒ trả lời ngay, không tính là một lần chờ', async () => {
        const g = createSpeakGate();
        g.show('l1', 'vi');
        g.settle('l1', 'vi');
        const out = await g.wait('l1', 1_000, 'vi');
        expect(out).toEqual({ language: 'vi', changed: false, timedOut: false });
        expect(g.stats().waits).toBe(0);
        expect(g.stats().waitedMs).toBe(0);
    });

    it('2 · và trả lời trong CÙNG một nhịp — không nhường lượt cho timer nào', async () => {
        const g = createSpeakGate();
        g.show('l1', 'ja');
        g.settle('l1', 'ja');
        let landed = false;
        void g.wait('l1', 1_000, 'ja').then(() => { landed = true; });
        await Promise.resolve(); // đúng MỘT nhịp microtask
        expect(landed).toBe(true);
    });
});

describe('chưa chốt — giọng đọc chờ, phụ đề thì không', () => {
    it('3 · chờ tới lúc trọng tài chốt rồi mới trả lời', async () => {
        const g = createSpeakGate();
        g.show('l1', 'vi');
        const p = g.wait('l1', 1_000, 'vi');
        let landed = false;
        void p.then(() => { landed = true; });
        await Promise.resolve();
        expect(landed).toBe(false); // vẫn đang chờ — đây mới là điểm của cả tệp
        g.settle('l1', 'vi');
        expect(await p).toEqual({ language: 'vi', changed: false, timedOut: false });
        expect(g.stats().waits).toBe(1);
    });

    it('4 · chốt KHÁC chiều đã hiện ⇒ changed, và câu bị giữ lại không đọc', async () => {
        const g = createSpeakGate();
        g.show('l1', 'vi'); // tường đã hiện bản dịch làm theo chiều vi→ja
        const p = g.wait('l1', 1_000, 'vi');
        g.settle('l1', 'ja'); // trọng tài: câu này thật ra là tiếng Nhật
        const out = await p;
        expect(out.changed).toBe(true);
        expect(out.language).toBe('ja');
        expect(g.stats().held).toBe(1);
    });

    it('5 · nhiều câu chờ độc lập nhau — chốt câu này không đánh thức câu kia', async () => {
        const g = createSpeakGate();
        g.show('a', 'vi'); g.show('b', 'vi');
        const pa = g.wait('a', 1_000, 'vi');
        const pb = g.wait('b', 1_000, 'vi');
        let bLanded = false;
        void pb.then(() => { bLanded = true; });
        g.settle('a', 'vi');
        expect(await pa).toMatchObject({ timedOut: false });
        await Promise.resolve();
        expect(bLanded).toBe(false);
        g.settle('b', 'ja');
        expect((await pb).changed).toBe(true);
    });
});

describe('hết giờ KHÔNG phải là một phán quyết', () => {
    it('6 · hết giờ ⇒ đi tiếp bằng chiều đã hiện, và KHÔNG được kết luận là sai chiều', async () => {
        const g = createSpeakGate();
        g.show('l1', 'ja');
        const out = await g.wait('l1', 5, 'vi');
        expect(out.timedOut).toBe(true);
        expect(out.language).toBe('ja'); // đọc to lên đúng thứ người ta đang đọc trên tường
        expect(out.changed).toBe(false); // ← câu quan trọng nhất tệp này: im lặng ≠ sai
        expect(g.stats().timedOut).toBe(1);
        expect(g.stats().held).toBe(0);
    });

    it('7 · chưa hiện gì cả thì hết giờ rơi về chiều dự phòng phía gọi đưa vào', async () => {
        const g = createSpeakGate();
        expect((await g.wait('l1', 5, 'ja')).language).toBe('ja');
    });

    it('8 · trọng tài chốt MUỘN sau khi đã hết giờ thì không lật ngược phán quyết đã trả', async () => {
        const g = createSpeakGate();
        g.show('l1', 'vi');
        const p = g.wait('l1', 5, 'vi');
        await new Promise((r) => setTimeout(r, 25));
        g.settle('l1', 'ja'); // muộn — câu đã đi rồi
        const out = await p;
        expect(out.timedOut).toBe(true);
        expect(out.changed).toBe(false);
        expect(out.language).toBe('vi');
    });
});

describe('dọn dẹp — không treo lời hứa, không phình bộ nhớ', () => {
    it('9 · reset() đánh thức mọi câu đang chờ, không để treo qua lần bấm Dừng', async () => {
        const g = createSpeakGate();
        g.show('l1', 'vi');
        const p = g.wait('l1', 60_000, 'vi'); // hạn giờ dài — chỉ reset mới cứu được
        g.reset();
        expect(await p).toMatchObject({ language: 'vi' }); // không treo là đủ; phía gọi có cửa sessionGen
        expect(g.stats().waits).toBe(0); // reset xoá luôn số đếm của phiên cũ
    });

    it('10 · forget() quên hẳn một câu — hỏi lại là như chưa từng thấy', async () => {
        const g = createSpeakGate();
        g.show('l1', 'vi');
        g.settle('l1', 'vi');
        g.forget('l1');
        const out = await g.wait('l1', 5, 'ja');
        expect(out.timedOut).toBe(true);
        expect(out.language).toBe('ja'); // không còn `shown` nào để rơi về
    });

    it('11 · đếm được tổng thời gian giọng đọc đã phải chờ — để đo, không để đoán', async () => {
        const g = createSpeakGate();
        g.show('l1', 'vi');
        const p = g.wait('l1', 1_000, 'vi');
        await new Promise((r) => setTimeout(r, 20));
        g.settle('l1', 'vi');
        await p;
        expect(g.stats().waitedMs).toBeGreaterThanOrEqual(15);
    });
});
