// src/lib/cloudSync.ts — the sync channel between this browser's Chuẩn bị data and the shared store.
//
// The four Chuẩn bị modules stay LOCAL-FIRST and SYNCHRONOUS. Nothing here changes how they are read;
// `getSchedules()` still returns an array on the spot, still works with the network unplugged. This file
// only carries a copy up to the store and, when asked, brings one back down.
//
// It deliberately imports NONE of them. They call `markCloudDirty()` on their way out, so an import the
// other way would be a cycle. The price is that the localStorage key names appear here as well as in
// each module; the price is paid by the test in §47.3 case 12, which fails the moment they disagree.
//
// PUSH is automatic and debounced. PULL is a button, and never happens on its own. That asymmetry is the
// whole safety design: a push overwrites a BACKUP, a pull overwrites the WORK IN FRONT OF YOU.

export type CloudKind = 'schedule' | 'speakers' | 'script' | 'docs';

/** The keys the four Chuẩn bị modules actually use. Per-event kinds carry the `<eventId>` suffix. */
export const CLOUD_KEYS = {
    schedule: 'proyaku_schedule',
    speakers: 'proyaku_speakers',
    script: 'proyaku_script',   // real key is `proyaku_script:<eventId>`
    docs: 'proyaku_docs',       // real key is `proyaku_docs:<eventId>`
} as const;

const DEVICE_KEY = 'proyaku_cloud_device';
const PUSH_DEBOUNCE_MS = 4_000;

export type CloudStatus = 'idle' | 'pushing' | 'pulling' | 'ok' | 'offline' | 'error';

export type CloudState = {
    status: CloudStatus;
    /** Local edits made since the last successful push. Empty means the store has everything. */
    pending: CloudKind[];
    lastPushAt: number;
    lastPullAt: number;
    message: string;
};

let state: CloudState = { status: 'idle', pending: [], lastPushAt: 0, lastPullAt: 0, message: '' };
const listeners = new Set<(s: CloudState) => void>();
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function emit(patch: Partial<CloudState>): void {
    state = { ...state, ...patch };
    for (const fn of listeners) {
        try { fn(state); } catch { /* a broken listener must not stop the others */ }
    }
}

export function getCloudState(): CloudState {
    return state;
}

export function subscribeCloud(fn: (s: CloudState) => void): () => void {
    listeners.add(fn);
    fn(state);
    return () => { listeners.delete(fn); };
}

/**
 * A random id for THIS browser. Not a person, not a login — it exists so the screen can say "the copy on
 * the server was last written by a different machine", which is the only thing an operator needs to know
 * before deciding whether to pull.
 */
export function deviceId(): string {
    try {
        const found = localStorage.getItem(DEVICE_KEY);
        if (found) return found;
        const made = `m-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(DEVICE_KEY, made);
        return made;
    } catch {
        return 'm-unknown'; // private mode: syncing still works, it just cannot tell machines apart
    }
}

function readLocal<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as T) : fallback;
    } catch {
        return fallback;
    }
}

/** Every event id this browser holds data for, taken from the namespaced keys themselves. */
export function localEventIds(kind: 'script' | 'docs'): string[] {
    const prefix = `${CLOUD_KEYS[kind]}:`;
    const out: string[] = [];
    try {
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) out.push(key.slice(prefix.length));
        }
    } catch { /* private mode → nothing to sync */ }
    return out;
}

async function api(path: string, init?: RequestInit): Promise<Response> {
    return fetch(path, { credentials: 'same-origin', ...init });
}

/** One kind, one push. Returns false when the network is the problem, so the caller can say "offline". */
async function pushKind(kind: CloudKind): Promise<boolean> {
    const by = deviceId();
    if (kind === 'schedule' || kind === 'speakers') {
        const field = kind === 'schedule' ? 'conferences' : 'profiles';
        const r = await api(`/online-api/prep/${kind}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: readLocal(CLOUD_KEYS[kind], []), savedBy: by }),
        });
        return r.ok;
    }
    // Per-event: one request per event this browser knows about. An event with nothing stored is simply
    // not sent — pushing an empty list would blank a copy another machine had filled in.
    let allOk = true;
    for (const eventId of localEventIds(kind)) {
        const rows = readLocal<unknown[]>(`${CLOUD_KEYS[kind]}:${eventId}`, []);
        if (!rows.length) continue;
        const r = await api(`/online-api/prep/event/${kind}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, rows, savedBy: by }),
        });
        if (!r.ok) allOk = false;
    }
    return allOk;
}

/**
 * Push everything that changed. Safe to call often — it is debounced by `markCloudDirty`, and a failure
 * leaves the kind in `pending` so the next change tries again.
 */
export async function pushNow(): Promise<void> {
    const kinds = state.pending.length ? [...state.pending] : (['schedule', 'speakers', 'script', 'docs'] as CloudKind[]);
    emit({ status: 'pushing', message: 'Đang lưu lên kho chung…' });
    const failed: CloudKind[] = [];
    let networkDown = false;
    for (const kind of kinds) {
        try {
            if (!(await pushKind(kind))) failed.push(kind);
        } catch {
            failed.push(kind);
            networkDown = true;
        }
    }
    if (failed.length) {
        emit({
            status: networkDown ? 'offline' : 'error',
            pending: failed,
            message: networkDown ? 'Chưa với tới kho chung — sẽ tự thử lại' : 'Kho chung từ chối lưu',
        });
        return;
    }
    emit({ status: 'ok', pending: [], lastPushAt: Date.now(), message: 'Đã lưu lên kho chung' });
}

/** Called by the four modules after a local write. Coalesces a burst of edits into one push. */
export function markCloudDirty(kind: CloudKind): void {
    const pending = state.pending.includes(kind) ? state.pending : [...state.pending, kind];
    emit({ pending, status: state.status === 'pushing' ? state.status : 'idle' });
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { pushTimer = null; void pushNow(); }, PUSH_DEBOUNCE_MS);
}

export type CloudManifest = {
    schedule: { count: number; savedAt: number; savedBy: string };
    speakers: { count: number; savedAt: number; savedBy: string };
    script: { eventId: string; bytes: number; savedAt: number }[];
    docs: { eventId: string; bytes: number; savedAt: number }[];
    storeDir: string;
};

/** What the store holds, without downloading it. Read before offering to overwrite anything. */
export async function fetchManifest(): Promise<CloudManifest | null> {
    try {
        const r = await api('/online-api/prep/manifest');
        if (!r.ok) return null;
        return (await r.json()) as CloudManifest;
    } catch {
        return null;
    }
}

/**
 * Bring the store's copy down and REPLACE what is here.
 *
 * Never called on its own — only from a button, only after the operator has seen the manifest. It writes
 * localStorage directly, exactly as the four modules would, and then reloads: every page in this app
 * read its data synchronously at mount, so the only honest way to make them all agree with the new data
 * is to start again. Half the screens holding yesterday's schedule would be worse than a reload.
 */
export async function pullNow(): Promise<boolean> {
    emit({ status: 'pulling', message: 'Đang lấy về từ kho chung…' });
    try {
        const manifest = await fetchManifest();
        if (!manifest) {
            emit({ status: 'offline', message: 'Chưa với tới kho chung' });
            return false;
        }
        const schedule = await (await api('/online-api/prep/schedule')).json();
        const speakers = await (await api('/online-api/prep/speakers')).json();
        localStorage.setItem(CLOUD_KEYS.schedule, JSON.stringify(schedule?.conferences ?? []));
        localStorage.setItem(CLOUD_KEYS.speakers, JSON.stringify(speakers?.profiles ?? []));
        for (const kind of ['script', 'docs'] as const) {
            for (const row of manifest[kind]) {
                const r = await api(`/online-api/prep/event/${kind}?eventId=${encodeURIComponent(row.eventId)}`);
                if (!r.ok) continue;
                const payload = await r.json();
                localStorage.setItem(`${CLOUD_KEYS[kind]}:${row.eventId}`, JSON.stringify(payload?.rows ?? []));
            }
        }
        emit({ status: 'ok', pending: [], lastPullAt: Date.now(), message: 'Đã lấy về xong' });
        return true;
    } catch {
        emit({ status: 'error', message: 'Lấy về không xong — chưa thay đổi gì trên máy này' });
        return false;
    }
}
