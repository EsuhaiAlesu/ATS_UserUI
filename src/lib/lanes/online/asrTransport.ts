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
  | { type: 'session.created' }
  | { type: 'conversation.item.input_audio_transcription.text'; text: ''; stash: string; language?: string }
  | { type: 'conversation.item.input_audio_transcription.completed'; transcript: string; language?: string }
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
        case 'session_started':
          return { event: { type: 'session.created' }, fatal: false };

        case 'partial_transcript': {
          const stash = pickText(msg) ?? '';
          const language = strOf(msg.language);
          return {
            event: {
              type: 'conversation.item.input_audio_transcription.text',
              text: '',
              stash,
              ...(language ? { language } : {}),
            },
            fatal: false,
          };
        }

        case 'committed_transcript':
        case 'committed_transcript_with_timestamps':
        case 'final_transcript':
        case 'final_transcript_with_timestamps': {
          const transcript = pickText(msg) ?? '';
          const now = Date.now();
          // Swallow the timestamped twin: identical text seen again within the window.
          if (lastFinalText !== null && transcript === lastFinalText && now - lastFinalAt < FINAL_DEDUP_MS) {
            return null;
          }
          lastFinalText = transcript;
          lastFinalAt = now;
          const language = strOf(msg.language);
          return {
            event: {
              type: 'conversation.item.input_audio_transcription.completed',
              transcript,
              ...(language ? { language } : {}),
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
