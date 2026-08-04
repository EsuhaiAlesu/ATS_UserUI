// src/lib/scriptLoad.ts
//
// The ONE place that answers "how many script rows will the running session get, and if none, why".
//
// Why this file exists: every screen used to derive the script's localStorage key its own way. The Kịch
// bản page uses the RAW active-event pointer (`useActiveEvent().eventId`, written by `ScriptPrep.tsx`),
// while the live console used `event?.id ?? ''` — the same pointer AFTER it has been resolved against the
// schedule list. Those two agree only while the pointer still resolves. When it does not (the event was
// deleted, or the schedule store is corrupt), the prep screen still shows "40 dòng đã duyệt" while the
// console silently reads the `_default` store, finds nothing, and translates the whole ceremony freely
// without saying a word. From here on there is exactly ONE derivation: the raw pointer, the same key the
// writer used.
//
// Pure localStorage, synchronous, no network: loading a script must never queue behind a fetch.

import { getScriptLocal, writeScriptLocal } from './script';
import type { ScriptEntry } from './api';

/** Why the matcher has nothing to read (or `ok` when it has). */
export type ScriptBlockReason = 'ok' | 'no-rows' | 'all-draft' | 'missing-translation';

export interface ScriptLoad {
    /** Rows the matcher may speak verbatim: approved AND carrying both sides. */
    rows: ScriptEntry[];
    /** Every row stored for this event, drafts and half-filled rows included. */
    total: number;
    /** Translated on both sides but NOT approved — one button press away from being usable. */
    draft: number;
    /** Has a source line but no translation — approving it would put a blank line on the wall. */
    missingTranslation: number;
    /** The key actually read (empty = no event selected → the `_default` store). */
    eventId: string;
    reason: ScriptBlockReason;
}

/**
 * The event key used to read/write the script. Always the RAW pointer — the key the Kịch bản page writes
 * to. Never derived from a resolved event object, because a dangling pointer would silently fall back to
 * the `_default` store.
 */
export const scriptEventKey = (selectedEventId: string): string => selectedEventId;

/** A row carries both sides (source + translation) — the precondition for approving it usefully. */
const bothSides = (r: ScriptEntry): boolean => r.src.trim() !== '' && r.dst.trim() !== '';

/**
 * Read this event's script and state its condition. Never throws: a corrupt store reads as "no rows", so
 * the machine still translates — it just translates freely, and now says so.
 */
export function loadScriptForSession(selectedEventId: string): ScriptLoad {
    const eventId = scriptEventKey(selectedEventId);
    let all: ScriptEntry[] = [];
    try { all = getScriptLocal(eventId); } catch { all = []; }

    const rows = all.filter((r) => r.status === 'approved' && bothSides(r));
    const draft = all.filter((r) => r.status !== 'approved' && bothSides(r)).length;
    const missingTranslation = all.filter((r) => r.src.trim() !== '' && r.dst.trim() === '').length;

    let reason: ScriptBlockReason = 'ok';
    if (rows.length === 0) {
        if (all.length === 0) reason = 'no-rows';
        else if (draft > 0) reason = 'all-draft';
        else if (missingTranslation > 0) reason = 'missing-translation';
        else reason = 'no-rows';
    }
    return { rows, total: all.length, draft, missingTranslation, eventId, reason };
}

/**
 * One Vietnamese sentence for the technician standing in front of the Bắt đầu button. It names the cause
 * and the fix: "0 dòng" with no reason is something nobody can act on with ten minutes to go.
 */
export function scriptLoadMessage(load: ScriptLoad): string {
    if (load.reason === 'ok') {
        return `Kịch bản: ${load.rows.length}/${load.total} dòng đã duyệt — câu nào trùng kịch bản sẽ đọc đúng câu đã duyệt.`;
    }
    if (load.reason === 'all-draft') {
        return `Kịch bản: ${load.total} dòng nhưng CHƯA DUYỆT dòng nào — máy sẽ tự dịch toàn bộ. Bấm "Duyệt ${load.draft} dòng" bên dưới, hoặc vào Chuẩn bị → Kịch bản bấm "Duyệt hết đã dịch".`;
    }
    if (load.reason === 'missing-translation') {
        return `Kịch bản: ${load.total} dòng nhưng ${load.missingTranslation} dòng THIẾU BẢN DỊCH — máy sẽ tự dịch toàn bộ. Nhập lại tệp kịch bản có đủ hai cột (nguồn ⇥ bản dịch).`;
    }
    return 'Kịch bản: buổi này chưa có dòng nào — máy sẽ tự dịch toàn bộ.';
}

/**
 * Approve every row that already has both sides, and persist immediately. Returns how many were approved
 * (0 = nothing to do). Same rule as the Kịch bản page's "Duyệt hết đã dịch" button
 * (`ScriptPrep.tsx:317-322`): a row without a translation is never approved, because the matcher would
 * speak an empty line onto the audience wall.
 */
export function approveTranslatedRows(selectedEventId: string): number {
    const eventId = scriptEventKey(selectedEventId);
    let all: ScriptEntry[] = [];
    try { all = getScriptLocal(eventId); } catch { return 0; }
    const n = all.filter((r) => r.status !== 'approved' && bothSides(r)).length;
    if (!n) return 0;
    writeScriptLocal(eventId, all.map((r) => (bothSides(r) ? { ...r, status: 'approved' as const } : r)));
    return n;
}
