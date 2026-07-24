// server/online-api.mjs — ONLINE lane backend, ported from the core server.
//
// Adapted to THIS repo's production server (server.js is raw Node http, zero-dep + ESM):
// the vendor/refine/TTS/WS LOGIC is kept identical to the reference; only the Express plumbing
// (app.post / req.body / res.json) is replaced by raw-http request handling. Only new dependency: `ws`.
//
// Usage from server.js (after auth is defined, before the SPA fallback):
//   import { installOnlineApi } from './server/online-api.mjs';
//   const handleOnlineApi = installOnlineApi(server, { requireAuth: isAuthed });
//   // inside the request handler, after the auth gate, before serveStatic:
//   if (await handleOnlineApi(req, res)) return;
//
// Secrets + model identifiers live ONLY here (server-side) + in Railway env. Never in src/.

import { WebSocketServer, WebSocket } from 'ws';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getOnlineConfig, getConfigStatus, setOnlineConfig } from './online-config.mjs';

const env = (name, fallback = '') => (process.env[name] ?? fallback).trim();
const num = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
};

// FIX-07: the six vendor VALUES are read at CALL TIME via getOnlineConfig (runtime Settings value →
// env fallback), so keys entered in the app after boot take effect without a restart. The optional
// tuning envs below (models/timeouts/VAD/output format) keep their boot-time env-with-default const.
const asrWsBase = () => getOnlineConfig('QWEN3_ASR_WS_BASE').replace(/\/+$/, '');
const asrApiKey = () => getOnlineConfig('QWEN3_ASR_API_KEY');
const ASR_MODEL = env('QWEN3_ASR_MODEL', 'qwen3-asr-flash-realtime-2026-02-10');
const ASR_VAD_THRESHOLD = num('QWEN3_ASR_VAD_THRESHOLD', 0.45);
const ASR_VAD_SILENCE_MS = num('QWEN3_ASR_VAD_SILENCE_MS', 800);

const openaiApiKey = () => getOnlineConfig('OPENAI_API_KEY');
const REFINE_MODEL = env('OPENAI_PREVIEW_REFINE_MODEL', 'gpt-4.1');
const REFINE_TIMEOUT_MS = num('PREVIEW_REFINE_TIMEOUT_MS', 10_000);

const elevenApiKey = () => getOnlineConfig('ELEVENLABS_API_KEY');
const jaVoiceId = () => getOnlineConfig('ELEVENLABS_VOICE_ID');
const viVoiceId = () => getOnlineConfig('VI_ELEVENLABS_VOICE_ID');
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
  const apiKey = openaiApiKey();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');
  const prompt = buildRefinePrompt(params);
  const requestOnce = async () => {
    const response = await withTimeout(
      fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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

// Adapted for raw http: write headers + stream chunks onto the Node ServerResponse.
async function synthesizeSpeech(text, language, voiceId, emotion, speed, res) {
  const response = await withTimeout(
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=${encodeURIComponent(ELEVENLABS_OUTPUT_FORMAT)}`, {
      method: 'POST',
      headers: { 'xi-api-key': elevenApiKey(), 'Content-Type': 'application/json' },
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
  res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' });
  // Preserve upstream chunking so the browser starts playback from the first
  // MP3 frames instead of waiting for the complete sentence.
  for await (const chunk of response.body) {
    if (res.writableEnded || res.destroyed) break;
    res.write(Buffer.from(chunk));
  }
  if (!res.writableEnded) res.end();
}

// ---------- raw-http request/response helpers ----------
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Request body too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

// ---------- installer ----------
// Attaches the WS upgrade listener for /online-api/asr and returns an async request handler
// `handleOnlineApi(req, res) -> boolean` (true = it owns this request). The caller mounts it
// after its auth gate and before the SPA fallback. `requireAuth(req) -> boolean` reuses the
// app's existing auth (ruling A4); a WS/HTTP request that fails it is rejected.
export function installOnlineApi(server, { requireAuth } = {}) {
  const authed = typeof requireAuth === 'function' ? requireAuth : () => true;

  // ---------- WS /online-api/asr : browser PCM16 in, transcript events out ----------
  const asrWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', 'http://localhost');
    // Only claim our own path; other upgrade handlers may own the rest.
    if (url.pathname !== '/online-api/asr') return;
    if (!authed(request)) {
      socket.destroy();
      return;
    }
    asrWss.handleUpgrade(request, socket, head, (ws) => {
      asrWss.emit('connection', ws, request);
    });
  });

  asrWss.on('connection', (client, request) => {
    const url = new URL(request.url || '/online-api/asr', 'http://localhost');
    const language = normalizeLanguage(url.searchParams.get('language'), 'vi');
    // Session-scoped biasing terms arrive in the WS URL (≤ 2000 chars).
    const corpusText = limitText(url.searchParams.get('corpus') || url.searchParams.get('hotwords'), 2_000);

    const wsBase = asrWsBase();
    const apiKey = asrApiKey();
    if (!wsBase || !apiKey) {
      client.send(JSON.stringify({ type: 'error', error: { message: 'Realtime ASR is not configured.' } }));
      client.close(1011, 'ASR not configured');
      return;
    }

    logLine('asr.session', { language, corpusChars: corpusText.length });
    const upstream = new WebSocket(
      `${wsBase}/api-ws/v1/realtime?model=${encodeURIComponent(ASR_MODEL)}`,
      { headers: { Authorization: `Bearer ${apiKey}`, 'OpenAI-Beta': 'realtime=v1' } },
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

  // ---------- HTTP /online-api/* ----------
  return async function handleOnlineApi(req, res) {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = url.pathname;
    if (!pathname.startsWith('/online-api/')) return false; // not ours — let the caller continue
    if (!authed(req)) {
      sendJson(res, 401, { error: 'Unauthorized.' });
      return true;
    }

    try {
      // FIX-07 app-management endpoints (write-only key config) — never return/echo/log values.
      if (pathname === '/online-api/config-status' && req.method === 'GET') {
        sendJson(res, 200, getConfigStatus());
        return true;
      }
      if (pathname === '/online-api/config-keys' && req.method === 'POST') {
        const body = await readJsonBody(req, 64 * 1024);
        const result = setOnlineConfig(body);
        if (result.error) {
          sendJson(res, 400, { error: result.error });
          return true;
        }
        logLine('config.updated', { changed: result.changed }); // NAMES only — never values
        sendJson(res, 200, getConfigStatus());
        return true;
      }

      if (pathname === '/online-api/realtime-preview-token' && req.method === 'POST') {
        if (!asrWsBase() || !asrApiKey()) {
          sendJson(res, 500, { error: 'Realtime ASR is not configured.' });
          return true;
        }
        sendJson(res, 200, {
          mode: 'transcribe',
          asrProvider: 'qwen3',
          asrModel: ASR_MODEL,
          asrSourceCorrectionEnabled: true,
          asrCorrectionTermCount: 0,
          asrWsPath: '/online-api/asr',
        });
        return true;
      }

      if (pathname === '/online-api/refine-preview-translation' && req.method === 'POST') {
        const body = await readJsonBody(req, 1 * 1024 * 1024);
        const traceId = limitText(body?.traceId, 80);
        const sourceLanguage = normalizeLanguage(body?.sourceLanguage, 'vi');
        const targetLanguage = normalizeLanguage(body?.targetLanguage, 'ja');
        const sourceText = limitText(body?.sourceText, MAX_TEXT_CHARS);
        const previewText = limitText(body?.previewText, MAX_TEXT_CHARS);
        if (!sourceText && !previewText) {
          sendJson(res, 400, { error: 'sourceText or previewText is required.' });
          return true;
        }
        try {
          const result = await refineWithLlm({
            sourceText,
            previewText,
            sourceLanguage,
            targetLanguage,
            sourceEmotion: limitText(body?.sourceEmotion, 40),
            sourcePace: normalizeTtsSourcePace(body?.sourcePace),
            recentFinals: Array.isArray(body?.recentFinals)
              ? body.recentFinals.map((item) => limitText(item, 600)).filter(Boolean).slice(-MAX_RECENT_CONTEXT_ITEMS)
              : [],
            sessionBrief: limitText(body?.sessionBrief, SESSION_BRIEF_MAX_CHARS),
            sessionTerms: parseSessionTerms(typeof body?.sessionTerms === 'string' ? body.sessionTerms : ''),
          });
          const { outputFormat, ...payload } = result;
          logLine('refine.ok', { outputFormat, sourceLength: payload.sourceText.length, translatedLength: payload.translatedText.length, ttsSpeed: payload.ttsSpeed, traceId: traceId || null });
          sendJson(res, 200, { ...payload, traceId: traceId || undefined });
        } catch (error) {
          logLine('refine.fail', { message: String(error?.message ?? error).slice(0, 300) });
          sendJson(res, 502, { error: 'Preview refine failed.' });
        }
        return true;
      }

      if (pathname === '/online-api/tts' && req.method === 'POST') {
        const body = await readJsonBody(req, 1 * 1024 * 1024);
        try {
          const text = limitText(body?.text, TTS_MAX_TEXT_CHARS);
          const language = normalizeLanguage(body?.language, 'ja');
          const emotion = limitText(body?.emotion, 40).toLowerCase();
          const speed = normalizeTtsSpeed(body?.speed, undefined, 1);
          if (!text) {
            sendJson(res, 400, { error: 'text is required.' });
            return true;
          }
          const voiceId = language === 'vi' ? viVoiceId() : jaVoiceId();
          if (!elevenApiKey() || !voiceId) {
            sendJson(res, 503, { error: `TTS is not configured for language "${language}".` });
            return true;
          }
          await synthesizeSpeech(text, language, voiceId, emotion, speed, res);
        } catch (error) {
          logLine('tts.fail', { message: String(error?.message ?? error).slice(0, 300) });
          if (!res.headersSent) sendJson(res, 503, { error: 'TTS engine is not responding.' });
          else if (!res.writableEnded) res.end();
        }
        return true;
      }

      if (pathname === '/online-api/save-session' && req.method === 'POST') {
        const body = await readJsonBody(req, 7 * 1024 * 1024); // ≥6MB so the 5MB guard below can 413
        const filename = safeFilename(body?.filename);
        const json = typeof body?.json === 'string' ? body.json : '';
        const md = typeof body?.md === 'string' ? body.md : '';
        if (!json && !md) {
          sendJson(res, 400, { error: 'json or md content is required.' });
          return true;
        }
        if (Buffer.byteLength(json, 'utf8') + Buffer.byteLength(md, 'utf8') > SAVE_SESSION_MAX_BYTES) {
          sendJson(res, 413, { error: 'Session export is too large.' });
          return true;
        }
        try {
          await fs.mkdir(HISTORY_DIR, { recursive: true });
          if (json) await fs.writeFile(path.join(HISTORY_DIR, `${filename}.json`), json, 'utf8');
          if (md) await fs.writeFile(path.join(HISTORY_DIR, `${filename}.md`), md, 'utf8');
          sendJson(res, 200, { saved: true, filename });
        } catch (error) {
          logLine('save.fail', { message: String(error?.message ?? error).slice(0, 300) });
          sendJson(res, 500, { error: 'Failed to save session.' });
        }
        return true;
      }

      if (pathname === '/online-api/usage-report' && req.method === 'POST') {
        const body = await readJsonBody(req, 1 * 1024 * 1024);
        try {
          logLine('usage.report', { report: JSON.parse(JSON.stringify(body ?? {}).slice(0, 4_000) || '{}') });
        } catch {
          logLine('usage.report', { reportChars: JSON.stringify(body ?? {}).length });
        }
        sendJson(res, 200, { ok: true });
        return true;
      }

      // An /online-api/* path we don't serve over HTTP (e.g. /asr is WS-only).
      sendJson(res, 404, { error: 'Not found.' });
      return true;
    } catch (error) {
      // Body too large / invalid JSON / unexpected — never fall through to the SPA.
      if (!res.headersSent) sendJson(res, 400, { error: String(error?.message ?? 'Bad request.').slice(0, 200) });
      else if (!res.writableEnded) res.end();
      return true;
    }
  };
}
