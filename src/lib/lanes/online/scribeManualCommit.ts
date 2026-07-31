// src/lib/lanes/online/scribeManualCommit.ts — decide WHEN the client should close a sentence itself
// instead of waiting for the vendor's voice-activity detector.
//
// The ASR session runs `commit_strategy=vad`: upstream ends a turn only after ~1.5s of silence. In a hall
// there is never 1.5s of silence (applause, music, a second speaker), so a turn can be held for tens of
// seconds — the audience sees nothing, then one enormous block lands and is read out in one breath. That
// is the "khựng / ngưng" the operator reports.
//
// The cure is not to fight the VAD but to add a second, faster trigger: once the partial ALREADY reads as
// a finished sentence and has stopped changing, close it. The VAD stays as the backstop, so a sentence
// with no punctuation still lands the old way.
//
// Pure functions, no timers and no network — the lane owns the clock so the whole thing stays testable.

import { endsWithStrongSentenceBreak } from './transcriptSegmentation';

export const SCRIBE_MANUAL_SENTENCE_STABLE_MS = 600; // a finished sentence, unchanged this long → commit
export const SCRIBE_MANUAL_LONG_STABLE_MS = 800; // no punctuation but very long → commit slightly later
export const SCRIBE_MANUAL_LONG_PARTIAL_CHARS = 200; // "very long" — past this a turn is already too big
export const SCRIBE_MANUAL_FORCE_COMMIT_MS = 25_000; // nothing may hold the microphone longer than this
export const SCRIBE_MANUAL_MIN_COMMIT_GAP_MS = 2_500; // upstream throttles commits; do not machine-gun them

export type ScribeManualCommitReason = 'sentence' | 'length' | 'max-duration';

/**
 * Plan the next client-side commit, or `null` when this partial does not deserve one yet.
 *
 * `changedAt` is when the partial text last CHANGED (not when it last arrived): a speaker who pauses
 * mid-thought keeps sending identical partials, and that stillness is exactly the signal we want.
 *
 * `windows` lets a future speaker-pause profile replace the two constants with this speaker's own
 * measured pauses; until then the constants are the middle-of-the-road guess.
 */
export function planStableScribeCommit(
  partial: string,
  changedAt: number,
  lastCommitAt: number,
  now: number,
  windows?: { sentenceMs: number; longMs: number } | null,
): {
  reason: Exclude<ScribeManualCommitReason, 'max-duration'>;
  delayMs: number;
  stableMs: number;
  adaptive: boolean;
} | null {
  const text = partial.trim();
  const sentenceReady = endsWithStrongSentenceBreak(text, true);
  const longReady = text.length >= SCRIBE_MANUAL_LONG_PARTIAL_CHARS;
  if (!sentenceReady && !longReady) return null;

  const stableMs = sentenceReady
    ? (windows?.sentenceMs ?? SCRIBE_MANUAL_SENTENCE_STABLE_MS)
    : (windows?.longMs ?? SCRIBE_MANUAL_LONG_STABLE_MS);
  const stableRemaining = Math.max(0, stableMs - (now - changedAt));
  const gapRemaining = lastCommitAt > 0
    ? Math.max(0, SCRIBE_MANUAL_MIN_COMMIT_GAP_MS - (now - lastCommitAt))
    : 0;
  return {
    reason: sentenceReady ? 'sentence' : 'length',
    delayMs: Math.max(stableRemaining, gapRemaining),
    stableMs,
    adaptive: Boolean(windows),
  };
}

/** How long until the hard ceiling: no single turn may run longer than SCRIBE_MANUAL_FORCE_COMMIT_MS. */
export function nextScribeForceCommitDelay(lastCommitAt: number, now: number): number {
  const base = lastCommitAt || now;
  return Math.max(0, SCRIBE_MANUAL_FORCE_COMMIT_MS - (now - base));
}
