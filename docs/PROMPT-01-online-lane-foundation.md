# PROMPT 01 — Phase 0: Online-lane foundation in ATS_UserUI

---

<role>
You are a senior frontend engineer working in the **ATS_UserUI** repository (React 19 + Vite + Tailwind v3, react-router 7). You are precise, you follow the provided contract exactly, and you never invent endpoints, events, or fields that are not in the contract.
</role>

<context>
This app will run **two interpretation lanes in parallel (switchable)** on a single Mac mini at a live event. A technician manually switches between them; only one lane is active at a time.

- **OFFLINE lane** (already exists): self-hosted HanDichThuat backend. The UI talks to it via `WS /api/ws/live` + REST `/api/*`. The current code in `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts` belongs to this lane.
- **ONLINE lane** (today's task): the Esuhai Realtime Translation core — a separate Node server on the same machine that calls cloud APIs. Its contract is in PART B below.

Why this matters: the two lanes are owned by different teams and must never break each other. Everything you build today is the *foundation* — permanent guard rules, the contract file, the proxy, and a minimal vertical slice proving audio-in → subtitle-out works end to end. Later phases build the full pipeline on top of this foundation, so file placement and the contract file must be exactly as specified.
</context>

<task>
Four deliverables, in this order:
A. Inject permanent lane-safety rules into `CLAUDE.md`.
B. Create the online-lane contract file `docs/ONLINE-LANE-CONTRACT.md`.
C. Implement the foundation: vite proxy, shared lane interface, online lane client, and a `/online-lab` dev page.
D. Self-verify against the acceptance checklist and reply using the mandatory report format.
</task>

## PART A — Permanent rules (do this FIRST)

Create or update `CLAUDE.md` at the repo root. Append the following block verbatim (if `CLAUDE.md` already has content, append — do not delete anything):

```markdown
## Two-lane rules (online / offline) — MANDATORY

This app has 2 independent, switchable interpretation lanes, manually switched by a technician:
- OFFLINE = HanDichThuat backend (`/api/*`, `WS /api/ws/live`). Code: `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, and the existing pages.
- ONLINE = Esuhai Realtime Translation core. Code lives ONLY in `src/lib/lanes/online/` + the lab route `/online-lab`. Contract: `docs/ONLINE-LANE-CONTRACT.md` — this is the source of truth; NEVER invent endpoints/events outside that file.

Rules:
1. When the user asks to change/add a feature WITHOUT specifying the lane → you MUST ask "Is this for the online lane or the offline lane?" before writing any code.
2. Online-lane work must not modify offline-lane files. Offline-lane work must not modify `src/lib/lanes/online/`.
3. The shared interface file `src/lib/lanes/types.ts` is the treaty between the two lanes — only change it with explicit user confirmation, and always state the impact on both lanes.
4. The online lane ALWAYS calls its backend through the `/online-api` base path (proxy). Relative `/api/*` paths belong to HanDichThuat — never call the online core via `/api`.
5. Every response touching the online lane must state: files changed, why, and whether any offline-lane file was touched (the default answer must be NO).
```

## PART B — Online-lane contract (save into the repo)

Create `docs/ONLINE-LANE-CONTRACT.md` with exactly the following content (contract v0.2, 2026-07-22):

```markdown
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
```

## PART C — Implementation

### C1. Vite proxy

In `vite.config.ts`, add next to the existing `/api` proxy (do not touch the `/api` entry). Why `/online-api`: both backends natively use `/api`, so the online lane gets its own prefix that rewrites to `/api` on the online core only:

```ts
'/online-api': {
  target: process.env.ONLINE_BACKEND ?? 'http://127.0.0.1:8788',
  changeOrigin: true,
  ws: true,
  rewrite: (p) => p.replace(/^\/online-api/, '/api'),
},
```

### C2. Shared lane interface — `src/lib/lanes/types.ts`

Use exactly this vocabulary (it mirrors what the UI already thinks in, so LiveSessionContext can later run on top of either lane):

```ts
export type LaneId = 'offline' | 'online';
export type LaneStatus = 'idle' | 'connecting' | 'ready' | 'listening' | 'reconnecting' | 'error' | 'stopped';

export interface LaneLine {
  lid: string;
  sourceText: string;       // source text (ASR-corrected version when available)
  targetText: string;       // translation; '' while not yet translated
  interim: boolean;         // true = still being spoken, may change
  corrected: boolean;       // true = refined (equivalent to line_update corrected)
  at: number;
}

export interface LaneEvents {
  onStatus(status: LaneStatus, detail?: string): void;
  onLine(line: LaneLine): void;        // create OR update by lid (upsert)
  onLevel(v: number): void;            // 0..1, ~10 ticks/second
  onError(message: string): void;
}

export interface LaneController {
  readonly id: LaneId;
  start(opts: { sourceLanguage: 'vi' | 'ja'; targetLanguage: 'vi' | 'ja'; terms?: string; brief?: string }): Promise<void>;
  stop(): Promise<void>;
}
```

### C3. Online lane client — `src/lib/lanes/online/onlineLane.ts` (+ capture module)

Implement `LaneController` for the online lane per the PART B contract. Use this field-proven capture reference as-is (or with minimal adjustments):

```ts
// src/lib/lanes/online/pcm16Capture.ts
const WORKLET_SRC = `
class Pcm16Tap extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (ch && ch.length) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor('pcm16-tap', Pcm16Tap);
`;

export interface CaptureHandle { stop(): void; }

export async function startPcm16Capture(
  deviceId: string | undefined,
  onChunk: (pcm: ArrayBuffer) => void,
  onLevel: (v: number) => void,
): Promise<CaptureHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: deviceId ? { deviceId: { exact: deviceId } } : true,
  });
  // AudioContext at 16kHz: Chrome/Edge resample internally — the WS receives true PCM16@16k.
  const ctx = new AudioContext({ sampleRate: 16000 });
  const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'text/javascript' }));
  await ctx.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
  const src = ctx.createMediaStreamSource(stream);
  const tap = new AudioWorkletNode(ctx, 'pcm16-tap');
  let lastLevelAt = 0;
  tap.port.onmessage = (e: MessageEvent<Float32Array>) => {
    const f32 = e.data;
    const i16 = new Int16Array(f32.length);
    let sum = 0;
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      sum += s * s;
    }
    onChunk(i16.buffer);
    const now = performance.now();
    if (now - lastLevelAt > 100) { lastLevelAt = now; onLevel(Math.min(1, Math.sqrt(sum / f32.length) * 4)); }
  };
  src.connect(tap);
  return {
    stop() {
      tap.port.onmessage = null;
      src.disconnect(); tap.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}
```

Requirements for `onlineLane.ts`:
1. `start()`: fetch token → open `WS /online-api/asr?language=…&corpus=<encodeURIComponent(terms)>` → on `session.created`, call `startPcm16Capture` and move status `ready` → `listening`. Only send audio while the WS is OPEN.
2. Partial event (`…transcription.text`): upsert an interim line (`interim:true`) with `sourceText = text + stash`.
3. Final event (`…transcription.completed`): mark that line `interim:false`, then call refine with `sourceText=transcript`, `recentFinals` = up to the 6 most recent finalized sentences, `sessionTerms`/`sessionBrief` from `opts`. On response, upsert the same `lid` with the returned `sourceText`/`translatedText`, `corrected:true`. If refine fails → keep the line with `targetText:''` + call `onError` (the session must survive).
4. `lid`: self-generated (`online-<counter>`); a new sentence begins at the first partial after a finalized sentence.
5. Unexpected WS close while running → status `reconnecting`, retry with backoff 1/2/4…s, max 5 attempts (mirroring the LiveSessionContext pattern), then `error`.
6. `stop()`: stop capture, close WS, status `stopped`. Idempotent — never throws on repeated calls.

### C4. Lab page — `src/pages/OnlineLab.tsx`, route `/online-lab`

A purely functional dev page (no styling effort needed — the real UX will be designed by someone else later): mic picker (`enumerateDevices`), direction toggle VI→JA / JA→VI, textareas for terms + brief, Start/Stop button, status badge, VU bar from `onLevel`, and the line list (source + translation; interim lines dim/italic; corrected lines marked). Add the route in `App.tsx` — do NOT add a link to any existing navbar/menu.

<constraints>
Files you must NOT modify in this prompt: `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, and existing pages (except adding the route in `App.tsx`).
If anything in this prompt is ambiguous or conflicts with the repo's reality, ask in the "Questions" section of your report instead of inventing a solution.
</constraints>

## PART D — Acceptance & report

<acceptance_criteria>
Verify each item yourself before replying, by actually running the commands — do not assume:
- [ ] `npm run build` passes (no TypeScript errors).
- [ ] `CLAUDE.md` contains the two-lane rules block; `docs/ONLINE-LANE-CONTRACT.md` exists with the exact contract content.
- [ ] No diff on any forbidden file listed in the constraints (other than the `App.tsx` route).
- [ ] `/online-lab` renders even when the online backend is not running (clicking Start shows a friendly connection error, no white screen).
- [ ] Every fetch/WS of the online lane goes through `/online-api`.
</acceptance_criteria>

<report_format>
Reply in exactly this structure (the reviewer cannot open this repo — the report is the only window into your work):
1. **Summary** — ≤5 lines in English + 1 closing line in Vietnamese (tóm tắt 1 dòng).
2. **Files** — every file created/modified, one line each with purpose.
3. **Full content** of: `src/lib/lanes/types.ts`, `src/lib/lanes/online/onlineLane.ts`, and the diffs of `vite.config.ts` + `App.tsx`.
4. **Build output** — paste the actual tail of `npm run build` verbatim. Do not paraphrase; if you did not run it, say so explicitly.
5. **Questions / uncertainties** — anything unresolved; never decide beyond the contract on your own.
</report_format>
