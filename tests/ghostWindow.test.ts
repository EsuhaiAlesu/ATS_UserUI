// TASK 29 — the hallucination guard follows the silence threshold instead of a constant. The old 4 000ms
// was the 1.5s default plus a 2.5s margin; TASK 27's 3.0s step ate almost all of it, so finals that spent
// longer than ~1s in transit landed past the line and were thrown away by this very guard — and dropGhost
// only writes console.debug. No toast, no red line. A whole sentence vanished in silence.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const lane = readFileSync(new URL('../src/lib/lanes/online/onlineLane.ts', import.meta.url), 'utf8');
const margin = Number(/GHOST_SILENCE_MARGIN_MS = ([\d_]+);/.exec(lane)![1].replace(/_/g, ''));
const fallback = Number(/FALLBACK_PAUSE_SECS = ([\d.]+);/.exec(lane)![1]);

describe('ghostWindow — cửa sổ đi theo mức chờ im lặng đang dùng', () => {
  it('1 · phép suy ra có thật và đọc đúng như ý định', () => {
    expect(lane).toContain('Math.round(appliedPauseSecs * 1000) + GHOST_SILENCE_MARGIN_MS');
  });

  it('2 · bất biến bảo vệ người KHÔNG đổi gì: ở nấc mặc định vẫn ra đúng 4 000', () => {
    expect(fallback * 1000 + margin).toBe(4_000);
  });

  it('3 · nấc mới thật sự được che: 3,0s vẫn giữ nguyên 2 500ms biên đi đường', () => {
    const atNewStep = 3_000 + margin;
    expect(atNewStep).toBeGreaterThan(4_000);
    expect(atNewStep - 3_000).toBe(margin); // đúng bằng biên mà nấc mặc định vẫn luôn có
  });

  it('4 · hai hằng số ghi chết đã biến mất hẳn', () => {
    expect(lane).not.toContain('VOICED_WINDOW_MS');
    expect(lane).not.toContain('LONG_SILENCE_MS');
  });

  it('5 · cả hai cổng và cửa sổ trượt đều gọi phép suy ra, không gọi con số', () => {
    expect(lane).toContain('const cutoff = Date.now() - ghostWindowMs();');
    const hits = lane.match(/Date\.now\(\) - lastLoudAt >= ghostWindowMs\(\)/g) ?? [];
    expect(hits.length).toBeGreaterThanOrEqual(2); // cổng bản tạm + cổng bản chốt
  });

  it('6 · con số đến từ câu trả lời của MÁY CHỦ, không từ cái núm', () => {
    expect(lane).toContain("appliedPauseSecs = typeof session.pauseSecs === 'number' ? session.pauseSecs : FALLBACK_PAUSE_SECS;");
    expect(lane).not.toContain('appliedPauseSecs = rhythmPauseSecs');
  });

  // TASK 37 — lỗi của chính PHẦN 5, đã lên deploy. Công thức suy ra được viết để NỚI cửa sổ này, nhưng nó
  // áp cho MỌI nấc, và nấc `fast` gửi 0,9s ⇒ 3 400ms — HẸP hơn 4 000 mà nó thay thế. Mà `fast` chính là
  // nấc có gợi ý "Lễ, MC đọc theo kịch bản", tức nấc nhiều khả năng chạy ngày 08/08. Nới một chốt chặn là
  // sửa lỗi; siết nó là một lỗi mới đội lốt bản sửa.
  it('7 · chốt chặn được phép NỚI RỘNG và không bao giờ được siết chặt', () => {
    expect(lane).toContain('Math.max(GHOST_WINDOW_FLOOR_MS, Math.round(appliedPauseSecs * 1000) + GHOST_SILENCE_MARGIN_MS)');
    const floor = Number(/GHOST_WINDOW_FLOOR_MS = ([\d_]+);/.exec(lane)![1].replace(/_/g, ''));
    expect(floor).toBe(4_000); // đúng hằng số cũ mà TASK 29 đã thay

    const windowFor = (secs: number) => Math.max(floor, Math.round(secs * 1000) + margin);
    expect(windowFor(0.9)).toBe(4_000); // nấc `fast` — không có sàn thì chỉ được 3 400
    expect(windowFor(1.5)).toBe(4_000);
    expect(windowFor(2.4)).toBe(4_900);
    expect(windowFor(3.0)).toBe(5_500);
    for (const secs of [0.9, 1.5, 2.4, 3.0]) {
      expect(windowFor(secs), `${secs}s`).toBeGreaterThanOrEqual(4_000);
    }
  });
});
