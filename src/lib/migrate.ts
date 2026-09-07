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

        const legacy = localStorage.getItem('proyaku_script');

        // NOTHING TO MIGRATE — and on a machine like this, migration must leave no trace at all.
        //
        // `ensureDefaultEvent()` used to run unconditionally, one line above this one. On a machine that
        // has never been used it CREATES a meeting, and a machine holding one meeting is no longer empty:
        // `adoptFromCloudIfEmpty()` runs a moment later in `bootCloud()`, asks `hasLocalPrep()`, is told
        // yes by the meeting this function had just invented, and refuses to bring the store down. The
        // person opening the link on a new laptop is left staring at an empty "Gala 20 năm" that nobody
        // prepared — which is the exact failure "máy trắng tự lấy về" was built to prevent.
        //
        // The flag is still set: there is genuinely nothing here to migrate, now or ever. And the guard is
        // deliberately narrow — a machine that HAS meetings but no legacy script keeps the old behaviour
        // below (pick a default, set the workspace pointer), because there the pointer is worth setting
        // and no meeting has to be invented to set it.
        if (legacy == null && getEvents().length === 0) { localStorage.setItem(FLAG, 'v1'); return; }

        const defaultId = ensureDefaultEvent();

        // Attribute the legacy global script to the CONFIGURED event if it exists (else the default),
        // so the migrating user's prepared script lands where they expect — not on whichever event
        // merely happens to be nearest‑upcoming.
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

// Chuỗi hội nghị (doc 30) — migration THUẦN CỘNG THÊM: không copy/move/sửa Conference nào. Mọi lịch cũ tự
// thành "một lần" vì normConf mặc định seriesId=undefined và proyaku_series vắng ⇒ []. Chỉ tạo kho rỗng +
// đặt cờ (idempotent, không bao giờ brick boot). Cờ riêng, độc lập với proyaku_migrated_events.
const SERIES_FLAG = 'proyaku_series_migrated';
export function migrateToSeries(): void {
    try {
        if (localStorage.getItem(SERIES_FLAG)) return;
        if (localStorage.getItem('proyaku_series') == null) localStorage.setItem('proyaku_series', '[]');
        localStorage.setItem(SERIES_FLAG, 'v1');
    } catch { /* never brick boot */ }
}
