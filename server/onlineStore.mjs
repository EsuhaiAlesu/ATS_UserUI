// server/onlineStore.mjs — the ONLINE lane's own small persistent store.
//
// Three fixed JSON files, read and written whole. That is the entire design, and it is deliberate: the
// payload is a glossary of a few hundred entries and a handful of text boxes — kilobytes — and the only
// failure that has ever mattered for data this size is a half-written file after a restart. `write to a
// temp name, then rename` closes that (rename is atomic within a directory) and nothing else is needed.
//
// WHERE it writes:
//   DATA_DIR set   → that directory (the deploy mounts a persistent disk there)
//   DATA_DIR unset → ./online-data next to the server, so a dev clone runs with no disk attached
//
// `DATA_DIR` is read on EVERY call, never latched at import time — otherwise a test could not point the
// store at a temp directory, and neither could an operator who fixes the mount without a redeploy.
//
// No key, no vendor name, no other environment variable is read here. This module knows about a
// directory and three file names.

import fs from 'node:fs/promises';
import path from 'node:path';

/** The only names this store will open. Anything else is a bug in the caller, not a request. */
const FILES = {
  glossary: 'online-glossary.json',
  boxes: 'session-boxes.json',
  // PROMPT-12 — the Chuẩn bị data that used to live in ONE browser's localStorage. Both are global and
  // small: a schedule is a few dozen conferences, a speaker library a few dozen people. Kilobytes.
  schedule: 'prep-schedule.json',
  speakers: 'prep-speakers.json',
  // TASK 20: the mishearing corrections, kept GLOBALLY rather than per meeting. What the recogniser gets
  // wrong is a property of the words themselves — a company name it mangles at the anniversary is the
  // same name it will mangle at next month's briefing — so one list, learned once, serves every meeting.
  mishearings: 'mishearings.json',
  // PROMPT-16 — the settings that describe the MEETING rather than the machine: wall sizes in metres,
  // character height, voices, speaking pace. Short strings, one small object, and the reason a second
  // machine no longer opens the link to a console that has forgotten how the hall is laid out. What
  // belongs to the hardware in front of one operator is NOT in here — see `SETTINGS_KEYS` on the client.
  settings: 'prep-settings.json',
};

/** Kilobytes are expected; a megabyte means something upstream lost its mind. Refuse rather than fill the disk. */
export const STORE_MAX_BYTES = 1024 * 1024;

const FALLBACK_DIR = './online-data';

// ---- PROMPT-12: per-event stores ----
//
// The script and the imported documents belong to ONE meeting, and documents are the reason this cannot
// be a single shared file the way `boxes` is: `docs.ts` stores up to 256KB of extracted text per file,
// so a handful of meetings is already megabytes while STORE_MAX_BYTES is one.
//
// A per-event file means a filename built from user data, which is exactly the door the three fixed
// files were designed to keep shut. It is closed again by REFUSING rather than CLEANING: an id that is
// not plainly safe throws, it is not trimmed into something that looks safe. Sanitising is where these
// bugs hide — `..%2f`, a NUL byte, a name that normalises to `..` on one filesystem and not another.
// There is nothing to smuggle through a whitelist that answers only yes or no.
const EVENT_KINDS = {
  script: 'script',
  docs: 'docs',
};

/** Ids come from `uid()` — a UUID or a base36 pair. Anything else is a caller bug, not a request. */
const EVENT_ID_OK = /^[A-Za-z0-9_-]{1,64}$/;

/** Documents are the reason this exists; 8MB is generous for text and still refuses a runaway. */
export const EVENT_STORE_MAX_BYTES = 8 * 1024 * 1024;

function resolveEventFile(kind, eventId) {
  const dir = EVENT_KINDS[kind];
  if (!dir) throw new Error(`Unknown event store: ${String(kind).slice(0, 40)}`);
  const id = String(eventId ?? '');
  if (!EVENT_ID_OK.test(id)) throw new Error('Invalid event id.');
  return path.join(storeDir(), 'events', dir, `${id}.json`);
}

/** Read one event's store. Same contract as `readStore`: never throws for missing/corrupt, returns `fallback`. */
export async function readEventStore(kind, eventId, fallback) {
  let file;
  // A bad kind or id is a caller bug and must be loud; a missing or corrupt FILE is normal and must be quiet.
  try {
    file = resolveEventFile(kind, eventId);
  } catch {
    return fallback;
  }
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > EVENT_STORE_MAX_BYTES) return fallback;
    const raw = await fs.readFile(file, 'utf8');
    if (!raw.trim()) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/** Write one event's store atomically. Throws on a bad id, an oversized payload, or a real disk error. */
export async function writeEventStore(kind, eventId, value) {
  const file = resolveEventFile(kind, eventId);
  const body = JSON.stringify(value ?? null, null, 2);
  const bytes = Buffer.byteLength(body, 'utf8');
  if (bytes > EVENT_STORE_MAX_BYTES) throw new Error(`Event store payload too large (${bytes} bytes).`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, body, 'utf8');
  await fs.rename(tmp, file);
  return bytes;
}

/**
 * Which events have something stored, and when. Powers the "what is on the server" readout — an operator
 * about to overwrite their local work is owed a list, not a yes/no.
 */
export async function listEventStore(kind) {
  const dir = EVENT_KINDS[kind];
  if (!dir) throw new Error(`Unknown event store: ${String(kind).slice(0, 40)}`);
  const base = path.join(storeDir(), 'events', dir);
  try {
    const names = await fs.readdir(base);
    const out = [];
    for (const name of names) {
      if (!name.endsWith('.json')) continue; // skips any .tmp a crash left behind
      const id = name.slice(0, -5);
      if (!EVENT_ID_OK.test(id)) continue;
      try {
        const stat = await fs.stat(path.join(base, name));
        out.push({ eventId: id, bytes: stat.size, savedAt: Math.round(stat.mtimeMs) });
      } catch { /* vanished between readdir and stat — simply not listed */ }
    }
    return out.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return []; // nothing stored yet is not an error
  }
}

/** The directory in use right now. Exported so a diagnostic can say where things are without guessing. */
export function storeDir() {
  const configured = (process.env.DATA_DIR ?? '').trim();
  return configured || FALLBACK_DIR;
}

function resolveFile(name) {
  const file = FILES[name];
  // A name that is not one of ours never becomes a path. This is the whole path-traversal story: the
  // caller passes a KEY, never a filename, so there is nothing for `../` to be smuggled through.
  if (!file) throw new Error(`Unknown store: ${String(name).slice(0, 40)}`);
  return path.join(storeDir(), file);
}

/**
 * Read one store. NEVER throws for a missing, empty, oversized or corrupt file — it returns `fallback`.
 * A glossary that fails to parse must leave the console usable and empty, not take the session down.
 */
export async function readStore(name, fallback) {
  const file = resolveFile(name);
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > STORE_MAX_BYTES) return fallback;
    const raw = await fs.readFile(file, 'utf8');
    if (!raw.trim()) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/**
 * Write one store atomically. Returns the number of bytes written. Throws on a payload over the ceiling
 * or on a real disk error — the caller turns that into a 500 the operator can see, because a save that
 * silently did nothing is how a hall full of people ends up with yesterday's glossary.
 */
export async function writeStore(name, value) {
  const file = resolveFile(name);
  const body = JSON.stringify(value ?? null, null, 2);
  const bytes = Buffer.byteLength(body, 'utf8');
  if (bytes > STORE_MAX_BYTES) throw new Error(`Store payload too large (${bytes} bytes).`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, body, 'utf8');
  // Same directory ⇒ the rename is atomic: a reader sees either the old file or the new one, never a
  // half-written one, whatever moment the process dies at.
  await fs.rename(tmp, file);
  return bytes;
}
