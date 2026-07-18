// Persistent state for the Prep Desk (/prep) go/no-go board.
//
// HONESTY NOTE (docs/ux-roadmap/15 audit): the readiness board splits every signal into
//   • "ĐO ĐƯỢC" — computed live from a real artefact (getHealth/getGlossary/getScript/…);
//   • "KÝ TAY"  — things the frontend CANNOT verify (models warm on Metal, names heard right,
//                 script rehearsed with the real stage mic, 2nd Mac warm, human interpreter briefed).
// Attestations are stored here in localStorage with who + when, and NEVER auto-turn green from
// neighbouring data. They are LOCAL TO THIS MACHINE/BROWSER — cleared with the cache — so the UI
// warns as much. We deliberately do NOT persist them to data/*.json via /api/file (unauthenticated
// write = a security risk per the audit).

export interface Attest {
    by: string;
    ts: string;   // ISO
}

interface PrepStore {
    attest: Record<string, Attest>;
    reachedReadyTs?: string;          // latched the first time a live session reached READY in this browser
    debrief: Record<string, boolean>; // post-event checklist ticks
    incidents: string[];              // free-text "things we saw" log for next time
}

const KEY = 'proyaku_prep';

// Rehearsal day — attesting "rehearsed with the real mic" before this is suspicious.
export const REHEARSAL_DATE = '2026-08-07';
export const GALA_DATE = '2026-08-08';

function read(): PrepStore {
    try {
        const s = localStorage.getItem(KEY);
        if (s) {
            // Coerce each field defensively — a present-but-wrong-typed key (e.g. {"attest":null}
            // from a hand-edit) must NOT override the safe default and later crash prep.attest[id].
            const p = JSON.parse(s) as Partial<PrepStore> | null;
            if (p && typeof p === 'object') {
                return {
                    attest: p.attest && typeof p.attest === 'object' ? p.attest : {},
                    debrief: p.debrief && typeof p.debrief === 'object' ? p.debrief : {},
                    incidents: Array.isArray(p.incidents) ? p.incidents : [],
                    reachedReadyTs: typeof p.reachedReadyTs === 'string' ? p.reachedReadyTs : undefined,
                };
            }
        }
    } catch { /* corrupt/absent → default */ }
    return { attest: {}, debrief: {}, incidents: [] };
}

function write(s: PrepStore): void {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore quota/private-mode */ }
}

export const getPrep = (): PrepStore => read();

export function signAttest(id: string, by: string): PrepStore {
    const s = read();
    s.attest[id] = { by: by.trim() || 'operator', ts: new Date().toISOString() };
    write(s);
    return s;
}

export function clearAttest(id: string): PrepStore {
    const s = read();
    delete s.attest[id];
    write(s);
    return s;
}

/** Latch the moment a live session first reached READY in this browser load (proof the models actually warmed). */
export function markReachedReady(): void {
    const s = read();
    if (!s.reachedReadyTs) { s.reachedReadyTs = new Date().toISOString(); write(s); }
}

export function setDebrief(id: string, val: boolean): PrepStore {
    const s = read();
    s.debrief[id] = val;
    write(s);
    return s;
}

export function addIncident(text: string): PrepStore {
    const s = read();
    const t = text.trim();
    if (t) s.incidents = [...s.incidents, `${new Date().toISOString()}  ${t}`];
    write(s);
    return s;
}

export function removeIncident(i: number): PrepStore {
    const s = read();
    s.incidents = s.incidents.filter((_, idx) => idx !== i);
    write(s);
    return s;
}

/** True if the attestation was signed before the rehearsal day (soft warning against pre-signing).
 *  Compares LOCAL calendar dates — a signature made early morning on 07/08 in Vietnam (UTC+7) is a
 *  06/08 UTC timestamp, and must not spuriously read as "before rehearsal". */
export function signedBeforeRehearsal(a?: Attest): boolean {
    if (!a) return false;
    const d = new Date(a.ts);
    if (isNaN(d.getTime())) return false;
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return local < REHEARSAL_DATE;
}

/** Whole-days from now until an ISO date (negative if past). Browser Date is fine here. */
export function daysUntil(isoDate: string): number {
    const target = new Date(isoDate + 'T00:00:00').getTime();
    const now = Date.now();
    return Math.ceil((target - now) / 86_400_000);
}
