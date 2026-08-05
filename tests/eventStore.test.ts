// TASK 45 — per-event stores. The script and the imported documents belong to ONE meeting, and documents
// are why this cannot be one shared file: `docs.ts` keeps up to 256KB of extracted text per file.
//
// A per-event file means a filename built from user data — the exact door the three fixed files were
// designed to keep shut. It is closed again by REFUSING rather than CLEANING, and case 5 is what pins
// that: an unsafe id must THROW, never be trimmed into something that merely looks safe.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const store = await import('../server/onlineStore.mjs');
const { readEventStore, writeEventStore, listEventStore, EVENT_STORE_MAX_BYTES } = store;

let dir = '';
let prevDataDir: string | undefined;

beforeEach(() => {
  prevDataDir = process.env.DATA_DIR;
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evstore-'));
  process.env.DATA_DIR = dir; // storeDir() reads the env on EVERY call — that is what makes this possible
});

afterEach(() => {
  if (prevDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = prevDataDir;
  fs.rmSync(dir, { recursive: true, force: true });
});

const BAD_IDS = ['../../etc/passwd', '..', 'a/b', 'a\\b', '', 'x'.repeat(65)];

describe('eventStore — đi và về', () => {
  it('1 · ghi rồi đọc lại đúng mảng đó, kể cả với id "_default"', async () => {
    await writeEventStore('script', 'evt-abc_123', [{ id: 'r1', src: 'xin chào' }]);
    await expect(readEventStore('script', 'evt-abc_123', [])).resolves.toEqual([{ id: 'r1', src: 'xin chào' }]);

    // script.ts:15 dùng `proyaku_script:${eventId || '_default'}` — một buổi chưa có id thật đi vào kho
    // dưới đúng cái tên đó, nên nó PHẢI được nhận.
    await writeEventStore('script', '_default', [{ id: 'r2', src: 'chưa chọn sự kiện' }]);
    await expect(readEventStore('script', '_default', [])).resolves.toEqual([{ id: 'r2', src: 'chưa chọn sự kiện' }]);
  });

  it('2 · sự kiện chưa từng ghi trả về fallback, không ném lỗi', async () => {
    await expect(readEventStore('script', 'chua-co-gi', ['fallback'])).resolves.toEqual(['fallback']);
  });

  it('3 · hai sự kiện không giẫm lên nhau', async () => {
    await writeEventStore('script', 'evtA', ['A']);
    await writeEventStore('script', 'evtB', ['B']);
    await expect(readEventStore('script', 'evtA', [])).resolves.toEqual(['A']);
    await expect(readEventStore('script', 'evtB', [])).resolves.toEqual(['B']);
  });

  it('4 · script và docs của CÙNG một sự kiện là hai tệp khác nhau', async () => {
    await writeEventStore('script', 'evt1', ['kịch bản']);
    await writeEventStore('docs', 'evt1', ['tài liệu']);
    await expect(readEventStore('script', 'evt1', [])).resolves.toEqual(['kịch bản']);
    await expect(readEventStore('docs', 'evt1', [])).resolves.toEqual(['tài liệu']);
  });
});

describe('eventStore — TỪ CHỐI, không làm sạch', () => {
  it('5 · id không an toàn thì GHI phải ném lỗi và không tạo tệp nào', async () => {
    for (const bad of BAD_IDS) {
      await expect(writeEventStore('script', bad, []), JSON.stringify(bad)).rejects.toThrow();
    }
    // không một tệp nào được sinh ra — kể cả một tên "đã được làm sạch"
    expect(fs.existsSync(path.join(dir, 'events'))).toBe(false);
  });

  it('6 · cùng những id đó thì ĐỌC không ném lỗi, chỉ trả fallback', async () => {
    for (const bad of BAD_IDS) {
      await expect(readEventStore('script', bad, ['fb']), JSON.stringify(bad)).resolves.toEqual(['fb']);
    }
  });

  it('7 · kind lạ thì ném lỗi', async () => {
    await expect(writeEventStore('nonsense', 'abc', [])).rejects.toThrow();
  });
});

describe('eventStore — đọc không bao giờ làm sập phiên', () => {
  it('8 · tệp hỏng trả fallback', async () => {
    const f = path.join(dir, 'events', 'script', 'evt1.json');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, '{{{', 'utf8');
    await expect(readEventStore('script', 'evt1', [])).resolves.toEqual([]);
  });

  it('9 · tệp rỗng trả fallback', async () => {
    const f = path.join(dir, 'events', 'script', 'evt1.json');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, '', 'utf8');
    await expect(readEventStore('script', 'evt1', ['fb'])).resolves.toEqual(['fb']);
  });

  it('10 · quá trần thì ném lỗi và KHÔNG phá bản đang có', async () => {
    await writeEventStore('script', 'evt1', ['giữ nguyên']);
    const huge = ['x'.repeat(EVENT_STORE_MAX_BYTES + 1000)];
    await expect(writeEventStore('script', 'evt1', huge)).rejects.toThrow();
    await expect(readEventStore('script', 'evt1', [])).resolves.toEqual(['giữ nguyên']);
  });
});

describe('eventStore — liệt kê', () => {
  it('11 · liệt kê đúng sự kiện đã ghi, có bytes và savedAt, bỏ qua .tmp', async () => {
    await writeEventStore('script', 'evtA', ['A']);
    await writeEventStore('script', 'evtB', ['B']);
    fs.writeFileSync(path.join(dir, 'events', 'script', 'evtC.json.tmp'), 'x', 'utf8');

    const list = await listEventStore('script');
    const ids = list.map((e: { eventId: string }) => e.eventId).sort();
    expect(ids).toEqual(['evtA', 'evtB']);
    for (const e of list) {
      expect(e.bytes).toBeGreaterThan(0);
      expect(e.savedAt).toBeGreaterThan(0);
    }
  });

  it('12 · kind chưa có thư mục trả mảng rỗng, không ném lỗi', async () => {
    await expect(listEventStore('docs')).resolves.toEqual([]);
  });
});
