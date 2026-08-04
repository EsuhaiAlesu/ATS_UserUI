# Online Lane Contract — v0.7 (2026-08-03)

> **v0.7 changelog (PROMPT-11 — the lane gets a store of its own, and four fields are recorded):** three
> new resources, six routes, all behind the existing gate and all OFF the live path:
> `GET/PUT /online-api/glossary` (§8), `GET/PUT /online-api/session-boxes` (§9) and
> `GET/PUT /online-api/mishearings` (§10). All three persist through a small server-side JSON store on the
> deploy's disk (`DATA_DIR`, falling back to a local directory when unset). §8 and §9 are keyed per
> meeting; §10 is deliberately global. The offline `/api` glossary is untouched and remains a separate,
> independent store.
>
> Earlier parts of this same update added **four optional fields to routes that already existed**, and
> they are written into §1 and §3 below rather than left undeclared: `pauseSecs` (request) and
> `asrVadSilenceSecs` (response) on §1, `sessionMishearings` (request) and `reason` (on the `502`) on §3.
> All four are optional in both directions: a client that never sends them, and a client that ignores
> them in the response, behaves exactly as it did at v0.6.

> **v0.6 changelog (M14 — the brief is written, not pasted):** one new endpoint, `POST /online-api/summarize-prep-docs` (§7). It is the only route in this contract that is NOT on the live path: it is pressed during Chuẩn bị, reads the event's imported documents, and returns a session brief + suggested terms for the operator to edit. Nothing else changes — no new event, no change to any existing request or response.

> **v0.5 changelog (PROMPT-10 PART 1 — M11/M12: hear it right, cut it right, translate whole thoughts):**
> Two OPTIONAL, ADDITIVE request fields on `POST /online-api/refine-preview-translation` (§3):
> `sourceIsFragment?: boolean` and `previousFragment?: string`. No new endpoint, no new WS event, no
> response change. A server that ignores them and a client that never sends them both keep working
> exactly as they do today; only the `refine` stage ever sends them, drafts never do.

Source of truth for the ONLINE lane (Esuhai Realtime Translation core). Do not invent endpoints, events, or fields beyond this file. Model names are server-internal (configured via server env) — the client never depends on them; externally only friendly endpoint names exist.

> **v0.4 changelog (PROMPT-09 TASK 11 — direct-dial recogniser):** The recogniser becomes a direct-dial realtime transcriber; the browser opens the socket **to the vendor directly** and the server only mints a **single-use token** + assembles one finished opaque address. Changes:
> - `POST /online-api/realtime-preview-token` now accepts `{ targetLanguage, language, corpus, roomFilter? }`. Under the default (direct) path it answers `{ mode:'transcribe', asrProvider:'scribe', asrTransport:'direct', asrModel, asrCommitMode:'vad', asrTokenTtlMs, asrKeytermCount, asrKeytermsDropped, asrSourceCorrectionEnabled:false, asrCorrectionTermCount:0, asrRoomFilter, asrWsUrl }` where **`asrWsUrl` is one complete, opaque `wss://…`** with the token + every parameter already attached (one token call PER DIAL, including every reconnect — never reuse an address). Under `ONLINE_ASR_PROVIDER=qwen3` it answers the old proxied shape + `asrTransport:'proxy'` (rollback, unchanged `WS /online-api/asr`).
> - **Capture** (client): raw PCM16 LE mono 16 kHz, 4096 samples (~256 ms) per packet, `AudioContext({sampleRate:16000})`, `getUserMedia deviceId:{exact}`. No MediaRecorder/Opus/WebM anywhere.
> - **Direct-dial message vocabulary** → mapped by the client adapter onto the EXISTING events: `session_started`→`session.created`; `partial_transcript`→`…transcription.text` (text in `stash`); `committed_transcript`/`…_with_timestamps`/`final_transcript`/`…_with_timestamps`→`…transcription.completed`; `commit_throttled`→`asr.commit_throttled` (diagnostic). Audio frames are JSON `{message_type:'input_audio_chunk', audio_base_64, sample_rate:16000}`; the single Stop **commit** is the same with `audio_base_64:'' , commit:true`. `previous_text` rides the first chunk on a RECONNECT only. Duplicate finals (plain+timestamped) de-duped within 2 s.
> - **Fatal errors** (stop, do not reconnect): `auth_error`, `quota_exceeded`, `unaccepted_terms`. Everything else is retryable.
> - **§3 source-transcript correction is retired (11.12):** the refine model no longer rewrites what was heard; `sourceText` in the refine response is now a verbatim echo, and `asrSourceCorrectionEnabled` is permanently `false` / `asrCorrectionTermCount` permanently `0` on both paths. Session terms now also reach the recogniser as **keyterms** (≤20 chars each, ≤30) instead.
> - **`roomFilter` / `asrRoomFilter` (11.13)** — three-state on the request (`true` sets the vendor's babble filter; `false` sends nothing and beats the env; absent → env fallback `SCRIBE_FILTER_BACKGROUND`); the response reports the value that was actually applied.
> - `config-status` now also returns `required: [<slug>]` (the subset that matters for the current config — 4 direct / 6 under qwen3); `ready` follows `required`.

> v0.3 changelog: documented `POST /online-api/usage-report` (§6) — it was specified in PROMPT-05 TASK 2 and is used by the Phase-4 client, but was missing from v0.2. Note: the token response's `asrWsPath` is currently informational — the client uses the fixed `WS /online-api/asr` path from §2 (reconcile before relying on `asrWsPath`).

## Session lifecycle

1. `POST /online-api/realtime-preview-token` body `{"targetLanguage":"ja"|"vi"}` → response:
   `{ mode:'transcribe', asrProvider:'qwen3', asrModel, asrSourceCorrectionEnabled, asrCorrectionTermCount, asrWsPath }`
   - The only official pipeline is Qwen3 ASR (translation/TTS models are the server's business — the client does not need to know).
   - Sentence finalization is decided server-side (upstream VAD). The client never sends any commit command.
   - If the response contains `ephemeralKey`/`sdpUrl` instead of `mode:'transcribe'` → the server is misconfigured (WebRTC mode); surface the operational error "server is in WebRTC mode, fix server config".
   - `pauseSecs?: number` (request, v0.7) — how long a pause the recogniser should wait through before it closes a sentence, chosen per meeting by the operator. Absent = the server's own default; the server clamps whatever it is given. The client sends it once, when the session opens; there is no way to change it mid-session.
   - `asrVadSilenceSecs?: number` (response, v0.7) — the value the server actually applied, which is not always the one asked for. Display only, so the operator can see what is in force. A client that ignores it is unaffected.
2. `WS /online-api/asr?language=<vi|ja>&corpus=<terms, ≤2000 chars, URL-encoded>`
   - Client sends **binary frames only**: PCM16 little-endian, mono, 16 kHz (raw, no WAV header). No control frames of any kind.
   - Server sends JSON events:
     - `{type:'session.created'}` → upstream ready, start/keep streaming audio
     - `{type:'conversation.item.input_audio_transcription.text', text, stash?, language}` → partial (`text` = stable part of the current sentence, `stash` = provisional tail that may still change)
     - `{type:'conversation.item.input_audio_transcription.completed', transcript, language}` → finalized sentence
     - `{type:'asr.emotion', emotion}` → detected voice emotion
     - `{type:'error', error:{message}}` → upstream error; the server has internal model fallback — keep the connection unless the WS actually closes
3. Each finalized sentence → `POST /online-api/refine-preview-translation` body:
   `{ sourceText, sourceLanguage, targetLanguage, recentFinals?: string[], sessionBrief?, sessionTerms?, sourceEmotion?, sourcePace?, traceId?, subtitleId?, refineStage?: 'draft'|'refine' }`
   → response `{ sourceText, translatedText, ttsText?, emotion?, ttsSpeed?, traceId? }`
   - The returned `sourceText` may already be ASR-corrected using the session terms — always display the returned version, not the raw transcript.
   - `sourceIsFragment?: boolean` — `true` when the transcript was closed by a pause or by a client-side ceiling while the thought was still open, so the model must translate only the clause present and leave it grammatically open. Absent/`false` = a finished sentence, the previous behaviour. Only the `refine` stage sends it; drafts never do.
   - `previousFragment?: string` — the previous subtitle's text when THAT one was itself cut mid-thought and this transcript resumes it. Absent when this transcript starts a thought of its own. Only the `refine` stage sends it; drafts never do.
   - `sessionMishearings?: string` (request, v0.7) — the operator's list of forms the recogniser is known to get wrong at this meeting, one rule per line, `wrong form ~ correct form` (several wrong forms separated by `/`). A plain string on the wire; the server parses and clips it. Absent or empty = the previous behaviour exactly. It is a correction list, not a glossary: it says what the machine mishears, not what a word means.
   - `reason?: string` (on the `502` response, v0.7) — a coarse machine-readable code for WHY refine failed, alongside the unchanged `error` message. Deliberately opaque: it never names a vendor, a model or an environment variable. The client turns it into one Vietnamese sentence for the operator; a client that ignores it sees the same `502 { error }` as before.
4. `POST /online-api/tts` body `{ text, language:'ja'|'vi', emotion?, speed?, traceId?, subtitleId? }` → response is an audio stream.
5. `POST /online-api/save-session` body `{ filename, json, md }` → `{ saved:true, filename }`.
6. `POST /online-api/usage-report` — free-form JSON body (the server just logs it for cost tracking; ~4000-char limit). The client sends it periodically (~every 5 min) and once on stop; it is best-effort (a 404/failure is silently ignored). Current body shape: `{ lane:'online', sessionStartedAt, finals, draftCalls, draftSkipped, refineCalls, refineRetries, ttsSentences, reconnects, droppedGhosts }`.
7. `POST /online-api/summarize-prep-docs` (v0.6) — **pre-session only, never during a live session.** Body `{ sourceLanguage:'vi'|'ja', targetLanguage:'vi'|'ja', header?, documents:[{ name, text }] }` → `{ brief, terms:[string], documents, usedChars }`.
   - `documents` are the files imported in Chuẩn bị → Tài liệu, resolved through the session's knowledge scope (a session in a series sees the series' shelf). The server clips them to at most 12 files / 12 000 chars each / 48 000 chars total, sharing the total budget evenly, and reports what it actually read as `documents` + `usedChars`. Request body limit 4 MB — the only route in this contract whose payload is the documents themselves.
   - `header` is what the operator already knows (conference title · date · venue, agenda, speaker roster). It exists so the model never has to guess a date or a venue the script does not state.
   - `brief` is Vietnamese, ≤1500 chars, line-oriented — the same shape and budget as the `sessionBrief` field of §3, because that is where it ends up. `terms` is ≤40 lines of `source = target` (or a bare source form), source side = `sourceLanguage`; they are SUGGESTIONS that the client merges under its own 40-line budget, always behind the curated glossary and the speaker roster.
   - Slow by design (server budget 60 s, client 90 s) and **not retried**: the operator presses the button again. `502 { error }` on any vendor failure; `400` when no document carries text.
   - The result is the operator's to accept — the client puts it in an editable box, saves it per event+direction, and never sends it anywhere on its own.

8. `GET /online-api/glossary` → `{ entries: [ { vi, ja, reading?, type?, asr_hotword?, misheard?, note? } ] }` — the ONLINE lane's own glossary, from the server store. `PUT /online-api/glossary` body `{ entries }` → `{ saved:true, count }`; the server normalises every entry (known fields only, each string ≤200 chars, an entry with neither `vi` nor `ja` dropped, at most 2 000 entries) so what reaches the live path is always well-formed. Request limit 4 MB.
   - Deliberately SEPARATE from the offline glossary behind `/api`: that backend is not part of this deploy, so on the deployed build it is simply absent. `prepData.ts` reads both and merges them; when both answer, the offline (curated) entry wins a tie, because de-duplication keeps the first entry at a given rank.
   - Pre-session only. Nothing on the live path reads it directly — the terms it produces reach a session through the console's Thuật ngữ box, under the same 40-line / 2 000-char budget as before.
9. `GET /online-api/session-boxes?scope=<kbScopeId>&dir=<vi2ja|ja2vi>` → `{ terms, brief, savedAt }` (`savedAt: 0` = nothing stored). `PUT /online-api/session-boxes` body `{ scope, dir, terms, brief }` → `{ saved:true }`. Missing `scope` → `400`. `terms` is clipped to 2 000 chars and `brief` to 2 000 — the same clip the server already applies to refine's `sessionBrief`.
   - The scope is the meeting's knowledge scope, so a meeting inside a series shares the series' shelf — the same key the documents and the AI brief already use.
   - Written a second or so after the operator stops typing, and read once when a meeting is opened. What was saved OUTRANKS the mechanical auto-fill from Chuẩn bị: the auto-fill may only fill a box that is both unsaved and empty.
   - At most 500 scope×direction pairs are kept, oldest `savedAt` evicted first.
10. `GET /online-api/mishearings` → `{ text, savedAt }` (`savedAt: 0` = nothing stored). `PUT /online-api/mishearings` body `{ text }` → `{ saved:true }`. `text` is clipped to 2 000 chars — the same ceiling the client applies, so a client at its limit is never silently truncated.
    - **Global on purpose — not keyed on a meeting.** What the recogniser mishears is a property of the words, not of the event, so one list serves every meeting and every machine. The console loads it once when it opens; when the store holds something it OUTRANKS the browser's local copy, and the local copy remains as the offline fallback. Nothing on the live path reads this route: the corrections reach a session through the console's box, exactly as they did before.

**Storage.** §8, §9 and §10 are the only routes that persist anything. They share one small server-side JSON store: `DATA_DIR` names the directory (the deploy mounts a disk there); unset, it falls back to a local directory so a dev clone runs with nothing attached. Writes are atomic (temp file, then rename) and capped at 1 MB per file. No other route reads or writes it.

## What the core does NOT provide

- No server-sent VU `level` events — compute levels client-side from the capture RMS.
- No `warming` steps, no per-stage `timing` events, no `on_script`/`name_fix`/`context` events.
- Mic capture happens in the **browser** (getUserMedia), not on the backend.
- ASR term correction runs inside the refine endpoint — it is not a separate API.

## Deployment (FIX-06)

The online backend is served **in-process by this repo's own production server** (`server.js` mounts
`server/online-api.mjs`) at `/online-api/*` — HTTP routes + the `WS /online-api/asr` upgrade, same
origin. There is **no external core and no proxy**: one deploy (Railway now, gala Mac mini later)
serves the SPA and the online backend together. In dev, `vite` proxies `/online-api` to the local
Node server (`ws:true`, no rewrite). The `/online-api/*` routes reuse the app's login gate.
Configuration is env-driven server-side (ASR/refine/TTS vendor keys + models); no secret or model
identifier ever appears in the client bundle. Endpoint paths, events, and payloads are unchanged —
contract stays **v0.3**.

## Runtime key configuration (app-side management, FIX-07)

App-management endpoints layered ON TOP of the pipeline contract (the pipeline endpoints/events above
are unchanged). They let the operator enter the six vendor values through the app's Settings UI;
values are stored server-side (`server/online-config.mjs`, runtime value → env fallback) and are
write-only — never returned, echoed, or logged. The client speaks opaque **slugs**, not env names, so
no vendor env name reaches the bundle. Slugs: `asr_endpoint`, `asr_key`, `refine_key`, `tts_key`,
`tts_voice_ja`, `tts_voice_vi`.

- `GET /online-api/config-status` → `{ keys: { <slug>: boolean, … }, ready: boolean }`. A slug is
  `true` when EITHER a runtime value or an env var provides it; `ready` = all six provided. Never a value.
- `POST /online-api/config-keys` body = partial `{ <slug>: string }`: a non-empty string sets, an
  explicit `""` clears the runtime value (env fallback then applies), an unknown slug → 400. Response =
  the same shape as `config-status`. Never echoes/logs values (logs only the changed slug names).

Both are behind the same auth gate as the rest of `/online-api/*`.
