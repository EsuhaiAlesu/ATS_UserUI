// TASK 30 — the full stop the RECOGNISER invented while closing a turn. 04/08: "Nếu mà tính." /
// "năng nó bật lên" — the speaker hesitated between the two syllables of "tính năng", the recogniser heard
// enough silence, closed the turn, and added a full stop nobody spoke. Every downstream rule then read that
// stop as proof the thought was over. No word list can catch it ("tính" is an ordinary word); the only
// usable tell is LENGTH, measured with the lane's own ruler.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  endsProvisionalSentence,
  lastSentenceLength,
  stripProvisionalSentenceEnd,
} from '../src/lib/lanes/online/transcriptSegmentation';
import {
  getContinuationWaitMs,
  CONTINUATION_BASE_WAIT_MS,
  CONTINUATION_OPEN_ENDED_WAIT_MS,
} from '../src/lib/lanes/online/livePipelinePolicy';

const lane = readFileSync(new URL('../src/lib/lanes/online/onlineLane.ts', import.meta.url), 'utf8');
// SEGMENT_MIN_CHARS in the lane. Vietnamese is multiplied by 1.85 ⇒ 33.
const MIN = 18;

describe('dấu chấm máy tự bịa', () => {
  it('1 · đúng bản chép lời thật ngày 04/08', () => {
    expect(endsProvisionalSentence('Nếu mà tính.', MIN)).toBe(true);
  });

  it('2 · câu ngắn thật cũng bị nghi oan — giá phải trả chưa tới một giây chờ', () => {
    expect(endsProvisionalSentence('Dạ có.', MIN)).toBe(true);
    expect(endsProvisionalSentence('Xin chào.', MIN)).toBe(true);
  });

  it('3 · câu dài thì không bị nghi', () => {
    expect(endsProvisionalSentence('Tại vì cái việc của anh ở trên Sài Gòn.', MIN)).toBe(false);
    expect(endsProvisionalSentence('5 năm, 6 năm, đó là một cái giống như một gia tài của mẹ á.', MIN)).toBe(false);
  });

  it('4 · thước đo đúng BẰNG thước của chính lane', () => {
    const satNguong = 'Khoai cũng đều đi học đại học á.';
    expect(satNguong.length).toBe(32); // dưới giới hạn tiếng Việt 33 đúng một ký tự
    expect(endsProvisionalSentence(satNguong, MIN)).toBe(true);
    expect(endsProvisionalSentence(`${satNguong.slice(0, -1)} nữa.`, MIN)).toBe(false);
  });

  it('5 · chỉ dấu chấm mới tính', () => {
    expect(endsProvisionalSentence('Thật không?', MIN)).toBe(false);
    expect(endsProvisionalSentence('Hay quá!', MIN)).toBe(false);
    expect(endsProvisionalSentence('Nếu mà tính', MIN)).toBe(false);
  });

  it('6 · chỉ đo câu CUỐI', () => {
    const text = 'Tại vì cái việc của anh ở trên Sài Gòn. Nếu mà tính.';
    expect(lastSentenceLength(text)).toBe('Nếu mà tính.'.length);
    expect(endsProvisionalSentence(text, MIN)).toBe(true);
  });

  it('7 · tiếng Nhật dùng thước riêng, không bị thước tiếng Việt kéo theo', () => {
    expect(lastSentenceLength('こんにちは。')).toBe(6);
    expect(endsProvisionalSentence('本日はお集まりいただきありがとうございます。', MIN)).toBe(false);
  });
});

describe('bỏ nó ở chỗ nối', () => {
  it('8 · nối tiếp bằng chữ thường ⇒ bỏ dấu chấm', () => {
    expect(stripProvisionalSentenceEnd('Nếu mà tính.', 'năng nó bật lên', MIN)).toBe('Nếu mà tính');
  });

  it('9 · nối tiếp bằng chữ HOA ⇒ giữ nguyên', () => {
    expect(stripProvisionalSentenceEnd('Dạ có.', 'Rồi tôi vào đại học', MIN)).toBe('Dạ có.');
  });

  it('10 · câu trước đủ dài thì không bao giờ bị đụng', () => {
    const dai = 'Tại vì cái việc của anh ở trên Sài Gòn.';
    expect(stripProvisionalSentenceEnd(dai, 'mà mẹ thì không biết', MIN)).toBe(dai);
  });

  it('11 · không có gì để nối thì không làm gì', () => {
    expect(stripProvisionalSentenceEnd('Nếu mà tính.', '', MIN)).toBe('Nếu mà tính.');
    expect(stripProvisionalSentenceEnd('Nếu mà tính.', '   ', MIN)).toBe('Nếu mà tính.');
  });

  it('12 · câu trước rỗng, hoặc không có dấu câu, đi thẳng qua', () => {
    expect(stripProvisionalSentenceEnd('', 'năng nó bật lên', MIN)).toBe('');
    expect(stripProvisionalSentenceEnd('Nếu mà tính', 'năng nó bật lên', MIN)).toBe('Nếu mà tính');
  });
});

describe('cửa sổ chờ thật sự dài ra', () => {
  it('13 · cùng một chuỗi, có cờ thì được cửa sổ dài', () => {
    const text = 'Nếu mà tính.';
    expect(getContinuationWaitMs({ text })).toBe(CONTINUATION_BASE_WAIT_MS);
    expect(getContinuationWaitMs({ text, provisionalEnd: true })).toBe(CONTINUATION_OPEN_ENDED_WAIT_MS);
    expect(CONTINUATION_OPEN_ENDED_WAIT_MS).toBeGreaterThan(CONTINUATION_BASE_WAIT_MS);
  });

  it('14 · cờ này KHÔNG BAO GIỜ rút ngắn cửa sổ được', () => {
    for (const text of ['Và việc mẹ có', 'Xin chào quý vị.', 'こんにちは。']) {
      const without = getContinuationWaitMs({ text });
      const with_ = getContinuationWaitMs({ text, provisionalEnd: true });
      expect(with_, text).toBeGreaterThanOrEqual(without);
    }
  });
});

describe('lane đã nối đủ bốn chỗ', () => {
  it('15 · cửa sổ chờ được cho biết', () => {
    expect(lane).toContain('provisionalEnd: endsProvisionalSentence(text, SEGMENT_MIN_CHARS),');
  });

  it('16 · cả đường bản chốt lẫn đường bản tạm đều gỡ nó ra', () => {
    expect(lane).toContain('segmentBuffer = joinSeg(stripProvisionalSentenceEnd(segmentBuffer, transcript, SEGMENT_MIN_CHARS), transcript);');
    expect(lane).toContain('currentInterimSource = joinSeg(stripProvisionalSentenceEnd(segmentBuffer, live, SEGMENT_MIN_CHARS), live);');
  });

  it('17 · trần mềm không còn nhận một dấu nằm ngay cuối buffer', () => {
    expect(lane).toContain('const innerBreak = lastBreak > 0 && lastBreak < buf.trimEnd().length;');
    expect(lane).not.toContain('if (softCeiling && findLastStrongSentenceBreak(buf, true) > 0) {');
  });
});
