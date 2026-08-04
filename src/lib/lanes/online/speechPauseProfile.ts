// src/lib/lanes/online/speechPauseProfile.ts — the sentence-cut threshold, learned from the speaker
// instead of being a fixed timer.
//
// scribeManualCommit.ts closes a turn once the partial has READ as a finished sentence and then stopped
// changing for 600ms (800ms without punctuation). Those two numbers have to be wrong for somebody: the
// ceremonial MC who leaves 800ms between clauses gets cut mid-sentence, while the fast speaker waits out
// a pause they never took. This module measures the pauses the person at the microphone is ACTUALLY
// taking and hands `planStableScribeCommit` its own numbers — the `windows` parameter it has been
// carrying, unused, since it was written.
//
// Pauses are measured in MILLISECONDS, which is why this is its own module rather than something folded
// into sourceSpeechPace.ts: that one counts whitespace-separated tokens as a syllable proxy, so it yields
// nothing at all for Japanese (no spaces between words). Silence is the same quantity in both languages.
//
// Pure functions plus one tiny accumulator — no timers, no network, no DOM.

export const PAUSE_GAP_MIN_MS = 150;
export const PAUSE_GAP_MAX_MS = 2_500;
export const PAUSE_PROFILE_MIN_SAMPLES = 8;
export const PAUSE_PROFILE_WINDOW = 40;
export const STABLE_WINDOW_MIN_MS = 400;
export const STABLE_WINDOW_MAX_MS = 1_100;
export const PAUSE_SENTENCE_MARGIN_MS = 120;
export const PAUSE_LONG_EXTRA_MS = 200;
/** Of this speaker's own pauses, wait out this share before cutting. */
export const PAUSE_PROFILE_PERCENTILE = 0.75;

export type StableWindows = {
  sentenceMs: number;
  longMs: number;
  /** How many pauses the recommendation rests on — the operator's diagnostics read this. */
  samples: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * A gap only counts as a deliberate pause. Below the floor it is the cadence of the audio chunks
 * themselves; above the ceiling the speaker has stopped talking altogether, and counting end-of-turn
 * silence would drag every threshold up until the adaptation is worse than the constant it replaced.
 */
export function pauseGapIsUsable(gapMs: number): boolean {
  return Number.isFinite(gapMs) && gapMs >= PAUSE_GAP_MIN_MS && gapMs <= PAUSE_GAP_MAX_MS;
}

export function pausePercentile(gaps: number[], share: number): number {
  if (gaps.length === 0) return 0;
  const sorted = [...gaps].sort((left, right) => left - right);
  const index = clamp(Math.ceil(share * sorted.length) - 1, 0, sorted.length - 1);
  return sorted[index] ?? 0;
}

/**
 * null means "not enough evidence yet" — the caller keeps its fixed defaults. Returning a half-learned
 * number would be worse than not adapting at all, because the first pauses of a session are usually the
 * microphone being adjusted rather than the speaker talking.
 */
export function recommendStableWindows(
  gaps: number[],
  maxMs: number = STABLE_WINDOW_MAX_MS,
): StableWindows | null {
  const usable = gaps.filter(pauseGapIsUsable);
  if (usable.length < PAUSE_PROFILE_MIN_SAMPLES) return null;

  // TASK 24: the ceiling is now the CALLER's, not a module constant. A speaker who leaves 1.5–2s
  // between clauses had every recommendation flattened to 1_100ms — below their real pause — so the
  // adaptation was invisible for exactly the speakers it exists to serve. The knob's "Tự học" step
  // hands in a wider ceiling; every other caller keeps the original one.
  const ceiling = Math.max(STABLE_WINDOW_MIN_MS, Number.isFinite(maxMs) ? maxMs : STABLE_WINDOW_MAX_MS);
  const typical = pausePercentile(usable, PAUSE_PROFILE_PERCENTILE);
  const sentenceMs = clamp(Math.round(typical + PAUSE_SENTENCE_MARGIN_MS), STABLE_WINDOW_MIN_MS, ceiling);
  // A partial with no sentence-ending punctuation is weaker evidence, so it waits longer — the same
  // ordering the fixed 600/800 pair had.
  const longMs = clamp(sentenceMs + PAUSE_LONG_EXTRA_MS, STABLE_WINDOW_MIN_MS, ceiling);
  return { sentenceMs, longMs, samples: usable.length };
}

/**
 * Keyed because one microphone carries two speakers taking turns (the Vietnamese MC, then the Japanese
 * guest): a fast Japanese guest must not set the threshold for the slow Vietnamese MC. In a one-way
 * session every observation lands on the same key and the keying costs nothing.
 */
export function createSpeechPauseProfile() {
  const gapsByKey = new Map<string, number[]>();

  return {
    observe(gapMs: number, key = 'default'): boolean {
      if (!pauseGapIsUsable(gapMs)) return false;
      const gaps = gapsByKey.get(key) ?? [];
      gaps.push(gapMs);
      // Only the recent past: a speaker who slows down after forty minutes should drag the threshold
      // with them.
      if (gaps.length > PAUSE_PROFILE_WINDOW) gaps.splice(0, gaps.length - PAUSE_PROFILE_WINDOW);
      gapsByKey.set(key, gaps);
      return true;
    },
    windows(key = 'default', maxMs: number = STABLE_WINDOW_MAX_MS): StableWindows | null {
      return recommendStableWindows(gapsByKey.get(key) ?? [], maxMs);
    },
    reset(): void {
      gapsByKey.clear();
    },
  };
}

export type SpeechPauseProfile = ReturnType<typeof createSpeechPauseProfile>;
