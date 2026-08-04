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
  // TASK 20: the mishearing corrections, kept GLOBALLY rather than per meeting. What the recogniser gets
  // wrong is a property of the words themselves — a company name it mangles at the anniversary is the
  // same name it will mangle at next month's briefing — so one list, learned once, serves every meeting.
  mishearings: 'mishearings.json',
};

/** Kilobytes are expected; a megabyte means something upstream lost its mind. Refuse rather than fill the disk. */
export const STORE_MAX_BYTES = 1024 * 1024;

const FALLBACK_DIR = './online-data';

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
