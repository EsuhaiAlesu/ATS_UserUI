# HanDichThuat Studio — API Reference

The backend for connecting a UI (or any client) to the VI ⇄ JA realtime interpreter.

- **Server:** NiceGUI + FastAPI, single process. Default bind `http://127.0.0.1:8080` (see [webui/app.py:1411](../webui/app.py#L1411)).
- **REST prefix:** all JSON endpoints live under `/api` (mounted in [webui/api.py](../webui/api.py)).
- **Auth:** none. This is a **local-first, self-hosted** tool bound to loopback — do not expose it to a network without adding your own auth/proxy.
- **Body convention:** most `POST` handlers accept a **raw JSON object** as the body (FastAPI `data: dict`). Send `Content-Type: application/json` with a JSON object; the field names below are the object's keys. A few endpoints take **query params** instead — those are called out explicitly.
- **Errors:** handlers return either an HTTP error (`400`/`404`/`500` via `HTTPException`) or a `200` with an `{"error": "..."}` / `{"ok": false, ...}` body. Both shapes appear below; check for `error`/`ok` in the JSON as well as the status code.

There are three surfaces:
1. **REST** — files, workflows, glossary, models, audio devices, TTS, LLM sidecar, one-shot graph run.
2. **WebSocket** — live interpreter, streamed graph run, VU meter.
3. **HTML pages** — pre-built popout windows (`/pg`, `/display`, `/console`) you can embed in an iframe.

---

## Table of contents

- [1. Health & status](#1-health--status)
- [2. Blocks (node catalog)](#2-blocks-node-catalog)
- [3. Workflows](#3-workflows)
- [4. Graph run — one-shot (REST) & streamed (WS)](#4-graph-run)
- [5. Live interpreter (WebSocket)](#5-live-interpreter-websocket)
- [6. Audio devices, VU meter & test tone](#6-audio-devices-vu-meter--test-tone)
- [7. Glossary & voice training](#7-glossary--voice-training)
- [8. Models & LLM sidecar](#8-models--llm-sidecar)
- [9. TTS voices & preview](#9-tts-voices--preview)
- [10. Project files (in-app editor)](#10-project-files-in-app-editor)
- [11. Live fast-mode panic switch](#11-live-fast-mode-panic-switch)
- [12. HTML popout pages](#12-html-popout-pages)
- [13. Core data shapes](#13-core-data-shapes)

---

## 1. Health & status

### `GET /api/health`
Liveness probe.
```json
{ "ok": true, "blocks": 27 }
```
`blocks` = number of registered node types.

---

## 2. Blocks (node catalog)

### `GET /api/blocks`
The full node catalog that drives the palette and the per-block settings panel. Model dropdowns are refreshed from disk on **every** call, so newly added model folders appear without a restart.

```json
{ "blocks": [ BlockSpec, BlockSpec, ... ] }
```
See [BlockSpec](#blockspec) in §13 for the object shape. The schema is the single source of truth: render the palette and every settings control **from this data** — adding a tunable server-side needs no UI change.

---

## 3. Workflows

A workflow is a saved graph (`meta` + `nodes` + `wires`) stored as one JSON file under `workflows/`. See [Workflow](#workflow) in §13.

### `GET /api/workflows`
List saved workflows (metadata only — not the full graph).
```json
{ "workflows": [ { "id": "vietnamese-f-1", "name": "Vietnamese F-1", "author": "Han", "version": 3 }, ... ] }
```
Each item is the workflow's `meta` with `id` (the file stem) injected. A malformed file appears as `{ "id", "name", "error" }`.

### `GET /api/workflows/{wid}`
Full workflow graph by id. `404` if not found.
```json
{ "meta": {...}, "nodes": [...], "wires": [...] }
```

### `POST /api/workflows`
Create or update a workflow. Body is the full workflow object. The id is derived by slugifying `meta.id` (or `meta.name`); `meta.version` auto-increments. Saving also records this as the **last workflow** for auto-load on startup.
```json
// request body
{ "meta": { "name": "Vietnamese F-1", "author": "Han" }, "nodes": [...], "wires": [...] }
// response
{ "id": "vietnamese-f-1", "meta": { "id": "vietnamese-f-1", "name": "Vietnamese F-1", "version": 4, ... } }
```

### `DELETE /api/workflows/{wid}`
Delete a workflow. `404` if not found.
```json
{ "deleted": "vietnamese-f-1" }
```

### `GET /api/last-workflow`
The workflow the studio should auto-load on startup (server-side pointer, survives a fresh browser). Empty string if none / the file is gone.
```json
{ "id": "vietnamese-f-1" }
```

---

## 4. Graph run

Runs a wired graph through the block runner with per-node timing. Use REST for a blocking one-shot; use the WebSocket to light up nodes as data flows.

### `POST /api/run`
Body is a [graph](#graph) object. The server injects the current glossary automatically if absent. On a graph-structure error (e.g. a cycle) returns `400 { "error": ... }`.

**Response** ([RunResult](#runresult)):
```json
{
  "nodes":  { "n1": { "status": "ok", "latency_ms": 12.3, "error": null, "output": {...} }, ... },
  "results": [ { ...sink rows... } ],
  "timings_ms": { "n1": 12.3, "n2": 40.1 },
  "total_ms": 210.4,
  "order": ["n1", "n2", ...],
  "labels": { "n1": "STT", "n2": "Translate" }
}
```
A single block failing does **not** abort the run — its node entry gets `status: "error"` and the rest continue.

### `WS /api/ws/run`
Stream a graph run node-by-node.

1. Client connects, then **sends one JSON message**: the [graph](#graph) object.
2. Server streams events until the run finishes, then closes.

**Events** (each a JSON message with a `type`):

| `type`       | Fields                                             | Meaning |
|--------------|----------------------------------------------------|---------|
| `node_start` | `id`                                               | A node began executing — light it up. |
| `node`       | `id`, `status`, `latency_ms`, `error`, `output`    | A node finished (`status`: `ok` \| `error` \| `skipped`). |
| `done`       | `results`, `timings_ms`, `total_ms`                | Run complete. |
| `error`      | `error`                                            | Graph-level failure (e.g. cycle). |

---

## 5. Live interpreter (WebSocket)

### `WS /api/ws/live`
The realtime pipeline: audio → VAD → ASR → translate → streamed subtitle/TTS lines.

**Protocol**
1. Client connects, then **sends one JSON config** (see [LiveConfig](#liveconfig) in §13).
2. Server streams events (below).
3. To stop: send `{ "stop": true }` **or** just disconnect.

The glossary is injected automatically if the config omits it.

**Events** — every message has a `type`. Grouped by phase:

**Warmup / lifecycle**
| `type`        | Fields                        | Meaning |
|---------------|-------------------------------|---------|
| `warming`     | `detail?`, `step?`, `steps?`  | Loading a model; `step`/`steps` drive a progress bar. |
| `ready`       | —                             | All models warm; interpreting can start. |
| `listening`   | `mode` (`mic`\|`file`)        | Capturing audio. |
| `session`     | `dir`                         | Recording session directory (when `record` is on). |
| `error`       | `error`                       | Non-fatal error string; the session keeps running. |

**Audio / VAD**
| `type`         | Fields              | Meaning |
|----------------|---------------------|---------|
| `level`        | `v` (0–1), `speech` | Input level tick for a VU meter. |
| `speech_start` | —                   | Voice activity detected — a phrase is starting. |

**Recognition & translation**
| `type`         | Fields                                          | Meaning |
|----------------|-------------------------------------------------|---------|
| `speech_lang`  | `lang`, `prob`                                  | Detected source language for the segment. |
| `transcript`   | `lid`, `text`, `lang`                           | Source-side transcript (partial or final). |
| `line`         | `lid`, `lang`, `text`, ...                      | A new **target** subtitle line appeared. |
| `line_update`  | `lid`, `lang`, `text`, `corrected?`             | An existing line was revised (re-translated / corrected). |
| `committed`    | `text`                                          | Source clause committed (won't change). |
| `on_script`    | `lid`, `score`                                  | Line matched the loaded event script (badge it). |
| `context`      | `summary`                                       | Rolling context summary updated. |
| `name_fix`     | `fixes`                                         | Name-restore / script recovery applied fixes. |
| `skipped`      | `lang`, `text`                                  | Segment dropped (noise / empty / filtered). |
| `timing`       | `stt_ms?`, `proc_ms?`, `mt_ms?`, ...            | Per-stage latency snapshot for the Monitor. |

**TTS / audio-out** (operator/console cues)
| `type`     | Fields                          | Meaning |
|------------|---------------------------------|---------|
| `say`      | `seq`, `lang`, `text`, `lag_ms` | About to speak this line. |
| `speaking` | `lang`                          | TTS playback started (node glow). |
| `spoken`   | `lang`                          | TTS finished for a line. |
| `said`     | `seq`, `lang`                   | Line fully delivered. |

> **Rendering tip:** `line` creates a subtitle row keyed by `lid`; subsequent `line_update` messages with the same `lid` replace its text in place. `corrected: true` marks the final, post-corrected text.

---

## 6. Audio devices, VU meter & test tone

### `GET /api/audio/devices`
Input devices for the mic/mixer picker, plus loopback "speakers" for capturing system audio.
```json
{
  "devices": [ { "index": 1, "name": "MacBook Mic", "channels": 1, "sr": 48000 }, ... ],
  "default": 1,
  "speakers": [ { "name": "BlackHole 2ch" }, ... ],
  "default_speaker": "MacBook Speakers"
}
```
On Windows `speakers` come from WASAPI loopback; on macOS/Linux they are virtual-loopback **input** devices (BlackHole / Loopback / `.monitor`). On failure: `{ "devices": [], "error": "..." }`.

### `GET /api/audio/outputs`
Output devices for channel routing (A=VI / B=JA).
```json
{ "devices": [ { "index": 3, "name": "External Headphones" }, ... ], "default": 3 }
```

### `POST /api/audio/test_tone`
Play a short 660 Hz beep on an output device to confirm wiring.
```json
// request
{ "device": 3 }
// response
{ "ok": true }        // or { "ok": false, "error": "..." }
```
`device` may be an output index (or omitted for the system default).

### `WS /api/ws/meter`
Stream live input level for a VU meter.
1. Send config once: `{ "device": <index | "loopback" | "loopback::<name>"> }`.
2. Receive `{ "level": 0.0–1.0, "rms": 0.0123 }` ~20×/s. `{ "error": "..." }` on failure.
3. Stop with `{ "stop": true }` or by disconnecting.

`"loopback"` meters the default speaker (Windows WASAPI); `"loopback::<name>"` a specific output. Any other value is treated as an input device index.

---

## 7. Glossary & voice training

The glossary drives MT rendering, ASR hotwords, and post-correction. Terms are edited via the [files API](#10-project-files-in-app-editor) (`data/glossary.json`) or the NiceGUI Glossary tab; the endpoints below cover the **voice-training** loop. See [GlossaryEntry](#glossaryentry) in §13.

### `GET /api/voice/script`
The reading script staff read aloud to teach pronunciations. Seeds from glossary terms if no script exists yet.
```json
{ "script": "# Reading script...\nXin chào, tôi đến từ Esuhai. Các thuật ngữ..." }
```

### `POST /api/voice/script`
Save the reading script.
```json
// request
{ "script": "..." }
// response
{ "ok": true }
```

### `POST /api/voice/record`
Record from the server's mic for N seconds and transcribe (server-side capture — the machine running the backend does the recording).
```json
// request
{ "seconds": 20, "model": "Qwen3-ASR-1.7B" }
// response
{ "heard": "recognized text", "peak": 0.42 }     // or 500 { "error": "..." }
```
`peak` is the audio peak (< 0.05 ≈ too quiet).

### `POST /api/voice/learn`
Diff the reference script against what was heard, and add `misheard → correct` rules to the glossary (live on next run).
```json
// request
{ "reference": "correct words with terms", "heard": "what STT produced" }
// response
{ "added": [ { "misheard": "応者", "term": "御社" }, ... ], "count": 1 }
```

---

## 8. Models & LLM sidecar

### `POST /api/warm`  *(query param)*
Load a model **now** so a UI switch gets immediate confirmation instead of a lazy load on next run.
```
POST /api/warm?model=Qwen3-ASR-1.7B
```
```json
{ "ok": true, "model": "Qwen3-ASR-1.7B", "ms": 1840 }   // or { "ok": false, "model", "error" }
```

### `POST /api/models/switch`
**Critical memory rule:** when the operator switches a block's model, immediately free the previously loaded same-role model so only one is ever resident. The backend also enforces this at load time; this frees memory the moment you switch.
```json
// request
{ "model": "NLLB-600M" }
// response
{ "ok": true, "freed": ["NLLB-1.3B"], "loaded": ["NLLB-600M"] }
```

The **LLM sidecar** (used by Main Context + Predictive) runs the GGUF model in a **separate process** with its own CUDA context so it can't crash speech recognition.

### `GET /api/llm/status`
```json
{ "running": true, "ready": true, "model": "Qwen2.5-1.5B-Instruct-GGUF", "base": "http://127.0.0.1:...", "error": null }
```

### `POST /api/llm/start`  *(query param)*
Start / warm the sidecar. Defaults to `Qwen2.5-1.5B-Instruct-GGUF`.
```
POST /api/llm/start?model=Qwen2.5-1.5B-Instruct-GGUF
```
```json
{ "ok": true, "running": true, "ready": true, "model": "...", "base": "..." }
```

### `POST /api/llm/stop`
Stop the sidecar. Returns the post-stop status object.

> **Model discovery:** there is no dedicated `/api/models` list endpoint — the available models per block come embedded in [`GET /api/blocks`](#2-blocks-node-catalog) (dropdown `options`), refreshed from `models/deploy/` on each call.

---

## 9. TTS voices & preview

### `GET /api/tts/voices`  *(query param)*
List selectable voices for an engine so a Voice dropdown can refresh.
```
GET /api/tts/voices?engine=voicevox
```
`engine` is normalized (`voicevox`, `gpt-sovits`, `vieneu`, `openai`, …). Response varies by engine but always has `engine`, `voices` (`[{id,label,...}]`), and `key` (the graph param the chosen id feeds):
```json
// voicevox (needs the VOICEVOX server on :50021)
{ "engine": "voicevox", "voices": [ { "id": 1, "label": "…", "jp": "四国めたん · ノーマル" } ], "key": "speaker_id" }
// gpt-sovits (reference clips in data/voices/)
{ "engine": "gpt-sovits", "voices": [ { "id": "han.wav", "label": "han.wav" } ], "key": "speaker_ref", "hint": "..." }
// vieneu (on-box Vietnamese voices)
{ "engine": "vieneu", "voices": [ { "id": "...", "label": "..." } ], "key": "voice", "hint": "..." }
```
On error a `voices: []` with an `error`/`msg` field is returned (still HTTP 200).

### `GET /api/tts/studio`  *(query param)*
Is this engine's voice-training studio reachable, and can we launch it?
```
GET /api/tts/studio?engine=gpt-sovits
```
```json
{ "engine": "gpt-sovits", "supported": true, "up": false, "url": "http://127.0.0.1:9874", "can_launch": true }
```

### `POST /api/tts/studio/launch`
Open (start if needed) the engine's studio WebUI.
```json
// request
{ "engine": "gpt-sovits" }
// response
{ "ok": true, "url": "http://127.0.0.1:9874", "already": false, "launching": true, "msg": "..." }
```

### `POST /api/tts/preview`
Synthesize a short sample and return **WAV bytes** (`Content-Type: audio/wav`), so the UI can preview voices in-app. Wired for `vieneu` (on-box) and `voicevox` (server on :50021); other engines return `400 { "error": ... }`.
```json
// request
{ "engine": "vieneu", "voice": "<id>", "text": "Xin chào..." }
// response: raw audio/wav body   (or 400/500 { "error": "..." })
```

---

## 10. Project files (in-app editor)

Read/write project **text** files (`.json .jsonl .md .txt .srt .csv` only), sandboxed to the project root. This is how a UI edits `data/glossary.json`, `data/phrase_bank.md`, workflow JSON, etc. Non-text suffixes and paths outside the project are rejected with `400`.

### `GET /api/files`
List editable files.
```json
{ "files": [ { "path": "data/glossary.json", "size": 8123, "dir": "data" }, ... ] }
```
Skips `.venv .git __pycache__ node_modules models`.

### `GET /api/file`  *(query param)*
```
GET /api/file?path=data/glossary.json
```
```json
{ "path": "data/glossary.json", "content": "..." }     // 404 if missing, 400 if not editable
```

### `POST /api/file`
Write (creates parent dirs).
```json
// request
{ "path": "data/glossary.json", "content": "..." }
// response
{ "ok": true, "path": "data/glossary.json", "bytes": 8123 }
```

---

## 11. Live fast-mode panic switch

A mid-session override that forces **every** translation onto the small fast fallback model — one click when the main model is too slow. Takes effect on the next line.

### `GET /api/live/fast`
```json
{ "fast": false }
```

### `POST /api/live/fast`
```json
// request
{ "on": true }
// response
{ "ok": true, "fast": true }
```

---

## 12. HTML popout pages

Pre-built full pages (served with no-cache) you can open or embed in an `<iframe>`:

| Path       | Purpose |
|------------|---------|
| `/pg`      | The LiteGraph node canvas (the Playground). Allow `microphone; fullscreen`. |
| `/display` | Audience-facing fullscreen subtitle window. |
| `/console` | Operator console: switch VI⇄JA, reset, stop, monitor. |

These coordinate with the NiceGUI shell via `localStorage` keys (e.g. `hdt_live_wf`, `hdt_switch_cmd`) — see [webui/app.py](../webui/app.py) — not via extra HTTP endpoints.

---

## 13. Core data shapes

### Graph
Input to `POST /api/run` and `WS /api/ws/run`. Same node/wire shape as a saved [Workflow](#workflow), minus `meta`.
```json
{
  "nodes": [
    { "id": "n1", "type": "stt", "params": { "model": "Qwen3-ASR-1.7B", "language": "auto" }, "enabled": true },
    { "id": "n2", "type": "mt",  "params": { "model": "NLLB-600M", "target_lang": "vi" } }
  ],
  "wires": [
    { "from": "n1", "to": "n2", "from_port": "text", "to_port": "text" }
  ],
  "glossary": { "御社": "quý công ty" }   // optional; injected server-side if omitted
}
```
- `enabled: false` makes a node a **passthrough** (first input → first output).
- `from_port`/`to_port` are optional; they default to each block's first output/input port.
- The graph must be **acyclic** (a cycle → `400`).

### RunResult
Output of `POST /api/run` (and the `done` WS event carries `results`/`timings_ms`/`total_ms`).
```json
{
  "nodes":   { "<id>": { "status": "ok|error|skipped", "latency_ms": 0.0, "error": null, "output": {} } },
  "results": [ /* rows emitted by sink blocks */ ],
  "timings_ms": { "<id>": 0.0 },
  "total_ms": 0.0,
  "order":  [ "<id>", ... ],
  "labels": { "<id>": "Human label" }
}
```

### Workflow
Stored under `workflows/<id>.json`.
```json
{
  "meta": { "name": "Vietnamese F-1", "author": "Han", "created": "...", "version": 3, "description": "..." },
  "nodes": [ ... ],
  "wires": [ ... ]
}
```
`id` is not stored in the file — it is the file stem, injected into `meta.id` on read.

### BlockSpec
One entry in `GET /api/blocks`. Render the palette and settings panel from this.
```json
{
  "type": "stt",
  "category": "Speech",
  "label": "STT",
  "description": "Transcribe an audio segment.",
  "inputs":  [ { "name": "audio", "type": "audio" } ],
  "outputs": [ { "name": "text",  "type": "text" } ],
  "params": [
    {
      "name": "model", "type": "select", "default": "Qwen3-ASR-1.7B", "label": "Model",
      "advanced": false, "options": ["Qwen3-ASR-1.7B", "..."],
      "min": null, "max": null, "step": null, "tooltip": "..."
    }
  ],
  "doc": { "purpose": "...", "gotchas": ["..."], "inputs": {...}, "outputs": {...}, "params": {...} },
  "hidden": false
}
```
- **Param `type`:** `select | number | slider | toggle | text | textarea | file`.
- **Port `type`** (wire color / type-check): `audio | text | translation | control | any`.
- `hidden: true` → tuck under the palette's "Advanced / legacy" group.
- `options`/`min`/`max`/`step`/`tooltip` are present only when set.

### GlossaryEntry
Rows in `data/glossary.json` (edit via the [files API](#10-project-files-in-app-editor)).
```json
{
  "vi": "quý công ty",
  "ja": "御社",
  "reading": "おんしゃ",          // katakana/reading to control pronunciation (optional)
  "type": "keigo",               // name|company|keigo|tech|award|term|keep|other
  "asr_hotword": true,           // bias the recognizer toward this term
  "misheard": ["応者", "王者"],   // auto-corrected to the canonical form
  "note": ""
}
```
Leave `ja` blank to keep a name verbatim (no translation).

### LiveConfig
The one JSON message sent to open `WS /api/ws/live`. Only the keys you need — everything has a default. Two routing modes:

**A) Single multilingual model** (one ASR auto-detects, fans out to targets):
```json
{
  "device": "mic",                     // "mic" | "file" | "loopback"
  "device_index": 1,                   // mic index (from /api/audio/devices)
  "single_auto": { "model": "Qwen3-ASR-1.7B", "mt_model": "NLLB-600M" },
  "targets": [ { "model": "NLLB-600M", "target_lang": "vi" } ],
  "tts": { "engine": "vieneu", "voice": "<id>" },   // omit to disable TTS
  "outputs": { "vi": 3, "ja": 4 },      // output device index per language
  "record": true,
  "post_correct": true,                 // apply glossary misheard→correct fixes
  "glossary": { "御社": "quý công ty" } // optional; injected if omitted
}
```

**B) Explicit directions** (per-language-pair ASR + MT, e.g. a cascade):
```json
{
  "device": "loopback",
  "loopback_device": "BlackHole 2ch",
  "route": "cascade",
  "directions": [
    { "asr_model": "Qwen3-ASR-1.7B", "asr_fallback": "whisper-large-v2", "mt_model": "NLLB-600M", "source_lang": "ja", "target_lang": "vi" },
    { "asr_model": "Qwen3-ASR-1.7B", "mt_model": "NLLB-600M", "source_lang": "vi", "target_lang": "ja" }
  ],
  "detector": "large-v2",              // language detector for 2+ non-cascade lanes
  "tts": { "engine": "voicevox", "speaker_id": 1 }
}
```

**File playback** (`device: "file"`): set `"file": "<path>"` and `"realtime": true` to pace like a live stream.

Other tunables (all optional, sensible defaults): `vad_aggressiveness` (0–3), `endpoint_ms`, `max_clause_ms`, `min_clause_ms`, `context_lines`, `input_boost` (`auto`), `input_max_gain`, `lang_threshold`, `warmup`, plus feature blocks `main_context`, `predict`, `script_anchor`, `script_lock`, `smart` — each an object mirroring its block's params.

---

## Quick start (JavaScript)

```js
const BASE = "http://127.0.0.1:8080";

// 1. Load the palette
const { blocks } = await (await fetch(`${BASE}/api/blocks`)).json();

// 2. List & load a workflow
const { workflows } = await (await fetch(`${BASE}/api/workflows`)).json();
const wf = await (await fetch(`${BASE}/api/workflows/${workflows[0].id}`)).json();

// 3. One-shot run
const result = await (await fetch(`${BASE}/api/run`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nodes: wf.nodes, wires: wf.wires }),
})).json();

// 4. Live interpreter over WebSocket
const ws = new WebSocket(`ws://127.0.0.1:8080/api/ws/live`);
ws.onopen = () => ws.send(JSON.stringify({
  device: "mic",
  single_auto: { model: "Qwen3-ASR-1.7B", mt_model: "NLLB-600M" },
  targets: [{ model: "NLLB-600M", target_lang: "vi" }],
}));
ws.onmessage = (e) => {
  const evt = JSON.parse(e.data);
  switch (evt.type) {
    case "warming":  showProgress(evt.step, evt.steps, evt.detail); break;
    case "ready":    markLive(); break;
    case "line":     addSubtitle(evt.lid, evt.lang, evt.text); break;
    case "line_update": updateSubtitle(evt.lid, evt.text); break;
    case "error":    console.warn(evt.error); break;
  }
};
// stop: ws.send(JSON.stringify({ stop: true }))  — or ws.close()
```
