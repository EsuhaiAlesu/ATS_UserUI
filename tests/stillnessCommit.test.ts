// TASK 27 — the net under the step that never commits on punctuation. Handing turn-closing entirely to
// the vendor's VAD was measured on 04/08 to produce a session where the vendor closed NO turn at all: the
// hall microphone runs automatic gain control, so every pause is lifted into audible noise and the silence
// detector never fires. Stillness is a different signal, and that is exactly why it is safe: a word being
// spoken keeps the partial moving, so a partial that has not changed at all for 2.5s means the recogniser
// stopped producing — not that we grew impatient at a full stop.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  planStillnessCommit,
  planStableScribeCommit,
  SCRIBE_MANUAL_STILL_MS,
  SCRIBE_MANUAL_MIN_COMMIT_GAP_MS,
} from '../src/lib/lanes/online/scribeManualCommit';

const lane = readFileSync(new URL('../src/lib/lanes/online/onlineLane.ts', import.meta.url), 'utf8');
const now = 100_000;

describe('planStillnessCommit — lưới đỡ cho nấc chạy liền mạch', () => {
  it('1 · bản tạm vừa đổi thì chờ trọn cửa sổ', () => {
    const plan = planStillnessCommit('Ở đây mình có những viên', now, 0, now);
    expect(plan).not.toBeNull();
    expect(plan!.reason).toBe('stillness');
    expect(plan!.stableMs).toBe(SCRIBE_MANUAL_STILL_MS);
    expect(plan!.delayMs).toBe(SCRIBE_MANUAL_STILL_MS);
  });

  it('2 · đã đứng im đủ lâu thì chốt ngay', () => {
    const plan = planStillnessCommit('Ở đây mình có những viên', now - SCRIBE_MANUAL_STILL_MS - 500, 0, now);
    expect(plan!.delayMs).toBe(0);
  });

  it('3 · KHÔNG hỏi tới dấu câu — đúng chỗ khác hẳn planStableScribeCommit', () => {
    // 'anh có' không có dấu chấm và cũng không dài, nên bộ lập kế hoạch theo dấu câu bó tay.
    expect(planStableScribeCommit('anh có', now - SCRIBE_MANUAL_STILL_MS, 0, now, null)).toBeNull();
    const plan = planStillnessCommit('anh có', now - SCRIBE_MANUAL_STILL_MS, 0, now);
    expect(plan).not.toBeNull();
    expect(plan!.reason).toBe('stillness');
  });

  it('4 · không có gì để chốt', () => {
    expect(planStillnessCommit('', now, 0, now)).toBeNull();
    expect(planStillnessCommit('   ', now, 0, now)).toBeNull();
  });

  it('5 · vẫn tôn trọng nhịp chặn của nhà cung cấp', () => {
    const plan = planStillnessCommit('anh có', now - 10_000, now - 500, now);
    expect(plan!.delayMs).toBe(SCRIBE_MANUAL_MIN_COMMIT_GAP_MS - 500);
  });

  it('6 · truyền cửa sổ vào được, và rác thì rơi về mặc định', () => {
    expect(planStillnessCommit('anh có', now, 0, now, 4_000)!.stableMs).toBe(4_000);
    for (const junk of [0, -1, Number.NaN]) {
      expect(planStillnessCommit('anh có', now, 0, now, junk)!.stableMs, String(junk)).toBe(SCRIBE_MANUAL_STILL_MS);
    }
  });

  it('7 · cửa sổ nằm giữa hai thứ nó phải vượt qua', () => {
    expect(SCRIBE_MANUAL_STILL_MS).toBeGreaterThan(900);   // mốc theo dấu câu mà nấc này không dùng nữa
    expect(SCRIBE_MANUAL_STILL_MS).toBeLessThan(25_000);   // trần cuối mà nó thay thế
  });
});

describe('planStillnessCommit — lane đã nối dây thật', () => {
  const from = lane.indexOf('function scheduleStableCommit');
  const to = lane.indexOf('function resetScribeCommitState');
  const body = lane.slice(from, to);

  it('8 · nhánh miễn commit có LƯỚI, không phải một return trống', () => {
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    expect(body).toContain('if (!rhythmUsesManualCommit(loadSpeechRhythm())) {');
    expect(body).toContain('planStillnessCommit(text, scribePartialChangedAt, scribeLastCommitAt, Date.now())');
    expect(body).toContain('sendManualCommit(still.reason)');
  });

  it('9 · cổng chặn đứng trước bộ lập kế hoạch theo dấu câu', () => {
    expect(body.indexOf('rhythmUsesManualCommit')).toBeLessThan(body.indexOf('planStableScribeCommit('));
  });

  it('10 · lane nhập nó từ đúng module', () => {
    expect(lane).toMatch(/import \{[^}]*planStillnessCommit[^}]*\} from '\.\/scribeManualCommit'/);
  });
});
