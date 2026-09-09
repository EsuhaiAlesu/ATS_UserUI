// TASK 47 — the sync channel. PUSH is automatic and debounced; PULL is a button and never fires on its
// own. That asymmetry is the safety design: a push overwrites a BACKUP, a pull overwrites the WORK IN
// FRONT OF YOU.
//
// Case 12 is the price of `cloudSync.ts` deliberately importing none of the four modules (that would be a
// cycle): the localStorage key names live in two places, so a test pins that they agree.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// ---- a localStorage good enough for this module, and a fetch we can watch ----
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

/** Fresh module per test: the channel keeps state in module scope. */
async function loadCloud() {
  vi.resetModules();
  return import('../src/lib/cloudSync');
}

let store: Map<string, string>;
const realFetch = globalThis.fetch;

beforeEach(() => { store = installLocalStorage(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); globalThis.fetch = realFetch; });

describe('cloudSync — máy này là ai', () => {
  it('1 · deviceId ổn định giữa hai lần gọi, và bắt đầu bằng "m-"', async () => {
    const c = await loadCloud();
    const a = c.deviceId();
    expect(a.startsWith('m-')).toBe(true);
    expect(c.deviceId()).toBe(a);
  });

  it('2 · chế độ riêng tư: không ném lỗi, trả "m-unknown"', async () => {
    installLocalStorage(true);
    const c = await loadCloud();
    expect(() => c.deviceId()).not.toThrow();
    expect(c.deviceId()).toBe('m-unknown');
  });
});

describe('cloudSync — đẩy lên là tự động, và gộp lại', () => {
  it('3 · markCloudDirty ghi vào pending và KHÔNG gọi mạng ngay', async () => {
    const c = await loadCloud();
    const calls = installFetch(() => ({}));
    c.markCloudDirty('schedule');
    expect(c.getCloudState().pending).toContain('schedule');
    expect(calls).toHaveLength(0);
  });

  it('4 · gõ năm lần liên tiếp chỉ lưu MỘT lần', async () => {
    const c = await loadCloud();
    const calls = installFetch(() => ({}));
    for (let i = 0; i < 5; i += 1) c.markCloudDirty('schedule');
    await vi.runAllTimersAsync();
    expect(calls.filter((x) => x.url.includes('/prep/schedule'))).toHaveLength(1);
  });

  it('5 · pushNow với pending rỗng thì đẩy cả bốn loại', async () => {
    const c = await loadCloud();
    store.set('proyaku_script:e1', JSON.stringify([{ id: 'r1' }]));
    store.set('proyaku_docs:e1', JSON.stringify([{ id: 'd1' }]));
    const calls = installFetch(() => ({}));
    await c.pushNow();
    const urls = calls.map((x) => x.url).join(' ');
    for (const p of ['/prep/schedule', '/prep/speakers', '/prep/event/script', '/prep/event/docs']) {
      expect(urls, p).toContain(p);
    }
  });

  it('6 · savedBy gửi lên đúng bằng deviceId()', async () => {
    const c = await loadCloud();
    const calls = installFetch(() => ({}));
    const id = c.deviceId();
    await c.pushNow();
    const body = JSON.parse(String(calls.find((x) => x.url.includes('/prep/schedule'))!.init!.body));
    expect(body.savedBy).toBe(id);
  });

  it('7 · sự kiện có mảng RỖNG không được gửi lên — đẩy không bao giờ xoá trắng bản máy khác', async () => {
    const c = await loadCloud();
    store.set('proyaku_script:trong', JSON.stringify([]));
    store.set('proyaku_script:codata', JSON.stringify([{ id: 'r1' }]));
    const calls = installFetch(() => ({}));
    await c.pushNow();
    const sent = calls.filter((x) => x.url.includes('/prep/event/script')).map((x) => JSON.parse(String(x.init!.body)).eventId);
    expect(sent).toContain('codata');
    expect(sent).not.toContain('trong');
  });
});

describe('cloudSync — hỏng mạng và hỏng máy chủ là hai chuyện', () => {
  it('8 · mất mạng ⇒ offline, và pending GIỮ NGUYÊN để còn thử lại', async () => {
    const c = await loadCloud();
    installFetch(() => new Error('network down'));
    c.markCloudDirty('schedule');
    await c.pushNow();
    expect(c.getCloudState().status).toBe('offline');
    expect(c.getCloudState().pending).toContain('schedule');
  });

  it('9 · máy chủ trả 500 ⇒ error, không phải offline', async () => {
    const c = await loadCloud();
    installFetch(() => ({ ok: false, status: 500 }));
    c.markCloudDirty('schedule');
    await c.pushNow();
    expect(c.getCloudState().status).toBe('error');
  });
});

describe('cloudSync — đọc đúng khoá, kéo về đúng chỗ', () => {
  it('10 · localEventIds không nhầm sang khoá của kênh Cascade Matcher', async () => {
    const c = await loadCloud();
    store.set('proyaku_script:e1', '[]');
    store.set('proyaku_script:e2', '[]');
    store.set('proyaku_script_sync:e9', '{}'); // kênh khác hẳn — không được lẫn vào
    expect(c.localEventIds('script').sort()).toEqual(['e1', 'e2']);
  });

  it('11 · pullNow ghi đủ bốn nhóm khoá; manifest hỏng thì KHÔNG ghi gì và trả false', async () => {
    const c = await loadCloud();
    installFetch((url) => {
      if (url.includes('/prep/manifest')) return { body: { schedule: {}, speakers: {}, script: [{ eventId: 'e1' }], docs: [{ eventId: 'e1' }], storeDir: '/data' } };
      if (url.includes('/prep/schedule')) return { body: { conferences: [{ id: 'c1' }] } };
      if (url.includes('/prep/speakers')) return { body: { profiles: [{ id: 's1' }] } };
      return { body: { rows: [{ id: 'x' }] } };
    });
    await expect(c.pullNow()).resolves.toBe(true);
    expect(store.get('proyaku_schedule')).toBe(JSON.stringify([{ id: 'c1' }]));
    expect(store.get('proyaku_speakers')).toBe(JSON.stringify([{ id: 's1' }]));
    expect(store.get('proyaku_script:e1')).toBe(JSON.stringify([{ id: 'x' }]));
    expect(store.get('proyaku_docs:e1')).toBe(JSON.stringify([{ id: 'x' }]));

    // manifest không lấy được ⇒ không đụng gì cả
    const c2 = await loadCloud();
    const before = new Map(store);
    installFetch(() => ({ ok: false, status: 503 }));
    await expect(c2.pullNow()).resolves.toBe(false);
    expect([...store.entries()]).toEqual([...before.entries()]);
  });

  it('12 · TÊN KHOÁ khớp với bốn module — cái giá của việc cố ý không nhập chúng', async () => {
    const c = await loadCloud();
    expect(read('src/lib/schedule.ts')).toContain(`'${c.CLOUD_KEYS.schedule}'`);
    expect(read('src/lib/speakers.ts')).toContain(`'${c.CLOUD_KEYS.speakers}'`);
    expect(read('src/lib/script.ts')).toContain(`${c.CLOUD_KEYS.script}:`);
    expect(read('src/lib/docs.ts')).toContain(`${c.CLOUD_KEYS.docs}:`);
  });

  it('13 · "Xuất cấu hình" mang theo khoá proyaku_online_*, còn "Xoá dữ liệu cục bộ" KHÔNG chạm tới', async () => {
    // Hai nửa của cùng một mục *Dữ liệu*, và chúng cố ý KHÔNG đối xứng.
    //
    // Bản XUẤT phải có cài đặt online: thiếu thì mang máy sang hội trường là mất sạch nhịp nói, ngưỡng đủ
    // to, độ nhạy micro, giọng đọc, bố trí màn khán giả, cỡ chữ tường — đặt lại bằng tay dưới áp lực.
    //
    // Nút XOÁ thì phải để chúng lại. Mười trong mười bốn khoá đó nằm trong `SETTINGS_KEYS`, và kho chung
    // được ghi TRỌN GÓI chứ không trộn; một máy vừa xoá sạch mà đẩy lên là xoá luôn nấc của MỌI máy khác.
    // Xem chú thích dài ở `EXPORT_ONLY_PREFIXES` trong `src/lib/settings.ts`.
    //
    // Ca này gọi HÀM THẬT, không grep chuỗi: bọc tiền tố vào `/* */` là mã chết hoàn toàn mà phép grep
    // vẫn xanh — đúng cái bẫy đã bắt được một lần.
    store.set('proyaku_online_speech_rhythm', '"vendor"');
    store.set('proyaku_online_wall_char_cm', '12');
    store.set('proyaku_settings', '{"eventName":"Gala"}');
    const s = await import('../src/lib/settings');

    const dumped = JSON.parse(s.exportLocalData()) as Record<string, unknown>;
    expect(dumped['proyaku_online_speech_rhythm']).toBe('vendor');
    expect(dumped['proyaku_online_wall_char_cm']).toBe(12);

    s.clearLocalData();
    expect(localStorage.getItem('proyaku_online_speech_rhythm')).toBe('"vendor"');
    expect(localStorage.getItem('proyaku_online_wall_char_cm')).toBe('12');
    expect(localStorage.getItem('proyaku_settings')).toBeNull();
  });
});
