# PROMPT 02 — Phase 1: ASR quality (production capture + reconnect + segmentation + ghost-transcript guard)

> Cách dùng: gửi SAU KHI Phase 0 (PROMPT-01) đã nghiệm thu. Copy toàn bộ nội dung dưới dấu gạch ngang cho Claude trên repo `EsuhaiAlesu/ATS_UserUI`. Copy nguyên phản hồi của nó gửi lại để review.

---

<role>
You are a senior frontend engineer working in the **ATS_UserUI** repository, continuing the **ONLINE lane** built in the previous phase. You are precise, you follow the contract exactly, and you never invent endpoints, events, or fields that are not in `docs/ONLINE-LANE-CONTRACT.md`.
</role>

<context>
Reminder of the mandatory rules already in this repo's `CLAUDE.md`: online-lane code lives only in `src/lib/lanes/online/` + the `/online-lab` page; the backend is reached only through `/online-api`; offline-lane files (`src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, existing pages) must not be touched.

This phase hardens four things for real-event conditions: **(M1) production-grade capture**, **(M2) a self-healing WS client**, **(M3) sentence segmentation**, **(M4) hallucinated-transcript guard**. Every constant and every embedded file below was measured/validated in live sessions of the core repo — the numbers encode real incidents (a looping ASR fed by a near-silent phone mic, mid-sentence cuts on `10.000`, wedged upstreams that looked like silence). Use the exact values; do not tune them.
</context>

<task>
1. Upgrade the capture worklet (M1).
2. Add reconnect/backoff + stall watchdog to the lane (M2).
3. Create the segmentation module verbatim and apply its merge rules (M3).
4. Create the speech-evidence module verbatim and wire the ghost guards (M4).
5. Update `/online-lab` diagnostics, self-verify, and reply in the mandatory report format.
</task>

## TASK 1 — M1: Capture upgrade (`src/lib/lanes/online/pcm16Capture.ts`)

Replace the simple worklet from Phase 0 with the full pipeline (proven in the core repo's production sessions). All processing happens on the audio rendering thread:

1. **Stop forcing `AudioContext({sampleRate: 16000})`.** Create a default-rate `AudioContext()` and **resample to 16 kHz inside the worklet** using a linear resampler that KEEPS STATE across render quanta (`lastSample` + `resampleAccumulator` as processor fields, not locals in `process()`). Reason: 44.1 kHz devices produce audible discontinuities if resampling state resets each quantum.
2. **4096-sample output buffer**: accumulate 4096 samples at 16 kHz, then post one packet (transferable Int16Array). One packet ≈ 256 ms of audio.
3. **Near-mic noise gate** (toggleable via a `configure` message): a frame counts as silence when RMS < `0.012` AND peak < `0.035` AND RMS < `noiseRms * 3.2`, where `noiseRms` is a running noise-floor estimate (init `0.002`, updated only on silent frames: `noiseRms = noiseRms*0.95 + rms*0.05`). After a voiced frame, hold the gate open for **360 ms** (hangover) before closing. Gated frames are **NOT dropped** — replace them with zeros so server-side VAD timing is preserved.
4. **Voiced-sample counting**: the worklet counts non-gated samples per packet and sends it along: `{ pcm, voicedMs }` where `voicedMs = voicedSamples / 16`. This is the speech evidence consumed by M4.
5. **VU level**: keep the RMS → `onLevel` ticks (~10/second), computed on the frame BEFORE gating.
6. `configure` message from the main thread: `{ type:'configure', inputSampleRate, outputSampleRate: 16000, nearMicGateEnabled: boolean }`. Gate defaults ON for a regular microphone.

New module API:

```ts
export interface CapturePacket { pcm: ArrayBuffer; voicedMs: number; }
export interface CaptureHandle { stop(): void; }
export async function startPcm16Capture(
  deviceId: string | undefined,
  onPacket: (packet: CapturePacket) => void,
  onLevel: (v: number) => void,
  options?: { nearMicGate?: boolean },
): Promise<CaptureHandle>;
```

`getUserMedia` audio constraints: `{ deviceId?, echoCancellation: true, noiseSuppression: true, autoGainControl: true }` (our gate runs AFTER the browser's processing).

## TASK 2 — M2: Self-healing WS client (`src/lib/lanes/online/onlineLane.ts`)

Add the following mechanisms with these exact, field-measured constants:

```ts
const RECONNECT_MAX_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 600;     // exponential: 600, 1200, 2400, 4800, 5000 (capped)
const RECONNECT_MAX_DELAY_MS = 5_000;
const STALL_RECONNECT_MS = 45_000;       // 45s with zero events -> upstream wedged -> reconnect
const STALL_LOUD_RECONNECT_MS = 35_000;  // sound reaching the mic but 35s with zero events -> reconnect earlier
const AUDIO_LOUD_LEVEL_THRESHOLD = 0.09; // onLevel >= this counts as "sound present" (≈ peak 12/127)
```

1. **Reconnect with backoff**: unexpected WS close while running → status `reconnecting`, retry with delay `min(BASE * 2^(attempt-1), MAX)`, up to 5 attempts, then `error`. Receiving `session.created` again → reset the attempt counter to 0, status back to `listening`. Capture keeps running during reconnects; audio produced while the WS is not OPEN is discarded (no unbounded buffering).
2. **Stall watchdog**: every 5 s check: (a) `now - lastEventAt > 45_000` → force reconnect; (b) sound present (`lastLoudAt > lastEventAt`) and `now - lastEventAt > 35_000` → force reconnect earlier. `lastEventAt` updates on ANY JSON event from the WS; `lastLoudAt` updates when `onLevel` exceeds the loud threshold. Rationale: a transcription session emits nothing during real silence, so silence and a wedged upstream look identical from events alone — the local level monitor disambiguates. A quiet room never triggers a false reconnect.
3. **Session counters**: keep `lastEventAt`, `lastLoudAt`, `reconnectAttempts` accessible via a simple `getDiagnostics()` — Phase 4 consumes them.

## TASK 3 — M3: Sentence segmentation (`src/lib/lanes/online/transcriptSegmentation.ts`)

<reference_code>
Create the file with EXACTLY this content (validated in the core repo — do not modify):

```ts
const ALWAYS_STRONG_BREAKS = new Set(['。', '！', '？', '!', '?']);
const PERIOD_BREAKS = new Set(['.', '．']);
const COMMA_BREAKS = new Set([',', '，', '、']);

function isAsciiDigit(value: string | undefined) {
  return value !== undefined && value >= '0' && value <= '9';
}

/**
 * A dot between two digits is part of a decimal or a grouped number, not the
 * end of a sentence. Vietnamese transcripts commonly contain 10.000 and
 * 100.000.000, so treating every dot as punctuation corrupts segmentation.
 */
export function isNumericSeparator(text: string, index: number) {
  return (
    PERIOD_BREAKS.has(text[index] ?? '') &&
    isAsciiDigit(text[index - 1]) &&
    isAsciiDigit(text[index + 1])
  );
}

/**
 * Return the first usable comma boundary, including the comma itself.
 * A comma between two digits (for example 3,14) is numeric punctuation and
 * must not finalize a subtitle clause.
 */
export function findFirstCommaClauseBreak(text: string, minimumClauseChars = 1) {
  for (let index = 0; index < text.length; index += 1) {
    if (!COMMA_BREAKS.has(text[index] ?? '')) continue;
    if (isAsciiDigit(text[index - 1]) && isAsciiDigit(text[index + 1])) continue;
    if (text.slice(0, index).trim().length < minimumClauseChars) continue;
    return index + 1;
  }
  return 0;
}

export function findLastStrongSentenceBreak(text: string, includePeriods: boolean) {
  let lastBreak = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] ?? '';
    if (ALWAYS_STRONG_BREAKS.has(character)) {
      lastBreak = index + 1;
      continue;
    }
    if (includePeriods && PERIOD_BREAKS.has(character) && !isNumericSeparator(text, index)) {
      lastBreak = index + 1;
    }
  }
  return lastBreak;
}

export function endsWithStrongSentenceBreak(text: string, includePeriods: boolean) {
  const trimmed = text.trimEnd();
  if (!trimmed) return false;
  return findLastStrongSentenceBreak(trimmed, includePeriods) === trimmed.length;
}
```
</reference_code>

Apply in `onlineLane.ts` with these constants:

```ts
const SEGMENT_MAX_CHARS = 120;        // longer finalized text -> cut at the last strong break
const SEGMENT_MIN_CHARS = 18;         // shorter fragments wait to merge with the next one
const UTTERANCE_MIN_FLUSH_CHARS = 40; // finals shorter than this wait for a companion
const STALE_SEGMENT_FLUSH_MS = 2_500; // ... but wait at most 2.5s, then flush anyway
```

Merge rules for finalized sentences (replacing Phase 0's "every `completed` = one line"):
- Each `…transcription.completed` does NOT immediately become its own line. Append it to a **segment buffer**.
- Flush the buffer into an official line when ANY of: (a) the buffer ends with a strong break (`endsWithStrongSentenceBreak(text, true)` — periods count, and thanks to `isNumericSeparator`, `10.000` never splits); (b) total length ≥ 40 chars; (c) 2.5 s passed with no new final (timer). On flush: if the buffer exceeds 120 chars, cut at the last strong break and keep the remainder as the start of the next buffer.
- Only flushed lines enter the translation step (still plain refine as in Phase 0; Phase 2 will upgrade it).
- Partials (`…transcription.text`) still upsert the interim line as before, displaying `buffer + text + stash`.

## TASK 4 — M4: Ghost-transcript guard (`src/lib/lanes/online/asrSpeechEvidence.ts`)

Real incident this prevents: a phone mic feeding near-silence made the ASR loop the same phrase endlessly during a live session.

<reference_code>
Create the file with EXACTLY this content:

```ts
export const ASR_PARTIAL_MIN_VOICED_MS = 96;
export const ASR_FINAL_MIN_VOICED_MS = 160;

export type EvidenceGatedAsrProvider = 'qwen3';

export function providerNeedsSpeechEvidence(provider: string): provider is EvidenceGatedAsrProvider {
  return provider === 'qwen3';
}

export function hasClearSpeechEvidence(voicedMs: number, minimumMs: number) {
  return Number.isFinite(voicedMs) && voicedMs >= minimumMs;
}
```
</reference_code>

Wire in `onlineLane.ts`:
- Accumulate `voicedMs` from `CapturePacket`s (TASK 1) over a ~4 s sliding window (`voicedMsRecent`).
- **Partials** display only when `hasClearSpeechEvidence(voicedMsRecent, ASR_PARTIAL_MIN_VOICED_MS)`.
- **Finals** are accepted only when `hasClearSpeechEvidence(voicedMsRecent, ASR_FINAL_MIN_VOICED_MS)`; otherwise drop silently (log via `console.debug`).
- **Repeat guard**: a final of ≥ 12 chars that is IDENTICAL to the immediately previous final → drop.
- **Long-silence guard**: a transcript arriving after ≥ 4 000 ms with no sound reaching the capture (per `lastLoudAt`) → drop.

## TASK 5 — Update `/online-lab`

- Add a "Noise gate" toggle (default ON) passed into capture.
- Show a small diagnostics block: `reconnectAttempts`, seconds since `lastEventAt`, `voicedMsRecent` — plain text, no styling needed.
- Count guard-dropped lines and show `droppedGhosts: N` in diagnostics.

<constraints>
Files you must NOT modify: `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, `src/lib/lanes/types.ts` (the shared interface — this phase does not need to change it), and any page other than `OnlineLab.tsx`.
If anything is ambiguous or conflicts with the repo's reality, ask in the "Questions" section instead of inventing a solution.
</constraints>

<acceptance_criteria>
Verify each item yourself before replying, by actually running the checks — do not assume:
- [ ] `npm run build` passes.
- [ ] The worklet resampler keeps state (`lastSample`, `resampleAccumulator` are processor fields, not locals inside `process()`).
- [ ] Gated frames are replaced with silence, NOT removed from the stream.
- [ ] Simulated network loss (stop the server) while running → UI shows `reconnecting`, backoff is exactly 600/1200/2400/4800/5000 ms, then `error` after 5 attempts; restarting the server mid-way → the lane reconnects to `listening` on its own.
- [ ] The sentence `Chi phí là 10.000 yên.` is never split between `10` and `000`.
- [ ] No diff on any forbidden file.
</acceptance_criteria>

<report_format>
Reply in exactly this structure (the reviewer cannot open this repo — the report is the only window into your work):
1. **Summary** — ≤5 lines in English + 1 closing line in Vietnamese (tóm tắt 1 dòng).
2. **Files** — every file created/modified, one line each with purpose.
3. **Full content** of `pcm16Capture.ts` and `onlineLane.ts` (if too long, paste at minimum: the worklet source, the reconnect/watchdog section, and the segment-buffer section).
4. **Build output** — paste the actual tail of `npm run build` verbatim. Do not paraphrase; if you did not run it, say so explicitly.
5. **Questions / uncertainties** — anything unresolved; never decide beyond the contract on your own.
</report_format>
