// Bộ nhớ người nói (Chuẩn bị · spec 1.7 "bộ nhớ giọng‑theo‑người"). A REUSABLE library of speaker
// profiles kept across conferences — distinct from schedule.Speaker, which is embedded in ONE
// Conference. Each profile carries the canonical name (lower‑third + name‑fix), how it's misheard
// (aliases → glossary name‑fix), and a pre‑assigned TTS voice. Local‑first (localStorage) so it
// works fully OFFLINE; only the voice catalog and the "sync to glossary" bridge need the backend.

import { uid } from './schedule';
import type { VoicePick } from './ttsPrefs';
import type { GlossaryEntry } from './api';

export type Gender = '' | 'male' | 'female';

export interface SpeakerProfile {
    id: string;
    name: string;        // canonical display name — lower‑third + name‑fix anchor
    reading?: string;    // kana/phonetic reading to control pronunciation (= GlossaryEntry.reading)
    role?: string;       // chức danh
    org?: string;        // đơn vị / công ty (disambiguation)
    lang?: string;       // ngôn ngữ phát biểu: '' | vi | ja | en | th | ko | zh
    gender?: Gender;     // spec 2.1 tag — metadata only, does not force TTS output
    voice?: VoicePick;   // giọng TTS gán sẵn (lõi 1.7): voice.id feeds LiveCommandPatch.speaker.voice
    aliases: string[];   // biến thể ASR nghe‑nhầm → name (đổ vào GlossaryEntry.misheard)
    note?: string;
    createdAt: string;   // ISO — auto
    updatedAt: string;   // ISO — bumped on every save
}

const KEY = 'proyaku_speakers';
const ALLOWED_LANGS = new Set(['', 'vi', 'ja', 'en', 'th', 'ko', 'zh']); // mirrors schedule.ts
const ALLOWED_GENDER = new Set(['', 'male', 'female']);

const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const clampLang = (v: unknown): string => { const s = str(v); return ALLOWED_LANGS.has(s) ? s : ''; };
const clampGender = (v: unknown): Gender => { const s = str(v); return (ALLOWED_GENDER.has(s) ? s : '') as Gender; };

/**
 * Clean an alias list: trim, drop empties, drop the canonical name itself (a self‑map would create a
 * degenerate misheard→same rule), and de‑duplicate case‑insensitively (keeping the first spelling).
 * Accepts an array or a comma/newline‑separated string.
 */
export function normAliases(input: string[] | string, name = ''): string[] {
    const arr = Array.isArray(input) ? input : String(input).split(/[,\n]/);
    const nameKey = name.trim().toLowerCase();
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of arr) {
        const s = (typeof raw === 'string' ? raw : '').trim();
        if (!s) continue;
        const k = s.toLowerCase();
        if (k === nameKey || seen.has(k)) continue;
        seen.add(k);
        out.push(s);
    }
    return out;
}

// Accept a persisted voice only if it is structurally complete; anything partial → undefined
// (so a corrupt store never yields a half voice that would break the live TTS param).
function normVoice(v: unknown): VoicePick | undefined {
    if (!v || typeof v !== 'object') return undefined;
    const o = v as Record<string, unknown>;
    const engine = str(o.engine), key = str(o.key), id = o.id;
    if (!engine || !key || (typeof id !== 'string' && typeof id !== 'number') || id === '') return undefined;
    return { engine, key, id: id as string | number, label: o.label != null ? str(o.label) : undefined };
}

function normProfile(x: unknown): SpeakerProfile {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    const name = str(o.name);
    const created = str(o.createdAt) || new Date().toISOString();
    return {
        id: str(o.id) || uid(),
        name,
        reading: str(o.reading), role: str(o.role), org: str(o.org),
        lang: clampLang(o.lang), gender: clampGender(o.gender),
        voice: normVoice(o.voice),
        aliases: normAliases(Array.isArray(o.aliases) ? (o.aliases as string[]) : [], name),
        note: str(o.note),
        createdAt: created, updatedAt: str(o.updatedAt) || created,
    };
}

function read(): SpeakerProfile[] {
    try {
        const s = localStorage.getItem(KEY);
        if (s) { const p: unknown = JSON.parse(s); if (Array.isArray(p)) return p.map(normProfile); }
    } catch { /* corrupt/absent → empty */ }
    return [];
}

function write(list: SpeakerProfile[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore quota/private-mode */ }
}

/** All profiles, sorted by name (Vietnamese collation). */
export const getSpeakers = (): SpeakerProfile[] =>
    read().sort((a, b) => a.name.localeCompare(b.name, 'vi'));

export const getSpeaker = (id: string): SpeakerProfile | undefined => read().find((s) => s.id === id);

export function upsertSpeaker(p: SpeakerProfile): SpeakerProfile[] {
    const list = read();
    const clean: SpeakerProfile = {
        ...p, name: p.name.trim(), aliases: normAliases(p.aliases, p.name), updatedAt: new Date().toISOString(),
    };
    const i = list.findIndex((s) => s.id === p.id);
    if (i >= 0) list[i] = clean; else list.push(clean);
    write(list);
    return getSpeakers();
}

export function removeSpeaker(id: string): SpeakerProfile[] {
    write(read().filter((s) => s.id !== id));
    return getSpeakers();
}

export const newSpeakerProfile = (): SpeakerProfile => {
    const now = new Date().toISOString();
    // NB: named *Profile* because schedule.ts already exports newSpeaker() for its embedded speakers.
    return { id: uid(), name: '', reading: '', role: '', org: '', lang: '', gender: '', aliases: [], note: '', createdAt: now, updatedAt: now };
};

/** Resolve a profile by an exact (trim + case‑insensitive) name — used by the console to recall a voice. */
export function findSpeakerByName(name: string): SpeakerProfile | undefined {
    const k = name.trim().toLowerCase();
    if (!k) return undefined;
    return read().find((s) => s.name.trim().toLowerCase() === k);
}

// ---------------------------------------------------------------- Glossary bridge (name‑fix)
// PURE + idempotent so it is unit‑testable offline. The actual read/write (getGlossary/saveGlossary,
// which hit the backend) is orchestrated by the page and gated on backendOnline — never auto‑run.

/** One profile → a protected‑name glossary entry (proper noun kept verbatim: ja = ''). */
export function toGlossaryEntry(p: SpeakerProfile): GlossaryEntry {
    return {
        vi: p.name.trim(),
        ja: '',
        reading: p.reading || undefined,
        type: 'name',
        asr_hotword: true,
        misheard: p.aliases.length ? p.aliases : undefined,
        note: [p.role, p.org].filter(Boolean).join(' · ') || undefined,
    };
}

/**
 * Merge profiles into an existing glossary WITHOUT clobbering hand‑authored rows: a name row (same
 * type='name' + vi) has its misheard union‑extended and reading/note filled if empty; new names are
 * appended. Manual entries are never removed. Returns the new list + counts (added / updated).
 */
export function mergeIntoGlossary(existing: GlossaryEntry[], profiles: SpeakerProfile[]): { next: GlossaryEntry[]; added: number; updated: number } {
    const next: GlossaryEntry[] = existing.map((e) => ({ ...e }));
    let added = 0, updated = 0;
    for (const p of profiles) {
        const name = p.name.trim();
        if (!name) continue;
        const entry = toGlossaryEntry(p);
        // Guard e.vi's type — getGlossary parses arbitrary backend JSON, so a row may be malformed.
        const idx = next.findIndex((e) => e.type === 'name' && typeof e.vi === 'string' && e.vi.trim().toLowerCase() === name.toLowerCase());
        if (idx < 0) { next.push(entry); added++; continue; }
        const cur = next[idx];
        const curMisheard = Array.isArray(cur.misheard) ? cur.misheard.filter((x): x is string => typeof x === 'string') : [];
        const union = Array.from(new Set([...curMisheard, ...(entry.misheard ?? [])]));
        next[idx] = {
            ...cur,
            reading: cur.reading || entry.reading,
            asr_hotword: cur.asr_hotword ?? true,   // keep a deliberate manual false; default on when absent
            misheard: union.length ? union : undefined,
            note: cur.note || entry.note,
        };
        updated++;
    }
    return { next, added, updated };
}
