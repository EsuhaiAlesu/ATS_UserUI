// One‑time migration to event‑scoped storage. Runs once at boot (guarded by a versioned flag),
// fully wrapped in try/catch so a migration error can NEVER brick the app. Strategy: COPY (not move)
// the legacy global script into the default event's key, keep the legacy key as a backup, and never
// overwrite an existing per‑event key → idempotent, re‑runnable, zero data loss.

import { ensureDefaultEvent, getActiveEventId, setActiveEventId, getEvents } from './events';
import { eventName } from './settings';

const FLAG = 'proyaku_migrated_events';

export function migrateToEventScoped(): void {
    try {
        if (localStorage.getItem(FLAG)) return;   // already migrated

        const defaultId = ensureDefaultEvent();

        // Attribute the legacy global script to the CONFIGURED event if it exists (else the default),
        // so the migrating user's prepared script lands where they expect — not on whichever event
        // merely happens to be nearest‑upcoming.
        const legacy = localStorage.getItem('proyaku_script');
        let ownerId = defaultId;
        if (legacy != null) {
            const named = getEvents().find((e) => e.title.trim() && e.title.trim() === eventName().trim());
            if (named) ownerId = named.id;
            // Copy into the owner event (only if the target is empty). Keep legacy keys as backup.
            const scriptTarget = `proyaku_script:${ownerId}`;
            if (localStorage.getItem(scriptTarget) == null) {
                localStorage.setItem(scriptTarget, legacy);
                const legacySync = localStorage.getItem('proyaku_script_sync');
                const syncTarget = `proyaku_script_sync:${ownerId}`;
                if (legacySync != null && localStorage.getItem(syncTarget) == null) localStorage.setItem(syncTarget, legacySync);
            }
        }

        if (!getActiveEventId()) setActiveEventId(ownerId);
        localStorage.setItem(FLAG, 'v1');
    } catch { /* never brick boot */ }
}
