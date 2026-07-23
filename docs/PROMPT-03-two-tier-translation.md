# PROMPT 03 — Phase 2: Two-tier translation (fast draft → accurate refine) + session context

> Cách dùng: gửi SAU KHI Phase 1 (PROMPT-02) đã nghiệm thu. Copy toàn bộ nội dung dưới dấu gạch ngang cho Claude trên repo `EsuhaiAlesu/ATS_UserUI`. Copy nguyên phản hồi của nó gửi lại để review.

---

<role>
You are a senior frontend engineer working in the **ATS_UserUI** repository, continuing the **ONLINE lane** built in the previous phase. You are precise, you follow the contract exactly, and you never invent endpoints, events, or fields that are not in `docs/ONLINE-LANE-CONTRACT.md`.
</role>

<context>
Reminder of the mandatory rules already in this repo's `CLAUDE.md`: online-lane code lives only in `src/lib/lanes/online/` + the `/online-lab` page; the backend is reached only through `/online-api`; offline-lane files (`src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, existing pages) must not be touched.

This phase introduces the **signature behavior of the core pipeline**: each sentence is translated in TWO tiers —
- **Tier 1 (draft)**: a rough translation requested while the speaker is STILL talking → the audience sees a near-realtime translation (dim line).
- **Tier 2 (refine)**: when the sentence finalizes, an accurate translation with context + glossary → replaces the draft in place, shown bold (`corrected: true`).

Both tiers call the same `POST /online-api/refine-preview-translation`, differing only in `refineStage: 'draft' | 'refine'`. This maps exactly to the UI's existing `line` → `line_update (corrected)` model. Model choice is server-internal — the client never knows or configures it.

Every constant below encodes a real cost/latency measurement from live sessions (e.g. one uncapped morning produced 947 refine calls / $6.35) — use the exact values; do not tune them.
</context>

<task>
1. Create three logic modules verbatim (reference code below).
2. Implement the draft tier (M5) in `onlineLane.ts`.
3. Implement the refine tier + session context (M6) in `onlineLane.ts`.
4. Update `/online-lab`, self-verify, and reply in the mandatory report format.
</task>

## TASK 1 — Create 3 logic files VERBATIM

<reference_code>

### `src/lib/lanes/online/liveDraftTranslation.ts`

```ts
export function joinLiveDraftSource(base: string, tail: string) {
  const normalizedBase = base.trim();
  const normalizedTail = tail.trim();
  if (!normalizedBase) return normalizedTail;
  if (!normalizedTail) return normalizedBase;
  return `${normalizedBase} ${normalizedTail}`;
}

/**
 * True when `candidate` is a complete leading unit of the current ASR text.
 * The boundary check prevents promoting/TTS-reading half of a word while a
 * realtime partial is still extending that word.
 */
export function isStableDraftPrefix(current: string, candidate: string) {
  const normalizedCurrent = current.trim();
  const normalizedCandidate = candidate.trim();
  if (!normalizedCandidate || !normalizedCurrent.startsWith(normalizedCandidate)) return false;
  if (normalizedCurrent.length === normalizedCandidate.length) return true;
  return /[\s.,!?;:…。、！？]/u.test(normalizedCurrent.charAt(normalizedCandidate.length));
}

export type PromotedPrefixResult = {
  text: string;
  matched: boolean;
  /** The ASR briefly regressed to an earlier prefix already shown/spoken. */
  coveredByPromoted: boolean;
};

/**
 * Removes a previously promoted partial only on an exact prefix match. When
 * ASR revises that prefix, callers keep the corrected text instead of
 * slicing by character count and silently losing words.
 */
export function stripPromotedPrefix(text: string, promotedPrefix: string): PromotedPrefixResult {
  const value = text.trim();
  const prefix = promotedPrefix.trim();
  if (!prefix) return { text: value, matched: false, coveredByPromoted: false };
  if (value.startsWith(prefix)) {
    return { text: value.slice(prefix.length).trimStart(), matched: true, coveredByPromoted: false };
  }
  if (prefix.startsWith(value)) {
    return { text: '', matched: true, coveredByPromoted: true };
  }
  return { text: value, matched: false, coveredByPromoted: false };
}
```

### `src/lib/lanes/online/livePipelinePolicy.ts`

```ts
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
```

### `src/lib/lanes/online/sourceSpeechPace.ts`

```ts
export type SourceSpeechPaceLabel = 'slow' | 'normal' | 'fast' | 'very_fast';

export type SourceSpeechPace = {
  label: SourceSpeechPaceLabel;
  unitsPerSecond: number;
  durationMs: number;
  speechUnits: number;
  confidence: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * Estimate source delivery pace from Qwen's text-so-far and the actual mic
 * speech window. Vietnamese whitespace tokens are a useful syllable proxy.
 */
export function estimateSourceSpeechPace(text: string, durationMs: number): SourceSpeechPace | undefined {
  const speechUnits = text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  if (speechUnits < 3 || !Number.isFinite(durationMs) || durationMs < 500) return undefined;

  const safeDurationMs = clamp(durationMs, 500, 60_000);
  const unitsPerSecond = speechUnits / (safeDurationMs / 1_000);
  const label: SourceSpeechPaceLabel = unitsPerSecond < 2.3
    ? 'slow'
    : unitsPerSecond < 3.6
      ? 'normal'
      : unitsPerSecond < 4.8
        ? 'fast'
        : 'very_fast';
  const confidence = clamp(Math.min(speechUnits / 12, safeDurationMs / 3_000), 0.2, 1);

  return {
    label,
    unitsPerSecond: Number(unitsPerSecond.toFixed(2)),
    durationMs: Math.round(safeDurationMs),
    speechUnits,
    confidence: Number(confidence.toFixed(2)),
  };
}
```

</reference_code>

## TASK 2 — M5: Draft tier in `onlineLane.ts`

Field-measured constants (use exactly):

```ts
const DRAFT_DEBOUNCE_MS = 500;        // interim text changed -> wait 500ms before considering a draft
const DRAFT_MIN_CHARS = 20;           // shorter source -> no draft yet
const DRAFT_MIN_NEW_CHARS = 14;       // must have grown >=14 chars since the last draft call
const DRAFT_PROMOTION_MS = 1_200;     // a draft stable for 1.2s is "promoted" into the official line
const COMMA_FINAL_MIN_CHARS = 2;      // a clause ending at a comma boundary drafts immediately from 2 chars
```

Draft flow:
1. When the interim line (buffer + partial) changes → debounce 500 ms → consider a draft if: source ≥ 20 chars AND grown ≥ 14 chars since the previous draft. **Comma exception**: if the text ends at a comma clause boundary (`findFirstCommaClauseBreak` from Phase 1) and the clause is ≥ 2 chars → call immediately, with priority.
2. BEFORE each call: consult `decideDraftAdmission({ commaFinal, inFlightCount, duplicateInFlight, requestsInWindow })`. If denied → skip this round (count `draftSkipped` per reason). `requestsInWindow` = draft calls in the sliding 60 s window.
3. Call `POST /online-api/refine-preview-translation` with `{ sourceText, sourceLanguage, targetLanguage, refineStage: 'draft', traceId, subtitleId }` — WITHOUT recentFinals/sessionBrief (drafts must be fast and cheap).
4. On response: if the current source is still an extension of the submitted text (`isStableDraftPrefix(currentSource, sentSource)`) → update the interim line's `targetText` (still `interim: true`, `corrected: false`). If the ASR revised backwards → discard the result.
5. **Promotion**: a draft displayed for 1.2 s whose source portion did not change → mark that portion "promoted" (use `stripPromotedPrefix` when the next partial arrives, so the promoted head is not re-translated). The promoted part stays on screen; the tail continues after it.

## TASK 3 — M6: Refine tier + session context in `onlineLane.ts`

```ts
const REFINE_IDLE_MS = 950;             // after finalize, wait 950ms of quiet (no new partial) before refine
const PUNCTUATION_REFINE_IDLE_MS = 360; // ... but only 360ms when the text already ends with strong punctuation
const RECENT_FINALS_MAX = 6;
```

1. Replace Phase 1's fixed 2 500 ms stale-flush timer with **`getAdaptiveShortUtteranceFlushDelay({ text, sessionTerms })`** — fillers keep the conservative 2.5 s wait, meaningful clauses flush in 0.85–1.5 s.
2. When a segment flushes (Phase 1 rules) → wait per the two idle constants above → call refine: `{ sourceText, sourceLanguage, targetLanguage, refineStage: 'refine', recentFinals, sessionBrief, sessionTerms, sourcePace?, sourceEmotion?, traceId, subtitleId }`.
   - `recentFinals`: up to the 6 most recent FINALIZED source sentences (excluding the one being sent).
   - `sourceEmotion`: the latest `asr.emotion` value received on the WS (if any).
   - `sourcePace`: `estimateSourceSpeechPace(text, durationMs)?.label` — measure `durationMs` from the segment's first partial to finalization, subtracting silent gaps > 1 200 ms (`SOURCE_SPEECH_GAP_MS`), plus a 650 ms lead before the first partial (`FIRST_PARTIAL_LEAD_MS`) because Qwen emits its first partial later than actual speech onset.
3. On response → upsert the same `lid`: `sourceText` = the server's returned version (already ASR-corrected against terms — always display this, never the raw transcript), `targetText` = `translatedText`, `interim: false`, `corrected: true`. Store `ttsText`/`emotion`/`ttsSpeed` on the line (Phase 3 will consume them; do not play audio yet).
4. Refine failure → keep the line with its draft translation (if any) + `onError`; the session must survive. Retry exactly once after 800 ms for network/5xx errors.
5. `sessionTerms`/`sessionBrief` come from `start()` opts (the `/online-lab` textareas — the shared glossary/brief data both lanes read is supplied by the UI).

## TASK 4 — Update `/online-lab`

- The interim line shows the dim/italic draft translation under the source; when refine returns, it turns bold in place (exactly the UI's `line` → `line_update corrected` model).
- Diagnostics add: `draftCalls`, `draftSkipped` (per reason), `refineCalls`, `refineRetries`.

<constraints>
Files you must NOT modify: offline-lane files, `src/lib/lanes/types.ts`, any page other than `OnlineLab.tsx`.
If anything is ambiguous or conflicts with the repo's reality, ask in the "Questions" section instead of inventing a solution.
</constraints>

<acceptance_criteria>
Verify each item yourself before replying, by actually running the checks — do not assume:
- [ ] `npm run build` passes.
- [ ] The 3 logic files match the embedded reference EXACTLY (zero diff).
- [ ] Speaking one long sentence: a dim translation appears BEFORE the sentence ends, then turns bold in place when refine returns.
- [ ] Speaking fast and continuously: draft calls get denied by admission (visible in diagnostics), never exceeding 30 calls/minute.
- [ ] Entering a glossary term and speaking a sentence where ASR mishears it → the refined line shows the corrected term (server-side correction).
- [ ] No diff on any forbidden file.
</acceptance_criteria>

<report_format>
Reply in exactly this structure (the reviewer cannot open this repo — the report is the only window into your work):
1. **Summary** — ≤5 lines in English + 1 closing line in Vietnamese (tóm tắt 1 dòng).
2. **Files** — every file created/modified, one line each with purpose.
3. **Full content** of the draft/refine orchestration sections of `onlineLane.ts` (no need to re-paste the 3 verbatim logic files — just confirm they match).
4. **Build output** — paste the actual tail of `npm run build` verbatim. Do not paraphrase; if you did not run it, say so explicitly.
5. **Questions / uncertainties** — anything unresolved; never decide beyond the contract on your own.
</report_format>
