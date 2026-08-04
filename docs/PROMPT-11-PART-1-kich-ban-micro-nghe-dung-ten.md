# PROMPT-11 · PHẦN 1/3 — Kịch bản chắc chắn tới nơi · Độ nhạy micro · Nghe đúng tên riêng

**Gửi:** Claude của Sếp Sơn Lê · **Repo:** `ATS_UserUI` · **Nhánh nền:** `develop` tại commit **`3afcee3`**
**Ngày:** 02/08/2026 · **Sự kiện:** Lễ kỷ niệm 20 năm, 08/08/2026

> **Bản này chia làm 3 phần, chạy lần lượt.** Phần 1 (tệp này) làm 5 việc đầu; Phần 2 làm 12 việc còn lại
> và phải chạy **sau** Phần 1 vì có mấy chỗ sửa tiếp lên chính những dòng Phần 1 vừa viết ra. Phần dành cho
> Sếp đọc ngay dưới đây mô tả **cả hai phần đó**, để Sếp chỉ phải đọc một lần.
>
> **Phần 3** là việc thêm sau, chốt ngày 03/08: Từ điển riêng cho bản chạy trên mạng, và hai ô Thuật ngữ /
> Bối cảnh được nhớ theo từng buổi. Phần 3 chạy **sau** Phần 2, độc lập, và **không chặn** việc đưa Phần 1
> + Phần 2 lên chạy thật — có phần cho Sếp đọc riêng ở đầu tệp đó.

---

## PHẦN CHO SẾP ĐỌC (tiếng Việt — không cần hiểu kỹ thuật)

Thưa Sếp, bản này sửa đúng những gì đã thấy tận mắt ở buổi chạy thử sáng 01/08. Sau bản này:

**1. Máy sẽ gọi đúng tên "Esuhai".** Hôm chạy thử, máy nghe ra "suhai", "S-Hi Group", "SI" — rồi dịch
luôn cái sai đó sang tiếng Nhật, thành ra đọc sai tên công ty ngay trong lễ của chính công ty. Từ bản
này, ngay dưới ô **Thuật ngữ** có thêm một ô mới tên là **"Sửa nghe nhầm"**. Sếp gõ vào đó những dòng kiểu:

```
suhai ~ Esuhai
S-Hi Group ~ Esuhai
SI ~ Esuhai
```

Nghĩa là: *"nghe thành cái bên trái thì thay ngay bằng cái bên phải"*. Dấu `~` là dấu ngã trên bàn phím
(phím bên trái số 1). Máy sẽ thay **trước khi dịch**, nên bản tiếng Nhật cũng đúng theo. Và khác với mọi
ô khác, những dòng này **sửa được ngay giữa buổi**: nghe thấy máy đọc sai tên ai, gõ thêm một dòng là
câu sau đã đúng — không phải dừng, không phải bắt đầu lại.

**2. Kịch bản sẽ chắc chắn tới màn hình chạy.** Sáng 01/08 trang Chuẩn bị báo có đủ 40 dòng kịch bản
nhưng màn hình chạy lại không nhận được dòng nào, và **nó không hề báo một câu nào** — cả buổi máy dịch
tự do. Từ bản này, ngay cạnh nút **Bắt đầu** có một **thẻ trạng thái kịch bản**: xanh là đã nạp được bao
nhiêu dòng của buổi nào; **đỏ** là chưa dùng được, kèm câu nói rõ vì sao (chưa duyệt dòng nào / thiếu bản
dịch / buổi đang chọn không còn). Nếu chỉ vì chưa duyệt, ngay trên thẻ đó có nút **"Duyệt N dòng"** —
bấm một cái là xong, không phải rời màn hình chạy.

**3. Ô "Bỏ qua tiếng xì xào hội trường" sẽ biến mất.** Xin báo trước để Sếp khỏi tưởng bị mất tính năng:

> **Ô "Bỏ qua tiếng xì xào hội trường" đã được bỏ khỏi màn hình.**
>
> Ô này gọi tới một tính năng lọc tiếng ồn của nhà cung cấp. Chúng em đã thử thật với tài khoản của mình
> ngày 02/08 và nhận được câu trả lời của họ: tính năng lọc ồn **không dùng chung được** với tính năng
> đánh dấu câu vừa nói là tiếng Việt hay tiếng Nhật. Họ nói sẽ cho dùng chung ở một bản cập nhật sau.
>
> Mà cái đánh dấu tiếng Việt / tiếng Nhật thì mình đang cần hơn: nó chính là thứ giúp một chiếc micro
> nghe được cả hai thứ tiếng và dịch đúng chiều. Bỏ nó đi thì máy sẽ dịch sai chiều.
>
> Tệ hơn nữa: khi bật ô đó lên, máy nghe **không chạy được luôn** — không phải nghe kém đi, mà là không
> nhận một câu nào, trong khi trên màn hình vẫn hiện như đang cố kết nối. Nên để ô đó nằm trên màn hình
> là một cái bẫy.
>
> Vì vậy ô này được bỏ đi. Phần bên trong máy chủ vẫn giữ nguyên, nên hôm nào nhà cung cấp cho dùng chung
> thì mình bật lại được ngay, không phải sửa chương trình.

**4. Hai núm mới để chỉnh theo từng phòng.** Máy nghe bằng micro cầm tay sát miệng thì khác hẳn máy nghe
bằng chiếc Jabra đặt giữa bàn họp. Từ bản này có:
- **"Độ nhạy micro"** — đặt một lần trong trang **Cài đặt**, theo chiếc micro của phòng đó.
- **"Ngưỡng đủ to"** — ngay trong màn hình chạy, và **vặn được giữa buổi**. Nếu thấy có người đang nói mà
  phụ đề đứng im, mở khối **Chẩn đoán** ra: có một dòng hiện hai con số cạnh nhau và **tự chuyển đỏ** kèm
  chữ *"hạ một nấc"* đúng lúc cần hạ. Hạ một nấc là chữ chạy lại.

**5. Nhịp nói của buổi.** Trước khi bấm Bắt đầu, chọn một trong ba nấc: *"Người nói chậm, hay ngắt"* /
*"Bình thường"* / *"MC nói liền mạch"*. Buổi họp nội bộ và buổi lễ có nhịp khác nhau; chọn đúng nấc thì
máy cắt câu đúng chỗ hơn.

**6. Vài chỗ nhỏ đỡ mất công.** Ô Thuật ngữ báo luôn *"đang dùng N/30 từ khoá"* và **bôi đỏ** dòng nào
dài quá 20 ký tự (dòng dài bị máy nghe bỏ, trước đây bỏ im lặng). Kịch bản **xuất/nhập được tệp `.json`**
để chép sang máy khác, và nhập nhầm tệp rỗng thì máy báo chứ không xoá trắng. Khi máy chủ lỗi, màn hình
nói **nguyên nhân thật** (hết giờ chờ / chưa có khoá / nhà cung cấp trả lỗi) thay vì một câu chung chung.

**Sau khi Sếp chạy bản này xong, mong Sếp thử đúng 4 việc:** (a) gõ một dòng `~` trong ô Sửa nghe nhầm rồi
nói câu có tên đó; (b) nhìn thẻ kịch bản cạnh nút Bắt đầu; (c) mở Chẩn đoán xem dòng hai con số; (d) chọn
một nấc nhịp nói rồi bấm Bắt đầu.

---

## THE REST OF THIS FILE IS FOR THE ASSISTANT

<role>
You are working in the `ATS_UserUI` repository. You implement the ONLINE interpretation lane. You have
already delivered PROMPT-06 through PROMPT-10 in this repo; this file continues that series and assumes
the tree is exactly `develop` @ `3afcee3` (the commit currently deployed).
</role>

<context>
On 2026-08-01 the operator ran a full rehearsal of the 20th-anniversary gala through the deployed build,
reading the real 40-line script into a far-field speakerphone. The transcript of that rehearsal is the
evidence behind every task below. Six things went wrong, and each one is a task in this file:

1. The company's own name was misheard three different ways and the mistakes propagated into the Japanese
   that was spoken aloud. Glossary keyterms did not save it: keyterms bias the recogniser, they do not
   correct what it already decided. Nothing in the pipeline corrects a known mishearing AFTER recognition.
2. The approved script never reached the live matcher. The prep screen showed 40 approved rows; the
   console loaded zero, and said nothing. Root cause is in TASK 1 — two different derivations of the same
   storage key, plus a synchronous read that had been placed behind a network call.
3. Whole sentences came out twice, and Japanese sentences stuttered inside themselves
   (`ご一緒に…ご一緒に`). Two independent causes, TASK 8 and TASK 9 and TASK 10.
4. A half-heard fragment was rendered with confident but wrong kanji (`東立二十少年記念` for
   `創立二十周年記念`). The refine prompt tells the model to produce Japanese and gives it no way to say
   "I am not sure of this spelling". TASK 11.
5. The far-field microphone starved the anti-hallucination gate: the capture worklet counted the speech
   as speech while a second, hard-coded threshold counted the same audio as silence, so finals were
   dropped. TASK 2 and TASK 3.
6. A console switch ("Bỏ qua tiếng xì xào hội trường") could not work at all — the vendor refuses the
   handshake when its background-audio filter is combined with timestamps, and timestamps are what carry
   the language label. TASK 4 removes the switch and quotes the vendor's exact reply.

The gala is on 2026-08-08. Everything in this file is either a fix for something observed, or a knob the
technician needs in order to adapt the same build to an internal meeting room and to a 700-seat hall.
</context>

<how_to_work>
- **Baseline.** Every "replace" block below quotes the CURRENT text at `3afcee3` byte-for-byte, including
  indentation. Find it, replace it. If a block cannot be found verbatim, STOP and report it rather than
  applying a similar-looking edit — a semantically-right patch in the wrong place is a defect here.
- **One pass, no per-task report.** Work through the tasks in the order given; they are ordered so that
  files touched by several tasks are handled in adjacent tasks. Report once, at the end.
- **Follow this repo's own `CLAUDE.md`.** In particular: online-lane client code stays under
  `src/lib/lanes/online/`; only `src/pages/AudioRouting.tsx`, `src/pages/Settings.tsx` and `/online-lab`
  may import the facade root, and never anything deeper; do not touch `src/lib/api.ts`,
  `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, or `src/lib/lanes/types.ts`; no vendor env
  name, model id, API host or key value may appear anywhere under `src/`.
- **Add no dependency.** `package.json` and `package-lock.json` must end with zero lines changed. Every
  test below runs in the existing vitest **node** environment; React behaviour is asserted by reading the
  component source with `readFileSync` (the pattern this repo's `tests/wallCompactLayout.test.ts` already
  uses), never by rendering. If you find yourself wanting jsdom or a testing library, you have taken a
  wrong turn — rewrite the assertion as a source guard.
- **Tests are part of each task**, not a phase at the end. Every task states the file and the exact number
  of cases it adds.
- **RED LIGHTS — stop and report instead of improvising:** `src/lib/lanes/types.ts` would have to change ·
  `package.json` would have to change · an offline-lane file would have to change · a replace block's old
  text is not present verbatim.
</how_to_work>

<what_you_must_not_do>
- Do not add, change or read any API key, and do not add environment variables to the client. Server env
  names already present in `server/online-api.mjs` may be extended there, and only there.
- Do not add a new HTTP endpoint. TASK 13 deliberately rides the request body of an endpoint that already
  exists.
- Do not touch authentication, the login gate, or anything security-related — the owner has ruled that
  out of scope for now.
- Do not build a transcript history page. TASK 14 only adds three fields to the record that is already
  written; the page is a later prompt.
- Do not modify any existing test file. **PART 1 changes none of them at all.** Three are touched later in
  PART 2 and are named there — `tests/serverAsr.test.ts` (six lines, TASK 10), one case of
  `tests/asrTransport.test.ts` (TASK 9), and the fixture plus one case of `tests/sessionExport.test.ts`
  (TASK 14). All three pin a behaviour this prompt deliberately corrects, and all three reasons are
  written out where the change is made. Nothing in this file needs any of them.
</what_you_must_not_do>

## Task list — PART 1 (this file)

| # | What | Main files |
|---|---|---|
| 1 | The approved script reliably reaches the live session, and says so on screen | `src/lib/scriptLoad.ts` (new), `OnlineConsole.tsx` |
| 2 | "Độ nhạy micro" — 4 steps, in Settings and in the console | `pcm16Capture.ts`, `micSensitivity.ts` (new), `OnlineMicSettings.tsx` (new), `Settings.tsx` |
| 3 | "Ngưỡng đủ to" — the loud gate becomes an operator knob | `loudGate.ts` (new), `onlineLane.ts`, `OnlineConsole.tsx` |
| 4 | Remove the "Bỏ qua tiếng xì xào hội trường" switch (client only) | `index.ts`, `onlineLane.ts`, `asrTransport.ts`, `OnlineConsole.tsx` |
| 5 | The misheard-substitution layer, `~` syntax, editable mid-session | `mishearing.ts` (new), `onlineLane.ts`, `index.ts`, `OnlineConsole.tsx` |

PART 2 continues with tasks 6–17 (script keyterms · keyterm budget · the doubled sentences · the lost
sentence · the "already translated" lie · kanji guessing · the language-detection echo · per-meeting speech
rhythm · transcript fields · script `.json` · real failure causes · two doc repairs). Do **not** start it
until PART 1 is applied and green.

Expected test count when PART 1 is done: **288 → 403**. Each task states its own contribution, and the
arithmetic is repeated at the end of this file.

**Some tasks touch the same file, on purpose — they are ordered so that never becomes a conflict.** Where
one task's quoted "old" text is something an earlier task produced rather than something already in the
tree, the task says so in a blockquote right above the block. Everywhere else, the quoted text is exactly
what is in `develop` @ `3afcee3` today. Work top to bottom and neither case can surprise you.

---

# TASK 1 — The approved script reliably reaches the live session, and the screen says whether it did

**Why.** At the 2026-08-01 rehearsal the Kịch bản screen showed 40 approved rows and the console loaded
**zero**, silently, so the whole ceremony ran as free translation. There are two independent causes, both
present at `3afcee3`:

1. **Two different derivations of the same storage key.** `src/pages/ScriptPrep.tsx:504` reads the RAW
   pointer (`useActiveEvent().eventId`) and writes the script under it. `OnlineConsole.tsx:185` used
   `event?.id ?? ''` — the pointer *after* it has been resolved against the schedule list. The two agree
   only while the pointer still resolves. When it does not (the event was removed, or the schedule store
   is corrupt), the prep screen keeps showing 40 rows while the console reads the `_default` store and
   finds none.
2. **The script was loaded behind a network call.** `applyScript()` sat inside the `.then()` of
   `collectPrepPack(...)`, which awaits the internal glossary over the network. On the deployed build that
   request cannot be reached at all, so for the whole timeout the console believes this meeting has no
   script — and pressing Bắt đầu inside that window latches an empty matcher for the entire session.
   Reading the script is a `localStorage` read; there is no reason for it to queue behind a network call.

And there is a third trap that made cause 1 invisible: rows imported from a file arrive as **draft**
(`src/lib/scriptImport.ts` never sets `status`), and only approved rows count. A ceremony that ran on free
translation for want of one button press is too expensive to leave to a screen the operator has to
remember to visit.

## 1.1 New file `src/lib/scriptLoad.ts`

One place answers "how many script rows will this session get, and if none, why". It lives outside
`src/lib/lanes/online/` on purpose: it is not lane code, it reads the same prep store the Kịch bản page
writes, and both the page and the lane's console are allowed to import it (the same arrangement as
`prepData.ts`).

```ts
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
```

## 1.2 `OnlineConsole.tsx` — read through the new module, synchronously, and show the result

**(a) Replace the import at line 22.**

```tsx
import { getScriptLocal } from '../../../script'
```

with

```tsx
import { loadScriptForSession, approveTranslatedRows, scriptLoadMessage, type ScriptLoad } from '../../../scriptLoad'
```

**(b) Replace the two helper functions (lines 34–51) — the whole block from the `// M9 —` comment down to
and including the closing brace of `loadScriptForLane`:**

```tsx
// M9 — the approved script the live matcher is allowed to speak from. Only rows a human APPROVED and
// that carry BOTH sides qualify: a draft row is somebody's unchecked guess, and a row with an empty
// translation would put a blank line on the audience wall. Read-only use of the Chuẩn bị store, the
// same arrangement as collectPrepPack above.
function scriptCountLine(c: { approved: number; total: number }): string {
  if (c.approved > 0) return `Kịch bản: ${c.approved}/${c.total} dòng đã duyệt — câu nào trùng kịch bản sẽ đọc đúng câu đã duyệt.`
  if (c.total > 0) return `Kịch bản: có ${c.total} dòng nhưng chưa dòng nào được duyệt — máy vẫn tự dịch toàn bộ.`
  return 'Kịch bản: chưa có dòng nào — máy tự dịch toàn bộ.'
}

function loadScriptForLane(eventId: string): { rows: ScriptMatcherEntry[]; total: number } {
  try {
    const all = getScriptLocal(eventId)
    return { rows: all.filter((r) => r.status === 'approved' && r.src.trim() !== '' && r.dst.trim() !== ''), total: all.length }
  } catch {
    return { rows: [], total: 0 } // corrupt/absent local script → translate everything, never crash the console
  }
}
```

with

```tsx
// M9 — the approved script the live matcher is allowed to speak from. Only rows a human APPROVED and
// that carry BOTH sides qualify: a draft row is somebody's unchecked guess, and a row with an empty
// translation would put a blank line on the audience wall.
//
// Both the key derivation and the row filter now live in `src/lib/scriptLoad.ts`, shared with the Kịch
// bản page. The version that used to sit here derived the key from `event?.id ?? ''` — the pointer AFTER
// resolution against the schedule — so a pointer that no longer resolves made the console read the
// `_default` store and find 0 rows while Chuẩn bị still showed 40 approved ones, without a word on screen.
```

**(c)** `ScriptMatcherEntry` is now unused in this file. Remove it from the type import on line 16 (leave
every other imported name exactly as it is).

**(d) Replace line 124:**

```tsx
  const { event } = useActiveEvent()
```

with

```tsx
  // `eventId` = the RAW pointer, the key the Kịch bản page writes under; `event` = the resolved meeting,
  // used ONLY to show its title and to detect a dangling pointer. Never derive the script key from `event`.
  const { eventId, event } = useActiveEvent()
```

**(e) Replace line 133:**

```tsx
  const [scriptCount, setScriptCount] = useState({ approved: 0, total: 0 })
```

with

```tsx
  // Read on the FIRST render, not in an effect: the technician can press Bắt đầu in the first second, and
  // the script status has to be true from that second rather than after some promise settles.
  const [scriptLoad, setScriptLoad] = useState<ScriptLoad>(() => loadScriptForSession(eventId))
```

**(f) Replace the `applyScript` callback (lines 184–188):**

```tsx
  const applyScript = useCallback(() => {
    const { rows, total } = loadScriptForLane(event?.id ?? '')
    lane.setScript(rows)
    setScriptCount({ approved: rows.length, total })
  }, [event, lane])
```

with

```tsx
  const applyScript = useCallback(() => {
    const load = loadScriptForSession(eventId)
    lane.setScript(load.rows)
    setScriptLoad(load)
  }, [eventId, lane])

  // The draft trap: 40 rows imported from a file all arrive as draft (`scriptImport.ts` never sets
  // `status`), and a ceremony running on free translation for want of one button press is too expensive.
  // This does exactly what the Kịch bản page's "Duyệt hết đã dịch" does, in place, so nobody has to leave
  // the running screen minutes before the doors open.
  const approveAllDrafts = useCallback(() => {
    if (!window.confirm(`Duyệt ${scriptLoad.draft} dòng kịch bản đã có bản dịch? Sau khi duyệt, câu nào trùng kịch bản sẽ được đọc đúng câu đã duyệt.`)) return
    approveTranslatedRows(eventId)
    applyScript()
  }, [scriptLoad.draft, eventId, applyScript])
```

**(g) Replace the auto-load effect (lines 249–262):**

```tsx
  useEffect(() => {
    const key = `${event?.id ?? ''}|${lane.direction}`
    if (prepLoadedRef.current === key) return
    prepLoadedRef.current = key
    let cancelled = false
    void collectPrepPack(event, lane.direction).then((pack) => {
      if (cancelled) return
      setPrep(pack)
      if (!lane.terms.trim()) lane.setTerms(pack.terms)
      if (!lane.brief.trim()) lane.setBrief(pack.brief)
      applyScript()
    })
    return () => { cancelled = true }
  }, [event, lane.direction, lane, applyScript])
```

with

```tsx
  useEffect(() => {
    const key = `${eventId}|${lane.direction}`
    if (prepLoadedRef.current === key) return
    prepLoadedRef.current = key
    // The script loads FIRST and synchronously. It used to sit inside the `.then()` of collectPrepPack,
    // which awaits the internal glossary over the network — unreachable on the deployed build — so for
    // that whole timeout the console believed the meeting had no script, and pressing Bắt đầu inside that
    // window latched an empty matcher for the entire session. Reading the script is a localStorage read.
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

**(h) Replace line 291:**

```tsx
      <div>{scriptCountLine(scriptCount)}</div>
```

with

```tsx
      <div>{scriptLoadMessage(scriptLoad)}</div>
```

**(i)** Add the derived flags next to the other derived state. Replace lines 342–343:

```tsx
  const diag = lane.diagnostics
  const lat = diag?.latency
```

with

```tsx
  // Script: green only when the matcher actually has rows to speak; red for all three ways of having 0.
  // `danglingEvent` = a pointer that survives while its meeting has vanished from the schedule — the exact
  // signature of the 2026-08-01 failure.
  const scriptReady = scriptLoad.reason === 'ok'
  const danglingEvent = eventId !== '' && !event

  const diag = lane.diagnostics
  const lat = diag?.latency
```

**(j) The status card itself.** Replace lines 350–357 (the session block at the top of the rail):

```tsx
          {/* A · PHIÊN — bắt đầu / dừng (§1.1a: Dừng dịch = 1 lần bấm, không giữ) */}
          {lane.running ? (
            <RailBtn icon="stop" label="Dừng dịch" big tone="danger" ariaLabel="Dừng phiên dịch" title="Dừng phiên dịch" onClick={() => { void lane.stop() }} />
          ) : (
            <RailBtn icon="play_arrow" label="Bắt đầu dịch" big tone="primary" disabled={setupPhase}
              title={keysReady ? 'Bắt đầu phiên dịch' : 'Chưa nhập khoá dịch vụ (API Key) — mở Cài đặt'}
              onClick={() => { void handleStart() }} />
          )}
```

with

```tsx
          {/* A · PHIÊN — bắt đầu / dừng (§1.1a: Dừng dịch = 1 lần bấm, không giữ) */}
          {lane.running ? (
            <RailBtn icon="stop" label="Dừng dịch" big tone="danger" ariaLabel="Dừng phiên dịch" title="Dừng phiên dịch" onClick={() => { void lane.stop() }} />
          ) : (
            <RailBtn icon="play_arrow" label="Bắt đầu dịch" big tone="primary" disabled={setupPhase}
              title={keysReady ? 'Bắt đầu phiên dịch' : 'Chưa nhập khoá dịch vụ (API Key) — mở Cài đặt'}
              onClick={() => { void handleStart() }} />
          )}
          {/* SCRIPT STATUS — right next to Bắt đầu, before it is pressed. On 2026-08-01 the ceremony ran
              on free translation while every prep screen said "kịch bản đã có": the running screen never
              said how many rows it had loaded, or for which meeting. This says both, and when the answer
              is zero it says WHY instead of staying silent. */}
          <div className={`rounded-xl border px-3 py-2.5 space-y-1.5 ${scriptReady ? 'border-outline-variant bg-surface-container' : 'border-error/60 bg-error/[0.08]'}`}>
            <div className="flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-[16px] shrink-0 ${scriptReady ? 'text-secondary' : 'text-error'}`} aria-hidden="true">{scriptReady ? 'subtitles' : 'warning'}</span>
              <span className="text-[12px] font-medium text-on-surface truncate" title={event?.title?.trim() || undefined}>{event?.title?.trim() || 'Chưa chọn buổi nào'}</span>
            </div>
            <div className={`text-[11px] leading-snug ${scriptReady ? 'text-on-surface-variant' : 'text-error'}`}>{scriptLoadMessage(scriptLoad)}</div>
            {danglingEvent && (
              <div className="text-[11px] leading-snug text-error">Buổi đang chọn không còn trong Đặt lịch — mở Chuẩn bị chọn lại buổi rồi quay lại đây.</div>
            )}
            {scriptLoad.draft > 0 && (
              <button type="button" onClick={approveAllDrafts} disabled={lane.running}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-full font-label-caps text-label-caps border border-secondary/50 text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={lane.running ? 'Đang chạy — dừng phiên trước khi duyệt kịch bản' : 'Duyệt mọi dòng đã có bản dịch'}>
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">done_all</span>Duyệt {scriptLoad.draft} dòng
              </button>
            )}
          </div>
```

## 1.3 Tests — new file `tests/scriptLoad.test.ts`, **16 cases**

Use the existing localStorage stub pattern from `tests/prepData.test.ts`. Cover, one case each:

1. An event with 3 approved two-sided rows → `rows.length === 3`, `reason === 'ok'`.
2. Rows are read under the RAW pointer: write under `proyaku_script:evt-9`, call
   `loadScriptForSession('evt-9')`, get them back.
3. A pointer that does not match any stored key returns 0 rows and never reads `_default` for it —
   `loadScriptForSession('evt-missing').total === 0` while `proyaku_script:_default` holds 5 rows.
4. `loadScriptForSession('')` reads the `_default` store (the no-event-selected case).
5. Draft rows with both sides → `reason === 'all-draft'`, `draft` counts them, `rows` is empty.
6. Approved rows missing `dst` → excluded from `rows`.
7. Rows with `src` but no `dst` → `missingTranslation` counts them and, when there are no drafts,
   `reason === 'missing-translation'`.
8. Empty store → `reason === 'no-rows'`.
9. A corrupt value under the key (`'{{{'`) → no throw, `total === 0`, `reason === 'no-rows'`.
10. `scriptLoadMessage` for `ok` contains `${rows}/${total} dòng đã duyệt`.
11. `scriptLoadMessage` for `all-draft` names the button text `Duyệt` and the draft count.
12. `scriptLoadMessage` for `missing-translation` names the missing count.
13. `scriptLoadMessage` for `no-rows` says the machine will translate everything.
14. `approveTranslatedRows` approves both-sided drafts, returns their count, and a following
    `loadScriptForSession` reports `reason === 'ok'`.
15. `approveTranslatedRows` never approves a row without `dst`, and that row stays `draft`.
16. `approveTranslatedRows` on a store with nothing to approve returns `0` and writes nothing (assert the
    stored JSON string is byte-identical before and after).

## 1.4 Tests — new file `tests/scriptLoadConsole.test.ts`, **6 cases**

Source guards over `src/lib/lanes/online/components/OnlineConsole.tsx`, read with `readFileSync`:

1. The file imports `loadScriptForSession` from `'../../../scriptLoad'`.
2. The file no longer contains `getScriptLocal` or `loadScriptForLane`.
3. The file no longer contains the string `event?.id ?? ''` — the console must not derive a script key
   from a resolved event ever again.
4. `applyScript` is called OUTSIDE the `collectPrepPack(...).then(` block: assert the source contains
   `applyScript()\n    let cancelled = false` (script first, network second).
5. The status card exists and turns red: the source contains `border-error/60 bg-error/[0.08]`.
6. The in-place approve button exists and is disabled while running: a line matching
   `/^.*onClick=\{approveAllDrafts\}.*$/m` also contains `disabled={lane.running}`.

---

# TASK 2 — "Độ nhạy micro": one setting, four steps, in Settings and in the console

**Why.** The capture worklet decides what counts as a voice with a hard-coded floor
(`rms < 0.012 && peak < 0.035`, `pcm16Capture.ts:93`) that was tuned for a microphone at the mouth. The
same floor feeds BOTH the near-mic gate and the anti-hallucination voiced-ms counter. A speakerphone in
the middle of a meeting table never reaches it, so the machine hears the room as silence. Internal
meetings record through a far Jabra; the hall uses hand-held mics. The technician must be able to say
which, per machine, without a redeploy.

## 2.1 `pcm16Capture.ts` — a voice floor that follows the setting

**(a)** Insert the type and the resolver immediately BEFORE `const WORKLET_SRC = \``. Replace:

```ts
const WORKLET_SRC = `
```

with

```ts
export type MicSensitivity = 'auto' | 'close' | 'medium' | 'far';

// Voice-floor resolver shared by the worklet AND the unit tests. Self-contained ON PURPOSE — its
// compiled source is injected into the AudioWorklet via toString(), where module scope does not exist,
// so it must capture nothing (every constant lives inside the function body).
export function resolveVoiceFloor(sensitivity: string, noiseRms: number): { rms: number; peak: number } {
  const CLOSE_RMS = 0.012;          // the original hard-coded tuning — a mic right at the mouth
  const PEAK_RATIO = 0.035 / 0.012; // keep that tuning's peak/rms proportion at every sensitivity
  let rms: number;
  if (sensitivity === 'far') rms = CLOSE_RMS * 0.25;
  else if (sensitivity === 'medium') rms = CLOSE_RMS * 0.5;
  else if (sensitivity === 'auto') {
    // Adapt to THIS mic: sit a fixed ratio above the learned noise floor — never above the close-mic
    // tuning (a hot mic keeps today's behaviour), never down into digital silence (a suppressed floor
    // of ~0 must not make breath count as speech).
    const noise = Number.isFinite(noiseRms) && noiseRms > 0 ? noiseRms : 0.002;
    rms = Math.min(CLOSE_RMS, Math.max(0.003, noise * 3.5));
  } else rms = CLOSE_RMS; // unknown value → the conservative original
  return { rms, peak: rms * PEAK_RATIO };
}

const WORKLET_SRC = `
```

**(b)** Replace:

```ts
    this.nearMicGateEnabled = true;
```

with

```ts
    this.nearMicGateEnabled = true;
    this.micSensitivity = 'auto';
    this.resolveVoiceFloor = (${resolveVoiceFloor.toString()});
```

**(c)** Replace:

```ts
        if (typeof d.nearMicGateEnabled === 'boolean') this.nearMicGateEnabled = d.nearMicGateEnabled;
```

with

```ts
        if (typeof d.nearMicGateEnabled === 'boolean') this.nearMicGateEnabled = d.nearMicGateEnabled;
        if (typeof d.micSensitivity === 'string') this.micSensitivity = d.micSensitivity;
```

**(d)** Replace:

```ts
    const isSilent = rms < 0.012 && peak < 0.035 && rms < this.noiseRms * 3.2;
```

with

```ts
    const floor = this.resolveVoiceFloor(this.micSensitivity, this.noiseRms);
    const isSilent = rms < floor.rms && peak < floor.peak && rms < this.noiseRms * 3.2;
```

**(e)** Replace:

```ts
  options?: { nearMicGate?: boolean },
```

with

```ts
  options?: { nearMicGate?: boolean; micSensitivity?: MicSensitivity },
```

**(f)** Replace:

```ts
      nearMicGateEnabled: options?.nearMicGate ?? true,
```

with

```ts
      nearMicGateEnabled: options?.nearMicGate ?? true,
      micSensitivity: options?.micSensitivity ?? 'auto',
```

## 2.2 New file `src/lib/lanes/online/micSensitivity.ts`

```ts
// src/lib/lanes/online/micSensitivity.ts — "Độ nhạy micro" is a PER-MACHINE / PER-HALL setting.
//
// Why it is separate from the hook: this value belongs to the room and the microphone, not to a meeting.
// The internal meeting room records through a Jabra in the middle of the table; the hall plugs in a
// hand-held mic at the mouth. The technician sets it ONCE on the Settings page and forgets it — not
// once per console session.
//
// Exactly one place reads/writes the `proyaku_online_mic_sense` key: the Settings page writes it, the
// `useOnlineLane` hook reads it at mount. The Settings page must NOT call `useOnlineLane` (that hook
// starts diagnostics timers, the audience publisher and a voice-catalog fetch — none of which a config
// page has any business doing), so both sides go through this module and can never drift apart.

import type { MicSensitivity } from './pcm16Capture';

export const MIC_SENSITIVITY_KEY = 'proyaku_online_mic_sense';
export const MIC_SENSITIVITY_DEFAULT: MicSensitivity = 'auto';

/** Vietnamese label + one sentence for whoever stands at the technical desk. Ordered most to least strict. */
export const MIC_SENSITIVITY_OPTIONS: readonly { value: MicSensitivity; label: string; hint: string }[] = [
  { value: 'auto', label: 'Tự động (theo mic)', hint: 'Máy tự đo nền ồn của chính chiếc mic đang cắm rồi đặt ngưỡng ngay trên nền ồn đó. Chọn cái này nếu không chắc.' },
  { value: 'close', label: 'Sát miệng', hint: 'Mic cài áo, mic cầm tay, headset — người nói cách mic một gang tay. Ngưỡng cao nhất, ít bắt nhầm tiếng phòng nhất.' },
  { value: 'medium', label: 'Vừa', hint: 'Mic để trên bàn ngay trước mặt người nói, hoặc mic hội trường cách người nói khoảng một sải tay.' },
  { value: 'far', label: 'Mic xa / speakerphone', hint: 'Jabra hoặc loa hội nghị đặt giữa bàn, người nói ngồi vòng quanh. Ngưỡng thấp nhất — nghe được tiếng nhỏ, nhưng cũng dễ bắt tiếng động của phòng hơn.' },
];

export function isMicSensitivity(v: unknown): v is MicSensitivity {
  return v === 'auto' || v === 'close' || v === 'medium' || v === 'far';
}

/** Read the stored choice. Absent / corrupt / storage blocked → 'auto' (adapts to whatever mic is used). */
export function loadMicSensitivity(): MicSensitivity {
  try {
    const v = localStorage.getItem(MIC_SENSITIVITY_KEY);
    return isMicSensitivity(v) ? v : MIC_SENSITIVITY_DEFAULT;
  } catch {
    return MIC_SENSITIVITY_DEFAULT;
  }
}

/** Write the choice. An unknown value is ignored (returns false) — never write rubbish into the store. */
export function saveMicSensitivity(v: MicSensitivity): boolean {
  if (!isMicSensitivity(v)) return false;
  try {
    localStorage.setItem(MIC_SENSITIVITY_KEY, v);
    return true;
  } catch {
    return false; // private mode / quota — this session still runs, it just will not be remembered
  }
}

/** Label used to print the value currently in force (console summary line). */
export function micSensitivityLabel(v: MicSensitivity): string {
  return MIC_SENSITIVITY_OPTIONS.find((o) => o.value === v)?.label ?? v;
}
```

## 2.3 New file `src/lib/lanes/online/components/OnlineMicSettings.tsx`

```tsx
// src/lib/lanes/online/components/OnlineMicSettings.tsx — the "Độ nhạy micro" section of the Settings page.
//
// This is a PER-MACHINE / PER-HALL configuration, not a per-meeting one: the room's microphone does not
// change between the rehearsal and the ceremony. Set once here; the console keeps its own selector for a
// quick change right before pressing Bắt đầu.
//
// Deliberately does NOT call `useOnlineLane`: that hook starts the diagnostics timer, the audience-wall
// publisher and a voice-catalog fetch — none of which belongs on a config page. This component reads and
// writes exactly one key through `micSensitivity.ts`, the same module the hook reads at mount.

import React, { useState } from 'react'
import { MIC_SENSITIVITY_OPTIONS, loadMicSensitivity, saveMicSensitivity, type MicSensitivity } from '../index'
import { toast } from '../../../toast'

const OnlineMicSettings: React.FC = () => {
  const [value, setValue] = useState<MicSensitivity>(() => loadMicSensitivity())

  const choose = (v: MicSensitivity) => {
    setValue(v)
    const label = MIC_SENSITIVITY_OPTIONS.find((o) => o.value === v)?.label ?? v
    if (saveMicSensitivity(v)) toast.success(`Đã lưu độ nhạy micro: ${label}`)
    else toast.info(`Đã đổi sang ${label} cho phiên này (máy không cho lưu cấu hình)`)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-on-surface-variant">
        Ngưỡng để máy coi là <strong>“có người đang nói”</strong>. Đặt sai thì hoặc máy bỏ sót câu nói nhỏ,
        hoặc máy tưởng tiếng ồn của phòng là lời nói. Chọn theo <strong>chiếc micro đang cắm ở máy này</strong>,
        không theo nội dung buổi họp.
      </p>

      <div role="radiogroup" aria-label="Độ nhạy micro" className="space-y-2">
        {MIC_SENSITIVITY_OPTIONS.map((o) => {
          const on = value === o.value
          return (
            <label
              key={o.value}
              htmlFor={`micsense-${o.value}`}
              className={`flex items-start gap-3 rounded-DEFAULT border px-3 py-2.5 cursor-pointer transition-colors ${on ? 'border-secondary bg-surface' : 'border-outline-variant hover:border-primary'}`}
            >
              <input
                id={`micsense-${o.value}`}
                type="radio"
                name="micsense"
                value={o.value}
                checked={on}
                onChange={() => choose(o.value)}
                className="accent-secondary mt-1"
              />
              <span className="min-w-0">
                <span className={`font-label-caps text-label-caps ${on ? 'text-secondary' : 'text-on-surface'}`}>{o.label}</span>
                <span className="block text-xs text-on-surface-variant leading-relaxed mt-0.5">{o.hint}</span>
              </span>
            </label>
          )
        })}
      </div>

      <p className="text-xs text-on-surface-variant/80">
        Lưu ngay khi chọn, chỉ trên máy này. Màn hình dịch vẫn có ô “Độ nhạy micro” để đổi nhanh trước khi bấm
        Bắt đầu; giá trị chọn ở đây là mặc định mỗi lần mở máy. Đang chạy mà đổi thì áp dụng từ lần Bắt đầu sau.
      </p>
    </div>
  )
}

export default OnlineMicSettings
```

## 2.4 `src/pages/Settings.tsx` — add the section

Replace:

```tsx
import { OnlineKeysSettings } from '../lib/lanes/online';
```

with

```tsx
import { OnlineKeysSettings, OnlineMicSettings } from '../lib/lanes/online';
```

and replace:

```tsx
                    {/* HIỂN THỊ */}
```

with

```tsx
                    {/* CHẾ ĐỘ ONLINE — ĐỘ NHẠY MICRO (theo máy / theo hội trường) */}
                    <Section id="ms" icon="mic" title="Chế độ ONLINE — Độ nhạy micro" desc="Máy này đang nghe bằng loại micro nào. Đặt một lần theo phòng, không phải đặt lại mỗi buổi.">
                        <OnlineMicSettings />
                    </Section>

                    {/* HIỂN THỊ */}
```

## 2.5 Tests — new file `tests/micSensitivity.test.ts`, **8 cases**

On `resolveVoiceFloor` only (pure function, no DOM):

1. `'close'` → `{ rms: 0.012, peak: 0.035 }` — the original tuning is preserved exactly (allow 1e-9).
2. `'medium'` → rms `0.006`.
3. `'far'` → rms `0.003`, and its peak is `0.00875` (this number matters in TASK 3 — keep the assertion).
4. An unknown string → the close-mic numbers (conservative fallback).
5. `'auto'` with a learned floor of `0.002` → `0.007` (3.5×).
6. `'auto'` is clamped ABOVE by the close tuning: a noise floor of `0.05` still gives `0.012`.
7. `'auto'` is clamped BELOW at `0.003`: a noise floor of `0` or `NaN` never returns 0.
8. `resolveVoiceFloor.toString()` contains no identifier from module scope — assert the source has no
   occurrence of `CLOSE_RMS` outside the function body by checking the function's own text declares
   `const CLOSE_RMS` (it must be self-contained, because it is injected into the worklet by `toString()`).

## 2.6 Tests — new file `tests/micSensitivitySetting.test.ts`, **20 cases**

Storage lifecycle + list shape + source guards. Use a localStorage stub.

1. Default with nothing stored → `'auto'`.
2. Round trip: `saveMicSensitivity('far')` then `loadMicSensitivity()` → `'far'`.
3. Every one of the four values round-trips.
4. A rubbish stored value (`'loud'`) → `'auto'`.
5. `saveMicSensitivity('loud' as MicSensitivity)` returns `false` and writes nothing.
6. A localStorage that throws on `getItem` → `loadMicSensitivity()` returns `'auto'`, no throw.
7. A localStorage that throws on `setItem` → `saveMicSensitivity` returns `false`, no throw.
8. `MIC_SENSITIVITY_KEY === 'proyaku_online_mic_sense'`.
9. `MIC_SENSITIVITY_OPTIONS` has exactly 4 entries, in the order auto · close · medium · far.
10. Every option has a non-empty Vietnamese `hint`.
11. `micSensitivityLabel` returns the list's label for each value.
12. `isMicSensitivity` accepts the four and rejects `null`, `''`, `'FAR'`, `3`.
13. The option order matches the real thresholds: `resolveVoiceFloor(o.value, 0.002).rms` is
    non-increasing across `close → medium → far`.
14–16. Three pinning cases so nobody changes the floors by accident: the close rms is `0.012`; the far
    rms is `0.003`; the far PEAK is `0.00875`. Add a comment on 16 saying TASK 3 depends on this number.
17. Source guard: `src/lib/lanes/online/components/OnlineMicSettings.tsx` imports from `'../index'` and
    from nothing deeper.
18. Source guard: that file does not contain `useOnlineLane`.
19. Source guard: `src/pages/Settings.tsx` contains `id="ms"` and `OnlineMicSettings`.
20. Source guard: `src/lib/lanes/online/index.ts` no longer reads `proyaku_online_mic_sense` directly —
    it must contain `loadMicSensitivity` and not the raw key string.

---

# TASK 3 — "Ngưỡng đủ to" becomes an operator knob that follows the mic

**Why.** There are TWO loudness thresholds, and until now only one of them followed the mic setting:

1. the "there is a voice here" floor inside the capture worklet — TASK 2 just made it follow the setting;
2. the "there was sound at all" threshold, `AUDIO_LOUD_LEVEL_THRESHOLD = 0.09` in `onlineLane.ts:40`,
   which followed nothing. Only a VU frame above it refreshes `lastLoudAt`; go `LONG_SILENCE_MS` (4s)
   without one and **every** final is thrown away as `long-silence` and every partial is blocked.

With a speakerphone the same sound is therefore counted as speech by (1) and as "no sound has happened"
by (2): heard, and thrown away. At the `far` step the peak the worklet already accepts as speech is about
**0.00875** — more than ten times below 0.09.

**The one thing that must not move:** at the **close** step the threshold must resolve to **exactly
0.09**, the number that has been running all along. The gala uses hand-held mics at the mouth, so that
path must not shift by a hair. Only medium / far / auto may relax, and only by the same ratio the worklet
already applied to the voice floor.

## 3.1 New file `src/lib/lanes/online/loudGate.ts`

```ts
// src/lib/lanes/online/loudGate.ts — "Ngưỡng đủ to", the valve in front of the anti-hallucination guard.
//
// The machine has TWO loudness thresholds, and before this file only ONE of them followed "Độ nhạy micro":
//   1. the "there is a voice here" floor, inside the capture worklet (`pcm16Capture.ts` →
//      `resolveVoiceFloor`) — it DOES follow the setting: the far step lowers it to a quarter of close;
//   2. the "loud enough to count as sound" threshold — `AUDIO_LOUD_LEVEL_THRESHOLD = 0.09`, hard-coded in
//      `onlineLane.ts`, following nothing. Only a VU frame above it refreshes `lastLoudAt`; four seconds
//      (`LONG_SILENCE_MS`) without one and EVERY final is dropped as `long-silence` and partials are
//      blocked outright.
// With a speakerphone in the middle of a table the same speech is counted as a voice by (1) and as "no
// sound has occurred" by (2) — heard, and thrown away. The peak the far step already accepts as speech is
// ≈ 0.00875, more than ten times below 0.09.
//
// This file loosens NOTHING else. `LONG_SILENCE_MS`, the voiced-ms window and the floors in
// `asrSpeechEvidence.ts` are untouched; it decides exactly one number: what counts as "loud enough".
//
// THE INVARIANT: at the **close** step the threshold must come out at EXACTLY 0.09, the number that has
// been running all along. The ceremony runs hand-held mics at the mouth, so that path may not move by a
// hair. Only medium / far / auto relax, and only by the ratio the worklet already applied to the floor.

import { resolveVoiceFloor } from './pcm16Capture';
import type { MicSensitivity } from './pcm16Capture';

/** The original threshold, in VU peak 0..1. This is the number that has always run, and the close anchor. */
export const LOUD_BASE_THRESHOLD = 0.09;

// Reference noise floor, so the threshold resolves to a fixed number. Exactly the worklet's own
// initialisation (`this.noiseRms = 0.002`, `pcm16Capture.ts:32`) — the learned floor lives INSIDE the
// audio thread and nothing outside can read it, so console and tests must agree on one reference.
export const LOUD_NOISE_REFERENCE_RMS = 0.002;

export type LoudGateMode = 'auto' | 'standard' | 'low' | 'verylow';

export const LOUD_GATE_KEY = 'proyaku_online_loud_gate';
export const LOUD_GATE_DEFAULT: LoudGateMode = 'auto';

// The two manual steps sit BELOW the bottom of the auto ladder — that is the whole reason they exist. The
// operator tries auto first; if sentences are still lost there has to be somewhere further down to go,
// not just a way to re-select what was already tried.
const LOUD_LOW = 0.02;
// 0.008 is below even the far step's "there is a voice" peak (0.00875): at this step the loud-enough
// threshold can no longer contradict the voice threshold. This is the last relief valve, for a mic placed
// genuinely far away.
const LOUD_VERY_LOW = 0.008;

/** Vietnamese label + one sentence each, for the technical desk. Ordered loosest-last. */
export const LOUD_GATE_OPTIONS: readonly { value: LoudGateMode; label: string; hint: string }[] = [
  { value: 'auto', label: 'Tự động — theo Độ nhạy micro', hint: 'Ngưỡng hạ đúng theo tỉ lệ mà Độ nhạy micro đã hạ. Mic sát miệng vẫn giữ nguyên 0,09 như trước nay; mic để xa thì tự nới. Chọn cái này trước.' },
  { value: 'standard', label: 'Chuẩn (0,09 — như trước nay)', hint: 'Ép về đúng con số cũ, bất kể Độ nhạy micro đang đặt gì. Dùng khi muốn quay lại hành vi cũ để so sánh.' },
  { value: 'low', label: 'Thấp', hint: 'Hạ xuống thấp hơn cả nấc Tự động. Dùng khi mic để xa mà vẫn thấy câu bị mất, phụ đề đứng im dù có người đang nói.' },
  { value: 'verylow', label: 'Rất thấp (mic để xa hẳn)', hint: 'Thấp hơn cả mức máy coi là "có tiếng nói", tức là gần như tắt hẳn chốt này. Đổi lại: một tiếng động to trong phòng cũng đủ để máy tin là vừa có người nói.' },
];

export function isLoudGateMode(v: unknown): v is LoudGateMode {
  return v === 'auto' || v === 'standard' || v === 'low' || v === 'verylow';
}

/**
 * The threshold actually in force, in VU peak 0..1.
 *
 * The auto step is `0.09 × (voice floor of this step ÷ voice floor of the close step)`. Because
 * `resolveVoiceFloor('close', …).rms` is the constant 0.012, the ratio at the close step is exactly 1 and
 * the result is exactly 0.09.
 */
export function resolveLoudThreshold(mode: LoudGateMode, sensitivity: MicSensitivity): number {
  if (mode === 'standard') return LOUD_BASE_THRESHOLD;
  if (mode === 'low') return LOUD_LOW;
  if (mode === 'verylow') return LOUD_VERY_LOW;
  const here = resolveVoiceFloor(sensitivity, LOUD_NOISE_REFERENCE_RMS).rms;
  const close = resolveVoiceFloor('close', LOUD_NOISE_REFERENCE_RMS).rms;
  const ratio = close > 0 ? here / close : 1;
  // Round to 4 places: this number is PRINTED for the operator to compare against the VU peak, so it has
  // to read as 0.0525 rather than 0.052499999999999998.
  return Math.round(LOUD_BASE_THRESHOLD * ratio * 10_000) / 10_000;
}

/** Read the stored choice. Absent / corrupt / storage blocked → auto. */
export function loadLoudGate(): LoudGateMode {
  try {
    const v = localStorage.getItem(LOUD_GATE_KEY);
    return isLoudGateMode(v) ? v : LOUD_GATE_DEFAULT;
  } catch {
    return LOUD_GATE_DEFAULT;
  }
}

/** Write the choice. An unknown value is ignored (returns false) — never write rubbish into the store. */
export function saveLoudGate(v: LoudGateMode): boolean {
  if (!isLoudGateMode(v)) return false;
  try {
    localStorage.setItem(LOUD_GATE_KEY, v);
    return true;
  } catch {
    return false; // private mode / quota — this session still runs, it just will not be remembered
  }
}

/** Label used to print the value currently in force. */
export function loudGateLabel(v: LoudGateMode): string {
  return LOUD_GATE_OPTIONS.find((o) => o.value === v)?.label ?? v;
}
```

The resulting ladder, which the tests below pin: **close 0.09 exactly** · medium 0.045 · far 0.0225 ·
auto-sensitivity 0.0525 · manual low 0.02 · manual verylow 0.008.

## 3.2 `onlineLane.ts` — read the knob live, and report the pair of numbers

**(a)** Replace:

```ts
import { startPcm16Capture, type CaptureHandle, type CapturePacket } from './pcm16Capture';
```

with

```ts
import { startPcm16Capture, type CaptureHandle, type CapturePacket, type MicSensitivity } from './pcm16Capture';
import { resolveLoudThreshold, type LoudGateMode } from './loudGate';
```

**(b)** Replace:

```ts
const AUDIO_LOUD_LEVEL_THRESHOLD = 0.09; // onLevel >= this counts as "sound present" (≈ peak 12/127)
```

with

```ts
// "Đủ to" — the level a VU frame must reach before it counts as "sound present". It used to be the hard
// 0.09 that lived on this line; the number itself has not moved (`LOUD_BASE_THRESHOLD` in `loudGate.ts`
// is still 0.09 and the close-mic step still resolves to exactly that), but it is now a knob rather than
// a constant: it follows "Độ nhạy micro" and the operator can override it live from the console. Why:
// the capture worklet's "there is a voice here" floor already followed the sensitivity while this one did
// not, so with a far microphone the same speech was voice AND silence at once, and every final was thrown
// away as `long-silence`.
const RECENT_LEVEL_PEAK_WINDOW_MS = 3_000; // how far back the diagnostics VU peak looks
```

**(c)** Replace:

```ts
  getNearMicGate?: () => boolean;
```

with

```ts
  getNearMicGate?: () => boolean;
  // "Độ nhạy micro" — which voice floor the capture worklet treats as speech. Read ONCE at Bắt đầu
  // (it is baked into the worklet's configure message), so the console disables it while running.
  getMicSensitivity?: () => MicSensitivity;
  // "Ngưỡng đủ to" — read LIVE on every VU frame, unlike the sensitivity above. It is a knob the operator
  // turns WHILE listening ("phụ đề đứng im dù có người đang nói → hạ một nấc"), so making them stop and
  // restart the session to try the next step would defeat the point. Nothing is baked into the worklet.
  getLoudGate?: () => LoudGateMode;
```

**(d)** Replace:

```ts
  sendBacklogBytes: number; // TASK 12.5 — the WS send buffer at the last audio frame
```

with

```ts
  sendBacklogBytes: number; // TASK 12.5 — the WS send buffer at the last audio frame
  // "Đủ to". These two are a PAIR and only mean anything together: `loudThreshold` is the level a VU
  // frame must reach to count as sound, `recentLevelPeak` is the loudest frame of the last 3 seconds.
  // Peak below threshold while somebody is speaking = every final of this stretch will be thrown away as
  // `long-silence`, and lowering the knob one step is the fix. Neither number is actionable alone.
  loudThreshold: number;
  recentLevelPeak: number;
```

**(e)** Replace:

```ts
  let lastLoudAt = 0; // onLevel exceeded the loud threshold
```

with

```ts
  let lastLoudAt = 0; // onLevel exceeded the loud threshold
  // The threshold ACTUALLY in force at the last VU frame, and the loudest VU frame of the last few
  // seconds. Both exist to be READ OUT in the console: without them, "lower it until it hears" is
  // guesswork in the dark — the operator has to be able to see that their voice peaks at, say, 0.03 while
  // the gate sits at 0.09. `loudThreshold` starts at the close-mic base so the value shown before the
  // first frame is the honest one.
  let loudThreshold = resolveLoudThreshold('auto', 'close');
  let recentLevels: { at: number; v: number }[] = [];
```

**(f)** Replace:

```ts
  function pruneDraftWindow(): number {
```

with

```ts
  // The loudest VU frame of the last few seconds — the number the operator compares against the threshold
  // when deciding whether to lower the knob. Pruned on read (same shape as pruneVoiced), so a session
  // sitting idle in the diagnostics panel decays to 0 instead of showing a peak from ten minutes ago.
  function pruneRecentLevels(): number {
    const cutoff = Date.now() - RECENT_LEVEL_PEAK_WINDOW_MS;
    while (recentLevels.length && recentLevels[0].at < cutoff) recentLevels.shift();
    let peak = 0;
    for (const e of recentLevels) if (e.v > peak) peak = e.v;
    return peak;
  }

  function pruneDraftWindow(): number {
```

**(g)** Replace:

```ts
          if (v >= AUDIO_LOUD_LEVEL_THRESHOLD) lastLoudAt = Date.now();
```

with

```ts
          const now = Date.now();
          // Read the knob on EVERY frame: the operator turns it mid-session while watching the two
          // numbers this same callback feeds into the diagnostics (threshold in force vs VU peak).
          loudThreshold = resolveLoudThreshold(
            config.getLoudGate?.() ?? 'auto',
            config.getMicSensitivity?.() ?? 'auto',
          );
          recentLevels.push({ at: now, v });
          if (v >= loudThreshold) lastLoudAt = now;
```

**(h)** Replace:

```ts
        { nearMicGate: config.getNearMicGate?.() ?? true },
```

with

```ts
        { nearMicGate: config.getNearMicGate?.() ?? true, micSensitivity: config.getMicSensitivity?.() ?? 'auto' },
```

**(i)** Replace (this is the session-reset block; the two neighbouring lines make the anchor unique):

```ts
    voicedWindow.length = 0;
    previousFinalTranscript = '';
```

with

```ts
    voicedWindow.length = 0;
    recentLevels = []; // a new session never shows the previous room's VU peak
    previousFinalTranscript = '';
```

**(j)** Replace (inside the diagnostics object):

```ts
      sendBacklogBytes,
```

with

```ts
      sendBacklogBytes,
      loudThreshold,
      recentLevelPeak: pruneRecentLevels(),
```

## 3.3 `index.ts` (facade) — expose both settings

**(a)** Replace:

```ts
export type { OnlineDiagnostics, TtsGateMode } from './onlineLane'
```

with

```ts
export type { OnlineDiagnostics, TtsGateMode } from './onlineLane'
export type { MicSensitivity } from './pcm16Capture'
// "Độ nhạy micro" per machine / per hall — the Settings page writes it, this hook reads it. Same module
// on both sides so they cannot drift apart.
export {
  MIC_SENSITIVITY_KEY, MIC_SENSITIVITY_DEFAULT, MIC_SENSITIVITY_OPTIONS,
  isMicSensitivity, loadMicSensitivity, saveMicSensitivity, micSensitivityLabel,
} from './micSensitivity'
// "Ngưỡng đủ to" — the valve in front of the anti-hallucination guard. The console turns it hot,
// mid-session; the close-mic step still resolves to exactly 0.09 as it always has.
export type { LoudGateMode } from './loudGate'
export {
  LOUD_GATE_KEY, LOUD_GATE_DEFAULT, LOUD_GATE_OPTIONS, LOUD_BASE_THRESHOLD, LOUD_NOISE_REFERENCE_RMS,
  isLoudGateMode, loadLoudGate, saveLoudGate, loudGateLabel, resolveLoudThreshold,
} from './loudGate'
```

**(b)** Add the two imports. Replace:

```ts
import { setTtsSinkId, setTtsWarningHandler, setTtsVoice, setTtsManualSpeed } from './ttsPlayback'
```

with

```ts
import { setTtsSinkId, setTtsWarningHandler, setTtsVoice, setTtsManualSpeed } from './ttsPlayback'
import type { MicSensitivity } from './pcm16Capture'
import { loadMicSensitivity, saveMicSensitivity } from './micSensitivity'
import { loadLoudGate, saveLoudGate, type LoudGateMode } from './loudGate'
```

**(c)** Replace:

```ts
  nearMicGate: boolean
  setNearMicGate: (v: boolean) => void
```

with

```ts
  nearMicGate: boolean
  setNearMicGate: (v: boolean) => void
  micSensitivity: MicSensitivity
  setMicSensitivity: (v: MicSensitivity) => void
  // "Ngưỡng đủ to". Unlike the sensitivity above this one is NOT latched at Bắt đầu — the lane re-reads
  // it on every VU frame, so the console leaves it enabled while running.
  loudGate: LoudGateMode
  setLoudGate: (v: LoudGateMode) => void
```

**(d)** Replace:

```ts
  const [nearMicGate, setNearMicGate] = useState(true)
```

with

```ts
  const [nearMicGate, setNearMicGate] = useState(true)
  // "Độ nhạy micro" — persisted: the hall's mic does not change between rehearsal and the ceremony, so
  // the technician sets it ONCE in Cài đặt (`OnlineMicSettings`). Read through the shared module so the
  // two screens can never drift apart. Unknown/absent value → 'auto' (adapts to whatever mic is used).
  const [micSensitivity, setMicSensitivityState] = useState<MicSensitivity>(() => loadMicSensitivity())
  // "Ngưỡng đủ to" — persisted per machine like the sensitivity, because it answers the same question
  // (how far is this microphone from the mouth). Read live by the lane, so it can be turned mid-session.
  const [loudGate, setLoudGateState] = useState<LoudGateMode>(() => loadLoudGate())
```

**(e)** Replace:

```ts
  const nearMicGateRef = useRef(true)
```

with

```ts
  const micSensitivityRef = useRef<MicSensitivity>('auto')
  micSensitivityRef.current = micSensitivity
  const loudGateRef = useRef<LoudGateMode>('auto')
  loudGateRef.current = loudGate
  const nearMicGateRef = useRef(true)
```

**(f)** Replace:

```ts
        getNearMicGate: () => nearMicGateRef.current,
```

with

```ts
        getNearMicGate: () => nearMicGateRef.current,
        getMicSensitivity: () => micSensitivityRef.current,
        getLoudGate: () => loudGateRef.current,
```

**(g)** Add the two setters. Replace:

```ts
  const refreshVoices = useCallback(async () => {
```

with

```ts
  const setMicSensitivity = useCallback((v: MicSensitivity) => { setMicSensitivityState(v); saveMicSensitivity(v) }, [])
  const setLoudGate = useCallback((v: LoudGateMode) => { setLoudGateState(v); saveLoudGate(v) }, [])

  const refreshVoices = useCallback(async () => {
```

**(h)** Replace:

```ts
    nearMicGate, setNearMicGate, speakEnabled, setSpeakEnabled, gateMode, setGateMode,
```

with

```ts
    nearMicGate, setNearMicGate, micSensitivity, setMicSensitivity, loudGate, setLoudGate, speakEnabled, setSpeakEnabled, gateMode, setGateMode,
```

**(i)** Replace:

```ts
export { default as OnlineKeysSettings } from './components/OnlineKeysSettings'
```

with

```ts
export { default as OnlineKeysSettings } from './components/OnlineKeysSettings'
//   OnlineMicSettings  — the Settings "Độ nhạy micro" section (per machine / per hall)
export { default as OnlineMicSettings } from './components/OnlineMicSettings'
```

## 3.4 `OnlineConsole.tsx` — the two selectors and the pair of numbers

**(a)** Extend the facade import on line 16 with `MIC_SENSITIVITY_OPTIONS, micSensitivityLabel,
LOUD_GATE_OPTIONS, resolveLoudThreshold` and the types `MicSensitivity`, `LoudGateMode`. (You are already
removing `ScriptMatcherEntry` from that line in TASK 1(c); make both changes at once.)

**(b)** The two new selectors go into the "Nguồn vào" section, straight after the existing near-mic gate
checkbox and before the hall-babble checkbox that TASK 4 deletes. The two blocks do not overlap, so either
order works. Replace:

```tsx
                <label className="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant cursor-pointer">
                  <input type="checkbox" checked={lane.nearMicGate} onChange={(e) => lane.setNearMicGate(e.target.checked)} disabled={lane.running} className="accent-secondary" />
                  Noise gate (near-mic)
                </label>
```

with

```tsx
                <label className="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant cursor-pointer">
                  <input type="checkbox" checked={lane.nearMicGate} onChange={(e) => lane.setNearMicGate(e.target.checked)} disabled={lane.running} className="accent-secondary" />
                  Noise gate (near-mic)
                </label>
                <div>
                  <label htmlFor="online-console-micsense" className="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant"
                    title="Ngưỡng để máy coi là 'có tiếng nói'. Mic để xa (Jabra, speakerphone) → Tự động hoặc Mic xa. Chốt khi Bắt đầu — đổi lúc đang chạy thì áp dụng từ lần bắt đầu sau.">
                    Độ nhạy micro
                    <select id="online-console-micsense" value={lane.micSensitivity} onChange={(e) => lane.setMicSensitivity(e.target.value as MicSensitivity)} disabled={lane.running} className={SELECT_CLS}>
                      {MIC_SENSITIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  {/* Same key as the Settings page: here it is a quick change for this meeting, there it is
                      the machine's default. */}
                  <p className="text-[11px] leading-relaxed text-on-surface-variant/80 mt-1">
                    Đang dùng: <strong>{micSensitivityLabel(lane.micSensitivity)}</strong> · mặc định của máy này đặt ở{' '}
                    <button type="button" onClick={() => nav('/settings#ms')} className="underline hover:text-primary">Cài đặt → Độ nhạy micro</button>.
                  </p>
                </div>
                {/* "Ngưỡng đủ to". NOT disabled while running, on purpose: this is the knob you turn WHILE
                    listening — lower it one step and read the two numbers in Chẩn đoán immediately.
                    Forcing a Dừng/Bắt đầu to try the next step would destroy the point of having it. */}
                <div>
                  <label htmlFor="online-console-loudgate" className="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant"
                    title="Âm lượng tối thiểu để máy tin là 'vừa có tiếng'. Quá 4 giây không lần nào chạm ngưỡng thì mọi câu nghe được đều bị vứt. Mic để xa thì hạ xuống. Đổi được ngay giữa buổi.">
                    Ngưỡng đủ to
                    <select id="online-console-loudgate" value={lane.loudGate} onChange={(e) => lane.setLoudGate(e.target.value as LoudGateMode)} className={SELECT_CLS}>
                      {LOUD_GATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  <p className="text-[11px] leading-relaxed text-on-surface-variant/80 mt-1">
                    Đang áp: <strong>{resolveLoudThreshold(lane.loudGate, lane.micSensitivity).toFixed(4)}</strong>
                    {' '}· đổi được ngay giữa buổi, không cần Bắt đầu lại. Nếu có người đang nói mà phụ đề
                    đứng im, so <em>ngưỡng</em> với <em>VU đỉnh</em> ở khối Chẩn đoán rồi hạ một nấc.
                  </p>
                </div>
```

**(c)** The diagnostics pair. Replace:

```tsx
                    <div>voiced {diag.voicedMsRecent}ms · ghosts {diag.droppedGhosts}</div>
```

with

```tsx
                    <div>voiced {diag.voicedMsRecent}ms · ghosts {diag.droppedGhosts}</div>
                    {/* These two MUST be read together. `ngưỡng đủ to` is the level a frame has to reach
                        before the machine believes sound just happened; `VU đỉnh 3s` is the loudest frame
                        of the last three seconds. Peak BELOW threshold while somebody is speaking = this
                        whole stretch will be discarded as long-silence → lower "Ngưỡng đủ to" one step.
                        The line turns red at exactly that moment, so nobody has to compare by eye. */}
                    <div className={diag.recentLevelPeak > 0 && diag.recentLevelPeak < diag.loudThreshold ? 'text-error' : undefined}>
                      ngưỡng đủ to {diag.loudThreshold.toFixed(4)} · VU đỉnh 3s {diag.recentLevelPeak.toFixed(4)}
                      {diag.recentLevelPeak > 0 && diag.recentLevelPeak < diag.loudThreshold ? ' · ĐỈNH DƯỚI NGƯỠNG — hạ một nấc' : ''}
                    </div>
```

## 3.5 Tests — new file `tests/loudGate.test.ts`, **21 cases**

1–4. Storage: default `'auto'` with nothing stored; round trip for all four values; rubbish → `'auto'`;
`saveLoudGate` rejects an unknown value and writes nothing.
5–6. A localStorage that throws on read / on write → default returned / `false` returned, no throw.
7. `LOUD_GATE_KEY === 'proyaku_online_loud_gate'` and `LOUD_BASE_THRESHOLD === 0.09`.
8. `LOUD_GATE_OPTIONS` has 4 entries in the order auto · standard · low · verylow, each with a hint.
9. `loudGateLabel` returns the list's label for each value.
10. **The invariant:** `resolveLoudThreshold('auto', 'close') === 0.09` exactly.
11. `resolveLoudThreshold('auto', 'medium') === 0.045`.
12. `resolveLoudThreshold('auto', 'far') === 0.0225`.
13. `resolveLoudThreshold('auto', 'auto') === 0.0525`.
14. Re-derive the formula independently: for each sensitivity, `resolveLoudThreshold('auto', s)` equals
    `round4(0.09 * resolveVoiceFloor(s, 0.002).rms / resolveVoiceFloor('close', 0.002).rms)`.
15. `resolveLoudThreshold('standard', s)` is `0.09` for every sensitivity.
16. `'low'` is `0.02` and `'verylow'` is `0.008` for every sensitivity.
17. Both manual steps sit strictly BELOW the lowest auto value (`0.0225`) — the reason they exist.
18. `'verylow'` (0.008) is strictly below the far step's voice peak (`resolveVoiceFloor('far', 0.002).peak`
    = 0.00875): at this step the two thresholds can no longer contradict each other.
19. Source guard: `onlineLane.ts` no longer contains `AUDIO_LOUD_LEVEL_THRESHOLD`, and does contain
    `resolveLoudThreshold(`.
20. Source guard: the lane reads the knob inside the level callback — the source contains
    `config.getLoudGate?.() ?? 'auto'`.
21. Source guard: the console's loud-gate select is NOT disabled while running. Match the single line
    `/^.*id="online-console-loudgate".*$/m` and assert it does NOT contain `disabled=`; match
    `/^.*id="online-console-micsense".*$/m` and assert it DOES contain `disabled={lane.running}`.
    (Use line-based matching, not a `[^>]*` regex — an arrow function inside the attribute list contains
    `>` and would truncate the match.)

---

# TASK 4 — Remove the "Bỏ qua tiếng xì xào hội trường" checkbox (client side only)

**Why.** That checkbox is not a weak option, it is a trap: switching it on makes the recogniser fail to
start at all, and the screen does not say so. We tested it against the real vendor on 02/08/2026 with our
own account — three WebSocket handshakes, a fresh token each time, disconnected immediately after the
first reply, **not one byte of audio sent**, no other service called. The parameters were built by calling
the server's own `buildScribeWsParams`, so this is exactly what the app sends.

**(A) — exactly what the app sends when the box is ON** (`filter_background_audio=true` **and**
`include_timestamps=true`):

```
WS OPEN (handshake accepted, HTTP 101)
{"message_type":"invalid_request","error":"filter_background_audio cannot be combined with include_timestamps. This will be supported in a future update."}
WS CLOSE code=1008 wasClean=true reason="invalid_request"
```

**(B) — the filter alone, timestamps dropped:**

```
WS OPEN (handshake accepted, HTTP 101)
{"message_type":"session_started","session_id":"…","config":{…,"include_timestamps":false,"include_language_detection":true,"filter_background_audio":true,"keyterms":[],"no_verbatim":false,"entity_detection":null}}
WS CLOSE code=1005 wasClean=true reason=""
```

**(C) — control, exactly what the app sends when the box is OFF:**

```
WS OPEN (handshake accepted, HTTP 101)
{"message_type":"session_started","session_id":"…","config":{…,"include_timestamps":true,"include_language_detection":true,"filter_background_audio":false,"keyterms":[],"no_verbatim":false,"entity_detection":null}}
```

Read it in three steps:

1. The filter itself exists and the vendor accepts it — (B) proves that. What the vendor forbids is
   **combining** it with timestamps. Their own words are *"This will be supported in a future update"*,
   and that sentence is about the combination, not about the feature.
2. **We cannot pay the price.** Dropping `include_timestamps` to buy the filter means dropping the
   language label: it is the SECOND, timestamped final that carries `language_code`. Lose it and the
   one-mic-two-directions mode loses its evidence — and so does TASK 12 below.
3. **The failure does not show itself.** `asrTransport.ts:43` lists `FATAL_TOKENS = ['auth_error',
   'quota_exceeded','unaccepted_terms']`. `invalid_request` is not in it, so `isFatal()` returns false,
   the lane does not tear down, the socket closes and `scheduleReconnect()` runs the full
   `RECONNECT_MAX_ATTEMPTS = 5` — each attempt minting a new token and being refused identically — before
   anything is reported. The operator sees an app that "is trying to connect", never "you switched on the
   wrong box".

**Smallest possible cut: the client only.** The server keeps its three-state rule and its
`SCRIBE_FILTER_BACKGROUND` env untouched, because the server already has an "absent" branch
(`typeof body?.roomFilter === 'boolean' ? … : undefined`) that falls back to the env, and the env defaults
to empty, so no parameter reaches the handshake. The day the vendor allows the combination, this is turned
back on with one environment variable — no code change, no client redeploy. **Do not touch `server/`.**

## 4.1 `asrTransport.ts` — the request body loses the field

Replace:

```ts
  corpus: string;
  roomFilter?: boolean;
}): Promise<AsrSession> {
  const res = await fetch(`${ONLINE_BASE}/realtime-preview-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // `roomFilter: undefined` drops out of JSON.stringify by itself — that is the "absent"
    // case the server falls back to its env for.
    body: JSON.stringify({
      targetLanguage: opts.targetLanguage,
      language: opts.language,
      corpus: opts.corpus,
      roomFilter: opts.roomFilter,
    }),
  });
```

with

```ts
  corpus: string;
}): Promise<AsrSession> {
  const res = await fetch(`${ONLINE_BASE}/realtime-preview-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // The hall-babble filter used to ride here as `roomFilter`. It is gone from the client: the vendor
    // refuses that filter whenever timestamps are on, and the timestamped final is what carries the
    // language label. Sending NOTHING is the safe default — the server reads an absent field as "fall
    // back to the env", and that env is off unless somebody deliberately turns it on.
    body: JSON.stringify({
      targetLanguage: opts.targetLanguage,
      language: opts.language,
      corpus: opts.corpus,
    }),
  });
```

## 4.2 `onlineLane.ts` — the getter and the ticket field

**(a)** Replace:

```ts
  // TASK 11.13: hall-babble rejection — read at TICKET time (baked into the single-use asrWsUrl).
  getRoomFilter?: () => boolean;
```

with

```ts
  // TASK 11.13's hall-babble getter used to sit here. Removed: the vendor rejects that filter whenever
  // timestamps are on, and the session then fails to start at all. Do not add it back without checking
  // docs/ONLINE-LANE-UI-API.md → "Removed from the UI: the hall-babble switch".
```

**(b)** Replace:

```ts
        roomFilter: config.getRoomFilter?.(),
```

with nothing — **delete that one line.** (Leave the `corpus:` line above it exactly as it is; TASK 5
rewrites that line for a different reason.)

## 4.3 `index.ts` (facade) — state, ref, setter, getter, return

**(a)** Replace:

```ts
  // two-way + audience wall + subtitles (TASK 6·7·8) + hall-babble switch (TASK 11.13)
  twoWay: boolean
  setTwoWay: (v: boolean) => void
  roomFilter: boolean
  setRoomFilter: (v: boolean) => void
```

with

```ts
  // two-way + audience wall + subtitles (TASK 6·7·8)
  // The hall-babble switch (`roomFilter` / `setRoomFilter`, TASK 11.13) that used to sit right here is
  // gone on purpose. The vendor refuses its background filter whenever timestamps are on, and the
  // timestamped final is the one that carries the language label — switching it on made the session fail
  // to start at all, silently. Evidence and the way back in: docs/ONLINE-LANE-UI-API.md.
  twoWay: boolean
  setTwoWay: (v: boolean) => void
```

**(b)** Replace:

```ts
  const [roomFilter, setRoomFilterState] = useState<boolean>(() => { try { return localStorage.getItem('proyaku_online_room_filter') === '1' } catch { return false } })
```

with nothing — **delete that line.** Nothing reads or writes `proyaku_online_room_filter` any more; a
value left in a technician's browser from before is simply never looked at again.

**(c)** Replace:

```ts
  const roomFilterRef = useRef(roomFilter); roomFilterRef.current = roomFilter
```

with nothing — **delete that line.**

**(d)** Replace:

```ts
  const setRoomFilter = useCallback((v: boolean) => { setRoomFilterState(v); try { localStorage.setItem('proyaku_online_room_filter', v ? '1' : '0') } catch { /* private mode */ } }, [])
```

with nothing — **delete that line.**

**(e)** Replace:

```ts
        getRoomFilter: () => roomFilterRef.current,
```

with nothing — **delete that line.**

**(f)** Replace:

```ts
    twoWay, setTwoWay, roomFilter, setRoomFilter, directedLines, subtitleFont, setSubtitleFont,
```

with

```ts
    twoWay, setTwoWay, directedLines, subtitleFont, setSubtitleFont,
```

## 4.4 `OnlineConsole.tsx` — the checkbox and both descriptions

**Delete** these eleven lines outright (nothing replaces them; the two selectors TASK 3 added sit just
above and take over that space):

```tsx
                <label className="flex items-start gap-2 font-label-caps text-label-caps text-on-surface-variant cursor-pointer">
                  <input type="checkbox" checked={lane.roomFilter} onChange={(e) => lane.setRoomFilter(e.target.checked)} disabled={lane.running} className="accent-secondary mt-0.5" />
                  <span>Bỏ qua tiếng xì xào hội trường<br />
                    <span className="font-normal normal-case text-[11px] leading-relaxed">
                      {lane.roomFilter
                        ? 'Máy nghe sẽ bỏ qua tiếng trò chuyện và tiếng ồn xung quanh, chỉ bám giọng chính. Bật khi trên màn hiện ra câu mà không ai phát biểu. Đây KHÔNG phải bộ lọc tiếng ồn: nó không tẩy nhạc ra khỏi giọng nói, chỉ bớt việc máy tưởng nhầm tiếng ồn là lời nói. '
                        : 'Máy nghe bắt mọi thứ lọt vào micro. Mic đi qua bàn trộn thì thu cả phòng — nếu thấy phụ đề hiện câu chẳng ai nói, bật ô này rồi thử lại. '}
                      Chốt khi Bắt đầu — đổi lúc đang chạy thì áp dụng từ lần bắt đầu sau.
                    </span>
                  </span>
                </label>
```

After the deletion, no **code identifier** `roomFilter` may remain anywhere under `src/` — no state field,
no setter, no ref, no config callback, no request field. The **two tombstone comments** this task writes,
in `asrTransport.ts` (§4.1) and `index.ts` (§4.3), are the only mentions of the word that are allowed to
survive, and they are meant to: they are what stops the next person switching it back on. The strings
`proyaku_online_room_filter` and `xì xào` disappear completely — neither tombstone uses them.

The tests below assert those specific identifiers one by one, not the bare word, which is exactly why they
still pass with the tombstones in place. Do not "clean up" the comments to make a whole-word grep come
back empty; that would delete the only record of why the switch went away.

## 4.5 `docs/ONLINE-LANE-UI-API.md` — write the reason down where the next person will look

Replace:

```md
`OnlineKeysSettings` renders six masked, write-only inputs (always empty; status per key from
`config-status`) and posts only the filled fields to `config-keys`. The client uses opaque **slugs**
(`asr_endpoint`, `asr_key`, `refine_key`, `tts_key`, `tts_voice_ja`, `tts_voice_vi`); the server maps
each slug to its env var. No vendor env name, model id, host, or value ever reaches the client.
```

with

```md
`OnlineKeysSettings` renders six masked, write-only inputs (always empty; status per key from
`config-status`) and posts only the filled fields to `config-keys`. The client uses opaque **slugs**
(`asr_endpoint`, `asr_key`, `refine_key`, `tts_key`, `tts_voice_ja`, `tts_voice_vi`); the server maps
each slug to its env var. No vendor env name, model id, host, or value ever reaches the client.

`OnlineMicSettings` renders the **Độ nhạy micro** section (four steps: auto / close / medium / far),
persisted per machine under one key through `micSensitivity.ts`. That module is the ONLY reader and
writer of the key, so the Settings page and the console hook cannot drift apart, and the Settings page
never has to call `useOnlineLane` (which would start diagnostics timers, the audience publisher and a
voice-catalog fetch on a page that only edits config).

## Removed from the UI: the hall-babble switch (`roomFilter`)

The console checkbox "hall babble" and its facade state (`roomFilter` / `setRoomFilter`, the localStorage
key `proyaku_online_room_filter`, the lane's `getRoomFilter`, and the field in the token request body)
were removed on 02/08/2026. **Do not add them back on the strength of the feature existing** — it does
exist; what does not exist is using it together with timestamps.

Measured against the live vendor that day, three handshakes, no audio sent, parameters built by
`buildScribeWsParams` itself:

- `filter_background_audio=true` **+** `include_timestamps=true` (exactly what the app sent with the box
  ticked) → `{"message_type":"invalid_request","error":"filter_background_audio cannot be combined with
  include_timestamps. This will be supported in a future update."}`, then close code **1008**, before any
  `session_started`. The session never begins; not one utterance is transcribed.
- `filter_background_audio=true` alone → `session_started` normally, config echo
  `"filter_background_audio":true,"include_timestamps":false`.
- `include_timestamps=true` alone (the box unticked) → `session_started` normally.

Timestamps are not negotiable: the SECOND, timestamped final is the message that carries `language_code`,
and the whole one-mic-two-directions mechanism stands on it.

It also failed **invisibly**: `invalid_request` is not in `asrTransport.ts`'s `FATAL_TOKENS`, so the lane
did not tear down — it burnt all five `RECONNECT_MAX_ATTEMPTS`, minting a fresh token each round, and only
then reported a generic "connection lost".

**The way back in, when the vendor lifts the restriction:** the server is untouched. `buildScribeWsParams`
still implements the three-state rule (`true` → set it; `false` → send nothing and beat the env; absent →
`SCRIBE_FILTER_BACKGROUND`) and the token endpoint still accepts a boolean `roomFilter` in the request
body. The client simply always takes the "absent" branch now, so switching it back on is one environment
variable — no code change, no client redeploy.
```

## 4.6 Tests — new file `tests/roomFilterRemoved.test.ts`, **10 cases**

Copy the three vendor replies above into a comment block at the top of the file, so the evidence travels
with the test. `const read = (p: string) => readFileSync(new URL(\`../${p}\`, import.meta.url), 'utf8')`,
and `const { buildScribeWsParams } = await import('../server/online-api.mjs')`.

**`describe('client — no trace of the hall-babble switch left')`**

1. The facade has no `roomFilter: boolean` state line (`/^\s*roomFilter: boolean$/m`), no
   `setRoomFilterState`, no `roomFilterRef`, and no `proyaku_online_room_filter`.
2. The console has no `lane.roomFilter`, no `setRoomFilter`, and neither of the two Vietnamese
   description strings (assert on `'xì xào'` and on `'Máy nghe bắt mọi thứ lọt vào micro'`).
3. The lane has no `getRoomFilter?:` and no `roomFilter: config.getRoomFilter`.
4. The request body is exactly three fields — match
   `/body: JSON\.stringify\(\{\s*targetLanguage: opts\.targetLanguage,\s*language: opts\.language,\s*corpus: opts\.corpus,\s*\}\)/`
   on `asrTransport.ts`, and assert `roomFilter?: boolean` and `roomFilter: opts.roomFilter` are gone.
5. The reason is written down where the next person will look: `docs/ONLINE-LANE-UI-API.md` contains
   `'filter_background_audio cannot be combined with'` and `'Removed from the UI: the hall-babble switch'`.

**`describe('server — kept intact as the way back in')`**

6. Client silence ⇒ the server falls back to its env, which is empty ⇒ the handshake carries no filter
   parameter: `buildScribeWsParams({ ...base, roomFilter: undefined })` gives
   `params.get('filter_background_audio') === null` and `filterApplied === false`.
7. All three states still work: `roomFilter: true` sets `'true'`; `roomFilter: false` sets nothing;
   `server/online-api.mjs` still contains `SCRIBE_FILTER_BACKGROUND`.
8. `include_timestamps` is the thing we did NOT give up — it and `include_language_detection` are both
   `'true'` on the absent path.
9. The combination the vendor refuses can still be built from this function — that is precisely the trap
   that was removed from the UI: with `roomFilter: true`, `filter_background_audio` is `'true'` **and**
   `include_timestamps` is `'true'`.

**`describe('why this never surfaced at run time')`**

10. Read `asrTransport.ts`, match `/const FATAL_TOKENS = \[([^\]]*)\]/`, assert the capture does not
    contain `invalid_request`; then read `onlineLane.ts` and assert it contains `'if (decoded.fatal) {'`,
    `'scheduleReconnect();'` and `'const RECONNECT_MAX_ATTEMPTS = 5;'` — i.e. a non-fatal decode burns the
    whole reconnect ladder before anything is reported.

**Do not modify `tests/serverAsr.test.ts` for this task.** Its three-state `buildScribeWsParams` cases
still pass unchanged, because the server did not move.

---

# TASK 5 — The misheard-substitution layer (`~`), editable mid-session

**Why.** Keyterms bias the recogniser **before** it decides; nothing in this pipeline corrects what it has
already decided. On 01/08 the glossary was loaded and the company's own name still came back three ways —
`suhai`, `S-Hi Group`, `SI` — and each mistake was translated and read aloud in the company's own
ceremony. This task adds the missing layer: a list of surfaces the recogniser is known to produce and the
one form each of them means, applied to the transcript the instant it arrives, before any guard, before
the draft, before refine, before the audience wall and before the saved transcript. It is also the one
box that stays **unlocked while the session is running** — hearing a name come out wrong and having to
stop the ceremony to fix it is not an option on the day.

Two smaller decisions ride with it, and both matter more than they look:

- The misheard surfaces **must never become ASR keyterms.** Priming the recogniser with `suhai` teaches it
  to produce exactly the surface we are trying to get rid of. Only the correct side is ever primed.
- A single helper, `buildAsrCorpus()`, becomes the one place that answers "what does the recogniser get
  primed with". TASK 6 adds its third source to that same helper.

## 5.1 New file `src/lib/lanes/online/mishearing.ts`

```ts
// src/lib/lanes/online/mishearing.ts — the misheard-substitution layer.
//
// Keyterms bias the recogniser BEFORE it decides; they cannot correct what it has already decided. On
// 01/08/2026 the company's own name came back as "suhai", "S-Hi Group" and "SI" with the glossary loaded,
// and every one of those mistakes was translated and spoken aloud. This module is the layer that fixes a
// decision after the fact: a list of surfaces the recogniser is known to produce, and the one form each
// of them means.
//
// Grammar — one rule per line:
//
//     nghe nhầm 1, nghe nhầm 2 ~ Dạng đúng
//
// The line is split at the FIRST mark. Three marks are accepted, because a Japanese IME produces a
// different character from a US keyboard and the operator must not have to know which one they typed:
// `~` (U+007E), `〜` (U+301C) and `～` (U+FF5E). The left side is split on `,` `、` `/` `|`. A line that
// starts with `#` is a comment. A line with no mark is an ordinary term and is left completely alone —
// which is what lets the same parser run over the Thuật ngữ box as well.
//
// Pure functions only: no React, no storage, no timers. `applyMishearings` runs on every partial, so it
// stays allocation-cheap and never uses a regular expression built from operator input.

export interface MishearingRule {
  /** surfaces the recogniser actually produces */
  heard: string[];
  /** the one correct form all of them mean */
  correct: string;
}

export const MISHEARING_MAX_RULES = 40;
export const MISHEARING_MAX_HEARD_PER_RULE = 8;
export const MISHEARING_MAX_CHARS = 2000;

const MARKS = ['~', '〜', '～'];
const HEARD_SEPARATORS = /[,、/|]/;

// ASCII + Latin-1 Supplement/Extended-A + Latin Extended Additional: enough to cover Vietnamese with
// every diacritic. Used only to decide whether a match sits inside a longer word.
const LATIN = /[0-9A-Za-zÀ-ɏḀ-ỿ]/;

function firstMarkIndex(line: string): number {
  let at = -1;
  for (const mark of MARKS) {
    const found = line.indexOf(mark);
    if (found >= 0 && (at < 0 || found < at)) at = found;
  }
  return at;
}

/**
 * Split a corpus into the ordinary terms and the mishearing rules it contains.
 *
 * `terms` comes back as text, with the rule lines removed and every other line — comments, blanks,
 * spacing — exactly as the operator typed it. That is what makes it safe to run this over the Thuật ngữ
 * box: an operator who types a `~` line there by habit gets the rule honoured AND keeps the misheard
 * surface out of the keyterm list, instead of silently priming the recogniser toward the mistake.
 *
 * `invalid` holds the lines that look like a rule but cannot be used (one side empty, or both sides the
 * same). They are reported on screen rather than dropped in silence.
 */
export function splitMishearingLines(raw: string): { terms: string; rules: MishearingRule[]; invalid: string[] } {
  const terms: string[] = [];
  const rules: MishearingRule[] = [];
  const invalid: string[] = [];
  const byCorrect = new Map<string, MishearingRule>();

  for (const line of String(raw ?? '').slice(0, MISHEARING_MAX_CHARS).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) { terms.push(line); continue; }

    const cut = firstMarkIndex(trimmed);
    if (cut < 0) { terms.push(line); continue; }

    const correct = trimmed.slice(cut + 1).trim();
    const heard = trimmed.slice(0, cut)
      .split(HEARD_SEPARATORS)
      .map((part) => part.trim())
      .filter(Boolean)
      // "Esuhai ~ Esuhai" is a no-op, not a rule; it would also make the replacement loop pointless work.
      .filter((part) => part.toLowerCase() !== correct.toLowerCase())
      .slice(0, MISHEARING_MAX_HEARD_PER_RULE);

    if (!correct || !heard.length) { invalid.push(trimmed); continue; }

    // Two lines aiming at the same correct form are one rule with more surfaces, not two rules.
    const existing = byCorrect.get(correct.toLowerCase());
    if (existing) {
      for (const surface of heard) {
        if (existing.heard.length >= MISHEARING_MAX_HEARD_PER_RULE) break;
        if (!existing.heard.some((known) => known.toLowerCase() === surface.toLowerCase())) existing.heard.push(surface);
      }
      continue;
    }
    if (rules.length >= MISHEARING_MAX_RULES) { invalid.push(trimmed); continue; }

    const rule: MishearingRule = { heard: [...new Set(heard)], correct };
    rules.push(rule);
    byCorrect.set(correct.toLowerCase(), rule);
  }

  return { terms: terms.join('\n'), rules, invalid };
}

/** The rules only. Same parser — there is deliberately no second implementation to drift. */
export function parseMishearingRules(raw: string): MishearingRule[] {
  return splitMishearingLines(raw).rules;
}

/** Canonical one-line-per-rule text. This is the shape that travels to the server. */
export function formatMishearingRules(rules: readonly MishearingRule[]): string {
  return rules.map((rule) => `${rule.heard.join(', ')} ~ ${rule.correct}`).join('\n');
}

/**
 * Replace every known misheard surface in `text` with its correct form.
 *
 * Scanned left to right, longest surface first, and the replacement is never re-scanned — so a rule whose
 * correct form contains one of its own misheard surfaces cannot loop. Matching is case-insensitive. A
 * surface that starts or ends with a Latin letter must not match inside a longer Latin word, or the rule
 * `SI ~ Esuhai` would rewrite the middle of "SIM" and of "SINH"; Japanese has no such boundary and needs
 * none, since a kana/kanji run is matched whole.
 */
export function applyMishearings(text: string, rules: readonly MishearingRule[]): { text: string; hits: number } {
  if (!text || !rules.length) return { text, hits: 0 };

  const surfaces: { heard: string; lower: string; correct: string }[] = [];
  for (const rule of rules) {
    for (const heard of rule.heard) {
      if (heard) surfaces.push({ heard, lower: heard.toLowerCase(), correct: rule.correct });
    }
  }
  if (!surfaces.length) return { text, hits: 0 };
  surfaces.sort((a, b) => b.lower.length - a.lower.length);

  const lower = text.toLowerCase();
  let out = '';
  let hits = 0;
  let i = 0;

  scan: while (i < text.length) {
    for (const surface of surfaces) {
      if (!lower.startsWith(surface.lower, i)) continue;
      if (LATIN.test(surface.lower[0]) && i > 0 && LATIN.test(text[i - 1])) continue;
      const end = i + surface.lower.length;
      if (LATIN.test(surface.lower[surface.lower.length - 1]) && end < text.length && LATIN.test(text[end])) continue;
      out += surface.correct;
      hits += 1;
      i = end;
      continue scan;
    }
    out += text[i];
    i += 1;
  }

  return { text: out, hits };
}
```

## 5.2 `onlineLane.ts` — correct on arrival, and build the ASR corpus in one place

**(a)** Replace:

```ts
import { createScriptMatcher, type ScriptMatch, type ScriptMatcher, type ScriptMatcherEntry } from './scriptMatcher';
```

with

```ts
import { createScriptMatcher, type ScriptMatch, type ScriptMatcher, type ScriptMatcherEntry } from './scriptMatcher';
import { applyMishearings, formatMishearingRules, splitMishearingLines, MISHEARING_MAX_CHARS, type MishearingRule } from './mishearing';
```

(The first line is re-emitted unchanged on purpose — TASK 6 edits it again, and its own quoted text still
matches after this task has run.)

**(b)** Replace:

```ts
  getScript?: () => readonly ScriptMatcherEntry[] | undefined;
}
```

with

```ts
  getScript?: () => readonly ScriptMatcherEntry[] | undefined;
  // TASK 5: the misheard-substitution layer, read LIVE on every event — deliberately NOT latched at
  // start() the way the script above is. This is the one thing the operator has to be able to fix while
  // the ceremony is running: hearing the machine say the company's name wrong and having to stop the
  // session to correct it is not an option on the day.
  getMishearing?: () => string;
}
```

**(c)** Replace:

```ts
  let scriptMatcher: ScriptMatcher | null = null;
  let scriptRows = 0; // approved rows this session; the matcher's own `size` counts candidates, not lines
```

with

```ts
  // TASK 5 — the misheard-substitution layer. Two sources feed it: the "Sửa nghe nhầm" box, read live
  // through the getter, and any `~` line the operator typed into Thuật ngữ out of habit. Re-parsed only
  // when the text actually changed, because this is called on every partial.
  let mishearingSeen: string | null = null; // null, never a string — so the first call always parses
  let mishearingRules: MishearingRule[] = [];
  function activeMishearings(): MishearingRule[] {
    const raw = `${config.getMishearing?.() ?? ''}\n${opts?.terms ?? ''}`.slice(0, MISHEARING_MAX_CHARS * 2);
    if (raw !== mishearingSeen) {
      mishearingSeen = raw;
      mishearingRules = splitMishearingLines(raw).rules;
    }
    return mishearingRules;
  }

  // TASK 5 + TASK 6 — the single answer to "what is the recogniser primed with", rebuilt at every dial so
  // a rule added mid-session reaches it at the next reconnect. Three sources, in this order:
  //   1. Thuật ngữ with every `~` line removed;
  //   2. the CORRECT side of every mishearing rule, and never the misheard side — priming the recogniser
  //      with "suhai" would train it toward the exact surface we are trying to get rid of;
  //   3. proper nouns lifted from the approved script (TASK 6 fills this; empty until then).
  let scriptKeytermCorpus = '';
  function buildAsrCorpus(): string {
    const plain = splitMishearingLines(opts?.terms ?? '').terms;
    const corrected = activeMishearings().map((rule) => rule.correct).join('\n');
    return [plain, corrected, scriptKeytermCorpus].filter(Boolean).join('\n').slice(0, CORPUS_MAX_CHARS);
  }

  let scriptMatcher: ScriptMatcher | null = null;
  let scriptRows = 0; // approved rows this session; the matcher's own `size` counts candidates, not lines
```

**(d)** Replace:

```ts
  function handlePartial(msg: Record<string, unknown>): void {
    const text = typeof msg.text === 'string' ? msg.text : '';
    const stash = typeof msg.stash === 'string' ? msg.stash : '';
```

with

```ts
  function handlePartial(msg: Record<string, unknown>): void {
    // TASK 5: correct on arrival. The operator's Nguồn column, the draft translation and the audience
    // wall all read from here, so the fix has to land before any of them sees the words.
    const rules = activeMishearings();
    const text = applyMishearings(typeof msg.text === 'string' ? msg.text : '', rules).text;
    const stash = applyMishearings(typeof msg.stash === 'string' ? msg.stash : '', rules).text;
```

**(e)** Replace:

```ts
    resetScribeCommitState(true);
    const transcript = (typeof msg.transcript === 'string' ? msg.transcript : '').trim();
    if (!transcript) return;
```

with

```ts
    resetScribeCommitState(true);
    // TASK 5: correct BEFORE every guard below. The repeat guard, the script matcher, the refine call,
    // the audience wall and the saved transcript must all see the same corrected string — otherwise the
    // name is fixed on screen and still wrong in the recording.
    const transcript = applyMishearings((typeof msg.transcript === 'string' ? msg.transcript : '').trim(), activeMishearings()).text;
    if (!transcript) return;
```

**(f)** Replace:

```ts
      sessionBrief: o.brief,
      sessionTerms: o.terms,
```

with

```ts
      sessionBrief: o.brief,
      // TASK 5: `~` lines never travel as terms — a misheard surface sitting in the term list reads to
      // the model as vocabulary the speaker is expected to use, which is the opposite of what it is. They
      // travel as their own field, where they become a correction instruction. `head` has already been
      // corrected by the plain replace above; this is the model's backstop for the inflected or partial
      // surfaces a string replace cannot catch.
      sessionTerms: splitMishearingLines(o.terms ?? '').terms,
      sessionMishearings: formatMishearingRules(activeMishearings()),
```

**(g)** Replace:

```ts
        corpus: (opts!.terms ?? '').slice(0, CORPUS_MAX_CHARS),
```

with

```ts
        corpus: buildAsrCorpus(),
```

**(h)** Replace:

```ts
    const proxyTerms = codec ? null : (opts?.terms ?? '').slice(0, CORPUS_MAX_CHARS);
```

with

```ts
    const proxyTerms = codec ? null : buildAsrCorpus();
```

## 5.3 `index.ts` (facade) — one more box, persisted, live

**(a)** Replace:

```ts
export type { ScriptMatcherEntry } from './scriptMatcher'
```

with

```ts
export type { ScriptMatcherEntry } from './scriptMatcher'
// TASK 5: the console renders the "Sửa nghe nhầm" box and needs the parser to tell the operator which
// lines are not usable yet. It is re-exported here rather than imported from './mishearing' directly, so
// components keep going through the facade root — the same way SUBTITLE_FONT does.
export { applyMishearings, formatMishearingRules, parseMishearingRules, splitMishearingLines, MISHEARING_MAX_CHARS } from './mishearing'
export type { MishearingRule } from './mishearing'
```

**(b)** Replace:

```ts
  terms: string
  setTerms: (v: string) => void
  brief: string
  setBrief: (v: string) => void
```

with

```ts
  terms: string
  setTerms: (v: string) => void
  // TASK 5: its own field, NOT part of `terms`. Two reasons, both load-bearing: it is the only box the
  // operator may edit while the session is running, and its contents must never become ASR keyterms.
  mishearing: string
  setMishearing: (v: string) => void
  brief: string
  setBrief: (v: string) => void
```

**(c)** Replace:

```ts
  const [terms, setTerms] = useState('')
  const [brief, setBrief] = useState('')
```

with

```ts
  const [terms, setTerms] = useState('')
  // TASK 5: persisted, unlike terms and brief. Mishearing rules are learned during a rehearsal and are
  // needed again at the event itself, usually on the same laptop the following day.
  const [mishearing, setMishearingState] = useState<string>(() => { try { return localStorage.getItem('proyaku_online_mishearing') ?? '' } catch { return '' } })
  const [brief, setBrief] = useState('')
```

**(d)** Replace:

```ts
  const termsRef = useRef('')
  termsRef.current = terms
  const briefRef = useRef('')
  briefRef.current = brief
```

with

```ts
  const termsRef = useRef('')
  termsRef.current = terms
  const mishearingRef = useRef('')
  mishearingRef.current = mishearing
  const setMishearing = useCallback((v: string) => { setMishearingState(v); try { localStorage.setItem('proyaku_online_mishearing', v) } catch { /* private mode */ } }, [])
  const briefRef = useRef('')
  briefRef.current = brief
```

**(e)** Replace:

```ts
        getListenPaused: () => listenPausedRef.current,
        getTwoWay: () => twoWayRef.current,
```

with

```ts
        getListenPaused: () => listenPausedRef.current,
        getTwoWay: () => twoWayRef.current,
        // TASK 5: LIVE, not latched. The lane calls this on every event, so a rule typed in the middle of
        // a ceremony takes effect on the very next sentence.
        getMishearing: () => mishearingRef.current,
```

**(f)** Replace:

```ts
    direction, setDirection, terms, setTerms, brief, setBrief, script, setScript,
```

with

```ts
    direction, setDirection, terms, setTerms, mishearing, setMishearing, brief, setBrief, script, setScript,
```

## 5.4 `OnlineConsole.tsx` — the box, in the Thuật ngữ drawer, unlocked while running

**(a)** Add `useMemo` to the React import on line 14, so it reads
`import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'`.

**(b)** Extend the facade import on line 16 with `splitMishearingLines` — the function only, no type.
(You are already editing that line in TASK 1(c) and TASK 3(a); make all three changes at once.)

**(c)** Replace:

```tsx
  const prepCounts = (
```

with

```tsx
  // TASK 5: parsed once per keystroke, so the box can name the lines that are not usable yet instead of
  // dropping them in silence — silence is exactly how the 01/08 rehearsal lost its script.
  const mishearingInfo = useMemo(() => splitMishearingLines(lane.mishearing), [lane.mishearing])

  const prepCounts = (
```

**(d)** Replace:

```tsx
                <textarea value={lane.terms} onChange={(e) => lane.setTerms(e.target.value)} rows={6} maxLength={2000} disabled={lane.running}
                  className={TEXTAREA_CLS} placeholder="Tên riêng, thuật ngữ — mỗi mục một dòng…" />
                <div className="text-right text-[11px] text-on-surface-variant tabular-nums">{lane.terms.length}/2000</div>
                {prepCounts}
```

with

```tsx
                <textarea value={lane.terms} onChange={(e) => lane.setTerms(e.target.value)} rows={6} maxLength={2000} disabled={lane.running}
                  className={TEXTAREA_CLS} placeholder="Tên riêng, thuật ngữ — mỗi mục một dòng…" />
                <div className="text-right text-[11px] text-on-surface-variant tabular-nums">{lane.terms.length}/2000</div>
                {prepCounts}
                {/* TASK 5. This textarea has NO `disabled={lane.running}`, and that is the whole point of
                    it: every other box on this drawer is locked once the ceremony starts, but a name
                    coming out wrong has to be fixable without stopping. */}
                <div className="rounded-xl border border-outline-variant p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-label-caps text-label-caps text-on-surface">Sửa nghe nhầm</h4>
                    <span className="text-[11px] text-on-surface-variant tabular-nums">{mishearingInfo.rules.length} luật</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Mỗi dòng một luật: <span className="font-mono">nghe nhầm 1, nghe nhầm 2 ~ dạng đúng</span>. Máy thay
                    ngay khi vừa nghe được, <strong>trước khi dịch</strong>. Ô này sửa được cả lúc đang chạy — câu tiếp
                    theo đã đúng.
                  </p>
                  <textarea value={lane.mishearing} onChange={(e) => lane.setMishearing(e.target.value)} rows={4} maxLength={2000}
                    className={TEXTAREA_CLS} placeholder="suhai, S-Hi Group, SI ~ Esuhai" />
                  {mishearingInfo.invalid.length > 0 && (
                    <p className="text-[11px] text-error leading-relaxed">
                      {mishearingInfo.invalid.length} dòng chưa dùng được — thiếu một bên của dấu ~: {mishearingInfo.invalid.slice(0, 3).join(' · ')}
                    </p>
                  )}
                </div>
```

## 5.5 `server/online-api.mjs` — the model's backstop

The client replace catches the surfaces exactly as listed. The model has to catch what a string replace
cannot: the same name inside an inflection, or half of it at a cut edge. So the rules travel to the refine
call as their own field and become an instruction — never as terms, where a misheard surface would read as
vocabulary the speaker is expected to use.

**(a)** Replace:

```js
    if (!source) continue;
    terms.push({ source, target });
    if (terms.length >= SESSION_TERMS_MAX) break;
  }
  return terms;
}
```

with

```js
    if (!source) continue;
    terms.push({ source, target });
    if (terms.length >= SESSION_TERMS_MAX) break;
  }
  return terms;
}

// TASK 5 — the misheard-substitution layer, server side. The client has already replaced these surfaces
// in the transcript before sending it; this list is the model's backstop for the inflected or partial
// forms a plain string replace cannot catch. Same grammar as the client's `mishearing.ts`, one rule per
// line, split at the FIRST mark, three marks accepted (`~` U+007E, `〜` U+301C, `～` U+FF5E).
const MISHEARING_MAX_RULES = 40;
const MISHEARING_MAX_HEARD_PER_RULE = 8;
export function parseMishearingRules(raw) {
  const rules = [];
  for (const line of String(raw ?? '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    let cut = -1;
    for (const mark of ['~', '〜', '～']) {
      const at = trimmed.indexOf(mark);
      if (at >= 0 && (cut < 0 || at < cut)) cut = at;
    }
    if (cut < 0) continue;
    const correct = limitText(trimmed.slice(cut + 1), 160);
    if (!correct) continue;
    const heard = trimmed.slice(0, cut)
      .split(/[,、/|]/)
      .map((part) => limitText(part, 120))
      .filter(Boolean)
      .filter((part) => part.toLowerCase() !== correct.toLowerCase())
      .slice(0, MISHEARING_MAX_HEARD_PER_RULE);
    if (!heard.length) continue;
    rules.push({ heard, correct });
    if (rules.length >= MISHEARING_MAX_RULES) break;
  }
  return rules;
}
```

**(b)** Replace:

```js
export function buildRefinePrompt({ sourceText, previewText, sourceLanguage, targetLanguage, sourceEmotion, sourcePace, recentFinals, sessionBrief, sessionTerms, sourceIsFragment, previousFragment }) {
```

with

```js
// `sessionMishearings` is defaulted on purpose: an older client that never sends the field, and the
// existing tests that call this function without it, must keep working unchanged.
export function buildRefinePrompt({ sourceText, previewText, sourceLanguage, targetLanguage, sourceEmotion, sourcePace, recentFinals, sessionBrief, sessionTerms, sourceIsFragment, previousFragment, sessionMishearings = [] }) {
```

**(c)** Replace:

```js
      '- A person listed in session terms is allowed vocabulary, NOT proof that the speaker said that name. Never insert or replace a person name unless the CURRENT source transcript contains a plausible matching name surface. Recent subtitles and session context alone are never evidence for a person name.',
```

with

```js
      '- A person listed in session terms is allowed vocabulary, NOT proof that the speaker said that name. Never insert or replace a person name unless the CURRENT source transcript contains a plausible matching name surface. Recent subtitles and session context alone are never evidence for a person name.',
      '- When a known-mishearing block is provided below, it lists surfaces the recogniser is known to produce for a name it gets wrong, together with the one correct form. If any of those surfaces, or a clearly inflected variant of one, appears in the source transcript, treat it as the correct form and translate accordingly — this is a correction, not a suggestion. It applies ONLY to the listed surfaces, and it never licenses inserting a name the transcript does not contain in some recognisable form.',
```

**(d)** Replace:

```js
    sessionTerms.length > 0
      ? `Session terms for this meeting (highest priority):\n${sessionTerms.map((term) => term.target ? `- ${term.source} → ${term.target}` : `- ${term.source} (keep exact)`).join('\n')}`
      : '',
```

with

```js
    sessionTerms.length > 0
      ? `Session terms for this meeting (highest priority):\n${sessionTerms.map((term) => term.target ? `- ${term.source} → ${term.target}` : `- ${term.source} (keep exact)`).join('\n')}`
      : '',
    sessionMishearings.length > 0
      ? `Known mishearings for this meeting (the recogniser produces the forms on the left; the form on the right is correct):\n${sessionMishearings.map((rule) => `- ${rule.heard.join(' / ')} → ${rule.correct}`).join('\n')}`
      : '',
```

**(e)** Replace:

```js
            sessionTerms: parseSessionTerms(typeof body?.sessionTerms === 'string' ? body.sessionTerms : ''),
```

with

```js
            sessionTerms: parseSessionTerms(typeof body?.sessionTerms === 'string' ? body.sessionTerms : ''),
            sessionMishearings: parseMishearingRules(typeof body?.sessionMishearings === 'string' ? body.sessionMishearings : ''),
```

**(f)** The keyterm guard. Replace:

```js
export function pickScribeKeyterms(corpus) {
  const lines = String(corpus || '').split(/[,\n;·]/).map((t) => t.trim()).filter(Boolean);
  const all = [];
```

with

```js
export function pickScribeKeyterms(corpus) {
  // TASK 5: a `nghe nhầm ~ dạng đúng` line must never become a keyterm. Priming the recogniser with the
  // misheard surface teaches it to produce exactly the surface we are trying to get rid of. The whole
  // left side of such a line is dropped — line by line, BEFORE the comma split, because the misheard
  // surfaces on the left are themselves comma-separated and would otherwise survive as keyterms of their
  // own. The client already strips them; this is the server's own guard for anything else that posts.
  const cleaned = String(corpus || '')
    .split(/\r?\n/)
    .map((line) => { const m = line.match(/^[^~〜～]*[~〜～](.*)$/); return m ? m[1] : line; })
    .join('\n');
  const lines = cleaned.split(/[,\n;·]/).map((t) => t.trim()).filter(Boolean);
  const all = [];
```

## 5.6 Tests — two new files, **34 cases**

### `tests/mishearing.test.ts` — **20 cases**

Import from `../src/lib/lanes/online/mishearing`.

**`describe('splitMishearingLines')`**

1. A corpus with no mark comes back with `terms` byte-identical to the input, `rules` empty,
   `invalid` empty.
2. `'suhai ~ Esuhai'` yields one rule `{ heard: ['suhai'], correct: 'Esuhai' }`, and `terms` is `''`.
3. Left side split on all four separators: `'a, b、c/d|e ~ X'` gives five surfaces in that order.
4. All three marks work: `'a ~ X'`, `'a 〜 X'`, `'a ～ X'` each give the same single rule.
5. Only the FIRST mark splits: `'a ~ B ~ C'` gives `correct === 'B ~ C'`.
6. A `#` line is kept in `terms` untouched even when it contains a mark.
7. A rule line surrounded by ordinary terms: `terms` keeps the other lines in order, with their original
   spacing, and does not keep the rule line.
8. One side empty (`'~ X'` and `'a ~'`) → `invalid` has both, `rules` is empty, and neither line survives
   in `terms`.
9. `'Esuhai ~ Esuhai'` (case-insensitively equal) → `invalid`, not a rule.
10. Two lines with the same correct form merge into ONE rule carrying both surfaces; a duplicate surface
    is not added twice.
11. Caps hold: 50 rule lines with distinct correct forms → exactly `MISHEARING_MAX_RULES` rules and the
    rest in `invalid`; 12 surfaces on one line → exactly `MISHEARING_MAX_HEARD_PER_RULE`.
12. CRLF input parses the same as LF.

**`describe('applyMishearings')`**

13. A hit is replaced and counted: `applyMishearings('Công ty suhai xin chào', rules)` contains `Esuhai`,
    not `suhai`, with `hits === 1`.
14. Case-insensitive: `'SUHAI'` and `'Suhai'` both match a rule written `suhai`.
15. Longest first: with both `SI ~ Esuhai` and `S-Hi Group ~ Esuhai`, the input `'S-Hi Group'` produces one
    hit and the string `'Esuhai'`, not `'Esuhai-Hi Group'`.
16. No match inside a longer Latin word: with `SI ~ Esuhai`, `'SIM'` and `'SINH'` come back untouched and
    `hits === 0`.
17. Japanese with no spaces: with `'エスハイ ~ ESUHAI'`, a kana sentence is corrected mid-string.
18. The replacement is never re-scanned: with `hai ~ Esuhai`, `'hai'` produces `'Esuhai'` with exactly one
    hit (a re-scanning implementation loops or double-replaces).
19. No-ops: empty text, and a non-empty text with an empty rule list, both return the input unchanged with
    `hits === 0`.
20. Several rules in one sentence: two different names corrected, `hits === 2`, everything else preserved
    character for character.

### `tests/mishearingWiring.test.ts` — **14 cases**

Source guards with `const read = (p: string) => readFileSync(new URL(\`../${p}\`, import.meta.url), 'utf8')`,
plus real calls into the server module via
`const { parseMishearingRules, buildRefinePrompt, pickScribeKeyterms } = await import('../server/online-api.mjs')`.

**`describe('the lane corrects on arrival')`**

1. `onlineLane.ts` calls `applyMishearings(` inside `handlePartial` AND inside `handleFinal` — slice the
   file between `function handlePartial` and `function handleFinal`, and between `function handleFinal`
   and the next top-level `function `, and assert both slices contain it.
2. In `handleFinal` the correction happens BEFORE the guards: the index of `applyMishearings(` is lower
   than the index of `dropGhost('repeat'` in that same slice.
3. The getter is live, not latched: `config.getMishearing?.()` appears inside `function activeMishearings`
   and `getMishearing` does NOT appear anywhere inside the `async function start(` body.

**`describe('what the recogniser is primed with')`**

4. Both dial paths go through the one helper: the file contains `corpus: buildAsrCorpus(),` and
   `const proxyTerms = codec ? null : buildAsrCorpus();`, and no longer contains
   `(opts!.terms ?? '').slice(0, CORPUS_MAX_CHARS)`.
5. The misheard side is never primed: the `buildAsrCorpus` body (slice from `function buildAsrCorpus` to
   the next `\n  }`) contains `rule.correct` and does not contain `.heard`.
6. The refine body sends both fields: `sessionTerms: splitMishearingLines(o.terms ?? '').terms,` and
   `sessionMishearings: formatMishearingRules(activeMishearings()),`, and `sessionTerms: o.terms,` is gone.

**`describe('facade and console')`**

7. `index.ts` declares `mishearing: string` and `setMishearing: (v: string) => void` on the facade type,
   persists under `'proyaku_online_mishearing'`, and returns `mishearing, setMishearing` from the hook.
8. `index.ts` passes `getMishearing: () => mishearingRef.current,` into `createOnlineLane`.
9. The console's mishearing textarea is NOT locked while running: match
   `/<textarea value=\{lane\.mishearing\}[^>]*\/>/s` and assert the match does not contain `disabled=`;
   then match the terms textarea the same way and assert it still DOES contain `disabled={lane.running}`.
10. The console reaches the parser through the facade root: `OnlineConsole.tsx` imports
    `splitMishearingLines` on a line ending `from '../index'`, and contains no `from '../mishearing'`.

**`describe('the server backstop')`**

11. Wire round trip across the two implementations: take the client's `formatMishearingRules` output for a
    two-rule list and feed it to the server's `parseMishearingRules`; the result equals the original
    surfaces and correct forms.
12. Defaulted: `buildRefinePrompt({ …minimal args, sessionTerms: [] })` called with **no**
    `sessionMishearings` does not throw and contains no `'Known mishearings'`.
13. Present: the same call with two rules contains `'Known mishearings for this meeting'`, both correct
    forms, and the new policy bullet `'this is a correction, not a suggestion'`.
14. `pickScribeKeyterms` keeps only the correct side, including when the left side has commas:
    `pickScribeKeyterms('suhai, S-Hi Group, SI ~ Esuhai\nLê Long Sơn = レ・ロン・ソン')` gives `kept`
    containing `'Esuhai'`, `'Lê Long Sơn'` and `'レ・ロン・ソン'`, and containing none of `'suhai'`,
    `'S-Hi Group'`, `'SI'`.

Running total after this task: 288 + 22 + 28 + 21 + 10 + 34 = **403**.

---

# When PART 1 is done

Run all three, in this order, and report the numbers verbatim:

```
npx vitest run
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

**Expected: 403 tests passing.** The baseline is 288, and the five tasks above add
22 + 28 + 21 + 10 + 34 = **115**. No existing test file was modified in PART 1.

> **If `tsc` says a name is not defined in `OnlineConsole.tsx`,** add that name to the facade import on
> line 16 (the one ending `from '../index'`) and run again. Several tasks in this file extend that one
> line, and it is the only place a missing name can legitimately be fixed: **never** import from a deeper
> path such as `'../mishearing'` or `'../loudGate'` — the console imports the facade root and nothing else,
> and a deep import is a rule violation even when it compiles.

Then check these by hand, because a passing test suite does not prove them:

1. `git diff --stat package.json package-lock.json` is **empty**. If either moved, undo it — nothing here
   needs a dependency.
2. `git diff --name-only` lists no file under `src/lib/lanes/offline/`, and neither `src/lib/api.ts`,
   `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts` nor `src/lib/lanes/types.ts`.
3. `git grep -n 'roomFilter' -- src/` returns **only the two tombstone comments** TASK 4 asks you to
   write — one in `asrTransport.ts`, one in `index.ts` — and **no code identifier** of that name: no
   `roomFilter:` field, no setter, no ref, no config callback, no `proyaku_online_room_filter`. Read the
   two hits and confirm each is a comment; the `index.ts` one deliberately spells `roomFilter` and
   `setRoomFilter` inside its sentence, which is why this check is about identifiers and not about words.
   Leave the two comments; they are
   the only thing standing between the next person and switching the trap back on. (`server/` keeps its
   own copy deliberately — TASK 4 explains why.)
4. `git diff --name-only -- tests/` lists only files that did not exist before.

Report once, at the end: the three command outputs, the four checks above, and anything you had to decide
that this file did not decide for you. **Then stop and wait for PART 2** — do not start tasks 6–17 from
memory of this file.

