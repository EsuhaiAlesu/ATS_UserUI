// Central app settings (Giai đoạn 1) — the ONE place scattered preferences are consolidated.
// Stored in localStorage under `proyaku_settings`. Everything here is optional and falls back to a
// safe default, so an empty/absent store behaves exactly like before this file existed.
//
// NOTE: the backend origin (`apiBase`) is ALSO read directly by src/lib/api.ts at module load
// (it can't import this file without a cycle), so changing it needs a page reload to take effect.

import { REHEARSAL_DATE, GALA_DATE } from './prep';

export interface AppSettings {
    apiBase?: string;        // backend origin override (e.g. http://127.0.0.1:8080). '' = same-origin proxy.
    eventName?: string;
    rehearsalDate?: string;  // YYYY-MM-DD
    galaDate?: string;       // YYYY-MM-DD
    venue?: string;
}

const KEY = 'proyaku_settings';
export const DEFAULT_EVENT_NAME = 'Esuhai 20 năm';

export function loadSettings(): AppSettings {
    try {
        const s = localStorage.getItem(KEY);
        if (s) return JSON.parse(s) as AppSettings;
    } catch { /* corrupt/absent → defaults */ }
    return {};
}

export function saveSettings(patch: AppSettings): AppSettings {
    const next = { ...loadSettings(), ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore quota/private-mode */ }
    return next;
}

/** Effective event dates (override in settings, else the hard-coded defaults). */
export function eventDates(): { rehearsal: string; gala: string } {
    const s = loadSettings();
    return { rehearsal: s.rehearsalDate || REHEARSAL_DATE, gala: s.galaDate || GALA_DATE };
}

export function eventName(): string {
    return loadSettings().eventName || DEFAULT_EVENT_NAME;
}

// All Proyaku localStorage keys — used by the Data section to export / clear everything at once.
// Static keys + a versioned migration flag + the event pointers; the PREFIXES cover the dynamic
// per‑event keys (proyaku_script:<id>, proyaku_docs:<id>, …) so backup/clear never miss them.
export const LOCAL_KEYS = ['proyaku_settings', 'proyaku_tts', 'proyaku_prep', 'proyaku_capscale', 'proyaku_speaker', 'proyaku_schedule', 'proyaku_speakers', 'proyaku_script', 'proyaku_script_sync', 'proyaku_active_event', 'proyaku_activation', 'proyaku_migrated_events', 'proyaku_rail_collapsed', 'proyaku_series', 'proyaku_series_migrated'];
const LOCAL_PREFIXES = ['proyaku_script:', 'proyaku_script_sync:', 'proyaku_glossary:', 'proyaku_glossary_sync:', 'proyaku_docs:'];

// Every proyaku key currently present: the static list + anything matching a per‑event prefix.
function allLocalKeys(): string[] {
    const keys = new Set(LOCAL_KEYS);
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && LOCAL_PREFIXES.some((p) => k.startsWith(p))) keys.add(k);
        }
    } catch { /* ignore */ }
    return [...keys];
}

export function exportLocalData(): string {
    const out: Record<string, unknown> = {};
    for (const k of allLocalKeys()) {
        try {
            const v = localStorage.getItem(k);
            if (v != null) { try { out[k] = JSON.parse(v); } catch { out[k] = v; } }
        } catch { /* skip */ }
    }
    return JSON.stringify(out, null, 2);
}

export function clearLocalData(): void {
    for (const k of allLocalKeys()) {
        try { localStorage.removeItem(k); } catch { /* ignore */ }
    }
}
