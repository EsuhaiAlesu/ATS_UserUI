// server/online-config.mjs — runtime configuration for the six ONLINE-lane vendor values.
//
// Precedence: a runtime value entered via the app's Settings UI (POST /online-api/config-keys)
// wins; otherwise the process env var of the same name is used (the permanent fallback).
// Runtime values are persisted as JSON on disk (ONLINE_KEYS_FILE, default ./online-keys.json),
// loaded on boot and rewritten on change. NOTE: on Railway the filesystem is EPHEMERAL — runtime
// keys are lost on each redeploy and must be re-entered (or set as Railway env vars for permanence).
//
// Values are write-only: never returned, echoed, or logged. The CLIENT never sees the real env
// NAMES either — the config endpoints speak opaque SLUGS (asr_endpoint, …) that this module maps to
// env names server-side, so the built client bundle contains no vendor env name.

import fs from 'node:fs';

// Opaque client-facing slug → server-side env name. Only the slugs cross to the client.
const SLUG_TO_ENV = {
  asr_endpoint: 'QWEN3_ASR_WS_BASE',
  asr_key: 'QWEN3_ASR_API_KEY',
  refine_key: 'OPENAI_API_KEY',
  tts_key: 'ELEVENLABS_API_KEY',
  tts_voice_ja: 'ELEVENLABS_VOICE_ID',
  tts_voice_vi: 'VI_ELEVENLABS_VOICE_ID',
};

export const ONLINE_KEY_SLUGS = Object.keys(SLUG_TO_ENV);
const ENV_NAMES = Object.values(SLUG_TO_ENV);

const KEYS_FILE = (process.env.ONLINE_KEYS_FILE || './online-keys.json').trim();

/** @type {Record<string, string>} runtime store, keyed by ENV NAME */
let runtime = {};

// Load persisted runtime values on boot (best-effort; a missing/corrupt file just means "none set").
try {
  const parsed = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
  if (parsed && typeof parsed === 'object') {
    for (const name of ENV_NAMES) {
      if (typeof parsed[name] === 'string' && parsed[name].trim()) runtime[name] = parsed[name].trim();
    }
  }
} catch {
  /* no persisted keys yet */
}

/** Runtime value if set, else the process env var, else '' (all trimmed). Called server-side with an ENV NAME. */
export function getOnlineConfig(name) {
  const v = runtime[name];
  if (typeof v === 'string' && v.trim()) return v.trim();
  return (process.env[name] ?? '').trim();
}

function hasEnv(name) {
  return getOnlineConfig(name) !== '';
}

/** { keys: { <slug>: boolean }, ready: boolean } — SLUGS only, NEVER any value or env name. */
export function getConfigStatus() {
  /** @type {Record<string, boolean>} */
  const keys = {};
  for (const slug of ONLINE_KEY_SLUGS) keys[slug] = hasEnv(SLUG_TO_ENV[slug]);
  return { keys, ready: ONLINE_KEY_SLUGS.every((slug) => keys[slug]) };
}

// Apply a partial { <slug>: string }: a non-empty string sets the runtime value; an explicit ''
// clears it (env fallback then applies). Unknown SLUGS are rejected (400). Returns { changed:[slug] }
// or { error }. Never returns/echoes values; the caller logs only the changed SLUG names.
export function setOnlineConfig(partial) {
  if (!partial || typeof partial !== 'object' || Array.isArray(partial)) {
    return { error: 'Body must be an object of key slugs.' };
  }
  for (const slug of Object.keys(partial)) {
    if (!(slug in SLUG_TO_ENV)) return { error: `Unknown key: ${slug}` };
  }
  const changed = [];
  for (const slug of ONLINE_KEY_SLUGS) {
    if (!(slug in partial)) continue;
    const value = partial[slug];
    if (typeof value !== 'string') continue;
    const envName = SLUG_TO_ENV[slug];
    const trimmed = value.trim();
    if (trimmed === '') {
      if (runtime[envName] !== undefined) {
        delete runtime[envName];
        changed.push(slug);
      }
    } else if (runtime[envName] !== trimmed) {
      runtime[envName] = trimmed;
      changed.push(slug);
    }
  }
  if (changed.length) {
    try {
      fs.writeFileSync(KEYS_FILE, JSON.stringify(runtime), 'utf8');
    } catch (error) {
      return { error: `Failed to persist keys: ${String(error?.message ?? error).slice(0, 120)}` };
    }
  }
  return { changed };
}
