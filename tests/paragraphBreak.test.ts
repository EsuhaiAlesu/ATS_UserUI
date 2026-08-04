// TASK 28 — a line may only break AFTER sentence-ending punctuation, and one finished sentence is not a
// paragraph. `onlineLane.ts` is a long-lived closure over a live WebSocket and is never instantiated in
// the node test environment, so the lane assertions here are source guards, like every other lane
// assertion in this repo.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { planParagraphCut, PARAGRAPH_MAX_SENTENCES } from '../src/lib/lanes/online/paragraphStream';

const lane = readFileSync(new URL('../src/lib/lanes/online/onlineLane.ts', import.meta.url), 'utf8');

describe('paragraphBreak — lane đã cài hai luật', () => {
  it('1 · câu trọn vẫn phải qua luật đoạn trước khi được đẩy đi', () => {
    expect(lane).toContain('if (complete && planParagraphCut(buf).ready) {');
  });

  it('2 · trần mềm không bao giờ nổ vô điều kiện', () => {
    // TASK 30 siết chặt điều kiện thứ hai và chốt dạng đã siết trong tệp riêng của nó. Ca này cố ý chỉ
    // chốt rằng CÓ một điều kiện thứ hai, nên nó xanh ở cả hai bên.
    expect(lane).toContain('if (softCeiling && ');
    expect(lane).not.toContain('if (softCeiling) {');
  });

  it('3 · trần cứng lớn hơn hẳn trần mềm, và trần mềm không xê dịch', () => {
    const soft = Number(/const SEGMENT_MAX_HOLD_MS = ([\d_]+);/.exec(lane)![1].replace(/_/g, ''));
    const hard = Number(/const SEGMENT_HARD_HOLD_MS = ([\d_]+);/.exec(lane)![1].replace(/_/g, ''));
    expect(soft).toBe(3_000); // độ trễ của một câu trọn không được đổi
    expect(hard).toBeGreaterThan(soft);
  });

  it('4 · trần cứng thật sự với tới được trong mã', () => {
    expect(lane).toContain('if (held >= SEGMENT_HARD_HOLD_MS) {');
  });

  it('5 · tắt phiên và đổi chiều dịch không bao giờ để lại phần dư', () => {
    expect(lane).toContain("if (reason === 'stop' || reason === 'turn-end') {");
  });

  it('6 · lane nhập module từ đúng đường trong facade', () => {
    expect(lane).toContain("import { planParagraphCut } from './paragraphStream';");
  });
});

describe('paragraphBreak — chính cái luật mà mấy cổng trên bảo vệ', () => {
  it('7 · một câu chưa phải một đoạn; ba câu thì phải', () => {
    expect(planParagraphCut('Xin chào quý vị.').ready).toBe(false);
    const three = planParagraphCut('Một câu. Hai câu. Ba câu.');
    expect(three.ready).toBe(true);
    expect(three.sentences).toBe(PARAGRAPH_MAX_SENTENCES);
  });

  it('8 · và đúng chỗ cắt giữa tiếng mà cả TASK này sinh ra để chặn', () => {
    // Mẩu thật của buổi 04/08: không có chỗ nào hợp lệ để ngắt bên trong nó.
    expect(planParagraphCut('Ở đây mình có những viên s').cut).toBe(0);
  });
});
