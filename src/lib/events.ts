// Sự kiện (Event) = một Conference trong Đặt lịch (schedule.ts). We do NOT introduce a parallel
// "event" store — every prep tool becomes event‑scoped just by keying its localStorage on the
// Conference id. This file is a thin layer over schedule.ts holding the two pointers that scoping
// needs: which event is being EDITED (workspace, offline) and which event is ACTIVATED for the live
// matcher (needs the backend). They can differ — the UI must show which.

import { getSchedules, upsertConference, newConference, removeConference } from './schedule';
import type { Conference } from './schedule';
import { eventName, eventDates } from './settings';

const ACTIVE_KEY = 'proyaku_active_event';       // dedicated reactive key (NOT in proyaku_settings)
const ACTIVATION_KEY = 'proyaku_activation';     // which event's script/glossary the matcher holds

export const getEvents = (): Conference[] => getSchedules();
export const getEvent = (id: string): Conference | undefined => getSchedules().find((c) => c.id === id);

const todayISO = (): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Deterministic default pick: nearest upcoming event, else the one named like the configured event,
// else the last. Deterministic so re‑running migration lands on the same event.
function pickDefault(list: Conference[]): Conference | undefined {
    if (!list.length) return undefined;
    const today = todayISO();
    const upcoming = list.find((c) => c.date && c.date >= today);
    if (upcoming) return upcoming;
    const named = list.find((c) => c.title.trim() && c.title.trim() === eventName().trim());
    return named ?? list[list.length - 1];
}

/** Ensure ≥1 event exists; returns an id to use as the default workspace (creates one if empty). */
export function ensureDefaultEvent(): string {
    const picked = pickDefault(getSchedules());
    if (picked) return picked.id;
    const conf = newConference();
    conf.title = eventName();
    conf.date = eventDates().gala;
    upsertConference(conf);
    return conf.id;
}

// --- "đang chọn" (workspace) pointer ---
export function getActiveEventId(): string {
    try { return localStorage.getItem(ACTIVE_KEY) || ''; } catch { return ''; }
}
export function setActiveEventId(id: string): void {
    try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* ignore quota/private-mode */ }
}
export const getActiveEvent = (): Conference | undefined => { const id = getActiveEventId(); return id ? getEvent(id) : undefined; };

// --- "đang kích hoạt cho matcher" pointer ---
export interface Activation { activatedId?: string; activatedAt?: string }
export function getActivation(): Activation {
    try { const s = localStorage.getItem(ACTIVATION_KEY); if (s) return JSON.parse(s) as Activation; } catch { /* corrupt → none */ }
    return {};
}
export function setActivation(id: string): void {
    try { localStorage.setItem(ACTIVATION_KEY, JSON.stringify({ activatedId: id, activatedAt: new Date().toISOString() })); } catch { /* ignore */ }
}
export function clearActivationIf(id: string): void {
    if (getActivation().activatedId === id) { try { localStorage.removeItem(ACTIVATION_KEY); } catch { /* ignore */ } }
}

/** Delete an event and reconcile the pointers: clear its activation, and repick the active event if
 * it was the selected one (so neither pointer is left dangling). Per‑event data keys are left as
 * orphans intentionally (harmless; a later cleanup version can sweep them). */
export function removeEvent(id: string): void {
    removeConference(id);
    clearActivationIf(id);
    if (getActiveEventId() === id) {
        const next = pickDefault(getSchedules());
        setActiveEventId(next ? next.id : '');
    }
}
