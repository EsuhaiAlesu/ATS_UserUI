# Online Lane Contract — v0.5 (2026-07-31)

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
4. `POST /online-api/tts` body `{ text, language:'ja'|'vi', emotion?, speed?, traceId?, subtitleId? }` → response is an audio stream.
5. `POST /online-api/save-session` body `{ filename, json, md }` → `{ saved:true, filename }`.
6. `POST /online-api/usage-report` — free-form JSON body (the server just logs it for cost tracking; ~4000-char limit). The client sends it periodically (~every 5 min) and once on stop; it is best-effort (a 404/failure is silently ignored). Current body shape: `{ lane:'online', sessionStartedAt, finals, draftCalls, draftSkipped, refineCalls, refineRetries, ttsSentences, reconnects, droppedGhosts }`.

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
