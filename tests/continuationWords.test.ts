// TASK 25 — the words that prove a sentence is NOT finished. The continuation window already existed; its
// word list was too short, and the 04/08 rehearsal transcript names the gaps exactly. Widening it is free:
// `endsOpenEnded` is only ever consulted for text that does not already end in strong punctuation, so a
// genuinely finished sentence never reaches it. Cost of a wrong guess: ~1 extra second. Cost of a miss: a
// sentence torn in half in front of the hall.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  endsOpenEnded,
  getContinuationWaitMs,
  CONTINUATION_MIN_WAIT_MS,
  CONTINUATION_MAX_WAIT_MS,
  CONTINUATION_BASE_WAIT_MS,
  CONTINUATION_OPEN_ENDED_WAIT_MS,
} from '../src/lib/lanes/online/livePipelinePolicy';

// The four fragments exactly as the recogniser produced them on 04/08 — one continuous story, four stray
// lines, four separate translations, four separate trips through the loudspeaker.
const đứtGiữaChừng = [
  'Vâng, những điều quan trọng của anh trong',
  'Mà nếu mà mẹ nhìn thấy cái',
  'Và việc mẹ có',
  'Ừm, màu vàng chắc là sẽ tượng trưng cho cuộc',
];

describe('continuationWords — bốn mẩu thật của buổi 04/08', () => {
  it('1 · cả bốn đều được nhận ra là chưa hết câu', () => {
    for (const t of đứtGiữaChừng) expect(endsOpenEnded(t), t).toBe(true);
  });

  it('2 · và vì thế được cửa sổ DÀI NHẤT, không phải cửa sổ nền', () => {
    for (const t of đứtGiữaChừng) {
      expect(getContinuationWaitMs({ text: t }), t).toBe(CONTINUATION_OPEN_ENDED_WAIT_MS);
    }
    expect(CONTINUATION_OPEN_ENDED_WAIT_MS).toBeGreaterThan(CONTINUATION_BASE_WAIT_MS);
  });

  it('3 · dấu câu vẫn thắng — đó là lý do nới danh sách này không tốn gì', () => {
    expect(endsOpenEnded('Dạ có.')).toBe(false);
    expect(endsOpenEnded('Rồi tôi vào đại học.')).toBe(false);
    expect(endsOpenEnded('Mẹ biết chưa?')).toBe(false);
  });

  it('4 · hai chữ cố ý KHÔNG thêm thì đúng là không có', () => {
    expect(endsOpenEnded('Chuẩn bị xong rồi')).toBe(false);
    expect(endsOpenEnded('Nhà mẹ có hai con')).toBe(false);
  });

  it('5 · không mất chữ nào vốn đã có trong danh sách', () => {
    expect(endsOpenEnded('Chúng tôi rất vinh dự được đón tiếp và')).toBe(true);
    expect(endsOpenEnded('kết quả này là')).toBe(true);
    expect(endsOpenEnded('sẽ được trao cho')).toBe(true);
  });

  it('6 · tiếng Nhật không bị đụng tới', () => {
    expect(endsOpenEnded('皆様に')).toBe(true);
    expect(endsOpenEnded('準備しましたので')).toBe(true);
    expect(endsOpenEnded('そして')).toBe(true);
  });

  it('7 · dấu ngắt mềm vẫn tính là còn dở; câu trọn thì không', () => {
    expect(endsOpenEnded('Kính thưa quý vị,')).toBe(true);
    expect(endsOpenEnded('第一に、')).toBe(true);
    expect(endsOpenEnded('Xin chào quý vị')).toBe(false);
    expect(endsOpenEnded('')).toBe(false);
  });
});

describe('continuationWords — trần mới thật sự với tới được', () => {
  it('8 · người nói chậm chạm đúng trần 2 000ms, cao hơn hẳn trần cũ 1 200', () => {
    const slow = getContinuationWaitMs({ text: 'Và việc mẹ có', unitsPerSecond: 2 });
    expect(slow).toBe(Math.min(Math.round(CONTINUATION_OPEN_ENDED_WAIT_MS * 1.5), CONTINUATION_MAX_WAIT_MS));
    expect(slow).toBe(CONTINUATION_MAX_WAIT_MS);
    expect(CONTINUATION_MAX_WAIT_MS).toBe(2_000);
    expect(CONTINUATION_MAX_WAIT_MS).toBeGreaterThan(1_200);
  });

  it('9 · cửa sổ không bao giờ thoát khỏi hai đầu chặn', () => {
    for (const text of đứtGiữaChừng) {
      for (const unitsPerSecond of [undefined, 0.5, 2, 3, 6, 12]) {
        const ms = getContinuationWaitMs({ text, unitsPerSecond });
        expect(ms, `${text} @ ${unitsPerSecond}`).toBeGreaterThanOrEqual(CONTINUATION_MIN_WAIT_MS);
        expect(ms, `${text} @ ${unitsPerSecond}`).toBeLessThanOrEqual(CONTINUATION_MAX_WAIT_MS);
      }
    }
  });

  it('10 · nội dung danh sách được chốt cứng để lần sửa sau là có chủ ý', () => {
    const src = readFileSync(new URL('../src/lib/lanes/online/livePipelinePolicy.ts', import.meta.url), 'utf8');
    const body = /VI_OPEN_ENDED_PATTERN = \/\(\?:\^\|\\s\)\(\?:([^)]+)\)/.exec(src)![1];
    const words = body.split('|');
    for (const w of ['có', 'cái', 'cuộc', 'chiếc', 'sự', 'nỗi', 'niềm', 'mỗi', 'từng', 'mọi', 'bị', 'khiến', 'bởi', 'dù', 'tuy', 'vẫn', 'chưa', 'đã', 'đều', 'nơi', 'trong']) {
      expect(words, w).toContain(w);
    }
    expect(words).not.toContain('rồi');
    expect(words).not.toContain('con');
    expect(new Set(words).size).toBe(words.length);
  });
});
