// Kịch bản (Chuẩn bị · spec 1.3). LOCAL‑FIRST: the source of truth is localStorage 'proyaku_script'
// — an array of ScriptEntry byte‑identical to what the backend Cascade Matcher reads from
// data/script.json — so the tool works fully OFFLINE. The backend is only a SYNC channel: push the
// approved script to data/script.json for the live matcher, or pull an existing one back.
//
// This removes the old failure where getScript() on mount received the SPA's index.html and threw
// "Unexpected token <", killing the whole tool whenever the backend was down.

import { uid } from './schedule';
import { getScript, saveScript } from './api';
import type { ScriptEntry } from './api';

// Event‑scoped keys: each Sự kiện (Conference id) holds its own script + sync meta. The JSON pushed
// to the matcher (data/script.json) is UNCHANGED — only the local storage key is namespaced.
const sk = (eventId: string): string => `proyaku_script:${eventId || '_default'}`;
const syk = (eventId: string): string => `proyaku_script_sync:${eventId || '_default'}`;

const ALLOWED_LANGS = new Set(['vi', 'ja', 'en', 'th', 'ko', 'zh']);
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const clampLang = (v: unknown, d: string): string => { const s = str(v); return ALLOWED_LANGS.has(s) ? s : d; };
const clampStatus = (v: unknown): ScriptEntry['status'] => (v === 'approved' ? 'approved' : 'draft');

function normEntry(x: unknown): ScriptEntry {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    const src_lang = clampLang(o.src_lang, 'vi');
    const dst_lang = clampLang(o.dst_lang, src_lang === 'vi' ? 'ja' : 'vi');
    const e: ScriptEntry = { id: str(o.id) || uid(), src_lang, src: str(o.src), dst_lang, dst: str(o.dst), status: clampStatus(o.status) };
    const note = str(o.note);
    if (note) e.note = note;
    return e;
}

function read(eventId: string): ScriptEntry[] {
    try {
        const s = localStorage.getItem(sk(eventId));
        if (s) { const p: unknown = JSON.parse(s); if (Array.isArray(p)) return p.map(normEntry); }
    } catch { /* corrupt/absent → empty */ }
    return [];
}

/**
 * Persist the whole list for an event + stamp updatedAt (drives the "chưa đồng bộ" indicator).
 * No‑ops when the serialized content is unchanged, so an idempotent flush (unmount / pagehide /
 * post‑sync) never fabricates a dirty state.
 */
export function writeScriptLocal(eventId: string, list: ScriptEntry[]): void {
    try {
        const next = JSON.stringify(list);
        // Absent key ≡ empty list, so merely visiting a new event (flush of []) never fabricates a key
        // or a dirty state; only a genuine change persists + stamps updatedAt.
        if ((localStorage.getItem(sk(eventId)) ?? '[]') === next) return;
        localStorage.setItem(sk(eventId), next);
        writeSync(eventId, { ...readSync(eventId), updatedAt: new Date().toISOString() });
    } catch { /* ignore quota/private-mode */ }
}

/** Record that local now equals the backend (after a replace‑pull): content is synced, not dirty. */
export function markPulledLocal(eventId: string, list: ScriptEntry[]): void {
    try {
        localStorage.setItem(sk(eventId), JSON.stringify(list));
        const t = new Date().toISOString();
        writeSync(eventId, { updatedAt: t, syncedAt: t });   // equal timestamps → getSyncState().dirty === false
    } catch { /* ignore quota/private-mode */ }
}

export const getScriptLocal = (eventId: string): ScriptEntry[] => read(eventId);

export const newScriptEntry = (srcLang = 'vi', dstLang = 'ja'): ScriptEntry =>
    ({ id: uid(), src_lang: srcLang, src: '', dst_lang: dstLang, dst: '', status: 'draft' });

// ---------------------------------------------------------------- sync bookkeeping (per event)
interface SyncMeta { updatedAt?: string; syncedAt?: string }
function readSync(eventId: string): SyncMeta { try { const s = localStorage.getItem(syk(eventId)); if (s) return JSON.parse(s) as SyncMeta; } catch { /* */ } return {}; }
function writeSync(eventId: string, m: SyncMeta): void { try { localStorage.setItem(syk(eventId), JSON.stringify(m)); } catch { /* */ } }

export interface SyncState { updatedAt?: string; syncedAt?: string; dirty: boolean }
export function getSyncState(eventId: string): SyncState {
    const m = readSync(eventId);
    const dirty = !m.syncedAt || (!!m.updatedAt && m.updatedAt > m.syncedAt);
    return { ...m, dirty };
}

// ---------------------------------------------------------------- readiness (% tiếp thu — shallow, FE‑only)
// The deep "% tiếp thu" (matching the script against a rehearsal transcript) is a BACKEND metric
// (see the handoff spec); here we report a truthful pre‑event readiness, not a fabricated coverage.
export interface Readiness { total: number; withSrc: number; translated: number; approved: number; translatedPct: number; approvedPct: number }
export function readiness(rows: ScriptEntry[]): Readiness {
    const withSrcRows = rows.filter((r) => r.src.trim());
    const withSrc = withSrcRows.length;
    const translated = withSrcRows.filter((r) => r.dst.trim()).length;
    const approved = withSrcRows.filter((r) => r.status === 'approved' && r.dst.trim()).length;
    const pct = (n: number) => (withSrc ? Math.round((n / withSrc) * 100) : 0);
    return { total: rows.length, withSrc, translated, approved, translatedPct: pct(translated), approvedPct: pct(approved) };
}

// ---------------------------------------------------------------- backend sync bridge (caller gates on backendOnline)
/**
 * Canonical form for the matcher: drop wholly‑empty lines and NEVER push an `approved` line whose
 * dst is empty — the matcher would reuse '' verbatim and blank the wall. Such lines are demoted to
 * draft on the way out (the local copy is untouched).
 */
export function toCanonical(rows: ScriptEntry[]): ScriptEntry[] {
    return rows
        .filter((r) => r.src.trim() || r.dst.trim())
        .map((r) => {
            const status: ScriptEntry['status'] = r.status === 'approved' && r.dst.trim() ? 'approved' : 'draft';
            return { ...r, status };
        });
}

/** Push this event's script to data/script.json for the live matcher. Returns the pushed line count. */
export async function pushToBackend(eventId: string, rows: ScriptEntry[]): Promise<number> {
    const canonical = toCanonical(rows);
    await saveScript(canonical);
    writeSync(eventId, { ...readSync(eventId), syncedAt: new Date().toISOString() });
    return canonical.length;
}

/** Pull the backend script; maps a JSON‑parse failure (HTML from an offline proxy) to a clear message. */
export async function pullFromBackend(): Promise<ScriptEntry[]> {
    try {
        const r = await getScript();
        return r.map(normEntry);
    } catch (e) {
        const msg = String(e);
        if (/Unexpected token|not valid JSON|in JSON/i.test(msg)) throw new Error('Backend không trả JSON (có thể đang offline).');
        throw e;
    }
}
