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
        if (s) return { attest: {}, debrief: {}, incidents: [], ...JSON.parse(s) };
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

/** True if the attestation timestamp is before the rehearsal day (a soft warning against pre-signing). */
export function signedBeforeRehearsal(a?: Attest): boolean {
    if (!a) return false;
    return a.ts.slice(0, 10) < REHEARSAL_DATE;
}

/** Whole-days from now until an ISO date (negative if past). Browser Date is fine here. */
export function daysUntil(isoDate: string): number {
    const target = new Date(isoDate + 'T00:00:00').getTime();
    const now = Date.now();
    return Math.ceil((target - now) / 86_400_000);
}
