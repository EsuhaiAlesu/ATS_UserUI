# PROMPT 05 — Phase 4: Session operations (transcript saving + usage reporting + latency metrics)

> Cách dùng: gửi SAU KHI Phase 2 (PROMPT-03) đã nghiệm thu (không phụ thuộc Phase 3 — nếu Phase 3 bị cắt vẫn gửi được prompt này). Copy toàn bộ nội dung dưới dấu gạch ngang cho Claude trên repo `EsuhaiAlesu/ATS_UserUI`. Copy nguyên phản hồi gửi lại để review.

---

<role>
You are a senior frontend engineer working in the **ATS_UserUI** repository, continuing the **ONLINE lane** built in the previous phase. You are precise, you follow the contract exactly, and you never invent endpoints, events, or fields that are not in `docs/ONLINE-LANE-CONTRACT.md`.
</role>

<context>
Reminder of the mandatory rules already in this repo's `CLAUDE.md`: online-lane code lives only in `src/lib/lanes/online/` + the `/online-lab` page; the backend is reached only through `/online-api`; offline-lane files (`src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, existing pages) must not be touched.

This phase adds **M8 — session operations**: transcript persistence, periodic usage reporting, and latency metrics. Why it matters at the event: the transcript is the deliverable clients may ask for afterwards (it must survive even a server crash), usage reports feed cost tracking, and latency numbers are how we judge pipeline quality during rehearsal.
</context>

<task>
1. Build the transcript export/save module with auto-save and a download fallback.
2. Send periodic usage reports.
3. Build the latency tracker.
4. Update `/online-lab`, self-verify, and reply in the mandatory report format.
</task>

## TASK 1 — Transcript saving (`src/lib/lanes/online/sessionExport.ts`)

Endpoint: `POST /online-api/save-session` body `{ "filename": string, "json": string, "md": string }` → response `{ "saved": true, "filename": string }`. Notes: `json` and `md` are **pre-serialized strings**, not objects; at least one is required; the server enforces a total size limit (413 when exceeded).

1. In the lane, accumulate finalized lines (`corrected`, or final lines whose refine failed): `{ lid, at, sourceText, targetText, sourceLanguage, targetLanguage }`.
2. `buildSessionExport(lines, meta)` returns:
   - `json`: `JSON.stringify({ startedAt, endedAt, sourceLanguage, targetLanguage, lines }, null, 2)`
   - `md`: a markdown table `| Time | Source | Translation |`, one row per line (time as `HH:mm:ss`).
   - `filename`: `online_<YYYYMMDD-HHmmss>` (session start time).
3. `saveSession()`: POST to the server; **on any failure (network/4xx/5xx) → fall back to a browser download** (Blob + `<a download>`) of both `.json` and `.md` — session data must never be lost just because the server failed.
4. **Auto-save**: every **30 seconds** (`AUTO_SAVE_INTERVAL_MS = 30_000`), if new lines exist since the last save → POST with the SAME `filename` (the server overwrites the same file — intended behavior: the running session is continuously checkpointed). On `stop()` → save one final time.

## TASK 2 — Usage reporting (`POST /online-api/usage-report`)

The body is free-form JSON (the server just logs it for cost tracking — 4 000 char limit). Send every **5 minutes** (`USAGE_REPORT_INTERVAL_MS = 300_000`) and once on `stop()`:

```json
{
  "lane": "online",
  "sessionStartedAt": "…ISO…",
  "finals": 12,
  "draftCalls": 34, "draftSkipped": {"duplicate": 1, "rate-limit": 0, "in-flight": 5},
  "refineCalls": 12, "refineRetries": 1,
  "ttsSentences": 10,
  "reconnects": 0, "droppedGhosts": 2
}
```

(All counters already exist in the Phase 1–3 diagnostics; `ttsSentences` = 0 if Phase 3 was skipped.)

## TASK 3 — Latency metrics (`src/lib/lanes/online/latencyTracker.ts`)

Per segment (finalized line), record timestamps using `performance.now()`:

```ts
export type SegmentTiming = {
  lid: string;
  firstPartialAt?: number;  // first partial of the sentence
  finalAt?: number;         // ...transcription.completed received / segment flushed
  draftShownAt?: number;    // first draft translation displayed (if any)
  refineShownAt?: number;   // refined translation displayed (corrected)
  ttsStartAt?: number;      // voice playback started (if Phase 3 exists)
};
```

- The tracker collects one `SegmentTiming` per lid, and every **10 segments** (`LATENCY_REPORT_EVERY_SEGMENTS = 10`) computes median + p90 of: `firstPartial→draft`, `final→refine`, `final→tts` (skip missing marks).
- Results appear in the `/online-lab` diagnostics block (simple text: `draft p50/p90: 800/1400ms · refine p50/p90: 1200/2100ms`) and as a single-line JSON via `console.info` so it can be copied.

## TASK 4 — Update `/online-lab`

- A **"Save transcript"** button (manual save at any time) + a status line: `Saved at HH:mm:ss` / `Save failed → downloaded to this machine`.
- Diagnostics add: the latency numbers (TASK 3) + the timestamp of the last usage report.

<constraints>
Files you must NOT modify: offline-lane files, `src/lib/lanes/types.ts`, any page other than `OnlineLab.tsx`.
If anything is ambiguous or conflicts with the repo's reality, ask in the "Questions" section instead of inventing a solution.
</constraints>

<acceptance_criteria>
Verify each item yourself before replying, by actually running the checks — do not assume:
- [ ] `npm run build` passes.
- [ ] Run a short session, click Save → server responds `{saved:true}`; the file appears on the server side (the core server's history directory).
- [ ] Stop the core server, click Save → the browser downloads `.json` + `.md`, and the UI clearly reports the fallback.
- [ ] Auto-save fires every 30 s when new lines exist (check the network tab) and does NOT fire when nothing changed.
- [ ] After ≥10 sentences, diagnostics show p50/p90 numbers.
- [ ] No diff on any forbidden file.
</acceptance_criteria>

<report_format>
Reply in exactly this structure (the reviewer cannot open this repo — the report is the only window into your work):
1. **Summary** — ≤5 lines in English + 1 closing line in Vietnamese (tóm tắt 1 dòng).
2. **Files** — every file created/modified, one line each with purpose.
3. **Full content** of `sessionExport.ts` + `latencyTracker.ts`.
4. **Build output** — paste the actual tail of `npm run build` verbatim. Do not paraphrase; if you did not run it, say so explicitly.
5. **Questions / uncertainties** — anything unresolved; never decide beyond the contract on your own.
</report_format>
