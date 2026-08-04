# PROMPT-11 · PHẦN 2/3 — Hết lặp câu · Không đoán chữ Hán · Núm chỉnh theo từng buổi

**Gửi:** Claude của Sếp Sơn Lê · **Repo:** `ATS_UserUI` · **Nhánh nền:** `develop` tại commit **`3afcee3`**,
**đã áp dụng xong PHẦN 1** · **Ngày:** 02/08/2026 · **Sự kiện:** Lễ kỷ niệm 20 năm, 08/08/2026

---

## PHẦN CHO SẾP ĐỌC (tiếng Việt)

Thưa Sếp, phần này là phần thứ hai của bản đã trình Sếp ở Phần 1 — **không có tính năng nào mới ngoài
những gì Sếp đã đọc**, chỉ là 12 việc còn lại. (Còn Phần 3 là việc thêm sau, chốt 03/08, chạy sau phần
này và có phần riêng cho Sếp đọc.) Ba việc Sếp sẽ thấy rõ nhất trên màn hình:

- **Câu không còn hiện hai lần.** Hôm chạy thử có những câu hiện lên đúp, và có câu tiếng Nhật lặp lại
  chính nó ở giữa. Đó là ba lỗi khác nhau, đều được sửa ở phần này.
- **Máy hết đoán chữ Hán.** Chỗ nào nghe chưa chắc, máy sẽ viết bằng chữ mềm (kana) thay vì chọn đại một
  chữ Hán trông có lý — vì chữ Hán sai không phải là "viết sai chính tả", nó là **một chữ khác hẳn**, và
  loa cũng đọc sai theo.
- **Chọn nhịp nói của buổi** trước khi bấm Bắt đầu, và **kịch bản xuất/nhập được tệp `.json`** để chép
  sang máy khác mà không phải duyệt lại từ đầu.

---

## THE REST OF THIS FILE IS FOR THE ASSISTANT

<role>
You are working in the `ATS_UserUI` repository, continuing PROMPT-11. **PART 1 of this prompt has already
been applied** and its 403 tests pass. This file is tasks 6 to 17.
</role>

<context>
The evidence is the 2026-08-01 rehearsal of the 20th-anniversary gala, read through the deployed build into
a far-field speakerphone. PART 1 fixed the script never arriving, the two microphone thresholds, a console
switch that could not work, and the misheard-name layer. What is left is everything that went wrong AFTER
the words were recognised — sentences delivered twice, a sentence silently lost, a prompt that lies to the
model about what it is being shown, kanji invented at a cut edge — plus the knobs and the small repairs
that were agreed at the same time.

The gala is on 2026-08-08.
</context>

<how_to_work>
- **Baseline.** Unless a block says otherwise in a blockquote directly above it, every "replace" block
  quotes the text at `develop` @ `3afcee3` byte-for-byte, including indentation. Find it, replace it. If a
  block cannot be found verbatim, STOP and report it rather than applying a similar-looking edit.
- **A few blocks quote PART 1's output instead**, because they extend a line PART 1 wrote. Each of those
  says so in a blockquote right above it. There are no others.
- **One pass, no per-task report.** Work through the tasks in the order given. Report once, at the end.
- **Follow this repo's own `CLAUDE.md`.** Online-lane client code stays under `src/lib/lanes/online/`; only
  `src/pages/AudioRouting.tsx`, `src/pages/Settings.tsx` and `/online-lab` may import the facade root, and
  never anything deeper; do not touch `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`,
  `src/lib/useMeter.ts`, or `src/lib/lanes/types.ts`; no vendor env name, model id, API host or key value
  may appear anywhere under `src/`.
- **Add no dependency.** `package.json` and `package-lock.json` must end with zero lines changed. Every
  test below runs in the existing vitest **node** environment; React behaviour is asserted by reading the
  component source with `readFileSync` (the pattern `tests/wallCompactLayout.test.ts` already uses), never
  by rendering.
- **Tests are part of each task**, not a phase at the end.
- **RED LIGHTS — stop and report instead of improvising:** `src/lib/lanes/types.ts` would have to change ·
  `package.json` would have to change · an offline-lane file would have to change · a replace block's old
  text is not present verbatim.
</how_to_work>

<what_you_must_not_do>
- Do not add, change or read any API key, and do not add environment variables to the client. Server env
  names already present in `server/online-api.mjs` may be extended there, and only there.
- Do not add a new HTTP endpoint. TASK 13 deliberately rides the request body of an endpoint that already
  exists, and its tests assert the endpoint count did not change.
- Do not touch authentication, the login gate, or anything security-related — the owner has ruled that
  out of scope for now.
- Do not build a transcript history page. TASK 14 only adds three fields to the record that is already
  being written; the page is a later prompt.
- Do not modify any existing test file EXCEPT these three, and only where they are named:
  `tests/serverAsr.test.ts` — the six lines TASK 10 names; `tests/asrTransport.test.ts` — the single
  case TASK 9 §9.3 names; and `tests/sessionExport.test.ts` — the fixture and the one case TASK 14 §14.5
  names. Each of them currently pins a behaviour this prompt corrects, so each must move with it; all
  three reasons are written out where the change is made, so they are on the record. None of them gains
  or loses an `it(`, so their case counts do not change.
</what_you_must_not_do>

## Task list — PART 2

| # | What | Main files |
|---|---|---|
| 6 | Feed the script's proper nouns to the recogniser | `onlineLane.ts` |
| 7 | Keyterm budget + over-long term warning on the Thuật ngữ box | `keytermBudget.ts` (new), `OnlineConsole.tsx` |
| 8 | Twin-final dedup compares normalised text, in a 4s window | `asrTransport.ts` |
| 9 | Self-heal stops losing the held sentence | `asrTransport.ts`, `onlineLane.ts`, `tests/asrTransport.test.ts` |
| 10 | The refine prompt stops calling the previous fragment "already translated" | `server/online-api.mjs`, `tests/serverAsr.test.ts` |
| 11 | No guessing kanji at a cut edge | `server/online-api.mjs` |
| 12 | Show the vendor's `languageDetection` echo in diagnostics | `onlineLane.ts`, `OnlineConsole.tsx` |
| 13 | Per-meeting speech rhythm (3 steps) riding the existing token request | `speechRhythm.ts` (new), `server/online-api.mjs`, `asrTransport.ts`, `onlineLane.ts`, `index.ts`, `OnlineConsole.tsx` |
| 14 | The saved transcript records the event, the per-sentence direction, and script lines | `sessionExport.ts`, `onlineLane.ts`, `index.ts`, `OnlineConsole.tsx`, `tests/sessionExport.test.ts` |
| 15 | Script `.json` export / import, and an empty import cannot wipe the script | `scriptTransfer.ts` (new), `ScriptPrep.tsx` |
| 16 | A failing server call reports its real cause on screen | `server/online-api.mjs`, `refineFailure.ts` (new), `onlineLane.ts` |
| 17 | Two documentation repairs carried over from PROMPT-10 PART 2 | `docs/ONLINE-LANE-UI-API.md` |

Expected test count when you are done: **403 → 547**.

---

# TASK 6 — Feed the approved script's proper nouns to the recogniser

**Why.** `scriptKeyterms()` already exists in `src/lib/lanes/online/scriptMatcher.ts`, fully written and
documented — *"Proper nouns lifted from the script to prime speech recognition (people, companies,
places). Priming these cuts mishearings at the source"* — and at `3afcee3` **nothing calls it**. Every
name on the 40 approved rows of the gala script is known hours in advance, and none of it reaches the
recogniser. That is the cheapest correction available in this whole file: one call, at a point the code
already reaches.

The limit is the one decision worth stating. `pickScribeKeyterms` on the server keeps at most **30**
keyterms, so more than 30 names lifted from the script can never reach the handshake — and the script's
names go **last** in the corpus, after the operator's own glossary, so the operator's list always wins the
budget and the script fills whatever is left.

## 6.1 `onlineLane.ts` — the import, the limit, the one call

**(a)** Replace:

```ts
import { createScriptMatcher, type ScriptMatch, type ScriptMatcher, type ScriptMatcherEntry } from './scriptMatcher';
```

with

```ts
import { createScriptMatcher, scriptKeyterms, type ScriptMatch, type ScriptMatcher, type ScriptMatcherEntry } from './scriptMatcher';
```

**(b)** Replace:

```ts
const CORPUS_MAX_CHARS = 2000; // contract: corpus ≤ 2000 chars
```

with

```ts
const CORPUS_MAX_CHARS = 2000; // contract: corpus ≤ 2000 chars
// The server keeps at most 30 keyterms (`pickScribeKeyterms`), so lifting more than 30 names out of the
// script can never reach the handshake. They are appended AFTER the operator's own glossary, so the
// glossary always wins the budget and the script fills what is left.
const SCRIPT_KEYTERM_LIMIT = 30;
```

**(c)** Replace:

```ts
    const scriptSeed = config.getScript?.() ?? [];
    scriptMatcher = scriptSeed.length ? createScriptMatcher(scriptSeed) : null;
    scriptRows = scriptSeed.length;
```

with

```ts
    const scriptSeed = config.getScript?.() ?? [];
    scriptMatcher = scriptSeed.length ? createScriptMatcher(scriptSeed) : null;
    scriptRows = scriptSeed.length;
    // TASK 6: the names on the approved rows are known hours before the ceremony — prime the recogniser
    // with them instead of letting it guess at them live. Latched here with the rows themselves, so the
    // corpus rebuilt at each dial keeps using the script this session actually started with.
    scriptKeytermCorpus = scriptSeed.length ? scriptKeyterms(scriptSeed, SCRIPT_KEYTERM_LIMIT).join('\n') : '';
```

That is the whole change: `buildAsrCorpus()` (TASK 5) already appends `scriptKeytermCorpus` and applies the
2000-character cap, and both dial paths already go through it.

## 6.2 Tests — new file `tests/scriptKeyterms.test.ts`, **12 cases**

Real calls into `../src/lib/lanes/online/scriptMatcher`, plus source guards on `onlineLane.ts` with
`const read = (p: string) => readFileSync(new URL(\`../${p}\`, import.meta.url), 'utf8')`.

**`describe('scriptKeyterms lifts the right words')`**

1. Vietnamese capitalised runs are lifted whole: a row whose `src` is
   `'Kính thưa ông Lê Long Sơn, Tổng giám đốc Esuhai'` yields `'Lê Long Sơn'` and `'Esuhai'` as separate
   entries (multi-word run kept together, not split).
2. Katakana runs of three or more characters are lifted from the Japanese side; a two-character katakana
   run is not.
3. Words shorter than three characters never appear, whichever side they came from.
4. Both `src` and `dst` contribute to the same result.
5. Frequency wins, then alphabetical: a name on three rows sorts above a name on one, and two names with
   the same count come back in `localeCompare` order.
6. The limit is honoured exactly: 50 distinct names with `limit = 30` gives 30 entries, and they are the
   30 highest-ranked.
7. Defensive inputs: `scriptKeyterms(undefined as never)` and rows with non-string `src`/`dst` return `[]`
   or skip that row instead of throwing.

**`describe('the lane actually uses it')`**

8. `onlineLane.ts` imports `scriptKeyterms` from `'./scriptMatcher'` — this is the regression that matters,
   because the function sat written and uncalled from the day it was merged.
9. `const SCRIPT_KEYTERM_LIMIT = 30;` is declared and is the second argument at the call site:
   match `/scriptKeyterms\(scriptSeed, SCRIPT_KEYTERM_LIMIT\)/`.
10. It is computed from the SAME latched seed as the matcher: in the slice between
    `const scriptSeed = config.getScript?.()` and the next `scriptSnaps = 0;`, both
    `createScriptMatcher(scriptSeed)` and `scriptKeyterms(scriptSeed` appear.
11. An empty script resets it rather than leaving the previous session's names behind: the same slice
    contains `scriptSeed.length ? scriptKeyterms(` and the `: ''` branch.
12. Order inside the corpus is glossary-then-script, so the 30-keyterm budget goes to the operator first:
    in the `buildAsrCorpus` body, the index of `plain` is lower than the index of `corrected`, which is
    lower than the index of `scriptKeytermCorpus`.

Running total after this task: 403 + 12 = **415**.

---

# TASK 7 — The keyterm budget, and the over-long term that is silently thrown away

**Why.** The server keeps at most **30** keyterms and drops any term longer than **20 characters** — and
it drops them in silence. That rule already cost this project once: `Chương trình Vinh danh` (22 chars)
and the glossary line `Lê Long Sơn = レ・ロン・ソン` (25 chars) were thrown away, and the one thing the
recogniser most needed help with was exactly what never reached it. The operator has no way to see any of
this. After this task the Thuật ngữ box says how many of the 30 slots are in use, and names the entries
that are being dropped, in red.

The rule lives on the server, so a hand-written second copy on the client would drift the first time
either side is touched. Instead there is one small client module that is a deliberate mirror, and a
**parity test** that runs the same corpora through both implementations and fails the day they disagree.

## 7.1 New file `src/lib/lanes/online/keytermBudget.ts`

```ts
// src/lib/lanes/online/keytermBudget.ts — what the operator's glossary will actually become, shown before
// the session starts instead of discovered afterwards.
//
// This is a deliberate MIRROR of `pickScribeKeyterms` in server/online-api.mjs, kept honest by
// tests/keytermBudget.test.ts, which runs the same corpora through both and compares. It differs from the
// server in exactly one way: the server returns a single `dropped` count, and this returns the dropped
// entries split by reason, because "too long, shorten it" and "the list is full" are different problems
// with different fixes and the screen has to say which one it is.
//
// If you change the rule, change it on the server FIRST and let the parity test tell you what to do here.

export const KEYTERM_MAX_LEN = 20;
export const KEYTERM_MAX = 30;

export interface KeytermPreview {
  /** what the recogniser will be primed with, in order */
  kept: string[];
  /** dropped for being longer than KEYTERM_MAX_LEN — the operator can shorten these */
  tooLong: string[];
  /** dropped because the 30 slots ran out — these still reach the translation stage */
  overflow: string[];
}

export function previewKeyterms(corpus: string): KeytermPreview {
  // A `nghe nhầm ~ dạng đúng` line contributes only its correct side; the misheard surfaces must never be
  // primed. Stripped line by line, BEFORE the separator split, because the left side is itself
  // comma-separated. Same order as the server.
  const cleaned = String(corpus || '')
    .split(/\r?\n/)
    .map((line) => { const m = line.match(/^[^~〜～]*[~〜～](.*)$/); return m ? m[1] : line; })
    .join('\n');

  const lines = cleaned.split(/[,\n;·]/).map((t) => t.trim()).filter(Boolean);
  const all: string[] = [];
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq < 0) { all.push(line); continue; }
    for (const side of [line.slice(0, eq), line.slice(eq + 1)]) {
      const s = side.trim();
      if (s) all.push(s);
    }
  }

  const kept: string[] = [];
  const tooLong: string[] = [];
  const overflow: string[] = [];
  const seen = new Set<string>();
  for (const term of all) {
    if (seen.has(term)) continue;
    if (term.length > KEYTERM_MAX_LEN) { tooLong.push(term); continue; }
    if (kept.length >= KEYTERM_MAX) { overflow.push(term); continue; }
    seen.add(term);
    kept.push(term);
  }
  return { kept, tooLong, overflow };
}
```

**One difference to be aware of, and it is intentional:** the server tests `t.length > MAX_LEN ||
kept.length >= MAX` in a single condition, so an over-long term that arrives after the list is already
full counts once, as one drop. Here the length test comes first, so that term is reported as `tooLong` —
which is the reason the operator can do something about. `kept` is identical either way, and the parity
test asserts `tooLong.length + overflow.length === dropped`.

## 7.2 `index.ts` (facade) — export it

Replace:

```ts
export type { ScriptMatcherEntry } from './scriptMatcher'
```

with

```ts
export type { ScriptMatcherEntry } from './scriptMatcher'
// TASK 7: the console shows the operator what their glossary becomes. Same reason as the mishearing
// parser below — components go through the facade root.
export { previewKeyterms, KEYTERM_MAX, KEYTERM_MAX_LEN } from './keytermBudget'
export type { KeytermPreview } from './keytermBudget'
```

(TASK 5 also inserts after this line. Both insertions are additions after the same unchanged line, so
apply them in either order and keep both.)

## 7.3 `OnlineConsole.tsx` — say it on the box

**(a)** Extend the facade import on line 16 with `previewKeyterms`. (This is the fourth task to touch that
line — TASK 1(c), TASK 3(a), TASK 5(b) and this one. Make all the changes at once.)

**(b)** Replace:

```tsx
  const prepCounts = (
```

with

```tsx
  // TASK 7: exactly what the recogniser will be primed with, computed from the two boxes that feed it.
  // Names lifted from the approved script are appended after these on the server side and take whatever
  // slots are left, which is why the line below says "chưa kể".
  const keyterms = useMemo(() => previewKeyterms(`${lane.terms}\n${lane.mishearing}`), [lane.terms, lane.mishearing])

  const prepCounts = (
```

**(c)** Replace:

```tsx
                <div className="text-right text-[11px] text-on-surface-variant tabular-nums">{lane.terms.length}/2000</div>
```

with

```tsx
                <div className="flex items-start justify-between gap-2 text-[11px] text-on-surface-variant">
                  <span className="leading-relaxed">
                    Máy nghe được mồi <strong className="tabular-nums">{keyterms.kept.length}/{KEYTERM_MAX}</strong> từ khoá
                    <span className="opacity-70"> (chưa kể tên lấy từ kịch bản)</span>
                  </span>
                  <span className="tabular-nums shrink-0">{lane.terms.length}/2000</span>
                </div>
                {keyterms.tooLong.length > 0 && (
                  <p className="text-[11px] text-error leading-relaxed">
                    {keyterms.tooLong.length} mục dài quá {KEYTERM_MAX_LEN} ký tự nên máy nghe bỏ qua — tách ngắn lại thì
                    dùng được: {keyterms.tooLong.slice(0, 3).join(' · ')}
                  </p>
                )}
                {keyterms.overflow.length > 0 && (
                  <p className="text-[11px] text-secondary leading-relaxed">
                    Đã đủ {KEYTERM_MAX} từ khoá — {keyterms.overflow.length} mục cuối không được mồi (vẫn dùng lúc dịch):{' '}
                    {keyterms.overflow.slice(0, 3).join(' · ')}
                  </p>
                )}
```

Add `KEYTERM_MAX` and `KEYTERM_MAX_LEN` to the same facade import as `previewKeyterms`.

## 7.4 Tests — new file `tests/keytermBudget.test.ts`, **16 cases**

`import { previewKeyterms, KEYTERM_MAX, KEYTERM_MAX_LEN } from '../src/lib/lanes/online/keytermBudget'` and
`const { pickScribeKeyterms } = await import('../server/online-api.mjs')`.

**`describe('the rule')`**

1. The two numbers are the server's own: read `server/online-api.mjs`, match
   `/const SCRIBE_KEYTERM_MAX_LEN = (\d+);/` and `/const SCRIBE_KEYTERM_MAX = (\d+);/`, and assert they
   equal `KEYTERM_MAX_LEN` and `KEYTERM_MAX`.
2. A glossary line contributes both sides, interleaved per line:
   `'Lê Long Sơn = レ・ロン・ソン\nEsuhai = エスハイ'` gives `kept` in the order
   `['Lê Long Sơn', 'レ・ロン・ソン', 'Esuhai', 'エスハイ']`.
3. The same name on two lines is one keyterm, not two.
4. `'Chương trình Vinh danh'` (22 chars) lands in `tooLong`, not in `kept` — the exact entry that was lost
   on 14/07.
5. The 31st distinct term lands in `overflow`, not in `kept`, and `kept.length === KEYTERM_MAX`.
6. A `~` line contributes only its correct side: `'suhai ~ Esuhai'` keeps `'Esuhai'` and not `'suhai'`.
7. A `~` line with several surfaces on the left keeps none of them:
   `'suhai, S-Hi Group, SI ~ Esuhai'` gives `kept` equal to `['Esuhai']`.
8. All four separators split: `,` `\n` `;` `·`.
9. Empty, whitespace-only and `undefined`-ish corpora give three empty arrays and never throw.

**`describe('parity with the server')`** — for each corpus, assert
`previewKeyterms(c).kept` deep-equals `pickScribeKeyterms(c).kept`, and
`previewKeyterms(c).tooLong.length + previewKeyterms(c).overflow.length === pickScribeKeyterms(c).dropped`.

10. A plain glossary with `=` on every line.
11. A corpus containing two over-long entries.
12. A 40-line list that overflows the 30 slots.
13. A corpus mixing ordinary terms and `~` lines.

**`describe('the console says it')`**

14. `OnlineConsole.tsx` contains `previewKeyterms(\`${lane.terms}\n${lane.mishearing}\`)` (match with a
    regex on `previewKeyterms\(` and on `lane.mishearing`), and renders
    `{keyterms.kept.length}/{KEYTERM_MAX}`.
15. The over-long warning is rendered in the error colour and names the entries: the file contains
    `keyterms.tooLong.length > 0` inside a block containing `text-error` and
    `keyterms.tooLong.slice(0, 3)`.
16. The console does not reach around the facade: `OnlineConsole.tsx` contains no `from '../keytermBudget'`
    and no `online-api`.

Running total after this task: 415 + 16 = **431**.

---

# TASK 8 — Whole sentences reaching the screen twice

**Why.** Every committed sentence arrives from the vendor twice: a plain final and a timestamped one. The
codec swallows the twin by comparing the two strings **exactly** and only inside a **2-second** window. At
the 01/08 rehearsal both halves of that test failed: the two twins are produced by two different passes and
do not always agree on punctuation, spacing or character width, and on the long sentences of a ceremony
read into a far-field microphone the timestamped twin arrived more than two seconds after the plain one.
Each miss put the same sentence on the wall twice and sent it to be translated and spoken twice.

Both halves are fixed here, and the second one needs the first: widening the window alone would start
swallowing a genuine repeat (an MC saying `Vâng.` twice in four seconds). So the twin test stops being
"same text" and becomes "same words, **and the other kind of final** from the one just emitted" — a real
repeat arrives as its own plain-then-timestamped pair, whose first half is the same kind as the one
already emitted, not the missing one.

## 8.1 `asrTransport.ts` — the window and the key

**(a)** Replace:

```ts
// A committed sentence arrives twice (plain + timestamped) with identical text; swallow the
// twin only if it repeats within this window. Beyond it, a genuine repeat ("Vâng." twice)
// must still get through.
const FINAL_DEDUP_MS = 2000;
```

with

```ts
// A committed sentence arrives twice (plain + timestamped); swallow the twin only if it repeats within
// this window. Widened from 2000 ms on 02/08/2026: at the 01/08 rehearsal the timestamped twin of a long
// sentence routinely arrived more than two seconds after the plain one, and every one of those late twins
// reached the screen as a second copy of the sentence. Widening it is safe only because the twin test
// below is no longer "same text" alone — see `timestamped !== lastFinalTimestamped`.
const FINAL_DEDUP_MS = 4000;

/**
 * The dedup key for a final transcript.
 *
 * The two twins of one commit come from two different passes and do NOT always agree on punctuation,
 * spacing or character width — `Kính thưa quý vị.` against `Kính thưa quý vị`, or a full-width `！`
 * against `!`. An exact compare therefore missed the twin and the sentence was emitted twice. NFKC folds
 * the width difference; the rest strips exactly what the two passes disagree about, and nothing else.
 *
 * This is a comparison key ONLY. The transcript that leaves the codec is always the original string.
 */
function normaliseFinal(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\s　]+/g, '')
    .replace(/[.,!?;:…、。！？；：·・「」『』（）()]/g, '')
    .toLowerCase();
}
```

**(b)** Replace:

```ts
  // Final-dedup memory: the last emitted `completed` transcript and when it was emitted.
  let lastFinalText: string | null = null;
  let lastFinalAt = 0;
```

with

```ts
  // Final-dedup memory: the normalised key of the last emitted `completed` transcript, when it was
  // emitted, and which of the two kinds of final it was.
  let lastFinalKey: string | null = null;
  let lastFinalAt = 0;
  let lastFinalTimestamped = false;
```

**(c)** Replace:

```ts
          const now = Date.now();
          // Swallow the timestamped twin: identical text seen again within the window.
          if (lastFinalText !== null && transcript === lastFinalText && now - lastFinalAt < FINAL_DEDUP_MS) {
            return null;
          }
          lastFinalText = transcript;
          lastFinalAt = now;
```

with

```ts
          const now = Date.now();
          const finalKey = normaliseFinal(transcript);
          // Swallow the twin — and only the twin. Three conditions, each earning its place:
          //   * same WORDS, not the same string: the two passes disagree about punctuation and width;
          //   * the OTHER kind of final from the one just emitted: a genuine repeat ("Vâng." twice) opens
          //     its own plain-then-timestamped pair, and its first half is the same kind as the one
          //     already emitted, so it is let through;
          //   * inside the window, so a sentence legitimately repeated a minute later is never lost.
          if (lastFinalKey !== null && finalKey === lastFinalKey && timestamped !== lastFinalTimestamped && now - lastFinalAt < FINAL_DEDUP_MS) {
            return null;
          }
          lastFinalKey = finalKey;
          lastFinalAt = now;
          lastFinalTimestamped = timestamped;
```

## 8.2 Tests — new file `tests/finalDedup.test.ts`, **14 cases**

`import { createAsrCodec } from '../src/lib/lanes/online/asrTransport'`. Drive the codec with raw JSON
strings — `codec.decode(JSON.stringify({ message_type: 'final_transcript', transcript: '…' }))` for the
plain twin and `'final_transcript_with_timestamps'` for the other — and count the non-null returns whose
event type is `conversation.item.input_audio_transcription.completed`.

**`describe('the twin is swallowed')`**

1. Identical text, plain then timestamped → exactly one emitted event.
2. The 01/08 shape: the twins differ only by a trailing `。` → one event.
3. Full-width against half-width punctuation (`！` vs `!`) → one event.
4. An extra internal space in one twin → one event.
5. Timestamped first, plain second → one event (the order is the vendor's business, not ours).
6. A `partial_transcript` arriving between the two twins does not reset the memory → still one event.

**`describe('a genuine repeat still gets through')`**

7. Two full pairs of `Vâng.` back to back → **two** events.
8. Two different sentences inside the window → two events.
9. The same sentence repeated after the window: emit the pair, advance `Date.now()` past
   `FINAL_DEDUP_MS` with `vi.setSystemTime`, emit the pair again → two events.
10. Same words, same kind of final twice in a row (two plain finals, no timestamped twin between them) →
    two events, because nothing here is a twin.

**`describe('what leaves the codec')`**

11. The emitted `transcript` is the ORIGINAL string, punctuation and spacing intact — assert it equals the
    input exactly, never the normalised key.
12. A punctuation-only pair (`'。'` then `'。'`) emits once and does not throw; the key being empty is
    acceptable because such a final carries no words.

**`describe('the constants are what the comment says')`**

13. Read `asrTransport.ts` and assert `/const FINAL_DEDUP_MS = 4000;/` matches.
14. The same read asserts the twin test includes `timestamped !== lastFinalTimestamped`, and that
    `lastFinalText` no longer appears anywhere in the file.

Running total after this task: 431 + 14 = **445**.

---

# TASK 9 — The self-heal that lost a sentence every time it fired

**Why.** When the handshake promises language detection, the codec holds the plain final and waits for the
timestamped twin that carries the language tag. If a second plain final turns up while the first is still
waiting, the promise is broken and the codec heals itself. Two things were wrong with that healing:

1. **The held sentence was thrown away.** `heldPlainFinal = null` and nothing was ever emitted for it. One
   sentence the operator actually spoke disappeared from the screen, from the translation, from the voice
   and from the saved transcript, silently, every single time this fired.
2. **It cleared `sawTimestampedFinal` at the first hiccup.** That flag is *evidence* — "this session does
   produce tagged twins" — not policy. Discarding it on one late twin sends the next sentence out with no
   language tag, and the tag is what decides which way the sentence is translated.

After this task the held sentence is rescued and delivered in spoken order, one late twin costs nothing
but that rescue, and only a **run** of broken promises — the vendor having genuinely stopped sending the
twin — opens the gate for good. That last part matters: holding every sentence for a twin that never comes
would leave the whole ceremony's transcript running one sentence behind.

**One existing test has to move with the code.** `tests/asrTransport.test.ts` contains a case written
around the old healing, and it pins the loss itself: it asserts that the second plain final comes straight
back out of `decode`. Under the new rule that call returns `null` — the second sentence is now the one
being held, and the first is handed back through `drain()`. Leaving that case alone would keep the suite
red no matter how correct the rest of this task is, so §9.3 rewrites it, in the same spirit as TASK 10 and
`tests/serverAsr.test.ts` — and TASK 14 §14.5, which does the same for the third and last one,
`tests/sessionExport.test.ts`. It stays exactly one `it(`, so the baseline count of 288 does not move.

**Apply TASK 8 first.** This task uses `normaliseFinal()` from it.

## 9.1 `asrTransport.ts` — rescue queue, strike counter, drain

**(a)** Replace:

```ts
const FATAL_TOKENS = ['auth_error', 'quota_exceeded', 'unaccepted_terms'];
```

with

```ts
const FATAL_TOKENS = ['auth_error', 'quota_exceeded', 'unaccepted_terms'];

// How many broken promises in a row before the codec stops waiting for the tagged twin at all. One is a
// hiccup and costs only a rescue; a run of three means the vendor has genuinely stopped sending it, and
// from then on holding would put every sentence of the ceremony one behind.
const BROKEN_PROMISE_LIMIT = 3;
```

**(b)** Replace:

```ts
export interface AsrCodec {
  encodeAudio(pcm: ArrayBuffer): string; // JSON string frame
  encodeCommit(): string; // JSON string frame
  decode(raw: string): { event: DecodedEvent; fatal: boolean } | null;
}
```

with

```ts
export interface AsrCodec {
  encodeAudio(pcm: ArrayBuffer): string; // JSON string frame
  encodeCommit(): string; // JSON string frame
  decode(raw: string): { event: DecodedEvent; fatal: boolean } | null;
  /**
   * Sentences the codec owes the caller: a plain final it had been holding for a tagged twin that never
   * arrived. Call it after every `decode` and deliver what comes back BEFORE that decode's own event —
   * the rescued sentence was spoken first. Optional so an older stub codec still satisfies the type.
   */
  drain?(): DecodedEvent[];
}
```

**(c)** Replace:

```ts
  let expectTaggedFinal = false;
  // A plain final withheld while its tagged twin is expected. Kept so a broken promise can be detected
  // (see below) instead of silently swallowing the session.
  let heldPlainFinal: string | null = null;
```

with

```ts
  let expectTaggedFinal = false;
  // A plain final withheld while its tagged twin is expected. Kept so a broken promise can be detected
  // (see below) instead of silently swallowing the session.
  let heldPlainFinal: string | null = null;
  // TASK 9: broken promises in a row. Reset by any tagged final, because that is the vendor keeping the
  // promise again.
  let brokenPromises = 0;
  // TASK 9: sentences owed to the caller — a held final rescued when its twin never came. Never dropped:
  // this is a sentence somebody actually said.
  const pending: DecodedEvent[] = [];
```

**(d)** Replace:

```ts
          if (timestamped) {
            if (transcript.trim()) sawTimestampedFinal = true;
            heldPlainFinal = null;
```

with

```ts
          if (timestamped) {
            if (transcript.trim()) sawTimestampedFinal = true;
            brokenPromises = 0; // the promise is being kept again
            heldPlainFinal = null;
```

**(e)** Replace:

```ts
            // Self-healing: a SECOND plain final while the first is still waiting means the promised
            // twin never came. Stop waiting for good and let this one through, so a vendor that changes
            // its mind costs one sentence rather than the entire session's transcript.
            if (heldPlainFinal !== null && heldPlainFinal !== transcript) {
              expectTaggedFinal = false;
              sawTimestampedFinal = false;
              heldPlainFinal = null;
            } else {
              heldPlainFinal = transcript;
              return null;
            }
```

with

```ts
            // Self-healing: a SECOND plain final while the first is still waiting means the promised twin
            // never came for the first one.
            //
            // The held sentence is RESCUED, never dropped. Until 02/08/2026 it was set to null and no
            // event was ever produced for it, so one spoken sentence vanished from the screen, the
            // translation, the voice and the saved transcript each time this fired — in silence.
            //
            // The compare is normalised: the vendor re-sending the same plain final with different
            // punctuation is not a new sentence and must not count as a broken promise.
            //
            // And the strike counter is why `sawTimestampedFinal` is no longer cleared here. That flag is
            // evidence, not policy: discarding it on one late twin sends the next sentence out untagged,
            // and the tag is what routes it. One hiccup now costs only the rescue; three in a row means
            // the vendor has genuinely stopped, and only then does the gate open for good.
            if (heldPlainFinal !== null && normaliseFinal(heldPlainFinal) !== normaliseFinal(transcript)) {
              pending.push({ type: 'conversation.item.input_audio_transcription.completed', transcript: heldPlainFinal });
              heldPlainFinal = null;
              brokenPromises += 1;
              if (brokenPromises >= BROKEN_PROMISE_LIMIT) {
                expectTaggedFinal = false;
                sawTimestampedFinal = false;
              } else {
                heldPlainFinal = transcript; // keep waiting for THIS one's twin; the tag is still worth it
                return null;
              }
            } else {
              heldPlainFinal = transcript;
              return null;
            }
```

**(f)** Add `drain` to the returned object. Replace:

```ts
    encodeCommit(): string {
      return JSON.stringify({
        message_type: 'input_audio_chunk',
        audio_base_64: '',
        commit: true,
        sample_rate: 16000,
      });
    },
```

with

```ts
    encodeCommit(): string {
      return JSON.stringify({
        message_type: 'input_audio_chunk',
        audio_base_64: '',
        commit: true,
        sample_rate: 16000,
      });
    },

    drain(): DecodedEvent[] {
      return pending.length ? pending.splice(0, pending.length) : [];
    },
```

**A known, accepted limit, written down so nobody rediscovers it as a bug:** a rescued sentence does not
update the dedup memory, so a tagged twin arriving *after the next sentence's plain final* would reach the
screen as a visible duplicate. That ordering has never been observed, and one visible duplicate is a far
better failure than one silently lost sentence.

## 9.2 `onlineLane.ts` — deliver what the codec owes, in order

Replace:

```ts
        const decoded = codec.decode(ev.data);
        if (!decoded) return;
```

with

```ts
        const decoded = codec.decode(ev.data);
        // TASK 9: a decode can rescue a sentence the codec had been holding for a twin that never came.
        // Drained BEFORE this decode's own event, because the rescued sentence was spoken first.
        for (const rescued of codec.drain?.() ?? []) {
          lastEventAt = Date.now();
          handleEvent(rescued as unknown as Record<string, unknown>);
        }
        if (!decoded) return;
```

## 9.3 `tests/asrTransport.test.ts` — the one existing case that pins the OLD behaviour

Inside `describe('createAsrCodec — giữ bản twin mang nhãn')`. The setup lines are unchanged; only the
verdict changes, because the behaviour they describe changed. Same helpers (`started`, `plain`, `tagged`)
already defined at the top of that describe block — do not redefine them.

Replace:

```ts
  it('lời hứa bị bội chỉ mất MỘT câu, không mất cả phiên', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const codec = createAsrCodec()
    codec.decode(started(true))
    expect(codec.decode(plain('Câu bị mất.'))).toBeNull()
    vi.setSystemTime(5_000)
    const r = codec.decode(plain('Câu sau vẫn qua.')) // bản trơn thứ hai gỡ bỏ việc chờ
    expect((r!.event as { transcript: string }).transcript).toBe('Câu sau vẫn qua.')
  })
```

with

```ts
  it('lời hứa bị bội: câu đang giữ được CỨU qua drain, không mất câu nào', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const codec = createAsrCodec()
    codec.decode(started(true))
    expect(codec.decode(plain('Câu bị mất.'))).toBeNull()
    vi.setSystemTime(5_000)
    // Bản trơn thứ hai là một lời hứa bị bội (lần 1 trong 3): đến lượt NÓ bị giữ để chờ nhãn...
    expect(codec.decode(plain('Câu sau vẫn qua.'))).toBeNull()
    // ...còn câu thứ nhất được cứu ra, đúng thứ tự đã nói, không còn biến mất như trước.
    const rescued = codec.drain?.() ?? []
    expect(rescued.map((e) => (e as { transcript: string }).transcript)).toEqual(['Câu bị mất.'])
    expect(codec.drain?.() ?? []).toEqual([]) // hàng đợi đã rỗng
    // Câu thứ hai vẫn ra, và ra KÈM nhãn, khi bản mang nhãn của nó tới.
    const r = codec.decode(tagged('Câu sau vẫn qua.', 'vi'))
    expect((r!.event as { transcript: string }).transcript).toBe('Câu sau vẫn qua.')
    expect((r!.event as { detectedLanguage?: string }).detectedLanguage).toBe('vi')
  })
```

**This is the only edit to this file, and the file keeps all 26 of its cases** — one `it(` in, one `it(`
out. If your replacement has two `it(` in it, you have changed the totals and the run will not match.

## 9.4 Tests — new file `tests/asrSelfHeal.test.ts`, **14 cases**

`import { createAsrCodec } from '../src/lib/lanes/online/asrTransport'`. Open every codec with a
`session_started` whose `config.include_language_detection` is `true`, so the hold path is armed. Helper:
`const plain = (t: string) => codec.decode(JSON.stringify({ message_type: 'final_transcript', transcript: t }))`
and `const tagged = (t: string, lang = 'vie') => codec.decode(JSON.stringify({ message_type: 'final_transcript_with_timestamps', transcript: t, language_code: lang }))`.

**`describe('the promise kept')`**

1. `plain('A')` returns null and `drain()` is empty; `tagged('A')` emits once, carrying
   `detectedLanguage: 'vie'`. Nothing is rescued, nothing is lost.
2. A tagged final resets the strike counter: one broken promise, then a kept one, then two more broken
   ones — the gate is still shut (the next plain final is held, not emitted).

**`describe('the promise broken once')`**

3. `plain('A')` then `plain('B')`: the second call returns **null** (B is now the one being held), and
   `drain()` returns exactly one event.
4. That event is `conversation.item.input_audio_transcription.completed` with transcript exactly `'A'` and
   no `detectedLanguage` — it never got its tag, and pretending otherwise would be a lie to the router.
5. `drain()` empties the queue: an immediate second call returns `[]`.
6. B is still held afterwards: `tagged('B')` then emits B once, so nothing is lost and B keeps its tag.
7. A re-sent identical plain final is not a broken promise: `plain('A')`, `plain('A')` → `drain()` empty,
   still held.
8. Nor is one that differs only in punctuation: `plain('Kính thưa quý vị.')`, `plain('Kính thưa quý vị')`
   → `drain()` empty (this is what `normaliseFinal` is doing here).

**`describe('the promise broken for good')`**

9. Three broken promises in a row rescue three sentences, and after the third the gate is open: the next
   `plain('D')` is emitted **immediately** by `decode` and `drain()` is empty.
10. `sawTimestampedFinal` survives the first two strikes: after two, a plain final is still held rather
    than emitted — this is the exact regression the old code had.
11. `BROKEN_PROMISE_LIMIT` is 3: read `asrTransport.ts` and assert
    `/const BROKEN_PROMISE_LIMIT = 3;/`.
12. A session that never promises detection is untouched: `include_language_detection` absent → every
    plain final is emitted straight away, `drain()` always empty.

**`describe('wiring')`**

13. `AsrCodec` declares `drain?(): DecodedEvent[];` and `createAsrCodec` implements it — source guard on
    `asrTransport.ts` for both strings.
14. The lane drains first: in `onlineLane.ts`, the index of `codec.drain?.()` is lower than the index of
    `handleEvent(decoded.event`.

Running total after this task: 445 + 14 = **459**.

---

# TASK 10 — The refine prompt calls the previous half "already translated". It is not.

**Why.** When a sentence is cut mid-thought, the next one is sent to refine with the first half attached,
under this label:

```
First half, already translated and shown to the audience:
Chúng tôi rất vinh dự được đón tiếp
```

That text is **not** a translation. Follow it back through the lane: `pendingFragmentTail = fragment &&
reason !== 'turn-end' ? head : ''`, and `head` is the source transcript exactly as the recogniser heard
it. So on a Vietnamese→Japanese session the model is handed Vietnamese and told, in the prompt's own
words, that it is looking at the translation the audience has already read.

That is a direct cause of what happened on 01/08. A model shown source text labelled "already translated"
has three ways to go wrong and took all three during the rehearsal: it treated the Vietnamese as an
example of what the output should look like, it re-translated the half it was told not to repeat, and it
produced Japanese that stuttered inside itself (`ご一緒に…ご一緒に`) by continuing from text it had itself
just re-rendered.

The fix is one honest label plus two explicit instructions. Nothing about the mechanism changes: the same
text travels in the same field for the same reason — the model is simply told what it actually is.

## 10.1 `server/online-api.mjs` — say what the text really is

Replace:

```js
function continuationPolicy(previousFragment) {
  return [
    'IMPORTANT — the subtitle immediately before this one was cut off mid-thought, and the transcript below is its CONTINUATION (the speaker paused, then carried on).',
    `First half, already translated and shown to the audience:\n${previousFragment}`,
    '- Translate the transcript below as the continuation of that half: read one after the other, the two subtitles must form one natural sentence.',
    '- Do NOT repeat, re-translate, or summarise the first half — it is already on screen and has already been spoken aloud.',
    '- Do not restart the sentence: begin exactly where the first half stopped, and keep its grammatical thread (subject, tense, register).',
    '- Use the first half only to continue it correctly. It is not evidence for any content that is missing from the transcript below.',
  ].join('\n');
}
```

with

```js
function continuationPolicy(previousFragment) {
  return [
    'IMPORTANT — the subtitle immediately before this one was cut off mid-thought, and the transcript below is its CONTINUATION (the speaker paused, then carried on).',
    `First half, exactly as the recogniser heard it — SOURCE language, NOT a translation:\n${previousFragment}`,
    '- That half has already been translated and shown to the audience, but you are NOT being shown the translation. You are shown the source words, and only so that you can see where the sentence stopped.',
    '- Translate the transcript below as the continuation of that half: read one after the other, the two subtitles must form one natural sentence.',
    '- Do NOT repeat, re-translate, or summarise the first half — it is already on screen and has already been spoken aloud. Never copy any of its words, in any language, into target_final.',
    '- Do not restart the sentence: begin exactly where the first half stopped, and keep its grammatical thread (subject, tense, register).',
    '- The first half is in the SOURCE language. It is never an example of what the target language should look like, and it is never evidence for content that is missing from the transcript below.',
  ].join('\n');
}
```

## 10.2 `tests/serverAsr.test.ts` — the second existing test that has to move

This is the second of the **three** existing test files this whole prompt is allowed to change (TASK 9
§9.3 and TASK 14 §14.5 are the other two), and only these six lines of it.
The reason is on the record: that test pins the exact sentence being corrected here, so leaving it as it
is would mean pinning the defect. The case keeps its purpose — the first half is quoted verbatim and the
model is told not to repeat it — and gains the part that was missing.

Replace:

```ts
  it('nửa đầu được trích NGUYÊN VĂN và mô hình được dặn đừng lặp lại', () => {
    const p = build({ previousFragment: 'Chúng tôi rất vinh dự được đón tiếp' })
    expect(p).toContain('CONTINUATION')
    expect(p).toContain('First half, already translated and shown to the audience:\nChúng tôi rất vinh dự được đón tiếp')
    expect(p).toContain('Do NOT repeat, re-translate, or summarise the first half')
  })
```

with

```ts
  it('nửa đầu được trích NGUYÊN VĂN, nói rõ đó là TIẾNG NGUỒN, và mô hình được dặn đừng lặp lại', () => {
    const p = build({ previousFragment: 'Chúng tôi rất vinh dự được đón tiếp' })
    expect(p).toContain('CONTINUATION')
    expect(p).toContain('First half, exactly as the recogniser heard it — SOURCE language, NOT a translation:\nChúng tôi rất vinh dự được đón tiếp')
    expect(p).toContain('Do NOT repeat, re-translate, or summarise the first half')
    // Cái nhãn cũ ("already translated") nói sai sự thật: chuỗi này là transcript tiếng nguồn.
    expect(p).not.toContain('First half, already translated')
  })
```

The file's test count does not change: 26 cases before, 26 after.

## 10.3 Tests — new file `tests/continuationPolicy.test.ts`, **10 cases**

`const { buildRefinePrompt } = await import('../server/online-api.mjs')`, and a `build` helper with the
same minimal arguments `tests/serverAsr.test.ts` uses (`sessionTerms: []`, `recentFinals: []`).

**`describe('the label is honest')`**

1. With a `previousFragment`, the prompt contains
   `'SOURCE language, NOT a translation'` and the fragment verbatim on the next line.
2. The old label is gone from the whole server file: read `server/online-api.mjs` and assert it does not
   contain `'already translated and shown to the audience'`.
3. The model is told explicitly that it is not being shown the translation: the prompt contains
   `'you are NOT being shown the translation'`.

**`describe('the three ways it went wrong on 01/08')`**

4. Copying: the prompt contains `'Never copy any of its words, in any language, into target_final'`.
5. Re-translating: it still contains `'Do NOT repeat, re-translate, or summarise the first half'`.
6. Treating the source half as a model of the output: it contains
   `'never an example of what the target language should look like'`.

**`describe('nothing else moved')`**

7. Without `previousFragment`, no `CONTINUATION` block appears at all.
8. Order is unchanged: `CONTINUATION` still sits above `Source transcript:`.
9. Both patches together still apply in the documented order: with `sourceIsFragment` and a
   `previousFragment`, `CONTINUATION` sits above `UNFINISHED FRAGMENT`, which sits above
   `Source transcript:`.
10. The lane really is sending source text, so the new label is the true one: read `onlineLane.ts` and
    assert it contains `pendingFragmentTail = fragment && reason !== 'turn-end' ? head : '';` and
    `previousFragment: cont.previousFragment || undefined,` — `head` being the transcript, never a
    translated string.

Running total after this task: 459 + 10 = **469**.

---

# TASK 11 — Confident, wrong kanji at a cut edge

**Why.** On 01/08 a half-heard fragment came out as **東立二十少年記念** where the speaker said
**創立二十周年記念** — "twentieth anniversary of the founding" rendered as characters that mean nothing of
the kind. The refine prompt tells the model to produce Japanese and gives it no way to say *"I am not sure
how this is written."* Faced with half a compound word it does what it is asked to do: it picks
plausible-looking kanji.

Wrong kanji is worse than it looks in two separate ways at once. On the audience wall it is a **different
word**, not a typo — nobody reading it can recover the intended one. And the voice reads it aloud with the
**wrong pronunciation**, so the error leaves the screen and enters the hall.

Kana has neither problem: it is always read correctly and it is understood as "written phonetically".
So the prompt gains an explicit permission to fall back to kana, plus the specific warning for the place
this happens most — the edge of a cut fragment, which is exactly where a compound word gets sliced in
half.

## 11.1 `server/online-api.mjs` — the standing rule

Replace:

```js
      '- If uncertain about a name, keep the lower-risk surface form instead of inventing one.',
```

with

```js
      '- If uncertain about a name, keep the lower-risk surface form instead of inventing one.',
      '- NEVER guess kanji. When the target language is Japanese and you are not certain of the written form of a word — a partially heard compound, a place or company name, anything at the edge of a cut fragment — write it in kana (hiragana for a native word, katakana for a foreign one) instead of choosing plausible-looking characters. Wrong kanji fails twice over: on screen it is a DIFFERENT word rather than a misspelling, and the voice reads it aloud with the wrong pronunciation. Kana is always read correctly. Use kanji only for wording you are confident of, or that appears in the session terms, the known-mishearing list, or the recent subtitles above.',
```

## 11.2 `server/online-api.mjs` — the rule at the cut edge

Replace:

```js
    targetLanguage.startsWith('ja')
      ? '- In Japanese: do NOT close the fragment with です/ます/だ or a sentence-final particle, and do not add 。 at the end. Use the continuing form (て/で, が, ので, 連用形) that a speaker would use mid-sentence.'
      : '- In Vietnamese: do not add a closing particle or a full stop, and do not add a subject, verb, or object that the fragment does not contain.',
```

with

```js
    targetLanguage.startsWith('ja')
      ? '- In Japanese: do NOT close the fragment with です/ます/だ or a sentence-final particle, and do not add 。 at the end. Use the continuing form (て/で, が, ので, 連用形) that a speaker would use mid-sentence.\n- A cut fragment is exactly where a compound word gets sliced in half, and half a compound written in kanji becomes a different word: 創立二十周年記念 heard only part-way through must never come back as 東立二十少年記念. Wherever the fragment stops mid-word, or wherever you cannot be certain which characters the speaker meant, write that part in kana.'
      : '- In Vietnamese: do not add a closing particle or a full stop, and do not add a subject, verb, or object that the fragment does not contain.',
```

## 11.3 Tests — new file `tests/kanaGuard.test.ts`, **8 cases**

`const { buildRefinePrompt } = await import('../server/online-api.mjs')`, same minimal `build` helper as
`tests/serverAsr.test.ts`.

1. Every prompt carries the standing rule: a `ja` target prompt contains `'NEVER guess kanji'`.
2. Both costs are named, because either one alone would sound like a style preference: the prompt contains
   `'a DIFFERENT word rather than a misspelling'` and `'the voice reads it aloud with the wrong pronunciation'`.
3. The rule sits above the transcript, where the model reads it before the words:
   `p.indexOf('NEVER guess kanji') < p.indexOf('Source transcript:')`.
4. The permission is bounded, not blanket: the prompt names the three places kanji IS trusted — session
   terms, the known-mishearing list, recent subtitles.
5. The cut-edge rule fires on a Japanese fragment: `build({ sourceIsFragment: true, targetLanguage: 'ja' })`
   contains `'創立二十周年記念'` and `'東立二十少年記念'` — the real pair from 01/08, kept in the prompt so
   the instruction is concrete rather than abstract.
6. It does not fire on a Vietnamese target: `build({ sourceIsFragment: true, targetLanguage: 'vi' })`
   contains neither of those strings.
7. It does not fire on a whole sentence: `build({ targetLanguage: 'ja' })` (no `sourceIsFragment`) does not
   contain `'創立二十周年記念'`, while still containing `'NEVER guess kanji'`.
8. It does not contradict the katakana rule for foreign names: a `ja` prompt contains both
   `'NEVER guess kanji'` and `'ALWAYS render non-Japanese person and organization names in katakana'`.

Running total after this task: 469 + 8 = **477**.

---

# TASK 12 — Show the vendor's language-detection echo

**Why.** The whole one-microphone-two-directions mechanism rests on the vendor tagging each final with the
language it heard. The codec already reads the handshake's answer — `include_language_detection` comes back
in the `session_started` config and `asrTransport.ts` puts it on the `session.created` event as
`languageDetection`. **The lane then ignores it.** Nothing reads that field, so if the vendor ever
silently declines the request, the console shows a session that looks perfectly healthy while every
sentence is routed blind.

The console already prints the neighbouring answer on the same line — `máy nghe: ja+vi`, what the
recogniser *agreed to listen for*. This adds the second half of that same handshake reply next to it. It
also makes TASK 4's decision auditable at run time: the reason the hall-babble filter was removed is that
it turns this very field off.

## 12.1 `onlineLane.ts` — read the field, keep it, report it

**(a)** Replace:

```ts
  asrLanguages: string | null; // what the recogniser AGREED to listen for; null = free auto-detect
```

with

```ts
  asrLanguages: string | null; // what the recogniser AGREED to listen for; null = free auto-detect
  // The OTHER half of the same handshake reply: did the recogniser accept language detection? The
  // timestamped final's `language_code` is the evidence the two-way router runs on, and it only exists
  // when this is true. `null` = the vendor said nothing either way.
  asrLanguageDetection: boolean | null;
```

**(b)** Replace:

```ts
  let asrLanguages: string | null = null;
```

with

```ts
  let asrLanguages: string | null = null;
  let asrLanguageDetection: boolean | null = null;
```

**(c)** Replace:

```ts
        const langs = Array.isArray(msg.asrLanguages) ? msg.asrLanguages.filter((l) => typeof l === 'string') : [];
        asrLanguages = langs.length ? langs.join('+') : null;
```

with

```ts
        const langs = Array.isArray(msg.asrLanguages) ? msg.asrLanguages.filter((l) => typeof l === 'string') : [];
        asrLanguages = langs.length ? langs.join('+') : null;
        // The codec has been putting this on the event since language detection was introduced and nothing
        // has ever read it. Without it, a vendor that silently declines detection produces a session that
        // looks healthy on screen while every sentence is routed with no evidence at all.
        asrLanguageDetection = typeof msg.languageDetection === 'boolean' ? msg.languageDetection : null;
```

**(d)** Replace:

```ts
      asrLanguages,
```

with

```ts
      asrLanguages,
      asrLanguageDetection,
```

**(e)** Replace:

```ts
    asrLanguages = null;
```

with

```ts
    asrLanguages = null;
    asrLanguageDetection = null;
```

## 12.2 `OnlineConsole.tsx` — on the line that already says the other half

Replace:

```tsx
                    <div>máy nghe: {diag.asrLanguages ?? 'tự do (mọi thứ tiếng)'} · nhãn {diag.vendorTags}</div>
```

with

```tsx
                    {/* TASK 12: `nhận diện tiếng` is the second half of the same handshake reply. It is the
                        one that decides whether two-way works at all: without it no final carries a
                        language tag, and the direction of every sentence is a guess. Red when the vendor
                        said no while two-way is switched on — that combination cannot work. */}
                    <div>
                      máy nghe: {diag.asrLanguages ?? 'tự do (mọi thứ tiếng)'} · nhãn {diag.vendorTags} · nhận diện tiếng:{' '}
                      <span className={diag.asrLanguageDetection === false && lane.twoWay ? 'text-error font-semibold' : ''}>
                        {diag.asrLanguageDetection === null ? 'chưa rõ' : diag.asrLanguageDetection ? 'có' : 'KHÔNG'}
                      </span>
                    </div>
```

## 12.3 Tests — new file `tests/languageDetectionEcho.test.ts`, **10 cases**

`import { createAsrCodec } from '../src/lib/lanes/online/asrTransport'` plus source guards on
`onlineLane.ts` and `OnlineConsole.tsx`.

**`describe('the codec already had it')`**

1. `session_started` with `config.include_language_detection: true` → the decoded event carries
   `languageDetection: true`.
2. The string `'true'` counts the same as the boolean — the vendor has been observed sending both.
3. `false` → `languageDetection: false` on the event (not omitted, because "declined" is information).
4. The field absent → the event has no `languageDetection` key at all, which is what the lane reads as
   `null`.

**`describe('the lane now reads it')`**

5. `OnlineDiagnostics` declares `asrLanguageDetection: boolean | null;`.
6. The `session.created` branch assigns it: `onlineLane.ts` contains
   `asrLanguageDetection = typeof msg.languageDetection === 'boolean' ? msg.languageDetection : null;`.
7. It is reported: the diagnostics object literal contains `asrLanguageDetection,` on its own line.
8. It is reset at start, right beside `asrLanguages = null;` — assert both appear in that order within
   twenty characters of each other.

**`describe('the console says it')`**

9. `OnlineConsole.tsx` renders `nhận diện tiếng` on the same `<div>` as `máy nghe:`, and prints `KHÔNG`
   for the declined case.
10. It turns red only when it actually matters: the file contains
    `diag.asrLanguageDetection === false && lane.twoWay` together with `text-error`.

Running total after this task: 477 + 10 = **487**.

---

# TASK 13 — Per-meeting speech rhythm, riding the request that already exists

**Why.** How long the recogniser waits in silence before deciding a sentence is over is fixed for every
room and every speaker (`SCRIBE_VAD_SILENCE_SECS`, 1.5 s). An internal meeting where people think mid-
sentence and a ceremony where an MC reads without pausing are not the same problem, and the 01/08
rehearsal showed both failure modes: sentences cut early on a thinking pause, and sentences run together
when the reading was continuous. This is a knob the technician needs before each meeting, and it is not
one Sếp should have to think about — three named steps, no numbers.

**No new endpoint.** `POST /online-api/realtime-preview-token` already takes a per-session JSON body, and
the server already has the pattern for exactly this: `roomFilter` is three-state and the response reports
the value that was actually **applied**, never the one requested. The pause follows that pattern line for
line — the client may send a number, the server clamps it to a safe range, and the response says what the
handshake really carries.

Range: **0.6 s to 3.0 s**. Below 0.6 the recogniser cuts inside ordinary speech; above 3.0 the audience is
watching a blank wall while somebody talks.

## 13.1 New file `src/lib/lanes/online/speechRhythm.ts`

```ts
// src/lib/lanes/online/speechRhythm.ts — "nhịp nói của buổi": how long a silence has to last before the
// recogniser decides the sentence is over.
//
// Three named steps, never a number, because the person setting this before a ceremony is not going to
// reason about seconds of silence. The middle step deliberately sends NOTHING, so the server's own
// configured default stays in charge unless somebody actively chooses otherwise — the same three-state
// shape the room-filter request used.
//
// The clamp lives here AND on the server. The server's copy is the one that matters (a client can send
// anything); this one exists so the console can show the operator the value that will really be used.

export type SpeechRhythm = 'slow' | 'normal' | 'fast';

export const SPEECH_RHYTHM_KEY = 'proyaku_online_speech_rhythm';
export const SPEECH_RHYTHM_DEFAULT: SpeechRhythm = 'normal';

// Below 0.6 s the recogniser cuts inside ordinary speech; above 3.0 s the audience watches a blank wall
// while somebody is talking. Both ends are the operator's protection, not a vendor limit.
export const PAUSE_SECS_MIN = 0.6;
export const PAUSE_SECS_MAX = 3.0;

export const SPEECH_RHYTHM_OPTIONS: readonly {
  value: SpeechRhythm;
  label: string;
  /** what to send; `undefined` means "say nothing and let the server's own setting stand" */
  secs: number | undefined;
  hint: string;
}[] = [
  {
    value: 'slow',
    label: 'Người nói chậm, hay ngắt',
    secs: 2.4,
    hint: 'Họp nội bộ, người phát biểu vừa nghĩ vừa nói. Máy chờ lâu hơn nên câu ít bị cắt giữa chừng.',
  },
  {
    value: 'normal',
    label: 'Bình thường',
    secs: undefined,
    hint: 'Giữ nguyên cài đặt sẵn của máy chủ. Chọn cái này nếu không chắc.',
  },
  {
    value: 'fast',
    label: 'MC nói liền mạch',
    secs: 0.9,
    hint: 'Lễ, MC đọc theo kịch bản, gần như không ngắt. Máy chốt câu sớm hơn nên phụ đề lên nhanh hơn.',
  },
];

export function isSpeechRhythm(v: unknown): v is SpeechRhythm {
  return v === 'slow' || v === 'normal' || v === 'fast';
}

export function loadSpeechRhythm(): SpeechRhythm {
  try {
    const raw = localStorage.getItem(SPEECH_RHYTHM_KEY);
    return isSpeechRhythm(raw) ? raw : SPEECH_RHYTHM_DEFAULT;
  } catch {
    return SPEECH_RHYTHM_DEFAULT; // private mode
  }
}

export function saveSpeechRhythm(v: SpeechRhythm): void {
  try { localStorage.setItem(SPEECH_RHYTHM_KEY, v); } catch { /* private mode */ }
}

export function speechRhythmLabel(v: SpeechRhythm): string {
  return SPEECH_RHYTHM_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

/** What this step sends on the wire. `undefined` = send nothing. */
export function rhythmPauseSecs(v: SpeechRhythm): number | undefined {
  return SPEECH_RHYTHM_OPTIONS.find((o) => o.value === v)?.secs;
}

/** The same rule the server applies. `undefined` in, or anything not a finite number, `undefined` out. */
export function clampPauseSecs(v: unknown): number | undefined {
  const n = Number(v);
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) return undefined;
  return Math.min(PAUSE_SECS_MAX, Math.max(PAUSE_SECS_MIN, n));
}
```

## 13.2 `server/online-api.mjs` — clamp it, apply it, report what was applied

**(a)** Replace:

```js
// Build the handshake query. `roomFilter` is THREE-STATE (TASK 11.13): true → set the parameter; false →
// set nothing (vendor default is off; keeps demo byte-parity AND beats a server env that says on);
// undefined → fall back to SCRIBE_FILTER_BACKGROUND. Returns the params + the value that ACTUALLY ended
// up in the handshake, so the token response can report the applied value (never the requested one).
export function buildScribeWsParams({ token, language, keyterms, roomFilter }) {
  const p = new URLSearchParams();
  p.set('model_id', SCRIBE_MODEL_ID);
  p.set('token', token);
  p.set('commit_strategy', 'vad');
  p.set('vad_silence_threshold_secs', String(SCRIBE_VAD_SILENCE_SECS));
```

with

```js
// Below 0.6 s the recogniser cuts inside ordinary speech; above 3.0 s the audience watches a blank wall
// while somebody is talking. A client may ask for anything; this is what it can actually get.
const PAUSE_SECS_MIN = 0.6;
const PAUSE_SECS_MAX = 3;

// Build the handshake query. `roomFilter` is THREE-STATE (TASK 11.13): true → set the parameter; false →
// set nothing (vendor default is off; keeps demo byte-parity AND beats a server env that says on);
// undefined → fall back to SCRIBE_FILTER_BACKGROUND. Returns the params + the value that ACTUALLY ended
// up in the handshake, so the token response can report the applied value (never the requested one).
//
// `vadSilenceSecs` is the same shape (TASK 13): a finite number is clamped and used; anything else falls
// back to SCRIBE_VAD_SILENCE_SECS, so a client that never sends the field behaves exactly as before.
export function buildScribeWsParams({ token, language, keyterms, roomFilter, vadSilenceSecs }) {
  const p = new URLSearchParams();
  p.set('model_id', SCRIBE_MODEL_ID);
  p.set('token', token);
  p.set('commit_strategy', 'vad');
  const vadApplied = Number.isFinite(Number(vadSilenceSecs)) && vadSilenceSecs !== null && vadSilenceSecs !== ''
    ? Math.min(PAUSE_SECS_MAX, Math.max(PAUSE_SECS_MIN, Number(vadSilenceSecs)))
    : SCRIBE_VAD_SILENCE_SECS;
  p.set('vad_silence_threshold_secs', String(vadApplied));
```

**(b)** Replace:

```js
  return { params: p, filterApplied };
}
```

with

```js
  return { params: p, filterApplied, vadApplied };
}
```

**(c)** Replace:

```js
        const roomFilter = typeof body?.roomFilter === 'boolean' ? body.roomFilter : undefined;
```

with

```js
        const roomFilter = typeof body?.roomFilter === 'boolean' ? body.roomFilter : undefined;
        // TASK 13: the meeting's speech rhythm. Rides this body rather than a new endpoint — the token
        // request is already the one per-session call, and this is a per-session setting. Anything that
        // is not a finite number is left undefined so the server's own default stands.
        const pauseSecs = typeof body?.pauseSecs === 'number' && Number.isFinite(body.pauseSecs) ? body.pauseSecs : undefined;
```

**(d)** Replace:

```js
          const { params, filterApplied } = buildScribeWsParams({ token, language, keyterms: kept, roomFilter });
          const asrWsUrl = `${SCRIBE_WS_BASE}${SCRIBE_WS_PATH}?${params.toString()}`;
          logLine('asr.session', { asrKeytermCount: kept.length, asrKeytermsDropped: dropped, asrRoomFilter: filterApplied }); // counts only — no term text, no URL, no token
```

with

```js
          const { params, filterApplied, vadApplied } = buildScribeWsParams({ token, language, keyterms: kept, roomFilter, vadSilenceSecs: pauseSecs });
          const asrWsUrl = `${SCRIBE_WS_BASE}${SCRIBE_WS_PATH}?${params.toString()}`;
          logLine('asr.session', { asrKeytermCount: kept.length, asrKeytermsDropped: dropped, asrRoomFilter: filterApplied, asrVadSilenceSecs: vadApplied }); // counts only — no term text, no URL, no token
```

**(e)** Replace:

```js
            asrRoomFilter: filterApplied,
            asrWsUrl,
```

with

```js
            asrRoomFilter: filterApplied,
            // The APPLIED pause, never the requested one — an operator who asks for something out of
            // range must be able to see what they actually got.
            asrVadSilenceSecs: vadApplied,
            asrWsUrl,
```

## 13.3 `asrTransport.ts` — carry it there and bring the answer back

> **Apply TASK 4 before this section.** Block (b) below quotes the request body **as TASK 4 leaves it**,
> not as it stands at `3afcee3`. Every other block in this task quotes `3afcee3` directly.

**(a)** Replace:

```ts
export interface AsrSession {
  transport: AsrTransport;
  url: string;
  commitMode: 'vad';
}
```

with

```ts
export interface AsrSession {
  transport: AsrTransport;
  url: string;
  commitMode: 'vad';
  /** TASK 13: the silence-to-end-of-sentence the handshake ACTUALLY carries, after the server's clamp. */
  pauseSecs?: number;
}
```

**(b)** Replace (this is TASK 4's text):

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

with

```ts
  corpus: string;
  /** TASK 13: undefined means "say nothing", and the server's own default stands. */
  pauseSecs?: number;
}): Promise<AsrSession> {
  const res = await fetch(`${ONLINE_BASE}/realtime-preview-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // The hall-babble filter used to ride here as `roomFilter`. It is gone from the client: the vendor
    // refuses that filter whenever timestamps are on, and the timestamped final is what carries the
    // language label. Sending NOTHING is the safe default — the server reads an absent field as "fall
    // back to the env", and that env is off unless somebody deliberately turns it on.
    // `pauseSecs: undefined` drops out of JSON.stringify by itself, which is the same "absent" case.
    body: JSON.stringify({
      targetLanguage: opts.targetLanguage,
      language: opts.language,
      corpus: opts.corpus,
      pauseSecs: opts.pauseSecs,
    }),
  });
```

**(c)** Replace:

```ts
  const data = (await res.json()) as { mode?: string; asrTransport?: string; asrWsUrl?: string };
```

with

```ts
  const data = (await res.json()) as { mode?: string; asrTransport?: string; asrWsUrl?: string; asrVadSilenceSecs?: number };
```

**(d)** Replace:

```ts
  return { transport: 'direct', url: String(data.asrWsUrl ?? ''), commitMode: 'vad' };
```

with

```ts
  return {
    transport: 'direct',
    url: String(data.asrWsUrl ?? ''),
    commitMode: 'vad',
    ...(typeof data.asrVadSilenceSecs === 'number' ? { pauseSecs: data.asrVadSilenceSecs } : {}),
  };
```

## 13.4 `onlineLane.ts` — a ticket-time getter and one more diagnostic

**(a)** Replace:

```ts
  // TASK 6.2: one mic, two directions — read ONCE at start() and latched for the whole session.
  getTwoWay?: () => boolean;
  onDirectedLine?: (line: DirectedLaneLine) => void;
```

with

```ts
  // TASK 6.2: one mic, two directions — read ONCE at start() and latched for the whole session.
  getTwoWay?: () => boolean;
  onDirectedLine?: (line: DirectedLaneLine) => void;
  // TASK 13: the meeting's speech rhythm, as seconds of silence. Read at TICKET time, like every other
  // handshake parameter — it is baked into the single-use URL, so a change mid-session takes effect from
  // the next dial. `undefined` means "say nothing" and the server's own default stands.
  getPauseSecs?: () => number | undefined;
```

**(b)** Replace:

```ts
  vendorTags: number; // finals that arrived carrying the recogniser's own language verdict
```

with

```ts
  vendorTags: number; // finals that arrived carrying the recogniser's own language verdict
  // TASK 13 — the silence-to-end-of-sentence the current handshake ACTUALLY carries, after the server's
  // clamp. `null` before the first successful dial. This is the applied value, never the requested one.
  asrPauseSecs: number | null;
```

**(c)** Replace:

```ts
  let vendorTags = 0;
```

with

```ts
  let vendorTags = 0;
  let asrPauseSecs: number | null = null;
```

**(d)** Replace:

```ts
        targetLanguage: opts!.targetLanguage,
        language: twoWay ? 'auto' : opts!.sourceLanguage,
```

with

```ts
        targetLanguage: opts!.targetLanguage,
        language: twoWay ? 'auto' : opts!.sourceLanguage,
        pauseSecs: config.getPauseSecs?.(),
```

**(e)** Replace:

```ts
    codec = session.transport === 'direct' ? createAsrCodec(initial ? undefined : (lastFinalForReconnect || undefined)) : null;
```

with

```ts
    codec = session.transport === 'direct' ? createAsrCodec(initial ? undefined : (lastFinalForReconnect || undefined)) : null;
    asrPauseSecs = typeof session.pauseSecs === 'number' ? session.pauseSecs : null;
```

**(f)** Replace:

```ts
    vendorTags = 0;
```

with

```ts
    vendorTags = 0;
    asrPauseSecs = null;
```

**(g)** Replace:

```ts
      vendorTags,
```

with

```ts
      vendorTags,
      asrPauseSecs,
```

## 13.5 `index.ts` (facade)

**(a)** Replace:

```ts
export { SUBTITLE_FONT } from '../../audienceSubtitles'
```

with

```ts
export { SUBTITLE_FONT } from '../../audienceSubtitles'
// TASK 13 — "nhịp nói của buổi". The console picks the step; the lane sends the seconds.
export type { SpeechRhythm } from './speechRhythm'
export {
  SPEECH_RHYTHM_KEY, SPEECH_RHYTHM_DEFAULT, SPEECH_RHYTHM_OPTIONS, PAUSE_SECS_MIN, PAUSE_SECS_MAX,
  isSpeechRhythm, loadSpeechRhythm, saveSpeechRhythm, speechRhythmLabel, rhythmPauseSecs, clampPauseSecs,
} from './speechRhythm'
```

**(b)** Add the import. Replace:

```ts
} from './audienceWindows'

export type { LaneLine, LaneStatus } from '../types'
```

with

```ts
} from './audienceWindows'
import { loadSpeechRhythm, rhythmPauseSecs, saveSpeechRhythm, type SpeechRhythm } from './speechRhythm'

export type { LaneLine, LaneStatus } from '../types'
```

**(c)** Replace:

```ts
  script: ScriptMatcherEntry[]
  setScript: (rows: ScriptMatcherEntry[]) => void
```

with

```ts
  script: ScriptMatcherEntry[]
  setScript: (rows: ScriptMatcherEntry[]) => void
  // TASK 13 — the meeting's speech rhythm, persisted per machine.
  speechRhythm: SpeechRhythm
  setSpeechRhythm: (v: SpeechRhythm) => void
```

**(d)** Replace:

```ts
  const [script, setScript] = useState<ScriptMatcherEntry[]>([])
```

with

```ts
  const [script, setScript] = useState<ScriptMatcherEntry[]>([])
  const [speechRhythm, setSpeechRhythmState] = useState<SpeechRhythm>(() => loadSpeechRhythm())
```

**(e)** Replace:

```ts
  const scriptRef = useRef<ScriptMatcherEntry[]>([])
  scriptRef.current = script
```

with

```ts
  const scriptRef = useRef<ScriptMatcherEntry[]>([])
  scriptRef.current = script
  const speechRhythmRef = useRef<SpeechRhythm>('normal')
  speechRhythmRef.current = speechRhythm
  const setSpeechRhythm = useCallback((v: SpeechRhythm) => { setSpeechRhythmState(v); saveSpeechRhythm(v) }, [])
```

**(f)** Replace:

```ts
        getScript: () => scriptRef.current,
```

with

```ts
        getScript: () => scriptRef.current,
        // TASK 13: read at ticket time, so changing the step applies from the next dial.
        getPauseSecs: () => rhythmPauseSecs(speechRhythmRef.current),
```

**(g)** Replace:

```ts
    voices, voicesStatus, refreshVoices, voiceJa, setVoiceJa, voiceVi, setVoiceVi,
```

with

```ts
    speechRhythm, setSpeechRhythm,
    voices, voicesStatus, refreshVoices, voiceJa, setVoiceJa, voiceVi, setVoiceVi,
```

## 13.6 `OnlineConsole.tsx` — three named steps in "Nguồn vào"

Extend the facade import on line 16 with `SPEECH_RHYTHM_OPTIONS` and the type `SpeechRhythm`.

Replace:

```tsx
              </section>

              <div className="h-px bg-outline-variant"></div>

              {/* Chiều dịch */}
```

with

```tsx
                <div>
                  <label htmlFor="online-console-rhythm" className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">
                    Nhịp nói của buổi
                  </label>
                  <select id="online-console-rhythm" value={lane.speechRhythm} onChange={(e) => lane.setSpeechRhythm(e.target.value as SpeechRhythm)} disabled={lane.running} className={SELECT_CLS}>
                    {SPEECH_RHYTHM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="text-[11px] leading-relaxed text-on-surface-variant/80 mt-1">
                    {SPEECH_RHYTHM_OPTIONS.find((o) => o.value === lane.speechRhythm)?.hint}
                    {diag?.asrPauseSecs != null && <> Máy đang chờ <strong className="tabular-nums">{diag?.asrPauseSecs}s</strong> im lặng rồi mới chốt câu.</>}
                  </p>
                </div>
              </section>

              <div className="h-px bg-outline-variant"></div>

              {/* Chiều dịch */}
```

`diag` is the file's existing `const diag = lane.diagnostics` — do not introduce a second name for it.
It is **nullable**, and this line sits in "Nguồn vào", outside the `{diag ? (` guard that wraps the
Chẩn đoán block, so it is read with `?.` here exactly like the other readers in the same half of the
file (`diag?.latency`, `diag?.ttsQueueLength`). Before the session starts there are no diagnostics, and
a plain `diag.` would throw on the first render of the drawer.

## 13.7 Tests — new file `tests/speechRhythm.test.ts`, **18 cases**

`import * as rhythm from '../src/lib/lanes/online/speechRhythm'`,
`const { buildScribeWsParams } = await import('../server/online-api.mjs')`, plus source guards.

**`describe('the three steps')`**

1. `SPEECH_RHYTHM_OPTIONS` has exactly three entries, in the order `slow`, `normal`, `fast`.
2. The middle step sends nothing: `rhythmPauseSecs('normal')` is `undefined`.
3. The two ends are inside the clamp: `rhythmPauseSecs('slow') === 2.4`, `rhythmPauseSecs('fast') === 0.9`,
   and both sit between `PAUSE_SECS_MIN` and `PAUSE_SECS_MAX`.
4. `PAUSE_SECS_MIN === 0.6` and `PAUSE_SECS_MAX === 3`.
5. `isSpeechRhythm` accepts the three and rejects `'auto'`, `''`, `null`, `2.4`.
6. `saveSpeechRhythm` then `loadSpeechRhythm` round-trips through one key; a junk value already in storage
   loads as `SPEECH_RHYTHM_DEFAULT` rather than throwing.
7. `clampPauseSecs` clamps both ends (`0.1 → 0.6`, `9 → 3`) and passes an in-range value through.
8. `clampPauseSecs` returns `undefined` for `undefined`, `null`, `''` and `NaN`.

**`describe('the server has the last word')`**

9. No `vadSilenceSecs` → the env default: `vadApplied === 1.5` and
   `params.get('vad_silence_threshold_secs') === '1.5'`.
10. `vadSilenceSecs: 2.4` → the parameter is `'2.4'` and `vadApplied === 2.4`.
11. Too high (`9`) → clamped to `3`.
12. Too low (`0.1`) → clamped to `0.6`.
13. Junk (`'fast'`, `null`, `NaN`) → the env default, never `NaN` in the query string.
14. Client and server agree: for `[0.1, 0.6, 0.9, 1.5, 2.4, 3, 9]`, `clampPauseSecs(x)` equals the
    `vadApplied` returned by `buildScribeWsParams({ …base, vadSilenceSecs: x })`.

**`describe('the wire')`**

15. `asrTransport.ts` sends it and reads the answer: the file contains `pauseSecs: opts.pauseSecs,`,
    `asrVadSilenceSecs?: number`, and `pauseSecs: data.asrVadSilenceSecs`.
16. The lane asks at ticket time and stores the applied value: `onlineLane.ts` contains
    `pauseSecs: config.getPauseSecs?.(),` and
    `asrPauseSecs = typeof session.pauseSecs === 'number' ? session.pauseSecs : null;`, and
    `asrPauseSecs: number | null;` is on `OnlineDiagnostics`.
17. The facade persists it under exactly one key and wires the getter: `index.ts` contains
    `getPauseSecs: () => rhythmPauseSecs(speechRhythmRef.current),`, and `speechRhythm.ts` is the only
    file under `src/` containing `'proyaku_online_speech_rhythm'`.
18. No new endpoint was added: `server/online-api.mjs` still has exactly **10** occurrences of
    `pathname === '/online-api/` — count them with a global regex and assert the number, so a future
    "small extra endpoint" cannot slip in unnoticed.

Running total after this task: 487 + 18 = **505**.

---

# TASK 14 — The saved transcript records which meeting, which direction, and which lines came from the script

**Why.** The file written by "Lưu transcript" says the session's source and target language once, in the
header, and repeats that same pair on every line. In two-way mode that is simply wrong: half the sentences
went the other way, and the file claims they did not. It also does not say **which meeting** it belongs to
— a folder of `online_20260808-*.json` files with no event inside them cannot be sorted out afterwards —
and it does not distinguish a sentence answered word-for-word by the approved script from one the model
translated. All three are needed the moment anybody looks at these files a week later.

**This is three fields, not a feature.** No history page, no new endpoint, no new route: the record that is
already being written gains what it is missing.

## 14.1 `sessionExport.ts`

**(a)** Replace:

```ts
export interface SessionLine {
  lid: string;
  at: number; // finalize time (ms epoch)
  sourceText: string;
  targetText: string;
  sourceLanguage: 'vi' | 'ja';
  targetLanguage: 'vi' | 'ja';
}

export interface SessionMeta {
  startedAt: number; // ms epoch — drives the (stable) filename
  endedAt: number; // ms epoch
  sourceLanguage: 'vi' | 'ja';
  targetLanguage: 'vi' | 'ja';
}
```

with

```ts
export interface SessionLine {
  lid: string;
  at: number; // finalize time (ms epoch)
  sourceText: string;
  targetText: string;
  // TASK 14: PER UTTERANCE, not per session. In two-way mode half the sentences travel the other way, and
  // the header's single pair described none of them correctly.
  sourceLanguage: 'vi' | 'ja';
  targetLanguage: 'vi' | 'ja';
  dir: 'vi2ja' | 'ja2vi';
  // TASK 14: true when the approved script answered this sentence word for word, so a reader can tell the
  // human wording from the machine's. Absent means the normal path.
  fromScript?: boolean;
}

export interface SessionMeta {
  startedAt: number; // ms epoch — drives the (stable) filename
  endedAt: number; // ms epoch
  sourceLanguage: 'vi' | 'ja';
  targetLanguage: 'vi' | 'ja';
  // TASK 14: which meeting this transcript belongs to. Empty when no meeting was selected — a folder of
  // files named only by timestamp cannot be sorted out a week later.
  eventId?: string;
}
```

**(b)** Replace:

```ts
  const json = JSON.stringify(
    {
      startedAt: new Date(meta.startedAt).toISOString(),
      endedAt: new Date(meta.endedAt).toISOString(),
      sourceLanguage: meta.sourceLanguage,
      targetLanguage: meta.targetLanguage,
      lines,
    },
    null,
    2,
  );
  const header = '| Time | Source | Translation |\n| --- | --- | --- |';
  const rows = lines.map((l) => `| ${hhmmss(l.at)} | ${mdCell(l.sourceText)} | ${mdCell(l.targetText)} |`);
```

with

```ts
  const json = JSON.stringify(
    {
      startedAt: new Date(meta.startedAt).toISOString(),
      endedAt: new Date(meta.endedAt).toISOString(),
      sourceLanguage: meta.sourceLanguage,
      targetLanguage: meta.targetLanguage,
      // Omitted entirely when there is no meeting, rather than written as an empty string that later reads
      // like a meeting whose id happens to be blank.
      ...(meta.eventId ? { eventId: meta.eventId } : {}),
      lines,
    },
    null,
    2,
  );
  const header = '| Time | Dir | Source | Translation | Script |\n| --- | --- | --- | --- | --- |';
  const rows = lines.map((l) => `| ${hhmmss(l.at)} | ${l.dir} | ${mdCell(l.sourceText)} | ${mdCell(l.targetText)} | ${l.fromScript ? 'kịch bản' : ''} |`);
```

## 14.2 `onlineLane.ts`

> **(a) quotes text TASK 5 inserted.** Apply TASK 5 first. Blocks (b) to (f) quote `3afcee3` directly.

**(a)** Replace:

```ts
  getScript?: () => readonly ScriptMatcherEntry[] | undefined;
  // TASK 5: the misheard-substitution layer, read LIVE on every event — deliberately NOT latched at
```

with

```ts
  getScript?: () => readonly ScriptMatcherEntry[] | undefined;
  // TASK 14: which meeting the saved transcript belongs to. Read ONCE at start(), like the script.
  getEventId?: () => string | undefined;
  // TASK 5: the misheard-substitution layer, read LIVE on every event — deliberately NOT latched at
```

**(b)** Replace:

```ts
  let sessionStartedAt = 0;
  let sessionStartedISO = '';
```

with

```ts
  let sessionStartedAt = 0;
  let sessionStartedISO = '';
  let sessionEventId = ''; // TASK 14 — latched at start(), written into every save of this session
```

**(c)** Replace:

```ts
  function recordSessionLine(lid: string, at: number, sourceText: string, targetText: string): void {
    const o = opts;
    if (!o) return;
    sessionLines.set(lid, { lid, at, sourceText, targetText, sourceLanguage: o.sourceLanguage, targetLanguage: o.targetLanguage });
    sessionLinesVersion += 1;
  }
```

with

```ts
  // TASK 14: the direction is read from `dirLangs`, which SETTLED it at finalisation and keyed it on this
  // lid — not from `opts`, whose single pair described only the direction the operator started in. Nothing
  // at the call sites has to change: the same lid gives the same answer however often it is asked, which
  // is exactly what the refine path already relies on.
  function recordSessionLine(lid: string, at: number, sourceText: string, targetText: string, fromScript = false): void {
    const o = opts;
    if (!o) return;
    const dl = dirLangs(lid, sourceText, false);
    sessionLines.set(lid, {
      lid, at, sourceText, targetText,
      sourceLanguage: dl.source,
      targetLanguage: dl.target,
      dir: dl.dir,
      ...(fromScript ? { fromScript: true } : {}),
    });
    sessionLinesVersion += 1;
  }
```

**(d)** Replace:

```ts
    recordSessionLine(lid, finalizedAt, head, target);
    if (config.getSpeakEnabled?.()) void speakSnap(target, dl.target, lid, order);
```

with

```ts
    recordSessionLine(lid, finalizedAt, head, target, true); // answered by the approved script, word for word
    if (config.getSpeakEnabled?.()) void speakSnap(target, dl.target, lid, order);
```

**(e)** Replace:

```ts
    const exp = buildSessionExport(collectSessionLines(), {
      startedAt: sessionStartedAt || Date.now(),
      endedAt: Date.now(),
```

with

```ts
    const exp = buildSessionExport(collectSessionLines(), {
      eventId: sessionEventId || undefined,
      startedAt: sessionStartedAt || Date.now(),
      endedAt: Date.now(),
```

**(f)** Replace:

```ts
    sessionLines.clear();
    sessionLinesVersion = 0;
```

with

```ts
    sessionLines.clear();
    sessionLinesVersion = 0;
    sessionEventId = (config.getEventId?.() ?? '').trim(); // TASK 14 — latched with the script, for the same reason
```

## 14.3 `index.ts` (facade)

> **Every block in this section quotes text TASK 13 inserted**, because each one extends a line TASK 13
> wrote. Apply TASK 13 first and all five are found verbatim.

**(a)** Replace:

```ts
  // TASK 13 — the meeting's speech rhythm, persisted per machine.
  speechRhythm: SpeechRhythm
  setSpeechRhythm: (v: SpeechRhythm) => void
```

with

```ts
  // TASK 13 — the meeting's speech rhythm, persisted per machine.
  speechRhythm: SpeechRhythm
  setSpeechRhythm: (v: SpeechRhythm) => void
  // TASK 14 — which meeting the saved transcript belongs to. Set by the console from the same resolved
  // pointer the script is loaded from, so the file and the script can never disagree about the meeting.
  eventId: string
  setEventId: (v: string) => void
```

**(b)** Replace:

```ts
  const [speechRhythm, setSpeechRhythmState] = useState<SpeechRhythm>(() => loadSpeechRhythm())
```

with

```ts
  const [speechRhythm, setSpeechRhythmState] = useState<SpeechRhythm>(() => loadSpeechRhythm())
  const [eventId, setEventIdState] = useState('')
```

**(c)** Replace:

```ts
  const setSpeechRhythm = useCallback((v: SpeechRhythm) => { setSpeechRhythmState(v); saveSpeechRhythm(v) }, [])
```

with

```ts
  const setSpeechRhythm = useCallback((v: SpeechRhythm) => { setSpeechRhythmState(v); saveSpeechRhythm(v) }, [])
  const eventIdRef = useRef('')
  eventIdRef.current = eventId
  const setEventId = useCallback((v: string) => { setEventIdState(v) }, [])
```

**(d)** Replace:

```ts
        // TASK 13: read at ticket time, so changing the step applies from the next dial.
        getPauseSecs: () => rhythmPauseSecs(speechRhythmRef.current),
```

with

```ts
        // TASK 13: read at ticket time, so changing the step applies from the next dial.
        getPauseSecs: () => rhythmPauseSecs(speechRhythmRef.current),
        getEventId: () => eventIdRef.current,
```

**(e)** Replace:

```ts
    speechRhythm, setSpeechRhythm,
```

with

```ts
    speechRhythm, setSpeechRhythm, eventId, setEventId,
```

## 14.4 `OnlineConsole.tsx`

Replace:

```tsx
  const diag = lane.diagnostics
  const lat = diag?.latency
```

with

```tsx
  // TASK 14: the transcript records which meeting it belongs to, taken from the SAME resolved pointer the
  // script is loaded from — so a saved file and the script it was read against can never name two
  // different meetings.
  const setLaneEventId = lane.setEventId
  useEffect(() => { setLaneEventId(eventId) }, [eventId, setLaneEventId])

  const diag = lane.diagnostics
  const lat = diag?.latency
```

> `eventId` here is TASK 1's resolved pointer. Apply TASK 1 first; the two anchor lines are re-emitted
> unchanged by TASK 1, so this block still finds them.

## 14.5 `tests/sessionExport.test.ts` — the one existing test that pins the OLD header

**Why this file has to move too.** `tests/sessionExport.test.ts` builds its fixture from `SessionLine`
objects and asserts the exact markdown header:
`expect(exp.md.startsWith('| Time | Source | Translation |\n| --- | --- | --- |')).toBe(true)`. §14.1
gives that table two more columns and makes `dir` a required field of `SessionLine`, so the old assertion
is now false and the fixture no longer type-checks. Both changes are the point of this task, not a
regression — the test is describing the file format this task deliberately widens, so it moves with it, in
the same spirit as TASK 9 §9.3 and TASK 10 §10.2. **Two blocks, no `it(` added or removed** — the file
keeps all **3** of its cases, so the baseline count of 288 does not move.

**(a)** The fixture — every line needs the direction now, and the second one also exercises the script
flag. Replace:

```ts
  const lines: SessionLine[] = [
    { lid: 'online-1', at: at1, sourceText: 'Chi phí là 10.000 yên.', targetText: '費用は1万円です。', sourceLanguage: 'vi', targetLanguage: 'ja' },
    { lid: 'online-2', at: at1 + 5000, sourceText: 'A | B\nC', targetText: 'x', sourceLanguage: 'vi', targetLanguage: 'ja' },
  ]
```

with

```ts
  const lines: SessionLine[] = [
    // TASK 14: `dir` is part of every line now, so the fixture has to say it; the second line also carries
    // the script flag so the new last column has something to show.
    { lid: 'online-1', at: at1, sourceText: 'Chi phí là 10.000 yên.', targetText: '費用は1万円です。', sourceLanguage: 'vi', targetLanguage: 'ja', dir: 'vi2ja' },
    { lid: 'online-2', at: at1 + 5000, sourceText: 'A | B\nC', targetText: 'x', sourceLanguage: 'vi', targetLanguage: 'ja', dir: 'vi2ja', fromScript: true },
  ]
```

**(b)** The verdict. The two escaping assertions are unchanged — they were right before and are still
right; only the header line changes, and two cheap assertions are added for the two new columns. Replace:

```ts
  it('md is a table with HH:mm:ss and escapes | + collapses newlines', () => {
    expect(exp.md.startsWith('| Time | Source | Translation |\n| --- | --- | --- |')).toBe(true)
    expect(exp.md).toContain('| 09:08:30 |')
    expect(exp.md).toContain('A \\| B C') // pipe escaped, newline collapsed to a space
    expect(exp.md).not.toContain('A | B\nC')
  })
```

with

```ts
  it('md is a table with dir + script columns, HH:mm:ss, and escapes | + collapses newlines', () => {
    expect(exp.md.startsWith('| Time | Dir | Source | Translation | Script |\n| --- | --- | --- | --- | --- |')).toBe(true)
    expect(exp.md).toContain('| 09:08:30 | vi2ja |') // TASK 14: the direction sits between time and source
    expect(exp.md).toContain('| kịch bản |') // TASK 14: the script-answered line is marked as such
    expect(exp.md).toContain('A \\| B C') // pipe escaped, newline collapsed to a space
    expect(exp.md).not.toContain('A | B\nC')
  })
```

> The other two cases of this file — the filename case and the JSON case — are **unchanged and stay
> green**: the filename still derives from `startedAt` alone, and `eventId` is omitted entirely when the
> meta has none, so `parsed` keeps exactly the keys that case already checks.

## 14.6 Tests — new file `tests/sessionTranscriptFields.test.ts`, **12 cases**

`import { buildSessionExport, type SessionLine } from '../src/lib/lanes/online/sessionExport'` plus source
guards on `onlineLane.ts`, `index.ts`, `OnlineConsole.tsx`.

**`describe('what the file now says')`**

1. `eventId` is written when present and **omitted entirely** when it is `undefined` or `''` — parse the
   JSON and assert `'eventId' in parsed` is false in the empty case.
2. The markdown header has five columns and its separator row has five cells.
3. A two-way transcript shows both directions: two lines with `dir: 'vi2ja'` and `dir: 'ja2vi'` produce
   rows containing each of those strings.
4. A script-answered line is marked `kịch bản`; an ordinary line leaves that cell empty.
5. A pipe inside the source text is still escaped, and the two new cells never contain a raw `|`.
6. The JSON `lines` array carries `dir` and `fromScript` through unchanged.
7. Nothing that was in the file before has moved: `startedAt`, `endedAt`, `sourceLanguage`,
   `targetLanguage` and `lines` are all still top-level keys, and `filename` is unchanged for the same
   `startedAt`.

**`describe('where the values come from')`**

8. `onlineLane.ts` computes the direction per utterance: `recordSessionLine` contains
   `const dl = dirLangs(lid, sourceText, false);` and no longer contains
   `sourceLanguage: o.sourceLanguage, targetLanguage: o.targetLanguage`.
9. The script path is the only call site passing the flag: exactly one occurrence of
   `recordSessionLine(lid, finalizedAt, head, target, true)`, and the other three calls pass four
   arguments.
10. The event is latched at start and travels with every save: the file contains
    `sessionEventId = (config.getEventId?.() ?? '').trim();` and `eventId: sessionEventId || undefined,`.
11. The facade wires it: `index.ts` contains `getEventId: () => eventIdRef.current,` and returns
    `eventId, setEventId`; `OnlineConsole.tsx` contains `setLaneEventId(eventId)`.

**`describe('and no more than that')`**

12. No history page was smuggled in: `sessionExport.ts` contains no `fetch(` other than the one
    `'/online-api/save-session'` POST, and the facade exports no component name containing `History`.

Running total after this task: 505 + 12 = **517**.

---

# TASK 15 — Carry a script between machines, and stop an empty import looking like a success

**Why.** Two small things, one file. A script prepared on one laptop can only be moved to another by
re-importing the original document and re-approving every line — hours of work that already exists in the
browser it was done in. And when an import produces nothing, the screen currently says **"Đã thêm 0 dòng"
in green**: a failure reported as a success, which on the morning of an event is exactly how somebody
concludes the script is loaded when it is not.

The export is deliberately the app's own `.json`, not another document format: it carries the approvals,
the per-row languages and the order, which is everything that took the work.

## 15.1 New file `src/lib/scriptTransfer.ts`

```ts
// src/lib/scriptTransfer.ts — move an approved script between machines.
//
// The `.json` written here is the app's own record, not a document: it carries the approvals, the
// per-row languages and the order — everything that took the work to produce, and everything that a
// re-import of the original .docx would throw away.
//
// Pure functions, no DOM: the page owns the download and the file picker, this owns the shape and the
// refusals. `parseScriptImport` NEVER throws and never returns an empty success — an import that produced
// nothing is an error with a sentence the operator can act on.

import type { ScriptEntry } from './api';

export const SCRIPT_EXPORT_FORMAT = 'proyaku-script';
export const SCRIPT_EXPORT_VERSION = 1;

export interface ScriptExportFile {
  format: typeof SCRIPT_EXPORT_FORMAT;
  version: number;
  eventId: string;
  dir: string;
  exportedAt: string;
  rows: ScriptEntry[];
}

/** Filename-safe: anything that is not a letter, digit, dash or underscore becomes a dash. */
function safe(part: string): string {
  return part.replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export function buildScriptExport(eventId: string, dir: string, rows: readonly ScriptEntry[], exportedAtISO: string): { filename: string; json: string } {
  const file: ScriptExportFile = {
    format: SCRIPT_EXPORT_FORMAT,
    version: SCRIPT_EXPORT_VERSION,
    eventId,
    dir,
    exportedAt: exportedAtISO,
    rows: rows.map((r) => ({ ...r })),
  };
  const stamp = exportedAtISO.replace(/[:.]/g, '').replace(/[TZ]/g, '-').replace(/-+$/, '');
  return { filename: `kichban_${safe(eventId) || 'buoi'}_${safe(stamp)}.json`, json: JSON.stringify(file, null, 2) };
}

/**
 * Read a `.json` script back.
 *
 * `idPrefix` regenerates every row id, so importing the same file twice — or importing a file exported
 * from a machine that happened to use the same ids — can never collide with rows already on screen.
 */
export function parseScriptImport(text: string, idPrefix: string): { rows: ScriptEntry[]; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { rows: [], error: 'Tệp này không phải tệp kịch bản .json đọc được — kịch bản hiện tại giữ nguyên.' };
  }

  const raw: unknown = Array.isArray(parsed) ? parsed : (parsed as { rows?: unknown })?.rows;
  if (!Array.isArray(raw)) {
    return { rows: [], error: 'Tệp này không phải tệp kịch bản .json đọc được — kịch bản hiện tại giữ nguyên.' };
  }

  const fileDir = typeof (parsed as { dir?: unknown })?.dir === 'string' ? (parsed as { dir: string }).dir : '';
  const [fileSrc, fileDst] = fileDir === 'ja-vi' ? ['ja', 'vi'] : ['vi', 'ja'];

  const rows: ScriptEntry[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== 'object') return;
    const r = item as Record<string, unknown>;
    const src = typeof r.src === 'string' ? r.src : '';
    if (!src.trim()) return; // a row with no source line is not a script line
    rows.push({
      ...(r as unknown as ScriptEntry),
      id: `${idPrefix}-${i}`,
      src,
      dst: typeof r.dst === 'string' ? r.dst : '',
      src_lang: typeof r.src_lang === 'string' ? r.src_lang : fileSrc,
      dst_lang: typeof r.dst_lang === 'string' ? r.dst_lang : fileDst,
      // Approvals travel — that is the point of moving the file. Anything that is not exactly 'approved'
      // is a draft, so a hand-edited file cannot invent a third state.
      status: r.status === 'approved' ? 'approved' : 'draft',
    } as ScriptEntry);
  });

  if (!rows.length) {
    return { rows: [], error: 'Tệp không có dòng kịch bản nào — kịch bản hiện tại giữ nguyên.' };
  }
  return { rows };
}
```

If `ScriptEntry` has required fields beyond these, keep the spread and set only the fields named above —
do not invent values for fields this module does not know about.

## 15.2 `ScriptPrep.tsx` — export button, `.json` import, and the refusal

**(a)** Replace:

```tsx
import { readImportFile, parseText } from '../lib/scriptImport';
```

with

```tsx
import { readImportFile, parseText } from '../lib/scriptImport';
import { buildScriptExport, parseScriptImport } from '../lib/scriptTransfer';
```

**(b)** The `.json` branch. Replace:

```tsx
        try {
            const r = await readImportFile(file);
```

with

```tsx
        try {
            // TASK 15: a .json export is not text for the delimiter detector — it is already rows, with
            // their approvals. Committed straight away; an empty or unreadable one is REFUSED here rather
            // than travelling on as an empty success.
            if (/\.json$/i.test(file.name)) {
                const res = parseScriptImport(await file.text(), `json${Date.now()}`);
                if (res.error) { setErr(res.error); setText(''); return; }
                onCommit(res.rows);
                return;
            }
            const r = await readImportFile(file);
```

**(c)** Replace:

```tsx
    const accept = `.md,.markdown,.txt,.tsv,.csv,.srt,.docx,.docm,.dotx,.dotm${backendOnline ? ',.pdf' : ''}`;
```

with

```tsx
    const accept = `.json,.md,.markdown,.txt,.tsv,.csv,.srt,.docx,.docm,.dotx,.dotm${backendOnline ? ',.pdf' : ''}`;
```

**(d)** The refusal. Replace:

```tsx
    const commitImport = (entries: ScriptEntry[]) => {
        mutate((prev) => [...prev, ...entries]);
        toast.success(`Đã thêm ${entries.length} dòng`);
        closeImport();
    };
```

with

```tsx
    const commitImport = (entries: ScriptEntry[]) => {
        // TASK 15: an import that produced nothing must never be reported as a success. "Đã thêm 0 dòng"
        // in green is how somebody concludes on the morning of an event that the script is loaded.
        if (!entries.length) {
            toast.error('Tệp không có dòng kịch bản nào — kịch bản hiện tại giữ nguyên');
            return;
        }
        mutate((prev) => [...prev, ...entries]);
        toast.success(`Đã thêm ${entries.length} dòng`);
        closeImport();
    };
```

**(e)** The export button. Replace:

```tsx
                <button onClick={openImport} className="btn-lux flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>Nhập tệp</button>
            </PageHeader>
```

with

```tsx
                {/* TASK 15: carry the whole script — approvals, languages, order — to another machine.
                    Disabled with nothing to export, so the button can never produce an empty file that
                    later reads as "the script was empty". */}
                <button onClick={exportScriptJson} disabled={rows.length === 0}
                    title="Tải kịch bản (kèm trạng thái duyệt) về máy, để mở trên máy khác"
                    className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant px-3 py-2 rounded-full font-label-caps text-label-caps hover:border-secondary hover:text-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">download</span>Xuất .json
                </button>
                <button onClick={openImport} className="btn-lux flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>Nhập tệp</button>
            </PageHeader>
```

**(f)** The handler, next to the other actions. Replace:

```tsx
    const openImport = () => {
```

with

```tsx
    const exportScriptJson = () => {
        const { filename, json } = buildScriptExport(eventId, dir, rows, new Date().toISOString());
        try {
            const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
            const a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
            toast.success(`Đã xuất ${rows.length} dòng`);
        } catch {
            toast.error('Không tải được tệp về máy');
        }
    };

    const openImport = () => {
```

## 15.3 Tests — new file `tests/scriptTransfer.test.ts`, **14 cases**

`import { buildScriptExport, parseScriptImport, SCRIPT_EXPORT_FORMAT, SCRIPT_EXPORT_VERSION } from '../src/lib/scriptTransfer'`
plus source guards on `src/pages/ScriptPrep.tsx`. Build rows as plain objects matching `ScriptEntry`.

**`describe('export')`**

1. The file names itself: parsed JSON has `format === SCRIPT_EXPORT_FORMAT`, `version === SCRIPT_EXPORT_VERSION`,
   and carries `eventId`, `dir` and `exportedAt` verbatim.
2. The filename is safe and stable: it starts `kichban_`, ends `.json`, and contains no character outside
   `[\w.-]` even when the event id has spaces, slashes and Vietnamese diacritics.
3. `rows` are copied, not referenced: mutating the input array afterwards does not change the JSON.

**`describe('import')`**

4. Round trip: export three rows, parse the result, and get three rows back with the same `src`, `dst`,
   `src_lang`, `dst_lang` and `status`.
5. A bare array (no wrapper) is accepted.
6. Invalid JSON returns `rows: []` and the Vietnamese message, and does **not** throw.
7. A JSON object with no `rows` array returns the same refusal.
8. An empty array returns the "Tệp không có dòng kịch bản nào" message — never an empty success.
9. Rows with a blank or missing `src` are dropped; when that leaves none, the empty message is returned.
10. Ids are regenerated from the prefix: two parses of the same file with different prefixes share no id.
11. Approvals travel, invented states do not: `status: 'approved'` survives, `status: 'weird'` becomes
    `'draft'`.
12. Missing per-row languages fall back to the file's `dir` (`'ja-vi'` gives `ja`/`vi`).

**`describe('the page uses it')`**

13. `ScriptPrep.tsx` refuses an empty import: it contains
    `'Tệp không có dòng kịch bản nào — kịch bản hiện tại giữ nguyên'` inside a `toast.error`, and the
    `toast.success(\`Đã thêm` line comes after that guard (compare indices).
14. `.json` is both accepted and branched before the text reader: the file contains
    `` `.json,.md,.markdown `` in `accept`, and the index of `/\.json$/i.test(file.name)` is lower than the
    index of `await readImportFile(file)`.

Running total after this task: 517 + 14 = **531**.

---

# TASK 16 — "Preview refine failed." tells the operator nothing

**Why.** Every way the refine call can fail produces the same sentence. Nobody set the key, the provider
is slow, the provider refused, the provider answered with rubbish — four completely different situations,
four completely different actions, one identical message on screen. On 01/08 that message appeared and the
only thing anybody could do with it was watch.

The constraint is that the screen must **not** learn the provider's name, model id, host or environment
variable — that rule is not negotiable and is the reason this was never done. So the server classifies the
failure into a short, deliberately coarse code, and the client turns that code into a Vietnamese sentence.
Nothing identifying crosses the wire.

## 16.1 `server/online-api.mjs` — classify it

**(a)** Replace:

```js
function extractResponseText(data) {
```

with

```js
// TASK 16 — turn an upstream failure into a reason code the screen can name. Deliberately coarse and
// deliberately opaque: it says what KIND of failure it was and never which provider, which model, which
// host, or which environment variable. Four codes, four different actions:
//   no-key            → somebody has to set the key; that is the owner's job, not the technician's
//   timeout           → the provider is slow right now, and the draft translation is still on screen
//   upstream-http-NNN → the provider refused; the number is the only detail worth showing
//   bad-json          → the provider answered with something unusable
export function classifyRefineFailure(error) {
  const message = String(error?.message ?? error ?? '');
  if (/not configured|missing key|no api key/i.test(message)) return 'no-key';
  if (/abort|timeout|timed out|ETIMEDOUT|ESOCKETTIMEDOUT/i.test(message)) return 'timeout';
  const http = message.match(/\bHTTP (\d{3})\b/) || message.match(/\bstatus (\d{3})\b/i);
  if (http) return `upstream-http-${http[1]}`;
  if (/JSON|Unexpected token|unparsable/i.test(message)) return 'bad-json';
  return 'unknown';
}

function extractResponseText(data) {
```

**(b)** Replace:

```js
        } catch (error) {
          logLine('refine.fail', { message: String(error?.message ?? error).slice(0, 300) });
          sendJson(res, 502, { error: 'Preview refine failed.' });
        }
```

with

```js
        } catch (error) {
          const reason = classifyRefineFailure(error);
          logLine('refine.fail', { reason, message: String(error?.message ?? error).slice(0, 300) });
          sendJson(res, 502, { error: 'Preview refine failed.', reason });
        }
```

## 16.2 New file `src/lib/lanes/online/refineFailure.ts`

```ts
// src/lib/lanes/online/refineFailure.ts — the server's reason code, in words the operator can act on.
//
// The codes are the ONLY thing that crosses the wire about a failure: no provider name, no model id, no
// host, no environment variable name. This module turns each one into a sentence that names the action,
// because "lỗi" on a screen during a ceremony is the same as no message at all.

export function refineReasonText(reason: string): string {
  if (reason === 'no-key') return 'chưa cài khoá dịch — báo người quản trị';
  if (reason === 'timeout') return 'bên dịch trả lời quá chậm — vẫn đang giữ bản dịch nháp trên màn';
  if (reason === 'bad-json') return 'bên dịch trả về nội dung không đọc được';
  const http = /^upstream-http-(\d{3})$/.exec(reason);
  if (http) {
    if (http[1] === '429') return 'bên dịch từ chối vì quá nhiều yêu cầu (429) — thử lại sau vài giây';
    if (http[1] === '401' || http[1] === '403') return 'khoá dịch bị từ chối (' + http[1] + ') — báo người quản trị';
    return `bên dịch trả lỗi ${http[1]}`;
  }
  return 'lỗi không rõ từ bên dịch';
}
```

## 16.3 `onlineLane.ts` — read the reason before giving up

**(a)** Replace:

```ts
import { fetchAsrSession, createAsrCodec, type AsrCodec } from './asrTransport';
```

with

```ts
import { fetchAsrSession, createAsrCodec, type AsrCodec } from './asrTransport';
import { refineReasonText } from './refineFailure';
```

**(b)** Replace:

```ts
      if (!res.ok) return { ok: false, retriable: res.status >= 500, message: `refine HTTP ${res.status}` };
```

with

```ts
      if (!res.ok) {
        // TASK 16: the server names the cause in a code that identifies nothing. Read it before giving
        // up — "refine HTTP 502" was a message nobody could act on.
        let reason = '';
        try { reason = String(((await res.json()) as { reason?: unknown }).reason ?? ''); } catch { /* no body */ }
        return { ok: false, retriable: res.status >= 500, message: reason ? refineReasonText(reason) : `refine HTTP ${res.status}` };
      }
```

The lane already surfaces `result.message` through `events.onError(\`refine failed: ${result.message}\`)`,
so the sentence reaches the screen with no further wiring.

## 16.4 Tests — new file `tests/refineFailure.test.ts`, **12 cases**

`const { classifyRefineFailure } = await import('../server/online-api.mjs')` — §16.1(a) already declares it
`export function`, the same way `pickScribeKeyterms` and `buildScribeWsParams` are declared, so there is
nothing further to add — and `import { refineReasonText } from '../src/lib/lanes/online/refineFailure'`.

**`describe('the server classifies')`**

1. `new Error('Refine is not configured.')` → `'no-key'`.
2. `new Error('The operation was aborted')` and an `AbortError`-shaped object → `'timeout'`.
3. `new Error('upstream HTTP 429')` → `'upstream-http-429'`; `'status 503'` → `'upstream-http-503'`.
4. `new Error('Unexpected token < in JSON at position 0')` → `'bad-json'`.
5. Anything else → `'unknown'`; `undefined` and `null` do not throw.
6. Order matters: a message containing both a key phrase and an HTTP number returns `'no-key'`, because
   that is the one the operator cannot fix by waiting.

**`describe('it leaks nothing')`**

7. For a message containing a host, a model id and an env-var-looking name, the returned code matches
   `/^(no-key|timeout|bad-json|unknown|upstream-http-\d{3})$/` — nothing from the message survives.
8. The 502 response carries it: `server/online-api.mjs` contains
   `sendJson(res, 502, { error: 'Preview refine failed.', reason });`.

**`describe('the operator reads a sentence, not a code')`**

9. `refineReasonText('no-key')` names who to tell; `'timeout'` says the draft is still on screen.
10. `refineReasonText('upstream-http-429')` mentions 429 and says to retry; `'upstream-http-401'` and
    `'upstream-http-403'` say the key was refused; `'upstream-http-500'` falls back to the plain form.
11. `refineReasonText('')` and an unrecognised code both return the "lỗi không rõ" sentence rather than an
    empty string — an empty message would reach the screen as a blank error.
12. The lane uses it: `onlineLane.ts` contains `refineReasonText(reason)` and no longer returns
    `` `refine HTTP ${res.status}` `` as its only failure message (both branches still exist; assert the
    reason branch is present).

Running total after this task: 531 + 12 = **543**.

---

# TASK 17 — Two documentation repairs carried over from the previous prompt

**Why.** `docs/ONLINE-LANE-UI-API.md` is what the next person reads before touching this lane. Two things
in it are wrong or missing, both noticed while the previous prompt was being checked and both left over:
`summarizePrepDocs` is described in its own section but is absent from the exports block above it, and the
`máy nghe:` read-out on the diagnostics line has no note saying what it is — which is how somebody
eventually "tidies it up" as a redundant display of a setting the operator already chose. It is not a
setting; it is the vendor's own reply, and it is the only way to tell "we asked" from "it agreed".

## 17.1 The exports block

Replace:

```md
  ONLINE_ACTIVE_STATUSES, ONLINE_STATUS_COLOR,
  type OnlineConfigStatus, type OnlineDirection,
  type LaneLine, type LaneStatus, type OnlineDiagnostics, type TtsGateMode, type SaveOutcome,
} from '../lib/lanes/online'
```

with

```md
  ONLINE_ACTIVE_STATUSES, ONLINE_STATUS_COLOR,
  summarizePrepDocs, PREP_DOCS_MAX, PREP_DOC_MAX_CHARS,   // documented below; was missing from this list
  type OnlineConfigStatus, type OnlineDirection,
  type LaneLine, type LaneStatus, type OnlineDiagnostics, type TtsGateMode, type SaveOutcome,
} from '../lib/lanes/online'
```

## 17.2 What `máy nghe:` is

Replace:

```md
### `useOnlineLane(): UseOnlineLane`
```

with

```md
### The `máy nghe:` line in Chẩn đoán is an ECHO, not a setting

`diag.asrLanguages` and `diag.asrLanguageDetection` are the recogniser's **own reply to the handshake** —
what it agreed to listen for, and whether it agreed to tag each sentence with the language it heard. They
are not a read-back of anything the operator chose. Asking and agreeing are different events, and the gap
between them is exactly how Vietnamese speech came back as Chinese and Italian at a ceremony while the
console showed a healthy session.

Do not "simplify" this line into a display of the console's own settings, and do not remove it because it
looks redundant. When `nhận diện tiếng` reads `KHÔNG` while two-way is on, that combination cannot work,
and this line is the only place it is visible.

### `useOnlineLane(): UseOnlineLane`
```

## 17.3 Tests — new file `tests/uiApiDoc.test.ts`, **4 cases**

Read `docs/ONLINE-LANE-UI-API.md` with `readFileSync`.

1. Everything the doc's own sections describe is in the exports block: for each of `summarizePrepDocs`,
   `PREP_DOCS_MAX`, `PREP_DOC_MAX_CHARS`, assert the name appears between `import {` and
   `} from '../lib/lanes/online'`.
2. The exports block only names things the facade really exports: for each identifier in that block that
   is not a `type`, assert `src/lib/lanes/online/index.ts` contains it.
3. The echo is documented: the file contains `'is an ECHO, not a setting'` and both
   `diag.asrLanguages` and `diag.asrLanguageDetection`.
4. TASK 4's removal note is still there and still carries the vendor's exact words: the file contains
   `'Removed from the UI: the hall-babble switch'` and
   `'filter_background_audio cannot be combined with'`.

Running total after this task: 543 + 4 = **547**.

---

# When you are done

Run all three, in this order, and report the numbers verbatim:

```
npx vitest run
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

**Expected: 547 tests passing.** PART 1 left the suite at 403, and tasks 6–17 add
12 + 16 + 14 + 14 + 10 + 8 + 10 + 18 + 12 + 14 + 12 + 4 = **144**.
Three pre-existing test files are rewritten in place and **none of them changes count**:
`tests/serverAsr.test.ts` keeps its 26 cases (TASK 10 rewrites one), `tests/asrTransport.test.ts` keeps
its 26 (TASK 9 §9.3 rewrites one), and `tests/sessionExport.test.ts` keeps its 3 (TASK 14 §14.5 rewrites
one case and the fixture above it). No `it(` is added or removed in any of them.
(For the record: 288 at `3afcee3`, + 115 in PART 1, + 144 here = 547.)

> **If `tsc` says a name is not defined in `OnlineConsole.tsx`,** add that name to the facade import on
> line 16 (the one ending `from '../index'`) and run again — TASK 7 and TASK 13 both extend that line, and
> it is the only place a missing name can legitimately be fixed. **Never** import from a deeper path such
> as `'../keytermBudget'` or `'../speechRhythm'`: the console imports the facade root and nothing else, and
> a deep import is a rule violation even when it compiles.

Then check these by hand, because a passing test suite does not prove them:

1. `git diff --stat package.json package-lock.json` is **empty**. If either moved, undo it — no task here
   needs a dependency.
2. `git diff --name-only` lists no file under `src/lib/lanes/offline/`, and neither `src/lib/api.ts`,
   `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts` nor `src/lib/lanes/types.ts`.
3. `git grep -n 'roomFilter' -- src/` returns **only the two tombstone comments** PART 1 TASK 4 wrote
   (`asrTransport.ts` and `index.ts`) and **no code** — no `roomFilter:` field, no `setRoomFilter`, no
   `getRoomFilter`, no `proyaku_online_room_filter`. (`server/` still has it, deliberately.)
4. No vendor env name, model id, API host or key value appears anywhere under `src/` — the reason codes in
   TASK 16 are the closest thing, and they are opaque by construction.
5. Only `src/pages/AudioRouting.tsx`, `src/pages/Settings.tsx` and the `/online-lab` page import
   `src/lib/lanes/online`, and only at the root.
6. `tests/serverAsr.test.ts`, `tests/asrTransport.test.ts` and `tests/sessionExport.test.ts` are the
   **only** pre-existing test files in the diff, and `git diff --stat` shows each of them with a small,
   roughly balanced change — one case rewritten, not appended to. Confirm with
   `git grep -c '  it(' -- tests/serverAsr.test.ts tests/asrTransport.test.ts tests/sessionExport.test.ts`:
   **26**, **26** and **3** — the same numbers as at `3afcee3`.

Report once, at the end: the three command outputs, the six checks above, and anything you had to decide
that this file did not decide for you.

**There is a PART 3** (the online glossary and the per-meeting boxes). It runs **after** this file and is
independent: it adds no live-path behaviour and **does not block deploying PART 1 + PART 2**. Do not start
it from memory of this file — wait for it, then apply it in the same way. Note that one assertion written
here, the endpoint count in `tests/speechRhythm.test.ts`, is deliberately made out of date by PART 3, which
says so and tells you the new number.

