# ATS User UI × HanDichThuat Backend — Integration Notes

This document records the work done to connect the ATS User UI (React + TypeScript + Vite)
to the **HanDichThuat Studio** backend — the VI ⇄ JA realtime interpreter
([HarryDoan123/HanDichThuat](https://github.com/HarryDoan123/HanDichThuat)).
The endpoint contract lives in [API.md](API.md) and was verified directly against the
backend source (`webui/api.py`, `engine/live.py`, `webui/static/playground.html`).

---

## 1. Architecture overview

```
┌────────────────────────── React app ──────────────────────────┐
│                                                               │
│  LiveSessionProvider (src/lib/LiveSessionContext.tsx)         │
│  ── one shared WS /api/ws/live session + /api/health poll ──  │
│        │                │                     │               │
│  MainLayout        AudioRouting          BilingualStream      │
│  (status pill)     (operator console)   (audience display)    │
│                         │                                     │
│                    useMeter (WS /api/ws/meter)                │
│                    REST via src/lib/api.ts                    │
└───────────────────────────────────────────────────────────────┘
                 │  /api/* (REST + WebSocket)
                 ▼
   Vite dev proxy  →  HanDichThuat backend (default 127.0.0.1:8080)
```

The live session state is held in a React context **above the router and tab
switcher**, so starting the interpreter on the Audio Routing tab and switching
to the Stream tab does not drop the WebSocket or the subtitle history.

## 2. Connection layer

### `src/lib/api.ts` — REST client
Typed wrappers over the backend's JSON endpoints:

| Function | Endpoint | Used for |
|---|---|---|
| `getHealth()` | `GET /api/health` | Online/offline indicators (polled every 5 s) |
| `getBlocks()` | `GET /api/blocks` | STT / MT model dropdown options (from the `stt` and `mt` block specs) |
| `getAudioDevices()` | `GET /api/audio/devices` | Input (mic) picker |
| `getAudioOutputs()` | `GET /api/audio/outputs` | VI / JA output channel pickers |
| `playTestTone(device)` | `POST /api/audio/test_tone` | Per-channel "Test Tone" buttons |
| `getLiveFast()` / `setLiveFast(on)` | `GET/POST /api/live/fast` | Fast-mode panic switch toggle |
| `getWorkflows()` | `GET /api/workflows` | Available for future use |

`API_BASE` comes from the `VITE_API_BASE` env var; when unset, requests hit the
same origin and the Vite dev proxy forwards them. `wsUrl(path)` derives the
matching `ws://` / `wss://` URL for the WebSocket endpoints.

### `src/lib/LiveSessionContext.tsx` — live interpreter session
Wraps `WS /api/ws/live` (protocol: connect → send one `LiveConfig` JSON → receive
event stream → send `{stop:true}` or disconnect to end). It exposes:

- `status`: `idle → connecting → warming → ready → listening` (or `error`)
- `warming`: `{step, steps, detail}` driving the model-load progress bar
- `level` / `speech`: input VU ticks from the session's `level` events
- `lines`: subtitle rows keyed by `lid` — a `line` event appends a row,
  `line_update` (and `transcript` updates) replace the row's text **in place**,
  exactly as the API's rendering tip prescribes
- `error`: non-fatal session errors (the session keeps running)
- `start(config)` / `stop()`
- `backendOnline`: result of the 5-second `GET /api/health` poll

The line buffer keeps the last **400** rows so the Stream page can scroll back
through session history.

**LiveConfig actually sent** (single multilingual model mode — matches how the
backend's own playground builds it, note `targets` is a *map*, not the array
shown in one of the API.md examples):

```json
{
  "device": "mic",
  "device_index": <selected input>,
  "single_auto": {
    "model": "<STT model>", "mt_model": "<MT model>",
    "beam_size": 1, "targets": { "vi": "ja", "ja": "vi", "en": "ja" }
  },
  "post_correct": true,
  "hotwords": true,
  "outputs": { "vi": <output idx>, "ja": <output idx> }
}
```

### `src/lib/useMeter.ts` — standalone VU meter
Wraps `WS /api/ws/meter` (`{device}` in → `{level, rms}` ~20×/s out). It is only
open while **no** live session is running: the session owns the microphone and
provides its own `level` events, so the hook is disabled (passed `null`) during
a session to avoid device contention.

### `src/lib/useStickyScroll.ts` — pinned-to-bottom scrolling
Generic hook for the subtitle columns: auto-scrolls a container to the bottom on
new content, releases the pin when the user scrolls up (>48 px from the bottom),
re-pins when they scroll back down or press the "LATEST" button.

### `vite.config.ts` — dev proxy
`/api` (REST **and** WebSocket, `ws: true`) is proxied to
`http://127.0.0.1:8080`; override with the `ATS_BACKEND` env var. For production
builds set `VITE_API_BASE` instead (the backend has no CORS/auth — keep it
behind a same-origin reverse proxy).

## 3. Pages wired to the backend

### Audio Routing (`src/pages/AudioRouting.tsx`) — operator console
- **Source card**: real input-device list (`/api/audio/devices`, defaults to the
  backend's default device), STT model dropdown (`/api/blocks`), live signal
  meter with a dB readout (meter WS when idle, session `level` events when live).
- **Core Engine card**: backend online/offline state, MT model dropdown,
  warming progress bar (`warming` events), **START / STOP INTERPRETER** button
  (opens/stops the live WS with the selected devices & models), status LEDs.
- **Channel cards (VI / JA)**: output-device pickers (`/api/audio/outputs`) fed
  into the session's `outputs` routing, **Test Tone** per channel with inline
  ok/error feedback.
- **Sidebar**: backend liveness dot, session status label, **Fast Mode** toggle
  (`/api/live/fast`), **EMERGENCY STOP** (stops the session).
- Errors from device enumeration or the session surface in a banner above the flow.

### Stream (`src/pages/BilingualStream.tsx`) — audience display
- While a session is active, the two columns render **real subtitles**: VI lines
  left, JA lines right (`line` / `line_update` / `transcript` events, empty rows
  filtered out).
- **Scrollable history**: columns keep the whole session transcript (up to the
  400-row buffer). They stay pinned to the newest line; scrolling up lets the
  viewer re-read earlier context without losing their place — a floating
  **↓ LATEST** button re-pins to the bottom. Newest line renders large/highlighted,
  the previous line dimmed, older history readable at reduced opacity.
- Footer status reflects the real session: `DEMO MODE` / `CONNECTING` /
  `WARMING UP x/y (detail)` / `READY — WAITING FOR SPEECH` / `TRANSLATING LIVE`,
  plus any non-fatal session error.
- With no session, the page falls back to the scripted **demo loop** (also
  scrollable within the current loop) so the display is never blank.

### Main layout (`src/components/MainLayout.tsx`)
- The SYSTEM STATUS button is now a live pill: **OFFLINE** (red) / **ONLINE**
  (gold) / **LIVE** (pulsing) from the health poll + session state.

## 4. How to run

1. Start the HanDichThuat backend (defaults to `http://127.0.0.1:8080`).
2. `npm run dev` — the UI proxies `/api` to the backend. Without a backend the
   UI still works: indicators show OFFLINE and the Stream page runs demo mode.
3. On Audio Routing: pick mic + models + output devices → **START INTERPRETER**
   → watch warm-up complete → speak; switch to Stream for the audience view.

## 5. Known gaps / next steps

- **TTS voice selection** (`/api/tts/voices`, `/api/tts/preview`) is not wired;
  the session currently runs subtitles-only (no `tts` block in the config).
- **Glossary editing** (`/api/file` on `data/glossary.json`) and **voice
  training** (`/api/voice/*`) have no UI yet; the backend injects the stored
  glossary into every session automatically.
- **Workflows / graph runs** (`/api/run`, `/api/ws/run`) are unused — the UI
  drives the live interpreter directly.
- End-to-end testing against a running backend is still pending (this
  environment has no Python/model setup); all request/response shapes were
  verified against the backend source instead.
