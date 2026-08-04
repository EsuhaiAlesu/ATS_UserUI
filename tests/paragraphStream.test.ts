// TASK 26 — where the sentences are, and what a paragraph is. Two pure modules, no wiring yet (TASK 28
// wires `planParagraphCut`). The whole point: bolding is decided from TEXT alone and never touches the
// recogniser, so a line going bold can no longer cut a word in half.

import { describe, it, expect } from 'vitest';
import {
  advanceParagraph,
  planParagraphCut,
  closeParagraph,
  startUtterance,
  EMPTY_PARAGRAPH_STATE,
  PARAGRAPH_MAX_SENTENCES,
  type ParagraphState,
  type AdvanceOptions,
} from '../src/lib/lanes/online/paragraphStream';
import { findSentenceEnds } from '../src/lib/lanes/online/transcriptSegmentation';

type Line = { text: string; closes: boolean; sentences: number; rewound: boolean }

function drain(state: ParagraphState, utterance: string, options?: AdvanceOptions) {
  const lines: Line[] = []
  let st = state
  for (let guard = 0; guard < 50; guard += 1) {
    const step = advanceParagraph(st, utterance, options)
    st = step.next
    if (!step.text) return { lines, state: st }
    lines.push({ text: step.text, closes: step.closesParagraph, sentences: step.sentenceCount, rewound: step.rewound })
  }
  throw new Error('advanceParagraph không hội tụ — có nhánh nào đó không tiêu thụ được bản tạm')
}

describe('transcriptSegmentation — findSentenceEnds', () => {
  it('1 · trả về MỌI ranh giới, cả hai thứ tiếng', () => {
    expect(findSentenceEnds('Một. Hai! Ba?')).toEqual([4, 9, 13]);
    expect(findSentenceEnds('こんにちは。ありがとう。')).toEqual([6, 12]);
  });

  it('2 · một chuỗi dấu liền nhau chỉ là MỘT câu', () => {
    expect(findSentenceEnds('Thật không?!')).toEqual([12]);
    expect(findSentenceEnds('「そうです。」 はい。')).toEqual([7, 11]);
    // dấu đóng ngoặc thuộc về câu mà nó đóng
    expect('「そうです。」 はい。'.slice(0, 7)).toBe('「そうです。」');
  });

  it('3 · chốt chặn số thập phân vẫn còn', () => {
    expect(findSentenceEnds('Có 10.000 người tham dự. Rất đông')).toEqual([24]);
  });

  it('4 · dấu ba chấm KHÔNG phải ranh giới', () => {
    expect(findSentenceEnds('và sau đó…')).toEqual([]);
  });
});

describe('paragraphStream — đậm theo dấu câu', () => {
  it('5 · dấu chấm còn ở mép đang mọc thì chưa in gì', () => {
    expect(drain(EMPTY_PARAGRAPH_STATE, 'Xin chào quý vị.').lines).toEqual([]);
  });

  it('6 · máy đã viết qua nó rồi thì in ngay, không cần chờ commit', () => {
    const { lines } = drain(EMPTY_PARAGRAPH_STATE, 'Xin chào quý vị. Hôm nay');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ text: 'Xin chào quý vị.', sentences: 1, closes: false });
  });

  it('7 · không in lại cái đã in', () => {
    const first = drain(EMPTY_PARAGRAPH_STATE, 'Xin chào quý vị. Hôm nay');
    const { lines } = drain(first.state, 'Xin chào quý vị. Hôm nay là ngày vui. Cảm');
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('Hôm nay là ngày vui.');
  });
});

describe('paragraphStream — 2–3 câu mới thành một đoạn', () => {
  it('8 · ba câu đóng đoạn và ra CÙNG một dòng', () => {
    const { lines, state } = drain(EMPTY_PARAGRAPH_STATE, 'Xin chào quý vị. Hôm nay là ngày vui. Cảm ơn mọi người. Bây giờ');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ sentences: PARAGRAPH_MAX_SENTENCES, closes: true });
    expect(lines[0].text).toBe('Xin chào quý vị. Hôm nay là ngày vui. Cảm ơn mọi người.');
    expect(state.sentences).toBe(0);
  });

  it('9 · hai câu dài thì đóng sớm, không để đoạn chạy mãi', () => {
    const a = 'Kính thưa quý vị đại biểu, quý khách quý và toàn thể anh chị em Esuhai thân mến của chúng ta.';
    const b = 'Hôm nay chúng ta cùng nhau nhìn lại chặng đường hai mươi năm đã đi qua với rất nhiều kỷ niệm.';
    const { lines } = drain(EMPTY_PARAGRAPH_STATE, `${a} ${b} Và bây giờ`);
    expect((a + b).length).toBeGreaterThan(180);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ sentences: 2, closes: true });
  });

  it('10 · MỘT đoạn được phép trải qua nhiều lượt nghe', () => {
    const first = drain(EMPTY_PARAGRAPH_STATE, 'Xin chào quý vị. Hôm');
    expect(first.lines).toHaveLength(1);
    expect(first.lines[0].closes).toBe(false);
    expect(first.state.sentences).toBe(1);

    const second = drain(startUtterance(first.state), 'Hôm nay là ngày vui. Cảm ơn mọi người. Và');
    expect(second.lines).toHaveLength(1);
    expect(second.lines[0]).toMatchObject({ sentences: 2, closes: true });
    expect(second.state.sentences).toBe(0);
  });

  it('11 · người gọi đóng đoạn bằng tay mà không làm in lại', () => {
    const { state } = drain(EMPTY_PARAGRAPH_STATE, 'Xin chào quý vị. Hôm');
    expect(closeParagraph(state).sentences).toBe(0);
    expect(closeParagraph(state).printed).toBe(state.printed);
  });
});

describe('paragraphStream — lượt nghe đã đóng thật', () => {
  it('12 · phần đuôi không có dấu câu vẫn được in chứ không bị mất', () => {
    const { lines } = drain(EMPTY_PARAGRAPH_STATE, 'Xin chào quý vị. Còn một chút nữa', { utteranceEnded: true });
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('Xin chào quý vị. Còn một chút nữa');
  });

  it('13 · câu cuối nằm ngay mép cũng in, vì không còn gì mọc thêm', () => {
    const { lines } = drain(EMPTY_PARAGRAPH_STATE, 'Xin chào quý vị.', { utteranceEnded: true });
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('Xin chào quý vị.');
  });

  it('14 · lượt rỗng thì không in gì', () => {
    expect(drain(EMPTY_PARAGRAPH_STATE, '   ', { utteranceEnded: true }).lines).toEqual([]);
  });
});

describe('paragraphStream — máy nghe sửa ngược lại', () => {
  it('15 · câu cũ bị THAY, không bị cộng thêm', () => {
    const first = drain(EMPTY_PARAGRAPH_STATE, 'Xin chào quý vị. Hôm');
    expect(first.state.sentences).toBe(1);

    const { lines, state } = drain(first.state, 'Xin chào các quý vị. Hôm nay');
    expect(lines).toHaveLength(1);
    expect(lines[0].rewound).toBe(true);
    expect(lines[0].text).toBe('Xin chào các quý vị.');
    expect(state.sentences).toBe(1);
  });
});

describe('paragraphStream — planParagraphCut', () => {
  it('16 · chưa có câu nào trọn ⇒ không có chỗ cắt hợp lệ nào', () => {
    expect(planParagraphCut('Và việc mẹ có')).toEqual({ sentences: 0, cut: 0, ready: false });
  });

  it('17 · MỘT câu trọn vẫn chưa phải một đoạn — đúng cái dòng lẻ mà hội trường đang thấy', () => {
    expect(planParagraphCut('Tại vì cái việc của anh ở trên Sài Gòn.')).toMatchObject({ sentences: 1, ready: false });
  });

  it('18 · ba câu là đủ, và chỗ cắt rơi đúng sau dấu thứ ba', () => {
    const text = 'Một câu. Hai câu. Ba câu. Bốn câu.';
    const plan = planParagraphCut(text);
    expect(plan).toMatchObject({ sentences: 3, ready: true });
    expect(text.slice(0, plan.cut)).toBe('Một câu. Hai câu. Ba câu.');
    expect(text.slice(plan.cut).trim()).toBe('Bốn câu.');
  });

  it('19 · hai đường đi cho cùng một câu trả lời', () => {
    const text = 'Một câu. Hai câu. Ba câu. Còn nữa';
    const plan = planParagraphCut(text);
    const step = advanceParagraph(EMPTY_PARAGRAPH_STATE, text);
    expect(step.closesParagraph).toBe(plan.ready);
    expect(step.sentenceCount).toBe(plan.sentences);
    expect(step.text).toBe(text.slice(0, plan.cut).trim());
  });
});

describe('paragraphStream — câu chuyện thật ngày 04/08', () => {
  it('20 · ba dòng lẻ ngày đó nay gộp thành MỘT đoạn, mẩu dở bị giữ lại', () => {
    const text = [
      'Tại vì cái việc của anh ở trên Sài Gòn.',
      '5 năm, 6 năm, đó là một cái giống như một gia tài của mẹ á.',
      'Khoai cũng đều đi học đại học á.',
    ].join(' ') + ' Và việc mẹ có';

    const { lines } = drain(EMPTY_PARAGRAPH_STATE, text);
    expect(lines).toHaveLength(1);
    expect(lines[0].sentences).toBe(3);
    expect(lines[0].closes).toBe(true);
    expect(lines[0].text).toContain('Sài Gòn.');
    expect(lines[0].text).toContain('gia tài của mẹ á.');
    expect(lines[0].text).toContain('đi học đại học á.');
    expect(lines[0].text).toContain('5 năm, 6 năm, đó là'); // dấu phẩy không được chẻ câu
    for (const l of lines) expect(l.text).not.toContain('Và việc mẹ có');
  });
});
