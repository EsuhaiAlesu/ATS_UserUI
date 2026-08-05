# PROMPT-12 — Lịch · Kịch bản · Tài liệu · Diễn giả lên kho chung

<context>
Chạy SAU khi PROMPT-11 PHẦN 6 đã xong và đã commit. Mọi khối `Find and replace` bên dưới được đối chiếu
byte-for-byte với **commit `e22cfd6`** ("PROMPT-11 PHẦN 6/6 — dẫn theo kịch bản, và vá gấp cửa sổ bỏ câu"),
tức đúng cây bạn đang có. Nếu `git log --oneline -1` không phải `867acda` hoặc `e22cfd6` thì dừng và báo.

**Vấn đề.** Kho trên Volume mà PHẦN 3 dựng đang giữ đúng ba thứ: từ điển trực tuyến, hai ô
Thuật ngữ/Bối cảnh theo buổi, và kho sửa nghe nhầm. Bốn thứ quan trọng nhất của màn Chuẩn bị thì
**chưa hề lên kho** — chúng vẫn nằm trong `localStorage` của một trình duyệt, và code tự nói ra điều đó:

```
src/lib/schedule.ts:28   const KEY = 'proyaku_schedule';
src/lib/speakers.ts:28   const KEY = 'proyaku_speakers';
src/lib/script.ts:1      // LOCAL-FIRST: the source of truth is localStorage 'proyaku_script'
src/lib/docs.ts:3        // Local-first (localStorage 'proyaku_docs:<eventId>')
```

Hệ quả thật: chuẩn bị trên máy A, chạy buổi lễ trên máy B thì **máy B không có kịch bản**. Đổi trình
duyệt, dùng cửa sổ ẩn danh, hay bấm "xóa dữ liệu duyệt web" cũng mất sạch, và không có bản sao nào ở đâu
cả. `docs.ts` thậm chí phải tự cắt tài liệu xuống 256KB mỗi tệp **chỉ để khỏi vỡ hạn mức ~5MB của
localStorage** — một giới hạn biến mất hoàn toàn khi lên kho.

**Nguyên tắc số một, đọc kỹ trước khi viết một dòng nào.** Bốn module này đều **đồng bộ**:
`getSchedules()`, `getDocs(eventId)`, `getScriptLocal(eventId)`, `listSpeakers()` trả thẳng mảng, và có
khoảng mười lăm nơi gọi chúng như vậy. `schedule.ts` còn ghi rõ trong chú thích đầu tệp rằng nó
local-first **"so it works OFFLINE — the backend is not involved"**, và lời hứa đó có thật: màn Chuẩn bị
phải dùng được khi mất mạng.

Nên **KHÔNG chuyển bốn module này sang async, và không đổi một chữ ký hàm nào.** Thiết kế đúng là:

> `localStorage` vẫn là **bản đang làm việc** — đọc vẫn đồng bộ, vẫn chạy offline.
> Kho trên Volume là **kênh đồng bộ** — đẩy lên tự động, kéo về khi người dùng bấm.

Đây chính là hình mẫu mà `script.ts` đã dùng sẵn cho kênh đồng bộ với Cascade Matcher
(`updatedAt` / `syncedAt` / `dirty`), chỉ khác đích đến.

**Bất đối xứng có chủ ý: đẩy lên thì tự động, kéo về thì phải bấm.** Đẩy lên chỉ ghi đè bản sao lưu trên
máy chủ bằng thứ mới nhất máy này vừa làm — mất mát tệ nhất là mất một bản sao lưu. Kéo về thì ghi đè
**việc đang làm dở**, và không rút lại được. Hai chiều đó không cùng mức rủi ro, nên không được cùng mức
tự động.
</context>

<what_you_must_not_do>
- **Không đổi bất kỳ chữ ký hàm nào đang export** từ `schedule.ts`, `script.ts`, `docs.ts`,
  `speakers.ts`. Không hàm nào được biến thành `async`. Không nơi gọi nào phải sửa.
- **Không sửa `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`,
  `src/lib/lanes/types.ts`.**
- **Không đụng kênh đồng bộ có sẵn với Cascade Matcher.** `pushToBackend` / `pullFromBackend` /
  `toCanonical` / `getSyncState` trong `script.ts` đẩy tới `data/script.json` của máy chủ **offline** —
  đó là một đích HOÀN TOÀN KHÁC với kho trên Volume. Giữ nguyên, đừng gộp, đừng đổi tên.
- **Không đổi hình dạng JSON của bất kỳ bản ghi nào**: `Conference`, `Speaker`, `ScriptEntry`,
  `SourceDoc`, `SpeakerProfile` giữ nguyên từng trường. Kho lưu đúng cái mảng đang nằm trong
  localStorage, không phiên dịch gì cả.
- **Không thêm dependency.** Không thư viện đồng bộ, không IndexedDB, không service worker.
- Không đặt tên nhà cung cấp, tên biến môi trường của khóa, tên model hay địa chỉ API vào bất cứ đâu
  dưới `src/`.
- Không đụng `src/lib/lanes/online/` — phần này không liên quan gì tới làn trực tuyến.
</what_you_must_not_do>

---

## TASK 45 — kho: thêm ngăn toàn cục và ngăn theo sự kiện

`server/onlineStore.mjs` hiện có đúng ba tệp cố định và một chú thích giải thích vì sao:
*"one file means one atomic write instead of a directory of names to sanitise."* Lý lẽ đó vẫn đúng cho
lịch và diễn giả — chúng nhỏ và toàn cục. Nhưng **tài liệu thì không**: `docs.ts` cho phép 256KB văn bản
mỗi tệp, nhân với nhiều tệp nhân với nhiều sự kiện là hàng megabyte, trong khi trần hiện tại là 1MB cho
**cả** tệp. Nhét chung là hỏng.

Nên có hai họ kho: **toàn cục** (như hiện nay) và **theo sự kiện** (một tệp mỗi sự kiện, trần riêng).

Và đây là chỗ phải cẩn thận nhất trong cả prompt này. Ngăn theo sự kiện có tên tệp lấy từ dữ liệu người
dùng, tức là mở lại đúng cái cửa mà thiết kế cũ cố tình đóng. Cách đóng lại: **KHÔNG làm sạch chuỗi, mà
TỪ CHỐI chuỗi.** Một `eventId` không khớp `^[A-Za-z0-9_-]{1,64}$` thì ném lỗi, không phải bị cắt gọt cho
vừa. Làm sạch là nơi lỗi ẩn nấp; từ chối thì không.

### 45.1 `server/onlineStore.mjs`

**(a)** Thêm ngăn toàn cục mới. Find and replace:

```js
const FILES = {
  glossary: 'online-glossary.json',
  boxes: 'session-boxes.json',
```

with

```js
const FILES = {
  glossary: 'online-glossary.json',
  boxes: 'session-boxes.json',
  // PROMPT-12 — the Chuẩn bị data that used to live in ONE browser's localStorage. Both are global and
  // small: a schedule is a few dozen conferences, a speaker library a few dozen people. Kilobytes.
  schedule: 'prep-schedule.json',
  speakers: 'prep-speakers.json',
```

**(b)** Ngăn theo sự kiện. Find and replace:

```js
const FALLBACK_DIR = './online-data';
```

with

```js
const FALLBACK_DIR = './online-data';

// ---- PROMPT-12: per-event stores ----
//
// The script and the imported documents belong to ONE meeting, and documents are the reason this cannot
// be a single shared file the way `boxes` is: `docs.ts` stores up to 256KB of extracted text per file,
// so a handful of meetings is already megabytes while STORE_MAX_BYTES is one.
//
// A per-event file means a filename built from user data, which is exactly the door the three fixed
// files were designed to keep shut. It is closed again by REFUSING rather than CLEANING: an id that is
// not plainly safe throws, it is not trimmed into something that looks safe. Sanitising is where these
// bugs hide — `..%2f`, a NUL byte, a name that normalises to `..` on one filesystem and not another.
// There is nothing to smuggle through a whitelist that answers only yes or no.
const EVENT_KINDS = {
  script: 'script',
  docs: 'docs',
};

/** Ids come from `uid()` — a UUID or a base36 pair. Anything else is a caller bug, not a request. */
const EVENT_ID_OK = /^[A-Za-z0-9_-]{1,64}$/;

/** Documents are the reason this exists; 8MB is generous for text and still refuses a runaway. */
export const EVENT_STORE_MAX_BYTES = 8 * 1024 * 1024;

function resolveEventFile(kind, eventId) {
  const dir = EVENT_KINDS[kind];
  if (!dir) throw new Error(`Unknown event store: ${String(kind).slice(0, 40)}`);
  const id = String(eventId ?? '');
  if (!EVENT_ID_OK.test(id)) throw new Error('Invalid event id.');
  return path.join(storeDir(), 'events', dir, `${id}.json`);
}

/** Read one event's store. Same contract as `readStore`: never throws for missing/corrupt, returns `fallback`. */
export async function readEventStore(kind, eventId, fallback) {
  let file;
  // A bad kind or id is a caller bug and must be loud; a missing or corrupt FILE is normal and must be quiet.
  try {
    file = resolveEventFile(kind, eventId);
  } catch {
    return fallback;
  }
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > EVENT_STORE_MAX_BYTES) return fallback;
    const raw = await fs.readFile(file, 'utf8');
    if (!raw.trim()) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/** Write one event's store atomically. Throws on a bad id, an oversized payload, or a real disk error. */
export async function writeEventStore(kind, eventId, value) {
  const file = resolveEventFile(kind, eventId);
  const body = JSON.stringify(value ?? null, null, 2);
  const bytes = Buffer.byteLength(body, 'utf8');
  if (bytes > EVENT_STORE_MAX_BYTES) throw new Error(`Event store payload too large (${bytes} bytes).`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, body, 'utf8');
  await fs.rename(tmp, file);
  return bytes;
}

/**
 * Which events have something stored, and when. Powers the "what is on the server" readout — an operator
 * about to overwrite their local work is owed a list, not a yes/no.
 */
export async function listEventStore(kind) {
  const dir = EVENT_KINDS[kind];
  if (!dir) throw new Error(`Unknown event store: ${String(kind).slice(0, 40)}`);
  const base = path.join(storeDir(), 'events', dir);
  try {
    const names = await fs.readdir(base);
    const out = [];
    for (const name of names) {
      if (!name.endsWith('.json')) continue; // skips any .tmp a crash left behind
      const id = name.slice(0, -5);
      if (!EVENT_ID_OK.test(id)) continue;
      try {
        const stat = await fs.stat(path.join(base, name));
        out.push({ eventId: id, bytes: stat.size, savedAt: Math.round(stat.mtimeMs) });
      } catch { /* vanished between readdir and stat — simply not listed */ }
    }
    return out.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return []; // nothing stored yet is not an error
  }
}
```

### 45.2 Tests — tệp MỚI `tests/eventStore.test.ts`

Mô tả bằng lời; tự viết code theo kiểu các tệp test có sẵn. Nạp module bằng
`const store = await import('../server/onlineStore.mjs')`, và trỏ `process.env.DATA_DIR` vào một thư mục
tạm ở `beforeEach` rồi dọn ở `afterEach` — `storeDir()` đọc biến môi trường ở **mỗi lần gọi**, đúng là để
làm được việc này.

Mười hai ca:

1. Ghi rồi đọc lại một mảng cho `('script', '<id hợp lệ>')` trả về đúng mảng đó. Làm thêm một lần nữa
   với đúng id `'_default'` — `script.ts:15` viết `` `proyaku_script:${eventId || '_default'}` ``, nên một
   sự kiện chưa có id thật sẽ đi vào kho dưới đúng cái tên đó và nó **phải** được nhận.
2. Đọc một sự kiện chưa từng ghi trả về đúng `fallback`, không ném lỗi.
3. Hai sự kiện khác nhau không giẫm lên nhau: ghi A rồi ghi B, đọc lại A vẫn nguyên.
4. `script` và `docs` của **cùng một** eventId là hai tệp khác nhau: ghi cả hai, đọc lại cả hai đều đúng.
5. **`writeEventStore('script', '../../etc/passwd', [])` PHẢI ném lỗi.** Không được ghi ra tệp nào, không
   được "làm sạch" thành một tên khác. Kiểm cả `'..'`, `'a/b'`, `'a\\b'`, chuỗi rỗng, và một chuỗi 65 ký tự.
6. `readEventStore` với cùng những id xấu đó **không ném lỗi** mà trả `fallback` — đọc là đường lành, ghi
   là đường dữ.
7. `writeEventStore('nonsense', 'abc', [])` ném lỗi vì `kind` không có trong danh sách.
8. Tệp hỏng: ghi thẳng chuỗi `'{{{'` vào đúng đường dẫn rồi `readEventStore` trả `fallback`.
9. Tệp rỗng: ghi `''` rồi đọc trả `fallback`.
10. Quá trần: `writeEventStore` với chuỗi dài hơn `EVENT_STORE_MAX_BYTES` ném lỗi, và tệp cũ (nếu có)
    **vẫn còn nguyên nội dung cũ** — ghi hỏng không được phá bản đang có.
11. `listEventStore('script')` liệt kê đúng các eventId đã ghi, có `bytes` và `savedAt` > 0, và **không**
    liệt kê tệp `.tmp`. (Tự tạo một tệp `.tmp` trong thư mục đó để kiểm.)
12. `listEventStore` trên một `kind` chưa có thư mục trả về mảng rỗng, không ném lỗi.

---

## TASK 46 — bốn cặp endpoint

Tất cả nằm dưới `/online-api/prep/*` nên **thừa kế nguyên vẹn cổng đăng nhập** đã chặn ở trên — không
viết một dòng xác thực nào trong các route này, và đừng thêm ngoại lệ nào.

Hai trần khác nhau, đừng "sửa" cho khớp: trần **4MB** ở PUT là trần **đọc thân yêu cầu HTTP** (chép đúng
từ route từ điển), còn `writeStore` vẫn giữ trần lưu **1MB** của nó. Lịch vài chục buổi và thư viện diễn
giả vài chục người chỉ là vài chục KB, nên 1MB thoải mái; nếu có ngày vượt thật thì `writeStore` ném lỗi
và người dùng thấy 500 — đó là câu trả lời thành thật, tốt hơn là lặng lẽ ghi một tệp khổng lồ.

### 46.1 `server/online-api.mjs` — nhập thêm

Find and replace:

```js
import { readStore, writeStore } from './onlineStore.mjs';
```

with

```js
// PROMPT-12 adds the per-event half (script + documents) and two more global stores.
import { readStore, writeStore, storeDir, readEventStore, writeEventStore, listEventStore } from './onlineStore.mjs';
```

### 46.2 `server/online-api.mjs` — các route

Chèn ngay TRƯỚC khối từ điển của TASK 19. Find and replace:

```js
      // ---- TASK 19: the ONLINE glossary, on the TASK 18 store ----
```

with

```js
      // ---- PROMPT-12: the Chuẩn bị data, so a ceremony is not hostage to one browser ----
      //
      // Four pairs, one shape: GET returns `{ <payload>, savedAt, savedBy }`, PUT takes the same and
      // answers `{ saved:true, bytes }`. `savedBy` is a random per-BROWSER id, never a person — its only
      // job is to let the screen say "the copy on the server came from a different machine", which is
      // the one fact an operator needs before overwriting their own work.
      //
      // These carry no auth code on purpose: everything under /online-api/* answered 401 above before
      // any route matched, and adding a second opinion here is how gaps appear.
      if (pathname === '/online-api/prep/schedule' && req.method === 'GET') {
        const stored = await readStore('schedule', null);
        sendJson(res, 200, {
          conferences: Array.isArray(stored?.conferences) ? stored.conferences : [],
          savedAt: typeof stored?.savedAt === 'number' ? stored.savedAt : 0,
          savedBy: typeof stored?.savedBy === 'string' ? stored.savedBy : '',
        });
        return true;
      }
      if (pathname === '/online-api/prep/schedule' && req.method === 'PUT') {
        const body = await readJsonBody(req, 4 * 1024 * 1024);
        if (!Array.isArray(body?.conferences)) {
          sendJson(res, 400, { error: 'conferences must be an array.' });
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
          sendJson(res, 500, { error: 'Failed to save the schedule.' });
        }
        return true;
      }

      if (pathname === '/online-api/prep/speakers' && req.method === 'GET') {
        const stored = await readStore('speakers', null);
        sendJson(res, 200, {
          profiles: Array.isArray(stored?.profiles) ? stored.profiles : [],
          savedAt: typeof stored?.savedAt === 'number' ? stored.savedAt : 0,
          savedBy: typeof stored?.savedBy === 'string' ? stored.savedBy : '',
        });
        return true;
      }
      if (pathname === '/online-api/prep/speakers' && req.method === 'PUT') {
        const body = await readJsonBody(req, 4 * 1024 * 1024);
        if (!Array.isArray(body?.profiles)) {
          sendJson(res, 400, { error: 'profiles must be an array.' });
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
          sendJson(res, 500, { error: 'Failed to save the speaker library.' });
        }
        return true;
      }

      // The per-event pair. `kind` comes off the path and is checked against the same two names the store
      // knows — the store would refuse an unknown one anyway, but a 400 here is a better answer than a 500.
      if (pathname.startsWith('/online-api/prep/event/') && (req.method === 'GET' || req.method === 'PUT')) {
        const kind = pathname.slice('/online-api/prep/event/'.length);
        if (kind !== 'script' && kind !== 'docs') {
          sendJson(res, 404, { error: 'Unknown prep store.' });
          return true;
        }
        if (req.method === 'GET') {
          const eventId = normalizeText(url.searchParams.get('eventId')).slice(0, 64);
          if (!eventId) {
            sendJson(res, 400, { error: 'Missing eventId.' });
            return true;
          }
          const stored = await readEventStore(kind, eventId, null);
          sendJson(res, 200, {
            rows: Array.isArray(stored?.rows) ? stored.rows : [],
            savedAt: typeof stored?.savedAt === 'number' ? stored.savedAt : 0,
            savedBy: typeof stored?.savedBy === 'string' ? stored.savedBy : '',
          });
          return true;
        }
        // 12MB: `docs.ts` allows 256KB of extracted text per file, and a meeting can import several.
        const body = await readJsonBody(req, 12 * 1024 * 1024);
        const eventId = normalizeText(body?.eventId).slice(0, 64);
        if (!eventId) {
          sendJson(res, 400, { error: 'Missing eventId.' });
          return true;
        }
        if (!Array.isArray(body?.rows)) {
          sendJson(res, 400, { error: 'rows must be an array.' });
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
          const message = String(error?.message ?? error);
          const bad = /Invalid event id|Unknown event store/.test(message);
          logLine('prep.event.save_fail', { kind, message: message.slice(0, 300) });
          sendJson(res, bad ? 400 : 500, { error: bad ? 'Invalid event id.' : 'Failed to save.' });
        }
        return true;
      }

      // What is on the server, without downloading it. The screen that offers to overwrite local work
      // shows this first — an operator is owed a list before a warning.
      if (pathname === '/online-api/prep/manifest' && req.method === 'GET') {
        const schedule = await readStore('schedule', null);
        const speakers = await readStore('speakers', null);
        sendJson(res, 200, {
          schedule: {
            count: Array.isArray(schedule?.conferences) ? schedule.conferences.length : 0,
            savedAt: typeof schedule?.savedAt === 'number' ? schedule.savedAt : 0,
            savedBy: typeof schedule?.savedBy === 'string' ? schedule.savedBy : '',
          },
          speakers: {
            count: Array.isArray(speakers?.profiles) ? speakers.profiles.length : 0,
            savedAt: typeof speakers?.savedAt === 'number' ? speakers.savedAt : 0,
            savedBy: typeof speakers?.savedBy === 'string' ? speakers.savedBy : '',
          },
          script: await listEventStore('script'),
          docs: await listEventStore('docs'),
          storeDir: storeDir(),
        });
        return true;
      }

      // ---- TASK 19: the ONLINE glossary, on the TASK 18 store ----
```

### 46.3 Tests — tệp MỚI `tests/prepEndpoints.test.ts`

Mô tả bằng lời. Các tệp test máy chủ có sẵn dựng server bằng cách nào thì theo đúng cách đó; nếu bộ test
hiện tại không dựng được HTTP thật thì kiểm bằng "source guard" đọc chuỗi trong `server/online-api.mjs`
như nhiều tệp test khác của PROMPT-11 đang làm, và nói rõ trong báo cáo là bạn đã chọn cách nào.

Mười ca:

1. Bốn đường dẫn có mặt: `'/online-api/prep/schedule'`, `'/online-api/prep/speakers'`,
   `'/online-api/prep/event/'`, `'/online-api/prep/manifest'`.
2. **Không route nào của PROMPT-12 chứa chữ `auth`, `password`, `cookie` hay `login`.** Chúng thừa kế
   cổng, không tự dựng cổng.
3. `prep/event/` từ chối `kind` lạ bằng **404**, không phải 500.
4. PUT `prep/event/` trả **400** khi thiếu `eventId`, và **400** khi `rows` không phải mảng.
5. Lỗi "Invalid event id" từ kho được dịch thành **400**, không phải 500 — ghim chuỗi
   `/Invalid event id|Unknown event store/` có mặt trong nhánh bắt lỗi.
6. Trần thân yêu cầu đúng như đã định: `4 * 1024 * 1024` cho hai route toàn cục, `12 * 1024 * 1024` cho
   route theo sự kiện.
7. GET nào cũng trả `savedAt` và `savedBy`, và cả hai đều có giá trị mặc định khi kho trống.
8. `savedBy` bị cắt ở 40 ký tự ở cả ba nơi ghi.
9. `manifest` gọi `listEventStore` cho **cả hai** `'script'` và `'docs'`.
10. Bốn route mới được cài **trước** khối từ điển TASK 19 trong tệp — kiểm bằng chỉ số ký tự:
    `indexOf('/online-api/prep/schedule') < indexOf('TASK 19: the ONLINE glossary')`.

---

## TASK 47 — tệp mới `src/lib/cloudSync.ts`

Đây là lớp đồng bộ, và nó phải **không được nhập bốn module dữ liệu kia**. Lý do là vòng nhập: bốn module
đó sẽ gọi ngược lên đây để báo "tôi vừa đổi". Nên `cloudSync.ts` đọc thẳng `localStorage` theo tên khóa,
không qua module nào cả.

Cái giá của lựa chọn đó là tên khóa bị viết ở hai nơi. Cái giá đó được trả bằng một ca test ghim rằng
tên khóa ở đây khớp với tên khóa trong bốn module — xem §47.3 ca 12.

### 47.1 New file:

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
```

### 47.2 Vì sao `pullNow` tải lại trang

Nó **không** tự tải lại — nó trả `true` và để giao diện quyết định (§49). Nhưng giao diện PHẢI tải lại,
và lý do đáng viết ra: mọi trang trong ứng dụng đọc dữ liệu **đồng bộ lúc mount**. Không có kênh nào báo
cho `SchedulePlanner` đang mở rằng lịch vừa đổi dưới chân nó. Nửa số màn hình giữ dữ liệu hôm qua còn tệ
hơn một lần tải lại.

### 47.3 Tests — tệp MỚI `tests/cloudSync.test.ts`

Mô tả bằng lời. Cần giả `localStorage` và `fetch`; các tệp test có sẵn giả `fetch` thế nào thì theo đúng
cách đó.

Mười hai ca:

1. `deviceId()` trả cùng một chuỗi ở hai lần gọi liên tiếp, và chuỗi đó bắt đầu bằng `'m-'`.
2. `deviceId()` không ném lỗi khi `localStorage.setItem` ném (chế độ riêng tư) và trả `'m-unknown'`.
3. `markCloudDirty('schedule')` đưa `'schedule'` vào `pending` và **không** gọi `fetch` ngay lập tức.
4. Gọi `markCloudDirty` năm lần liên tiếp rồi chạy hết đồng hồ giả: `fetch` cho `prep/schedule` được gọi
   **đúng một lần** — đây là ca ghim việc gộp nhiều lần gõ thành một lần lưu.
5. `pushNow()` khi `pending` rỗng thì đẩy cả bốn loại.
6. `pushNow()` gửi `savedBy` bằng đúng `deviceId()`.
7. Sự kiện có mảng rỗng **không** được gửi lên (`rows.length === 0` thì bỏ qua) — ghim rằng đẩy lên không
   bao giờ xóa trắng bản của máy khác.
8. `fetch` ném lỗi (mất mạng) ⇒ trạng thái thành `'offline'`, `pending` **giữ nguyên** loại chưa xong.
9. Máy chủ trả 500 ⇒ trạng thái `'error'` chứ không phải `'offline'` — hai chuyện khác nhau, hai câu khác
   nhau.
10. `localEventIds('script')` đọc đúng các hậu tố từ khóa `proyaku_script:<id>`, và **không** trả về khóa
    `proyaku_script_sync:<id>` (khóa của kênh đồng bộ Cascade Matcher — nếu ca này đỏ thì bạn đã trộn hai
    kênh vào nhau).
11. `pullNow()` ghi vào `localStorage` đúng bốn nhóm khóa, và khi `fetchManifest` trả `null` thì
    **không ghi gì cả** và trả `false`.
12. **Ghim tên khóa.** Đọc văn bản nguồn của `src/lib/schedule.ts`, `src/lib/speakers.ts`,
    `src/lib/script.ts`, `src/lib/docs.ts` và khẳng định mỗi tệp chứa đúng chuỗi khóa tương ứng trong
    `CLOUD_KEYS` (`'proyaku_schedule'`, `'proyaku_speakers'`, `'proyaku_script:'`, `'proyaku_docs:'`).
    Đây là ca trả giá cho việc `cloudSync.ts` cố ý không nhập bốn module kia.

---

## TASK 48 — móc bốn module vào kênh đồng bộ

Mỗi module chỉ thêm **một** lời gọi trên đường ghi. Không đổi chữ ký, không thêm `async`, không đụng
đường đọc.

Cả bốn dùng chung một cách nhập **động**, chứ không phải `import` ở đầu tệp:

```ts
void import('./cloudSync').then((m) => m.markCloudDirty('...')).catch(() => {});
```

Lý do: bốn module này chạy được cả khi không có mạng và cả trong test node không có `fetch`. Nhập động
cộng với `.catch(() => {})` nghĩa là **kênh đồng bộ hỏng thì việc lưu tại máy vẫn xong** — và thứ tự đó
là bắt buộc, gọi sau khi `localStorage.setItem` đã chạy.

### 48.1 `src/lib/schedule.ts`

Find and replace:

```ts
function write(list: Conference[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore quota/private-mode */ }
}
```

with

```ts
function write(list: Conference[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore quota/private-mode */ }
    // PROMPT-12: tell the sync channel, AFTER the local write has already happened. Dynamic import and a
    // swallowed rejection, so this module keeps working with no network and inside a node test with no
    // `fetch` — saving on this machine must never depend on the store being reachable.
    void import('./cloudSync').then((m) => m.markCloudDirty('schedule')).catch(() => {});
}
```

### 48.2 `src/lib/speakers.ts`

Find and replace:

```ts
function write(list: SpeakerProfile[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore quota/private-mode */ }
}
```

with

```ts
function write(list: SpeakerProfile[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore quota/private-mode */ }
    void import('./cloudSync').then((m) => m.markCloudDirty('speakers')).catch(() => {}); // PROMPT-12
}
```

### 48.3 `src/lib/docs.ts`

Find and replace:

```ts
function write(eventId: string, list: SourceDoc[]): void {
    try { localStorage.setItem(dk(eventId), JSON.stringify(list)); } catch { /* ignore quota/private-mode */ }
}
```

with

```ts
function write(eventId: string, list: SourceDoc[]): void {
    try { localStorage.setItem(dk(eventId), JSON.stringify(list)); } catch { /* ignore quota/private-mode */ }
    void import('./cloudSync').then((m) => m.markCloudDirty('docs')).catch(() => {}); // PROMPT-12
}
```

### 48.4 `src/lib/script.ts`

Hai đường ghi, và **cả hai** đều phải báo — `markPulledLocal` là đường mà một kịch bản vừa kéo về từ
Cascade Matcher đi qua, và đó chính là lúc đáng lưu lên kho nhất.

**(a)** Find and replace:

```ts
        if ((localStorage.getItem(sk(eventId)) ?? '[]') === next) return;
        localStorage.setItem(sk(eventId), next);
        writeSync(eventId, { ...readSync(eventId), updatedAt: new Date().toISOString() });
```

with

```ts
        if ((localStorage.getItem(sk(eventId)) ?? '[]') === next) return;
        localStorage.setItem(sk(eventId), next);
        writeSync(eventId, { ...readSync(eventId), updatedAt: new Date().toISOString() });
        // PROMPT-12 — the shared store, which is a DIFFERENT destination from the Cascade Matcher sync
        // below (`pushToBackend` → data/script.json). Both can be in play at once; neither replaces the
        // other. The early `return` above is why this sits here and not at the top: an unchanged list
        // must not cost a network round trip.
        void import('./cloudSync').then((m) => m.markCloudDirty('script')).catch(() => {});
```

**(b)** Find and replace:

```ts
        localStorage.setItem(sk(eventId), JSON.stringify(list));
        const t = new Date().toISOString();
        writeSync(eventId, { updatedAt: t, syncedAt: t });   // equal timestamps → getSyncState().dirty === false
```

with

```ts
        localStorage.setItem(sk(eventId), JSON.stringify(list));
        const t = new Date().toISOString();
        writeSync(eventId, { updatedAt: t, syncedAt: t });   // equal timestamps → getSyncState().dirty === false
        void import('./cloudSync').then((m) => m.markCloudDirty('script')).catch(() => {}); // PROMPT-12
```

### 48.5 Tests — tệp MỚI `tests/cloudHooks.test.ts`

Bốn ca, kiểm bằng đọc văn bản nguồn:

1. Cả bốn tệp đều chứa `"import('./cloudSync')"`, và mỗi tệp gọi đúng tên loại của mình.
2. `script.ts` chứa **hai** lần `markCloudDirty('script')`.
3. Trong cả bốn tệp, lời gọi `markCloudDirty` nằm **sau** `localStorage.setItem` trong cùng hàm — kiểm
   bằng chỉ số ký tự trong đoạn hàm đó. Ca này ghim rằng lưu tại máy không bao giờ phụ thuộc kênh đồng bộ.
4. Không tệp nào trong bốn tệp có `import ... from './cloudSync'` ở đầu tệp (chỉ nhập động) — khẳng định
   văn bản nguồn **không** chứa `"from './cloudSync'"`.

---

## TASK 49 — màn hình

### 49.1 New file `src/components/CloudSyncPanel.tsx`

Một thành phần tự đứng được. Yêu cầu, không phải mã mẫu — hãy viết theo đúng lối và đúng lớp CSS của
`src/pages/Settings.tsx` (nó dùng `BTN`, `card-lux`, `text-on-surface-variant`… — đọc tệp đó trước):

- Đăng ký `subscribeCloud` trong `useEffect`, hủy khi gỡ.
- Một dòng trạng thái, mỗi trạng thái một câu tiếng Việt rõ ràng: *Đã lưu lên kho chung lúc HH:MM* ·
  *Đang lưu…* · *Còn N thay đổi chưa lưu* · *Chưa với tới kho chung — sẽ tự thử lại* · *Kho chung từ chối
  lưu*.
- Nút **"Lưu lên kho chung ngay"** → `pushNow()`.
- Nút **"Lấy từ kho chung về máy này"** → trước hết gọi `fetchManifest()` và **hiện những gì sẽ về**:
  bao nhiêu buổi trong lịch, bao nhiêu diễn giả, bao nhiêu sự kiện có kịch bản, có tài liệu, lưu lần cuối
  lúc nào và bởi máy nào (`savedBy`, so với `deviceId()` của máy này).
- Sau bảng đó là **một bước xác nhận riêng**, và câu xác nhận phải nói thẳng: *"Việc này sẽ GHI ĐÈ lịch,
  kịch bản, tài liệu và diễn giả đang có trên máy này. Không lấy lại được."* Nút xác nhận dùng màu cảnh
  báo (`border-error text-error` như nút "Xoá dữ liệu cục bộ" ngay cạnh).
- Nếu `savedBy` của kho **trùng** `deviceId()` của máy này thì nói rõ *"bản trên kho do chính máy này lưu"*
  — người dùng cần biết mình không kéo về đồ của người khác.
- `pullNow()` trả `true` ⇒ gọi `window.location.reload()`. Kèm chú thích ngắn giải thích vì sao (§47.2).
- Không có nút nào tự chạy khi mount. Không tự kéo về. Không hỏi máy chủ khi mount ngoài **một** lần
  `fetchManifest()` để hiện dòng "kho chung đang có N buổi" — và lần đó hỏng thì im lặng, không toast.

### 49.2 `src/pages/Settings.tsx` — gắn vào mục Dữ liệu

Mục đó đang tự mô tả sai kể từ bây giờ: nó nói dữ liệu *"được lưu trên chính máy này (localStorage)"*.

**(a)** Nhập. Find and replace:

```tsx
import { OnlineKeysSettings, OnlineMicSettings, OnlineRhythmSettings } from '../lib/lanes/online';
```

with

```tsx
import { OnlineKeysSettings, OnlineMicSettings, OnlineRhythmSettings } from '../lib/lanes/online';
import CloudSyncPanel from '../components/CloudSyncPanel';
```

**(b)** Gắn và sửa lại lời mô tả. Find and replace:

```tsx
                    {/* DỮ LIỆU */}
                    <Section id="dl" icon="database" title="Dữ liệu" desc="Cấu hình & xác nhận được lưu trên chính máy này (localStorage).">
```

with

```tsx
                    {/* DỮ LIỆU */}
                    {/* PROMPT-12 — the description was true until now and is not any more: lịch, kịch bản,
                        tài liệu and diễn giả have a shared copy. Cấu hình and xác nhận genuinely are still
                        per-machine, so the sentence names both halves instead of picking one. */}
                    <Section id="dl" icon="database" title="Dữ liệu" desc="Lịch, kịch bản, tài liệu và diễn giả có bản chung trên kho; cấu hình và xác nhận vẫn nằm trên chính máy này.">
                        <CloudSyncPanel />
```

### 49.3 Tests — tệp MỚI `tests/cloudPanel.test.ts`

Tám ca, kiểm bằng đọc văn bản nguồn:

1. `CloudSyncPanel.tsx` gọi `subscribeCloud` và trả về hàm hủy trong `useEffect`.
2. Chứa cả `pushNow` và `pullNow`.
3. **Kéo về phải qua hai bước.** Tệp chứa `fetchManifest` và chuỗi `'GHI ĐÈ'`, và `pullNow` **không**
   xuất hiện trong cùng một `onClick` với `fetchManifest`.
4. Câu cảnh báo có mặt nguyên vẹn: chứa `'Không lấy lại được'`.
5. Chứa `window.location.reload()`.
6. Có so `savedBy` với `deviceId()`.
7. `Settings.tsx` gắn `<CloudSyncPanel />` **bên trong** mục `id="dl"`, và mô tả cũ
   `'được lưu trên chính máy này (localStorage)'` **không còn** trong tệp.
8. `CloudSyncPanel.tsx` **không** nhập gì từ `schedule`, `script`, `docs`, `speakers` — nó chỉ nói
   chuyện với `cloudSync`.

---

## TASK 50 — hợp đồng

`docs/ONLINE-LANE-CONTRACT.md`: thêm mục cho năm đường dẫn mới ở **cuối** danh sách endpoint, và một
dòng changelog `v0.9` ở đầu tệp theo đúng lối các changelog đang có.

**Đánh số: nối tiếp, không chèn giữa.** Ở PHẦN 6 bạn đã đặt `/online-api/voices` thành **mục 11** (đúng —
prompt lúc đó bảo "mục 8" trong khi 8/9/10 đã có từ PHẦN 3, và bạn đã bắt được). Vậy năm mục mới ở đây là
**12, 13, 14, 15, 16**. Trước khi viết, hãy `grep -n "^[0-9]*\. \`" docs/ONLINE-LANE-CONTRACT.md` để đọc
số thật đang có chứ đừng tin con số trong prompt này — nếu nó khác 11 thì số thật đúng, prompt sai.

Và đừng chèn vào giữa các gạch đầu dòng con của một mục khác: mục mới phải bắt đầu sau khi mục cuối cùng
đã kết thúc trọn vẹn cả phần gạch đầu dòng của nó.

Nội dung tối thiểu phải nêu: năm đường dẫn (`prep/schedule`, `prep/speakers`, `prep/event/script`,
`prep/event/docs`, `prep/manifest`) · hình dạng thân yêu cầu và phản hồi · trần thân yêu cầu (4MB / 12MB) ·
`savedBy` là **mã máy ngẫu nhiên, không phải danh tính người** · rằng cả năm nằm sau cổng đăng nhập có
sẵn · rằng chúng **không nằm trên đường chạy trực tiếp** của một buổi (hỏng thì Chuẩn bị mất đồng bộ,
buổi lễ vẫn chạy trên bản localStorage).

Và nói rõ một điều dễ nhầm: `prep/event/script` **không phải** `data/script.json` của Cascade Matcher.
Hai đích khác nhau, hai mục đích khác nhau, cùng tồn tại.

---

## Kiểm bằng tay (làm hết)

1. `git grep -n "export function\|export const" -- src/lib/schedule.ts src/lib/speakers.ts src/lib/docs.ts src/lib/script.ts | grep -c async` → **0**. Không hàm nào thành async.
2. `git diff --stat -- src/pages/ src/lib/prepData.ts src/lib/readiness.ts src/lib/events.ts src/lib/series.ts src/lib/kbscope.ts` → chỉ `src/pages/Settings.tsx` hiện ra. Không nơi gọi nào phải sửa.
3. `git grep -n "from './cloudSync'" -- src/lib/` → **rỗng**. Bốn module chỉ nhập động.
4. `git grep -n "cloudSync\|prep/schedule\|prep/event" -- src/lib/lanes/` → **rỗng**. Không đụng làn trực tuyến.
5. `git grep -n "pushToBackend\|pullFromBackend\|toCanonical\|getSyncState" -- src/lib/script.ts` ra **giống hệt** trước khi làm phần này — kênh Cascade Matcher không suy suyển.
6. `git status --short -- src/lib/api.ts src/lib/LiveSessionContext.tsx src/lib/useMeter.ts src/lib/lanes/types.ts` → rỗng.
7. `git grep -n "EVENT_ID_OK" -- server/onlineStore.mjs` ra đúng hai dòng (khai báo + dùng), và **không**
   có hàm nào tên kiểu `sanitize`/`cleanId` trong tệp đó — id được TỪ CHỐI, không được làm sạch.
8. Chạy thật, hai trình duyệt khác nhau trên cùng một máy (một cửa sổ thường, một ẩn danh):
   a. Cửa sổ 1: tạo một buổi trong Lịch, nhập kịch bản, chờ vài giây, xem dòng trạng thái đổi thành
      "Đã lưu lên kho chung".
   b. Cửa sổ 2: mở Cài đặt → Dữ liệu → "Lấy từ kho chung về máy này" → bảng phải hiện đúng số buổi và
      nói rằng bản đó do **máy khác** lưu → xác nhận → trang tải lại → **lịch và kịch bản có mặt**.
9. Rút mạng, sửa lịch: việc lưu tại máy vẫn xong, dòng trạng thái nói "Chưa với tới kho chung — sẽ tự thử
   lại". Cắm mạng lại, sửa thêm một chữ: nó tự đẩy cả phần còn nợ. **Màn Chuẩn bị phải dùng được bình
   thường suốt lúc mất mạng** — nếu có chỗ nào treo hay báo lỗi chặn đường, dừng lại và báo.
10. Nhập một tài liệu lớn (vài trăm KB) rồi kéo về ở máy kia: văn bản phải về đủ, không bị cắt.

## Chạy trước khi báo xong

```
npx vitest run
npx tsc --noEmit -p tsconfig.app.json
npm run build
npx oxlint
```

Nền là bộ test sau PROMPT-11 PHẦN 6 = **760 ca / 58 tệp**. Phần này thêm 5 tệp mới:
`eventStore` 12 · `prepEndpoints` 10 · `cloudSync` 12 · `cloudHooks` 4 · `cloudPanel` 8 = **+46 ca**.
⇒ **806 ca / 63 tệp**. Không sửa một ca test có sẵn nào.

Nếu số nền của bạn không phải 760/58 thì dừng lại và báo trước khi làm gì cả.

---

## Nói với Sếp bằng tiếng dễ hiểu

**Vấn đề đang có.** Lịch hội nghị, kịch bản đã duyệt, tài liệu đã nhập và hồ sơ diễn giả hiện chỉ nằm
trong **một trình duyệt trên một máy**. Chuẩn bị ở máy này rồi chạy buổi ở máy khác thì máy kia trắng
trơn. Ai bấm "xóa dữ liệu duyệt web" cũng mất sạch, và không có bản sao nào ở đâu cả.

**Việc này sửa gì.** Bốn thứ đó nay có thêm một **bản chung** nằm trên ổ đĩa của máy chủ — đúng cái ổ đĩa
Sếp đã gắn cho từ điển. Máy nào cũng lấy về được.

**Cách chạy, cố ý làm hai chiều khác nhau:**

- **Lưu lên thì tự động.** Sếp sửa gì trên máy này, vài giây sau nó tự lưu lên kho. Không phải nhớ bấm.
- **Lấy về thì phải bấm, và phải xác nhận hai lần.** Vì lấy về là **ghi đè** thứ đang làm dở trên máy
  này, không lấy lại được. Trước khi ghi đè, màn hình cho Sếp xem **cái gì sắp về** — bao nhiêu buổi, bao
  nhiêu kịch bản, lưu lần cuối lúc nào và do **máy nào** — rồi mới hỏi có chắc không.

**Mất mạng vẫn dùng được bình thường.** Đây là điều tôi giữ chặt nhất: màn Chuẩn bị vẫn đọc dữ liệu ngay
trên máy như trước, không chờ mạng một giây nào. Mất mạng thì phần lưu lên kho tạm hoãn, có mạng lại thì
tự gửi nốt. Không có màn hình nào bị treo vì mạng.

**Chỗ Sếp sẽ thấy:** Cài đặt → mục **Dữ liệu**. Ở đó có dòng trạng thái, nút "Lưu lên kho chung ngay" và
nút "Lấy từ kho chung về máy này".

**Một điều xin lưu ý.** Sau khi lấy về, trang sẽ **tự tải lại**. Đó là cố ý: các màn hình đã mở đang giữ
dữ liệu cũ trong bộ nhớ, và để tất cả cùng thấy dữ liệu mới thì cách chắc chắn nhất là bắt đầu lại.
