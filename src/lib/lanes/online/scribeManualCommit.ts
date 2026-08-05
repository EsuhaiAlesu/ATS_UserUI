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
export const SCRIBE_MANUAL_STILL_MS = 2_500; // the partial has not moved at all this long → close the turn

export type ScribeManualCommitReason = 'sentence' | 'length' | 'max-duration' | 'stillness';

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

/**
 * The backstop for the step that never commits on punctuation ("Chạy liền mạch").
 *
 * That step hands turn-closing to the vendor's own VAD, which is right — until the hall microphone runs
 * automatic gain control. AGC lifts every pause into audible noise, the VAD never hears its threshold's
 * worth of silence, and a session measured on 04/08 went through with the vendor closing NO turn at all:
 * the only net left was the 25s ceiling, and 25s of dim text with nothing going bold is not usable.
 *
 * So the step is not "never commit" but "never commit ON PUNCTUATION". This trigger looks at one thing
 * only: the partial has not changed AT ALL for `stillMs`. That cannot cut a word in half the way the
 * punctuation trigger did — a word being spoken keeps moving the partial, so stillness means the
 * recogniser itself has stopped producing, not that we grew impatient at a full stop.
 *
 * Deliberately ignores punctuation and length, which is the whole difference from `planStableScribeCommit`.
 */
export function planStillnessCommit(
  partial: string,
  changedAt: number,
  lastCommitAt: number,
  now: number,
  stillMs?: number | null,
): { reason: 'stillness'; delayMs: number; stableMs: number } | null {
  if (!partial.trim()) return null;
  const stableMs = typeof stillMs === 'number' && Number.isFinite(stillMs) && stillMs > 0
    ? stillMs
    : SCRIBE_MANUAL_STILL_MS;
  const stableRemaining = Math.max(0, stableMs - (now - changedAt));
  const gapRemaining = lastCommitAt > 0
    ? Math.max(0, SCRIBE_MANUAL_MIN_COMMIT_GAP_MS - (now - lastCommitAt))
    : 0;
  return { reason: 'stillness', delayMs: Math.max(stableRemaining, gapRemaining), stableMs };
}

/** How long until the hard ceiling: no single turn may run longer than SCRIBE_MANUAL_FORCE_COMMIT_MS. */
export function nextScribeForceCommitDelay(lastCommitAt: number, now: number): number {
  const base = lastCommitAt || now;
  return Math.max(0, SCRIBE_MANUAL_FORCE_COMMIT_MS - (now - base));
}

// ---- the ceiling must not cut a word in half ----
//
// 08/05 evidence, from the rehearsal transcript: `"...Hội đồng quản trị đặc biệt của Esuh" | "ai lên phát
// biểu khai mạc."` and `'một lời tuyên bố: "Es" | "uhai, chúng ta sẵn sàng..."'`. Both halves were then
// translated SEPARATELY, and the hall wall showed 「うはい、私たちは…」 — the company's own name, broken, in
// the middle of its own anniversary.
//
// Nothing else in this file can do that. `planStableScribeCommit` needs punctuation (or 200 chars) AND
// stillness; `planStillnessCommit` needs 2.5s of a partial that has not moved. The ceiling was the one
// trigger that looked at NOTHING — a bare 25s timer firing wherever the speaker happened to be.
//
// A commit cuts the AUDIO at the instant it is sent, and the recogniser's text runs several hundred
// milliseconds behind that instant. So no text-level test can tell us whether the cut is safe: by the
// time the words arrive, the damage is done. The only honest signal is the microphone itself — a real
// gap between two words, where there is no phoneme energy to cut through.
//
// Hence: at the ceiling, WAIT for the next quiet moment instead of cutting. Ordinary speech leaves a gap
// this size several times a second, so the wait is normally imperceptible. `graceMs` is the promise that
// this can never hang: a hall that is never quiet (applause, music, a second microphone) still gets its
// commit, just late — and in a hall that loud, nobody is mid-word anyway.
export const SCRIBE_FORCE_COMMIT_GAP_MS = 220; // quiet this long ⇒ we are between two words, not inside one
export const SCRIBE_FORCE_COMMIT_RETRY_MS = 120; // not quiet yet ⇒ look again this soon
export const SCRIBE_FORCE_COMMIT_GRACE_MS = 10_000; // never quiet ⇒ commit anyway rather than hold forever

/**
 * The ceiling, made boundary-aware. Answers one of two things: commit now, or look again in `delayMs`.
 *
 * @param lastLoudAt when the microphone was last above the "sound present" threshold. 0 = never — an
 *                   idle room, where there is no word to cut and the commit is free.
 */
export function planForceCommit(args: {
  lastCommitAt: number;
  now: number;
  lastLoudAt: number;
  gapMs?: number;
  retryMs?: number;
  graceMs?: number;
}): { commit: boolean; delayMs: number; waitedMs: number } {
  const { lastCommitAt, now, lastLoudAt } = args;
  const gapMs = args.gapMs ?? SCRIBE_FORCE_COMMIT_GAP_MS;
  const retryMs = args.retryMs ?? SCRIBE_FORCE_COMMIT_RETRY_MS;
  const graceMs = args.graceMs ?? SCRIBE_FORCE_COMMIT_GRACE_MS;

  const due = nextScribeForceCommitDelay(lastCommitAt, now);
  if (due > 0) return { commit: false, delayMs: due, waitedMs: 0 };

  // How long we have already been holding PAST the ceiling — the number `graceMs` bounds, and the one
  // the diagnostics line reports so the operator can see the ceiling straining.
  const base = lastCommitAt || now;
  const waitedMs = Math.max(0, now - base - SCRIBE_MANUAL_FORCE_COMMIT_MS);

  if (!lastLoudAt) return { commit: true, delayMs: 0, waitedMs }; // silent room: nothing to cut through
  if (now - lastLoudAt >= gapMs) return { commit: true, delayMs: 0, waitedMs };
  if (waitedMs >= graceMs) return { commit: true, delayMs: 0, waitedMs };
  return { commit: false, delayMs: Math.min(retryMs, graceMs - waitedMs), waitedMs };
}
