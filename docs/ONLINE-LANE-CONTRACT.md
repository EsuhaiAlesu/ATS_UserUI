# Online Lane Contract — v0.2 (2026-07-22)

Source of truth for the ONLINE lane (Esuhai Realtime Translation core). Do not invent endpoints, events, or fields beyond this file. Model names are server-internal (configured via server env) — the client never depends on them; externally only friendly endpoint names exist.

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
4. `POST /online-api/tts` body `{ text, language:'ja'|'vi', emotion?, speed?, traceId?, subtitleId? }` → response is an audio stream.
5. `POST /online-api/save-session` body `{ filename, json, md }` → `{ saved:true, filename }`.

## What the core does NOT provide

- No server-sent VU `level` events — compute levels client-side from the capture RMS.
- No `warming` steps, no per-stage `timing` events, no `on_script`/`name_fix`/`context` events.
- Mic capture happens in the **browser** (getUserMedia), not on the backend.
- ASR term correction runs inside the refine endpoint — it is not a separate API.
