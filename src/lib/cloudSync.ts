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
//
// PROMPT-16 — what that design still let through, and the guard that closes it.
//
// The asymmetry protects the machine you are sitting at. It does NOT protect the store: an automatic push
// is still an overwrite, and `schedule` is written whole (the Chương trình of every meeting rides inside
// it). So a second machine holding YESTERDAY's copy, whose operator fixes one typo, pushes its stale list
// four seconds later and the Timeline built on the first machine is gone from the store with no warning
// anywhere. The manifest could already have said "a different machine wrote this" — but only on the PULL
// screen, which nobody opens before typing.
//
// The guard is a compare-and-swap, decided by the SERVER because only the server sees the true order:
// every push carries the `savedAt` this browser last saw for that item (its BASE), and the server refuses
// with 409 if the stored copy has moved on since. Refusing is the whole point — the push does not "win by
// being last", it stops and says pull first. Bases live in `proyaku_cloud_base`, one number per item.
//
// Two consequences worth stating, because both are deliberate:
//   · A machine that has NEVER seen the store cannot overwrite it (base 0 ⇒ allowed only when the stored
//     copy carries this same machine's id). Coming to a store cold and blanking it is exactly the accident.
//   · A refused push is LOUD. Silence would trade "your work vanished from the store" for "your work never
//     got there", which is the same loss with a nicer name — see `cloudAlert.ts`.

export type CloudKind = 'schedule' | 'speakers' | 'script' | 'docs' | 'settings';

/** The keys the four Chuẩn bị modules actually use. Per-event kinds carry the `<eventId>` suffix. */
export const CLOUD_KEYS = {
    schedule: 'proyaku_schedule',
    speakers: 'proyaku_speakers',
    script: 'proyaku_script',   // real key is `proyaku_script:<eventId>`
    docs: 'proyaku_docs',       // real key is `proyaku_docs:<eventId>`
} as const;

/**
 * PROMPT-16 — the settings that describe the MEETING, and therefore belong to everyone.
 *
 * A name ending in `:` is a prefix: every key starting with it travels (that is how the per-scope AI
 * context boxes are carried without listing them one by one).
 *
 * What is NOT here matters more than what is. These stay on the machine that owns them, forever:
 *   · anything about this machine's hardware — `proyaku_audio_profiles`, `proyaku_audio_labels`,
 *     `proyaku_audio_vol`, `proyaku_speaker`, `proyaku_online_mic_sense`, `proyaku_online_loud_gate`.
 *     A microphone threshold tuned for the hall's lectern is actively wrong on a laptop in an office;
 *     copying it across would be worse than losing it.
 *   · `proyaku_activation`, `proyaku_cloud_device` — this browser's identity, not a setting.
 *   · `proyaku_capscale`, `proyaku_rail_collapsed` — how THIS operator likes their own screen.
 *   · `proyaku_migrated_events`, `proyaku_series_migrated`, `proyaku_script_sync` — bookkeeping for
 *     one-time migrations. Carrying them over would tell a fresh machine a migration already ran.
 *   · `proyaku_active_event` — which meeting this machine is looking at right now. Tempting, and wrong:
 *     two people preparing two meetings at once would yank each other's screen sideways, and every yank
 *     would be a settings push, so the pair would spend the afternoon refusing each other.
 */
export const SETTINGS_KEYS: readonly string[] = [
    'proyaku_conference_mode',
    'proyaku_online_two_way',
    'proyaku_online_voice_ja',
    'proyaku_online_voice_vi',
    'proyaku_online_speed_mode',
    'proyaku_online_manual_speed',
    'proyaku_online_speech_rhythm',
    'proyaku_online_guided_match',
    'proyaku_online_subtitle_font',
    'proyaku_online_wall_outputs',
    'proyaku_online_wall_char_cm',
    'proyaku_subtitle_outputs',
    'proyaku_series',
    'proyaku_prep',
    'proyaku_prep_ai:',
    'proyaku_tts',
];

const DEVICE_KEY = 'proyaku_cloud_device';
const BASE_KEY = 'proyaku_cloud_base';
const PUSH_DEBOUNCE_MS = 4_000;

/**
 * A failed push used to sit still until the next edit. That is the four-second hole: close the tab inside
 * the debounce, or lose the network for a minute, and the store simply never hears about the edit — while
 * the screen says "sẽ tự thử lại", which was not true. These are the retries that make it true.
 * Finite on purpose: after the last one the panel says so, rather than a spinner that never resolves.
 */
const RETRY_MS = [5_000, 15_000, 45_000, 120_000, 300_000];

/** How often the shared settings are re-read to notice a change. See `startSettingsWatch`. */
export const SETTINGS_POLL_MS = 5_000;

/**
 * A file's mtime and the `savedAt` written inside it are taken microseconds apart, and the per-event
 * manifest can only report the mtime. Without a little slack, this machine's OWN push reads back as
 * "somebody else got there first". Five seconds is far below the gap between two humans editing.
 */
const NEWER_SLACK_MS = 5_000;

export type CloudStatus = 'idle' | 'pushing' | 'pulling' | 'ok' | 'offline' | 'error' | 'conflict';

export type CloudState = {
    status: CloudStatus;
    /** Local edits made since the last successful push. Empty means the store has everything. */
    pending: CloudKind[];
    lastPushAt: number;
    lastPullAt: number;
    message: string;
    /** The store moved on under us: a push was refused, or the manifest is ahead of our bases. */
    remoteNewer: boolean;
    /** Which machine wrote the copy that is now in the way. Empty when we do not know. */
    remoteBy: string;
};

let state: CloudState = {
    status: 'idle', pending: [], lastPushAt: 0, lastPullAt: 0, message: '',
    remoteNewer: false, remoteBy: '',
};
const listeners = new Set<(s: CloudState) => void>();
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryCount = 0;

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

// ---- PROMPT-16: bases, the one number that makes a push refusable ----

type Bases = Record<string, number>;

function readBases(): Bases {
    try {
        const raw = localStorage.getItem(BASE_KEY);
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Bases) : {};
    } catch {
        return {};
    }
}

/** The `savedAt` this browser last saw for one item. 0 means "never seen it", which the server treats strictly. */
export function baseOf(id: string): number {
    const at = readBases()[id];
    return typeof at === 'number' && at > 0 ? at : 0;
}

/**
 * Record what the store now holds for one item. `0` FORGETS the base rather than storing a zero — a
 * server that saved but answered something unreadable must leave us in the honest "never seen it" state,
 * not in a wrong one. From there the same-machine rule still lets this browser push.
 */
export function setBase(id: string, at: number): void {
    try {
        const all = readBases();
        if (typeof at === 'number' && at > 0) all[id] = at; else delete all[id];
        localStorage.setItem(BASE_KEY, JSON.stringify(all));
    } catch { /* private mode: every push is then a first push, which the server judges by savedBy */ }
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

/**
 * The shared settings as they stand right now, raw strings exactly as stored. Raw on purpose: this file
 * has no business knowing that `proyaku_tts` is an object and `proyaku_online_two_way` is a flag, and the
 * moment it did, every settings change would need a change here too.
 */
export function settingsSnapshot(): Record<string, string> {
    const out: Record<string, string> = {};
    try {
        const exact = new Set(SETTINGS_KEYS.filter((k) => !k.endsWith(':')));
        const prefixes = SETTINGS_KEYS.filter((k) => k.endsWith(':'));
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (exact.has(key) || prefixes.some((p) => key.startsWith(p))) {
                const raw = localStorage.getItem(key);
                if (raw !== null) out[key] = raw;
            }
        }
    } catch { /* private mode → nothing to sync */ }
    return out;
}

async function api(path: string, init?: RequestInit): Promise<Response> {
    return fetch(path, { credentials: 'same-origin', ...init });
}

/**
 * `conflict` is not a failure of ours and must never be retried — retrying would 409 forever. `refused`
 * is the server saying no for some other reason. A thrown error is the network, and the caller says so.
 */
type PutOutcome = 'ok' | 'conflict' | 'refused';

async function putJson(path: string, body: Record<string, unknown>, baseId: string): Promise<PutOutcome> {
    const r = await api(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, baseSavedAt: baseOf(baseId) }),
    });
    if (r.status === 409) {
        try {
            const out = (await r.json()) as { savedBy?: string };
            emit({ remoteNewer: true, remoteBy: typeof out?.savedBy === 'string' ? out.savedBy : '' });
        } catch {
            emit({ remoteNewer: true });
        }
        return 'conflict';
    }
    if (!r.ok) return 'refused';
    try {
        const out = (await r.json()) as { savedAt?: number };
        setBase(baseId, typeof out?.savedAt === 'number' ? out.savedAt : 0);
    } catch {
        setBase(baseId, 0); // saved, but we cannot prove what to; forget rather than remember wrongly
    }
    return 'ok';
}

/** One kind, one push. Throws when the network is the problem, so the caller can say "offline". */
async function pushKind(kind: CloudKind): Promise<PutOutcome> {
    const by = deviceId();
    if (kind === 'schedule' || kind === 'speakers') {
        const field = kind === 'schedule' ? 'conferences' : 'profiles';
        return putJson(`/online-api/prep/${kind}`, { [field]: readLocal(CLOUD_KEYS[kind], []), savedBy: by }, kind);
    }
    if (kind === 'settings') {
        return putJson('/online-api/prep/settings', { values: settingsSnapshot(), savedBy: by }, 'settings');
    }
    // Per-event: one request per event this browser knows about. An event with nothing stored is simply
    // not sent — pushing an empty list would blank a copy another machine had filled in.
    let worst: PutOutcome = 'ok';
    for (const eventId of localEventIds(kind)) {
        const rows = readLocal<unknown[]>(`${CLOUD_KEYS[kind]}:${eventId}`, []);
        if (!rows.length) continue;
        const out = await putJson(`/online-api/prep/event/${kind}`, { eventId, rows, savedBy: by }, `${kind}:${eventId}`);
        // A conflict on ONE event still means this kind must not be called saved, and outranks a plain
        // refusal: it is the one outcome with an action attached.
        if (out === 'conflict') worst = 'conflict';
        else if (out === 'refused' && worst === 'ok') worst = 'refused';
    }
    return worst;
}

function clearRetry(): void {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
}

/**
 * Push everything that changed. Safe to call often — it is debounced by `markCloudDirty`, and a failure
 * now schedules its own retry instead of waiting for the operator to type something else.
 */
export async function pushNow(): Promise<void> {
    const kinds = state.pending.length
        ? [...state.pending]
        : (['schedule', 'speakers', 'script', 'docs', 'settings'] as CloudKind[]);
    clearRetry();
    emit({ status: 'pushing', message: 'Đang lưu lên kho chung…' });
    const failed: CloudKind[] = [];
    const blocked: CloudKind[] = [];
    let networkDown = false;
    for (const kind of kinds) {
        try {
            const out = await pushKind(kind);
            if (out === 'conflict') blocked.push(kind);
            else if (out === 'refused') failed.push(kind);
        } catch {
            failed.push(kind);
            networkDown = true;
        }
    }
    // A conflict outranks everything else on the screen: it is the only outcome the operator can act on,
    // and the only one where trying again by itself makes things worse rather than better.
    if (blocked.length) {
        emit({
            status: 'conflict',
            pending: [...blocked, ...failed],
            remoteNewer: true,
            message: 'Kho chung có bản mới hơn — hãy lấy về trước khi lưu',
        });
        return;
    }
    if (failed.length) {
        retryCount += 1;
        const wait = RETRY_MS[Math.min(retryCount - 1, RETRY_MS.length - 1)];
        const more = retryCount <= RETRY_MS.length;
        if (more) retryTimer = setTimeout(() => { retryTimer = null; void pushNow(); }, wait);
        emit({
            status: networkDown ? 'offline' : 'error',
            pending: failed,
            message: more
                ? (networkDown ? 'Chưa với tới kho chung — sẽ tự thử lại' : 'Kho chung từ chối lưu — sẽ tự thử lại')
                : 'Vẫn chưa lưu được lên kho chung — hãy bấm "Lưu lên kho chung ngay"',
        });
        return;
    }
    retryCount = 0;
    emit({ status: 'ok', pending: [], lastPushAt: Date.now(), message: 'Đã lưu lên kho chung', remoteNewer: false, remoteBy: '' });
}

/** Called by the four modules after a local write. Coalesces a burst of edits into one push. */
export function markCloudDirty(kind: CloudKind): void {
    const pending = state.pending.includes(kind) ? state.pending : [...state.pending, kind];
    emit({ pending, status: state.status === 'pushing' ? state.status : 'idle' });
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { pushTimer = null; void pushNow(); }, PUSH_DEBOUNCE_MS);
}

/**
 * Notice a settings change without asking fifteen modules to report one.
 *
 * The four Chuẩn bị modules call `markCloudDirty` themselves because there are four of them. The shared
 * settings are written from a dozen places that have nothing else in common, and threading a call through
 * every one of them is a dozen chances to forget — the kind of omission that shows up as "that one slider
 * never syncs" months later. Re-reading a handful of short strings every few seconds costs nothing
 * measurable and cannot be forgotten.
 */
export function startSettingsWatch(): () => void {
    let last = JSON.stringify(settingsSnapshot());
    const timer = setInterval(() => {
        const now = JSON.stringify(settingsSnapshot());
        if (now === last) return;
        last = now;
        markCloudDirty('settings');
    }, SETTINGS_POLL_MS);
    return () => clearInterval(timer);
}

export type CloudManifest = {
    schedule: { count: number; savedAt: number; savedBy: string };
    speakers: { count: number; savedAt: number; savedBy: string };
    settings: { count: number; savedAt: number; savedBy: string };
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
 * Never called on its own — only from a button, or from `adoptFromCloudIfEmpty` when there is provably
 * nothing on this machine to lose. It writes localStorage directly, exactly as the four modules would,
 * and the caller then reloads: every page in this app read its data synchronously at mount, so the only
 * honest way to make them all agree with the new data is to start again. Half the screens holding
 * yesterday's schedule would be worse than a reload.
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
        setBase('schedule', Number(schedule?.savedAt) || 0);
        setBase('speakers', Number(speakers?.savedAt) || 0);
        for (const kind of ['script', 'docs'] as const) {
            for (const row of manifest[kind]) {
                const r = await api(`/online-api/prep/event/${kind}?eventId=${encodeURIComponent(row.eventId)}`);
                if (!r.ok) continue;
                const payload = await r.json();
                localStorage.setItem(`${CLOUD_KEYS[kind]}:${row.eventId}`, JSON.stringify(payload?.rows ?? []));
                setBase(`${kind}:${row.eventId}`, Number(payload?.savedAt) || Number(row.savedAt) || 0);
            }
        }
        // Settings come down LAST and only if the store actually has some. An empty `values` is the store
        // saying "nobody has pushed settings yet", and wiping a working console over that would be the
        // very accident this whole file is about.
        try {
            const settings = await (await api('/online-api/prep/settings')).json();
            const values = settings?.values;
            if (values && typeof values === 'object' && !Array.isArray(values) && Object.keys(values).length) {
                for (const [key, raw] of Object.entries(values as Record<string, unknown>)) {
                    if (typeof raw === 'string') localStorage.setItem(key, raw);
                }
                setBase('settings', Number(settings?.savedAt) || 0);
            }
        } catch { /* an older server has no settings route; the rest of the pull still stands */ }
        emit({
            status: 'ok', pending: [], lastPullAt: Date.now(), message: 'Đã lấy về xong',
            remoteNewer: false, remoteBy: '',
        });
        return true;
    } catch {
        emit({ status: 'error', message: 'Lấy về không xong — chưa thay đổi gì trên máy này' });
        return false;
    }
}

// ---- PROMPT-16: the two things that happen on their own at start-up ----

/**
 * Does this browser hold any Chuẩn bị data at all?
 *
 * An empty array counts as nothing: that is what a fresh machine and a machine whose operator deleted
 * everything both look like, and neither has anything to lose. When the question cannot be answered —
 * private mode, a throwing localStorage — the answer is YES. Guessing "empty" there would authorise an
 * automatic overwrite on the strength of a failure, which is the one place this file must never be brave.
 */
export function hasLocalPrep(): boolean {
    try {
        for (const key of [CLOUD_KEYS.schedule, CLOUD_KEYS.speakers]) {
            const raw = localStorage.getItem(key);
            if (raw && raw !== '[]' && raw !== 'null') return true;
        }
        return localEventIds('script').length > 0 || localEventIds('docs').length > 0;
    } catch {
        return true;
    }
}

/**
 * A machine opening the link for the first time gets the store, without being asked.
 *
 * This is the whole answer to "mở link trên máy khác là mất hết". It is safe precisely because it is
 * narrow: it runs only when there is provably nothing here, so the dreaded direction — the store
 * overwriting work in front of someone — cannot happen. A machine with ONE meeting on it is not empty and
 * is left alone; that operator still pulls by hand, having read what they are about to lose.
 */
export async function adoptFromCloudIfEmpty(): Promise<boolean> {
    if (hasLocalPrep()) return false;
    const manifest = await fetchManifest();
    if (!manifest) return false;
    const hasSomething = (manifest.schedule?.count ?? 0) > 0
        || (manifest.speakers?.count ?? 0) > 0
        || (manifest.script?.length ?? 0) > 0
        || (manifest.docs?.length ?? 0) > 0;
    if (!hasSomething) return false;
    return pullNow();
}

/**
 * The one-time handshake for a machine that was already syncing before bases existed.
 *
 * Without it, the machine that has been the only one pushing all along wakes up after this upgrade with
 * no bases, sees every event file dated later than nothing, and is told the store is ahead of it — about
 * its own work. The store itself settles the question: if the copy up there carries THIS machine's id,
 * this machine wrote it, and the current manifest is exactly what it has already seen.
 *
 * Runs only when there are no bases at all. Once one exists, the real comparison has something to stand on.
 */
function adoptBasesIfUnseen(manifest: CloudManifest, me: string): void {
    if (Object.keys(readBases()).length) return;
    const mine = manifest.schedule?.savedBy === me || manifest.speakers?.savedBy === me;
    if (!mine) return;
    for (const kind of ['schedule', 'speakers', 'settings'] as const) {
        const at = Number(manifest[kind]?.savedAt) || 0;
        if (at) setBase(kind, at);
    }
    for (const kind of ['script', 'docs'] as const) {
        for (const row of manifest[kind] ?? []) setBase(`${kind}:${row.eventId}`, Number(row.savedAt) || 0);
    }
}

/**
 * Has the store moved on since we last looked? Sets `remoteNewer` so the banner can say so BEFORE the
 * operator spends an hour editing a copy that will be refused.
 */
export async function checkRemoteNewer(): Promise<boolean> {
    const manifest = await fetchManifest();
    if (!manifest) return false;
    const me = deviceId();
    adoptBasesIfUnseen(manifest, me);
    const ahead = (id: string, at: number): boolean => at - baseOf(id) > NEWER_SLACK_MS;
    let by = '';
    let newer = false;
    for (const kind of ['schedule', 'speakers', 'settings'] as const) {
        const row = manifest[kind];
        // Our own writing coming back is not news. `savedBy` settles that far more cheaply than a clock.
        if (!row || !row.savedAt || row.savedBy === me) continue;
        if (ahead(kind, row.savedAt)) { newer = true; by = by || row.savedBy || ''; }
    }
    for (const kind of ['script', 'docs'] as const) {
        for (const row of manifest[kind] ?? []) {
            if (ahead(`${kind}:${row.eventId}`, row.savedAt)) newer = true;
        }
    }
    emit({ remoteNewer: newer, remoteBy: newer ? by : '' });
    return newer;
}
