// src/lib/lanes/online/onlineGlossary.ts — the ONLINE lane's own glossary.
//
// Separate from the offline `/glossary` page ON PURPOSE. That page reads and writes `/api`, an internal
// backend that the deployed build cannot reach; this one lives on the deploy's own store. The ENTRY SHAPE
// is deliberately the same as the offline `GlossaryEntry` so `prepData.ts` can rank both with one code
// path — but the shape is COPIED here, never imported: a lane file may not import `src/lib/api.ts`.
//
// The editor is line-oriented, because the operator already types the Thuật ngữ box that way:
//
//   Esuhai = エスハイ *      →  vi/ja pair, primed into the recogniser
//   GEM Center *             →  one side only: keep the name verbatim, and prime it
//   kỹ sư = エンジニア        →  an ordinary term, not primed
//
// A trailing `*` marks `asr_hotword`. Nothing else is parsed: a glossary is not a config file.

const ONLINE_BASE = '/online-api';

/** Same fields as the offline entry (copied, not imported — see the header). */
export interface OnlineGlossaryEntry {
  vi: string;
  ja: string;
  reading?: string;
  type?: string;
  asr_hotword?: boolean;
  misheard?: string[];
  note?: string;
}

/** Mirrors the server ceiling. Kept here so the editor can say "too many" before the round trip. */
export const ONLINE_GLOSSARY_MAX = 2_000;

export interface GlossaryLineParse {
  entries: OnlineGlossaryEntry[];
  /** Lines that carried text but produced nothing usable, verbatim, so the box can name them. */
  invalid: string[];
}

/**
 * Parse the editor's text. Never throws. Blank lines and `#` comments are skipped in silence; a line that
 * survives trimming but yields no side at all is reported rather than dropped, because a term that
 * vanishes without a word is exactly how a rehearsal loses a name.
 */
export function parseGlossaryLines(text: string): GlossaryLineParse {
  const entries: OnlineGlossaryEntry[] = [];
  const invalid: string[] = [];
  for (const rawLine of (text ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    let body = line;
    let hotword = false;
    if (body.endsWith('*')) {
      hotword = true;
      body = body.slice(0, -1).trim();
    }
    const cut = body.indexOf('=');
    const vi = (cut >= 0 ? body.slice(0, cut) : body).trim();
    const ja = (cut >= 0 ? body.slice(cut + 1) : '').trim();
    if (!vi && !ja) {
      invalid.push(line);
      continue;
    }
    const entry: OnlineGlossaryEntry = { vi, ja };
    if (hotword) entry.asr_hotword = true;
    entries.push(entry);
    if (entries.length >= ONLINE_GLOSSARY_MAX) break;
  }
  return { entries, invalid };
}

/** The inverse, so opening the panel shows what was saved rather than an empty box. */
export function formatGlossaryLines(entries: readonly OnlineGlossaryEntry[]): string {
  return entries
    .map((e) => {
      const vi = (e.vi ?? '').trim();
      const ja = (e.ja ?? '').trim();
      const pair = vi && ja ? `${vi} = ${ja}` : vi || ja;
      return e.asr_hotword ? `${pair} *` : pair;
    })
    .filter(Boolean)
    .join('\n');
}

/** Reading never throws: an unreachable store means an empty glossary, not a broken console. */
export async function fetchOnlineGlossary(): Promise<OnlineGlossaryEntry[]> {
  try {
    const res = await fetch(`${ONLINE_BASE}/glossary`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = (await res.json()) as { entries?: unknown };
    return Array.isArray(data.entries) ? (data.entries as OnlineGlossaryEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Saving DOES throw, with a Vietnamese message: whoever pressed the button is standing in a hall and has
 * to know whether the thing they just typed is stored or gone.
 */
export async function saveOnlineGlossary(entries: readonly OnlineGlossaryEntry[]): Promise<number> {
  const res = await fetch(`${ONLINE_BASE}/glossary`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) throw new Error(res.status === 401 ? 'Phiên đăng nhập đã hết — tải lại trang rồi lưu lại.' : `Lưu từ điển thất bại (${res.status}).`);
  const data = (await res.json()) as { count?: number };
  return typeof data.count === 'number' ? data.count : entries.length;
}
