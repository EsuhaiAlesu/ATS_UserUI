# PROMPT-18 — Chốt bản cuối trước khi bàn giao luồng ONLINE

**Nền:** nhánh `develop`, commit `add1d341669ed6a71d650a110e93bc76dd93f1a8` (PROMPT-17).
**Số ca test trước khi làm:** 1147 (1146 chạy + 1 bỏ qua) / 79 tệp.
**Số ca test sau khi làm:** 1156 (1155 chạy + 1 bỏ qua) / 79 tệp — **không thêm tệp test mới**. Chênh **+9 ca** đến từ ba tệp test có sẵn ở PHẦN 1 (`cloudConflict` +4 · `audienceWindows` +3 · `audienceSubtitles` +2). Các tệp test ở PHẦN 2 chỉ **sửa nội dung** ca cũ nên không đổi số.

---

## Vì sao có prompt này

Sắp tới luồng ONLINE được bàn giao cho đội OFFLINE để họ ráp hai chế độ vào **một** ứng dụng duy nhất. Trước khi bàn giao, bản chạy trên Railway cần đúng ba việc:

1. **Vá bốn lỗi còn treo.** Bốn lỗi này đã tìm ra và đã dựng sẵn bản vá, nhưng chưa vào `develop`. Một trong bốn làm **vô hiệu 100%** tính năng "máy trắng tự lấy về" của PROMPT-16 — tức là việc đã làm rồi mà không chạy.
2. **Đặt lại sáu mặc định** theo hướng *nghe được nhiều nhất*, để bên nhận bàn giao mở lên là chạy được ngay, không phải tự dò từng nút.
3. **Ẩn các nút tinh chỉnh** khỏi màn hình. Ẩn chứ **không xoá** — cơ chế vẫn chạy y nguyên, chỉ giấu phần giao diện đi để người vận hành buổi lễ không chỉnh nhầm mười phút trước giờ G. Bật lại chỉ cần đổi **một dòng**.

Prompt chia làm **4 PHẦN**. Làm tuần tự PHẦN 1 → 2 → 3 → 4. Mỗi PHẦN xong nên chạy lại 4 cổng ở PHẦN 4 rồi mới sang PHẦN kế.

**Không có khoá API nào trong tệp này.** Không cần đổi biến môi trường nào.

---

# PHẦN 1 — Bốn lỗi còn treo (TASK 117 → 120)

## TASK 117 — Máy trắng KHÔNG tự lấy dữ liệu về (lỗi nặng nhất)

**Triệu chứng.** Mở đường dẫn trên một máy tính chưa từng dùng: đáng lẽ máy phải tự kéo toàn bộ Chương trình / Kịch bản / Người nói từ kho về. Thực tế nó hiện ra một buổi **"Gala 20 năm" rỗng** mà không ai chuẩn bị. Tính năng "máy trắng tự lấy về" của PROMPT-16 chưa bao giờ chạy được lần nào.

**Nguyên nhân.** Trong `migrateToEventScoped()` có một dòng `ensureDefaultEvent()` chạy **vô điều kiện**. Trên máy chưa từng dùng, dòng đó **tự đẻ ra một buổi**. Một khắc sau, `adoptFromCloudIfEmpty()` hỏi "máy này có dữ liệu gì chưa?" — và được trả lời **có**, bởi chính cái buổi vừa bịa ra. Thế là nó không kéo gì về nữa.

**Cách vá.** Trên máy thật sự trắng (không có kịch bản cũ, không có buổi nào), hàm di trú phải **không để lại dấu vết gì** — chỉ đánh dấu "đã di trú" rồi thoát. Chốt hẹp lại đúng ca đó, các ca còn lại giữ nguyên hành vi cũ.

**Tệp:** `src/lib/migrate.ts`

**TÌM:**

```ts
        if (localStorage.getItem(FLAG)) return;   // already migrated

        const defaultId = ensureDefaultEvent();

        // Attribute the legacy global script to the CONFIGURED event if it exists (else the default),
        // so the migrating user's prepared script lands where they expect — not on whichever event
        // merely happens to be nearest‑upcoming.
        const legacy = localStorage.getItem('proyaku_script');
```

**THAY BẰNG:**

```ts
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
```

> **Lưu ý:** `getEvents` phải nằm trong danh sách `import` ở đầu tệp. Nếu chưa có thì thêm vào cùng chỗ với `ensureDefaultEvent`.

---

## TASK 118 — Hai màn khán giả `/stream` và `/reveal` bị bỏ sót

**Triệu chứng.** Cửa sổ `/wall` được bảo vệ: nó không bao giờ tự tải lại giữa buổi vì kho dữ liệu trống. Nhưng `/stream` (màn hai thứ tiếng) và `/reveal` (màn công bố) thì **không** — chúng cũng mở suốt buổi trên màn hội trường, cũng không giữ dữ liệu Chuẩn bị riêng, và vẫn có thể tự tải lại **giữa lúc đang chạy chữ**.

**Nguyên nhân.** `isAudienceWindow()` chỉ nhận `/wall` và `/wall-*`. Hai đường dẫn kia đơn giản là bị quên.

**Tệp:** `src/lib/cloudBoot.ts`

**TÌM:**

```ts
/** `/wall`, `/wall-mockup` and anything else under that prefix. */
export function isAudienceWindow(pathname: string): boolean {
    return pathname === '/wall' || pathname.startsWith('/wall/') || pathname.startsWith('/wall-');
}
```

**THAY BẰNG:**

```ts
// Every full-screen surface pointed at the room rather than at the operator. `/wall` was the only one when
// this was written; `/stream` (the two-language stream page) and `/reveal` (the ceremonial reveal) are the
// same kind of window and were simply missed — both are opened on a hall screen for the whole ceremony,
// both hold no Chuẩn bị data of their own, and both would happily reload themselves mid-sentence because
// a store somewhere was empty.
const AUDIENCE_PATHS = ['/wall', '/stream', '/reveal'] as const;

/** `/wall`, `/wall-mockup`, `/stream`, `/reveal` — and anything nested under them. */
export function isAudienceWindow(pathname: string): boolean {
    return AUDIENCE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || pathname.startsWith('/wall-');
}
```

---

## TASK 119 — Bấm "Mở màn" lần nữa làm cửa sổ tường **văng ra khỏi toàn màn hình**

**Triệu chứng.** Kỹ thuật viên kéo cửa sổ tường sang màn LED hội trường, bấm F cho toàn màn hình. Xong, người vận hành thêm một màn nữa hoặc chỉnh một nấc cỡ chữ rồi bấm lại **"Mở màn"** — theo phản xạ. Cửa sổ đang toàn màn hình trên LED **nhảy ngược về laptop**, trước mặt cả hội trường.

**Nguyên nhân.** Mỗi lần bấm, mã cũ gọi `moveTo` + `resizeTo` cho **mọi** cửa sổ đang mở, vô điều kiện — kể cả cửa sổ không cần di chuyển đi đâu cả.

**Cách vá.** Hai chốt hẹp: (1) cửa sổ **đang toàn màn hình** thì không đụng vào; (2) khung hình **y hệt lần trước** thì không phải là một lần di chuyển, bỏ qua.

**Tệp:** `src/lib/lanes/online/audienceWindows.ts` — **bốn** chỗ sửa.

### 119.1 — thêm sổ ghi khung hình

**TÌM:**

```ts
const wallWindows = new Map<string, Window>()
const wallUrls = new Map<string, string>()

// Reading `.closed` on a lost or cross-origin handle can throw — a handle we cannot inspect counts as closed.
function isClosed(win: Window): boolean {
  try { return win.closed } catch { return true }
}

export interface WallGeometry { left: number; top: number; width: number; height: number }
```

**THAY BẰNG:**

```ts
const wallWindows = new Map<string, Window>()
const wallUrls = new Map<string, string>()
// …and the rectangle each was last actually moved to, so pressing the button again with nothing changed
// does not count as a move. See the two guards in `openWallWindows`.
const wallGeom = new Map<string, string>()

// Reading `.closed` on a lost or cross-origin handle can throw — a handle we cannot inspect counts as closed.
function isClosed(win: Window): boolean {
  try { return win.closed } catch { return true }
}

// A wall window showing fullscreen is where somebody deliberately put it — on ceremony night that is a
// technician who dragged it onto the LED and pressed F. Same-origin, so `document` is readable; a browser
// that refuses to answer says "not fullscreen" and the old behaviour stands.
function isFullscreen(win: Window): boolean {
  try { return win.document.fullscreenElement != null } catch { return false }
}

export interface WallGeometry { left: number; top: number; width: number; height: number }
```

### 119.2 — hai chốt khi cửa sổ đã mở sẵn

**TÌM:**

```ts
    const existing = wallWindows.get(o.id)
    if (existing && !isClosed(existing)) {
      // Already open: re-navigate ONLY when the content changed (avoid flicker / a dropped BroadcastChannel
      // mid-ceremony), then always move/resize it back onto its assigned screen.
      if (wallUrls.get(o.id) !== url) {
        try { existing.location.replace(url); wallUrls.set(o.id, url) } catch { /* navigation blocked — leave as-is */ }
      }
      try { existing.moveTo(left, top); existing.resizeTo(width, height) } catch { /* browsers restrict move/resize */ }
      try { existing.focus() } catch { /* ignore */ }
```

**THAY BẰNG:**

```ts
    const geomKey = `${left},${top},${width},${height}`
    const existing = wallWindows.get(o.id)
    if (existing && !isClosed(existing)) {
      // Already open: re-navigate ONLY when the content changed (avoid flicker / a dropped BroadcastChannel
      // mid-ceremony), then move it back onto its assigned screen — but only when there is a move to make.
      if (wallUrls.get(o.id) !== url) {
        try { existing.location.replace(url); wallUrls.set(o.id, url) } catch { /* navigation blocked — leave as-is */ }
      }
      // Pressing "Mở màn" again is the operator's reflex after every small change — one more window, a font
      // step, a second look. It used to yank EVERY open window back to the computed rectangle, so the wall
      // a technician had already dragged onto the hall LED and put into fullscreen jumped out of fullscreen
      // and back onto the laptop, in front of the room. Two narrow guards: a fullscreen window is never
      // touched, and a rectangle identical to the one last applied is not a move at all.
      if (!isFullscreen(existing) && wallGeom.get(o.id) !== geomKey) {
        try { existing.moveTo(left, top); existing.resizeTo(width, height); wallGeom.set(o.id, geomKey) } catch { /* browsers restrict move/resize */ }
      }
      try { existing.focus() } catch { /* ignore */ }
```

### 119.3 — dọn sổ khi mở mới / bị chặn

**TÌM:**

```ts
    if (!win) {
      wallWindows.delete(o.id); wallUrls.delete(o.id)
      blocked++
      return
    }
    wallWindows.set(o.id, win); wallUrls.set(o.id, url)
```

**THAY BẰNG:**

```ts
    if (!win) {
      wallWindows.delete(o.id); wallUrls.delete(o.id); wallGeom.delete(o.id)
      blocked++
      return
    }
    wallWindows.set(o.id, win); wallUrls.set(o.id, url); wallGeom.set(o.id, geomKey)
```

### 119.4 — dọn sổ khi cửa sổ đóng

**TÌM:**

```ts
    if (isClosed(win)) { wallWindows.delete(id); wallUrls.delete(id) }
```

**THAY BẰNG:**

```ts
    if (isClosed(win)) { wallWindows.delete(id); wallUrls.delete(id); wallGeom.delete(id) }
```

Và **TÌM:**

```ts
  wallWindows.clear()
  wallUrls.clear()
}
```

**THAY BẰNG:**

```ts
  wallWindows.clear()
  wallUrls.clear()
  wallGeom.clear()
}
```

---

## TASK 120 — Trần ghép đoạn: tiếng Việt bị chặt vụn hơn tiếng Nhật

**Triệu chứng.** Trên tường, phía **tiếng Nhật** các câu chảy thành đoạn liền mạch, còn phía **tiếng Việt** gần như câu nào cũng bị đẩy thành một đoạn riêng.

**Nguyên nhân.** Chỉ có **một** trần chung 200 ký tự cho cả hai thứ tiếng. Nhưng một ký tự không phải là một đơn vị nghĩa: đo trên 60 dòng kịch bản gala thật, phía tiếng Việt dài **2,24×** số ký tự phía tiếng Nhật (trung vị 129 so với 49); thêm nữa một chữ Nhật rộng gần gấp đôi một chữ Latin, nên **~2× số ký tự** mới chiếm cùng bấy nhiêu bề ngang tường.

**Cách vá.** Trần tính **riêng cho từng thứ tiếng đích**. Hệ số dùng lại đúng con số đã đo và đã dùng để **cắt câu** (`SEGMENT_VI_CHAR_FACTOR = 1.85`) — cắt và ghép đoạn không được phép lệch nhau.

**Tệp:** `src/lib/audienceSubtitles.ts` — **hai** chỗ sửa.

### 120.1

**TÌM:**

```ts
const MERGE_GAP_MS = 7_000
const MERGE_MAX_CHARS = 200
```

**THAY BẰNG:**

```ts
const MERGE_GAP_MS = 7_000
// The length cap is PER TARGET LANGUAGE, because a character is not a unit of meaning. One shared cap of
// 200 let Japanese merge about four utterances into a flowing paragraph while Vietnamese broke after one and
// a half — on the wall that reads as every Vietnamese sentence being shoved into a paragraph of its own
// while the Japanese side flows. Two independent measurements of the same asymmetry: the 60 aligned rows of
// the real gala script put the Vietnamese side at 2.24× the characters of the Japanese one (median 129 vs
// 49), and a Japanese glyph is about one em wide against a Latin half, so ~2× the characters occupy the
// same width of wall.
//
// The number used here is deliberately NOT a third measurement: `SEGMENT_VI_CHAR_FACTOR` (1.85, in the
// lane's transcriptSegmentation.ts) already scales the CUTTING ceiling for exactly this reason, measured on
// live recogniser output. Cutting and paragraphing must not drift apart, so the same factor rules both. It
// is duplicated rather than imported because this file is lane-neutral and may not reach into
// src/lib/lanes/online/ (CLAUDE.md rule 2) — if one moves, move the other.
const VI_CHAR_FACTOR = 1.85
export const MERGE_MAX_CHARS = { ja: 200, vi: Math.round(200 * VI_CHAR_FACTOR) } as const
```

### 120.2

**TÌM:**

```ts
      const prev = cur[cur.length - 1]
      const joiner = joinerOf(targetLangOf(line.dir))
      const curLen = cur.reduce((n, l, i) => n + l.targetText.trim().length + (i ? joiner.length : 0), 0)
      const mergedLen = curLen + joiner.length + line.targetText.trim().length
      const canMerge =
        line.at - prev.at <= MERGE_GAP_MS &&
        line.dir === prev.dir &&
        mergedLen < MERGE_MAX_CHARS &&
        !prev.interim // no unfinished tail
```

**THAY BẰNG:**

```ts
      const prev = cur[cur.length - 1]
      const lang = targetLangOf(line.dir)
      const joiner = joinerOf(lang)
      const curLen = cur.reduce((n, l, i) => n + l.targetText.trim().length + (i ? joiner.length : 0), 0)
      const mergedLen = curLen + joiner.length + line.targetText.trim().length
      const canMerge =
        line.at - prev.at <= MERGE_GAP_MS &&
        line.dir === prev.dir &&
        mergedLen < MERGE_MAX_CHARS[lang] &&
        !prev.interim // no unfinished tail
```

---

## TASK 120b — test đi kèm cho PHẦN 1 (bắt buộc, đây là chỗ ra +9 ca)

Bổ sung ca vào **ba tệp test đã có**. Không tạo tệp test mới.

### 120b.1 — `tests/audienceSubtitles.test.ts` (+2 ca)

Một ca cũ được viết lại và thêm hai ca mới.

**TÌM:**

```ts
  it('splits when the merged translation reaches 200 chars', () => {
    const long = 'x'.repeat(150)
    expect(buildParagraphs([L({ lid: 'a', targetText: long, at: 0 }), L({ lid: 'b', targetText: long, at: 1000 })]).length).toBe(2)
  })
```

**THAY BẰNG:**

```ts
  it('splits when the merged Japanese translation reaches its 200-char cap', () => {
    const long = 'あ'.repeat(150)
    const p = buildParagraphs([L({ lid: 'a', dir: 'vi2ja', targetText: long, at: 0 }), L({ lid: 'b', dir: 'vi2ja', targetText: long, at: 1000 })])
    expect(p.length).toBe(2)
  })

  // 07/08 — the cap became per-language. This length used to break a Vietnamese paragraph while the SAME
  // amount of meaning in Japanese sailed through, because a Vietnamese sentence carries 2.24× the characters
  // (measured on the 60 aligned rows of the real gala script). On the wall that read as every Vietnamese
  // sentence being shoved onto a paragraph of its own while the Japanese side flowed. This case pins the
  // fix from the audience's side rather than from the constant's side.
  it('keeps Vietnamese flowing at a length that would break a Japanese paragraph', () => {
    const long = 'x'.repeat(150)
    const p = buildParagraphs([L({ lid: 'a', targetText: long, at: 0 }), L({ lid: 'b', targetText: long, at: 1000 })])
    expect(p.length).toBe(1)
  })

  it('splits Vietnamese too, once it reaches its own 370-char cap', () => {
    const long = 'x'.repeat(300)
    expect(buildParagraphs([L({ lid: 'a', targetText: long, at: 0 }), L({ lid: 'b', targetText: long, at: 1000 })]).length).toBe(2)
  })
```

### 120b.2 — `tests/cloudConflict.test.ts` (+4 ca)

Trước hết sửa ca 26 cho nhận thêm hai màn mới.

**TÌM:**

```ts
  it('26 · /wall và /wall-mockup bị loại ra — không tự lấy về, không tự tải lại giữa buổi', async () => {
    vi.resetModules();
    const { isAudienceWindow } = await import('../src/lib/cloudBoot');
    for (const p of ['/wall', '/wall-mockup', '/wall/left']) expect(isAudienceWindow(p), p).toBe(true);
```

**THAY BẰNG:**

```ts
  // `/stream` và `/reveal` là hai màn CÙNG LOẠI với `/wall` — mở toàn màn hình cho cả hội trường nhìn,
  // không giữ dữ liệu Chuẩn bị nào của riêng nó. Chúng bị bỏ sót ở lần viết đầu, nên vẫn có thể tự tải
  // lại giữa buổi vì một cái kho ở đâu đó trống.
  it('26 · mọi màn quay ra khán giả đều bị loại — không tự lấy về, không tự tải lại giữa buổi', async () => {
    vi.resetModules();
    const { isAudienceWindow } = await import('../src/lib/cloudBoot');
    for (const p of ['/wall', '/wall-mockup', '/wall/left', '/stream', '/reveal']) expect(isAudienceWindow(p), p).toBe(true);
```

Sau đó **thêm vào CUỐI tệp** (sau dấu `});` đóng của khối `describe` cuối cùng) nguyên khối này:

```ts

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
```

> Khối này dùng lại `loadCloud`, `installFetch` và `store` đã có sẵn ở đầu tệp — không cần thêm `import` nào.

### 120b.3 — `tests/audienceWindows.test.ts` (+3 ca)

Trước hết thêm `vi` vào dòng `import` đầu tệp.

**TÌM:**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
```

**THAY BẰNG:**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
```

Sau đó **thêm vào CUỐI tệp** nguyên khối này:

```ts

// ---------------------------------------------------------------------------
// Bấm "Mở màn" lần thứ hai — cái phản xạ của người điều khiển sau mỗi thay đổi nhỏ.
//
// Trước bản vá này, mỗi lần bấm là MỌI cửa sổ đang mở bị `moveTo` + `resizeTo` về đúng ô đã tính, vô
// điều kiện. Trên sân khấu điều đó có nghĩa: tấm màn mà kỹ thuật đã kéo sang LED và bấm toàn màn hình
// nhảy ra khỏi toàn màn hình và về lại laptop, trước mặt cả hội trường. Hai chốt chặn, cả hai đều hẹp:
// cửa sổ đang toàn màn hình thì không đụng vào, và một ô y hệt ô lần trước thì không phải một cú dời.
describe('openWallWindows — mở lại cửa sổ đã mở', () => {
  type StubWin = {
    closed: boolean
    document: { fullscreenElement: unknown }
    location: { replace: (u: string) => void }
    moveTo: (l: number, t: number) => void
    resizeTo: (w: number, h: number) => void
    focus: () => void
    close: () => void
  }

  function makeWin(acts: string[]): StubWin {
    return {
      closed: false,
      document: { fullscreenElement: null },
      location: { replace: (u) => { acts.push(`replace ${u}`) } },
      moveTo: (l, t) => { acts.push(`moveTo ${l},${t}`) },
      resizeTo: (w, h) => { acts.push(`resizeTo ${w},${h}`) },
      focus: () => { acts.push('focus') },
      close: () => { acts.push('close') },
    }
  }

  const out1: WallOutput = { id: 'center', label: 'Màn giữa', enabled: true, view: 'both', showSource: false, screenIdx: 0 }
  const scr = (left: number) => [{ left, top: 0, width: 1024, height: 2048, label: 'LED' }]

  async function boot(win: StubWin) {
    vi.resetModules()
    ;(globalThis as unknown as { window: unknown }).window = {
      screen: { availWidth: 1920, availHeight: 1080 },
      innerWidth: 1920, innerHeight: 1080,
      open: () => win,
    }
    return import('../src/lib/lanes/online/audienceWindows')
  }

  afterEach(() => { delete (globalThis as unknown as { window?: unknown }).window })

  it('bấm lại mà không có gì đổi ⇒ không dời, không đổi cỡ', async () => {
    const acts: string[] = []
    const win = makeWin(acts)
    const mod = await boot(win)
    mod.openWallWindows([out1], scr(0), 40)
    expect(acts.filter((a) => a.startsWith('moveTo'))).toHaveLength(1) // lần mở đầu: có

    acts.length = 0
    const again = mod.openWallWindows([out1], scr(0), 40)
    expect(again.opened).toBe(1)
    expect(acts.some((a) => a.startsWith('moveTo') || a.startsWith('resizeTo'))).toBe(false)
  })

  it('cửa sổ đang TOÀN MÀN HÌNH ⇒ không đụng vào, kể cả khi ô đã tính đổi chỗ', async () => {
    const acts: string[] = []
    const win = makeWin(acts)
    const mod = await boot(win)
    mod.openWallWindows([out1], scr(0), 40)

    win.document.fullscreenElement = {} // kỹ thuật đã kéo sang LED và bấm F
    acts.length = 0
    mod.openWallWindows([out1], scr(1920), 40) // màn hình được gán nay nằm chỗ khác
    expect(acts.some((a) => a.startsWith('moveTo') || a.startsWith('resizeTo'))).toBe(false)
  })

  it('ô đã tính ĐỔI thật, cửa sổ không toàn màn hình ⇒ vẫn đưa về đúng chỗ', async () => {
    const acts: string[] = []
    const win = makeWin(acts)
    const mod = await boot(win)
    mod.openWallWindows([out1], scr(0), 40)

    acts.length = 0
    mod.openWallWindows([out1], scr(1920), 40)
    expect(acts).toContain('moveTo 1920,0')
    expect(acts).toContain('resizeTo 1024,2048')
  })
})
```

---

# PHẦN 2 — Sáu mặc định khi bàn giao (TASK 121 → 126)

## Chủ trương chung

Bên nhận bàn giao mở ứng dụng lên là **chạy được ngay**, không phải tự dò từng nút. Hướng chọn là **nghe được nhiều nhất**, rồi mới siết lại nếu ồn — chứ không phải siết sẵn rồi mất câu.

| # | Nút | Mặc định CŨ | Mặc định MỚI | Nghĩa là |
|---|---|---|---|---|
| 121 | Noise gate (near-mic) | BẬT | **TẮT** | Không cắt tiếng vì nghe "có vẻ ở xa" nữa |
| 122 | Độ nhạy micro | Tự động | **Mic xa** | Ngưỡng thấp nhất trong bốn nấc |
| 123 | Ngưỡng đủ to | Tự động | **Rất thấp** | Gần như tắt hẳn chốt "đủ to" |
| 124 | Nhịp nói của buổi | Bình thường | **Chạy liền mạch, chỉ ngắt khi hết câu** | Không bao giờ cắt lượt vì dấu câu |
| 125 | Nhả câu sớm | Tắt | **Thận trọng (0,90s)** | Cắt câu sớm từ dòng chữ mờ, chờ 0,9s cho chắc |
| 126 | Độ khớp khi dẫn theo kịch bản | Thường (≥ 45%) | **giữ nguyên** | Đã đúng, không sửa gì |

> **TASK 126 không phải làm gì cả.** `GUIDED_MATCH_DEFAULT` đã là `'normal'` = "Thường" = sàn 0,45. Ghi ra đây cho đủ sáu nút, và để người đọc sau không phải đi tìm.

---

## TASK 121 — Noise gate (near-mic): mặc định TẮT

Chốt này cắt âm khi tiếng nghe "có vẻ ở xa". Trên speakerphone đặt giữa bàn họp, nó vứt đúng thứ cần nghe. **Bốn** chỗ sửa, trong **ba** tệp.

### 121.1 — `src/lib/lanes/online/index.ts`

**TÌM:**

```ts
  const [nearMicGate, setNearMicGate] = useState(true)
```

**THAY BẰNG:**

```ts
  // "Noise gate (near-mic)" — 26/08/2026 mặc định TẮT khi bàn giao. Chốt này cắt âm khi tiếng nghe có vẻ
  // "ở xa", nên trên speakerphone giữa bàn nó vứt đúng thứ cần nghe. Chủ trương bàn giao là nghe được
  // nhiều nhất; ai cần siết lại thì bật tay ở console.
  const [nearMicGate, setNearMicGate] = useState(false)
```

### 121.2 — `src/lib/lanes/online/index.ts`

**TÌM:**

```ts
  const nearMicGateRef = useRef(true)
```

**THAY BẰNG:**

```ts
  const nearMicGateRef = useRef(false)
```

### 121.3 — `src/lib/lanes/online/onlineLane.ts`

**TÌM:**

```ts
          nearMicGate: config.getNearMicGate?.() ?? true,
```

**THAY BẰNG:**

```ts
          nearMicGate: config.getNearMicGate?.() ?? false,
```

### 121.4 — `src/lib/lanes/online/pcm16Capture.ts` (hai chỗ)

**TÌM:**

```js
    this.nearMicGateEnabled = true;
```

**THAY BẰNG:**

```js
    this.nearMicGateEnabled = false; // 26/08: mặc định TẮT — chốt này chỉ CẮT tiếng, không dính tới bằng chứng có người nói
```

Và **TÌM:**

```ts
      nearMicGateEnabled: options?.nearMicGate ?? true,
```

**THAY BẰNG:**

```ts
      nearMicGateEnabled: options?.nearMicGate ?? false,
```

---

## TASK 122 — Độ nhạy micro: mặc định "Mic xa"

**Tệp:** `src/lib/lanes/online/micSensitivity.ts` — hai chỗ.

**TÌM:**

```ts
export const MIC_SENSITIVITY_DEFAULT: MicSensitivity = 'auto';
```

**THAY BẰNG:**

```ts
export const MIC_SENSITIVITY_DEFAULT: MicSensitivity = 'far';
```

**TÌM:**

```ts
/** Read the stored choice. Absent / corrupt / storage blocked → 'auto' (adapts to whatever mic is used). */
```

**THAY BẰNG:**

```ts
/**
 * Read the stored choice. Absent / corrupt / storage blocked → 'far'.
 *
 * 26/08/2026, khi bàn giao: mặc định chuyển 'auto' → 'far'. Chủ trương là NGHE ĐƯỢC NHIỀU NHẤT rồi mới
 * siết lại nếu ồn, chứ không phải siết sẵn rồi mất câu. 'far' là ngưỡng thấp nhất trong bốn nấc.
 */
```

### Test đi kèm — `tests/micSensitivitySetting.test.ts` (ba ca)

**TÌM:**

```ts
  it('chưa lưu gì → "auto"', () => {
    expect(loadMicSensitivity()).toBe('auto')
  })
```

**THAY BẰNG:**

```ts
  it('chưa lưu gì → "far" — bàn giao: mặc định nghe được nhiều nhất', () => {
    expect(loadMicSensitivity()).toBe('far')
  })
```

**TÌM:**

```ts
  it('giá trị rác trong kho → "auto"', () => {
    store.set(MIC_SENSITIVITY_KEY, 'loud')
    expect(loadMicSensitivity()).toBe('auto')
  })
```

**THAY BẰNG:**

```ts
  it('giá trị rác trong kho → "far"', () => {
    store.set(MIC_SENSITIVITY_KEY, 'loud')
    expect(loadMicSensitivity()).toBe('far')
  })
```

**TÌM:**

```ts
  it('getItem ném lỗi → vẫn trả "auto", không ném ra ngoài', () => {
    vi.stubGlobal('localStorage', { ...stub, getItem: () => { throw new Error('blocked') } })
    expect(() => loadMicSensitivity()).not.toThrow()
    expect(loadMicSensitivity()).toBe('auto')
  })
```

**THAY BẰNG:**

```ts
  it('getItem ném lỗi → vẫn trả "far", không ném ra ngoài', () => {
    vi.stubGlobal('localStorage', { ...stub, getItem: () => { throw new Error('blocked') } })
    expect(() => loadMicSensitivity()).not.toThrow()
    expect(loadMicSensitivity()).toBe('far')
  })
```

---

## TASK 123 — Ngưỡng đủ to: mặc định "Rất thấp"

**Tệp:** `src/lib/lanes/online/loudGate.ts` — hai chỗ.

**TÌM:**

```ts
export const LOUD_GATE_DEFAULT: LoudGateMode = 'auto';
```

**THAY BẰNG:**

```ts
export const LOUD_GATE_DEFAULT: LoudGateMode = 'verylow';
```

**TÌM:**

```ts
/** Read the stored choice. Absent / corrupt / storage blocked → auto. */
```

**THAY BẰNG:**

```ts
/**
 * Read the stored choice. Absent / corrupt / storage blocked → 'verylow'.
 *
 * 26/08/2026, khi bàn giao: mặc định chuyển 'auto' → 'verylow', cùng chủ trương với Độ nhạy micro —
 * gần như tắt hẳn chốt này để không câu nào bị bỏ vì "chưa đủ to". Đổi lại: một tiếng động to trong
 * phòng cũng đủ để máy tin là vừa có người nói.
 */
```

### Test đi kèm — `tests/loudGate.test.ts` (ba ca)

**TÌM:**

```ts
  it('chưa lưu gì → "auto"', () => {
    expect(loadLoudGate()).toBe('auto')
  })
```

**THAY BẰNG:**

```ts
  it('chưa lưu gì → "verylow" — bàn giao: gần như tắt hẳn chốt đủ to', () => {
    expect(loadLoudGate()).toBe('verylow')
  })
```

**TÌM:**

```ts
  it('giá trị rác trong kho → "auto"', () => {
    store.set(LOUD_GATE_KEY, 'loudest')
    expect(loadLoudGate()).toBe('auto')
  })
```

**THAY BẰNG:**

```ts
  it('giá trị rác trong kho → "verylow"', () => {
    store.set(LOUD_GATE_KEY, 'loudest')
    expect(loadLoudGate()).toBe('verylow')
  })
```

**TÌM:**

```ts
    expect(() => loadLoudGate()).not.toThrow()
    expect(loadLoudGate()).toBe('auto')
```

**THAY BẰNG:**

```ts
    expect(() => loadLoudGate()).not.toThrow()
    expect(loadLoudGate()).toBe('verylow')
```

---

## TASK 124 — Nhịp nói của buổi: mặc định "Chạy liền mạch, chỉ ngắt khi hết câu"

**Lý do.** Cắt lượt giữa lúc đang nói là hỏng **không sửa được** ở tầng chữ — trong bản ghi 04/08 có "những viên s" / "ét-", "trong thời-" / "điểm". Còn chậm 2 giây thì chỉ là chậm.

**⚠️ ĐÂY LÀ CHỖ DỄ SAI NHẤT CỦA CẢ PROMPT.** Trong `onlineLane.ts` có một dòng đang dùng **hằng số mặc định** làm dấu hiệu nhận biết nấc "Bình thường":

```ts
if (rhythm === SPEECH_RHYTHM_DEFAULT) {
```

Nếu chỉ đổi mặc định mà **không** sửa dòng này, thì người tự tay chọn nấc "Bình thường" sẽ **lặng lẽ** bị đổi hành vi (thành mốc chờ cố định 600ms thay vì mốc đo được). Phải làm **cả hai** chỗ 124.1 và 124.2.

### 124.1 — `src/lib/lanes/online/speechRhythm.ts`

**TÌM:**

```ts
export const SPEECH_RHYTHM_DEFAULT: SpeechRhythm = 'normal';
```

**THAY BẰNG:**

```ts
// 26/08/2026, khi bàn giao: mặc định chuyển 'normal' → 'vendor' ("Chạy liền mạch, chỉ ngắt khi hết câu").
// Lý do: cắt lượt giữa lúc đang nói là hỏng không sửa được ở tầng chữ, còn chậm 2 giây thì chỉ là chậm.
// LƯU Ý cho người đọc sau: hằng số này KHÔNG còn được dùng như dấu hiệu "nấc bình thường" ở bất cứ đâu —
// `onlineLane.stableCommitWindows()` nay hỏi thẳng `rhythm === 'normal'`. Đừng nối lại hai thứ đó.
export const SPEECH_RHYTHM_DEFAULT: SpeechRhythm = 'vendor';
```

### 124.2 — `src/lib/lanes/online/onlineLane.ts` (hai chỗ, bắt buộc cả hai)

**TÌM:**

```ts
import { SPEECH_RHYTHM_DEFAULT, loadSpeechRhythm, rhythmCommitWindows, rhythmPauseSecs, rhythmUsesManualCommit, speechRhythmLabel } from './speechRhythm';
```

**THAY BẰNG:**

```ts
import { loadSpeechRhythm, rhythmCommitWindows, rhythmPauseSecs, rhythmUsesManualCommit, speechRhythmLabel } from './speechRhythm';
```

**TÌM:**

```ts
    const rhythm = loadSpeechRhythm();
    if (rhythm === SPEECH_RHYTHM_DEFAULT) {
```

**THAY BẰNG:**

```ts
    const rhythm = loadSpeechRhythm();
    if (rhythm === 'normal') {
```

### Test đi kèm — `tests/speechRhythm.test.ts` (hai chỗ)

**TÌM:**

```ts
  it('2 · mặc định là "normal" và nấc đó KHÔNG gửi gì lên — không ai bị đổi hành vi', () => {
    expect(SPEECH_RHYTHM_DEFAULT).toBe('normal')
    expect(rhythmPauseSecs(SPEECH_RHYTHM_DEFAULT)).toBeUndefined()
  })
```

**THAY BẰNG:**

```ts
  it('2 · mặc định là "vendor" — chạy liền mạch, không bao giờ cắt vì dấu câu (chốt bàn giao 26/08)', () => {
    expect(SPEECH_RHYTHM_DEFAULT).toBe('vendor')
    expect(rhythmPauseSecs(SPEECH_RHYTHM_DEFAULT)).toBe(PAUSE_SECS_MAX)
    expect(rhythmUsesManualCommit(SPEECH_RHYTHM_DEFAULT)).toBe(false)
    // Nấc "normal" vẫn phải giữ nguyên hành vi cũ cho ai chọn tay nó.
    expect(rhythmPauseSecs('normal')).toBeUndefined()
  })
```

**TÌM:**

```ts
      if (v === SPEECH_RHYTHM_DEFAULT) return profile.windows('ja')!.sentenceMs
```

**THAY BẰNG:**

```ts
      // 26/08: lane hỏi thẳng nấc 'normal', không hỏi qua hằng số mặc định — đổi mặc định không được
      // lặng lẽ đổi hành vi của nấc mà người vận hành đã chọn tay.
      if (v === 'normal') return profile.windows('ja')!.sentenceMs
```

> Nếu `PAUSE_SECS_MAX` hoặc `rhythmUsesManualCommit` chưa nằm trong `import` ở đầu tệp test thì thêm vào.

---

## TASK 125 — Nhả câu sớm: mặc định "Thận trọng" (0,90s)

**Tệp:** `src/lib/lanes/online/livePromote.ts` — hai chỗ.

**TÌM:**

```ts
// mười phút trước buổi lễ không ngồi cân mili-giây. Mặc định là TẮT: đây là đường đi mới của mọi câu,
// nên nó phải được bật một cách cố ý, sau khi đã chạy thử.
```

**THAY BẰNG:**

```ts
// mười phút trước buổi lễ không ngồi cân mili-giây.
//
// MẶC ĐỊNH, chốt 26/08/2026 khi bàn giao luồng online: nấc `careful` (0,90s). Trước ngày này mặc định là
// `off` vì cơ chế còn mới và chưa chạy thật lần nào. Nay nó đã chạy qua các buổi họp nội bộ, và bên nhận
// bàn giao cần một cấu hình chạy được ngay từ lần mở đầu tiên chứ không phải một danh sách nút phải tự
// dò. `careful` là nấc chậm nhất trong ba nấc có bật — chờ gần một giây cho chắc máy nghe thôi sửa chữ.
```

**TÌM:**

```ts
export const LIVE_PROMOTE_DEFAULT: LivePromote = 'off';
```

**THAY BẰNG:**

```ts
export const LIVE_PROMOTE_DEFAULT: LivePromote = 'careful';
```

### Test đi kèm — `tests/livePromote.test.ts` (hai ca)

**TÌM:**

```ts
    it('1 · mặc định là TẮT — đường đi mới của mọi câu phải được bật cố ý', () => {
        expect(LIVE_PROMOTE_DEFAULT).toBe('off')
        expect(livePromoteStableMs('off')).toBe(0)
        expect(livePromoteLabel('off')).toBe('Tắt')
    })
```

**THAY BẰNG:**

```ts
    it('1 · mặc định là THẬN TRỌNG (0,90s) — chốt bàn giao 26/08', () => {
        expect(LIVE_PROMOTE_DEFAULT).toBe('careful')
        expect(livePromoteStableMs(LIVE_PROMOTE_DEFAULT)).toBe(900)
        expect(livePromoteLabel(LIVE_PROMOTE_DEFAULT)).toBe('Thận trọng')
        expect(livePromoteStableMs('off')).toBe(0)
        expect(livePromoteLabel('off')).toBe('Tắt')
    })
```

**TÌM:**

```ts
    it('3 · nấc lạ đọc thành TẮT, không phải "nhả ngay"', () => {
        expect(livePromoteStableMs('khong-co-nac-nay' as never)).toBe(0)
    })
```

**THAY BẰNG:**

```ts
    // 26/08: mặc định đổi từ 'off' sang 'careful', nên giá trị lạ nay rơi về 'careful' chứ không về 0.
    // Điều PHẢI giữ vẫn là điều cũ: giá trị lạ không bao giờ được thành nấc NHANH NHẤT. Nấc mặc định là
    // nấc chậm nhất trong ba nấc có bật, nên tính chất đó còn nguyên.
    it('3 · nấc lạ rơi về nấc mặc định, và không bao giờ thành nấc nhanh nhất', () => {
        expect(livePromoteStableMs('khong-co-nac-nay' as never)).toBe(livePromoteStableMs(LIVE_PROMOTE_DEFAULT))
        expect(livePromoteStableMs('khong-co-nac-nay' as never)).toBeGreaterThan(livePromoteStableMs('fast'))
    })
```

---

# PHẦN 3 — Ẩn các nút tinh chỉnh (TASK 127)

## Ẩn, KHÔNG xoá

Sáu nút trên đã được đặt sẵn ở giá trị chạy được ngay. Người vận hành buổi lễ không nên nhìn thấy chúng nữa: mỗi nút hiện ra là một cơ hội để ai đó chỉnh nhầm mười phút trước giờ G.

Toàn bộ cơ chế bên dưới **vẫn chạy y nguyên**. Chỉ phần giao diện bị giấu đi. Máy nào từng chỉnh tay thì lựa chọn cũ **vẫn còn hiệu lực** — ẩn giao diện không xoá gì trong bộ nhớ máy. Muốn một máy về mặc định thì xoá các khoá `proyaku_online_*` trong localStorage của máy đó.

**Gọi lại khi cần:** đổi đúng **một** dòng `false` → `true` trong tệp mới ở 127.1. Không phải sửa chỗ nào khác.

### 127.1 — Tệp MỚI: `src/lib/lanes/online/tuningVisibility.ts`

```ts
// src/lib/lanes/online/tuningVisibility.ts — MỘT công tắc duy nhất để ẩn/hiện các nút tinh chỉnh
// của luồng ONLINE.
//
// Vì sao có tệp này. 26/08/2026, khi bàn giao luồng online cho đội offline để ráp thành một ứng
// dụng có đủ hai chế độ: sáu nút tinh chỉnh (Độ nhạy micro · Ngưỡng đủ to · Nhịp nói của buổi ·
// Độ khớp khi dẫn theo kịch bản · Nhả câu sớm · Noise gate near-mic) đã được đặt sẵn ở giá trị
// chạy được ngay từ lần mở đầu tiên. Người vận hành buổi lễ không nên nhìn thấy chúng nữa: mỗi nút
// hiện ra là một cơ hội để ai đó chỉnh nhầm mười phút trước giờ G.
//
// ẨN, KHÔNG XOÁ. Toàn bộ cơ chế bên dưới vẫn chạy y nguyên, chỉ phần giao diện bị giấu đi:
//   · mọi hằng số mặc định (`MIC_SENSITIVITY_DEFAULT`, `LOUD_GATE_DEFAULT`, `SPEECH_RHYTHM_DEFAULT`,
//     `GUIDED_MATCH_DEFAULT`, `LIVE_PROMOTE_DEFAULT`) vẫn là thứ quyết định hành vi;
//   · giá trị đã lưu trong localStorage của máy nào từng chỉnh tay vẫn được đọc và vẫn có hiệu lực —
//     ẩn giao diện KHÔNG xoá lựa chọn cũ. Máy nào cần về mặc định thì xoá các khoá
//     `proyaku_online_*` trong localStorage.
//
// GỌI LẠI KHI CẦN: đổi đúng MỘT dòng `false` → `true` bên dưới. Không phải sửa chỗ nào khác.
//
// Kiểu khai báo là `boolean` chứ không để TypeScript tự suy ra `false`, để lúc bật lại không sinh ra
// một loạt cảnh báo "điều kiện luôn sai" ở mọi chỗ dùng.
//
// Pure module: no React, no fetch, no DOM.

export const SHOW_ONLINE_TUNING: boolean = false;
```

### 127.2 — Mở công tắc ra ngoài mặt tiền: `src/lib/lanes/online/index.ts`

Thêm vào **cuối tệp**:

```ts
//   SHOW_ONLINE_TUNING — công tắc DUY NHẤT ẩn/hiện các nút tinh chỉnh của luồng ONLINE (bàn giao
//   26/08/2026). Ẩn giao diện, KHÔNG tắt cơ chế: xem `tuningVisibility.ts`.
export { SHOW_ONLINE_TUNING } from './tuningVisibility'
```

### 127.3 — Ẩn bốn khối trong màn Cài đặt: `src/pages/Settings.tsx`

Trước hết, thêm công tắc vào dòng `import`.

**TÌM:**

```tsx
import { OnlineKeysSettings, OnlineMicSettings, OnlineRhythmSettings, OnlineGuidedMatchSettings, OnlineLivePromoteSettings } from '../lib/lanes/online';
```

**THAY BẰNG:**

```tsx
import { OnlineKeysSettings, OnlineMicSettings, OnlineRhythmSettings, OnlineGuidedMatchSettings, OnlineLivePromoteSettings, SHOW_ONLINE_TUNING } from '../lib/lanes/online';
```

Sau đó bọc **bốn khối liền nhau** `id="ms"` · `id="rh"` · `id="gm"` · `id="lp"` vào trong một điều kiện. **Giữ nguyên từng chữ bên trong bốn khối** — chỉ thụt vào thêm một nấc.

**THÊM NGAY TRƯỚC** dòng `{/* CHẾ ĐỘ ONLINE — ĐỘ NHẠY MICRO (theo máy / theo hội trường) */}`:

```tsx
                    {/* BÀN GIAO 26/08/2026 — bốn khối tinh chỉnh dưới đây được ẨN, không xoá.
                        Sáu nút đã đặt sẵn ở giá trị chạy được ngay; người vận hành buổi lễ không cần
                        thấy chúng nữa. Bật lại: đổi MỘT dòng trong lanes/online/tuningVisibility.ts. */}
                    {SHOW_ONLINE_TUNING && (<>
```

**Và THÊM NGAY SAU** thẻ `</Section>` đóng của khối `id="lp"` (khối chứa `<OnlineLivePromoteSettings />` — khối cuối trong bốn khối):

```tsx
                    </>)}
```

Kết quả phải đọc ra như thế này:

```tsx
                    {SHOW_ONLINE_TUNING && (<>
                        {/* CHẾ ĐỘ ONLINE — ĐỘ NHẠY MICRO … */}
                        <Section id="ms" …>
                            <OnlineMicSettings />
                        </Section>

                        {/* CHẾ ĐỘ ONLINE — NHỊP NÓI CỦA BUỔI … */}
                        <Section id="rh" …>
                            <OnlineRhythmSettings />
                        </Section>

                        {/* CHẾ ĐỘ ONLINE — ĐỘ KHỚP KHI DẪN THEO KỊCH BẢN … */}
                        <Section id="gm" …>
                            <OnlineGuidedMatchSettings />
                        </Section>

                        {/* CHE DO ONLINE — NHA CAU SOM */}
                        <Section id="lp" …>
                            <OnlineLivePromoteSettings />
                        </Section>
                    </>)}
```

> Khối `id="ok"` (Khoá dịch vụ / API Key) nằm **ngay phía trên** và **KHÔNG** được bọc vào — nó vẫn phải hiện ra.

### 127.4 — Ẩn ba nút trong bảng điều khiển: `src/lib/lanes/online/components/OnlineConsole.tsx`

Thêm công tắc vào dòng `import` dài ở đầu tệp.

**TÌM:**

```tsx
import { useOnlineLane,
```

**THAY BẰNG:**

```tsx
import { useOnlineLane, SHOW_ONLINE_TUNING,
```

Trong khối `<section>` "Nguồn vào", bọc **ba** thứ liền nhau: ô đánh dấu `Noise gate (near-mic)`, khối `<div>` chứa `id="online-console-micsense"`, và khối `<div>` chứa `id="online-console-loudgate"`. Giữ nguyên từng chữ bên trong, chỉ thụt vào thêm một nấc.

**THÊM NGAY TRƯỚC** thẻ `<label>` của ô đánh dấu near-mic:

```tsx
                {/* BÀN GIAO 26/08/2026 — ba nút tinh chỉnh dưới đây được ẨN, không xoá. Cơ chế vẫn
                    chạy y nguyên theo mặc định đã chốt (near-mic TẮT · Mic xa · Rất thấp).
                    Bật lại: đổi MỘT dòng trong lanes/online/tuningVisibility.ts. */}
                {SHOW_ONLINE_TUNING && (<>
```

**Và THÊM NGAY SAU** thẻ `</div>` đóng của khối `loudgate` (ngay trước `</section>`):

```tsx
                </>)}
```

> Ô chọn **Micro** (`id="online-console-mic"`) và nút **Quét lại** nằm phía trên và **KHÔNG** được bọc vào — chúng vẫn phải hiện ra.

### 127.5 — Ẩn ô near-mic trong bảng gọn: `src/lib/lanes/online/components/OnlinePanel.tsx`

**TÌM:**

```tsx
import { ONLINE_STATUS_COLOR, useOnlineLane, type TtsGateMode } from '../index'
```

**THAY BẰNG:**

```tsx
import { ONLINE_STATUS_COLOR, useOnlineLane, SHOW_ONLINE_TUNING, type TtsGateMode } from '../index'
```

**TÌM:**

```tsx
          <label className={`flex items-center gap-2 text-sm mb-3 ${running ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <input type="checkbox" className="accent-secondary w-4 h-4" checked={lane.nearMicGate} disabled={running} onChange={(e) => lane.setNearMicGate(e.target.checked)} />
            Noise gate (near-mic) — {lane.nearMicGate ? 'BẬT' : 'TẮT'}
          </label>
```

**THAY BẰNG:**

```tsx
          {/* BÀN GIAO 26/08/2026 — nút tinh chỉnh, ẨN chứ không xoá. Mặc định near-mic đã TẮT.
              Bật lại: đổi MỘT dòng trong lanes/online/tuningVisibility.ts. */}
          {SHOW_ONLINE_TUNING && (
            <label className={`flex items-center gap-2 text-sm mb-3 ${running ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
              <input type="checkbox" className="accent-secondary w-4 h-4" checked={lane.nearMicGate} disabled={running} onChange={(e) => lane.setNearMicGate(e.target.checked)} />
              Noise gate (near-mic) — {lane.nearMicGate ? 'BẬT' : 'TẮT'}
            </label>
          )}
```

### 127.6 — Các test canh chừng: KHÔNG sửa gì

Trong `tests/loudGate.test.ts`, `tests/micSensitivitySetting.test.ts` và `tests/guidedMatch.test.ts` có mấy ca đọc **nguyên văn tệp nguồn** để canh chừng (ví dụ: `Settings.tsx` phải chứa `id="ms"`; dòng `loudgate` không được có `disabled=`; phải có đúng **một** `<OnlineGuidedMatchSettings />`).

Bọc vào điều kiện **không** làm hỏng bất kỳ ca nào trong số đó — chữ vẫn còn nguyên trong tệp, và các khẳng định đều xét theo từng dòng. **Không được sửa các ca này.** Nếu một trong số chúng đỏ lên thì nghĩa là đã xoá nhầm chứ không phải ẩn.

---

# PHẦN 4 — Bốn cổng và ba điều cần báo về

## Bốn cổng — phải xanh cả bốn

Chạy từ trong thư mục gốc của repo:

```bash
npx tsc -b
npx oxlint
npm run build
npm test
```

**Số phải khớp:**

| Cổng | Kết quả phải ra |
|---|---|
| `npx tsc -b` | thoát mã 0, không in dòng lỗi nào |
| `npx oxlint` | **0 lỗi**. Có 5 cảnh báo `only-export-components` sẵn có từ trước (`LiveSessionContext.tsx` ×2, `ActiveEventContext.tsx`, `ConferenceModeContext.tsx`, `brand/react/ProyakuLogo.jsx`) — đúng 5 cái đó, và không thêm cái nào ở tệp vừa sửa |
| `npm run build` | `✓ built` |
| `npm test` | **79 tệp · 1155 chạy + 1 bỏ qua = 1156** |

> ⚠️ **Đừng dùng `npx tsc --noEmit`.** Trong repo này nó kiểm **0 tệp** (tsconfig gốc là `files: []` + references) nên luôn xanh dù có lỗi. Phải là `npx tsc -b`.

## Ba điều cần báo về

1. **Bốn cổng ra số bao nhiêu** — dán nguyên văn dòng cuối của `npm test` và mã thoát của `npx tsc -b`.
2. **Commit hash trên `develop`** sau khi đẩy lên, để bên nhận bàn giao biết mốc.
3. **Thử tay hai việc** (mỗi việc một câu là đủ):
   - Mở đường dẫn trên một máy / trình duyệt **chưa từng dùng** (hoặc cửa sổ ẩn danh) → phải **tự kéo** Chương trình / Kịch bản / Người nói về, **không** hiện ra buổi "Gala 20 năm" rỗng.
   - Mở màn tường, kéo sang màn thứ hai, bấm F cho toàn màn hình, rồi bấm lại **"Mở màn"** → cửa sổ phải **đứng yên**, không nhảy về.

## Một việc cần biết trước khi bàn giao

Khi ráp luồng ONLINE vào ứng dụng chung, phần dịch tinh (refine) sẽ cần **một khoá OpenAI mới**. Khoá cũ đã bị nhà cung cấp vô hiệu hoá và **không dùng lại được**. Khoá nhập ở màn Cài đặt → Khoá dịch vụ, và **chỉ nằm trên máy chủ** — không có khoá nào trong mã nguồn, cũng không có khoá nào trong tệp prompt này.

Lưu ý thêm: Railway xoá sạch tệp mỗi lần deploy lại, nên khoá nhập qua giao diện sẽ **mất sau mỗi lần deploy**. Muốn giữ lâu dài thì đặt bằng biến môi trường của Railway.
