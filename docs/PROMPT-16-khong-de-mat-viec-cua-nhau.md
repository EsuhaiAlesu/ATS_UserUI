# PROMPT-16 — Không để hai máy xoá mất việc của nhau

**Nền:** `dbbf8d6` (đầu `origin/develop` lúc viết). **Chạy trước hay sau PROMPT-14 và PROMPT-15 đều được** —
kiểm rồi: không một tệp nào trong PROMPT-16 trùng với hai bản kia.

## Chuyện đang xảy ra

PROMPT-12 làm cho **lưu lên kho là tự động**, còn **lấy về thì phải bấm**. Chỗ lệch đó bảo vệ cái máy
mình đang ngồi: lấy về là ghi đè việc trước mặt, nên phải bấm.

Nhưng nó **không bảo vệ cái kho**. Lưu lên cũng là ghi đè, và Lịch thì bị thay **trọn gói** — Chương
trình của mọi buổi nằm bên trong Lịch. Nên chuyện này xảy ra được, và không ai hay:

> Máy A dựng Chương trình xong, kho có ngay. Máy B **chưa lấy về**, trong máy còn bản hôm qua. Ai đó ngồi
> máy B sửa một chữ trong Lịch. Bốn giây sau máy B tự đẩy bản hôm qua lên, đè hết. **Chương trình máy A
> vừa dựng biến mất khỏi kho.** Không một dòng cảnh báo ở đâu cả.

## Bốn việc trong bản này

1. **Máy chủ từ chối ghi đè bản mới hơn.** Mỗi lần đẩy, máy gửi kèm cái mốc thời gian nó thấy lần cuối.
   Nếu trên kho đã đi xa hơn cái mốc đó thì tức là có máy khác vừa ghi vào giữa, và lần đẩy này sẽ xoá
   mất họ — nên máy chủ **từ chối**, trả mã 409, không ghi gì cả. Ba luật giữ cho nó chặt mà không phiền:
   kho **trống** thì không bao giờ là xung đột; **chưa có mốc** không phải là được phép (chỉ cho qua khi
   bản trên kho mang đúng tên máy đó); và mỗi lần ghi xong máy chủ **trả mốc mới về**, vì đó là cách duy
   nhất để máy gửi có mốc mà nhớ. Máy đang chạy ngon hôm nay **không cần làm gì cả** — luật thứ hai lo việc đó.
2. **Máy nào còn trắng thì tự lấy về.** Mở link lần đầu, trong máy chưa có gì, thì lấy luôn — không hỏi,
   vì không có gì để mất. Máy đã có dữ liệu thì **không** tự lấy, vẫn phải bấm như cũ. Đây chính là câu
   trả lời cho *"mở link ở máy khác là mất hết"*.
3. **Bị từ chối là phải kêu lên.** Một khung đỏ nhỏ ở góc dưới bên trái, hiện trên **mọi màn**, nói rõ kho
   đang giữ bản mới hơn và phải vào đâu để lấy về. Im lặng chỉ đổi *"việc của bạn biến mất khỏi kho"* lấy
   *"việc của bạn chưa bao giờ tới kho"* — mất y như nhau.
4. **Đẩy hụt thì tự thử lại.** Trước đây đẩy hỏng là nằm im chờ lần sửa sau, trong khi màn hình vẫn ghi
   "sẽ tự thử lại" — câu đó chưa đúng. Nay thử lại thật, 5 giây · 15 giây · 45 giây · 2 phút · 5 phút,
   rồi dừng hẳn và nói thẳng là phải bấm tay.

**Cộng thêm:** các **cài đặt chung của buổi** (cỡ màn tính bằng mét, chiều cao chữ, giọng đọc, nhịp nói,
bố trí phụ đề) từ nay cũng nằm trên kho, đi cùng đường với Lịch. Còn thứ thuộc về **riêng cái máy** —
micrô, loa, âm lượng, độ nhạy — thì **không bao giờ** đi đâu cả: một ngưỡng micrô chỉnh cho cái bục ở hội
trường mà đem sang laptop trong văn phòng thì còn tệ hơn là mất.

**Số:** 887 ca / 67 tệp  →  **919 ca / 68 tệp** (thêm 32 ca). `tsc` sạch, `npm run build` xanh,
`oxlint` 0 lỗi.

**Ba tệp test có sẵn bị sửa, và đây là lý do — không phải nới ca cho dễ đậu:**

| Tệp | Đổi gì | Vì sao |
|---|---|---|
| `tests/prepEndpoints.test.ts` | 3 → 4 nơi cắt `savedBy` | ca này ghim "MỌI nơi ghi đều cắt 40 ký tự". Thêm một nơi ghi (cài đặt chung) thì phải thêm vào đây — đó đúng là việc của nó. |
| `tests/prepEndpoints.test.ts` | thêm ca 11–15 | ca mới cho cái chốt, không đụng ca cũ. |
| `tests/sessionBoxes.test.ts` | 21 → 23 route, 5 → 7 route `prep/` | ca này đóng đinh **số route chính xác**, để không có đường dẫn nào lọt vào mà không ai biết. Thêm 2 route thì con số phải đổi, còn cái ghim thì vẫn nguyên. |

## TASK 93 — `src/lib/cloudSync.ts` (THAY TRỌN TỆP)

Kênh đồng bộ: nhớ mốc, gửi mốc, kêu lên khi bị từ chối. Thay toàn bộ nội dung tệp bằng khối dưới đây.

```ts
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
```

## TASK 94 — `src/lib/cloudAlert.ts` (TỆP MỚI)

Bảng cảnh báo "việc của bạn chưa lên kho".

```ts
// src/lib/cloudAlert.ts — the one thing on screen that says "your work is not reaching the store".
//
// WHY THIS IS NOT A REACT COMPONENT.
//
// The message has to be visible from every screen — the run console, the Timeline, Chuẩn bị — and the
// only place that could mount it for all of them is the shared layout, which is precisely the file three
// other pieces of work are editing at the same time. A banner appended to `document.body` needs nobody's
// permission and collides with nothing. It is forty lines of DOM against a merge conflict in the file
// every screen depends on.
//
// It also has to survive being wrong about styling: inline styles only, because Tailwind builds its sheet
// by scanning source for class names and a `.ts` file outside that scan would ship a banner with no
// colours — an invisible warning, which is worse than none.
//
// It appears for exactly two states and is otherwise absent from the DOM: a push the server REFUSED, and
// a store that is provably ahead of this machine. Anything more and it becomes the thing operators learn
// to ignore.

import { subscribeCloud, type CloudState } from './cloudSync';

const ID = 'proyaku-cloud-alert';

/** Deliberately not a link: a hard navigation would throw away whatever the operator was in the middle of. */
const SETTINGS_HINT = 'Vào Cài đặt → Dữ liệu → "Lấy từ kho chung về máy này".';

function textFor(s: CloudState): string {
    if (s.status === 'conflict') {
        const who = s.remoteBy ? ` (máy ${s.remoteBy})` : '';
        return `Chưa lưu được lên kho chung: trên kho đã có bản mới hơn${who}. ${SETTINGS_HINT}`;
    }
    if (s.remoteNewer) {
        return `Kho chung có bản mới hơn máy này. ${SETTINGS_HINT}`;
    }
    return '';
}

function box(): HTMLElement {
    const found = document.getElementById(ID);
    if (found) return found;
    const el = document.createElement('div');
    el.id = ID;
    el.setAttribute('role', 'status');
    el.style.cssText = [
        'position:fixed', 'left:16px', 'bottom:16px', 'z-index:2147483000',
        'max-width:min(420px, calc(100vw - 32px))',
        'padding:12px 14px', 'border-radius:12px',
        'background:#3a1212', 'color:#ffd9d9', 'border:1px solid #b3261e',
        'font:500 13px/1.5 system-ui, sans-serif',
        'box-shadow:0 8px 24px rgba(0,0,0,.45)',
        'display:flex', 'gap:10px', 'align-items:flex-start',
    ].join(';');
    const msg = document.createElement('span');
    msg.dataset.role = 'msg';
    msg.style.flex = '1';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '✕';
    close.setAttribute('aria-label', 'Đóng');
    close.style.cssText = 'background:none;border:0;color:inherit;cursor:pointer;font-size:14px;line-height:1;padding:2px';
    // Dismissing hides THIS message, not the next one: the state is still wrong, and the operator will be
    // told again the moment it changes. A permanent mute would be a silent failure with a checkbox.
    close.onclick = () => { el.remove(); };
    el.append(msg, close);
    document.body.append(el);
    return el;
}

function render(s: CloudState): void {
    const text = textFor(s);
    if (!text) {
        document.getElementById(ID)?.remove();
        return;
    }
    const el = box();
    const msg = el.querySelector('[data-role="msg"]');
    if (msg && msg.textContent !== text) msg.textContent = text;
}

/** Start watching. Returns the unsubscribe, so a test can take it back down. */
export function mountCloudAlert(): () => void {
    if (typeof document === 'undefined') return () => { };
    const off = subscribeCloud(render);
    return () => { off(); document.getElementById(ID)?.remove(); };
}
```

## TASK 95 — `src/lib/cloudBoot.ts` (TỆP MỚI)

Ba việc kênh đồng bộ tự làm lúc mở máy.

```ts
// src/lib/cloudBoot.ts — the three things the sync channel does on its own, and where they are allowed.
//
// Kept out of `main.tsx` so that file stays two lines longer than it was, and out of `cloudSync.ts` so
// that file stays importable by a test without a browser starting to talk to a server behind its back.
//
// NOT on the audience windows. `/wall` is a subtitle screen opened three times over on ceremony night;
// it holds no Chuẩn bị data, edits nothing, and the last thing it should do mid-sentence is reload itself
// because a store somewhere was empty. The check is on the PATH rather than on a flag, because the wall
// windows are opened by URL and there is nothing else to ask.

import { adoptFromCloudIfEmpty, checkRemoteNewer, startSettingsWatch } from './cloudSync';
import { mountCloudAlert } from './cloudAlert';

/** `/wall`, `/wall-mockup` and anything else under that prefix. */
export function isAudienceWindow(pathname: string): boolean {
    return pathname === '/wall' || pathname.startsWith('/wall/') || pathname.startsWith('/wall-');
}

/**
 * Never throws and never blocks the first paint: everything here is either instant and local (the
 * "is this machine empty" check reads two keys) or happens after the app is already on screen.
 */
export async function bootCloud(pathname = window.location.pathname): Promise<void> {
    if (isAudienceWindow(pathname)) return;
    mountCloudAlert();
    try {
        // A fresh machine takes the store and starts again with it. The reload is the honest move: every
        // page here read its data synchronously at mount, and this one mounted a moment ago on nothing.
        if (await adoptFromCloudIfEmpty()) {
            window.location.reload();
            return;
        }
        await checkRemoteNewer();
    } catch { /* a start-up nicety must never be the reason the app does not start */ }
    startSettingsWatch();
}
```

## TASK 96 — `src/main.tsx` (THAY TRỌN TỆP)

Gọi kênh đồng bộ lúc mở ứng dụng. Thay toàn bộ nội dung tệp bằng khối dưới đây.

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { migrateToEventScoped, migrateToSeries } from './lib/migrate'
import { bootCloud } from './lib/cloudBoot'

migrateToEventScoped()   // one-time, idempotent, never throws — moves script into event-scoped keys
migrateToSeries()        // one-time, idempotent — seeds proyaku_series=[] (doc 30); touches nothing else

// Not awaited: an empty machine takes a moment to fetch the store, and a machine that already has data
// answers without touching the network at all. Neither is worth delaying the first paint for.
void bootCloud()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

## TASK 97 — `server/onlineStore.mjs` (1 chỗ sửa)

Kho có thêm một tệp: cài đặt chung của buổi. 1 cặp khối: TÌM đoạn thứ nhất, THAY bằng đoạn thứ hai.

### 97.1 — TÌM

```js
  // same name it will mangle at next month's briefing — so one list, learned once, serves every meeting.
  mishearings: 'mishearings.json',
};

```

### 97.1 — THAY BẰNG

```js
  // same name it will mangle at next month's briefing — so one list, learned once, serves every meeting.
  mishearings: 'mishearings.json',
  // PROMPT-16 — the settings that describe the MEETING rather than the machine: wall sizes in metres,
  // character height, voices, speaking pace. Short strings, one small object, and the reason a second
  // machine no longer opens the link to a console that has forgotten how the hall is laid out. What
  // belongs to the hardware in front of one operator is NOT in here — see `SETTINGS_KEYS` on the client.
  settings: 'prep-settings.json',
};

```

## TASK 98 — `server/online-api.mjs` (7 chỗ sửa)

Luật từ chối ghi đè + cặp đường dẫn cài đặt chung. 7 cặp khối: TÌM đoạn thứ nhất, THAY bằng đoạn thứ hai.

### 98.1 — TÌM

```js
const logLine = (event, data) => console.log(JSON.stringify({ at: new Date().toISOString(), lane: 'online', event, ...data }));

function withTimeout(promise, timeoutMs, label) {
  let timer = null;
```

### 98.1 — THAY BẰNG

```js
const logLine = (event, data) => console.log(JSON.stringify({ at: new Date().toISOString(), lane: 'online', event, ...data }));

/**
 * PROMPT-16 — the compare-and-swap that stops a stale browser blanking the store.
 *
 * A push carries the `savedAt` that browser last saw for this item — its BASE. If the stored copy has
 * moved past that base, somebody else wrote in between and this push would erase them, so it is refused
 * with 409 and the operator is told to pull. THE SERVER decides, because only the server sees the true
 * order of two pushes; a client-side check is a race with a nicer name.
 *
 * A base of 0 means "this browser has never seen the store". That is not treated as permission: the write
 * is allowed only when the stored copy already carries this same browser's id, which is the one case
 * where overwriting cannot lose anybody's work. It is also what makes the very first deploy painless —
 * the machine that has been the only one pushing keeps pushing, base or no base.
 *
 * An EMPTY store never conflicts. Nothing is at risk, and a first push must not need a pull first.
 */
export const prepConflict = (stored, body, savedBy) => {
  const prevAt = typeof stored?.savedAt === 'number' ? stored.savedAt : 0;
  if (!prevAt) return false;
  const base = Number(body?.baseSavedAt);
  if (Number.isFinite(base) && base > 0) return base < prevAt;
  return (typeof stored?.savedBy === 'string' ? stored.savedBy : '') !== savedBy;
};

/** One shape for every refusal, so the client has exactly one thing to recognise. */
const sendPrepConflict = (res, stored) => sendJson(res, 409, {
  error: 'The shared store has a newer copy. Pull before saving.',
  conflict: true,
  savedAt: typeof stored?.savedAt === 'number' ? stored.savedAt : 0,
  savedBy: typeof stored?.savedBy === 'string' ? stored.savedBy : '',
});

function withTimeout(promise, timeoutMs, label) {
  let timer = null;
```

### 98.2 — TÌM

```js
          return true;
        }
        try {
          const bytes = await writeStore('schedule', {
            conferences: body.conferences,
            savedAt: Date.now(),
            savedBy: normalizeText(body?.savedBy).slice(0, 40),
          });
          sendJson(res, 200, { saved: true, bytes });
        } catch (error) {
          logLine('prep.schedule.save_fail', { message: String(error?.message ?? error).slice(0, 300) });
```

### 98.2 — THAY BẰNG

```js
          return true;
        }
        const savedBy = normalizeText(body?.savedBy).slice(0, 40);
        // The whole list is replaced here, and every meeting's Chương trình rides inside it — which is
        // exactly why this route, of the four, most needed the guard.
        const prev = await readStore('schedule', null);
        if (prepConflict(prev, body, savedBy)) {
          logLine('prep.schedule.conflict', { savedBy, storedBy: prev?.savedBy ?? '', base: Number(body?.baseSavedAt) || 0 });
          sendPrepConflict(res, prev);
          return true;
        }
        try {
          const savedAt = Date.now();
          const bytes = await writeStore('schedule', { conferences: body.conferences, savedAt, savedBy });
          sendJson(res, 200, { saved: true, bytes, savedAt });
        } catch (error) {
          logLine('prep.schedule.save_fail', { message: String(error?.message ?? error).slice(0, 300) });
```

### 98.3 — TÌM

```js
          return true;
        }
        try {
          const bytes = await writeStore('speakers', {
            profiles: body.profiles,
            savedAt: Date.now(),
            savedBy: normalizeText(body?.savedBy).slice(0, 40),
          });
          sendJson(res, 200, { saved: true, bytes });
        } catch (error) {
          logLine('prep.speakers.save_fail', { message: String(error?.message ?? error).slice(0, 300) });
```

### 98.3 — THAY BẰNG

```js
          return true;
        }
        const savedBy = normalizeText(body?.savedBy).slice(0, 40);
        const prev = await readStore('speakers', null);
        if (prepConflict(prev, body, savedBy)) {
          logLine('prep.speakers.conflict', { savedBy, storedBy: prev?.savedBy ?? '', base: Number(body?.baseSavedAt) || 0 });
          sendPrepConflict(res, prev);
          return true;
        }
        try {
          const savedAt = Date.now();
          const bytes = await writeStore('speakers', { profiles: body.profiles, savedAt, savedBy });
          sendJson(res, 200, { saved: true, bytes, savedAt });
        } catch (error) {
          logLine('prep.speakers.save_fail', { message: String(error?.message ?? error).slice(0, 300) });
```

### 98.4 — TÌM

```js
      }

      // The per-event pair. `kind` comes off the path and is checked against the same two names the store
      // knows — the store would refuse an unknown one anyway, but a 400 here is a better answer than a 500.
```

### 98.4 — THAY BẰNG

```js
      }

      // PROMPT-16 — the settings that belong to the MEETING, not to one machine: wall sizes in metres,
      // character height, voices, speaking pace. One flat object of raw strings, replaced whole.
      //
      // The server does not know or care what any key means, and must not start: the day it validates
      // `proyaku_online_voice_ja` is the day adding a setting means a deploy. It checks the shape (an
      // object of strings), the size, and nothing else.
      //
      // 1MB, not the 4MB of the two routes above — these are a dozen short strings, and the store itself
      // refuses anything over `STORE_MAX_BYTES` (1MB) regardless. A ceiling that matches the store's own
      // is the honest one; 4MB here would only mean reading 4MB before refusing it.
      if (pathname === '/online-api/prep/settings' && req.method === 'GET') {
        const stored = await readStore('settings', null);
        const values = stored?.values;
        sendJson(res, 200, {
          values: values && typeof values === 'object' && !Array.isArray(values) ? values : {},
          savedAt: typeof stored?.savedAt === 'number' ? stored.savedAt : 0,
          savedBy: typeof stored?.savedBy === 'string' ? stored.savedBy : '',
        });
        return true;
      }
      if (pathname === '/online-api/prep/settings' && req.method === 'PUT') {
        const body = await readJsonBody(req, 1024 * 1024);
        const values = body?.values;
        if (!values || typeof values !== 'object' || Array.isArray(values)) {
          sendJson(res, 400, { error: 'values must be an object.' });
          return true;
        }
        const clean = {};
        for (const [key, raw] of Object.entries(values)) {
          if (typeof key === 'string' && key.startsWith('proyaku_') && typeof raw === 'string') clean[key] = raw;
        }
        const savedBy = normalizeText(body?.savedBy).slice(0, 40);
        const prev = await readStore('settings', null);
        if (prepConflict(prev, body, savedBy)) {
          logLine('prep.settings.conflict', { savedBy, storedBy: prev?.savedBy ?? '', base: Number(body?.baseSavedAt) || 0 });
          sendPrepConflict(res, prev);
          return true;
        }
        try {
          const savedAt = Date.now();
          const bytes = await writeStore('settings', { values: clean, savedAt, savedBy });
          sendJson(res, 200, { saved: true, bytes, savedAt });
        } catch (error) {
          logLine('prep.settings.save_fail', { message: String(error?.message ?? error).slice(0, 300) });
          sendJson(res, 500, { error: 'Failed to save the settings.' });
        }
        return true;
      }

      // The per-event pair. `kind` comes off the path and is checked against the same two names the store
      // knows — the store would refuse an unknown one anyway, but a 400 here is a better answer than a 500.
```

### 98.5 — TÌM

```js
          return true;
        }
        try {
          const bytes = await writeEventStore(kind, eventId, {
            rows: body.rows,
            savedAt: Date.now(),
            savedBy: normalizeText(body?.savedBy).slice(0, 40),
          });
          sendJson(res, 200, { saved: true, bytes });
        } catch (error) {
          // A rejected id is the caller's fault and must read as 400, not as "the server broke".
```

### 98.5 — THAY BẰNG

```js
          return true;
        }
        const savedBy = normalizeText(body?.savedBy).slice(0, 40);
        const prev = await readEventStore(kind, eventId, null);
        if (prepConflict(prev, body, savedBy)) {
          logLine('prep.event.conflict', { kind, savedBy, storedBy: prev?.savedBy ?? '', base: Number(body?.baseSavedAt) || 0 });
          sendPrepConflict(res, prev);
          return true;
        }
        try {
          const savedAt = Date.now();
          const bytes = await writeEventStore(kind, eventId, { rows: body.rows, savedAt, savedBy });
          sendJson(res, 200, { saved: true, bytes, savedAt });
        } catch (error) {
          // A rejected id is the caller's fault and must read as 400, not as "the server broke".
```

### 98.6 — TÌM

```js
        const schedule = await readStore('schedule', null);
        const speakers = await readStore('speakers', null);
        sendJson(res, 200, {
          schedule: {
```

### 98.6 — THAY BẰNG

```js
        const schedule = await readStore('schedule', null);
        const speakers = await readStore('speakers', null);
        const settings = await readStore('settings', null);
        sendJson(res, 200, {
          schedule: {
```

### 98.7 — TÌM

```js
            savedBy: typeof speakers?.savedBy === 'string' ? speakers.savedBy : '',
          },
          script: await listEventStore('script'),
          docs: await listEventStore('docs'),
```

### 98.7 — THAY BẰNG

```js
            savedBy: typeof speakers?.savedBy === 'string' ? speakers.savedBy : '',
          },
          // PROMPT-16. `count` is how many settings are stored, not how many exist — the client compares
          // `savedAt` and never reads this number for anything but a readout.
          settings: {
            count: settings?.values && typeof settings.values === 'object' ? Object.keys(settings.values).length : 0,
            savedAt: typeof settings?.savedAt === 'number' ? settings.savedAt : 0,
            savedBy: typeof settings?.savedBy === 'string' ? settings.savedBy : '',
          },
          script: await listEventStore('script'),
          docs: await listEventStore('docs'),
```

## TASK 99 — `src/components/CloudSyncPanel.tsx` (THAY TRỌN TỆP)

Màn Cài đặt → Dữ liệu nói thẳng khi kho mới hơn. Thay toàn bộ nội dung tệp bằng khối dưới đây.

```tsx
// src/components/CloudSyncPanel.tsx — the Chuẩn bị sync panel in Settings → Dữ liệu.
//
// PUSH is automatic; this panel only reports it. PULL is a button, and a two-step one: the operator sees
// WHAT is on the server before anything is overwritten. That asymmetry is deliberate — a push overwrites
// a backup, a pull overwrites the work in front of you, and the two do not deserve the same friction.
//
// Talks to `cloudSync` and to nothing else. It never imports schedule/script/docs/speakers: the whole
// point of the channel is that this screen does not need to know their shapes.

import React, { useEffect, useState } from 'react';
import {
    subscribeCloud, pushNow, pullNow, fetchManifest, deviceId,
    type CloudState, type CloudManifest,
} from '../lib/cloudSync';

const BTN = 'inline-flex items-center gap-2 px-4 py-2 rounded-full font-label-caps text-label-caps transition-colors';

const hhmm = (ms: number): string => {
    if (!ms) return '';
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * One sentence per state, in the operator's language — during a ceremony nobody reads two.
 *
 * PROMPT-16: `conflict` comes first because it is the only state with something to DO, and it uses the
 * message the channel itself put there rather than a second wording that could drift away from it.
 */
function statusLine(s: CloudState): string {
    if (s.status === 'conflict') return s.message || 'Kho chung có bản mới hơn — hãy lấy về trước khi lưu';
    if (s.status === 'pushing') return 'Đang lưu…';
    if (s.status === 'pulling') return 'Đang lấy về…';
    if (s.status === 'offline' || s.status === 'error') return s.message || 'Chưa lưu được lên kho chung';
    if (s.pending.length) return `Còn ${s.pending.length} thay đổi chưa lưu`;
    if (s.lastPushAt) return `Đã lưu lên kho chung lúc ${hhmm(s.lastPushAt)}`;
    return 'Chưa có thay đổi nào cần lưu';
}

const CloudSyncPanel: React.FC = () => {
    const [state, setState] = useState<CloudState | null>(null);
    const [manifest, setManifest] = useState<CloudManifest | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => subscribeCloud(setState), []);

    // ONE look at the server on mount, only to fill the "kho chung đang có N buổi" line. A failure here is
    // not worth a toast: the panel is still usable and pushing still works.
    useEffect(() => {
        let alive = true;
        void fetchManifest().then((m) => { if (alive) setManifest(m); });
        return () => { alive = false; };
    }, []);

    const askPull = async () => {
        setBusy(true);
        const m = await fetchManifest();
        setBusy(false);
        setManifest(m);
        setConfirming(Boolean(m));
    };

    const doPull = async () => {
        setBusy(true);
        const ok = await pullNow();
        setBusy(false);
        // Every page in this app reads its data SYNCHRONOUSLY at mount, and nothing tells an open
        // SchedulePlanner that the schedule changed under it. Half the screens holding yesterday's data
        // would be worse than one reload. See PROMPT-12 §47.2.
        if (ok) window.location.reload();
    };

    const me = deviceId();
    const savedBy = manifest?.schedule?.savedBy || manifest?.speakers?.savedBy || '';
    const mine = Boolean(savedBy) && savedBy === me;

    return (
        <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">
                Lịch, chương trình, kịch bản, tài liệu, diễn giả và các cài đặt chung của buổi được{' '}
                <strong>tự lưu</strong> lên kho chung vài giây sau khi sửa. Lấy về thì phải bấm — vì lấy về là{' '}
                <strong>ghi đè</strong> thứ đang có trên máy này.
            </p>
            <p className="text-xs text-on-surface-variant leading-relaxed">
                Máy nào mở lần đầu, chưa có gì, sẽ <strong>tự lấy về</strong> — không hỏi, vì không có gì để mất.
                Máy đã có dữ liệu cũ thì không: nếu trên kho có bản mới hơn, máy này sẽ bị{' '}
                <strong>từ chối lưu</strong> cho tới khi lấy về, để không ghi đè mất việc của máy khác.
            </p>

            <div className={`text-sm ${state?.status === 'conflict' ? 'text-error font-semibold' : 'text-on-surface'}`}>
                {state ? statusLine(state) : '…'}
            </div>

            {/* PROMPT-16 — the state that used to be invisible. A push the store refused leaves the edit on
                this machine only, and the operator has no way to know unless they are told here, loudly,
                with the one action that fixes it. */}
            {state && (state.status === 'conflict' || state.remoteNewer) && (
                <div className="rounded-xl border border-error p-3 text-sm text-error leading-relaxed">
                    Kho chung đang giữ một bản <strong>mới hơn</strong> bản trên máy này
                    {state.remoteBy ? ` (máy ${state.remoteBy} lưu sau cùng)` : ''}.{' '}
                    {state.status === 'conflict'
                        ? 'Máy này KHÔNG được ghi đè lên đó, nên thay đổi vừa rồi chưa lên kho.'
                        : 'Sửa tiếp ở đây rồi lưu sẽ bị từ chối.'}{' '}
                    Hãy bấm <strong>Lấy từ kho chung về máy này</strong> trước — nhưng nhớ là lấy về sẽ ghi đè
                    những gì đang có ở đây.
                </div>
            )}

            {manifest && (
                <div className="text-xs text-on-surface-variant leading-relaxed">
                    Kho chung đang có: <strong>{manifest.schedule.count}</strong> buổi ·{' '}
                    <strong>{manifest.speakers.count}</strong> diễn giả ·{' '}
                    <strong>{manifest.script.length}</strong> sự kiện có kịch bản ·{' '}
                    <strong>{manifest.docs.length}</strong> sự kiện có tài liệu ·{' '}
                    <strong>{manifest.settings?.count ?? 0}</strong> cài đặt chung
                    {manifest.schedule.savedAt ? ` · lưu lần cuối lúc ${hhmm(manifest.schedule.savedAt)}` : ''}
                    {savedBy ? (mine ? ' · bản trên kho do chính máy này lưu' : ` · lưu bởi máy khác (${savedBy})`) : ''}
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                <button onClick={() => { void pushNow(); }} disabled={busy}
                    className={`${BTN} border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary disabled:opacity-50`}>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">cloud_upload</span>Lưu lên kho chung ngay
                </button>
                <button onClick={() => { void askPull(); }} disabled={busy}
                    className={`${BTN} border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary disabled:opacity-50`}>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">cloud_download</span>Lấy từ kho chung về máy này
                </button>
            </div>

            {confirming && manifest && (
                <div className="card-lux border border-error rounded-xl p-4 space-y-3">
                    <div className="text-sm text-on-surface">
                        Sẽ lấy về: <strong>{manifest.schedule.count}</strong> buổi ·{' '}
                        <strong>{manifest.speakers.count}</strong> diễn giả ·{' '}
                        <strong>{manifest.script.length}</strong> kịch bản ·{' '}
                        <strong>{manifest.docs.length}</strong> bộ tài liệu.
                        {mine
                            ? ' Bản trên kho do chính máy này lưu.'
                            : savedBy ? ` Bản trên kho do máy khác lưu (${savedBy}).` : ''}
                    </div>
                    <div className="text-sm text-error leading-relaxed">
                        Việc này sẽ <strong>GHI ĐÈ</strong> lịch, chương trình, kịch bản, tài liệu, diễn giả và
                        các cài đặt chung đang có trên máy này. Không lấy lại được.
                        <br />
                        Micrô, loa, độ nhạy và âm lượng của <strong>riêng máy này</strong> thì không bị đụng tới.
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => { void doPull(); }} disabled={busy}
                            className={`${BTN} border border-error text-error hover:bg-error/10 disabled:opacity-50`}>
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">warning</span>Tôi hiểu, ghi đè máy này
                        </button>
                        <button onClick={() => setConfirming(false)} disabled={busy}
                            className={`${BTN} border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary disabled:opacity-50`}>
                            Thôi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CloudSyncPanel;
```

## TASK 100 — `docs/ONLINE-LANE-CONTRACT.md` (2 chỗ sửa)

Hợp đồng: 409 và §17. 2 cặp khối: TÌM đoạn thứ nhất, THAY bằng đoạn thứ hai.

### 100.1 — TÌM

```markdown
# Online Lane Contract — v0.9 (2026-08-05)

> **v0.9 changelog (PROMPT-12 — the Chuẩn bị data stops being hostage to one browser):** five new routes
> under `/online-api/prep/*` (§12–§16), all behind the existing gate and all **off the live path**. The
```

### 100.1 — THAY BẰNG

```markdown
# Online Lane Contract — v1.0 (2026-08-05)

> **v1.0 changelog (PROMPT-16 — a push can now be REFUSED, and one more thing is shared):** every `PUT`
> under `/online-api/prep/*` accepts `baseSavedAt` and answers **`409`** when the stored copy has moved on
> since the sender last saw it (§12–§17), and every successful `PUT` now returns `savedAt` so the sender
> has a base to remember. One new pair, `GET/PUT /online-api/prep/settings` (§17), carries the settings
> that describe the MEETING — wall sizes in metres, character height, voices, speaking pace — while
> everything belonging to one machine's hardware stays put. `GET /online-api/prep/manifest` (§16) gains a
> `settings` block. Nothing here is on the live sentence path, and nothing about the offline lane changes.
>
> v0.9 made the store safe to pull from. It did not make it safe to push to: `schedule` is written whole,
> every meeting's Chương trình rides inside it, and a second machine holding yesterday's copy would
> overwrite the lot four seconds after its operator fixed a typo. The 409 is that hole closed.


> **v0.9 changelog (PROMPT-12 — the Chuẩn bị data stops being hostage to one browser):** five new routes
> under `/online-api/prep/*` (§12–§16), all behind the existing gate and all **off the live path**. The
```

### 100.2 — TÌM

```markdown
    - **Not `data/script.json`.** That is the Cascade Matcher channel on the OFFLINE backend (`pushToBackend` / `pullFromBackend`), a different destination for a different purpose. Both exist at once; neither replaces the other.
15. `GET /online-api/prep/event/docs?eventId=<id>` → `{ rows:[SourceDoc], savedAt, savedBy }`; `PUT` as §14. Documents are why the per-event store exists and why its ceiling is 8 MB per event rather than the 1 MB the global stores use: `docs.ts` keeps up to 256 KB of extracted text per file.
16. `GET /online-api/prep/manifest` → `{ schedule:{count,savedAt,savedBy}, speakers:{count,savedAt,savedBy}, script:[{eventId,bytes,savedAt}], docs:[{eventId,bytes,savedAt}], storeDir }`. What the store holds, without downloading it — the screen that offers to overwrite local work shows this first, because an operator is owed a list before a warning.

**About §12–§16.** `savedBy` is a random per-BROWSER id (`m-xxxxxx`), **not a person and not a login**: its only job is to let the screen say "the copy on the server came from a different machine". All five sit behind the same gate as everything else under `/online-api/*` and carry no authentication code of their own. **None of them is on the live sentence path** — if every one of them fails, Chuẩn bị merely stops syncing and the ceremony still runs from the browser's own `localStorage`.


**Storage.** §8, §9 and §10 are the only routes that persist anything. They share one small server-side JSON store: `DATA_DIR` names the directory (the deploy mounts a disk there); unset, it falls back to a local directory so a dev clone runs with nothing attached. Writes are atomic (temp file, then rename) and capped at 1 MB per file. No other route reads or writes it.

```

### 100.2 — THAY BẰNG

```markdown
    - **Not `data/script.json`.** That is the Cascade Matcher channel on the OFFLINE backend (`pushToBackend` / `pullFromBackend`), a different destination for a different purpose. Both exist at once; neither replaces the other.
15. `GET /online-api/prep/event/docs?eventId=<id>` → `{ rows:[SourceDoc], savedAt, savedBy }`; `PUT` as §14. Documents are why the per-event store exists and why its ceiling is 8 MB per event rather than the 1 MB the global stores use: `docs.ts` keeps up to 256 KB of extracted text per file.
16. `GET /online-api/prep/manifest` → `{ schedule:{count,savedAt,savedBy}, speakers:{count,savedAt,savedBy}, settings:{count,savedAt,savedBy}, script:[{eventId,bytes,savedAt}], docs:[{eventId,bytes,savedAt}], storeDir }`. What the store holds, without downloading it — the screen that offers to overwrite local work shows this first, because an operator is owed a list before a warning.
17. `GET /online-api/prep/settings` → `{ values:{ [key:string]: string }, savedAt, savedBy }`. `PUT` body `{ values, savedBy }` → `{ saved:true, bytes, savedAt }`; `400` when `values` is not a plain object. Request body limit **1 MB**, matching the store's own write ceiling — these are a dozen short strings, and a 4 MB limit would only mean reading 4 MB before refusing it.
    - `values` is a flat map of raw `localStorage` strings, and the server **does not know what any key means**. It keeps entries whose key starts with `proyaku_` and whose value is a string, and drops the rest. The day it starts validating individual settings is the day adding a setting needs a deploy.
    - Only the settings that describe the MEETING travel — wall sizes in metres, character height, voices, speaking pace, subtitle layout. Anything belonging to the hardware in front of one operator (microphone, speaker, volumes, sensitivity) is deliberately excluded on the client side and never sent. The authoritative list is `SETTINGS_KEYS` in `src/lib/cloudSync.ts`.

**About §12–§17.** `savedBy` is a random per-BROWSER id (`m-xxxxxx`), **not a person and not a login**: its only job is to let the screen say "the copy on the server came from a different machine". All six sit behind the same gate as everything else under `/online-api/*` and carry no authentication code of their own. **None of them is on the live sentence path** — if every one of them fails, Chuẩn bị merely stops syncing and the ceremony still runs from the browser's own `localStorage`.

**Refusing a stale write (§12, §13, §14/§15, §17).** Every `PUT` above accepts an optional `baseSavedAt`: the `savedAt` the sending browser last saw for that item. If the stored copy has moved past that base, some other machine wrote in between and this write would erase them, so it is refused with **`409 { error, conflict:true, savedAt, savedBy }`** and nothing is written. The client's job on a 409 is to say so and offer a pull — never to retry, which would only 409 again.

Three rules make this safe rather than merely strict:

- An **empty store never conflicts**. A first push must not require a pull first.
- **No `baseSavedAt`** is not permission. The write is allowed only when the stored copy already carries this same browser's id — the one case where overwriting cannot lose anybody's work. This is also what lets a machine that was already syncing before this existed keep syncing without any migration step.
- Every successful `PUT` returns **`savedAt`**, which is the only way the sender can record a base at all. A response the client cannot read leaves it with no base rather than a wrong one.

The comparison lives on the SERVER (`prepConflict` in `server/online-api.mjs`) because only the server sees the true order of two pushes. A client-side check is a race with a nicer name.


**Storage.** §8, §9 and §10 are the only routes that persist anything. They share one small server-side JSON store: `DATA_DIR` names the directory (the deploy mounts a disk there); unset, it falls back to a local directory so a dev clone runs with nothing attached. Writes are atomic (temp file, then rename) and capped at 1 MB per file. No other route reads or writes it.

```

## TASK 101 — `tests/prepEndpoints.test.ts` (THAY TRỌN TỆP)

Ca canh nguồn cho các đường dẫn kho chung. Thay toàn bộ nội dung tệp bằng khối dưới đây.

```ts
// TASK 46 — the four Chuẩn bị endpoint pairs, so a ceremony is not hostage to one browser.
//
// These are SOURCE GUARDS, not a booted server. `tests/sessionBoxes.test.ts` (PART 3) does boot the real
// handler over a real socket for the routes it owns; here the questions are all about SHAPE — which
// status a bad id produces, which body ceiling each route uses, whether any auth crept in — and reading
// the source answers those exactly, without a second HTTP fixture to keep in step.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SERVER = readFileSync(new URL('../server/online-api.mjs', import.meta.url), 'utf8');

/** The slice of the file that belongs to PROMPT-12, so "no auth here" means HERE and not elsewhere. */
const from = SERVER.indexOf('// ---- PROMPT-12: the Chuẩn bị data');
const to = SERVER.indexOf('// ---- TASK 19: the ONLINE glossary');
const PREP = SERVER.slice(from, to);

describe('prepEndpoints — bốn cặp có mặt', () => {
  it('1 · bốn đường dẫn đều có, cộng đường cài đặt chung của PROMPT-16', () => {
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    for (const p of ['/online-api/prep/schedule', '/online-api/prep/speakers', '/online-api/prep/event/',
      '/online-api/prep/manifest', '/online-api/prep/settings']) {
      expect(PREP, p).toContain(p);
    }
  });

  // MÂU THUẪN TRONG PROMPT (§46.2 vs §46.3 ca 2). Khối mã §46.2 mang nguyên văn chú thích
  // "These carry no auth code on purpose", mà ca 2 lại cấm chữ `auth` xuất hiện. Giữ MÃ, sửa CA — và
  // sửa đúng ý chứ không nới: điều cần chốt là không có MÃ xác thực, còn một dòng chú thích nói
  // "ở đây cố ý không có mã xác thực" thì ngược lại, nó chính là thứ ta muốn giữ. Nên bỏ chú thích
  // trước khi quét.
  it('2 · KHÔNG route nào tự dựng cổng đăng nhập — chúng thừa kế cổng', () => {
    const code = PREP
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .toLowerCase();
    for (const word of ['auth', 'password', 'cookie', 'login']) {
      expect(code, word).not.toContain(word);
    }
    // và chú thích giải thích lý do vẫn phải còn — nó là thứ chặn người sau "bổ sung cho chắc"
    expect(PREP).toContain('These carry no auth code on purpose');
  });

  it('10 · bốn route mới đứng TRƯỚC khối từ điển TASK 19', () => {
    expect(SERVER.indexOf('/online-api/prep/schedule')).toBeLessThan(SERVER.indexOf('TASK 19: the ONLINE glossary'));
  });
});

describe('prepEndpoints — trả lời đúng mã lỗi', () => {
  it('3 · kind lạ ở prep/event/ là 404, không phải 500', () => {
    expect(PREP).toContain("if (kind !== 'script' && kind !== 'docs') {");
    expect(PREP).toContain("sendJson(res, 404, { error: 'Unknown prep store.' });");
  });

  it('4 · thiếu eventId hoặc rows không phải mảng ⇒ 400', () => {
    expect(PREP).toContain("sendJson(res, 400, { error: 'Missing eventId.' });");
    expect(PREP).toContain("sendJson(res, 400, { error: 'rows must be an array.' });");
    // và hai route toàn cục cũng từ chối kiểu sai bằng 400
    expect(PREP).toContain("sendJson(res, 400, { error: 'conferences must be an array.' });");
    expect(PREP).toContain("sendJson(res, 400, { error: 'profiles must be an array.' });");
  });

  it('5 · lỗi "Invalid event id" của kho được dịch thành 400, không phải 500', () => {
    expect(PREP).toContain('/Invalid event id|Unknown event store/.test(message)');
    expect(PREP).toContain("sendJson(res, bad ? 400 : 500, { error: bad ? 'Invalid event id.' : 'Failed to save.' });");
  });
});

describe('prepEndpoints — ba trần khác nhau, cố ý', () => {
  it('6 · 4MB cho hai route toàn cục, 12MB cho route theo sự kiện, 1MB cho cài đặt chung', () => {
    const four = PREP.match(/readJsonBody\(req, 4 \* 1024 \* 1024\)/g) ?? [];
    expect(four).toHaveLength(2); // schedule + speakers
    expect(PREP).toContain('readJsonBody(req, 12 * 1024 * 1024)'); // docs cho phép 256KB mỗi tệp
    // PROMPT-16: cài đặt chung là chục chuỗi ngắn, và kho tự nó đã chặn ở STORE_MAX_BYTES = 1MB. Đặt
    // trần 4MB ở đây chỉ có nghĩa là đọc hết 4MB rồi mới từ chối.
    expect(PREP).toContain('readJsonBody(req, 1024 * 1024)');
  });
});

describe('prepEndpoints — cái màn hình cần để cảnh báo trước khi ghi đè', () => {
  it('7 · GET nào cũng trả savedAt và savedBy, có mặc định khi kho trống', () => {
    const gets = PREP.match(/savedAt: typeof stored\?\.savedAt === 'number' \? stored\.savedAt : 0,/g) ?? [];
    expect(gets.length).toBeGreaterThanOrEqual(3); // schedule · speakers · event
    const bys = PREP.match(/savedBy: typeof stored\?\.savedBy === 'string' \? stored\.savedBy : '',/g) ?? [];
    expect(bys.length).toBeGreaterThanOrEqual(3);
  });

  // Con số đổi 3 → 4 vì PROMPT-16 thêm MỘT nơi ghi nữa (cài đặt chung), không phải vì luật cắt đổi.
  // Ca này ghim "mọi nơi ghi đều cắt", nên thêm nơi ghi thì phải thêm vào đây — đó là việc của nó.
  it('8 · savedBy bị cắt ở 40 ký tự ở cả BỐN nơi ghi', () => {
    const cuts = PREP.match(/normalizeText\(body\?\.savedBy\)\.slice\(0, 40\)/g) ?? [];
    expect(cuts).toHaveLength(4); // schedule · speakers · settings · event
  });

  it('9 · manifest hỏi listEventStore cho CẢ HAI kind', () => {
    expect(PREP).toContain("script: await listEventStore('script'),");
    expect(PREP).toContain("docs: await listEventStore('docs'),");
    expect(PREP).toContain('storeDir: storeDir(),');
  });

  it('11 · manifest có thêm ô cài đặt chung, để màn hình đọc được kho đang giữ mấy mục', () => {
    expect(PREP).toContain("const settings = await readStore('settings', null);");
    expect(PREP).toContain('settings: {');
  });
});

// PROMPT-16 — cái chốt chặn đẩy đè. Vẫn là SOURCE GUARD: câu hỏi ở đây là "luật có nằm đúng chỗ không",
// còn luật chạy đúng hay không thì `tests/cloudConflict.test.ts` gọi thẳng hàm ra mà thử.
describe('prepEndpoints — không cho bản cũ đè bản mới', () => {
  it('12 · CẢ BỐN route ghi đều hỏi kho trước rồi mới ghi', () => {
    const asks = PREP.match(/if \(prepConflict\(prev, body, savedBy\)\) \{/g) ?? [];
    expect(asks).toHaveLength(4); // schedule · speakers · settings · event
    const refuse = PREP.match(/sendPrepConflict\(res, prev\);/g) ?? [];
    expect(refuse).toHaveLength(4);
  });

  it('13 · luật so sánh nằm ở MÁY CHỦ, và trả 409 chứ không phải 400 hay 500', () => {
    expect(SERVER).toContain('export const prepConflict = (stored, body, savedBy) => {');
    expect(SERVER).toContain('sendJson(res, 409, {');
    expect(SERVER).toContain('conflict: true,');
  });

  it('14 · mọi lần ghi đều trả savedAt về, nếu không máy gửi không có mốc nào để nhớ', () => {
    const backs = PREP.match(/sendJson\(res, 200, \{ saved: true, bytes, savedAt \}\);/g) ?? [];
    expect(backs).toHaveLength(4);
  });

  it('15 · kho TRỐNG thì không bao giờ là xung đột — lần đẩy đầu tiên không cần kéo về trước', () => {
    const rule = SERVER.slice(SERVER.indexOf('const prepConflict ='), SERVER.indexOf('const sendPrepConflict ='));
    expect(rule).toContain('if (!prevAt) return false;');
  });
});
```

## TASK 102 — `tests/sessionBoxes.test.ts` (1 chỗ sửa)

Số route đóng đinh 21 → 23. 1 cặp khối: TÌM đoạn thứ nhất, THAY bằng đoạn thứ hai.

### 102.1 — TÌM

```ts
      expect(CONTRACT).toContain(route);
    }
    // PROMPT-12 added the Chuẩn bị sync surface, so the pinned number moved 16 → 21. The guard itself is
    // unchanged in spirit: it still pins an EXACT count, so nothing can slip in unnoticed. Five of the six
    // new routes use `pathname === …`; `prep/event/` uses `startsWith` because the kind rides the path, so
    // it is pinned separately below rather than left unguarded.
    expect(SERVER_SRC.match(/pathname === '\/online-api\//g) ?? []).toHaveLength(21);
    // đúng MỘT route dùng startsWith. (Chỗ `startsWith('/online-api/')` trần ở đầu handler là cổng lọc
    // "có phải của mình không", không phải một route — nên mẫu dưới đòi có đường dẫn đi tiếp phía sau.)
    expect(SERVER_SRC.match(/pathname\.startsWith\('\/online-api\/\w/g) ?? []).toHaveLength(1);
    // and the five that moved the number are exactly the ones PROMPT-12 declared — not something else
    const prep = SERVER_SRC.match(/pathname === '\/online-api\/prep\/[a-z]+'/g) ?? [];
    expect(prep).toHaveLength(5); // schedule ×2, speakers ×2, manifest ×1
  });
});
```

### 102.1 — THAY BẰNG

```ts
      expect(CONTRACT).toContain(route);
    }
    // PROMPT-12 added the Chuẩn bị sync surface, so the pinned number moved 16 → 21; PROMPT-16 added the
    // shared-settings pair, 21 → 23. The guard itself is unchanged in spirit: it still pins an EXACT
    // count, so nothing can slip in unnoticed. `prep/event/` uses `startsWith` because the kind rides the
    // path, so it is pinned separately below rather than left unguarded.
    expect(SERVER_SRC.match(/pathname === '\/online-api\//g) ?? []).toHaveLength(23);
    // đúng MỘT route dùng startsWith. (Chỗ `startsWith('/online-api/')` trần ở đầu handler là cổng lọc
    // "có phải của mình không", không phải một route — nên mẫu dưới đòi có đường dẫn đi tiếp phía sau.)
    expect(SERVER_SRC.match(/pathname\.startsWith\('\/online-api\/\w/g) ?? []).toHaveLength(1);
    // and the ones that moved the number are exactly the ones PROMPT-12 and PROMPT-16 declared
    const prep = SERVER_SRC.match(/pathname === '\/online-api\/prep\/[a-z]+'/g) ?? [];
    expect(prep).toHaveLength(7); // schedule ×2, speakers ×2, settings ×2, manifest ×1
  });
});
```

## TASK 103 — `tests/cloudConflict.test.ts` (TỆP MỚI)

27 ca cho cái chốt chặn và ba việc đi kèm.

```ts
// PROMPT-16 — cái chốt chặn "máy cũ đè mất việc của máy mới", cộng ba việc đi kèm nó.
//
// PROMPT-12 làm cho đẩy lên là tự động và kéo về là phải bấm. Sự lệch đó bảo vệ CÁI MÁY đang ngồi. Nó
// không bảo vệ KHO: đẩy lên vẫn là ghi đè, và `schedule` bị thay trọn gói (Chương trình của mọi buổi nằm
// bên trong nó). Nên một máy thứ hai đang giữ bản hôm qua, sửa một chữ, bốn giây sau đẩy nguyên bản cũ
// lên — và Timeline dựng ở máy thứ nhất biến mất khỏi kho, không một dòng cảnh báo ở đâu cả.
//
// Đây là bộ ca cho cái chốt đó. Ba câu hỏi, theo đúng thứ tự quan trọng:
//   1. Máy chủ có TỪ CHỐI đúng lúc không, và có cho qua đúng lúc không (nâng cấp không được làm kẹt máy
//      đang chạy ngon)?
//   2. Máy gửi có nhớ mốc, có gửi mốc, và khi bị từ chối thì có KÊU LÊN không? Im lặng ở đây chỉ đổi
//      "việc của bạn biến mất khỏi kho" lấy "việc của bạn chưa bao giờ tới kho" — mất y như nhau.
//   3. Ba việc còn lại: đẩy hụt tự thử lại, máy trắng tự lấy về, và cài đặt chung đi theo buổi chứ không
//      theo cái máy.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---- một localStorage vừa đủ, và một fetch xem được (cùng khuôn với tests/cloudSync.test.ts) ----
function installLocalStorage(failWrites = false) {
  const map = new Map<string, string>();
  const ls = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { if (failWrites) throw new Error('private mode'); map.set(k, String(v)); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true, writable: true });
  return map;
}

/** Một localStorage NÉM LỖI ở mọi cửa — chế độ riêng tư, hoặc dung lượng đầy. */
function installBrokenLocalStorage() {
  const boom = () => { throw new Error('storage disabled'); };
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: boom, setItem: boom, removeItem: boom, clear: boom, key: boom, get length(): number { return boom(); } },
    configurable: true, writable: true,
  });
}

type Call = { url: string; init?: RequestInit };
function installFetch(handler: (url: string, init?: RequestInit) => unknown) {
  const calls: Call[] = [];
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const r = handler(String(url), init);
    if (r instanceof Error) return Promise.reject(r);
    const { ok = true, status = 200, body = {} } = (r ?? {}) as { ok?: boolean; status?: number; body?: unknown };
    return Promise.resolve({ ok, status, json: async () => body } as Response);
  }) as typeof fetch;
  return calls;
}

const bodyOf = (c: Call) => JSON.parse(String(c.init!.body)) as Record<string, unknown>;

/** Module mới mỗi ca: kênh giữ trạng thái ở phạm vi module. */
async function loadCloud() {
  vi.resetModules();
  return import('../src/lib/cloudSync');
}

let store: Map<string, string>;
const realFetch = globalThis.fetch;

beforeEach(() => { store = installLocalStorage(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); globalThis.fetch = realFetch; });

// ---------------------------------------------------------------------------
describe('luật ở MÁY CHỦ — ai được ghi đè lên ai', () => {
  const load = async () => (await import('../server/online-api.mjs')).prepConflict;

  it('1 · kho TRỐNG thì không bao giờ là xung đột — lần đẩy đầu không cần kéo về trước', async () => {
    const prepConflict = await load();
    expect(prepConflict(null, { baseSavedAt: 0 }, 'm-aaa')).toBe(false);
    expect(prepConflict({ savedAt: 0, savedBy: '' }, { baseSavedAt: 0 }, 'm-aaa')).toBe(false);
  });

  it('2 · mốc BẰNG bản trên kho ⇒ cho ghi (không ai chen vào giữa)', async () => {
    const prepConflict = await load();
    expect(prepConflict({ savedAt: 1_000, savedBy: 'm-bbb' }, { baseSavedAt: 1_000 }, 'm-aaa')).toBe(false);
  });

  it('3 · mốc CŨ HƠN bản trên kho ⇒ TỪ CHỐI — đây chính là cái chặn mất Chương trình', async () => {
    const prepConflict = await load();
    expect(prepConflict({ savedAt: 2_000, savedBy: 'm-bbb' }, { baseSavedAt: 1_000 }, 'm-aaa')).toBe(true);
  });

  it('4 · KHÔNG có mốc mà kho mang đúng tên máy này ⇒ cho ghi (bản cũ nâng cấp lên không bị kẹt)', async () => {
    const prepConflict = await load();
    expect(prepConflict({ savedAt: 2_000, savedBy: 'm-aaa' }, {}, 'm-aaa')).toBe(false);
  });

  it('5 · KHÔNG có mốc mà kho là của máy khác ⇒ TỪ CHỐI — máy lạ tới không được đè', async () => {
    const prepConflict = await load();
    expect(prepConflict({ savedAt: 2_000, savedBy: 'm-bbb' }, {}, 'm-aaa')).toBe(true);
    // và mốc rác cũng bị coi như không có mốc, chứ không được cho qua
    expect(prepConflict({ savedAt: 2_000, savedBy: 'm-bbb' }, { baseSavedAt: 'mới nhất' }, 'm-aaa')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('máy gửi — nhớ mốc, gửi mốc, và kêu lên khi bị từ chối', () => {
  it('6 · đẩy xong thì nhớ đúng savedAt máy chủ trả về, và lần sau gửi kèm nó', async () => {
    const c = await loadCloud();
    const calls = installFetch(() => ({ body: { saved: true, bytes: 12, savedAt: 777 } }));
    await c.pushNow();
    expect(c.baseOf('schedule')).toBe(777);

    const before = calls.length;
    await c.pushNow();
    const again = calls.slice(before).find((x) => x.url.includes('/prep/schedule'))!;
    expect(bodyOf(again).baseSavedAt).toBe(777);
  });

  it('7 · máy chủ trả 409 ⇒ trạng thái "conflict", biết kho mới hơn, và biết máy nào giữ', async () => {
    const c = await loadCloud();
    installFetch(() => ({ ok: false, status: 409, body: { conflict: true, savedAt: 900, savedBy: 'm-khac' } }));
    c.markCloudDirty('schedule');
    await c.pushNow();
    const s = c.getCloudState();
    expect(s.status).toBe('conflict');
    expect(s.remoteNewer).toBe(true);
    expect(s.remoteBy).toBe('m-khac');
    expect(s.pending).toContain('schedule'); // vẫn còn nợ, chưa lưu được
  });

  it('8 · 409 thì KHÔNG hẹn thử lại — thử lại chỉ 409 tiếp, và che mất câu cần đọc', async () => {
    const c = await loadCloud();
    const calls = installFetch(() => ({ ok: false, status: 409, body: { conflict: true } }));
    c.markCloudDirty('schedule');
    await vi.runAllTimersAsync();          // để cả nhịp gộp 4 giây lẫn mọi hẹn giờ khác chạy hết
    const tries = calls.filter((x) => x.url.includes('/prep/schedule')).length;
    expect(tries).toBe(1);
    expect(c.getCloudState().status).toBe('conflict');
  });

  it('9 · lưu xong mà đọc không ra savedAt ⇒ QUÊN mốc, chứ không nhớ bậy một con số tự bịa', async () => {
    const c = await loadCloud();
    installFetch(() => ({ body: { saved: true, bytes: 3 } })); // không có savedAt
    await c.pushNow();
    expect(c.baseOf('schedule')).toBe(0);
    // và mốc 0 vẫn đẩy được: máy chủ xử theo tên máy (ca 4)
    expect(c.getCloudState().status).toBe('ok');
  });

  it('10 · mỗi sự kiện có mốc RIÊNG — hai kịch bản không dùng chung một con số', async () => {
    const c = await loadCloud();
    store.set('proyaku_script:e1', JSON.stringify([{ id: 'r1' }]));
    store.set('proyaku_script:e2', JSON.stringify([{ id: 'r2' }]));
    let n = 100;
    installFetch(() => ({ body: { saved: true, savedAt: (n += 1) } }));
    c.markCloudDirty('script');
    await c.pushNow();
    expect(c.baseOf('script:e1')).toBeGreaterThan(0);
    expect(c.baseOf('script:e2')).toBeGreaterThan(0);
    expect(c.baseOf('script:e1')).not.toBe(c.baseOf('script:e2'));
  });
});

// ---------------------------------------------------------------------------
describe('đẩy hụt thì tự thử lại — cái lỗ bốn giây', () => {
  it('11 · mất mạng ⇒ có hẹn thử lại, và lần hẹn đó thật sự gọi lại', async () => {
    const c = await loadCloud();
    let fail = true;
    const calls = installFetch(() => (fail ? new Error('network down') : { body: { saved: true, savedAt: 5 } }));
    c.markCloudDirty('schedule');
    await c.pushNow();
    expect(c.getCloudState().status).toBe('offline');
    const after = calls.length;

    fail = false;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(calls.length).toBeGreaterThan(after);
    expect(c.getCloudState().status).toBe('ok');
  });

  it('12 · thử mãi vẫn hỏng thì DỪNG, và nói thẳng là phải bấm tay', async () => {
    const c = await loadCloud();
    installFetch(() => new Error('network down'));
    c.markCloudDirty('schedule');
    await vi.runAllTimersAsync();
    const s = c.getCloudState();
    expect(s.status).toBe('offline');
    expect(s.message).toContain('Lưu lên kho chung ngay');
  });

  it('13 · đẩy được rồi thì đếm lại từ đầu — lần hỏng sau vẫn được thử tử tế', async () => {
    const c = await loadCloud();
    let fail = true;
    installFetch(() => (fail ? new Error('down') : { body: { saved: true, savedAt: 9 } }));
    c.markCloudDirty('schedule');
    await c.pushNow();                       // hỏng lần 1
    fail = false;
    await vi.advanceTimersByTimeAsync(5_000); // thành công ⇒ bộ đếm về 0
    fail = true;
    c.markCloudDirty('schedule');
    await c.pushNow();                       // hỏng lại
    expect(c.getCloudState().message).toContain('sẽ tự thử lại');
  });
});

// ---------------------------------------------------------------------------
describe('máy còn trắng thì tự lấy về — và CHỈ khi còn trắng', () => {
  const manifestBody = (n: number) => ({
    body: { schedule: { count: n, savedAt: 1, savedBy: 'm-khac' }, speakers: { count: 0 }, settings: { count: 0 }, script: [], docs: [], storeDir: '/data' },
  });

  it('14 · máy ĐÃ CÓ dữ liệu ⇒ không tự lấy về, không đụng vào gì', async () => {
    const c = await loadCloud();
    store.set('proyaku_schedule', JSON.stringify([{ id: 'cua-toi' }]));
    installFetch(() => manifestBody(9));
    await expect(c.adoptFromCloudIfEmpty()).resolves.toBe(false);
    expect(store.get('proyaku_schedule')).toBe(JSON.stringify([{ id: 'cua-toi' }]));
  });

  it('15 · mảng RỖNG cũng là trắng — máy vừa xoá sạch không có gì để mất', async () => {
    const c = await loadCloud();
    store.set('proyaku_schedule', '[]');
    expect(c.hasLocalPrep()).toBe(false);
  });

  it('16 · máy trắng + kho cũng trống ⇒ không làm gì cả', async () => {
    const c = await loadCloud();
    installFetch(() => manifestBody(0));
    await expect(c.adoptFromCloudIfEmpty()).resolves.toBe(false);
  });

  it('17 · máy trắng + kho CÓ ⇒ lấy về, không hỏi (vì không có gì để mất)', async () => {
    const c = await loadCloud();
    installFetch((url) => {
      if (url.includes('/prep/manifest')) return manifestBody(2);
      if (url.includes('/prep/schedule')) return { body: { conferences: [{ id: 'tren-kho' }], savedAt: 55 } };
      if (url.includes('/prep/speakers')) return { body: { profiles: [], savedAt: 55 } };
      return { body: { values: {} } };
    });
    await expect(c.adoptFromCloudIfEmpty()).resolves.toBe(true);
    expect(store.get('proyaku_schedule')).toBe(JSON.stringify([{ id: 'tren-kho' }]));
    expect(c.baseOf('schedule')).toBe(55); // và nhớ luôn mốc, để lần đẩy sau không bị từ chối oan
  });

  it('18 · localStorage hỏng ⇒ coi như CÓ dữ liệu. Không bao giờ ghi đè dựa trên một lần đọc thất bại', async () => {
    installBrokenLocalStorage();
    const c = await loadCloud();
    expect(c.hasLocalPrep()).toBe(true);
    installFetch(() => manifestBody(9));
    await expect(c.adoptFromCloudIfEmpty()).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('cài đặt chung đi theo BUỔI, không theo cái máy', () => {
  it('19 · ảnh chụp lấy đúng khoá chung, kể cả nhóm khoá có tiền tố', async () => {
    const c = await loadCloud();
    store.set('proyaku_online_wall_outputs', '[{"id":"center"}]');
    store.set('proyaku_online_voice_ja', '"v1"');
    store.set('proyaku_prep_ai:buoi-1', '{"brief":"x"}');
    const snap = c.settingsSnapshot();
    expect(Object.keys(snap).sort()).toEqual(['proyaku_online_voice_ja', 'proyaku_online_wall_outputs', 'proyaku_prep_ai:buoi-1']);
  });

  it('20 · KHÔNG mang theo thứ của riêng máy — micrô, loa, âm lượng, độ nhạy', async () => {
    const c = await loadCloud();
    const riengMay = ['proyaku_audio_profiles', 'proyaku_audio_labels', 'proyaku_audio_vol', 'proyaku_speaker',
      'proyaku_online_mic_sense', 'proyaku_online_loud_gate', 'proyaku_activation', 'proyaku_cloud_device',
      'proyaku_capscale', 'proyaku_rail_collapsed', 'proyaku_active_event'];
    for (const k of riengMay) store.set(k, 'x');
    expect(Object.keys(c.settingsSnapshot())).toEqual([]);
    for (const k of riengMay) expect(c.SETTINGS_KEYS, k).not.toContain(k);
  });

  it('21 · đổi một cài đặt thì báo bẩn; không đổi gì thì im', async () => {
    const c = await loadCloud();
    store.set('proyaku_online_voice_ja', '"v1"');
    const stop = c.startSettingsWatch();
    await vi.advanceTimersByTimeAsync(c.SETTINGS_POLL_MS * 2);
    expect(c.getCloudState().pending).not.toContain('settings');

    store.set('proyaku_online_voice_ja', '"v2"');
    await vi.advanceTimersByTimeAsync(c.SETTINGS_POLL_MS);
    expect(c.getCloudState().pending).toContain('settings');
    stop();
  });

  it('22 · kéo về mà kho chưa có cài đặt nào ⇒ KHÔNG xoá cài đặt đang chạy trên máy này', async () => {
    const c = await loadCloud();
    store.set('proyaku_online_voice_ja', '"cua-may-nay"');
    installFetch((url) => {
      if (url.includes('/prep/manifest')) return { body: { schedule: {}, speakers: {}, settings: {}, script: [], docs: [], storeDir: '/d' } };
      if (url.includes('/prep/settings')) return { body: { values: {}, savedAt: 0 } };
      if (url.includes('/prep/schedule')) return { body: { conferences: [] } };
      return { body: { profiles: [] } };
    });
    await expect(c.pullNow()).resolves.toBe(true);
    expect(store.get('proyaku_online_voice_ja')).toBe('"cua-may-nay"');
  });

  it('23 · kho CÓ cài đặt thì ghi đè — đó là điểm của việc kéo về', async () => {
    const c = await loadCloud();
    store.set('proyaku_online_voice_ja', '"cu"');
    installFetch((url) => {
      if (url.includes('/prep/manifest')) return { body: { schedule: {}, speakers: {}, settings: {}, script: [], docs: [], storeDir: '/d' } };
      if (url.includes('/prep/settings')) return { body: { values: { proyaku_online_voice_ja: '"moi"' }, savedAt: 42 } };
      if (url.includes('/prep/schedule')) return { body: { conferences: [] } };
      return { body: { profiles: [] } };
    });
    await c.pullNow();
    expect(store.get('proyaku_online_voice_ja')).toBe('"moi"');
    expect(c.baseOf('settings')).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// Bảng cảnh báo: không có jsdom trong dự án này, và thêm nó là đụng package.json + lockfile. Dựng một DOM
// giả vừa đủ cho cái bảng — đúng cách các bộ ca sẵn có giả localStorage.
function installDom() {
  type El = {
    id: string; tagName: string; style: Record<string, string> & { cssText: string };
    dataset: Record<string, string>; children: El[]; textContent: string;
    setAttribute: (k: string, v: string) => void; append: (...kids: El[]) => void;
    remove: () => void; querySelector: (sel: string) => El | null;
    onclick?: () => void; type?: string;
  };
  const make = (tagName: string): El => {
    const el: El = {
      id: '', tagName, style: { cssText: '' } as El['style'], dataset: {}, children: [], textContent: '',
      setAttribute() { /* chỉ để không nổ */ },
      append(...kids) { for (const k of kids) el.children.push(k); },
      remove() { for (const p of [doc.body, ...doc.body.children]) p.children = p.children.filter((x) => x !== el); },
      querySelector: (sel) => (sel === '[data-role="msg"]' ? el.children.find((k) => k.dataset.role === 'msg') ?? null : null),
    };
    return el;
  };
  const doc = {
    body: make('body'),
    createElement: make,
    getElementById: (id: string) => doc.body.children.find((k) => k.id === id) ?? null,
  };
  Object.defineProperty(globalThis, 'document', { value: doc, configurable: true, writable: true });
  return doc;
}

describe('bảng cảnh báo — thứ duy nhất nói "việc của bạn chưa lên kho"', () => {
  afterEach(() => { Reflect.deleteProperty(globalThis as object, 'document'); });

  it('24 · bị từ chối thì bảng hiện, và câu chữ chỉ đúng chỗ cần bấm', async () => {
    const dom = installDom();
    vi.resetModules();
    const c = await import('../src/lib/cloudSync');
    const { mountCloudAlert } = await import('../src/lib/cloudAlert');
    const off = mountCloudAlert();

    expect(dom.getElementById('proyaku-cloud-alert')).toBeNull(); // yên thì không có gì trên màn
    installFetch(() => ({ ok: false, status: 409, body: { conflict: true, savedBy: 'm-kia' } }));
    c.markCloudDirty('schedule');
    await c.pushNow();

    const box = dom.getElementById('proyaku-cloud-alert');
    expect(box).not.toBeNull();
    const text = box!.children.find((k) => k.dataset.role === 'msg')!.textContent;
    expect(text).toContain('kho');
    expect(text).toContain('Cài đặt');
    expect(text).toContain('m-kia');
    off();
  });

  it('25 · lưu được rồi thì bảng biến mất — không để lại lời cảnh báo đã hết đúng', async () => {
    const dom = installDom();
    vi.resetModules();
    const c = await import('../src/lib/cloudSync');
    const { mountCloudAlert } = await import('../src/lib/cloudAlert');
    const off = mountCloudAlert();

    installFetch(() => ({ ok: false, status: 409, body: { conflict: true } }));
    c.markCloudDirty('schedule');
    await c.pushNow();
    expect(dom.getElementById('proyaku-cloud-alert')).not.toBeNull();

    installFetch(() => ({ body: { saved: true, savedAt: 1 } }));
    await c.pushNow();
    expect(dom.getElementById('proyaku-cloud-alert')).toBeNull();
    off();
  });
});

describe('cửa sổ màn khán giả không dính gì tới việc đồng bộ', () => {
  it('26 · /wall và /wall-mockup bị loại ra — không tự lấy về, không tự tải lại giữa buổi', async () => {
    vi.resetModules();
    const { isAudienceWindow } = await import('../src/lib/cloudBoot');
    for (const p of ['/wall', '/wall-mockup', '/wall/left']) expect(isAudienceWindow(p), p).toBe(true);
    for (const p of ['/', '/settings', '/online-lab', '/chuong-trinh']) expect(isAudienceWindow(p), p).toBe(false);
  });

  it('27 · bootCloud trên cửa sổ màn khán giả không gọi mạng, không gắn bảng nào', async () => {
    const dom = installDom();
    vi.resetModules();
    const calls = installFetch(() => ({}));
    const { bootCloud } = await import('../src/lib/cloudBoot');
    await bootCloud('/wall');
    expect(calls).toHaveLength(0);
    expect(dom.getElementById('proyaku-cloud-alert')).toBeNull();
  });
});
```

## Chạy trước khi báo xong

```bash
npx tsc --noEmit -p tsconfig.json
npx vitest run
npm run build
npx oxlint src server tests   # 0 lỗi
```

**Số test phải TĂNG đúng 32 ca, và thêm 1 tệp.** Áp riêng bản này lên `dbbf8d6` thì ra
`919 xanh + 1 bỏ qua (920) / 68 tệp` — tôi đã áp thử thật lên một cây sạch và chạy, ra đúng con số đó.

⚠️ **Nếu anh đã áp PROMPT-14 hoặc PROMPT-15 trước bản này thì con số tuyệt đối sẽ cao hơn 919** — mấy bản
đó mang ca riêng của chúng. Thứ cần đúng là **mức tăng: đúng +32 ca, +1 tệp, và không ca nào chuyển sang
đỏ**. Ba bản rời nhau hoàn toàn, không bản nào đụng tệp của bản nào, nên chạy theo thứ tự nào cũng được.

Nếu ra số khác, xin báo đúng số thật, đừng chỉnh cho khớp.

Sau khi deploy, mở **Cài đặt → Dữ liệu** và đọc dòng "Kho chung đang có" — nay có thêm ô *cài đặt chung*.
Muốn thử cái chốt: mở link trên một máy thứ hai **chưa từng dùng**, nó phải tự lấy về đủ Lịch và Chương
trình mà không phải bấm gì.
