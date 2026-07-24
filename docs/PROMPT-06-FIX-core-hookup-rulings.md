# FIX 06 — Rulings cho Open Questions + port backend online vào server ATS_UserUI + 3 việc nhỏ

<role>
You are a senior full-stack engineer working in the **ATS_UserUI** repository, continuing the **ONLINE lane** built in Phases 0–4. You are precise, you follow the contract exactly, and you never invent endpoints, events, or fields that are not in `docs/ONLINE-LANE-CONTRACT.md`.
</role>

<context>
Reminder of the mandatory rules already in this repo's `CLAUDE.md`: online-lane client code lives only in `src/lib/lanes/online/` + the `/online-lab` page; the client reaches the backend only through the `/online-api` base; offline-lane files (`src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, existing pages) must not be touched.

The core team has reviewed all 5 phase reports, the summary, and `docs/ONLINE-LANE-OPEN-QUESTIONS.md`. This prompt delivers the official rulings and unblocks the #1 blocker: **the online core backend exists** — it is the core team's Node server, running in production daily on their machine. It was never going to be reachable from your deployment, so the ruling is: **port the backend into THIS repo's production server**. This prompt embeds the complete reference implementation (distilled from the running core server — treat it as the specification). After this prompt, one single Railway deploy of this repo contains the UI *and* the online backend, and `/online-lab` must complete its first-ever end-to-end run (speak → subtitles → refined translation → optional TTS). At the gala the very same server runs on the Mac mini — no second service, no proxy.

The upstream vendors (realtime ASR WebSocket, refine LLM, TTS) are reached with API keys from environment variables. The operator will set the real values in Railway env after your code lands; this prompt contains **no secrets**. Model identifiers appear only in this new server-side module and env defaults — they must never appear in any client-side file or client bundle.
</context>

<rulings>
Official answers to `docs/ONLINE-LANE-OPEN-QUESTIONS.md` — record them in that file (TASK 4):

- **A1 (backend does not exist)** → ✅ RESOLVED. The backend exists (the core team's Node server). Decision: it is **ported into this repo's production server** as a self-contained module — TASK 1 below, reference implementation included. One deploy = UI + online backend, on Railway now and on the gala Mac mini later.
- **A2 (production serving has no `/online-api` proxy)** → ✅ SUPERSEDED by A1: no proxy to an external core is needed anymore. Instead, the production server itself must serve `/online-api/*` (HTTP + WS upgrade) — part of TASK 1. The vite dev proxy is repointed at the local Node server without the `/api` rewrite.
- **A3 (gala-usable vs research bench)** → ✅ DECIDED: **keep `/online-lab` hidden** (option A). No menu/navbar links. The real operator UI is a later, owner-designed phase.
- **A4 (auth + cost controls)** → ✅ DECIDED: guard the new `/online-api/*` routes with the SAME auth mechanism this app already uses for its protected routes, if one exists; if the app has none, leave them open for now and record that in OPEN-QUESTIONS as a post-gala hardening item. Existing client-side draft admission (≤30/min) + usage reports are the accepted cost controls for now.
- **B7 (refine idle as fixed delay)** → ✅ ACCEPTED (behaviorally equivalent; finalized lids receive no partials).
- **B8 (draft translates only the fresh tail after promotion)** → ✅ ACCEPTED — verified identical to the core implementation (the core also strips the promoted prefix and drafts only the suffix; refine re-translates the full sentence).
- **B9 (provisional-at-flush transcript, upgraded in place)** → ✅ ACCEPTED. Complete-in-count beats complete-in-quality for a live transcript.
- **B10 (peak-based `onLevel`, loud threshold 0.09)** → ✅ ACCEPTED — matches the core (peak ≈ 12/127).
- **B11 (two disclosed `ttsPlayback.ts` deviations)** → ✅ ACCEPTED — both are real fixes.
- **C12 (committed tests)** → ✅ ruled: do it now — TASK 2. C13–C16 remain deferred post-gala as agreed.
- **D (45 s watchdog toast on genuine silence)** → ✅ ruled: soften it — TASK 3.
</rulings>

<task>
1. Implement the online backend as a server-side module of THIS repo, mounted at `/online-api/*` (HTTP + WS) — the E2E unblocker.
2. Commit the scratchpad tests as a real `vitest` suite.
3. Silence-driven watchdog reconnects become quiet (no error toast).
4. Update the two docs with the rulings, then run the first real end-to-end pass and report.
</task>

## TASK 1 — Online backend inside this repo's production server

Add a server-side module (suggested: `server/online-api.mjs` next to whatever file serves the built app; adapt filename/language — TS/CJS — to match the existing server, keeping the logic identical to the reference below). It exports one installer that mounts the routes on the existing Express app and the WS upgrade on the existing HTTP server. Requirements:

1. **Dependency**: `ws` (WebSocket client + server). Add it as a regular dependency. Nothing else new.
2. **Mount at `/online-api/*` directly** (the client already calls this base — zero client changes). The old dev-proxy rewrite `^/online-api → /api` disappears: in `vite.config.ts`, repoint the `/online-api` proxy at the local Node server (its port) with `ws: true` and **no rewrite**. In production there is no proxy at all — same server, same origin.
3. **Do not disturb the offline lane**: `/api/*` paths and any existing WS upgrade handling stay untouched. The new upgrade listener must ignore every pathname except `/online-api/asr` (do not `socket.destroy()` other paths — another handler may own them).
4. **Auth**: pass the app's existing auth middleware into the installer (per ruling A4). If none exists, use a no-op and note it.
5. **Body size**: `/online-api/save-session` accepts up to ~5 MB JSON — make sure the JSON body parser that runs for this route has a limit ≥ 6 MB (if a global parser with a smaller limit runs first, raising a route-level limit later has no effect; adjust accordingly).
6. **Secrets & models stay server-side**: env names below, values set by the operator in Railway. No `VITE_` prefix for any of them, no model identifier in any file under `src/`, and the built client bundle must not contain any of these strings.

| Env (Railway) | Required | Default |
|---|---|---|
| `QWEN3_ASR_WS_BASE` | yes | — (wss base URL of the realtime ASR workspace) |
| `QWEN3_ASR_API_KEY` | yes | — |
| `QWEN3_ASR_MODEL` | no | `qwen3-asr-flash-realtime-2026-02-10` |
| `QWEN3_ASR_VAD_THRESHOLD` | no | `0.45` |
| `QWEN3_ASR_VAD_SILENCE_MS` | no | `800` |
| `OPENAI_API_KEY` | yes | — |
| `OPENAI_PREVIEW_REFINE_MODEL` | no | `gpt-4.1` |
| `PREVIEW_REFINE_TIMEOUT_MS` | no | `10000` |
| `ELEVENLABS_API_KEY` | yes | — |
| `ELEVENLABS_VOICE_ID` | yes | — (Japanese voice) |
| `VI_ELEVENLABS_VOICE_ID` | yes | — (Vietnamese voice) |
| `ELEVENLABS_MODEL_ID` | no | `eleven_flash_v2_5` |
| `ELEVENLABS_OUTPUT_FORMAT` | no | `mp3_22050_32` |
| `ONLINE_HISTORY_DIR` | no | `./translated_history` |

### Reference implementation (distilled from the running core server — keep the logic identical)

```js
// server/online-api.mjs — ONLINE lane backend, ported from the core server.
// Usage from the production server file:
//   import { installOnlineApi } from './online-api.mjs';
//   installOnlineApi(app, httpServer, { requireAuth: yourAuthMiddlewareOrUndefined });
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'node:fs/promises';
import path from 'node:path';

const env = (name, fallback = '') => (process.env[name] ?? fallback).trim();
const num = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
};

const ASR_WS_BASE = env('QWEN3_ASR_WS_BASE').replace(/\/+$/, '');
const ASR_API_KEY = env('QWEN3_ASR_API_KEY');
const ASR_MODEL = env('QWEN3_ASR_MODEL', 'qwen3-asr-flash-realtime-2026-02-10');
const ASR_VAD_THRESHOLD = num('QWEN3_ASR_VAD_THRESHOLD', 0.45);
const ASR_VAD_SILENCE_MS = num('QWEN3_ASR_VAD_SILENCE_MS', 800);

const OPENAI_API_KEY = env('OPENAI_API_KEY');
const REFINE_MODEL = env('OPENAI_PREVIEW_REFINE_MODEL', 'gpt-4.1');
const REFINE_TIMEOUT_MS = num('PREVIEW_REFINE_TIMEOUT_MS', 10_000);

const ELEVENLABS_API_KEY = env('ELEVENLABS_API_KEY');
const JA_VOICE_ID = env('ELEVENLABS_VOICE_ID');
const VI_VOICE_ID = env('VI_ELEVENLABS_VOICE_ID');
const ELEVENLABS_MODEL_ID = env('ELEVENLABS_MODEL_ID', 'eleven_flash_v2_5');
const ELEVENLABS_OUTPUT_FORMAT = env('ELEVENLABS_OUTPUT_FORMAT', 'mp3_22050_32');
const ELEVENLABS_TIMEOUT_MS = num('ELEVENLABS_TIMEOUT_MS', 15_000);

const HISTORY_DIR = env('ONLINE_HISTORY_DIR', './translated_history');
const MAX_TEXT_CHARS = 12_000;
const TTS_MAX_TEXT_CHARS = 1_000;
const MAX_RECENT_CONTEXT_ITEMS = 3;
const SESSION_BRIEF_MAX_CHARS = 2_000;
const SESSION_TERMS_MAX = 40;
const SAVE_SESSION_MAX_BYTES = 5 * 1024 * 1024;

// ---------- small helpers ----------
const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const limitText = (value, maxChars) => normalizeText(value).slice(0, maxChars);
const normalizeLanguage = (value, fallback) => {
  const raw = normalizeText(value).toLowerCase();
  return raw === 'vi' || raw === 'ja' ? raw : fallback;
};
const safeFilename = (value) => normalizeText(value).replace(/[^\w.-]+/g, '_').slice(0, 120) || `session_${Date.now()}`;
const logLine = (event, data) => console.log(JSON.stringify({ at: new Date().toISOString(), lane: 'online', event, ...data }));

function withTimeout(promise, timeoutMs, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => { if (timer) clearTimeout(timer); });
}

function parseSessionTerms(raw) {
  const terms = [];
  for (const line of String(raw ?? '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s*(?:=>|->|→|=|\||\t)\s*/);
    const source = limitText(parts[0], 120);
    const target = limitText(parts.slice(1).join(' '), 160);
    if (!source) continue;
    terms.push({ source, target });
    if (terms.length >= SESSION_TERMS_MAX) break;
  }
  return terms;
}

// ---------- tts speed guard (mirror of the core's ttsDelivery module) ----------
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finiteNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
};

function normalizeTtsSourcePace(value) {
  if (!value || typeof value !== 'object') return undefined;
  const { label } = value;
  if (label !== 'slow' && label !== 'normal' && label !== 'fast' && label !== 'very_fast') return undefined;
  const unitsPerSecond = finiteNumber(value.unitsPerSecond);
  const durationMs = finiteNumber(value.durationMs);
  const speechUnits = finiteNumber(value.speechUnits);
  const confidence = finiteNumber(value.confidence);
  if (unitsPerSecond === undefined || durationMs === undefined || speechUnits === undefined || confidence === undefined) return undefined;
  return {
    label,
    unitsPerSecond: clamp(unitsPerSecond, 0.1, 12),
    durationMs: Math.round(clamp(durationMs, 500, 60_000)),
    speechUnits: Math.round(clamp(speechUnits, 1, 300)),
    confidence: clamp(confidence, 0, 1),
  };
}

function defaultTtsSpeedForPace(pace) {
  if (!pace || pace.confidence < 0.35) return 1;
  if (pace.label === 'slow') return 0.92;
  if (pace.label === 'fast') return 1.1;
  if (pace.label === 'very_fast') return 1.18;
  return 1;
}

// The LLM is advisory only: this guard keeps live speech inside the safe range.
function normalizeTtsSpeed(value, pace, fallback = 1) {
  const requested = finiteNumber(value);
  const base = requested ?? (pace ? defaultTtsSpeedForPace(pace) : fallback);
  return Number(clamp(base, 0.85, 1.2).toFixed(2));
}

// ---------- refine result parsing (defensive against malformed LLM output) ----------
const STRUCTURED_KEY_PATTERN =
  /["'](?:source_corrected|sourceCorrected|sourceText|target_final|targetFinal|translatedText|tts_text|ttsText|emotion|tts_speed|ttsSpeed)["']\s*:/i;

function parseJsonObject(value) {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first < 0 || last <= first) return null;
    try {
      const parsed = JSON.parse(trimmed.slice(first, last + 1));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

const looksStructured = (value) => {
  const trimmed = value.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('```') || STRUCTURED_KEY_PATTERN.test(trimmed);
};

function readTextField(object, keys, depth = 0) {
  if (!object || depth > 1) return '';
  for (const key of keys) {
    const value = object[key];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (!looksStructured(trimmed)) return trimmed;
    // Some malformed responses stringify the whole result object into one
    // field. Recover its inner value instead of exposing JSON to the UI.
    const recovered = readTextField(parseJsonObject(trimmed), keys, depth + 1);
    if (recovered) return recovered;
  }
  return '';
}

function parseRefineContent(content) {
  const parsed = parseJsonObject(content);
  if (parsed) {
    return {
      sourceCorrected: readTextField(parsed, ['source_corrected', 'sourceCorrected', 'sourceText']),
      targetFinal: readTextField(parsed, ['target_final', 'targetFinal', 'translatedText']),
      ttsText: readTextField(parsed, ['tts_text', 'ttsText']),
      emotion: readTextField(parsed, ['emotion']),
      ttsSpeed: parsed.tts_speed ?? parsed.ttsSpeed,
      format: 'structured',
    };
  }
  const trimmed = content.trim();
  const rejected = looksStructured(trimmed);
  return { sourceCorrected: '', targetFinal: rejected ? '' : trimmed, ttsText: '', emotion: '', ttsSpeed: undefined, format: rejected ? 'rejected_structured' : 'plain_text' };
}

// ---------- refine prompt (mirror of the core's runtime policy) ----------
function targetLanguageTermPolicy(targetLanguage) {
  if (targetLanguage.startsWith('ja')) {
    return [
      'Target-language term policy:',
      '- For Vietnamese source mentions of "Sếp", "Sip", "SIP", "CEO", "TGĐ", or "Tổng Giám đốc" that refer to the company president/general director, keep source_corrected in Vietnamese as "Sếp" or "Tổng Giám đốc" only when appropriate.',
      '- In target_final Japanese, render that same role as "社長". Do not output "Sếp", "TGĐ", "CEO", or "Shachou" in Japanese subtitles unless the speaker is explicitly spelling the term.',
    ].join('\n');
  }
  if (targetLanguage.startsWith('vi')) {
    return [
      'Target-language term policy:',
      '- For Japanese source mentions of "社長" that refer to the company president/general director, render target_final Vietnamese as "Sếp" or "Tổng Giám đốc" depending on formality.',
      '- Do not leave "社長" in Vietnamese subtitles unless the speaker is explicitly discussing the Japanese word.',
    ].join('\n');
  }
  return '';
}

function buildRefinePrompt({ sourceText, previewText, sourceLanguage, targetLanguage, sourceEmotion, sourcePace, recentFinals, sessionBrief, sessionTerms }) {
  return [
    'Refine a realtime translated subtitle for a live company event. Use the source transcript, preview translation, recent context, and provided terms to produce one accurate final subtitle in the target language. Preserve names, numbers, times, acronyms, tone, and meaning. Return only valid JSON.',
    [
      'Runtime refine policy (faithful-edit mode):',
      '- target_final must faithfully convey the FULL meaning of the source transcript: nothing omitted, nothing added, nothing distorted. Fidelity to the source outranks stylistic elegance.',
      '- Compare the preview against the source transcript. When the preview omits details (numbers, clauses, qualifiers, named items), adds content, or shifts the meaning, correct target_final to match the source closely. Prefer wording that stays near the source structure while remaining natural in the target language.',
      '- When the preview already conveys the source meaning accurately, keep its wording unchanged. Never paraphrase or restyle for taste alone.',
      '- Always apply these edits:',
      '  1. Correct proper nouns and terms using the provided term lists, with evidence from the source transcript.',
      '  2. In target_final, ALWAYS render non-Japanese person and organization names in katakana so Japanese readers and TTS can pronounce them. Use the katakana reading from the term list when provided; a Latin canonical spelling in the term list applies to source_corrected only, never to target_final.',
      '  3. When the target language is Japanese, enforce a formal-ceremony register: polite/humble/honorific endings (desu/masu, -te orimasu, o-/go- forms, sonkeigo for executives and guests). Change register and endings only, never content words.',
      '- If the source transcript is missing or empty, keep the preview wording and apply only edits 1-3.',
      '- If the preview translation is missing or empty, translate the source transcript directly and faithfully, applying edits 1-3.',
      '- If uncertain about a name, keep the lower-risk surface form instead of inventing one.',
      '- Return source_corrected as "" (empty string) whenever the source transcript needs NO correction. Only when you actually changed something, return the full corrected transcript. Never re-type an unchanged transcript.',
      '- When a session context or session terms block is provided below, it describes THIS specific meeting: use it to resolve ambiguous names, agenda items, and topic references, and let session terms override any conflicting generic terms. A session term with no target means: keep that name/acronym exact and correct ASR mishearings toward it.',
      '- A person listed in session terms is allowed vocabulary, NOT proof that the speaker said that name. Never insert or replace a person name unless the CURRENT source transcript contains a plausible matching name surface. Recent subtitles and session context alone are never evidence for a person name.',
      '- Also return emotion: exactly one of neutral, excited, serious, somber. When a detected-from-audio value is provided below, map it to the closest of those four. Otherwise infer it conservatively from the wording alone (exclamations, celebration, applause calls, condolences); default to neutral whenever unsure.',
      '- Also return tts_speed: a number from 0.85 to 1.20 for the TTS engine. Primarily follow the measured source speaking pace. Use 1.00 when pace confidence is low; slow speech is normally 0.88-0.95, normal 0.96-1.04, fast 1.05-1.15, and very fast at most 1.20. Emotion may adjust this only slightly and must never override clearly measured pace.',
      '- Also return tts_text: only when that emotion is clearly non-neutral, return target_final with SPARSE audio tags added (e.g. [excited], [serious], [somber]) at natural positions; otherwise return tts_text as "" (empty string). Never copy an untagged target_final into tts_text. Audio tags never go into target_final.',
      '- Redact credential-like content.',
    ].join('\n'),
    `Source language: ${sourceLanguage}`,
    `Target language: ${targetLanguage}`,
    targetLanguageTermPolicy(targetLanguage),
    sessionBrief ? `Session context for this meeting (operator-provided):\n${sessionBrief}` : '',
    sessionTerms.length > 0
      ? `Session terms for this meeting (highest priority):\n${sessionTerms.map((term) => term.target ? `- ${term.source} → ${term.target}` : `- ${term.source} (keep exact)`).join('\n')}`
      : '',
    recentFinals.length > 0 ? `Recent final subtitles:\n${recentFinals.join('\n')}` : '',
    `Source transcript:\n${sourceText || '(not available)'}`,
    `Realtime preview translation:\n${previewText || '(not available)'}`,
    sourceEmotion ? `Source speaker emotion (detected from audio): ${sourceEmotion}` : '',
    sourcePace
      ? `Measured source speaking pace (from transcript + mic timing): ${sourcePace.label}; ${sourcePace.unitsPerSecond.toFixed(2)} speech units/second over ${sourcePace.durationMs} ms; confidence ${sourcePace.confidence.toFixed(2)}.`
      : 'Measured source speaking pace: unavailable; use tts_speed 1.00.',
    'Return JSON only with keys: source_corrected, target_final, tts_text, emotion, tts_speed. source_corrected and tts_text must be "" in the unchanged/untagged cases described above.',
  ].filter(Boolean).join('\n\n');
}

function extractResponseText(data) {
  if (normalizeText(data?.output_text)) return normalizeText(data.output_text);
  return (data?.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((content) => normalizeText(content.text))
    .filter(Boolean)
    .join('\n')
    .trim();
}

async function refineWithLlm(params) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured.');
  const prompt = buildRefinePrompt(params);
  const requestOnce = async () => {
    const response = await withTimeout(
      fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: REFINE_MODEL,
          input: prompt,
          max_output_tokens: 512,
          temperature: 0.2,
          text: {
            format: {
              type: 'json_schema',
              name: 'preview_refine_result',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  source_corrected: { type: 'string' },
                  target_final: { type: 'string' },
                  tts_text: { type: 'string' },
                  emotion: { type: 'string', enum: ['neutral', 'excited', 'serious', 'somber'] },
                  tts_speed: { type: 'number', minimum: 0.85, maximum: 1.2 },
                },
                required: ['source_corrected', 'target_final', 'tts_text', 'emotion', 'tts_speed'],
                additionalProperties: false,
              },
            },
          },
        }),
      }),
      REFINE_TIMEOUT_MS,
      'preview translation refine',
    );
    const raw = await response.text();
    if (!response.ok) throw new Error(`Refine failed: ${response.status} ${raw.slice(0, 300)}`);
    const data = JSON.parse(raw);
    const parsed = parseRefineContent(extractResponseText(data));
    const targetFinal = normalizeText(parsed.targetFinal) || params.previewText;
    // Without an input transcript the model has nothing to correct; keep the
    // source empty instead of letting it fabricate one.
    const sourceCorrected = normalizeText(params.sourceText)
      ? (normalizeText(parsed.sourceCorrected) || params.sourceText)
      : '';
    const ttsAnnotated = normalizeText(parsed.ttsText);
    return {
      sourceText: sourceCorrected,
      translatedText: targetFinal,
      ttsText: ttsAnnotated && ttsAnnotated !== targetFinal ? ttsAnnotated : '',
      emotion: normalizeText(parsed.emotion).toLowerCase().slice(0, 24),
      ttsSpeed: normalizeTtsSpeed(parsed.ttsSpeed, params.sourcePace),
      outputFormat: parsed.format,
    };
  };
  // A single retry turns most timeout losses into a late-but-translated
  // subtitle instead of a source-only line.
  try {
    return await requestOnce();
  } catch (error) {
    if (!String(error?.message ?? '').includes('timed out')) throw error;
    logLine('refine.retry', { reason: 'timeout' });
    return await requestOnce();
  }
}

// ---------- TTS (streamed) ----------
const stripAudioTags = (text) => text.replace(/\[[^\]]{1,40}\]/g, ' ').replace(/\s{2,}/g, ' ').trim();

// Detected source emotion shapes delivery via per-request voice settings.
function voiceSettingsFor(emotion, speed) {
  const base = { similarity_boost: 0.76, use_speaker_boost: false };
  if (!emotion || emotion === 'neutral' || emotion === 'unknown') return { ...base, stability: 0.45, style: 0, speed };
  if (/(excit|happy|joy|cheer|surpris|enthusias)/.test(emotion)) return { ...base, stability: 0.28, style: 0.32, speed };
  if (/(sad|somber|sorrow|grie|cry)/.test(emotion)) return { ...base, stability: 0.62, style: 0.18, speed };
  if (/(serious|solemn|stern|angry|firm)/.test(emotion)) return { ...base, stability: 0.52, style: 0.18, speed };
  return { ...base, stability: 0.4, style: 0.2, speed };
}

async function synthesizeSpeech(text, language, voiceId, emotion, speed, res) {
  const response = await withTimeout(
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=${encodeURIComponent(ELEVENLABS_OUTPUT_FORMAT)}`, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: stripAudioTags(text),
        model_id: ELEVENLABS_MODEL_ID,
        language_code: language,
        voice_settings: voiceSettingsFor(emotion, speed),
      }),
    }),
    ELEVENLABS_TIMEOUT_MS,
    'TTS synthesis',
  );
  if (!response.ok) throw new Error(`TTS failed: ${response.status} ${(await response.text()).slice(0, 200)}`);
  if (!response.body) throw new Error('TTS stream returned no audio body.');
  res.set('Content-Type', 'audio/mpeg');
  // Preserve upstream chunking so the browser starts playback from the first
  // MP3 frames instead of waiting for the complete sentence.
  for await (const chunk of response.body) {
    if (res.writableEnded || res.destroyed) break;
    res.write(Buffer.from(chunk));
  }
  if (!res.writableEnded) res.end();
}

// ---------- installer ----------
export function installOnlineApi(app, httpServer, { requireAuth } = {}) {
  const guard = requireAuth ?? ((_req, _res, next) => next());

  app.post('/online-api/realtime-preview-token', guard, (_req, res) => {
    if (!ASR_WS_BASE || !ASR_API_KEY) {
      res.status(500).json({ error: 'Realtime ASR is not configured.' });
      return;
    }
    res.json({
      mode: 'transcribe',
      asrProvider: 'qwen3',
      asrModel: ASR_MODEL,
      asrSourceCorrectionEnabled: true,
      asrCorrectionTermCount: 0,
      asrWsPath: '/online-api/asr',
    });
  });

  app.post('/online-api/refine-preview-translation', guard, async (req, res) => {
    try {
      const traceId = limitText(req.body?.traceId, 80);
      const sourceLanguage = normalizeLanguage(req.body?.sourceLanguage, 'vi');
      const targetLanguage = normalizeLanguage(req.body?.targetLanguage, 'ja');
      const sourceText = limitText(req.body?.sourceText, MAX_TEXT_CHARS);
      const previewText = limitText(req.body?.previewText, MAX_TEXT_CHARS);
      if (!sourceText && !previewText) {
        res.status(400).json({ error: 'sourceText or previewText is required.' });
        return;
      }
      const result = await refineWithLlm({
        sourceText,
        previewText,
        sourceLanguage,
        targetLanguage,
        sourceEmotion: limitText(req.body?.sourceEmotion, 40),
        sourcePace: normalizeTtsSourcePace(req.body?.sourcePace),
        recentFinals: Array.isArray(req.body?.recentFinals)
          ? req.body.recentFinals.map((item) => limitText(item, 600)).filter(Boolean).slice(-MAX_RECENT_CONTEXT_ITEMS)
          : [],
        sessionBrief: limitText(req.body?.sessionBrief, SESSION_BRIEF_MAX_CHARS),
        sessionTerms: parseSessionTerms(typeof req.body?.sessionTerms === 'string' ? req.body.sessionTerms : ''),
      });
      const { outputFormat, ...payload } = result;
      logLine('refine.ok', { outputFormat, sourceLength: payload.sourceText.length, translatedLength: payload.translatedText.length, ttsSpeed: payload.ttsSpeed, traceId: traceId || null });
      res.json({ ...payload, traceId: traceId || undefined });
    } catch (error) {
      logLine('refine.fail', { message: String(error?.message ?? error).slice(0, 300) });
      res.status(502).json({ error: 'Preview refine failed.' });
    }
  });

  app.post('/online-api/tts', guard, async (req, res) => {
    try {
      const text = limitText(req.body?.text, TTS_MAX_TEXT_CHARS);
      const language = normalizeLanguage(req.body?.language, 'ja');
      const emotion = limitText(req.body?.emotion, 40).toLowerCase();
      const speed = normalizeTtsSpeed(req.body?.speed, undefined, 1);
      if (!text) {
        res.status(400).json({ error: 'text is required.' });
        return;
      }
      const voiceId = language === 'vi' ? VI_VOICE_ID : JA_VOICE_ID;
      if (!ELEVENLABS_API_KEY || !voiceId) {
        res.status(503).json({ error: `TTS is not configured for language "${language}".` });
        return;
      }
      await synthesizeSpeech(text, language, voiceId, emotion, speed, res);
    } catch (error) {
      logLine('tts.fail', { message: String(error?.message ?? error).slice(0, 300) });
      if (!res.headersSent) res.status(503).json({ error: 'TTS engine is not responding.' });
      else if (!res.writableEnded) res.end();
    }
  });

  app.post('/online-api/save-session', guard, async (req, res) => {
    try {
      const filename = safeFilename(req.body?.filename);
      const json = typeof req.body?.json === 'string' ? req.body.json : '';
      const md = typeof req.body?.md === 'string' ? req.body.md : '';
      if (!json && !md) {
        res.status(400).json({ error: 'json or md content is required.' });
        return;
      }
      if (Buffer.byteLength(json, 'utf8') + Buffer.byteLength(md, 'utf8') > SAVE_SESSION_MAX_BYTES) {
        res.status(413).json({ error: 'Session export is too large.' });
        return;
      }
      await fs.mkdir(HISTORY_DIR, { recursive: true });
      if (json) await fs.writeFile(path.join(HISTORY_DIR, `${filename}.json`), json, 'utf8');
      if (md) await fs.writeFile(path.join(HISTORY_DIR, `${filename}.md`), md, 'utf8');
      res.json({ saved: true, filename });
    } catch (error) {
      logLine('save.fail', { message: String(error?.message ?? error).slice(0, 300) });
      res.status(500).json({ error: 'Failed to save session.' });
    }
  });

  app.post('/online-api/usage-report', guard, (req, res) => {
    logLine('usage.report', { report: JSON.parse(JSON.stringify(req.body ?? {}).slice(0, 4_000) || '{}') });
    res.json({ ok: true });
  });

  // ---------- WS /online-api/asr : browser PCM16 in, transcript events out ----------
  const asrWss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', 'http://localhost');
    // Only claim our own path; other upgrade handlers may own the rest.
    if (url.pathname !== '/online-api/asr') return;
    asrWss.handleUpgrade(request, socket, head, (ws) => {
      asrWss.emit('connection', ws, request);
    });
  });

  asrWss.on('connection', (client, request) => {
    const url = new URL(request.url || '/online-api/asr', 'http://localhost');
    const language = normalizeLanguage(url.searchParams.get('language'), 'vi');
    // Session-scoped biasing terms arrive in the WS URL (≤ 2000 chars).
    const corpusText = limitText(url.searchParams.get('corpus') || url.searchParams.get('hotwords'), 2_000);

    if (!ASR_WS_BASE || !ASR_API_KEY) {
      client.send(JSON.stringify({ type: 'error', error: { message: 'Realtime ASR is not configured.' } }));
      client.close(1011, 'ASR not configured');
      return;
    }

    logLine('asr.session', { language, corpusChars: corpusText.length });
    const upstream = new WebSocket(
      `${ASR_WS_BASE}/api-ws/v1/realtime?model=${encodeURIComponent(ASR_MODEL)}`,
      { headers: { Authorization: `Bearer ${ASR_API_KEY}`, 'OpenAI-Beta': 'realtime=v1' } },
    );
    let upstreamReady = false;
    const pendingFrames = [];

    upstream.on('open', () => {
      upstream.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text'],
          input_audio_format: 'pcm',
          sample_rate: 16000,
          input_audio_transcription: {
            language,
            ...(corpusText ? { corpus: { text: corpusText } } : {}),
          },
          turn_detection: {
            type: 'server_vad',
            threshold: ASR_VAD_THRESHOLD,
            silence_duration_ms: ASR_VAD_SILENCE_MS,
          },
        },
      }));
      upstreamReady = true;
      for (const frame of pendingFrames) upstream.send(frame);
      pendingFrames.length = 0;
    });

    // Upstream already emits the contract's event shapes — pass through verbatim.
    upstream.on('message', (data) => {
      const text = typeof data === 'string' ? data : data.toString();
      if (client.readyState === WebSocket.OPEN) client.send(text);
    });

    upstream.on('error', (error) => {
      logLine('asr.upstream_error', { message: String(error?.message ?? 'upstream error').slice(0, 300) });
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'error', error: { message: 'ASR upstream connection failed.' } }));
      }
    });

    upstream.on('close', () => {
      if (client.readyState === WebSocket.OPEN) client.close(1011, 'ASR upstream closed');
    });

    client.on('message', (raw, isBinary) => {
      if (isBinary) {
        const audio = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        if (audio.length === 0 || audio.length > 1024 * 1024) return;
        const frame = JSON.stringify({ type: 'input_audio_buffer.append', audio: audio.toString('base64') });
        if (upstreamReady && upstream.readyState === WebSocket.OPEN) upstream.send(frame);
        else pendingFrames.push(frame);
      }
    });

    client.on('close', () => {
      try { upstream.close(); } catch { /* already closed */ }
    });
  });
}
```

Integration notes:
- Call `installOnlineApi(app, httpServer, { requireAuth })` in the production server AFTER body parsing is configured and BEFORE the SPA fallback route, passing the real `http.Server` instance (the one `app.listen(...)` returns, or the manually created one).
- If the production server file is CommonJS, convert the module accordingly (same logic). If it is TypeScript, add minimal types — do not change behavior.
- If this repo's app currently has NO Node production server at all (e.g. static hosting only), create a minimal Express server that serves `dist/` and mounts this module, and make it the production start command.

## TASK 2 — Commit the module tests as `vitest`

The ~46 scratchpad tests exist only in a temp directory, so the reported counts are not reproducible. Fix:

1. Add `vitest` as a devDependency and a `"test": "vitest run"` script.
2. Commit real unit tests for the deterministic modules, at minimum: `transcriptSegmentation` (numeric separator — `10.000`/`100.000.000` never split; strong-break detection), `asrSpeechEvidence` (96/160 ms thresholds), `livePipelinePolicy` (admission reasons + adaptive flush), `liveDraftTranslation` (prefix stability/strip), `sessionExport` (filename format, `|` escaping in the md table), `latencyTracker` (p50/p90).
3. `npm test` must pass from a clean checkout.

## TASK 3 — Quiet reconnect on silence-driven watchdog

When the 45 s stall watchdog fires while there has been **no recent voice** (`voicedMsRecent` ≈ 0 — i.e. a genuine long pause), reconnect **silently**: no error toast, just `console.info` + a diagnostics counter (e.g. `silentReconnects: N`). Keep the visible error toast for the 35 s loud path (voice present but no events) and for reconnects that exhaust their attempts. This prevents alarming the operator every time a speaker pauses during a live event.

## TASK 4 — Docs

- `docs/ONLINE-LANE-OPEN-QUESTIONS.md`: mark every item per the `<rulings>` block above (❓ → ✅ with a one-line resolution each).
- `docs/ONLINE-LANE-CONTRACT.md`: add a short "Deployment" note — the online backend is served in-process by this repo's production server at `/online-api/*` (HTTP + WS); no external core, no proxy; env-driven configuration listed in TASK 1. Endpoint paths, events, and payloads are unchanged — contract stays v0.3.

<constraints>
Files you must NOT modify: offline-lane files, `src/lib/lanes/types.ts`, any page other than `OnlineLab.tsx`. Per ruling A3, do NOT add any menu/navbar link to `/online-lab`.
Inside `src/lib/lanes/online/`, change only what TASK 3 requires (`onlineLane.ts` watchdog path); everything else is frozen. The client already talks to `/online-api` — TASK 1 must require ZERO client-code changes.
All new backend code is server-side only. No model identifier, API host, or env value may appear in any file under `src/` or in the built client bundle. Never use a `VITE_` prefix for any TASK 1 env var.
If anything is ambiguous or conflicts with the repo's reality (e.g. no Express server exists, an upgrade handler already owns all paths), ask in the "Questions" section instead of inventing a solution.
</constraints>

<acceptance_criteria>
Verify each item yourself before replying, by actually running the checks — do not assume:
- [ ] `npm run build` passes and `npm test` passes (committed tests, clean checkout).
- [ ] The production serving command starts with the TASK 1 env vars set (use placeholder values locally if you have no real keys) and serves both the SPA and `/online-api/realtime-preview-token` (returns JSON, not the SPA fallback).
- [ ] WS `/online-api/asr` upgrade is accepted by the production server (with placeholder keys it must return the structured `error` event, not a 404/502 or socket destroy).
- [ ] With real keys (operator-provided env), `/online-lab` completes a real end-to-end pass: Start → speak Vietnamese → source subtitles appear → refined translation replaces the draft → TTS audio plays while still downloading (streamed, not buffered). Report which parts you could verify in your environment and which need the operator's keys — do not claim an E2E result you did not observe.
- [ ] No TASK 1 env name, key value, or model identifier appears in the built client bundle (`grep` the dist output).
- [ ] A ≥45 s silent pause reconnects with NO error toast; diagnostics show `silentReconnects` incremented.
- [ ] No diff on any forbidden file; no new menu links; zero changes under `src/lib/lanes/online/` except the TASK 3 watchdog path.
</acceptance_criteria>

<report_format>
Reply in exactly this structure (the reviewer cannot open this repo — the report is the only window into your work):
1. **Summary** — ≤5 lines in English + 1 closing line in Vietnamese (tóm tắt 1 dòng).
2. **Files** — every file created/modified, one line each with purpose.
3. **Full content** of the new server-side online-api module as committed + the list of committed test files with their test counts.
4. **Build & test output** — paste the actual tail of `npm run build` AND `npm test` verbatim. Do not paraphrase; if you did not run something, say so explicitly.
5. **Questions / uncertainties** — anything unresolved; never decide beyond the contract on your own.
</report_format>
