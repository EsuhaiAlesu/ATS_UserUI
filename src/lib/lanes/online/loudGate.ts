// src/lib/lanes/online/loudGate.ts — "Ngưỡng đủ to", the valve in front of the anti-hallucination guard.
//
// The machine has TWO loudness thresholds, and before this file only ONE of them followed "Độ nhạy micro":
//   1. the "there is a voice here" floor, inside the capture worklet (`pcm16Capture.ts` →
//      `resolveVoiceFloor`) — it DOES follow the setting: the far step lowers it to a quarter of close;
//   2. the "loud enough to count as sound" threshold — `AUDIO_LOUD_LEVEL_THRESHOLD = 0.09`, hard-coded in
//      `onlineLane.ts`, following nothing. Only a VU frame above it refreshes `lastLoudAt`; four seconds
//      (`LONG_SILENCE_MS`) without one and EVERY final is dropped as `long-silence` and partials are
//      blocked outright.
// With a speakerphone in the middle of a table the same speech is counted as a voice by (1) and as "no
// sound has occurred" by (2) — heard, and thrown away. The peak the far step already accepts as speech is
// ≈ 0.00875, more than ten times below 0.09.
//
// This file loosens NOTHING else. `LONG_SILENCE_MS`, the voiced-ms window and the floors in
// `asrSpeechEvidence.ts` are untouched; it decides exactly one number: what counts as "loud enough".
//
// THE INVARIANT: at the **close** step the threshold must come out at EXACTLY 0.09, the number that has
// been running all along. The ceremony runs hand-held mics at the mouth, so that path may not move by a
// hair. Only medium / far / auto relax, and only by the ratio the worklet already applied to the floor.

import { resolveVoiceFloor } from './pcm16Capture';
import type { MicSensitivity } from './pcm16Capture';

/** The original threshold, in VU peak 0..1. This is the number that has always run, and the close anchor. */
export const LOUD_BASE_THRESHOLD = 0.09;

// Reference noise floor, so the threshold resolves to a fixed number. Exactly the worklet's own
// initialisation (`this.noiseRms = 0.002`, `pcm16Capture.ts:32`) — the learned floor lives INSIDE the
// audio thread and nothing outside can read it, so console and tests must agree on one reference.
export const LOUD_NOISE_REFERENCE_RMS = 0.002;

export type LoudGateMode = 'auto' | 'standard' | 'low' | 'verylow';

export const LOUD_GATE_KEY = 'proyaku_online_loud_gate';
export const LOUD_GATE_DEFAULT: LoudGateMode = 'auto';

// The two manual steps sit BELOW the bottom of the auto ladder — that is the whole reason they exist. The
// operator tries auto first; if sentences are still lost there has to be somewhere further down to go,
// not just a way to re-select what was already tried.
const LOUD_LOW = 0.02;
// 0.008 is below even the far step's "there is a voice" peak (0.00875): at this step the loud-enough
// threshold can no longer contradict the voice threshold. This is the last relief valve, for a mic placed
// genuinely far away.
const LOUD_VERY_LOW = 0.008;

/** Vietnamese label + one sentence each, for the technical desk. Ordered loosest-last. */
export const LOUD_GATE_OPTIONS: readonly { value: LoudGateMode; label: string; hint: string }[] = [
  { value: 'auto', label: 'Tự động — theo Độ nhạy micro', hint: 'Ngưỡng hạ đúng theo tỉ lệ mà Độ nhạy micro đã hạ. Mic sát miệng vẫn giữ nguyên 0,09 như trước nay; mic để xa thì tự nới. Chọn cái này trước.' },
  { value: 'standard', label: 'Chuẩn (0,09 — như trước nay)', hint: 'Ép về đúng con số cũ, bất kể Độ nhạy micro đang đặt gì. Dùng khi muốn quay lại hành vi cũ để so sánh.' },
  { value: 'low', label: 'Thấp', hint: 'Hạ xuống thấp hơn cả nấc Tự động. Dùng khi mic để xa mà vẫn thấy câu bị mất, phụ đề đứng im dù có người đang nói.' },
  { value: 'verylow', label: 'Rất thấp (mic để xa hẳn)', hint: 'Thấp hơn cả mức máy coi là "có tiếng nói", tức là gần như tắt hẳn chốt này. Đổi lại: một tiếng động to trong phòng cũng đủ để máy tin là vừa có người nói.' },
];

export function isLoudGateMode(v: unknown): v is LoudGateMode {
  return v === 'auto' || v === 'standard' || v === 'low' || v === 'verylow';
}

/**
 * The threshold actually in force, in VU peak 0..1.
 *
 * The auto step is `0.09 × (voice floor of this step ÷ voice floor of the close step)`. Because
 * `resolveVoiceFloor('close', …).rms` is the constant 0.012, the ratio at the close step is exactly 1 and
 * the result is exactly 0.09.
 */
export function resolveLoudThreshold(mode: LoudGateMode, sensitivity: MicSensitivity): number {
  if (mode === 'standard') return LOUD_BASE_THRESHOLD;
  if (mode === 'low') return LOUD_LOW;
  if (mode === 'verylow') return LOUD_VERY_LOW;
  const here = resolveVoiceFloor(sensitivity, LOUD_NOISE_REFERENCE_RMS).rms;
  const close = resolveVoiceFloor('close', LOUD_NOISE_REFERENCE_RMS).rms;
  const ratio = close > 0 ? here / close : 1;
  // Round to 4 places: this number is PRINTED for the operator to compare against the VU peak, so it has
  // to read as 0.0525 rather than 0.052499999999999998.
  return Math.round(LOUD_BASE_THRESHOLD * ratio * 10_000) / 10_000;
}

/** Read the stored choice. Absent / corrupt / storage blocked → auto. */
export function loadLoudGate(): LoudGateMode {
  try {
    const v = localStorage.getItem(LOUD_GATE_KEY);
    return isLoudGateMode(v) ? v : LOUD_GATE_DEFAULT;
  } catch {
    return LOUD_GATE_DEFAULT;
  }
}

/** Write the choice. An unknown value is ignored (returns false) — never write rubbish into the store. */
export function saveLoudGate(v: LoudGateMode): boolean {
  if (!isLoudGateMode(v)) return false;
  try {
    localStorage.setItem(LOUD_GATE_KEY, v);
    return true;
  } catch {
    return false; // private mode / quota — this session still runs, it just will not be remembered
  }
}

/** Label used to print the value currently in force. */
export function loudGateLabel(v: LoudGateMode): string {
  return LOUD_GATE_OPTIONS.find((o) => o.value === v)?.label ?? v;
}
