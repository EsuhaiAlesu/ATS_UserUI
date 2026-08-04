# PROMPT-11 · PHẦN 3/3 — Từ điển riêng cho bản trực tuyến · Nhớ theo từng buổi

**Gửi:** Claude của Sếp Sơn Lê · **Repo:** `ATS_UserUI` · **Nhánh nền:** `develop` tại commit **`3afcee3`**,
**đã áp dụng xong PHẦN 1 và PHẦN 2** · **Ngày:** 03/08/2026 · **Sự kiện:** Lễ kỷ niệm 20 năm, 08/08/2026

---

## PHẦN CHO SẾP ĐỌC (tiếng Việt)

Thưa Sếp, đây là phần cuối. Hai phần trước lo chuyện **nghe cho đúng và dịch cho gọn**. Phần này lo một
chuyện khác hẳn: **máy nhớ được những gì Sếp đã dạy nó.**

Hôm nay có ba chỗ mất công vô ích:

- **Trang Từ điển không dùng được trên bản chạy trên mạng.** Trang đó nói chuyện với máy chủ đặt tại
  văn phòng; bản chạy trên mạng không với tới máy đó, nên mở lên là trắng.
- **Ô "Thuật ngữ" và ô "Bối cảnh" ở màn điều khiển không được nhớ.** Gõ tay vào đó, tải lại trang là mất.
  Máy khác mở cùng buổi cũng không thấy.
- **Chỗ sửa nghe nhầm cũng chỉ nằm trên một máy.** Mỗi dòng trong đó là một lần Sếp nghe máy đọc sai rồi
  sửa lại — công sức thật, mà đổi máy là mất sạch.
- Vì ba chuyện trên, trước mỗi buổi lại phải gõ lại từ đầu.

Sau phần này:

- **Có "Từ điển trực tuyến" ngay trong màn hình điều khiển** — một nút mới ở cột trái. Thêm, sửa, xoá từ
  ngay tại chỗ. Nó chạy được trên bản trên mạng, **không cần máy chủ ở văn phòng**. Trang Từ điển cũ giữ
  nguyên, không đụng tới.
- **Ô Thuật ngữ và ô Bối cảnh được nhớ theo từng buổi.** Sếp gõ cho buổi nào thì buổi đó nhớ; mở lại
  ngày hôm sau, hoặc mở trên máy khác, chữ vẫn còn nguyên. Máy chỉ tự điền khi ô đang trống, **không bao
  giờ đè lên chữ Sếp đã gõ.**
- **Chỗ sửa nghe nhầm được nhớ chung cho mọi buổi, mọi máy.** Cái này khác hai ô trên: nó **không** chia
  theo buổi. Máy nghe sai một cái tên ở buổi này thì buổi sau cũng sai đúng cái tên đó, nên Sếp chỉ cần
  sửa **một lần duy nhất** — sau đó mở ở máy nào, buổi nào, dòng sửa ấy cũng đã có sẵn.
- **Chỗ chứa các thứ đó** nằm trên ổ lưu trữ của dịch vụ chạy web, do người quản trị gắn một lần.
  **Sếp không phải cài đặt gì cả** — nếu chưa gắn, máy tự dùng thư mục tạm và mọi thứ vẫn chạy.

Cuối phần này có một **bảng kiểm 5 dòng**: bấm Bắt đầu là dùng được — buổi có kịch bản thì đọc theo câu
đã duyệt, buổi không có kịch bản thì chạy bình thường không báo đỏ, ô Thuật ngữ vào đúng chỗ, ô Bối cảnh
vào đúng chỗ, Từ điển trực tuyến đọc/ghi được, và các ô nhớ được chữ đã gõ.

---

## THE REST OF THIS FILE IS FOR THE ASSISTANT

<role>
You are working in the `ATS_UserUI` repository, finishing PROMPT-11. **PART 1 and PART 2 of this prompt
have already been applied** and its 547 tests pass. This file is tasks 18 to 20.
</role>

<context>
Three things the operator teaches this app do not survive: the glossary page talks to an internal backend
over `/api` that the deployed build cannot reach; the console's Thuật ngữ / Bối cảnh boxes are plain
component state, so a reload empties them and a second machine opening the same meeting sees nothing; and
the mishearing box lives in one browser's localStorage, so every line the operator earned by hearing the
machine fail is lost the moment they move to another machine. Every rehearsal has therefore started by
retyping what was already typed.

This part gives the online lane a small store of its own on the deploy's persistent disk, its own glossary
that does not depend on the office machine, makes the two meeting boxes remember themselves per meeting
and per direction, and stores the mishearing list **globally** — one list, every meeting, every machine.
The offline `/glossary` page and `src/lib/api.ts` are NOT touched — they keep working exactly as they do.

The gala is on 2026-08-08.
</context>

<how_to_work>
- **⚠️ BASELINE FOR THIS FILE IS DIFFERENT FROM PARTS 1 AND 2. READ THIS TWICE.** Every "replace" block
  here quotes the code **as PART 1 and PART 2 leave it**, not as it stands at `3afcee3`. Apply PART 1,
  then PART 2, then this file. If you are reading this without having applied both, stop — nothing below
  will be found.
- **Find it, replace it, byte-for-byte, indentation included.** If a block cannot be found verbatim,
  STOP and report it rather than applying a similar-looking edit.
- **One pass, no per-task report.** Work through the tasks in the order given. Report once, at the end.
- **Follow this repo's own `CLAUDE.md`.** Online-lane client code stays under `src/lib/lanes/online/`;
  only `src/pages/AudioRouting.tsx`, `src/pages/Settings.tsx` and `/online-lab` may import the facade
  root, and never anything deeper. This part adds **no new import point** — the new panel lives inside
  the console, which is already inside the lane.
- **`src/lib/prepData.ts` is a neutral bridge, not a lane file.** TASK 19 adds one `fetch` to it. It must
  NOT import anything from `src/lib/lanes/online/` — that would make a lane file reachable from the
  offline side. A plain `fetch('/online-api/glossary')` is the whole integration.
- **Do not touch `src/lib/api.ts`, the `/glossary` page, or any offline-lane file.** The online glossary
  is a SEPARATE store with the same entry shape, deliberately: the office backend is not going to be
  reachable from the deployed build, and pretending otherwise is what broke this the first time.
- **Add no dependency.** `package.json` and `package-lock.json` must end with zero lines changed. The
  store uses `node:fs/promises` and `node:path`, both already imported by `server/online-api.mjs`.
- **Tests are part of each task**, not a phase at the end. Same vitest **node** environment; React
  behaviour is asserted by reading component source with `readFileSync`, never by rendering.
- **RED LIGHTS — stop and report instead of improvising:** `src/lib/lanes/types.ts` would have to
  change · `package.json` would have to change · an offline-lane file or `src/lib/api.ts` would have to
  change · a replace block's old text is not present verbatim after PART 1 + PART 2.
</how_to_work>

<what_you_must_not_do>
- Do not write any new authentication code. Every `/online-api/*` route already runs behind the app's
  existing login gate — `server.js` passes `requireAuth` into `installOnlineApi`, and the handler
  answers 401 before any route matches. Inherit it; do not re-implement it.
- Do not add, change or read any API key, and do not add environment variables to the client. `DATA_DIR`
  is a server-side path, nothing else, and it appears only under `server/`.
- Do not move the schedule, the script, the documents or the speaker roster off localStorage. That is a
  later prompt. This part persists exactly three things: the online glossary, the two per-meeting console
  boxes, and the global mishearing list. Nothing else moves off localStorage.
- Do not build a transcript history page.
- Do not modify any existing test file EXCEPT the one line named in TASK 20 §20.6 — the endpoint-count
  assertion PART 2 wrote, which this part deliberately makes out of date.
</what_you_must_not_do>

## Task list — PART 3

| # | What | Main files |
|---|---|---|
| 18 | A small persistent store for the online lane (`DATA_DIR`, atomic writes) | `server/onlineStore.mjs` (new), `server/online-api.mjs` |
| 19 | An online glossary of its own: two routes, a client module, a console panel | `server/online-api.mjs`, `onlineGlossary.ts` (new), `index.ts`, `OnlineConsole.tsx`, `prepData.ts` |
| 20 | Thuật ngữ + Bối cảnh remembered per meeting × direction, the mishearing list remembered globally, and the contract | `server/online-api.mjs`, `sessionBoxes.ts` (new), `index.ts`, `OnlineConsole.tsx`, `docs/ONLINE-LANE-CONTRACT.md` |

Expected test count when you are done: **547 → 605**.
---

# TASK 18 — A small store that survives a redeploy

**Why.** Everything the operator teaches this app today lives in one browser's localStorage, and the three
things this part is about — a glossary, the two console boxes, and the mishearing list — need to outlive
both the browser and the deploy. The deploy has a persistent disk available; nothing reads or writes it yet.

**Deliberately tiny.** Three fixed file names, JSON, atomic writes, no index, no schema migration, no
database. The data is a few kilobytes and the failure mode that matters is "half-written file after a
restart" — which `write to a temp name, then rename` closes, and nothing else here needs to.

**Where it lives.** `DATA_DIR` is a server-side path and appears nowhere under `src/`. Unset, the store
falls back to a local directory so a developer clone runs with no volume attached at all.

## 18.1 New file `server/onlineStore.mjs`

```js
// server/onlineStore.mjs — the ONLINE lane's own small persistent store.
//
// Three fixed JSON files, read and written whole. That is the entire design, and it is deliberate: the
// payload is a glossary of a few hundred entries and a handful of text boxes — kilobytes — and the only
// failure that has ever mattered for data this size is a half-written file after a restart. `write to a
// temp name, then rename` closes that (rename is atomic within a directory) and nothing else is needed.
//
// WHERE it writes:
//   DATA_DIR set   → that directory (the deploy mounts a persistent disk there)
//   DATA_DIR unset → ./online-data next to the server, so a dev clone runs with no disk attached
//
// `DATA_DIR` is read on EVERY call, never latched at import time — otherwise a test could not point the
// store at a temp directory, and neither could an operator who fixes the mount without a redeploy.
//
// No key, no vendor name, no other environment variable is read here. This module knows about a
// directory and three file names.

import fs from 'node:fs/promises';
import path from 'node:path';

/** The only names this store will open. Anything else is a bug in the caller, not a request. */
const FILES = {
  glossary: 'online-glossary.json',
  boxes: 'session-boxes.json',
  // TASK 20: the mishearing corrections, kept GLOBALLY rather than per meeting. What the recogniser gets
  // wrong is a property of the words themselves — a company name it mangles at the anniversary is the
  // same name it will mangle at next month's briefing — so one list, learned once, serves every meeting.
  mishearings: 'mishearings.json',
};

/** Kilobytes are expected; a megabyte means something upstream lost its mind. Refuse rather than fill the disk. */
export const STORE_MAX_BYTES = 1024 * 1024;

const FALLBACK_DIR = './online-data';

/** The directory in use right now. Exported so a diagnostic can say where things are without guessing. */
export function storeDir() {
  const configured = (process.env.DATA_DIR ?? '').trim();
  return configured || FALLBACK_DIR;
}

function resolveFile(name) {
  const file = FILES[name];
  // A name that is not one of ours never becomes a path. This is the whole path-traversal story: the
  // caller passes a KEY, never a filename, so there is nothing for `../` to be smuggled through.
  if (!file) throw new Error(`Unknown store: ${String(name).slice(0, 40)}`);
  return path.join(storeDir(), file);
}

/**
 * Read one store. NEVER throws for a missing, empty, oversized or corrupt file — it returns `fallback`.
 * A glossary that fails to parse must leave the console usable and empty, not take the session down.
 */
export async function readStore(name, fallback) {
  const file = resolveFile(name);
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > STORE_MAX_BYTES) return fallback;
    const raw = await fs.readFile(file, 'utf8');
    if (!raw.trim()) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/**
 * Write one store atomically. Returns the number of bytes written. Throws on a payload over the ceiling
 * or on a real disk error — the caller turns that into a 500 the operator can see, because a save that
 * silently did nothing is how a hall full of people ends up with yesterday's glossary.
 */
export async function writeStore(name, value) {
  const file = resolveFile(name);
  const body = JSON.stringify(value ?? null, null, 2);
  const bytes = Buffer.byteLength(body, 'utf8');
  if (bytes > STORE_MAX_BYTES) throw new Error(`Store payload too large (${bytes} bytes).`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, body, 'utf8');
  // Same directory ⇒ the rename is atomic: a reader sees either the old file or the new one, never a
  // half-written one, whatever moment the process dies at.
  await fs.rename(tmp, file);
  return bytes;
}
```

## 18.2 `server/online-api.mjs` — make the store reachable

Replace:

```js
import { getOnlineConfig, getConfigStatus, setOnlineConfig, ONLINE_KEY_SLUGS } from './online-config.mjs';
import { createHash } from 'node:crypto';
```

with

```js
import { getOnlineConfig, getConfigStatus, setOnlineConfig, ONLINE_KEY_SLUGS } from './online-config.mjs';
// TASK 18 — the lane's own small persistent store (DATA_DIR, atomic JSON). Used by the online glossary
// (TASK 19) and the per-meeting boxes (TASK 20).
import { readStore, writeStore, storeDir } from './onlineStore.mjs';
import { createHash } from 'node:crypto';
```

## 18.3 The budgets the routes will enforce

Replace:

```js
const HISTORY_DIR = env('ONLINE_HISTORY_DIR', './translated_history');
```

with

```js
const HISTORY_DIR = env('ONLINE_HISTORY_DIR', './translated_history');
// TASK 19/20 — ceilings for the stored collections. They are generous by an order of magnitude against
// real use (a gala glossary is ~200 entries) and exist so a runaway client cannot fill the disk.
const ONLINE_GLOSSARY_MAX = 2_000;
const ONLINE_GLOSSARY_FIELD_CHARS = 200;
const SESSION_BOXES_MAX_SCOPES = 500;
// The mishearing box is one plain string. 2 000 is the same ceiling the client already applies to it, so
// a client at its limit is never silently truncated by the server.
const SESSION_MISHEARINGS_MAX_CHARS = 2_000;
```

## 18.4 Tests — new file `tests/onlineStore.test.ts`, **16 cases**

`const { storeDir, readStore, writeStore, STORE_MAX_BYTES } = await import('../server/onlineStore.mjs')`.
Use `node:fs` + `node:os` to make a real temp directory per test (`fs.mkdtempSync(path.join(os.tmpdir(), 'store-'))`),
point `process.env.DATA_DIR` at it, and remove it afterwards. Restore the previous `DATA_DIR` in
`afterEach` — leaking it would change what every later test in the run sees.

**`describe('where it writes')`**

1. `DATA_DIR` unset ⇒ `storeDir()` is `'./online-data'` — a dev clone runs with no disk attached.
2. `DATA_DIR` set ⇒ `storeDir()` is that value; surrounding whitespace is trimmed; an all-whitespace
   value falls back rather than writing to a directory named `' '`.
3. `DATA_DIR` is read per call, not latched: change it between two `storeDir()` calls and the second
   answer follows.
4. An unknown store name throws and writes nothing — assert the temp directory is still empty after a
   rejected `writeStore('../escape', {})`.

**`describe('reading never takes the session down')`**

5. Reading a store whose file does not exist returns the fallback and does not throw.
6. A file containing `'{ broken'` returns the fallback.
7. An empty file, and a file containing only whitespace, both return the fallback.
8. A file containing `'null'` returns the fallback, not `null` — a caller expecting an array must not be
   handed something it cannot iterate.

**`describe('writing is atomic')`**

9. Round-trip: `writeStore('glossary', [{ vi: 'a', ja: 'b' }])` then `readStore('glossary', [])` gives
   the same array; an object round-trips too.
10. After a successful write no `.tmp` file is left in the directory — read the directory and assert
    exactly one file.
11. The directory is created when it does not exist yet: point `DATA_DIR` at an unused sub-path and write.
12. Two writes in a row leave exactly one file, with the second value.
13. A payload over `STORE_MAX_BYTES` rejects, and the previously written file is **unchanged** — build the
    oversize value from a long string, catch the rejection, then read and compare.

**`describe('three stores, one directory')`**

14. All three keys resolve to distinct files and do not collide: write a different value under
    `'glossary'`, `'boxes'` and `'mishearings'`, then read all three back and assert each returns its own
    value. Assert the directory then holds exactly **three** files.
15. The names are fixed, not caller-supplied: read `server/onlineStore.mjs` as text and assert it contains
    `mishearings: 'mishearings.json'`, and that `resolveFile` still reaches `FILES[name]` rather than
    joining anything that arrived from a request.

**`describe('and nothing else')`**

16. Read `server/onlineStore.mjs` as text: the only `process.env` reference in it is `DATA_DIR`
    (match `/process\.env\.(\w+)/g` and assert the set of captures is exactly `['DATA_DIR']`), and it
    imports nothing outside `node:fs/promises` and `node:path`.

Running total after this task: 547 + 16 = **563**.
---

# TASK 19 — A glossary the deployed build can actually reach

**Why.** The Từ điển page speaks to `/api`, an internal backend that is not part of this deploy. On the
deployed build the page is therefore empty and every term the operator ever curated is invisible to the
live session. `collectPrepPack` already treats that as normal — `glossaryReachable: false` — and carries
on with the speaker roster alone, which is exactly why the console's Thuật ngữ box has to be filled by
hand before every rehearsal.

**A separate store, on purpose.** Not a bridge to the old page, not a sync: the office backend is not
going to be reachable from the deploy, and pretending it is what has to be worked around. The entry shape
is copied from the offline one so the same ranking logic applies to both, but the two stores stay
independent — the `/glossary` page and `src/lib/api.ts` are not touched by this task at all.

**Line-oriented, like every other box on this console.** `nguồn = đích`, one per line, `*` at the end for
a term the recogniser should be primed with. The operator already types the Thuật ngữ box this way; a
grid with per-row buttons would be a second thing to learn for the same result.

## 19.1 `server/online-api.mjs` — normalise what arrives

Replace:

```js
// ---------- raw-http request/response helpers ----------
```

with

```js
// ---------- TASK 19: the online glossary, normalised on the way in ----------
// A stored glossary is read by the live path, so what lands on disk has to be boring: known fields only,
// strings clipped, every entry carrying at least one usable side. An entry with neither `vi` nor `ja` is
// not a term, it is a blank row somebody left behind, and it would spend a keyterm slot on nothing.
export function normalizeGlossaryEntries(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const s = (v) => (typeof v === 'string' ? v.trim().slice(0, ONLINE_GLOSSARY_FIELD_CHARS) : '');
    const vi = s(raw.vi);
    const ja = s(raw.ja);
    if (!vi && !ja) continue;
    const entry = { vi, ja };
    const reading = s(raw.reading);
    if (reading) entry.reading = reading;
    const type = s(raw.type);
    if (type) entry.type = type;
    if (raw.asr_hotword === true) entry.asr_hotword = true;
    const note = s(raw.note);
    if (note) entry.note = note;
    if (Array.isArray(raw.misheard)) {
      const misheard = raw.misheard.map(s).filter(Boolean).slice(0, 12);
      if (misheard.length) entry.misheard = misheard;
    }
    out.push(entry);
    if (out.length >= ONLINE_GLOSSARY_MAX) break;
  }
  return out;
}

// ---------- raw-http request/response helpers ----------
```

## 19.2 `server/online-api.mjs` — two routes

Replace:

```js
      // An /online-api/* path we don't serve over HTTP (e.g. /asr is WS-only).
```

with

```js
      // ---- TASK 19: the ONLINE glossary, on the TASK 18 store ----
      // Behind the same gate as everything else under /online-api/* — the handler answered 401 above
      // before any route matched, so there is no auth code here and there must never be any.
      if (pathname === '/online-api/glossary' && req.method === 'GET') {
        const entries = await readStore('glossary', []);
        sendJson(res, 200, { entries: Array.isArray(entries) ? entries : [] });
        return true;
      }
      if (pathname === '/online-api/glossary' && req.method === 'PUT') {
        const body = await readJsonBody(req, 4 * 1024 * 1024);
        const entries = normalizeGlossaryEntries(body?.entries);
        try {
          const bytes = await writeStore('glossary', entries);
          logLine('glossary.saved', { count: entries.length, bytes });
          sendJson(res, 200, { saved: true, count: entries.length });
        } catch (error) {
          logLine('glossary.save_fail', { message: String(error?.message ?? error).slice(0, 300) });
          sendJson(res, 500, { error: 'Failed to save the glossary.' });
        }
        return true;
      }

      // An /online-api/* path we don't serve over HTTP (e.g. /asr is WS-only).
```

## 19.3 New file `src/lib/lanes/online/onlineGlossary.ts`

```ts
// src/lib/lanes/online/onlineGlossary.ts — the ONLINE lane's own glossary.
//
// Separate from the offline `/glossary` page ON PURPOSE. That page reads and writes `/api`, an internal
// backend that the deployed build cannot reach; this one lives on the deploy's own store. The ENTRY SHAPE
// is deliberately the same as the offline `GlossaryEntry` so `prepData.ts` can rank both with one code
// path — but the shape is COPIED here, never imported: a lane file may not import `src/lib/api.ts`.
//
// The editor is line-oriented, because the operator already types the Thuật ngữ box that way:
//
//   Esuhai = エスハイ *      →  vi/ja pair, primed into the recogniser
//   GEM Center *             →  one side only: keep the name verbatim, and prime it
//   kỹ sư = エンジニア        →  an ordinary term, not primed
//
// A trailing `*` marks `asr_hotword`. Nothing else is parsed: a glossary is not a config file.

const ONLINE_BASE = '/online-api';

/** Same fields as the offline entry (copied, not imported — see the header). */
export interface OnlineGlossaryEntry {
  vi: string;
  ja: string;
  reading?: string;
  type?: string;
  asr_hotword?: boolean;
  misheard?: string[];
  note?: string;
}

/** Mirrors the server ceiling. Kept here so the editor can say "too many" before the round trip. */
export const ONLINE_GLOSSARY_MAX = 2_000;

export interface GlossaryLineParse {
  entries: OnlineGlossaryEntry[];
  /** Lines that carried text but produced nothing usable, verbatim, so the box can name them. */
  invalid: string[];
}

/**
 * Parse the editor's text. Never throws. Blank lines and `#` comments are skipped in silence; a line that
 * survives trimming but yields no side at all is reported rather than dropped, because a term that
 * vanishes without a word is exactly how a rehearsal loses a name.
 */
export function parseGlossaryLines(text: string): GlossaryLineParse {
  const entries: OnlineGlossaryEntry[] = [];
  const invalid: string[] = [];
  for (const rawLine of (text ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    let body = line;
    let hotword = false;
    if (body.endsWith('*')) {
      hotword = true;
      body = body.slice(0, -1).trim();
    }
    const cut = body.indexOf('=');
    const vi = (cut >= 0 ? body.slice(0, cut) : body).trim();
    const ja = (cut >= 0 ? body.slice(cut + 1) : '').trim();
    if (!vi && !ja) {
      invalid.push(line);
      continue;
    }
    const entry: OnlineGlossaryEntry = { vi, ja };
    if (hotword) entry.asr_hotword = true;
    entries.push(entry);
    if (entries.length >= ONLINE_GLOSSARY_MAX) break;
  }
  return { entries, invalid };
}

/** The inverse, so opening the panel shows what was saved rather than an empty box. */
export function formatGlossaryLines(entries: readonly OnlineGlossaryEntry[]): string {
  return entries
    .map((e) => {
      const vi = (e.vi ?? '').trim();
      const ja = (e.ja ?? '').trim();
      const pair = vi && ja ? `${vi} = ${ja}` : vi || ja;
      return e.asr_hotword ? `${pair} *` : pair;
    })
    .filter(Boolean)
    .join('\n');
}

/** Reading never throws: an unreachable store means an empty glossary, not a broken console. */
export async function fetchOnlineGlossary(): Promise<OnlineGlossaryEntry[]> {
  try {
    const res = await fetch(`${ONLINE_BASE}/glossary`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = (await res.json()) as { entries?: unknown };
    return Array.isArray(data.entries) ? (data.entries as OnlineGlossaryEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Saving DOES throw, with a Vietnamese message: whoever pressed the button is standing in a hall and has
 * to know whether the thing they just typed is stored or gone.
 */
export async function saveOnlineGlossary(entries: readonly OnlineGlossaryEntry[]): Promise<number> {
  const res = await fetch(`${ONLINE_BASE}/glossary`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) throw new Error(res.status === 401 ? 'Phiên đăng nhập đã hết — tải lại trang rồi lưu lại.' : `Lưu từ điển thất bại (${res.status}).`);
  const data = (await res.json()) as { count?: number };
  return typeof data.count === 'number' ? data.count : entries.length;
}
```

## 19.4 `index.ts` (facade) — re-export it

Replace:

```ts
export { summarizePrepDocs, PREP_DOCS_MAX, PREP_DOC_MAX_CHARS } from './prepBrief'
export type { PrepBriefInput, PrepBriefResult, PrepBriefDoc } from './prepBrief'
```

with

```ts
export { summarizePrepDocs, PREP_DOCS_MAX, PREP_DOC_MAX_CHARS } from './prepBrief'
export type { PrepBriefInput, PrepBriefResult, PrepBriefDoc } from './prepBrief'
// TASK 19 — the ONLINE lane's own glossary (its own store; the offline /glossary page is untouched).
// Plain async functions like the summariser above: pre-session work, never reachable from a live session.
export { fetchOnlineGlossary, saveOnlineGlossary, parseGlossaryLines, formatGlossaryLines, ONLINE_GLOSSARY_MAX } from './onlineGlossary'
export type { OnlineGlossaryEntry, GlossaryLineParse } from './onlineGlossary'
```

## 19.5 `OnlineConsole.tsx` — the panel

**(a) The import.** Add `fetchOnlineGlossary`, `saveOnlineGlossary`, `parseGlossaryLines` and
`formatGlossaryLines` to the facade import on line 16. They are functions, not types.

That line has already been rewritten **six times** by PART 1 and PART 2, by five different tasks:

| Where | What it did to line 16 |
|---|---|
| PART 1, TASK 1 §1.2(c) | dropped the type `ScriptMatcherEntry` |
| PART 1, TASK 3 §3.4(a) | added `MIC_SENSITIVITY_OPTIONS`, `micSensitivityLabel`, `LOUD_GATE_OPTIONS`, `resolveLoudThreshold` and the types `MicSensitivity`, `LoudGateMode` |
| PART 1, TASK 5 §5.4(b) | added `splitMishearingLines` |
| PART 2, TASK 7 §7.3(a) | added `previewKeyterms` |
| PART 2, TASK 7 §7.3, closing line | added `KEYTERM_MAX` and `KEYTERM_MAX_LEN` |
| PART 2, TASK 13 §13.6 | added `SPEECH_RHYTHM_OPTIONS` and the type `SpeechRhythm` |

> This is written as an instruction and **not** as a replace block on purpose: by the time you reach this
> file, line 16 is whatever those six edits made of it, and **no quotable form of it exists** — which is
> also why no block anywhere in PART 3 anchors on it. Every other block in PART 3 is quoted verbatim and
> must be found verbatim. TASK 20 §20.4(a) adds five more names to this same line; you may do both at once.

**(b)** Replace:

```tsx
type Panel = 'gate' | 'voice' | 'terms' | 'brief' | 'wall' | null
```

with

```tsx
type Panel = 'gate' | 'voice' | 'terms' | 'brief' | 'glossary' | 'wall' | null
```

**(c)** The panel's own state and handlers. Replace:

```tsx
  // TASK 7: exactly what the recogniser will be primed with, computed from the two boxes that feed it.
```

with

```tsx
  // ── TASK 19: the ONLINE glossary panel ──
  // Loaded when the panel is first opened, not on mount: this component re-renders on every subtitle
  // line, and a glossary the operator may never open should not cost a request at the start of a
  // ceremony. `glossaryLoaded` is the latch; the text is the operator's until they press Lưu.
  const [glossaryText, setGlossaryText] = useState('')
  const [glossaryState, setGlossaryState] = useState<{ busy: boolean; note: string; error: string }>({ busy: false, note: '', error: '' })
  const glossaryLoadedRef = useRef(false)
  const loadGlossary = useCallback(async () => {
    setGlossaryState({ busy: true, note: '', error: '' })
    const entries = await fetchOnlineGlossary()
    glossaryLoadedRef.current = true
    setGlossaryText(formatGlossaryLines(entries))
    setGlossaryState({ busy: false, note: `${entries.length} mục`, error: '' })
  }, [])
  useEffect(() => {
    if (panel !== 'glossary' || glossaryLoadedRef.current) return
    void loadGlossary()
  }, [panel, loadGlossary])
  const glossaryParse = useMemo(() => parseGlossaryLines(glossaryText), [glossaryText])
  const saveGlossary = async () => {
    setGlossaryState({ busy: true, note: '', error: '' })
    try {
      const count = await saveOnlineGlossary(glossaryParse.entries)
      setGlossaryState({ busy: false, note: `Đã lưu ${count} mục`, error: '' })
    } catch (error) {
      setGlossaryState({ busy: false, note: '', error: error instanceof Error ? error.message : 'Lưu từ điển thất bại.' })
    }
  }

  // TASK 7: exactly what the recogniser will be primed with, computed from the two boxes that feed it.
```

**(d)** The rail button. Replace:

```tsx
            <RailBtn icon="article" label="Bối cảnh" title="Bối cảnh (brief) cho bản dịch" tone={panel === 'brief' ? 'active' : 'default'} onClick={() => setPanel((p) => (p === 'brief' ? null : 'brief'))} />
```

with

```tsx
            <RailBtn icon="article" label="Bối cảnh" title="Bối cảnh (brief) cho bản dịch" tone={panel === 'brief' ? 'active' : 'default'} onClick={() => setPanel((p) => (p === 'brief' ? null : 'brief'))} />
            <RailBtn icon="translate" label="Từ điển" title="Từ điển riêng của bản trực tuyến — dùng được không cần máy chủ nội bộ" tone={panel === 'glossary' ? 'active' : 'default'} onClick={() => setPanel((p) => (p === 'glossary' ? null : 'glossary'))} />
```

**(e)** The panel body. Replace:

```tsx
            {panel === 'brief' && (
```

with

```tsx
            {panel === 'glossary' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-label-caps text-label-caps text-on-surface">Từ điển trực tuyến</h3>
                  <button onClick={() => { void loadGlossary() }} disabled={glossaryState.busy} title="Tải lại từ kho lưu"
                    className="inline-flex items-center gap-1 rounded-lg border border-outline-variant text-on-surface-variant px-2.5 py-1 text-xs hover:text-primary hover:border-primary transition-colors disabled:opacity-50">
                    <span className={`material-symbols-outlined text-[15px] ${glossaryState.busy ? 'animate-spin' : ''}`} aria-hidden="true">{glossaryState.busy ? 'progress_activity' : 'refresh'}</span>Tải lại
                  </button>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Mỗi dòng một mục: <span className="font-mono">tiếng Việt = tiếng Nhật</span>. Thêm dấu{' '}
                  <span className="font-mono">*</span> ở cuối dòng để mồi cho máy nghe. Từ điển này nằm trên
                  kho của bản trực tuyến — <strong>không cần máy chủ nội bộ</strong>, và nút “Nạp từ Chuẩn bị”
                  ở ô Thuật ngữ sẽ gộp nó vào.
                </p>
                <textarea value={glossaryText} onChange={(e) => setGlossaryText(e.target.value)} rows={12}
                  className={TEXTAREA_CLS} placeholder={'Esuhai = エスハイ *\nGEM Center *\nkỹ sư = エンジニア'} />
                <div className="flex items-center justify-between gap-2 text-[11px] text-on-surface-variant">
                  <span className="tabular-nums">{glossaryParse.entries.length} mục</span>
                  <button onClick={() => { void saveGlossary() }} disabled={glossaryState.busy}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/60 text-primary px-2.5 py-1 text-xs hover:bg-primary/10 transition-colors disabled:opacity-50">
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">save</span>Lưu từ điển
                  </button>
                </div>
                {glossaryParse.invalid.length > 0 && (
                  <p className="text-[11px] text-error leading-relaxed">
                    {glossaryParse.invalid.length} dòng chưa dùng được: {glossaryParse.invalid.slice(0, 3).join(' · ')}
                  </p>
                )}
                {glossaryState.error && <p className="text-[11px] text-error leading-relaxed">{glossaryState.error}</p>}
                {glossaryState.note && !glossaryState.error && <p className="text-[11px] text-secondary leading-relaxed">{glossaryState.note}</p>}
              </div>
            )}
            {panel === 'brief' && (
```

## 19.6 `src/lib/prepData.ts` — read the second source

One edit, and it is the whole integration. `glossary` becomes the MERGED list, so `stats.glossary` counts
both sources with no second change, and the existing ranking, de-duplication and budget code is untouched.

> **`prepData.ts` must not import a lane file** (CLAUDE.md rule 2) — this is a plain `fetch`, and there is
> no import to add.

Replace:

```ts
  let glossary: GlossaryEntry[] = []
  let glossaryReachable = true
  try {
    glossary = await getGlossary()
  } catch {
    glossaryReachable = false
  }
```

with

```ts
  let glossary: GlossaryEntry[] = []
  let glossaryReachable = true
  try {
    glossary = await getGlossary()
  } catch {
    glossaryReachable = false
  }

  // ── TASK 19: the ONLINE glossary — the one that works on the deployed build ──
  // Appended, not substituted. When both are reachable the office glossary is the curated one and wins a
  // tie, because the de-duplication below keeps the FIRST entry at a given rank. When `/api` is absent —
  // which is the normal state of the deployed build — this is the only glossary there is, and without it
  // the Thuật ngữ box has to be retyped by hand before every session.
  //
  // A plain fetch, deliberately: this file is a neutral bridge and may not import the online lane. It
  // must never throw, so an unreachable store contributes nothing and is not an error.
  try {
    const res = await fetch('/online-api/glossary', { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const data = (await res.json()) as { entries?: unknown }
      if (Array.isArray(data.entries)) glossary = [...glossary, ...(data.entries as GlossaryEntry[])]
    }
  } catch { /* no online store on this deploy — not an error */ }
```

## 19.7 Tests — new file `tests/onlineGlossary.test.ts`, **20 cases**

`import { parseGlossaryLines, formatGlossaryLines, ONLINE_GLOSSARY_MAX, type OnlineGlossaryEntry } from '../src/lib/lanes/online/onlineGlossary'`,
`const { normalizeGlossaryEntries } = await import('../server/online-api.mjs')` — the block above already writes it as
an `export function`, matching every other named export in that file — plus `readFileSync` source guards.

**`describe('the editor text')`**

1. `'Esuhai = エスハイ'` → one entry, `vi: 'Esuhai'`, `ja: 'エスハイ'`, no `asr_hotword` key at all.
2. A trailing `*` sets `asr_hotword: true` and is not left in either side; `'GEM Center *'` gives
   `vi: 'GEM Center'`, `ja: ''`, `asr_hotword: true`.
3. Blank lines, whitespace-only lines and `#` comments produce nothing and are NOT reported as invalid.
4. Spacing around `=` is irrelevant: `'a=b'`, `'a = b'` and `'  a  =  b  '` give the same entry.
5. A line with an `=` but nothing on either side is reported in `invalid`, verbatim, rather than dropped.
6. Only the FIRST `=` splits: `'a = b = c'` → `vi: 'a'`, `ja: 'b = c'`.
7. `parseGlossaryLines('')` and `parseGlossaryLines(undefined as unknown as string)` both give empty
   arrays and do not throw.
8. More than `ONLINE_GLOSSARY_MAX` lines stops at the ceiling instead of growing without bound.

**`describe('and back again')`**

9. `formatGlossaryLines(parseGlossaryLines(text).entries)` is stable — run it twice on a mixed sample and
   assert the second pass equals the first.
10. A one-sided entry formats without a stray `=`; a hotword entry formats with a single trailing ` *`.
11. An entry with neither side formats to nothing rather than an empty line.

**`describe('the server keeps the store boring')`**

12. `normalizeGlossaryEntries` drops entries with neither side, non-objects, `null`, and a non-array input
    (→ `[]`).
13. Unknown fields are stripped: an entry with `{ vi, ja, evil: 1 }` comes back without `evil`.
14. Long fields are clipped to 200 characters; `asr_hotword` survives only when it is exactly `true`
    (`'true'` and `1` do not set it).
15. `misheard` survives as an array of non-empty trimmed strings, capped at 12; a non-array `misheard` is
    dropped without throwing.
16. The entry ceiling is enforced: 3 000 entries in → `ONLINE_GLOSSARY_MAX` out.

**`describe('wired up, and wired up in the allowed direction')`**

17. Both routes exist and only under `/online-api/`: `server/online-api.mjs` contains
    `pathname === '/online-api/glossary' && req.method === 'GET'` and the `'PUT'` twin, and contains no
    `AUTH_` and no new `requireAuth` definition — the gate is inherited.
18. The facade exports it: `src/lib/lanes/online/index.ts` contains `from './onlineGlossary'`.
19. `prepData.ts` reads the online source with a plain fetch and imports NO lane file: it contains
    `fetch('/online-api/glossary'` and no `from './lanes/online` / `from '../lanes/online`.
20. The offline side is untouched: `src/lib/api.ts` contains no `online-api`, and `onlineGlossary.ts`
    contains no `from '../../api'` — the shape is copied, not imported.

Running total after this task: 563 + 20 = **583**.
---

# TASK 20 — The boxes remember: two per meeting, one for good

**Why.** `terms` and `brief` are plain `useState` in the facade. Reload the page and both are empty; open
the same meeting on the second machine in the hall and it is empty there too. Everything the operator
typed by hand — the corrections learned during the rehearsal, the sentence about who is on stage — exists
only in one browser tab, and a tab is not a place to keep something a ceremony depends on.

**Per meeting AND per direction**, keyed on `kbScopeId(event)` — the same scope the documents and the AI
brief already use, so a meeting that belongs to a series shares the series' shelf instead of starting
empty. The auto-fill from Chuẩn bị keeps its existing rule and gains one more: it fills only an empty box,
and **never** overwrites something that was saved.

**And a third box, on the opposite rule.** The mishearing box TASK 5 added is stored too, but **globally** —
not keyed on a meeting at all. What the recogniser mangles is a property of the words, not of the event:
the company name it gets wrong at the anniversary is the same name it gets wrong at next month's briefing.
Each of those lines was earned by hearing the machine fail out loud, so the operator should type it once,
ever, on any machine. TASK 5's localStorage copy stays exactly where it is and becomes the offline
fallback; when the store holds something, the store wins.

## 20.1 `server/online-api.mjs` — four more routes on the same store

> The old text below is the comment line TASK 19 §19.2 wrote. Apply TASK 19 first; the new routes are
> inserted **above** the glossary ones and that comment line is re-emitted unchanged at the end.

Replace:

```js
      // ---- TASK 19: the ONLINE glossary, on the TASK 18 store ----
```

with

```js
      // ---- TASK 20: the console's two boxes, remembered per meeting × direction ----
      // Keyed on `<kbScopeId>|<dir>`; the value is what the operator last had on screen. The whole map is
      // read and written as one small object — hundreds of meetings of two text boxes is still kilobytes,
      // and one file means one atomic write instead of a directory of names to sanitise.
      if (pathname === '/online-api/session-boxes' && req.method === 'GET') {
        const scope = normalizeText(url.searchParams.get('scope')).slice(0, 200);
        const dir = url.searchParams.get('dir') === 'ja2vi' ? 'ja2vi' : 'vi2ja';
        if (!scope) {
          sendJson(res, 400, { error: 'Missing scope.' });
          return true;
        }
        const all = await readStore('boxes', {});
        const hit = (all && typeof all === 'object' ? all[`${scope}|${dir}`] : null) || null;
        sendJson(res, 200, {
          terms: typeof hit?.terms === 'string' ? hit.terms : '',
          brief: typeof hit?.brief === 'string' ? hit.brief : '',
          savedAt: typeof hit?.savedAt === 'number' ? hit.savedAt : 0,
        });
        return true;
      }
      if (pathname === '/online-api/session-boxes' && req.method === 'PUT') {
        const body = await readJsonBody(req, 256 * 1024);
        const scope = normalizeText(body?.scope).slice(0, 200);
        const dir = body?.dir === 'ja2vi' ? 'ja2vi' : 'vi2ja';
        if (!scope) {
          sendJson(res, 400, { error: 'Missing scope.' });
          return true;
        }
        const terms = limitText(body?.terms, 2_000);
        const brief = limitText(body?.brief, SESSION_BRIEF_MAX_CHARS);
        try {
          const all = await readStore('boxes', {});
          const map = all && typeof all === 'object' && !Array.isArray(all) ? { ...all } : {};
          map[`${scope}|${dir}`] = { terms, brief, savedAt: Date.now() };
          // Oldest-first eviction, so a year of meetings cannot grow the file without a ceiling. The
          // entries carry their own timestamp, which is the only ordering that survives a restart.
          const keys = Object.keys(map);
          if (keys.length > SESSION_BOXES_MAX_SCOPES) {
            keys
              .sort((a, b) => (map[a]?.savedAt ?? 0) - (map[b]?.savedAt ?? 0))
              .slice(0, keys.length - SESSION_BOXES_MAX_SCOPES)
              .forEach((k) => { delete map[k]; });
          }
          await writeStore('boxes', map);
          sendJson(res, 200, { saved: true });
        } catch (error) {
          logLine('boxes.save_fail', { message: String(error?.message ?? error).slice(0, 300) });
          sendJson(res, 500, { error: 'Failed to save the session boxes.' });
        }
        return true;
      }

      // ---- TASK 20: the mishearing corrections, kept GLOBALLY ----
      // Not keyed on anything. What the recogniser mangles is a property of the words: the company name
      // it gets wrong at the anniversary is the same name it gets wrong at next month's briefing. One
      // list, learned once, is right for every meeting — and it is the one thing an operator most hates
      // retyping, because each line was earned by hearing the machine fail.
      if (pathname === '/online-api/mishearings' && req.method === 'GET') {
        const stored = await readStore('mishearings', {});
        sendJson(res, 200, {
          text: typeof stored?.text === 'string' ? stored.text : '',
          savedAt: typeof stored?.savedAt === 'number' ? stored.savedAt : 0,
        });
        return true;
      }
      if (pathname === '/online-api/mishearings' && req.method === 'PUT') {
        const body = await readJsonBody(req, 64 * 1024);
        const text = limitText(body?.text, SESSION_MISHEARINGS_MAX_CHARS);
        try {
          await writeStore('mishearings', { text, savedAt: Date.now() });
          sendJson(res, 200, { saved: true });
        } catch (error) {
          logLine('mishearings.save_fail', { message: String(error?.message ?? error).slice(0, 300) });
          sendJson(res, 500, { error: 'Failed to save the mishearing list.' });
        }
        return true;
      }

      // ---- TASK 19: the ONLINE glossary, on the TASK 18 store ----
```

## 20.2 New file `src/lib/lanes/online/sessionBoxes.ts`

```ts
// src/lib/lanes/online/sessionBoxes.ts — the console's Thuật ngữ and Bối cảnh boxes, remembered.
//
// They were plain component state: a reload emptied them and a second machine in the same hall saw
// nothing, so everything the operator learned during a rehearsal had to be retyped before the event.
//
// Keyed on the meeting's knowledge scope × the direction — the same scope the documents and the AI brief
// already use, so a meeting inside a series shares the series' shelf. Nothing here is on the live path:
// it is read once when a meeting is opened and written a second or so after the operator stops typing.

const ONLINE_BASE = '/online-api';

export interface SessionBoxes {
  terms: string;
  brief: string;
  /** 0 when nothing was ever saved for this meeting — the console uses that to decide about auto-fill. */
  savedAt: number;
}

export const EMPTY_SESSION_BOXES: SessionBoxes = { terms: '', brief: '', savedAt: 0 };

/** Never throws: an unreachable store means "nothing saved", which is the state the console started in. */
export async function fetchSessionBoxes(scope: string, dir: 'vi2ja' | 'ja2vi'): Promise<SessionBoxes> {
  const key = (scope ?? '').trim();
  if (!key) return EMPTY_SESSION_BOXES;
  try {
    const res = await fetch(`${ONLINE_BASE}/session-boxes?scope=${encodeURIComponent(key)}&dir=${dir}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return EMPTY_SESSION_BOXES;
    const data = (await res.json()) as Partial<SessionBoxes>;
    return {
      terms: typeof data.terms === 'string' ? data.terms : '',
      brief: typeof data.brief === 'string' ? data.brief : '',
      savedAt: typeof data.savedAt === 'number' ? data.savedAt : 0,
    };
  } catch {
    return EMPTY_SESSION_BOXES;
  }
}

/**
 * Never throws either — and that is the right call HERE, unlike the glossary: this fires while the
 * operator is typing, and a red line appearing under the box because the network blinked would be noise
 * during a ceremony. It reports success so the caller can show a quiet mark.
 */
export async function saveSessionBoxes(scope: string, dir: 'vi2ja' | 'ja2vi', terms: string, brief: string): Promise<boolean> {
  const key = (scope ?? '').trim();
  if (!key) return false;
  try {
    const res = await fetch(`${ONLINE_BASE}/session-boxes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ scope: key, dir, terms, brief }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------------
// The mishearing box — the same idea, but GLOBAL.
//
// The other two boxes are about one meeting. This one is about the recogniser: the forms it mangles are
// a property of the words, not of the event, so a correction learned at the rehearsal should already be
// in place at the next meeting and on every machine. It is also the box whose contents were most
// expensive to obtain — every line was earned by hearing the machine get a name wrong out loud.
//
// It keeps its localStorage copy as well. The store is the shared truth; localStorage is what makes the
// box usable when the deploy cannot be reached at all.
// ---------------------------------------------------------------------------------------------------

export interface StoredMishearings {
  text: string;
  /** 0 when the store has never held anything — the console uses that to leave its local copy alone. */
  savedAt: number;
}

export const EMPTY_MISHEARINGS: StoredMishearings = { text: '', savedAt: 0 };

/** Never throws: an unreachable store just means the console keeps whatever localStorage gave it. */
export async function fetchMishearings(): Promise<StoredMishearings> {
  try {
    const res = await fetch(`${ONLINE_BASE}/mishearings`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return EMPTY_MISHEARINGS;
    const data = (await res.json()) as Partial<StoredMishearings>;
    return {
      text: typeof data.text === 'string' ? data.text : '',
      savedAt: typeof data.savedAt === 'number' ? data.savedAt : 0,
    };
  } catch {
    return EMPTY_MISHEARINGS;
  }
}

/** Never throws, for the same reason `saveSessionBoxes` does not: this fires while somebody is typing. */
export async function saveMishearings(text: string): Promise<boolean> {
  try {
    const res = await fetch(`${ONLINE_BASE}/mishearings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
```

## 20.3 `index.ts` (facade) — re-export

Replace:

```ts
export { fetchOnlineGlossary, saveOnlineGlossary, parseGlossaryLines, formatGlossaryLines, ONLINE_GLOSSARY_MAX } from './onlineGlossary'
export type { OnlineGlossaryEntry, GlossaryLineParse } from './onlineGlossary'
```

with

```ts
export { fetchOnlineGlossary, saveOnlineGlossary, parseGlossaryLines, formatGlossaryLines, ONLINE_GLOSSARY_MAX } from './onlineGlossary'
export type { OnlineGlossaryEntry, GlossaryLineParse } from './onlineGlossary'
// TASK 20 — the two console boxes, remembered per meeting × direction, and the mishearing box, global.
export { fetchSessionBoxes, saveSessionBoxes, EMPTY_SESSION_BOXES } from './sessionBoxes'
export { fetchMishearings, saveMishearings, EMPTY_MISHEARINGS } from './sessionBoxes'
export type { SessionBoxes, StoredMishearings } from './sessionBoxes'
```

> This block quotes what TASK 19 §19.4 just wrote. Apply TASK 19 first.

## 20.4 `OnlineConsole.tsx` — load first, auto-fill second, save quietly

**(a) The import.** Add **five** names — `fetchSessionBoxes`, `saveSessionBoxes`, `EMPTY_SESSION_BOXES`,
`fetchMishearings` and `saveMishearings` — to the same facade import on line 16 you extended in TASK 19
§19.5(a). All five are used by the block in (b): the first two for the per-meeting boxes,
`EMPTY_SESSION_BOXES` as the value when there is no event to key on, and the last two for the global
mishearing box. Miss any one of them and `tsc` fails on that line; `EMPTY_SESSION_BOXES` is the easiest to
overlook because it appears only once.

**(b)** Replace the whole load effect:

```tsx
    applyScript()
    let cancelled = false
    void collectPrepPack(event, lane.direction).then((pack) => {
      if (cancelled) return
      setPrep(pack)
      if (!lane.terms.trim()) lane.setTerms(pack.terms)
      if (!lane.brief.trim()) lane.setBrief(pack.brief)
    })
    return () => { cancelled = true }
  }, [eventId, event, lane.direction, lane, applyScript])
```

with

```tsx
    applyScript()
    let cancelled = false
    // TASK 20: what was SAVED for this meeting outranks the mechanical auto-fill, always. The saved text
    // includes the operator's hand corrections from the rehearsal; the auto-fill is a first draft
    // assembled from stores. Filling an already-answered box with a first draft is how a rehearsal's work
    // gets thrown away in silence.
    void (async () => {
      const saved = event ? await fetchSessionBoxes(kbScopeId(event), lane.direction) : EMPTY_SESSION_BOXES
      if (cancelled) return
      if (saved.terms) lane.setTerms(saved.terms)
      if (saved.brief) lane.setBrief(saved.brief)
      setBoxesSaved(saved.savedAt > 0)
      const pack = await collectPrepPack(event, lane.direction)
      if (cancelled) return
      setPrep(pack)
      if (!saved.terms && !lane.terms.trim()) lane.setTerms(pack.terms)
      if (!saved.brief && !lane.brief.trim()) lane.setBrief(pack.brief)
    })()
    return () => { cancelled = true }
  }, [eventId, event, lane.direction, lane, applyScript])

  // TASK 20: write the two boxes back a moment after typing stops. Debounced, never on the live path's
  // critical section, and silent on failure — a red line under the box because the network blinked would
  // be noise in the middle of a ceremony. The ref makes an unchanged pair cost nothing.
  const [boxesSaved, setBoxesSaved] = useState(false)
  const boxesWrittenRef = useRef('')
  useEffect(() => {
    if (!event) return
    if (prepLoadedRef.current !== `${eventId}|${lane.direction}`) return
    const payload = JSON.stringify([lane.terms, lane.brief])
    if (boxesWrittenRef.current === payload) return
    const timer = setTimeout(() => {
      boxesWrittenRef.current = payload
      void saveSessionBoxes(kbScopeId(event), lane.direction, lane.terms, lane.brief).then((ok) => {
        if (ok) setBoxesSaved(true)
      })
    }, 1_500)
    return () => clearTimeout(timer)
  }, [event, eventId, lane.direction, lane.terms, lane.brief])

  // TASK 20: the mishearing box is GLOBAL — one list for every meeting, not keyed on anything — so it
  // loads once per mount rather than per meeting. What the recogniser mangles is a property of the words:
  // the company name it gets wrong at the anniversary is the same name it gets wrong next month. When the
  // store holds something it WINS over the localStorage copy, and that is what makes a correction learned
  // on the rehearsal machine already be there on the hall machine.
  const [mishearingSaved, setMishearingSaved] = useState(false)
  // `null` until the store has answered. Nothing is ever written back before that, so an empty box on a
  // fresh machine cannot overwrite a list somebody spent a rehearsal building.
  const mishearingWrittenRef = useRef<string | null>(null)
  const setMishearingRef = useRef(lane.setMishearing)
  setMishearingRef.current = lane.setMishearing
  const mishearingAtMountRef = useRef(lane.mishearing)
  useEffect(() => {
    let cancelled = false
    void fetchMishearings().then((stored) => {
      if (cancelled) return
      if (stored.savedAt > 0) {
        mishearingWrittenRef.current = stored.text
        setMishearingRef.current(stored.text)
        setMishearingSaved(true)
      } else {
        // Nothing stored yet: adopt whatever this machine already had, so the first save is an upload of
        // the local list rather than an erasure of it.
        mishearingWrittenRef.current = mishearingAtMountRef.current
      }
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (mishearingWrittenRef.current === null) return
    if (mishearingWrittenRef.current === lane.mishearing) return
    const timer = setTimeout(() => {
      mishearingWrittenRef.current = lane.mishearing
      void saveMishearings(lane.mishearing).then((ok) => { if (ok) setMishearingSaved(true) })
    }, 1_500)
    return () => clearTimeout(timer)
  }, [lane.mishearing])
```

`lane.setMishearing` still writes localStorage exactly as TASK 5 left it — that copy is what keeps the box
usable when the deploy cannot be reached at all. The store is the shared truth; localStorage is the
fallback. Nothing in TASK 5 changes.

**(c)** Say so on screen, once, in the line both boxes already show. Replace:

```tsx
      {/* M9 — an empty or unapproved script behaves exactly like a script that never matches, so it must
          be said out loud here; nothing else on this screen would tell the operator before going live. */}
      <div>{scriptLoadMessage(scriptLoad)}</div>
```

with

```tsx
      {/* M9 — an empty or unapproved script behaves exactly like a script that never matches, so it must
          be said out loud here; nothing else on this screen would tell the operator before going live. */}
      <div>{scriptLoadMessage(scriptLoad)}</div>
      {/* TASK 20 — the operator has to be able to tell "this will be here tomorrow" from "this is in this
          tab only". One short line; it appears under both boxes because both are saved together. */}
      <div>{boxesSaved ? 'Đã nhớ Thuật ngữ và Bối cảnh cho buổi này' : 'Chưa lưu — gõ xong vài giây là tự nhớ cho buổi này'}</div>
      {/* TASK 20 — and one more for the mishearing box, which is deliberately NOT per meeting. Saying so
          out loud is the point: the operator should expect to type each correction exactly once, ever. */}
      <div>{mishearingSaved ? 'Đã nhớ phần sửa nghe nhầm — dùng chung cho mọi buổi, mọi máy' : 'Phần sửa nghe nhầm: gõ xong vài giây là tự nhớ, dùng chung cho mọi buổi'}</div>
```

## 20.5 `docs/ONLINE-LANE-CONTRACT.md` — the contract is the source of truth

Six new routes, three new contract entries covering them, plus the four fields earlier parts added to
routes that already existed. No orphan endpoint, no contract entry without a route.

**(a)** Replace:

```md
# Online Lane Contract — v0.6 (2026-07-31)
```

with

```md
# Online Lane Contract — v0.7 (2026-08-03)

> **v0.7 changelog (PROMPT-11 — the lane gets a store of its own, and four fields are recorded):** three
> new resources, six routes, all behind the existing gate and all OFF the live path:
> `GET/PUT /online-api/glossary` (§8), `GET/PUT /online-api/session-boxes` (§9) and
> `GET/PUT /online-api/mishearings` (§10). All three persist through a small server-side JSON store on the
> deploy's disk (`DATA_DIR`, falling back to a local directory when unset). §8 and §9 are keyed per
> meeting; §10 is deliberately global. The offline `/api` glossary is untouched and remains a separate,
> independent store.
>
> Earlier parts of this same update added **four optional fields to routes that already existed**, and
> they are written into §1 and §3 below rather than left undeclared: `pauseSecs` (request) and
> `asrVadSilenceSecs` (response) on §1, `sessionMishearings` (request) and `reason` (on the `502`) on §3.
> All four are optional in both directions: a client that never sends them, and a client that ignores
> them in the response, behaves exactly as it did at v0.6.
```

**(b)** Replace:

```md
## What the core does NOT provide
```

with

```md
8. `GET /online-api/glossary` → `{ entries: [ { vi, ja, reading?, type?, asr_hotword?, misheard?, note? } ] }` — the ONLINE lane's own glossary, from the server store. `PUT /online-api/glossary` body `{ entries }` → `{ saved:true, count }`; the server normalises every entry (known fields only, each string ≤200 chars, an entry with neither `vi` nor `ja` dropped, at most 2 000 entries) so what reaches the live path is always well-formed. Request limit 4 MB.
   - Deliberately SEPARATE from the offline glossary behind `/api`: that backend is not part of this deploy, so on the deployed build it is simply absent. `prepData.ts` reads both and merges them; when both answer, the offline (curated) entry wins a tie, because de-duplication keeps the first entry at a given rank.
   - Pre-session only. Nothing on the live path reads it directly — the terms it produces reach a session through the console's Thuật ngữ box, under the same 40-line / 2 000-char budget as before.
9. `GET /online-api/session-boxes?scope=<kbScopeId>&dir=<vi2ja|ja2vi>` → `{ terms, brief, savedAt }` (`savedAt: 0` = nothing stored). `PUT /online-api/session-boxes` body `{ scope, dir, terms, brief }` → `{ saved:true }`. Missing `scope` → `400`. `terms` is clipped to 2 000 chars and `brief` to 2 000 — the same clip the server already applies to refine's `sessionBrief`.
   - The scope is the meeting's knowledge scope, so a meeting inside a series shares the series' shelf — the same key the documents and the AI brief already use.
   - Written a second or so after the operator stops typing, and read once when a meeting is opened. What was saved OUTRANKS the mechanical auto-fill from Chuẩn bị: the auto-fill may only fill a box that is both unsaved and empty.
   - At most 500 scope×direction pairs are kept, oldest `savedAt` evicted first.
10. `GET /online-api/mishearings` → `{ text, savedAt }` (`savedAt: 0` = nothing stored). `PUT /online-api/mishearings` body `{ text }` → `{ saved:true }`. `text` is clipped to 2 000 chars — the same ceiling the client applies, so a client at its limit is never silently truncated.
    - **Global on purpose — not keyed on a meeting.** What the recogniser mishears is a property of the words, not of the event, so one list serves every meeting and every machine. The console loads it once when it opens; when the store holds something it OUTRANKS the browser's local copy, and the local copy remains as the offline fallback. Nothing on the live path reads this route: the corrections reach a session through the console's box, exactly as they did before.

**Storage.** §8, §9 and §10 are the only routes that persist anything. They share one small server-side JSON store: `DATA_DIR` names the directory (the deploy mounts a disk there); unset, it falls back to a local directory so a dev clone runs with nothing attached. Writes are atomic (temp file, then rename) and capped at 1 MB per file. No other route reads or writes it.

## What the core does NOT provide
```

**(c) The two fields TASK 13 added to §1.** This file forbids inventing fields beyond it, and v0.4 and
v0.5 both recorded theirs, so record these the same way — as bullets, leaving the inline shape line alone.
Replace:

```md
   - If the response contains `ephemeralKey`/`sdpUrl` instead of `mode:'transcribe'` → the server is misconfigured (WebRTC mode); surface the operational error "server is in WebRTC mode, fix server config".
```

with

```md
   - If the response contains `ephemeralKey`/`sdpUrl` instead of `mode:'transcribe'` → the server is misconfigured (WebRTC mode); surface the operational error "server is in WebRTC mode, fix server config".
   - `pauseSecs?: number` (request, v0.7) — how long a pause the recogniser should wait through before it closes a sentence, chosen per meeting by the operator. Absent = the server's own default; the server clamps whatever it is given. The client sends it once, when the session opens; there is no way to change it mid-session.
   - `asrVadSilenceSecs?: number` (response, v0.7) — the value the server actually applied, which is not always the one asked for. Display only, so the operator can see what is in force. A client that ignores it is unaffected.
```

**(d) The two fields TASK 5 and TASK 16 added to §3.** Replace:

```md
   - `previousFragment?: string` — the previous subtitle's text when THAT one was itself cut mid-thought and this transcript resumes it. Absent when this transcript starts a thought of its own. Only the `refine` stage sends it; drafts never do.
```

with

```md
   - `previousFragment?: string` — the previous subtitle's text when THAT one was itself cut mid-thought and this transcript resumes it. Absent when this transcript starts a thought of its own. Only the `refine` stage sends it; drafts never do.
   - `sessionMishearings?: string` (request, v0.7) — the operator's list of forms the recogniser is known to get wrong at this meeting, one rule per line, `wrong form ~ correct form` (several wrong forms separated by `/`). A plain string on the wire; the server parses and clips it. Absent or empty = the previous behaviour exactly. It is a correction list, not a glossary: it says what the machine mishears, not what a word means.
   - `reason?: string` (on the `502` response, v0.7) — a coarse machine-readable code for WHY refine failed, alongside the unchanged `error` message. Deliberately opaque: it never names a vendor, a model or an environment variable. The client turns it into one Vietnamese sentence for the operator; a client that ignores it sees the same `502 { error }` as before.
```

## 20.6 The one existing test this part makes out of date

PART 2 TASK 13 asserted that no new endpoint had been added, by counting occurrences of
`pathname === '/online-api/` in `server/online-api.mjs` and requiring exactly **10**. That assertion did
its job — it is why the per-meeting VAD step rides an existing request body instead of a new route — and
this part is the deliberate exception it was written to catch.

In `tests/speechRhythm.test.ts`, change that count from `10` to **16** and add to the case's comment:
`// PART 3 adds six: GET+PUT for /online-api/glossary, /online-api/session-boxes and /online-api/mishearings.`
The case still asserts an exact number, so the guard keeps working.

Count them yourself before you trust the number: 10 at the baseline, plus two per resource for three
resources. If your file says anything other than 16, one of TASK 19 or TASK 20 has not been applied
whole — find that before changing the test to match.

**No other existing test file may be modified**, and this one only in that single assertion.

## 20.7 Tests — new file `tests/sessionBoxes.test.ts`, **22 cases**

`import { fetchSessionBoxes, saveSessionBoxes, EMPTY_SESSION_BOXES, fetchMishearings, saveMishearings, EMPTY_MISHEARINGS } from '../src/lib/lanes/online/sessionBoxes'`
with a stubbed `globalThis.fetch`, plus `readFileSync` source guards. Restore the real `fetch` in
`afterEach`.

**`describe('reading')`**

1. A `200` with `{ terms, brief, savedAt }` returns them unchanged.
2. A `404`, a `500`, and a thrown fetch each return `EMPTY_SESSION_BOXES` and do not throw.
3. A `200` whose body is missing fields, or has them as numbers, yields `''`/`''`/`0` rather than
   `undefined` — a box set to `undefined` would render the string "undefined".
4. An empty or whitespace-only scope short-circuits: `fetch` is never called.
5. The scope is URL-encoded — call it with `series:abc/def` and assert the request URL contains
   `series%3Aabc%2Fdef` and `dir=vi2ja`.
6. An unrecognised direction is not sent as-is: only `vi2ja` and `ja2vi` reach the URL.

**`describe('writing')`**

7. A `200` returns `true`; a `500` returns `false`; a thrown fetch returns `false` — saving never throws
   at the caller, because this fires while the operator types.
8. The body carries all four fields and the method is `PUT`.
9. An empty scope short-circuits and `fetch` is never called.

**`describe('the server keeps the map small and honest')`**

10. `GET` without `scope` → 400; with an unknown scope → `savedAt: 0` and two empty strings.
11. `PUT` then `GET` round-trips both boxes for the same scope+direction.
12. The direction is part of the key: writing `vi2ja` leaves `ja2vi` for the same scope untouched.
13. Over 500 pairs, the oldest `savedAt` is evicted and the newest survives.
14. `terms` is clipped to 2 000 chars, and `brief` to 2 000 as well — `brief` rides
    `SESSION_BRIEF_MAX_CHARS`, the constant the server already uses for refine's `sessionBrief`, so assert
    against the same number the code reads and do not hard-code a different budget.

**`describe('the console prefers what was saved')`**

15. `OnlineConsole.tsx` contains `if (saved.terms) lane.setTerms(saved.terms)` and
    `if (!saved.terms && !lane.terms.trim()) lane.setTerms(pack.terms)` — the auto-fill may only fill a
    box that is both unsaved and empty.
16. It is keyed on the knowledge scope and debounced: the file contains
    `saveSessionBoxes(kbScopeId(event), lane.direction, lane.terms, lane.brief)` and `}, 1_500)`; and
    `docs/ONLINE-LANE-CONTRACT.md` contains `/online-api/session-boxes`, `/online-api/glossary` and
    `/online-api/mishearings`, while `server/online-api.mjs` contains exactly **16** occurrences of
    `pathname === '/online-api/`.

**`describe('the mishearing list is global')`**

17. `fetchMishearings` on a `200` returns `{ text, savedAt }` unchanged; on a `404`, a `500` and a thrown
    fetch it returns `EMPTY_MISHEARINGS` and does not throw. It calls `/online-api/mishearings` with no
    query string at all — no scope, no direction; that absence is the design.
18. A `200` whose body has no `text`, or a non-string one, yields `''` rather than `undefined`.
19. `saveMishearings` sends `PUT` with body `{ text }` and returns `true` on `200`, `false` on `500` and
    `false` when fetch throws.
20. Server round-trip: `PUT { text: 'Ét-xu-hai ~ Esuhai' }` then `GET` returns that text and a non-zero
    `savedAt`; a `GET` before anything was ever written returns `''` and `savedAt: 0`.
21. The server clips `text` to 2 000 chars, and one store key is not another: writing the mishearings does
    not disturb a previously saved `session-boxes` entry, and vice versa.
22. The console loads it once and lets the store win: `OnlineConsole.tsx` contains `void fetchMishearings()`,
    `setMishearingRef.current(stored.text)` guarded by `stored.savedAt > 0`, and `saveMishearings(lane.mishearing)`
    behind a `1_500` timer. Assert the load effect's dependency array is empty (`}, [])` follows it), which
    is what makes it per-mount rather than per-meeting.

Running total after this task: 583 + 22 = **605**.
---

# When PART 3 is done

Run all three, in this order, and report the numbers verbatim:

```
npx vitest run
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

**Expected: 605 tests passing.** PART 2 left the suite at 547, and tasks 18–20 add
16 + 20 + 22 = **58**. `tests/speechRhythm.test.ts` keeps its 18 cases — TASK 20 §20.6 changes one number
inside one of them, it does not add or remove any.
(For the record: 288 at `3afcee3`, + 115 in PART 1, + 144 in PART 2, + 58 here = 605.)

> **If `tsc` says a name is not defined in `OnlineConsole.tsx`,** add that name to the facade import on
> line 16 (the one ending `from '../index'`) and run again — §19.5(a) and §20.4(a) both extend that line,
> and it is the only place a missing name can legitimately be fixed. **Never** import from a deeper path
> such as `'../onlineGlossary'` or `'../sessionBoxes'`: the console imports the facade root and nothing
> else, and a deep import is a rule violation even when it compiles.

Then check these by hand, because a passing test suite does not prove them:

1. `git diff --stat package.json package-lock.json` is **empty**. Nothing here needs a dependency; the
   store uses `node:fs/promises` and `node:path`, which `server/online-api.mjs` already imports.
2. `git diff --name-only` lists no file under `src/lib/lanes/offline/`, and neither `src/lib/api.ts`,
   `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts` nor `src/lib/lanes/types.ts`. The `/glossary`
   page is untouched.
3. `git grep -n "from './lanes/online" -- src/lib/prepData.ts` returns **nothing** — the neutral bridge
   reads the online glossary over HTTP and imports no lane file. (Search for the **import**, not for the
   bare words: the file's own header comment at the top says "It lives OUTSIDE `src/lib/lanes/online/`…",
   and a plain `lanes/online` search hits that sentence and reads like a violation when there is none.
   §19.7 test 19 uses the same pattern for the same reason.)
4. Only `src/pages/AudioRouting.tsx`, `src/pages/Settings.tsx` and the `/online-lab` page import
   `src/lib/lanes/online`, and only at the root. PART 3 added no new import point: the glossary panel is
   inside the console, which is inside the lane.
5. `git grep -n "DATA_DIR" -- src/` returns **nothing**. It is a server-side path and appears only under
   `server/`.
6. `tests/speechRhythm.test.ts` is the only pre-existing test file in the diff **relative to the tree
   PART 2 left behind** — commit PART 1 + PART 2 before starting this file, as the deploy order already
   assumes. (If all three parts sit uncommitted in one working tree, the diff also shows the three test
   files PART 2 named, which is expected and not a fault of this part.) The only change in it is the
   number `10` → `16`.
7. **Contract ↔ endpoints, both directions.** Every route named in `docs/ONLINE-LANE-CONTRACT.md` §8, §9
   and §10 exists in `server/online-api.mjs`, and every route this update ADDED to
   `server/online-api.mjs` appears in the contract. An orphan endpoint and a contract entry with no
   endpoint are the same bug seen from two sides.
   - Do the **fields** the same way: §1 must name `pauseSecs` and `asrVadSilenceSecs`, §3 must name
     `sessionMishearings` and `reason`. Earlier parts of this update added all four to routes that already
     existed, and an undeclared field is how the next person ends up inventing a second one.
   - One route predates this work and is **still** absent from the contract: `/online-api/voices`. That is
     not yours to fix here — do not add it, do not remove it, do not let it fail this check. Just say in
     your report that you saw it, so it is on the record for a later prompt.
8. `git diff -- src/lib/lanes/online/mishearing.ts` is **empty**, and `git grep -n "proyaku_online_mishearing" -- src/`
   still finds the localStorage write TASK 5 put in the facade. The store is added alongside that copy, not
   in place of it: a machine that cannot reach the deploy must still open with yesterday's corrections.

## The acceptance walk — "press Bắt đầu and it works"

Do this once on the deployed build, with no internal office machine reachable. Report each line as
pass/fail with what you saw.

**(a) The script.** Open a meeting that HAS an approved script → the status card is green and names the
row count, and a sentence matching a script line comes out as the approved wording. Then open a meeting
with NO script → the console starts normally, translates freely, and shows the plain "no script" line —
**not** a red card. A meeting without a script is not a fault.

**(b) Thuật ngữ reaches both places.** Type a proper noun into the box. The line under it says how many
keyterms are primed (≤30, each ≤20 chars, over-long ones named in red), and the same box's whole text
reaches the translator under the 40-line budget. Both, from one box.

**(c) Bối cảnh reaches refine.** Text in the Bối cảnh box arrives as the session brief; it is latched at
Bắt đầu, like the script.

**(d) The online glossary works with no office machine.** Open Từ điển in the console, add a line, press
Lưu, reload the page, reopen the panel — the line is still there. Then press "Nạp từ Chuẩn bị" on the
Thuật ngữ box and confirm the entry is merged into it. This is the whole point of PART 3: it must work on
a deploy that has nothing but itself.

**(e) The boxes remember, and the mishearing list remembers everywhere.** With a meeting open, type into
Thuật ngữ and Bối cảnh, wait for the "Đã nhớ" line, reload and reopen the same meeting — both boxes come
back with what you typed, and the auto-fill from Chuẩn bị does not overwrite them. **Switch direction and
back: each direction keeps its own.** Then add a line to the mishearing box, wait for its own "Đã nhớ"
line, and open the console **on a different machine or a different browser profile**: that line must
already be there, with no meeting selected and nothing typed. That is the difference between the two rules
— the boxes are per meeting and per direction, the mishearing list is one list for everybody — and it is
the one worth checking by hand.

Report once, at the end: the three command outputs, the eight checks above, the five acceptance lines, and
anything you had to decide that this file did not decide for you.
