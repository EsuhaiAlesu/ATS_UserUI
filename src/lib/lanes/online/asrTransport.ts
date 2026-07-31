// asrTransport.ts — the ONLINE lane's direct-dial ASR wire adapter (TASK 11.2).
//
// This is the ONLY client file that knows the direct socket's wire format. Everything
// downstream keeps speaking the lane's existing event vocabulary because `decode()` maps
// the vendor's message names onto it here, in one place.
//
// Rule 6 (CLAUDE.md) holds: there is intentionally NO vendor env name, model id, API host
// or key value in this file. The host is never a literal here — it arrives at runtime,
// already assembled with its token and every parameter, inside the opaque `asrWsUrl` field
// of the token response, and this adapter simply opens whatever address it is handed.

const ONLINE_BASE = '/online-api';

export type AsrTransport = 'direct' | 'proxy';

export interface AsrSession {
  transport: AsrTransport;
  url: string;
  commitMode: 'vad';
}

// The lane's EXISTING event vocabulary — the shapes `onlineLane` already handles. `decode()`
// translates the vendor's names into exactly these so nothing downstream has to change.
export type DecodedEvent =
  // `asrLanguages` is the handshake ECHO: the languages the recogniser confirms it will listen for.
  // Absent means it accepted no restriction and is free to hear anything — including the Chinese and
  // Italian it produced from Vietnamese speech at the ceremony. Reporting the accepted value (never the
  // requested one) is the only way to tell "we asked" from "it agreed".
  | { type: 'session.created'; asrLanguages?: string[]; languageDetection?: boolean }
  | { type: 'conversation.item.input_audio_transcription.text'; text: ''; stash: string; detectedLanguage?: string }
  | { type: 'conversation.item.input_audio_transcription.completed'; transcript: string; detectedLanguage?: string }
  | { type: 'asr.commit_throttled' }
  | { type: 'error'; error: { message: string } };

export interface AsrCodec {
  encodeAudio(pcm: ArrayBuffer): string; // JSON string frame
  encodeCommit(): string; // JSON string frame
  decode(raw: string): { event: DecodedEvent; fatal: boolean } | null;
}

// Reconnecting cannot fix any of these, so the lane must stop and tell the operator rather
// than loop the reconnect ladder.
const FATAL_TOKENS = ['auth_error', 'quota_exceeded', 'unaccepted_terms'];

// A committed sentence arrives twice (plain + timestamped) with identical text; swallow the
// twin only if it repeats within this window. Beyond it, a genuine repeat ("Vâng." twice)
// must still get through.
const FINAL_DEDUP_MS = 2000;

/**
 * Ask the server for one ASR session. POSTs the token endpoint and chooses the path from a
 * single response field, never from a vendor name.
 *  - `mode` must be 'transcribe'; anything else is a server misconfiguration.
 *  - a 'direct' response hands back the ready-made opaque `asrWsUrl`.
 *  - a 'proxy' response means the legacy Node-proxied socket; compose its URL exactly as today.
 */
export async function fetchAsrSession(opts: {
  targetLanguage: 'vi' | 'ja';
  language: string;
  corpus: string;
  roomFilter?: boolean;
}): Promise<AsrSession> {
  const res = await fetch(`${ONLINE_BASE}/realtime-preview-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // `roomFilter: undefined` drops out of JSON.stringify by itself — that is the "absent"
    // case the server falls back to its env for.
    body: JSON.stringify({
      targetLanguage: opts.targetLanguage,
      language: opts.language,
      corpus: opts.corpus,
      roomFilter: opts.roomFilter,
    }),
  });
  if (!res.ok) throw new Error(`token request failed (HTTP ${res.status})`);
  const data = (await res.json()) as { mode?: string; asrTransport?: string; asrWsUrl?: string };

  // Contract: the only supported mode is 'transcribe'. Anything else ⇒ WebRTC misconfig.
  if (data.mode !== 'transcribe') {
    throw new Error('server is in WebRTC mode, fix server config');
  }

  if (data.asrTransport === 'proxy') {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    // TASK 12.6: the corpus no longer rides the URL — the lane sends it as the first `session.terms`
    // WS message once the socket opens. The server still accepts `?corpus=` for one release (rollback).
    const url = `${proto}//${location.host}${ONLINE_BASE}/asr?language=${encodeURIComponent(opts.language)}`;
    return { transport: 'proxy', url, commitMode: 'vad' };
  }

  // Direct dial: the opaque address is already complete (token + every parameter attached).
  return { transport: 'direct', url: String(data.asrWsUrl ?? ''), commitMode: 'vad' };
}

/**
 * The wire codec for the DIRECT socket.
 * @param previousText the last finalised sentence — sent on the FIRST chunk ONLY, and only
 *   when reconnecting so the recogniser picks the thread back up. Fresh sessions pass
 *   `undefined` and it is never sent.
 */
export function createAsrCodec(previousText?: string): AsrCodec {
  let firstChunk = true;
  // Final-dedup memory: the last emitted `completed` transcript and when it was emitted.
  let lastFinalText: string | null = null;
  let lastFinalAt = 0;
  // Set once this session has actually delivered a timestamped final with words in it — the twin that
  // carries the detected language. Until then the plain twin is all we have and must be used.
  let sawTimestampedFinal = false;
  // Set when the handshake itself promised language detection, which is the vendor saying the tagged
  // twin is coming. Measured against a live session: the plain twin always arrives FIRST and always
  // WITHOUT a tag, so waiting for the twin from the very first sentence is what keeps sentence one from
  // being routed blind. Partials carry no tag either — the tagged final is the only source there is.
  let expectTaggedFinal = false;
  // A plain final withheld while its tagged twin is expected. Kept so a broken promise can be detected
  // (see below) instead of silently swallowing the session.
  let heldPlainFinal: string | null = null;

  return {
    encodeAudio(pcm: ArrayBuffer): string {
      const frame: Record<string, unknown> = {
        message_type: 'input_audio_chunk',
        audio_base_64: bytesToBase64(pcm),
        sample_rate: 16000,
      };
      if (firstChunk) {
        firstChunk = false;
        if (previousText) frame.previous_text = previousText;
      }
      return JSON.stringify(frame);
    },

    encodeCommit(): string {
      return JSON.stringify({
        message_type: 'input_audio_chunk',
        audio_base_64: '',
        commit: true,
        sample_rate: 16000,
      });
    },

    decode(raw: string): { event: DecodedEvent; fatal: boolean } | null {
      let msg: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        msg = parsed as Record<string, unknown>;
      } catch {
        return null; // malformed JSON is ignored, never thrown
      }

      const type = strOf(msg.message_type) ?? strOf(msg.type) ?? '';

      switch (type) {
        case 'session_started': {
          const cfg = (msg.config && typeof msg.config === 'object' ? msg.config : {}) as Record<string, unknown>;
          const primary = strOf(cfg.language_code);
          const languages = [...codeList(primary), ...codeList(cfg.secondary_languages)];
          const detection = cfg.include_language_detection;
          if (detection === true || detection === 'true') expectTaggedFinal = true;
          return {
            event: {
              type: 'session.created',
              ...(languages.length ? { asrLanguages: languages } : {}),
              ...(detection === undefined ? {} : { languageDetection: detection === true || detection === 'true' }),
            },
            fatal: false,
          };
        }

        case 'partial_transcript': {
          const stash = pickText(msg) ?? '';
          const detectedLanguage = pickDetectedLanguage(msg);
          return {
            event: {
              type: 'conversation.item.input_audio_transcription.text',
              text: '',
              stash,
              ...(detectedLanguage ? { detectedLanguage } : {}),
            },
            fatal: false,
          };
        }

        case 'committed_transcript':
        case 'committed_transcript_with_timestamps':
        case 'final_transcript':
        case 'final_transcript_with_timestamps': {
          const transcript = pickText(msg) ?? '';
          // Every committed sentence arrives TWICE: a plain final and a timestamped one. Only the
          // timestamped twin carries the detected language, and the plain one always arrives FIRST — so
          // the dedup below would emit the plain twin and throw the label away, which is precisely how
          // "我是海空啊" (kanji, no kana) kept being routed as Japanese. Hold the plain twin when a tagged
          // one is expected. Adaptive, not assumed: a session that never delivers a timestamped final
          // keeps working exactly as before, so a vendor change can never silence the transcript.
          const timestamped = type.endsWith('_with_timestamps');
          if (timestamped) {
            if (transcript.trim()) sawTimestampedFinal = true;
            heldPlainFinal = null;
          } else if (sawTimestampedFinal || expectTaggedFinal) {
            // Self-healing: a SECOND plain final while the first is still waiting means the promised
            // twin never came. Stop waiting for good and let this one through, so a vendor that changes
            // its mind costs one sentence rather than the entire session's transcript.
            if (heldPlainFinal !== null && heldPlainFinal !== transcript) {
              expectTaggedFinal = false;
              sawTimestampedFinal = false;
              heldPlainFinal = null;
            } else {
              heldPlainFinal = transcript;
              return null;
            }
          }
          const now = Date.now();
          // Swallow the timestamped twin: identical text seen again within the window.
          if (lastFinalText !== null && transcript === lastFinalText && now - lastFinalAt < FINAL_DEDUP_MS) {
            return null;
          }
          lastFinalText = transcript;
          lastFinalAt = now;
          const detectedLanguage = pickDetectedLanguage(msg);
          return {
            event: {
              type: 'conversation.item.input_audio_transcription.completed',
              transcript,
              ...(detectedLanguage ? { detectedLanguage } : {}),
            },
            fatal: false,
          };
        }

        case 'commit_throttled':
          return { event: { type: 'asr.commit_throttled' }, fatal: false };

        default:
          break;
      }

      // Anything error-shaped maps onto the lane's existing `error` event.
      if (isErrorShaped(msg, type)) {
        return { event: { type: 'error', error: { message: errorMessageOf(msg, type) } }, fatal: isFatal(msg, type) };
      }

      // Unknown message types are ignored.
      return null;
    },
  };
}

// ---- helpers ----

/** Base64 of the raw PCM16 bytes, in chunks so a large buffer never overflows the call stack. */
function bytesToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function strOf(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/** The vendor may name the transcript `text` OR `transcript`; accept either. */
function pickText(msg: Record<string, unknown>): string | undefined {
  return strOf(msg.text) ?? strOf(msg.transcript);
}

/**
 * The recogniser's OWN verdict on the language it just heard — present because the session is opened
 * asking for language detection.
 *
 * Deliberately NOT the bare `language` field. That one exists too, and it carries the language the
 * OPERATOR selected in the console: reading it would make every utterance "detected" as whatever the
 * console is set to, which is the opposite of a check. Reading the wrong one of these two is exactly
 * why the foreign-language guard never fired and Chinese kept being routed as Japanese.
 */
function pickDetectedLanguage(msg: Record<string, unknown>): string | undefined {
  return strOf(msg.language_code) ?? strOf(msg.detectedLanguage) ?? strOf(msg.detected_language);
}

/** A handshake echo may be one code or a list of them; normalise to a list of lowercase codes. */
function codeList(v: unknown): string[] {
  const raw = typeof v === 'string' ? v.split(',') : Array.isArray(v) ? v : [];
  return raw.map((c) => String(c).trim().toLowerCase()).filter(Boolean);
}

function isErrorShaped(msg: Record<string, unknown>, type: string): boolean {
  if (type.endsWith('_error')) return true;
  if (FATAL_TOKENS.includes(type)) return true;
  if (msg.error !== undefined && msg.error !== null) return true;
  if (typeof msg.message === 'string') return true;
  return false;
}

function errorMessageOf(msg: Record<string, unknown>, type: string): string {
  const err = msg.error;
  if (err && typeof err === 'object') {
    const m = (err as Record<string, unknown>).message;
    if (typeof m === 'string' && m) return m;
  }
  if (typeof err === 'string' && err) return err;
  if (typeof msg.message === 'string' && msg.message) return msg.message;
  return type || 'asr error';
}

function isFatal(msg: Record<string, unknown>, type: string): boolean {
  const parts: string[] = [type];
  const err = msg.error;
  if (typeof err === 'string') {
    parts.push(err);
  } else if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    for (const k of ['type', 'code', 'message', 'name']) if (typeof e[k] === 'string') parts.push(e[k] as string);
  }
  for (const k of ['code', 'message', 'name']) if (typeof msg[k] === 'string') parts.push(msg[k] as string);
  const sig = parts.join(' ').toLowerCase();
  return FATAL_TOKENS.some((t) => sig.includes(t));
}
