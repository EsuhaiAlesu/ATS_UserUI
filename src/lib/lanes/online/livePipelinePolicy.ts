export const DRAFT_MAX_CONCURRENT_REQUESTS = 2;
export const DRAFT_MAX_REQUESTS_PER_MINUTE = 30;
// Slots inside the per-minute cap that only comma-final clauses may use, so a
// fast-talking MC cannot exhaust the whole window with ordinary drafts and
// then lose the early-bold/early-TTS path on an important clause boundary.
export const DRAFT_COMMA_RESERVED_REQUESTS = 6;
export const DRAFT_RATE_WINDOW_MS = 60_000;

export type DraftAdmissionInput = {
  commaFinal: boolean;
  inFlightCount: number;
  duplicateInFlight: boolean;
  requestsInWindow: number;
};

export type DraftAdmissionDecision =
  | { allow: true }
  | { allow: false; reason: 'duplicate' | 'rate-limit' | 'in-flight' };

/**
 * Normal live drafts stay single-flight. A comma-final clause may overtake
 * one older draft, but never grows the fan-out beyond two concurrent calls.
 * The hard per-minute ceiling stays at 30; ordinary drafts stop earlier so
 * comma-final clauses always keep a reserved slice of that budget.
 */
export function decideDraftAdmission(input: DraftAdmissionInput): DraftAdmissionDecision {
  if (input.duplicateInFlight) return { allow: false, reason: 'duplicate' };
  const rateLimit = input.commaFinal
    ? DRAFT_MAX_REQUESTS_PER_MINUTE
    : DRAFT_MAX_REQUESTS_PER_MINUTE - DRAFT_COMMA_RESERVED_REQUESTS;
  if (input.requestsInWindow >= rateLimit) {
    return { allow: false, reason: 'rate-limit' };
  }
  const concurrencyLimit = input.commaFinal ? DRAFT_MAX_CONCURRENT_REQUESTS : 1;
  if (input.inFlightCount >= concurrencyLimit) return { allow: false, reason: 'in-flight' };
  return { allow: true };
}

const FILLER_ONLY_PATTERN = /^(?:(?:à|ờ|ừ|ừm|ừ hử|ờm|um|uh|hmm+|ha+|haha+|hahaha+|え+と|あの+|うん|はい)[\s,.!?…]*)+$/iu;
const CEREMONY_SHORT_PATTERN = /(?:^|\s)(?:vâng|xin chào|cảm ơn|kính thưa|trân trọng|chào mừng|hai|こんにちは|ありがとう|ようこそ)(?:\s|$|[,.!?…])/iu;
const PUNCTUATED_END_PATTERN = /[,;:!?。．！？，、；：…]\s*$/u;

export type AdaptiveFlushInput = {
  text: string;
  sessionTerms?: string;
};

/**
 * Qwen has already observed its server-VAD silence before this timer starts.
 * Meaningful short clauses therefore wait only long enough for a genuine
 * continuation to arrive; fillers retain the conservative legacy delay.
 */
export function getAdaptiveShortUtteranceFlushDelay(input: AdaptiveFlushInput): number {
  const text = input.text.trim();
  if (!text || FILLER_ONLY_PATTERN.test(text)) return 2_500;

  const normalized = text.toLocaleLowerCase();
  const matchingSessionTerm = (input.sessionTerms ?? '')
    .split(/\r?\n/)
    .map((line) => line.split(/\s*(?:=>|->|→|=|\||\t)\s*/)[0]?.trim().toLocaleLowerCase() ?? '')
    .filter((term) => term.length >= 3)
    .some((term) => normalized.includes(term));

  if (PUNCTUATED_END_PATTERN.test(text) || matchingSessionTerm || CEREMONY_SHORT_PATTERN.test(text)) {
    return 850;
  }

  const speechUnits = text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  if (text.length >= 18 || speechUnits >= 4) return 1_100;
  return 1_500;
}
