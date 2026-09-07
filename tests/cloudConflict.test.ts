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
  // `/stream` và `/reveal` là hai màn CÙNG LOẠI với `/wall` — mở toàn màn hình cho cả hội trường nhìn,
  // không giữ dữ liệu Chuẩn bị nào của riêng nó. Chúng bị bỏ sót ở lần viết đầu, nên vẫn có thể tự tải
  // lại giữa buổi vì một cái kho ở đâu đó trống.
  it('26 · mọi màn quay ra khán giả đều bị loại — không tự lấy về, không tự tải lại giữa buổi', async () => {
    vi.resetModules();
    const { isAudienceWindow } = await import('../src/lib/cloudBoot');
    for (const p of ['/wall', '/wall-mockup', '/wall/left', '/stream', '/reveal']) expect(isAudienceWindow(p), p).toBe(true);
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

// ---------------------------------------------------------------------------
// Cái làm cho TOÀN BỘ nhóm ca 14–18 ở trên không bao giờ chạy trên máy thật.
//
// Ca 17 chứng minh: máy trắng thì tự lấy về. Nhưng trong `main.tsx`, `migrateToEventScoped()` chạy TRƯỚC
// `bootCloud()`, và nó gọi `ensureDefaultEvent()` vô điều kiện — tức là TẠO một buổi. Nên tới lượt
// `hasLocalPrep()` được hỏi, máy nào cũng đã có đúng một buổi và câu trả lời luôn là "không trắng".
// Người mở link trên máy mới nhìn thấy một buổi rỗng do máy tự đẻ ra, chứ không phải buổi đã chuẩn bị.
//
// Nhóm ca này hỏi theo ĐÚNG THỨ TỰ THẬT: di trú xong rồi mới hỏi máy có trắng không.
describe('di trú không được bịa ra một buổi trên máy chưa ai dùng', () => {
  async function loadMigrate() {
    vi.resetModules();
    return import('../src/lib/migrate');
  }

  it('28 · máy trắng: di trú xong, máy VẪN trắng', async () => {
    const m = await loadMigrate();
    m.migrateToEventScoped();
    const c = await loadCloud();
    expect(c.hasLocalPrep()).toBe(false);
    expect(JSON.parse(store.get('proyaku_schedule') ?? '[]')).toEqual([]);
    expect(store.get('proyaku_migrated_events')).toBe('v1'); // vẫn đánh dấu: ở đây thật sự không có gì để di trú
  });

  it('29 · máy trắng + kho CÓ: di trú xong vẫn lấy về được — ca 17 chạy đúng trên máy thật', async () => {
    const m = await loadMigrate();
    m.migrateToEventScoped();
    const c = await loadCloud();
    installFetch((url) => {
      if (url.includes('/prep/manifest')) return { body: { schedule: { count: 2, savedAt: 1, savedBy: 'm-khac' }, speakers: { count: 0 }, settings: { count: 0 }, script: [], docs: [], storeDir: '/data' } };
      if (url.includes('/prep/schedule')) return { body: { conferences: [{ id: 'tren-kho' }], savedAt: 55 } };
      if (url.includes('/prep/speakers')) return { body: { profiles: [], savedAt: 55 } };
      return { body: { values: {} } };
    });
    await expect(c.adoptFromCloudIfEmpty()).resolves.toBe(true);
    expect(store.get('proyaku_schedule')).toBe(JSON.stringify([{ id: 'tren-kho' }]));
  });

  it('30 · máy CÓ kịch bản cũ ⇒ vẫn tạo chỗ cho nó và chép sang, y như trước', async () => {
    const m = await loadMigrate();
    store.set('proyaku_script', '[{"src":"a"}]');
    m.migrateToEventScoped();
    const list = JSON.parse(store.get('proyaku_schedule') ?? '[]') as { id: string }[];
    expect(list).toHaveLength(1);
    expect(store.get(`proyaku_script:${list[0].id}`)).toBe('[{"src":"a"}]');
  });

  it('31 · máy đã có buổi mà chưa có con trỏ ⇒ vẫn đặt con trỏ, không đẻ thêm buổi', async () => {
    const m = await loadMigrate();
    store.set('proyaku_schedule', JSON.stringify([{ id: 'buoi-cu', title: 'Buổi cũ', date: '2030-01-01' }]));
    m.migrateToEventScoped();
    expect(JSON.parse(store.get('proyaku_schedule') ?? '[]')).toHaveLength(1);
    expect(store.get('proyaku_active_event')).toBe('buoi-cu');
  });
});
