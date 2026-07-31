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
import { getOnlineConfig, getConfigStatus, setOnlineConfig, ONLINE_KEY_SLUGS } from './online-config.mjs';
import { createHash } from 'node:crypto';

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

// TASK 12.4 — two ceilings on the proxied (qwen3 rollback) path.
// Audio frames are ~256 ms each (4096 PCM16 samples @16kHz). Cap the pre-open queue at ~5s of
// speech so a dead upstream cannot grow it without bound: 5000 / 256 ≈ 20 frames. And give the
// upstream 8s to open — if it never does, tell the operator instead of buffering forever.
const PENDING_FRAMES_MAX = 20; // ≈ 5s of audio (20 × 256 ms)
const UPSTREAM_CONNECT_TIMEOUT_MS = 8_000;
// TASK 12.6 — after the upstream opens, wait this long for the client's `session.terms` message
// before configuring the session without any terms (a URL-only rollback client never sends it).
const SESSION_TERMS_GRACE_MS = 250;

// TASK 12.4 — a bounded FIFO for the pre-open audio frames. At capacity it drops the OLDEST frame
// (in speech the newest audio is the useful one) and counts the drop. Exported so the cap can be
// tested without a live upstream socket.
export function createBoundedFrameQueue(max) {
  const frames = [];
  let dropped = 0;
  return {
    push(frame) {
      frames.push(frame);
      if (frames.length > max) { frames.shift(); dropped += 1; }
    },
    drain() { const out = frames.slice(); frames.length = 0; return out; },
    get size() { return frames.length; },
    get dropped() { return dropped; },
  };
}

const openaiApiKey = () => getOnlineConfig('OPENAI_API_KEY');
const REFINE_MODEL = env('OPENAI_PREVIEW_REFINE_MODEL', 'gpt-4.1');
const REFINE_TIMEOUT_MS = num('PREVIEW_REFINE_TIMEOUT_MS', 10_000);

// M14 "Tóm tắt bằng AI" — build the session brief from the event's imported documents. Same key and the
// same model as refine; only the ceilings and the timeout differ, because this call runs ONCE, BEFORE a
// session, with a whole event script as its input instead of one sentence during it. Nothing here is on
// the live path: the operator reads the result, edits it, and may throw it away.
const PREP_SUMMARY_TIMEOUT_MS = num('PREP_SUMMARY_TIMEOUT_MS', 60_000);
/** Ceilings on what one call may read. The gala script alone is larger than all of them together. */
const PREP_DOCS_MAX = 12;
const PREP_DOC_MAX_CHARS = 12_000;
const PREP_DOCS_MAX_CHARS = 48_000;
/** …and on what it may return: exactly the console's own two boxes. */
const PREP_BRIEF_MAX_CHARS = 1_500;
const PREP_TERMS_MAX = 40;

const elevenApiKey = () => getOnlineConfig('ELEVENLABS_API_KEY');
const jaVoiceId = () => getOnlineConfig('ELEVENLABS_VOICE_ID');
const viVoiceId = () => getOnlineConfig('VI_ELEVENLABS_VOICE_ID');
const ELEVENLABS_MODEL_ID = env('ELEVENLABS_MODEL_ID', 'eleven_flash_v2_5');
const ELEVENLABS_OUTPUT_FORMAT = env('ELEVENLABS_OUTPUT_FORMAT', 'mp3_22050_32');
const ELEVENLABS_TIMEOUT_MS = num('ELEVENLABS_TIMEOUT_MS', 15_000);
const TTS_VOICE_CATALOG_TTL_MS = num('TTS_VOICE_CATALOG_TTL_MS', 5 * 60 * 1000);

// TASK 11: direct-dial recogniser (Scribe v2 Realtime). All env()-driven so the event can be tuned
// without a redeploy. `ONLINE_ASR_PROVIDER=qwen3` restores the old proxy path (rollback, 11.6). The
// browser dials the vendor directly with a single-use token; NONE of these leaves the server except the
// finished, opaque `asrWsUrl` in the token response (11.9). Reuses ELEVENLABS_API_KEY (no new key).
const ONLINE_ASR_PROVIDER = env('ONLINE_ASR_PROVIDER', 'scribe');
const SCRIBE_MODEL_ID = env('SCRIBE_MODEL_ID', 'scribe_v2_realtime');
const SCRIBE_WS_BASE = env('SCRIBE_WS_BASE', 'wss://api.elevenlabs.io').replace(/\/+$/, '');
const SCRIBE_WS_PATH = env('SCRIBE_WS_PATH', '/v1/speech-to-text/realtime'); // env-tunable if the vendor path differs
const SCRIBE_TOKEN_URL = env('SCRIBE_TOKEN_URL', 'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe');
const SCRIBE_VAD_SILENCE_SECS = num('SCRIBE_VAD_SILENCE_SECS', 1.5);
const SCRIBE_VAD_THRESHOLD = num('SCRIBE_VAD_THRESHOLD', 0.4);
const SCRIBE_MIN_SPEECH_MS = num('SCRIBE_MIN_SPEECH_MS', 100);
const SCRIBE_MIN_SILENCE_MS = num('SCRIBE_MIN_SILENCE_MS', 100);
const SCRIBE_FILTER_BACKGROUND = env('SCRIBE_FILTER_BACKGROUND', ''); // empty = do not send (demo parity); fallback only — the console switch (11.13) outranks it
const SCRIBE_NO_VERBATIM = env('SCRIBE_NO_VERBATIM', ''); // empty = send nothing; 'true' → recogniser drops fillers/disfluencies
const SCRIBE_SEND_LANGUAGE_CODE = env('SCRIBE_SEND_LANGUAGE_CODE', 'false');
// Narrow auto-detect to the languages this event actually uses. A WHITELIST is not the pin that broke
// TASK 6: `language_code` names the primary and `secondary_languages` the others the session is allowed
// to hear, so a two-way microphone stays two-way while Chinese/Thai/Italian stop being possible answers.
// Comma-separated. Set empty to restore free auto-detect (instant rollback, no code change).
//
// Verified against a live session on 2026-07-30, both directions: the vendor echoes back
// `language_code: "ja", secondary_languages: ["vi"]` — it ACCEPTS the pair — and Vietnamese speech
// still returns as Vietnamese with Japanese as the primary, so a two-way microphone stays two-way.
// Without it the same handshake echoes `language_code: null`, which is how a Vietnamese sentence came
// back as Chinese and was translated and read to the hall.
const SCRIBE_LANGUAGE_WHITELIST = env('SCRIBE_LANGUAGE_WHITELIST', 'ja,vi');
const SCRIBE_SECONDARY_LANGUAGE_FORMAT = env('SCRIBE_SECONDARY_LANGUAGE_FORMAT', 'repeat');
const SCRIBE_TOKEN_TTL_MS = 15 * 60 * 1000;
const SCRIBE_KEYTERM_MAX_LEN = 20;
const SCRIBE_KEYTERM_MAX = 30;

// Which key slugs the CURRENT configuration actually needs (TASK 11.10): the direct path spends the TTS
// vendor's key, so the two proxied-ASR slugs are not required; the qwen3 rollback needs all six.
const ONLINE_REQUIRED_SLUGS = ONLINE_ASR_PROVIDER === 'qwen3'
  ? ONLINE_KEY_SLUGS.slice()
  : ONLINE_KEY_SLUGS.filter((s) => s !== 'asr_endpoint' && s !== 'asr_key');

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
    // TASK 11.12: source_corrected is no longer read — we tolerate it on the way in (an old-shaped model
    // answer can never reach the screen) but never surface it. Only the translation is taken.
    return {
      targetFinal: readTextField(parsed, ['target_final', 'targetFinal', 'translatedText']),
      ttsText: readTextField(parsed, ['tts_text', 'ttsText']),
      emotion: readTextField(parsed, ['emotion']),
      ttsSpeed: parsed.tts_speed ?? parsed.ttsSpeed,
      format: 'structured',
    };
  }
  const trimmed = content.trim();
  const rejected = looksStructured(trimmed);
  return { targetFinal: rejected ? '' : trimmed, ttsText: '', emotion: '', ttsSpeed: undefined, format: rejected ? 'rejected_structured' : 'plain_text' };
}

// ---------- refine prompt (mirror of the core's runtime policy) ----------
function targetLanguageTermPolicy(targetLanguage) {
  if (targetLanguage.startsWith('ja')) {
    return [
      'Target-language term policy:',
      '- Vietnamese source mentions of "Sếp", "Sip", "SIP", "CEO", "TGĐ", or "Tổng Giám đốc" that refer to the company president/general director all denote the same role.',
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

// M12 — the fragment block. The recogniser ends a turn on SILENCE, not on meaning, so a transcript can
// arrive as half a thought ("Chúng tôi rất vinh dự được đón tiếp"). Translated as if it were a whole
// sentence, Japanese closes it with a polite sentence ending and the audience is told something the
// speaker never finished saying — then the second half arrives and is read out as a second sentence.
// The client now waits for the rest of the thought where it can (livePipelinePolicy: the continuation
// window) and, when a ceiling forces the cut anyway, says so here. Only the honest options remain:
// translate exactly the clause that arrived, and leave it grammatically open.
function fragmentPolicy(targetLanguage) {
  return [
    'IMPORTANT — the source transcript below is an UNFINISHED FRAGMENT: the recogniser closed it on a pause, not at the end of the thought. The rest of the sentence is still being spoken and will arrive as the next subtitle.',
    '- Translate ONLY the words that are actually present. Never complete, round off, or guess the ending.',
    '- Keep target_final grammatically open, exactly as open as the source is: a clause stays a clause.',
    targetLanguage.startsWith('ja')
      ? '- In Japanese: do NOT close the fragment with です/ます/だ or a sentence-final particle, and do not add 。 at the end. Use the continuing form (て/で, が, ので, 連用形) that a speaker would use mid-sentence.'
      : '- In Vietnamese: do not add a closing particle or a full stop, and do not add a subject, verb, or object that the fragment does not contain.',
    '- Use the recent subtitles above only to keep terminology and register consistent — never to fill in the missing half.',
  ].join('\n');
}

// The other half of the same problem. The recogniser closes a turn after ~1.5 s of silence, so when a
// speaker pauses mid-sentence to think, the second half arrives seconds later — far too late for the
// client to glue it back on. It can only say WHERE it belongs. Told that, the model translates this text
// as the continuation of a half the audience has already read, instead of restarting the sentence and
// repeating what was just said.
function continuationPolicy(previousFragment) {
  return [
    'IMPORTANT — the subtitle immediately before this one was cut off mid-thought, and the transcript below is its CONTINUATION (the speaker paused, then carried on).',
    `First half, already translated and shown to the audience:\n${previousFragment}`,
    '- Translate the transcript below as the continuation of that half: read one after the other, the two subtitles must form one natural sentence.',
    '- Do NOT repeat, re-translate, or summarise the first half — it is already on screen and has already been spoken aloud.',
    '- Do not restart the sentence: begin exactly where the first half stopped, and keep its grammatical thread (subject, tense, register).',
    '- Use the first half only to continue it correctly. It is not evidence for any content that is missing from the transcript below.',
  ].join('\n');
}

export function buildRefinePrompt({ sourceText, previewText, sourceLanguage, targetLanguage, sourceEmotion, sourcePace, recentFinals, sessionBrief, sessionTerms, sourceIsFragment, previousFragment }) {
  return [
    'Refine a realtime translated subtitle for a live company event. Use the source transcript, preview translation, recent context, and provided terms to produce one accurate final subtitle in the target language. Preserve names, numbers, times, acronyms, tone, and meaning. Return only valid JSON.',
    [
      'Runtime refine policy (faithful-edit mode):',
      '- target_final must faithfully convey the FULL meaning of the source transcript: nothing omitted, nothing added, nothing distorted. Fidelity to the source outranks stylistic elegance.',
      '- Compare the preview against the source transcript. When the preview omits details (numbers, clauses, qualifiers, named items), adds content, or shifts the meaning, correct target_final to match the source closely. Prefer wording that stays near the source structure while remaining natural in the target language.',
      '- When the preview already conveys the source meaning accurately, keep its wording unchanged. Never paraphrase or restyle for taste alone.',
      '- Always apply these edits:',
      '  1. Correct proper nouns and terms using the provided term lists, with evidence from the source transcript.',
      '  2. In target_final, ALWAYS render non-Japanese person and organization names in katakana so Japanese readers and TTS can pronounce them. Use the katakana reading from the term list when provided.',
      '  3. When the target language is Japanese, enforce a formal-ceremony register: polite/humble/honorific endings (desu/masu, -te orimasu, o-/go- forms, sonkeigo for executives and guests). Change register and endings only, never content words.',
      '- If the source transcript is missing or empty, keep the preview wording and apply only edits 1-3.',
      '- If the preview translation is missing or empty, translate the source transcript directly and faithfully, applying edits 1-3.',
      '- If uncertain about a name, keep the lower-risk surface form instead of inventing one.',
      '- The source transcript below is READ-ONLY evidence: never rewrite it, clean it up, or return it. Do not output the transcript or any corrected version of it — only the target_final translation. The recogniser already knows the event names.',
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
    previousFragment ? continuationPolicy(previousFragment) : '',
    sourceIsFragment ? fragmentPolicy(targetLanguage) : '',
    `Source transcript:\n${sourceText || '(not available)'}`,
    `Realtime preview translation:\n${previewText || '(not available)'}`,
    sourceEmotion ? `Source speaker emotion (detected from audio): ${sourceEmotion}` : '',
    sourcePace
      ? `Measured source speaking pace (from transcript + mic timing): ${sourcePace.label}; ${sourcePace.unitsPerSecond.toFixed(2)} speech units/second over ${sourcePace.durationMs} ms; confidence ${sourcePace.confidence.toFixed(2)}.`
      : 'Measured source speaking pace: unavailable; use tts_speed 1.00.',
    'Return JSON only with keys: target_final, tts_text, emotion, tts_speed. tts_text must be "" in the untagged case described above.',
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
                  target_final: { type: 'string' },
                  tts_text: { type: 'string' },
                  emotion: { type: 'string', enum: ['neutral', 'excited', 'serious', 'somber'] },
                  tts_speed: { type: 'number', minimum: 0.85, maximum: 1.2 },
                },
                required: ['target_final', 'tts_text', 'emotion', 'tts_speed'],
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
    // TASK 11.12: the transcript is read-only. `sourceText` is now a VERBATIM echo of what was sent — no
    // model ever rewrites what was heard; the recogniser's keyterms handle proper nouns instead.
    const ttsAnnotated = normalizeText(parsed.ttsText);
    return {
      sourceText: normalizeText(params.sourceText),
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

// ---------- prep brief from the imported documents (M14) ----------
//
// The Bối cảnh box is the one piece of context the refine model holds for the WHOLE event, and until now
// the app filled it mechanically: the conference header, the speaker list, then the opening paragraph of
// each imported file, cut at 1500 characters. For a 40-page gala script the opening paragraph is the
// cover page, so the box described the title and nothing that is actually said on stage.
//
// This reads the documents properly and writes the brief a human would have written. It is deliberately
// OFF the live path (see PREP_SUMMARY_TIMEOUT_MS above) and its output is a SUGGESTION: the console puts
// it in an editable box and the operator approves it before the session starts.

/** Trim the document set to the ceilings, longest-first-fair: every file gets an equal share. */
export function clipPrepDocuments(list, { maxDocs = PREP_DOCS_MAX, perDoc = PREP_DOC_MAX_CHARS, total = PREP_DOCS_MAX_CHARS } = {}) {
  const docs = (Array.isArray(list) ? list : [])
    .map((d) => ({ name: limitText(d?.name, 120) || '(không tên)', text: normalizeText(d?.text) }))
    .filter((d) => d.text.length > 0)
    .slice(0, maxDocs);
  if (!docs.length) return { docs: [], usedChars: 0 };
  // An equal share, so one 200-page file cannot swallow the budget of the four that matter. A file
  // shorter than its share leaves the remainder to the others (recomputed as we go).
  const out = [];
  let left = total;
  let remaining = docs.length;
  for (const d of docs) {
    const share = Math.min(perDoc, Math.floor(left / remaining));
    const text = d.text.slice(0, share);
    remaining -= 1;
    if (!text) continue;
    out.push({ name: d.name, text });
    left -= text.length;
  }
  return { docs: out, usedChars: out.reduce((n, d) => n + d.text.length, 0) };
}

export function buildPrepBriefPrompt({ sourceLanguage, targetLanguage, header, docs }) {
  const srcName = sourceLanguage === 'ja' ? 'Japanese' : 'Vietnamese';
  const tgtName = targetLanguage === 'ja' ? 'Japanese' : 'Vietnamese';
  return [
    'You prepare the CONTEXT BRIEF for a live conference interpreter system.',
    [
      'Read the event documents below and write the brief that the translation model will hold in context',
      'for the entire event. Rules:',
      `- Write the brief in Vietnamese, at most ${PREP_BRIEF_MAX_CHARS} characters. This is a hard budget: when short of room, drop the least useful lines, never truncate mid-sentence.`,
      '- One fact per line. No markdown, no headings, no numbering; a list item starts with "- ".',
      '- Cover, in this order and ONLY where the documents support it: what the event is (name, host, date, place, purpose); the running order of the programme; who speaks and in what capacity; the recurring proper nouns and set phrases.',
      '- Keep every proper noun EXACTLY as the documents spell it. Where a document gives both a Vietnamese and a Japanese form of the same name, keep both, e.g. "Kagami Biraki (鏡開き)".',
      '- Never state a fact the documents do not contain, and never guess a date, a title or a name. Thin documents must produce a short brief.',
      '- This is a brief, not a translation and not a sentence-by-sentence summary. Skip stage directions, cue numbers, lighting and sound notes.',
    ].join('\n'),
    [
      `Also return terms: at most ${PREP_TERMS_MAX} lines naming what the recogniser and the translator must not mangle.`,
      `- The session runs ${srcName} → ${tgtName}. The left-hand side must be the ${srcName} form — that is what the speaker will actually say.`,
      `- Write "source = target" when the documents give the ${tgtName} form of the same name; otherwise write the source form alone.`,
      '- Only proper nouns and fixed expressions: people, companies, places, ceremonies, awards, song titles, programme segments, job titles, product names.',
      '- No ordinary vocabulary, no full sentences, no duplicates. One term per line, no bullet marks.',
    ].join('\n'),
    header ? `What the operator already knows about this session:\n${header}` : '',
    docs.map((d) => `--- Document: ${d.name} ---\n${d.text}`).join('\n\n'),
    'Return JSON only with keys: brief, terms.',
  ].filter(Boolean).join('\n\n');
}

async function summarizePrepDocsWithLlm(params) {
  const apiKey = openaiApiKey();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');
  const response = await withTimeout(
    fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: REFINE_MODEL,
        input: buildPrepBriefPrompt(params),
        max_output_tokens: 4_000,
        temperature: 0.2,
        text: {
          format: {
            type: 'json_schema',
            name: 'prep_brief_result',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                brief: { type: 'string' },
                terms: { type: 'array', items: { type: 'string' } },
              },
              required: ['brief', 'terms'],
              additionalProperties: false,
            },
          },
        },
      }),
    }),
    PREP_SUMMARY_TIMEOUT_MS,
    'prep brief',
  );
  const raw = await response.text();
  if (!response.ok) throw new Error(`Prep brief failed: ${response.status} ${raw.slice(0, 300)}`);
  const text = extractResponseText(JSON.parse(raw));
  let parsed = {};
  try { parsed = JSON.parse(text); } catch { throw new Error('Prep brief returned malformed JSON.'); }
  // Enforce the ceilings on the way out too — a schema constrains the SHAPE, never the length.
  const brief = limitText(parsed?.brief, PREP_BRIEF_MAX_CHARS);
  const seen = new Set();
  const terms = [];
  for (const line of Array.isArray(parsed?.terms) ? parsed.terms : []) {
    const term = limitText(line, 160).replace(/^[-•*\s]+/, '');
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
    if (terms.length >= PREP_TERMS_MAX) break;
  }
  return { brief, terms };
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

// ---------- TTS voice catalog (TASK 5) : opaque slugs only, cached in-process ----------
// The provider's real voice id must NEVER reach the browser (CLAUDE.md rule 6). The client sees an
// opaque, stable slug; the server keeps a slug→realId map to resolve a chosen voice at TTS time.
const slugOfVoice = (voiceId) => 'v_' + createHash('sha256').update(String(voiceId)).digest('hex').slice(0, 12);
let voiceCatalog = { at: 0, list: [] };
const slugToVoiceId = new Map();

const voiceLangLabel = (v) => {
  const l = (v && typeof v.labels === 'object' && v.labels) || {};
  return String(l.language || l.accent || (v && v.fine_tuning && v.fine_tuning.language) || '').toLowerCase();
};
const voiceLangMatches = (labelStr, requested) => {
  if (!labelStr) return true; // no label → multilingual → keep (else the list would come back empty)
  if (requested === 'ja') return /ja|japan|日本/.test(labelStr);
  if (requested === 'vi') return /vi|viet|việt/.test(labelStr);
  return true;
};
// "my voices" (cloned / professional / generated / personal) sort first.
const voiceCategoryOf = (v) => (/clone|professional|generated|personal/.test(String((v && v.category) || '').toLowerCase()) ? 'personal' : 'standard');
const pickVoiceLabels = (labels) => {
  const l = labels && typeof labels === 'object' ? labels : {};
  const out = {};
  for (const k of ['accent', 'gender', 'age', 'use_case', 'description', 'descriptive']) {
    if (typeof l[k] === 'string' && l[k]) out[k] = l[k];
  }
  return out;
};

// Fetch (and cache, 5 min, ≤200) the account's voice list. Throws {code:503} with no key, {code:502}
// when the provider does not answer — both non-fatal for the UI.
async function fetchVoiceCatalog() {
  const now = Date.now();
  if (voiceCatalog.list.length && now - voiceCatalog.at < TTS_VOICE_CATALOG_TTL_MS) return voiceCatalog.list;
  const key = elevenApiKey();
  if (!key) { const e = new Error('TTS key not configured'); e.code = 503; throw e; }
  let resp;
  try {
    resp = await withTimeout(fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } }), ELEVENLABS_TIMEOUT_MS, 'Voice catalog');
  } catch { const e = new Error('Voice catalog request failed'); e.code = 502; throw e; }
  if (!resp.ok) { const e = new Error(`Voice catalog HTTP ${resp.status}`); e.code = 502; throw e; }
  const data = await resp.json().catch(() => ({}));
  const raw = Array.isArray(data && data.voices) ? data.voices.slice(0, 200) : [];
  voiceCatalog = { at: now, list: raw };
  slugToVoiceId.clear();
  for (const v of raw) { const id = String((v && v.voice_id) || ''); if (id) slugToVoiceId.set(slugOfVoice(id), id); }
  return raw;
}

// ---------- TASK 11: direct-dial ASR (Scribe v2 Realtime) ----------
// Mint a single-use token; the browser dials the vendor with it. On a non-OK response throw with the
// HTTP STATUS ONLY (the error body can carry account info). Never log the token, never return it as its
// own field, never store it.
async function mintScribeToken() {
  const key = elevenApiKey();
  if (!key) { const e = new Error('ASR key not configured'); e.code = 503; throw e; }
  const resp = await withTimeout(
    fetch(SCRIBE_TOKEN_URL, { method: 'POST', headers: { 'xi-api-key': key } }),
    ELEVENLABS_TIMEOUT_MS,
    'ASR token',
  );
  if (!resp.ok) { const e = new Error(`ASR token HTTP ${resp.status}`); e.code = resp.status; throw e; }
  const data = await resp.json().catch(() => ({}));
  const token = typeof data?.token === 'string' ? data.token
    : typeof data?.single_use_token === 'string' ? data.single_use_token : '';
  if (!token) { const e = new Error('ASR token missing from response'); e.code = 502; throw e; }
  return token;
}

// Split session terms into keyterms; drop any over 20 chars — a single over-long keyterm makes the
// recogniser reject the ENTIRE session (observed 14/07 with "Chương trình Vinh danh"). Cap at 30. A
// dropped term still reaches the refine stage, so no meaning is lost.
//
// A glossary line has the shape `nguồn = đích`, and "Lê Long Sơn = レ・ロン・ソン" is 25 characters — so the
// whole line was dropped, and proper nouns, the one thing the recogniser most needs help with, were
// exactly what never reached it. Split on `=` and take both sides; each is a real spoken form in its own
// language. Interleaved per line (source, target, source, target…), NOT all-sources-then-all-targets:
// the operator ranks the glossary, so the top lines must keep both forms before the 30-term cap bites.
export function pickScribeKeyterms(corpus) {
  const lines = String(corpus || '').split(/[,\n;·]/).map((t) => t.trim()).filter(Boolean);
  const all = [];
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq < 0) { all.push(line); continue; }
    for (const side of [line.slice(0, eq), line.slice(eq + 1)]) {
      const s = side.trim();
      if (s) all.push(s);
    }
  }
  const kept = [];
  const seen = new Set();
  let dropped = 0;
  for (const t of all) {
    if (seen.has(t)) continue;            // the same name on two lines is one keyterm, not two
    if (t.length > SCRIBE_KEYTERM_MAX_LEN || kept.length >= SCRIBE_KEYTERM_MAX) { dropped += 1; continue; }
    seen.add(t);
    kept.push(t);
  }
  return { kept, dropped };
}

/**
 * Which languages this session is allowed to hear.
 *
 * Three cases, in order:
 *  1. a whitelist is configured → the session's own language leads (or the first entry, for a two-way
 *     session that has none) and the rest ride as secondaries. Auto-detect still happens — it just
 *     cannot wander outside the list.
 *  2. no whitelist, SCRIBE_SEND_LANGUAGE_CODE=true, one-way session → the old hard pin.
 *  3. otherwise → nothing at all: free auto-detect, exactly as before.
 *
 * Secondaries are never sent without a primary: the vendor leaves that undefined, and half-applying a
 * language restriction is worse than not restricting, because it looks applied.
 */
function applyLanguageRestriction(p, language) {
  const whitelist = SCRIBE_LANGUAGE_WHITELIST.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
  const sessionLang = language && language !== 'auto' ? language : '';
  if (whitelist.length) {
    const primary = sessionLang && whitelist.includes(sessionLang) ? sessionLang : whitelist[0];
    p.set('language_code', primary);
    const secondary = whitelist.filter((c) => c !== primary);
    if (secondary.length) {
      if (SCRIBE_SECONDARY_LANGUAGE_FORMAT === 'csv') p.set('secondary_languages', secondary.join(','));
      else for (const code of secondary) p.append('secondary_languages', code);
    }
    return;
  }
  // Do NOT send language_code unless explicitly enabled: pinning a language alone is exactly what breaks TASK 6.
  if (SCRIBE_SEND_LANGUAGE_CODE === 'true' && sessionLang) p.set('language_code', sessionLang);
}

// Build the handshake query. `roomFilter` is THREE-STATE (TASK 11.13): true → set the parameter; false →
// set nothing (vendor default is off; keeps demo byte-parity AND beats a server env that says on);
// undefined → fall back to SCRIBE_FILTER_BACKGROUND. Returns the params + the value that ACTUALLY ended
// up in the handshake, so the token response can report the applied value (never the requested one).
export function buildScribeWsParams({ token, language, keyterms, roomFilter }) {
  const p = new URLSearchParams();
  p.set('model_id', SCRIBE_MODEL_ID);
  p.set('token', token);
  p.set('commit_strategy', 'vad');
  p.set('vad_silence_threshold_secs', String(SCRIBE_VAD_SILENCE_SECS));
  p.set('vad_threshold', String(SCRIBE_VAD_THRESHOLD));
  p.set('min_speech_duration_ms', String(SCRIBE_MIN_SPEECH_MS));
  p.set('min_silence_duration_ms', String(SCRIBE_MIN_SILENCE_MS));
  p.set('include_timestamps', 'true');
  p.set('include_language_detection', 'true');
  for (const kt of keyterms) p.append('keyterms', kt);
  if (SCRIBE_NO_VERBATIM) p.set('no_verbatim', SCRIBE_NO_VERBATIM); // unset knob adds no parameter at all
  let filterApplied;
  if (roomFilter === true) filterApplied = true;
  else if (roomFilter === false) filterApplied = false; // explicit OFF beats the env
  else filterApplied = SCRIBE_FILTER_BACKGROUND === 'true' || SCRIBE_FILTER_BACKGROUND === '1';
  if (filterApplied) p.set('filter_background_audio', 'true');
  applyLanguageRestriction(p, language);
  // Do NOT send audio_format (pcm_16000 is the default — fewer params, closer to the demo).
  return { params: p, filterApplied };
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
    // Claim our own path; upgrade the socket.
    if (url.pathname === '/online-api/asr') {
      if (!authed(request)) {
        socket.destroy();
        return;
      }
      asrWss.handleUpgrade(request, socket, head, (ws) => {
        asrWss.emit('connection', ws, request);
      });
      return;
    }
    // TASK 12.1 — an upgrade knocking on a path we do not own. The old code simply `return`ed,
    // leaving the client's socket connected to nothing and holding a file descriptor until the
    // process restarted (a scanner, a stale tab, a mistyped URL each leak one). Close it — but only
    // when OURS is the only upgrade listener attached: the polite `return` was written to leave room
    // for a second listener, so if someone later mounts one, keep returning and let them answer.
    if (server.listenerCount('upgrade') === 1) {
      try { socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); } catch { /* socket already gone */ }
      socket.destroy();
    }
  });

  asrWss.on('connection', (client, request) => {
    const url = new URL(request.url || '/online-api/asr', 'http://localhost');
    // TASK 6.2: 'auto' (two-way) passes through so the language field is omitted below → the model
    // detects each utterance's language. Anything else normalises to vi/ja as before.
    const rawLang = (url.searchParams.get('language') || '').toLowerCase();
    const language = rawLang === 'auto' ? 'auto' : normalizeLanguage(rawLang, 'vi');
    // TASK 12.6: session terms may arrive in the URL (query param kept for one release so the 11.6
    // rollback works with any client) OR as a first `{type:'session.terms'}` WS message. Either way
    // they land in `terms` before the upstream session.update goes out.
    let terms = limitText(url.searchParams.get('corpus') || url.searchParams.get('hotwords'), 2_000);
    let termsKnown = terms !== '';

    const wsBase = asrWsBase();
    const apiKey = asrApiKey();
    if (!wsBase || !apiKey) {
      client.send(JSON.stringify({ type: 'error', error: { message: 'Realtime ASR is not configured.' } }));
      client.close(1011, 'ASR not configured');
      return;
    }

    logLine('asr.session', { language });
    const upstream = new WebSocket(
      `${wsBase}/api-ws/v1/realtime?model=${encodeURIComponent(ASR_MODEL)}`,
      { headers: { Authorization: `Bearer ${apiKey}`, 'OpenAI-Beta': 'realtime=v1' } },
    );
    let upstreamReady = false;
    let sessionSent = false;
    let graceTimer = null;
    const pending = createBoundedFrameQueue(PENDING_FRAMES_MAX); // TASK 12.4 — bounded pre-open queue

    // TASK 12.4 — the old code had no connect timeout: a dead upstream hung forever while the queue
    // grew and nothing told the operator. Give it 8s; on expiry send an actionable error and close
    // both sockets, logging how many frames were dropped so a bad uplink is diagnosable afterwards.
    let connectTimer = setTimeout(() => {
      connectTimer = null;
      logLine('asr.upstream_connect_timeout', { droppedFrames: pending.dropped, queued: pending.size });
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'error', error: { message: 'ASR upstream did not connect (check the recogniser endpoint/key).' } }));
      }
      try { upstream.terminate(); } catch { /* already gone */ }
      try { client.close(1011, 'ASR upstream connect timeout'); } catch { /* already gone */ }
    }, UPSTREAM_CONNECT_TIMEOUT_MS);

    const clearTimers = () => {
      if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
      if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; }
    };

    // Send the one-time session.update (with whatever terms are known) and flush the queue. No-op
    // until the upstream is actually OPEN, so it can be called from either the open or the terms path.
    function configureUpstream() {
      if (sessionSent || upstream.readyState !== WebSocket.OPEN) return;
      sessionSent = true;
      if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; }
      upstream.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text'],
          input_audio_format: 'pcm',
          sample_rate: 16000,
          input_audio_transcription: {
            ...(language === 'auto' ? {} : { language }),
            ...(terms ? { corpus: { text: terms } } : {}),
          },
          turn_detection: {
            type: 'server_vad',
            threshold: ASR_VAD_THRESHOLD,
            silence_duration_ms: ASR_VAD_SILENCE_MS,
          },
        },
      }));
      upstreamReady = true;
      for (const frame of pending.drain()) upstream.send(frame);
    }

    upstream.on('open', () => {
      if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
      // Terms already known (URL param or an early session.terms) → configure now. Otherwise wait a
      // short grace for the client's session.terms before configuring without any (12.6).
      if (termsKnown) configureUpstream();
      else graceTimer = setTimeout(configureUpstream, SESSION_TERMS_GRACE_MS);
    });

    // Upstream already emits the contract's event shapes — pass through verbatim.
    upstream.on('message', (data) => {
      const text = typeof data === 'string' ? data : data.toString();
      if (client.readyState === WebSocket.OPEN) client.send(text);
    });

    upstream.on('error', (error) => {
      logLine('asr.upstream_error', { message: String(error?.message ?? 'upstream error').slice(0, 300) });
      // Defense-in-depth (reviewer B1): don't rely on a guaranteed 'close' following 'error' to free the
      // timers and the client socket. Clear both timers here and close the client so a `ws` build that
      // ever emits 'error' without a trailing 'close' cannot leak the connect timer or a half-open socket.
      clearTimers();
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'error', error: { message: 'ASR upstream connection failed.' } }));
        client.close(1011, 'ASR upstream error');
      }
    });

    upstream.on('close', () => {
      clearTimers();
      if (client.readyState === WebSocket.OPEN) client.close(1011, 'ASR upstream closed');
    });

    client.on('message', (raw, isBinary) => {
      if (!isBinary) {
        // TASK 12.6 — the only control frame we accept is session.terms; anything else is ignored.
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { return; }
        if (msg && msg.type === 'session.terms') {
          termsKnown = true;
          const t = limitText(msg.corpus, 2_000);
          if (t) terms = t;
          configureUpstream(); // no-op until upstream is open; then it flushes with the terms applied
        }
        return;
      }
      const audio = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      if (audio.length === 0 || audio.length > 1024 * 1024) return;
      const frame = JSON.stringify({ type: 'input_audio_buffer.append', audio: audio.toString('base64') });
      if (upstreamReady && upstream.readyState === WebSocket.OPEN) upstream.send(frame);
      else pending.push(frame); // bounded — drops the oldest when full (12.4)
    });

    client.on('close', () => {
      clearTimers();
      if (pending.dropped > 0) logLine('asr.frames_dropped', { droppedFrames: pending.dropped });
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
        sendJson(res, 200, getConfigStatus(ONLINE_REQUIRED_SLUGS));
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
        sendJson(res, 200, getConfigStatus(ONLINE_REQUIRED_SLUGS));
        return true;
      }

      if (pathname === '/online-api/realtime-preview-token' && req.method === 'POST') {
        const body = await readJsonBody(req, 64 * 1024);
        const language = typeof body?.language === 'string' && body.language.toLowerCase() === 'auto' ? 'auto' : normalizeLanguage(body?.language, 'vi');
        const corpus = limitText(body?.corpus, 2_000);
        // Accept roomFilter ONLY if it is a real boolean (11.13); anything else stays undefined so the
        // fallback path runs.
        const roomFilter = typeof body?.roomFilter === 'boolean' ? body.roomFilter : undefined;

        if (ONLINE_ASR_PROVIDER === 'qwen3') {
          // Rollback path (11.6): the old proxied response + asrTransport:'proxy' so the client chooses
          // its path from one field and never from a vendor name.
          if (!asrWsBase() || !asrApiKey()) {
            sendJson(res, 500, { error: 'Realtime ASR is not configured.' });
            return true;
          }
          sendJson(res, 200, {
            mode: 'transcribe', asrProvider: 'qwen3', asrTransport: 'proxy', asrModel: ASR_MODEL,
            asrSourceCorrectionEnabled: false, asrCorrectionTermCount: 0, asrWsPath: '/online-api/asr',
          });
          return true;
        }

        // Direct-dial path: mint a single-use token + assemble ONE complete, opaque wss URL.
        try {
          const token = await mintScribeToken();
          const { kept, dropped } = pickScribeKeyterms(corpus);
          const { params, filterApplied } = buildScribeWsParams({ token, language, keyterms: kept, roomFilter });
          const asrWsUrl = `${SCRIBE_WS_BASE}${SCRIBE_WS_PATH}?${params.toString()}`;
          logLine('asr.session', { asrKeytermCount: kept.length, asrKeytermsDropped: dropped, asrRoomFilter: filterApplied }); // counts only — no term text, no URL, no token
          sendJson(res, 200, {
            mode: 'transcribe',
            asrProvider: 'scribe',
            asrTransport: 'direct',
            asrModel: SCRIBE_MODEL_ID,
            asrCommitMode: 'vad',
            asrTokenTtlMs: SCRIBE_TOKEN_TTL_MS,
            asrKeytermCount: kept.length,
            asrKeytermsDropped: dropped,
            asrSourceCorrectionEnabled: false, // 11.12 — the model no longer rewrites the source transcript
            asrCorrectionTermCount: 0,
            asrRoomFilter: filterApplied,
            asrWsUrl,
          });
        } catch (error) {
          logLine('asr.token.fail', { status: error?.code ?? 0 });
          sendJson(res, 503, { error: 'Realtime ASR is not available.' });
        }
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
        // M12: only an explicit true counts — an older client that never sends the field keeps exactly the
        // whole-sentence behaviour it was written against.
        const sourceIsFragment = body?.sourceIsFragment === true;
        const previousFragment = limitText(body?.previousFragment, MAX_TEXT_CHARS);
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
            sourceIsFragment,
            previousFragment,
          });
          const { outputFormat, ...payload } = result;
          logLine('refine.ok', { outputFormat, sourceLength: payload.sourceText.length, translatedLength: payload.translatedText.length, ttsSpeed: payload.ttsSpeed, fragment: sourceIsFragment, continues: Boolean(previousFragment), traceId: traceId || null });
          sendJson(res, 200, { ...payload, traceId: traceId || undefined });
        } catch (error) {
          logLine('refine.fail', { message: String(error?.message ?? error).slice(0, 300) });
          sendJson(res, 502, { error: 'Preview refine failed.' });
        }
        return true;
      }

      // M14 — one pre-session call: the event's documents in, the Bối cảnh + suggested terms out.
      // 4 MB body: the documents are the payload here, unlike every other route in this file.
      if (pathname === '/online-api/summarize-prep-docs' && req.method === 'POST') {
        const body = await readJsonBody(req, 4 * 1024 * 1024);
        const sourceLanguage = normalizeLanguage(body?.sourceLanguage, 'vi');
        const targetLanguage = normalizeLanguage(body?.targetLanguage, 'ja');
        const { docs, usedChars } = clipPrepDocuments(body?.documents);
        if (!docs.length) {
          sendJson(res, 400, { error: 'documents is required.' });
          return true;
        }
        try {
          const result = await summarizePrepDocsWithLlm({
            sourceLanguage,
            targetLanguage,
            header: limitText(body?.header, SESSION_BRIEF_MAX_CHARS),
            docs,
          });
          logLine('prep.brief.ok', { documents: docs.length, usedChars, briefLength: result.brief.length, terms: result.terms.length });
          sendJson(res, 200, { ...result, documents: docs.length, usedChars });
        } catch (error) {
          logLine('prep.brief.fail', { message: String(error?.message ?? error).slice(0, 300) });
          sendJson(res, 502, { error: 'Prep brief failed.' });
        }
        return true;
      }

      if (pathname === '/online-api/voices' && req.method === 'GET') {
        const language = normalizeLanguage(url.searchParams.get('language'), 'ja');
        try {
          const raw = await fetchVoiceCatalog();
          const configured = language === 'vi' ? viVoiceId() : jaVoiceId();
          // Build each entry field by field — NEVER spread the provider object, or a future API version
          // leaks a new field (e.g. the real voice id) into the client bundle (CLAUDE.md rule 6).
          const voices = raw
            .filter((v) => voiceLangMatches(voiceLangLabel(v), language))
            .map((v) => ({
              slug: slugOfVoice(String((v && v.voice_id) || '')),
              name: String((v && v.name) || ''),
              language,
              category: voiceCategoryOf(v),
              labels: pickVoiceLabels(v && v.labels),
            }))
            .sort((a, b) => (a.category === b.category ? a.name.localeCompare(b.name) : a.category === 'personal' ? -1 : 1));
          sendJson(res, 200, { voices, current: configured ? slugOfVoice(configured) : '', cachedAt: voiceCatalog.at });
        } catch (error) {
          const code = error && error.code === 503 ? 503 : 502;
          sendJson(res, code, { error: code === 503 ? 'TTS voice service is not configured.' : 'Voice catalog is not responding.' });
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
          let voiceId = language === 'vi' ? viVoiceId() : jaVoiceId();
          // Optional voice override arrives as an opaque slug; resolve it via the cached catalog. An
          // unknown / unresolvable slug silently falls back to the configured voice — picking a voice is
          // a convenience and must never be able to fail the audio path mid-ceremony.
          const voiceSlug = typeof body?.voice === 'string' ? body.voice.trim() : '';
          if (voiceSlug) {
            let resolved = slugToVoiceId.get(voiceSlug);
            if (!resolved && slugToVoiceId.size === 0) {
              try { await fetchVoiceCatalog(); } catch { /* keep the configured voice */ }
              resolved = slugToVoiceId.get(voiceSlug);
            }
            if (resolved) voiceId = resolved;
          }
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
