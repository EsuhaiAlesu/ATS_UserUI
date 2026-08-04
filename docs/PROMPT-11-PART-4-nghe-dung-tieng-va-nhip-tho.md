# PROMPT-11 · PHẦN BỔ SUNG 4 — Nghe đúng thứ tiếng · Hết cắt vụn câu Việt · Chặn số ảo · Nhịp nói tự học

**Gửi:** Claude của Sếp Sơn Lê · **Repo:** `ATS_UserUI` · **Nhánh nền:** `develop` tại commit **`3afcee3`**,
**đã áp dụng xong PHẦN 1 + PHẦN 2 + PHẦN 3** · **Ngày:** 03/08/2026 · **Sự kiện:** Lễ kỷ niệm 20 năm, 08/08/2026

---

## PHẦN CHO SẾP ĐỌC (tiếng Việt)

Thưa Sếp, đây là phần bổ sung thứ tư, chốt chiều 03/08 sau buổi chạy thử lần hai. Phần này **chạy sau khi
Phần 3 đã xong**, và **không chặn** việc đưa Phần 1–3 lên chạy — ba phần kia xong là dùng được ngay, phần
này bổ sung tiếp. Bốn việc, đều từ số liệu đo trên chính các buổi đã chạy:

- **Máy nghe coi tiếng Việt là tiếng chính.** Trước giờ máy được dặn ngầm "sân khấu này nói tiếng Nhật
  trước", nên câu Nhật ra đẹp mà câu Việt hay nát. Đo hôm 03/08 thì thấy rõ điều đó. Giờ dặn lại: tiếng
  Việt trước, tiếng Nhật sau — vẫn nghe được cả hai thứ tiếng như cũ.
- **Câu tiếng Việt hết bị cắt vụn.** Cùng một câu, viết bằng tiếng Việt dài gần gấp đôi tiếng Nhật (đo
  trên 63 buổi đã lưu: gấp 1,85 lần). Thước đo "câu dài quá thì cắt" trước giờ đo theo cỡ tiếng Nhật, nên
  câu Việt bị cắt oan gấp 40 lần. Giờ thước tự giãn theo thứ tiếng của câu.
- **Chặn chuỗi số máy tự bịa.** Người nói lặp "anh, anh, anh" hay "ờ, ờ" thì máy nghe có lúc bịa thành
  "Anh 1000, anh 1000" hoặc "177" rồi đọc lên loa. Giờ những dòng như vậy bị chặn lại; các con số thật
  ("100.000 đồng", "năm 2024"…) vẫn qua đủ.
- **Nút Nhịp nói đủ 4 nấc, có nấc tự học, nằm trong trang Cài đặt.** Ở Phần 2 nút này mới có 3 nấc và chỉ
  chỉnh được mốc chờ phía máy nghe; đo lại thì thứ thật sự cắt câu là hai mốc chờ ngay trên máy mình. Giờ
  mỗi nấc chỉnh cả hai, thêm nấc "Tự học theo người đang nói" — máy tự đo nhịp ngắt nghỉ của người nói rồi
  chờ theo đúng nhịp đó — và hai mốc trên máy đổi là ăn ngay giữa buổi, không phải bấm Bắt đầu lại.

---

## THE REST OF THIS FILE IS FOR THE ASSISTANT

<role>
You are working in the `ATS_UserUI` repository, finishing PROMPT-11. **PARTS 1, 2 and 3 of this prompt
have already been applied** and their 605 tests pass. This file is tasks 21 to 24. It adds no endpoint,
no dependency, and it does not block deploying PARTS 1–3 — it runs after them.
</role>

<context>
The evidence is the second rehearsal, 2026-08-03, plus measurements over the saved sessions the app has
already produced (47 sessions / 852 final transcripts for the invented-number rule; 63 sessions / 1,519
lines / 836 aligned sentence pairs for the Vietnamese-length factor). Four things are being corrected:
the default language whitelist quietly told the recogniser this stage speaks Japanese first; repeated
filler syllables came back as digit runs and were read to the hall; the character ceilings that cut and
glue sentences were tuned for Japanese and mis-serve Vietnamese by a factor of 40; and the PART 2 speech
rhythm knob adjusted only the upstream backstop while the real cutter — the client's 600/800ms stability
pair — stayed fixed.

The gala is on 2026-08-08.
</context>

<how_to_work>
- **Baseline.** Unless a blockquote directly above it says otherwise, every "replace" block quotes text
  that is byte-for-byte at `develop` @ `3afcee3` **and** still stands unchanged in the tree PARTS 1–3
  leave behind — both are true for every unmarked block, so find it and replace it. If a block cannot be
  found verbatim, STOP and report it rather than applying a similar-looking edit.
- **Some blocks quote an earlier PART's output instead**, because they extend or retract a line PART 1 or
  PART 2 wrote. Each of those says so in a blockquote right above it. There are no others.
- **One pass, no per-task report.** Work through the tasks in the order given. Report once, at the end.
- **Follow this repo's own `CLAUDE.md`.** Online-lane client code stays under `src/lib/lanes/online/`;
  only `src/pages/AudioRouting.tsx`, `src/pages/Settings.tsx` and `/online-lab` may import the facade
  root, and never anything deeper; do not touch `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`,
  `src/lib/useMeter.ts`, or `src/lib/lanes/types.ts`; no vendor env name, model id, API host or key value
  may appear anywhere under `src/`.
- **Add no dependency.** `package.json` and `package-lock.json` must end with zero lines changed. Every
  test below runs in the existing vitest **node** environment; React behaviour is asserted by reading the
  component source with `readFileSync`, never by rendering.
- **Tests are part of each task**, not a phase at the end.
- **If `tsc` says a name is not defined (or defined but never used) in `OnlineConsole.tsx`,** fix it on
  the facade import on line 16 (the one ending `from '../index'`) and nowhere else — TASK 24 §24.5 trims
  that line. **Never** import from a deeper path such as `'../speechRhythm'`.
- **RED LIGHTS — stop and report instead of improvising:** `src/lib/lanes/types.ts` would have to change ·
  `package.json` would have to change · an offline-lane file would have to change · a replace block's old
  text is not present verbatim · you find yourself adding an `it(` to a file whose count this file says
  does not move.
</how_to_work>

<what_you_must_not_do>
- Do not add, change or read any API key, and do not add environment variables to the client. The one
  server env this file touches (`SCRIBE_LANGUAGE_WHITELIST`) already exists in `server/online-api.mjs`;
  only its DEFAULT changes.
- Do not add a new HTTP endpoint. `server/online-api.mjs` keeps exactly **16** occurrences of
  `pathname === '/online-api/`, and that number stays pinned by `tests/sessionBoxes.test.ts` (PART 3
  §20.7 case 16) — this part neither adds a route nor touches that test.
- Do not touch authentication, the login gate, or anything security-related.
- **Existing test files — the complete ruling for this part.** PART 2 allowed edits to exactly three
  pre-existing test files. This part adds exactly TWO more places, both stated here so they are on the
  record:
  - `tests/serverAsr.test.ts` — TASK 21 rewrites the one case that pins the whitelist DEFAULT (the five
    other whitelist cases set their own env with `load({ SCRIBE_LANGUAGE_WHITELIST: … })` and are immune).
    One `it(` in, one `it(` out — the file keeps its 26 cases.
  - `tests/asrSpeechEvidence.test.ts` — TASK 22 only ADDS: the import gains one name and the file gains
    one new `describe` with 7 cases. No existing case is touched. 5 cases become 12.
  Across the whole of PROMPT-11 the pre-existing test files touched are therefore exactly **four**:
  `serverAsr` (TASK 10 + TASK 21) · `asrTransport` (TASK 9 §9.3) · `sessionExport` (TASK 14 §14.5) ·
  `asrSpeechEvidence` (TASK 22, add-only). No other pre-existing test file may change.
- `tests/speechRhythm.test.ts` is NOT pre-existing — PART 2 §13.7 created it and PART 3 §20.6 changed one
  number in it. TASK 24 §24.8 replaces its content whole, 18 cases → 16, and says why. Do not "preserve"
  cases from the old suite: three of them (§13.7's 16–18) pin wiring or a count this part removed or
  re-homed, and keeping them red is not a kindness.
</what_you_must_not_do>

## Task list — PART 4

| # | What | Main files |
|---|---|---|
| 21 | The recogniser treats Vietnamese as this stage's main language | `server/online-api.mjs`, `tests/serverAsr.test.ts` |
| 22 | Digit runs the recogniser invented stop reaching the hall | `asrSpeechEvidence.ts`, `onlineLane.ts`, `tests/asrSpeechEvidence.test.ts` |
| 23 | A Vietnamese sentence gets a Vietnamese-sized ruler | `transcriptSegmentation.ts`, `onlineLane.ts`, `tests/segmentCharLimit.test.ts` (new) |
| 24 | Speech rhythm, full version: four steps, self-learning, in Settings | `speechRhythm.ts`, `speechPauseProfile.ts`, `onlineLane.ts`, `index.ts`, `OnlineConsole.tsx`, `OnlineRhythmSettings.tsx` (new), `Settings.tsx`, `docs/ONLINE-LANE-UI-API.md`, `tests/speechRhythm.test.ts` |

Expected test count when you are done: **605 → 618**.

---

# TASK 21 — The recogniser treats Vietnamese as this stage's main language

**Why.** The language whitelist is comma-separated, and the ORDER is not cosmetic: the first code becomes
`language_code`, the session's primary (see `applyLanguageRestriction` — when the session language is
`auto`, the primary is `whitelist[0]`). The default has been `'ja,vi'` since the whitelist was added, which
quietly told the recogniser "this stage speaks Japanese first" — on a stage that speaks mostly Vietnamese.
Measured on 2026-08-03: with `'ja,vi'` the Japanese lines came back clean while the Vietnamese ones were
badly mangled. Same two languages allowed, opposite lead. The owner ruled the same day: Vietnamese leads.

The tempting "fix" — an empty default, free auto-detect — is the one thing this task must NOT do: an
unrestricted session has already transcribed Vietnamese speech as Russian once (the 30/07 evening log) and
as Chinese before that, and the whitelist exists precisely to make that impossible. And because the env is
read before the default, an operator who sets `SCRIBE_LANGUAGE_WHITELIST=ja,vi` gets the old lead back
with no code change — the rollback path costs nothing.

## 21.1 `server/online-api.mjs` — the default whitelist leads with Vietnamese

Replace:

```js
// Narrow auto-detect to the languages this event actually uses. A WHITELIST is not the pin that broke
// TASK 6: `language_code` names the primary and `secondary_languages` the others the session is allowed
// to hear, so a two-way microphone stays two-way while Chinese/Thai/Italian stop being possible answers.
// Comma-separated. Set empty to restore free auto-detect (instant rollback, no code change).
//
// Verified against a live session on 2026-07-30, both directions: the vendor echoes back
// `language_code: "ja", secondary_languages: ["vi"]` — it ACCEPTS the pair — and Vietnamese speech
// still returns as Vietnamese with Japanese as the primary, so a two-way microphone stays two-way.
// Without it the same handshake echoes `language_code: null`, which is how a Vietnamese sentence came
// back as Chinese and was translated and read to the hall.
const SCRIBE_LANGUAGE_WHITELIST = env('SCRIBE_LANGUAGE_WHITELIST', 'ja,vi');
```

with

```js
// Narrow auto-detect to the languages this event actually uses. A WHITELIST is not the pin that broke
// TASK 6: `language_code` names the primary and `secondary_languages` the others the session is allowed
// to hear, so a two-way microphone stays two-way while Chinese/Thai/Italian stop being possible answers.
// Comma-separated, and the ORDER DECIDES: the FIRST code becomes `language_code`, the session's primary.
//
// Default changed 2026-08-03 (owner's call): 'ja,vi' → 'vi,ja'. The old default silently told the
// recogniser "this stage speaks Japanese first" on a stage that speaks mostly Vietnamese — measured that
// day, the Japanese lines came back clean while the Vietnamese ones were badly mangled. Same two
// languages allowed, opposite lead.
//
// Do NOT reach for '' (free auto-detect) as the fallback: an unrestricted session has already
// transcribed Vietnamese speech as Russian once (30/07 log) and as Chinese before that; the whitelist
// exists to make that impossible. A hand-set env still beats this default, so
// SCRIBE_LANGUAGE_WHITELIST=ja,vi restores the old lead with no code change.
const SCRIBE_LANGUAGE_WHITELIST = env('SCRIBE_LANGUAGE_WHITELIST', 'vi,ja');
```

That is the whole server change. `applyLanguageRestriction` already does the right thing with the new
order: a two-way session (`language: 'auto'`) now leads with `vi` and keeps `ja` as the secondary, and a
one-way session that names its own in-whitelist language still leads with THAT language, exactly as
before.

## 21.2 `tests/serverAsr.test.ts` — the one existing case that pins the old lead

This is the first of the two existing-test edits the ruling above allows. Only the DEFAULT-dependent case
moves; the five cases in the `SCRIBE_LANGUAGE_WHITELIST` describe further down all load the module with
their own env and stay green untouched. One `it(` in, one `it(` out — the file keeps all **26** cases.

Replace:

```ts
  // PROMPT-10 TASK 1: a two-way session is RESTRICTED to the event's two languages, not pinned to one.
  it('a two-way session is restricted to exactly Japanese + Vietnamese by default', () => {
    const { params } = buildScribeWsParams({ ...base, roomFilter: undefined })
    expect(params.get('language_code')).toBe('ja') // the whitelist leads
    expect(params.getAll('secondary_languages')).toEqual(['vi']) // the mic stays two-way
  })
```

with

```ts
  // Default changed 2026-08-03 (owner's call): still exactly two languages, but VIETNAMESE now leads.
  // The first code in the list becomes `language_code`, the session's primary, and this stage speaks
  // mostly Vietnamese — the old 'ja,vi' default was quietly telling the recogniser otherwise.
  it('a two-way session is restricted to exactly Vietnamese + Japanese, Vietnamese leading', () => {
    const { params } = buildScribeWsParams({ ...base, roomFilter: undefined })
    expect(params.get('language_code')).toBe('vi')
    expect(params.getAll('secondary_languages')).toEqual(['ja'])
    expect(params.get('include_language_detection')).toBe('true') // we still ASK for the verdict
  })
```

Running total after this task: **605** — one case rewritten, none added or removed.

---

# TASK 22 — Digit runs the recogniser invented stop reaching the hall

**Why.** On the 03/08 rehearsal, repeated filler syllables — "anh, anh, anh", "ờ, ờ, ờ", "hả" — came back
from the recogniser collapsed into digit runs, and the hall then heard a synthesised voice read out
"アイン1000、アイン1000", "え？２、２、２、２" and a bare "177。". Every existing gate passes these lines:
there IS real speech in the room (so the voiced-ms and speech-shape gates agree), the line is under the
12-character repeat guard, and it carries no brackets. The gates all ask about the AUDIO; here the audio
is honest and the WORDS are the invention. So this gate reads the words.

The rule was tuned against the app's own history, not invented at a desk: swept over all 852 final
transcripts in the 47 saved sessions, it drops exactly 6 lines and all 6 are noise, while every real
amount — "100.000 đồng", "120.500", "100 triệu", "năm 2024", "11 giờ", "1000 tài khoản" — survives.

## 22.1 `src/lib/lanes/online/asrSpeechEvidence.ts` — the detector

At the end of the file. Replace:

```ts
    const inner = t.slice(open.length, t.length - close.length);
    if (!inner.includes(close)) return true; // the pair wraps everything — nothing is left outside it
  }
  return false;
}
```

with

```ts
    const inner = t.slice(open.length, t.length - close.length);
    if (!inner.includes(close)) return true; // the pair wraps everything — nothing is left outside it
  }
  return false;
}

const DIGITS = /[0-9０-９]/gu;
const LETTERS = /\p{L}/gu;
// A number and whatever decimal/thousand punctuation trails it: "1000", "100.000", "93,5", "１０".
const NUMBER_TOKENS = /[0-9０-９][0-9０-９.,．，]*/gu;
const countOf = (text: string, re: RegExp): number => (text.match(re) || []).length;

/**
 * True when the transcript is a NUMBER the recogniser invented, not a number anybody said.
 *
 * Measured on the 03/08 rehearsal logs: repeated filler syllables — "anh, anh, anh", "ờ, ờ, ờ", "hả" —
 * come back from the recogniser collapsed into digit runs. The hall then heard "アイン1000、アイン1000",
 * "え？２、２、２、２" and a bare "177。" read aloud in a synthesised voice. Every earlier gate passes them:
 * there IS real speech in the room (so the voiced-ms and speech-shape gates agree), the line is under the
 * 12-char repeat guard, and it carries no brackets.
 *
 * Two signals, both required unless the line has no words at all:
 *   1. a line with digits and NOT ONE letter is never a sentence — "177。";
 *   2. otherwise the same number has to come back at least twice AND the digits must outweigh the
 *      letters. That second half is what keeps real speech: "Ờ, thì cứ đến 30.000 là hoàn trả, 5 phút
 *      hoàn trả, 5 phút hoàn trả." repeats "5" but is mostly words, so it stays.
 *
 * Swept over all 852 finals in the 47 saved sessions: it drops 6, and all 6 are noise
 * ("1000. 1000. 1000. 1000. 1000.", "100g, 100g, 10", "177。", "Anh 1000, anh 1000,", "Hả? 2, 2, 2, 2,",
 * "Dạ, anh 10, 10, 10, 1"). Not one real amount is touched — "100.000 đồng", "120.500", "100 triệu",
 * "năm 2024", "11 giờ", "1000 tài khoản" all survive.
 */
export function isInventedNumber(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  const digits = countOf(t, DIGITS);
  if (digits === 0) return false;
  const letters = countOf(t, LETTERS);
  if (letters === 0) return true; // digits and punctuation, nothing that could be a word
  if (digits <= letters) return false;
  const seen = new Set<string>();
  for (const raw of t.match(NUMBER_TOKENS) || []) {
    const token = raw.replace(/[.,．，]+$/u, ''); // "1000." and "1000" are the same number said twice
    if (seen.has(token)) return true;
    seen.add(token);
  }
  return false;
}
```

## 22.2 `onlineLane.ts` — one more gate on the FINAL path

**(a)** The import. Replace:

```ts
import { ASR_FINAL_MIN_VOICED_MS, ASR_PARTIAL_MIN_VOICED_MS, hasClearSpeechEvidence, isNonSpeechAnnotation } from './asrSpeechEvidence';
```

with

```ts
import { ASR_FINAL_MIN_VOICED_MS, ASR_PARTIAL_MIN_VOICED_MS, hasClearSpeechEvidence, isInventedNumber, isNonSpeechAnnotation } from './asrSpeechEvidence';
```

**(b)** The gate, on the final path, straight AFTER the non-speech-annotation gate and BEFORE the
transcript is remembered for the repeat guard. Replace:

```ts
    // M11: the transcriber's own "I could not hear that" marker is not something anybody said.
    if (isNonSpeechAnnotation(transcript)) {
      dropGhost('non-speech annotation', transcript);
      return;
    }
    previousFinalTranscript = transcript;
```

with

```ts
    // M11: the transcriber's own "I could not hear that" marker is not something anybody said.
    if (isNonSpeechAnnotation(transcript)) {
      dropGhost('non-speech annotation', transcript);
      return;
    }
    // TASK 22: the gates above all ask about the AUDIO, and on repeated filler ("anh, anh, anh") the
    // audio is real speech — the recogniser is what invents the digits. This one reads the words instead,
    // so "Anh 1000, anh 1000," and a bare "177。" stop reaching the hall. Counted with the other
    // non-speech drops so the technician can see it happening on the diagnostics line.
    if (isInventedNumber(transcript)) {
      nonSpeechDrops += 1;
      lastNonSpeechReason = 'số ảo';
      dropGhost('invented number', transcript);
      return;
    }
    previousFinalTranscript = transcript;
```

`nonSpeechDrops` and `lastNonSpeechReason` already exist (M13) and already reach the console's diagnostics
line — no other wiring is needed.

## 22.3 `tests/asrSpeechEvidence.test.ts` — the existing file gains one describe, 7 cases

This is the second of the two existing-test edits the ruling allows, and it is ADD-ONLY: no existing case
changes, the file goes from 5 cases to **12**.

**(a)** The import. Replace:

```ts
import {
  ASR_PARTIAL_MIN_VOICED_MS,
  ASR_FINAL_MIN_VOICED_MS,
  hasClearSpeechEvidence,
  providerNeedsSpeechEvidence,
} from '../src/lib/lanes/online/asrSpeechEvidence'
```

with

```ts
import {
  ASR_PARTIAL_MIN_VOICED_MS,
  ASR_FINAL_MIN_VOICED_MS,
  hasClearSpeechEvidence,
  isInventedNumber,
  providerNeedsSpeechEvidence,
} from '../src/lib/lanes/online/asrSpeechEvidence'
```

**(b)** The new describe, appended after the existing one. Replace:

```ts
  it('qwen3 needs speech evidence', () => {
    expect(providerNeedsSpeechEvidence('qwen3')).toBe(true)
    expect(providerNeedsSpeechEvidence('other')).toBe(false)
  })
})
```

with

```ts
  it('qwen3 needs speech evidence', () => {
    expect(providerNeedsSpeechEvidence('qwen3')).toBe(true)
    expect(providerNeedsSpeechEvidence('other')).toBe(false)
  })
})

describe('asrSpeechEvidence — invented numbers (03/08 rehearsal)', () => {
  it('drops the six lines the 47 saved sessions actually produced', () => {
    // Every one of these was translated and read aloud to the hall.
    expect(isInventedNumber('177。')).toBe(true)                        // no letters at all
    expect(isInventedNumber('Anh 1000, anh 1000,')).toBe(true)          // "anh anh anh" collapsed
    expect(isInventedNumber('Hả? 2, 2, 2, 2,')).toBe(true)
    expect(isInventedNumber('Dạ, anh 10, 10, 10, 1')).toBe(true)
    expect(isInventedNumber('1000. 1000. 1000. 1000. 1000.')).toBe(true)
    expect(isInventedNumber('100g, 100g, 10')).toBe(true)
  })

  it('a line with digits but no letters is never a sentence', () => {
    expect(isInventedNumber('177')).toBe(true)
    expect(isInventedNumber('１０、１０')).toBe(true)
    expect(isInventedNumber('12:30')).toBe(true)
  })

  it('keeps the real amounts from the same logs', () => {
    expect(isInventedNumber('Của... 100.000 đồng.')).toBe(false)
    expect(isInventedNumber('Và tôi gửi 500.000.')).toBe(false)
    expect(isInventedNumber('Thì nó là cái... 100.000.000.000, nó sẽ học được cái gì?')).toBe(false)
    expect(isInventedNumber('Có một đàm thoại thứ hai, 120.500. Cảm ơn.')).toBe(false)
    expect(isInventedNumber('Trên, trên 93,5.')).toBe(false)
    expect(isInventedNumber('100 triệu.')).toBe(false)
  })

  it('a number repeated inside real speech is speech, not noise', () => {
    // The repeat alone must not convict — the digits have to outweigh the words too.
    expect(isInventedNumber('Ờ, thì cứ đến 30.000 là hoàn trả, 5 phút hoàn trả, 5 phút hoàn trả.')).toBe(false)
    expect(isInventedNumber('Không sao, không sao. 100% 100%.')).toBe(false)
    expect(isInventedNumber('Dạ vâng. Dạ vâng 1. Dạ cho số 3, 3.')).toBe(false)
  })

  it('a number said once is never invented, however short the line', () => {
    expect(isInventedNumber('Anh 111.')).toBe(false)
    expect(isInventedNumber('10 người.')).toBe(false)
    expect(isInventedNumber('50周年')).toBe(false)
    expect(isInventedNumber('20年')).toBe(false)
  })

  it('text with no digits, and empty text, are left alone', () => {
    expect(isInventedNumber('Xin chào quý vị.')).toBe(false)
    expect(isInventedNumber('ええと、そのテーブルです。')).toBe(false)
    expect(isInventedNumber('')).toBe(false)
    expect(isInventedNumber('   ')).toBe(false)
  })

  it('the global regexes do not carry state between calls', () => {
    // DIGITS/LETTERS/NUMBER_TOKENS are module-level and /g — the same input must answer the same twice.
    for (let i = 0; i < 3; i++) {
      expect(isInventedNumber('Anh 1000, anh 1000,')).toBe(true)
      expect(isInventedNumber('Của... 100.000 đồng.')).toBe(false)
    }
  })
})
```

Running total after this task: 605 + 7 = **612**.

---

# TASK 23 — A Vietnamese sentence gets a Vietnamese-sized ruler

**Why.** The two segmentation ceilings — `SEGMENT_MAX_CHARS` (120, "too long, cut it") and
`SEGMENT_MIN_CHARS` (18, "too short, wait and glue") — COUNT CHARACTERS, and they were tuned around
Japanese. Measured on 63 saved sessions (1,519 lines, 836 aligned sentence pairs): the same sentence is
**1.85×** longer in Vietnamese than in Japanese (p25 1.54 · p75 2.23). One fixed pair of numbers therefore
produces two opposite behaviours the operator can see on the wall: Vietnamese hits the cut ceiling on
12.1% of its lines against Japanese's 0.3% — forty times as often — while Japanese sits under the glue
floor on 58% of its lines and comes out as whole thoughts, against Vietnamese's 19%. The Japanese window
reads as sentences; the Vietnamese window breaks mid-clause. Scaling the ruler by the language of the text
it is measuring fixes both symptoms at the one spot they share.

Nothing about the DECISIONS changes — the same three checks fire at the same three places — only the
number they compare against now knows what language it is measuring.

## 23.1 `src/lib/lanes/online/transcriptSegmentation.ts` — the language-aware ceiling

At the end of the file. Replace:

```ts
export function endsWithStrongSentenceBreak(text: string, includePeriods: boolean) {
  const trimmed = text.trimEnd();
  if (!trimmed) return false;
  return findLastStrongSentenceBreak(trimmed, includePeriods) === trimmed.length;
}
```

with

```ts
export function endsWithStrongSentenceBreak(text: string, includePeriods: boolean) {
  const trimmed = text.trimEnd();
  if (!trimmed) return false;
  return findLastStrongSentenceBreak(trimmed, includePeriods) === trimmed.length;
}

// ---- one character does not carry the same amount of meaning in both languages ----
//
// The two segmentation ceilings (SEGMENT_MAX_CHARS 120 / SEGMENT_MIN_CHARS 18) COUNT CHARACTERS, and
// they were tuned around Japanese. Measured on 63 saved sessions (1,519 lines): the same sentence is
// 1.85× longer in Vietnamese than in Japanese (p25 1.54 · p75 2.23, over 836 aligned sentence pairs).
// One fixed pair of numbers therefore produces two opposite behaviours:
//   • Vietnamese hits the "too long, cut it" ceiling on 12.1% of its lines — Japanese on 0.3%, a 40×
//     difference;
//   • Japanese sits under the "too short, wait and glue" floor on 58% of its lines and is glued into
//     whole thoughts, while Vietnamese sits there on only 19% and almost never gets glued.
// The operator sees exactly those two symptoms: the Japanese window reads as sentences, the Vietnamese
// window breaks mid-clause. Scaling the ceiling by the language of the text itself is the fix at the
// right spot.
export const SEGMENT_VI_CHAR_FACTOR = 1.85;

const JA_SCRIPT = /[぀-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿]/gu;
// JA_SCRIPT: kana · katakana phonetic extensions · kanji (CJK ext-A, unified, compatibility).
const LATIN_LETTER = /\p{Script=Latin}/gu;
/** A Japanese sentence may still carry a proper noun in Latin script; a Vietnamese sentence may quote a
 *  kanji or two. Weighing by RATIO lands both cases on the right side. */
const JA_SCRIPT_WEIGHT = 2;

export function isJapaneseHeavy(text: string): boolean {
  const ja = (text.match(JA_SCRIPT) || []).length;
  if (ja === 0) return false;
  const latin = (text.match(LATIN_LETTER) || []).length;
  return ja * JA_SCRIPT_WEIGHT >= latin;
}

/** The character ceiling for THIS text. The base number is the one tuned for Japanese. */
export function segmentCharLimit(base: number, text: string): number {
  return isJapaneseHeavy(text) ? base : Math.round(base * SEGMENT_VI_CHAR_FACTOR);
}
```

## 23.2 `onlineLane.ts` — the same three decisions, measured with the right ruler

**(a)** The import. Replace:

```ts
import { endsWithStrongSentenceBreak, findFirstCommaClauseBreak, findLastStrongSentenceBreak } from './transcriptSegmentation';
```

with

```ts
import { endsWithStrongSentenceBreak, findFirstCommaClauseBreak, findLastStrongSentenceBreak, segmentCharLimit } from './transcriptSegmentation';
```

**(b)** The "complete sentence" floor. Replace:

```ts
    // M12: a buffer that already READS as a finished sentence goes straight through. Everything else is
    // treated as half a thought and waits one continuation window — the "≥40 characters ⇒ translate it
    // now" rule that used to sit here is what put half-sentences on the loudspeaker. Two ceilings bound
    // the wait: the buffer is already a full line's worth, or it has been held long enough.
    const complete = endsWithStrongSentenceBreak(buf, true) && buf.length >= SEGMENT_MIN_CHARS;
```

with

```ts
    // M12: a buffer that already READS as a finished sentence goes straight through. Everything else is
    // treated as half a thought and waits one continuation window — the "≥40 characters ⇒ translate it
    // now" rule that used to sit here is what put half-sentences on the loudspeaker. Two ceilings bound
    // the wait: the buffer is already a full line's worth, or it has been held long enough.
    //
    // TASK 23: both ceilings COUNT CHARACTERS, and a Vietnamese character carries less meaning than a
    // Japanese one (measured: 1.85×). With the fixed numbers Vietnamese hit the cut ceiling 40× as often
    // as Japanese, while Japanese was glued into whole thoughts and Vietnamese almost never was. So the
    // ruler now follows the language of the text it measures.
    const complete = endsWithStrongSentenceBreak(buf, true) && buf.length >= segmentCharLimit(SEGMENT_MIN_CHARS, buf);
```

**(c)** The flush ceiling. Replace:

```ts
    if (buf.length >= SEGMENT_MAX_CHARS || Date.now() - segmentFirstFinalAt >= SEGMENT_MAX_HOLD_MS) {
```

with

```ts
    if (buf.length >= segmentCharLimit(SEGMENT_MAX_CHARS, buf) || Date.now() - segmentFirstFinalAt >= SEGMENT_MAX_HOLD_MS) {
```

**(d)** The head/remainder split. Replace:

```ts
    if (text.length > SEGMENT_MAX_CHARS) {
```

with

```ts
    if (text.length > segmentCharLimit(SEGMENT_MAX_CHARS, text)) {
```

Those are the ONLY three comparison sites of the two constants on the live path — (b), (c) and (d) — and
after this task `git grep -c 'segmentCharLimit(' -- src/lib/lanes/online/onlineLane.ts` returns exactly
**3**.

## 23.3 Tests — new file `tests/segmentCharLimit.test.ts`, **8 cases**

`import { isJapaneseHeavy, segmentCharLimit, SEGMENT_VI_CHAR_FACTOR, endsWithStrongSentenceBreak } from
'../src/lib/lanes/online/transcriptSegmentation'`. Declare the two lane constants locally —
`const SEGMENT_MAX_CHARS = 120` and `const SEGMENT_MIN_CHARS = 18` — with a comment saying the repetition
is deliberate: if somebody changes the lane's numbers without re-reading the measured evidence, this file
must go red. Use one realistic sentence per language, e.g.
`const JA = 'それでは、皆様にこのアプリを一緒に体験していただきたいと思います。'` and
`const VI = 'Dạ, sau đây thì mời các thầy cô, các anh chị mình cùng trải nghiệm thử cái app này nhé.'`.

**`describe('segmentCharLimit — one Vietnamese character is not one Japanese character')`**

1. Language detection on the plain cases: `isJapaneseHeavy(JA)` is true, `isJapaneseHeavy(VI)` is false,
   and both `''` and a digits-only string (`'123 456'` — no letters at all) are false.
2. A Japanese sentence carrying a Latin proper noun is still Japanese: assert true for
   `'JPCクラウドベンがこのアプリを使っております。'` and `'N5から5つのレベルがあります。'`.
3. A Vietnamese sentence quoting a kanji or two is still Vietnamese — the ratio keeps it from being
   squeezed by the Japanese ruler: assert false for
   `'Trong một cái tổng thể như vậy thì có năm cấp độ, từ N5 đến 日本語 nhé.'` and
   `'Hán tự 一 này là chữ nhất, các em nhớ giùm cô.'`.
4. Japanese keeps the original numbers, Vietnamese is scaled: `segmentCharLimit(SEGMENT_MAX_CHARS, JA)`
   is `120`, `segmentCharLimit(SEGMENT_MIN_CHARS, JA)` is `18`,
   `segmentCharLimit(SEGMENT_MAX_CHARS, VI)` is `222` (120 × 1.85) and
   `segmentCharLimit(SEGMENT_MIN_CHARS, VI)` is `33` (18 × 1.85, rounded).
5. The factor is a MEASURED number, not a pretty one: `SEGMENT_VI_CHAR_FACTOR` is `>= 1.54` and
   `<= 2.23` — the p25 and p75 of the 836 measured pairs, quoted in a comment.

For the last three cases, restate the lane's two rules verbatim as helpers —
`const complete = (buf: string) => endsWithStrongSentenceBreak(buf, true) && buf.length >= segmentCharLimit(SEGMENT_MIN_CHARS, buf)`
and `const mustCut = (buf: string) => buf.length >= segmentCharLimit(SEGMENT_MAX_CHARS, buf)`:

6. An average Vietnamese line is no longer "too long": a 152-character string (`'x'.repeat(152)` — the
   measured p90 of Vietnamese lines) satisfies `p90.length >= SEGMENT_MAX_CHARS` (the OLD rule cut it)
   but `mustCut(p90)` is false (the new rule leaves it whole).
7. A short Vietnamese fragment now waits to be glued, like Japanese always did:
   `complete('Dạ, cảm ơn cô.')` is false (14 chars, has a full stop, still under the scaled floor), while
   a full sentence like `'Dạ, cảm ơn cô, sau đây mời các anh chị trải nghiệm thử.'` is complete — long
   enough and finished, so it goes out at once.
8. Japanese behaviour does not move — that side was working and must not change: `complete(JA)` is true,
   `mustCut(JA)` is false, and `complete('はい。')` is false (still under the unchanged floor of 18, still
   glued, exactly as before).

Running total after this task: 612 + 8 = **620**.

---

# TASK 24 — Speech rhythm, the full version: four steps, self-learning, and it moves to Settings

**Why, said plainly.** PART 2 TASK 13 installed a three-step knob that adjusts the RECOGNISER's
silence-to-end-of-sentence (the `pauseSecs` ridden on the token request). The 03/08 measurements showed
that number is only the backstop: what actually cuts sentences in practice is the CLIENT pair — the
600/800ms stability windows `scribeManualCommit` waits before committing a partial that already reads as
finished. The operator's complaint "one breath and it becomes a sentence" is the 600ms, not the 1.5s. So
this task upgrades TASK 13's work in place, deliberately: each step now carries the client pair too, a
fourth step lets the M13 pause profile override that pair with the speaker's own measured rhythm (with a
wider ceiling, so a genuinely slow speaker is not flattened back to 1.1s), and the knob moves from the
console drawer to the Settings page, where per-machine configuration already lives. The client pair is
read LIVE — changing the step mid-session takes effect on the next partial — while the upstream backstop
still applies from the next dial, and the UI says which is which.

Replacing part of what PART 2 built is intentional and on the record; do not try to keep both wirings.
The hook state (`speechRhythm`/`setSpeechRhythm`), the lane config getter (`getPauseSecs`), the
`asrPauseSecs` diagnostic and the console select all go; the lane reads the persisted step directly and
reports the step's NAME (`pauseRhythm`) instead of the raw upstream number.

## 24.1 `src/lib/lanes/online/speechRhythm.ts` — the module, rewritten whole

> **This block quotes PART 2 §13.1's output** — the file it created, verbatim and in full. It is not at
> `3afcee3` (the file did not exist there). Replace the ENTIRE file content.

Replace:

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

with

```ts
// src/lib/lanes/online/speechRhythm.ts — "nhịp nói của buổi": how long a silence has to last before a
// sentence is considered over.
//
// Four named steps, never a number, because the person setting this before a ceremony is not going to
// reason about seconds of silence. The middle step deliberately sends NOTHING upstream, so the server's
// own configured default stays in charge unless somebody actively chooses otherwise — the same
// three-state shape the room-filter request used.
//
// The clamp lives here AND on the server. The server's copy is the one that matters (a client can send
// anything); this one exists so the Settings page can show the operator the value that will really be
// used.

export type SpeechRhythm = 'slow' | 'normal' | 'fast' | 'adaptive';

export const SPEECH_RHYTHM_KEY = 'proyaku_online_speech_rhythm';
export const SPEECH_RHYTHM_DEFAULT: SpeechRhythm = 'normal';

// The TWO CLIENT-SIDE numbers, and in practice THEY are what cuts a sentence. The recogniser's own
// `commit_strategy=vad` only closes a turn after ~1.5s of silence, but `scribeManualCommit` closes far
// earlier: once the partial reads as a finished sentence and has held still for 600ms, it commits. The
// operator's complaint "one breath and it becomes a sentence" is THIS 600ms, not the 1.5s — so every
// step has to move BOTH, otherwise the knob only changes the backstop and never the thing that cuts.
export const RHYTHM_ADAPTIVE_MAX_MS = 2_000; // wider ceiling for the self-learning step (the profile's own is 1_100)

// Below 0.6 s the recogniser cuts inside ordinary speech; above 3.0 s the audience watches a blank wall
// while somebody is talking. Both ends are the operator's protection, not a vendor limit.
export const PAUSE_SECS_MIN = 0.6;
export const PAUSE_SECS_MAX = 3.0;

export const SPEECH_RHYTHM_OPTIONS: readonly {
  value: SpeechRhythm;
  label: string;
  /** what to send upstream; `undefined` means "say nothing and let the server's own setting stand" */
  secs: number | undefined;
  /** the client-side cut: how long a sentence that already reads as finished must hold still. */
  sentenceMs: number;
  /** no closing punctuation yet but already long — weaker evidence, so it waits longer. */
  longMs: number;
  /** on this step the MEASURED rhythm of the current speaker may override the two numbers above. */
  adaptive: boolean;
  hint: string;
}[] = [
  {
    value: 'slow',
    label: 'Người nói chậm, hay ngắt',
    secs: 2.4,
    sentenceMs: 1_100,
    longMs: 1_400,
    adaptive: false,
    hint: 'Họp nội bộ, người phát biểu vừa nghĩ vừa nói. Máy chờ gần gấp đôi trước khi chốt, nên một cái ngưng lấy hơi không còn bị tính thành hết câu.',
  },
  {
    value: 'normal',
    label: 'Bình thường',
    secs: undefined,
    sentenceMs: 600,
    longMs: 800,
    adaptive: false,
    hint: 'Giữ nguyên cài đặt sẵn của máy chủ và hai mốc chờ gốc. Chọn cái này nếu không chắc.',
  },
  {
    value: 'fast',
    label: 'MC nói liền mạch',
    secs: 0.9,
    sentenceMs: 450,
    longMs: 650,
    adaptive: false,
    hint: 'Lễ, MC đọc theo kịch bản, gần như không ngắt. Máy chốt câu sớm hơn nên phụ đề lên nhanh hơn.',
  },
  {
    value: 'adaptive',
    label: 'Tự học theo người đang nói',
    secs: 2.4,
    sentenceMs: 900, // the stand-in until the profile has measured its 8 pauses
    longMs: 1_100,
    adaptive: true,
    hint: 'Máy tự đo khoảng ngắt nghỉ của chính người đang nói rồi đặt mốc chờ theo họ, đo riêng cho mỗi thứ tiếng nên người nói nhanh và người nói chậm không kéo nhau. Cần khoảng 8 lần ngắt để học xong; trong lúc đó tạm chờ 0,9s.',
  },
];

export function isSpeechRhythm(v: unknown): v is SpeechRhythm {
  return v === 'slow' || v === 'normal' || v === 'fast' || v === 'adaptive';
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

/**
 * The two client-side waits for this step, plus the ceiling the measured rhythm may push them to.
 *
 * `maxMs` only means anything when `adaptive`: it is the ceiling `recommendStableWindows` is allowed to
 * return. On a non-learning step the two numbers are fixed and the profile is ignored entirely — when
 * the operator has said what they want, the machine does not second-guess them.
 */
export function rhythmCommitWindows(v: SpeechRhythm): {
  sentenceMs: number;
  longMs: number;
  adaptive: boolean;
  maxMs: number;
} {
  const o = SPEECH_RHYTHM_OPTIONS.find((x) => x.value === v) ?? SPEECH_RHYTHM_OPTIONS[1];
  return {
    sentenceMs: o.sentenceMs,
    longMs: o.longMs,
    adaptive: o.adaptive,
    maxMs: o.adaptive ? RHYTHM_ADAPTIVE_MAX_MS : o.sentenceMs,
  };
}

/** The same rule the server applies. `undefined` in, or anything not a finite number, `undefined` out. */
export function clampPauseSecs(v: unknown): number | undefined {
  const n = Number(v);
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) return undefined;
  return Math.min(PAUSE_SECS_MAX, Math.max(PAUSE_SECS_MIN, n));
}
```

## 24.2 `speechPauseProfile.ts` — the learner takes a caller-supplied ceiling

**Why here too.** The M13 profile clamps every recommendation to `STABLE_WINDOW_MAX_MS` (1,100ms). A
speaker who genuinely leaves 1.5–2s between clauses had every recommendation flattened to 1,100ms — below
their real pause — so the adaptation was invisible for exactly the speakers it exists to serve. The
ceiling becomes the CALLER's choice; every existing caller keeps the original one by default, so nothing
changes for anybody who does not pass the new argument.

**(a)** Replace:

```ts
export function recommendStableWindows(gaps: number[]): StableWindows | null {
  const usable = gaps.filter(pauseGapIsUsable);
  if (usable.length < PAUSE_PROFILE_MIN_SAMPLES) return null;

  const typical = pausePercentile(usable, PAUSE_PROFILE_PERCENTILE);
  const sentenceMs = clamp(
    Math.round(typical + PAUSE_SENTENCE_MARGIN_MS),
    STABLE_WINDOW_MIN_MS,
    STABLE_WINDOW_MAX_MS,
  );
  // A partial with no sentence-ending punctuation is weaker evidence, so it waits longer — the same
  // ordering the fixed 600/800 pair had.
  const longMs = clamp(sentenceMs + PAUSE_LONG_EXTRA_MS, STABLE_WINDOW_MIN_MS, STABLE_WINDOW_MAX_MS);
  return { sentenceMs, longMs, samples: usable.length };
}
```

with

```ts
export function recommendStableWindows(
  gaps: number[],
  maxMs: number = STABLE_WINDOW_MAX_MS,
): StableWindows | null {
  const usable = gaps.filter(pauseGapIsUsable);
  if (usable.length < PAUSE_PROFILE_MIN_SAMPLES) return null;

  // TASK 24: the ceiling is now the CALLER's, not a module constant. A speaker who leaves 1.5–2s
  // between clauses had every recommendation flattened to 1_100ms — below their real pause — so the
  // adaptation was invisible for exactly the speakers it exists to serve. The knob's "Tự học" step
  // hands in a wider ceiling; every other caller keeps the original one.
  const ceiling = Math.max(STABLE_WINDOW_MIN_MS, Number.isFinite(maxMs) ? maxMs : STABLE_WINDOW_MAX_MS);
  const typical = pausePercentile(usable, PAUSE_PROFILE_PERCENTILE);
  const sentenceMs = clamp(Math.round(typical + PAUSE_SENTENCE_MARGIN_MS), STABLE_WINDOW_MIN_MS, ceiling);
  // A partial with no sentence-ending punctuation is weaker evidence, so it waits longer — the same
  // ordering the fixed 600/800 pair had.
  const longMs = clamp(sentenceMs + PAUSE_LONG_EXTRA_MS, STABLE_WINDOW_MIN_MS, ceiling);
  return { sentenceMs, longMs, samples: usable.length };
}
```

**(b)** Replace:

```ts
    windows(key = 'default'): StableWindows | null {
      return recommendStableWindows(gapsByKey.get(key) ?? []);
    },
```

with

```ts
    windows(key = 'default', maxMs: number = STABLE_WINDOW_MAX_MS): StableWindows | null {
      return recommendStableWindows(gapsByKey.get(key) ?? [], maxMs);
    },
```

## 24.3 `onlineLane.ts` — the client pair follows the step; the diagnostics name it

**(a)** The import. Replace:

```ts
import { fetchAsrSession, createAsrCodec, type AsrCodec } from './asrTransport';
```

with

```ts
import { fetchAsrSession, createAsrCodec, type AsrCodec } from './asrTransport';
import { SPEECH_RHYTHM_DEFAULT, loadSpeechRhythm, rhythmCommitWindows, rhythmPauseSecs, speechRhythmLabel } from './speechRhythm';
```

**(b)** The config getter goes — the lane now reads the persisted step itself, live.

> **This block quotes PART 2 §13.4(a)'s output.** The lines are not at `3afcee3`.

Replace:

```ts
  // TASK 6.2: one mic, two directions — read ONCE at start() and latched for the whole session.
  getTwoWay?: () => boolean;
  onDirectedLine?: (line: DirectedLaneLine) => void;
  // TASK 13: the meeting's speech rhythm, as seconds of silence. Read at TICKET time, like every other
  // handshake parameter — it is baked into the single-use URL, so a change mid-session takes effect from
  // the next dial. `undefined` means "say nothing" and the server's own default stands.
  getPauseSecs?: () => number | undefined;
```

with

```ts
  // TASK 6.2: one mic, two directions — read ONCE at start() and latched for the whole session.
  getTwoWay?: () => boolean;
  onDirectedLine?: (line: DirectedLaneLine) => void;
```

**(c)** The `asrPauseSecs` diagnostic goes with it — the step's NAME (below) is what the operator can act
on; the raw upstream number was never actionable alone.

> **This block quotes PART 2 §13.4(b)'s output.**

Replace:

```ts
  vendorTags: number; // finals that arrived carrying the recogniser's own language verdict
  // TASK 13 — the silence-to-end-of-sentence the current handshake ACTUALLY carries, after the server's
  // clamp. `null` before the first successful dial. This is the applied value, never the requested one.
  asrPauseSecs: number | null;
```

with

```ts
  vendorTags: number; // finals that arrived carrying the recogniser's own language verdict
```

**(d)** `pauseRhythm` joins the pause trio on `OnlineDiagnostics`. Replace:

```ts
  // M13 — the sentence-cut threshold in force for the speaker at the microphone right now.
  // `pauseWindowMs` is what the last planned commit waited for (0 before the first one); `pauseSamples`
  // is how many of this speaker's pauses the profile has collected, and stays under 8 — the point where
  // it starts trusting itself — for a speaker who never pauses inside a sentence. `pauseAdaptive` says
  // which of the two numbers is being used: false = the fixed 600/800ms guess, true = this speaker's own.
  pauseWindowMs: number;
  pauseSamples: number;
  pauseAdaptive: boolean;
```

with

```ts
  // M13 — the sentence-cut threshold in force for the speaker at the microphone right now.
  // `pauseWindowMs` is what the last planned commit waited for (0 before the first one); `pauseSamples`
  // is how many of this speaker's pauses the profile has collected, and stays under 8 — the point where
  // it starts trusting itself — for a speaker who never pauses inside a sentence. `pauseAdaptive` says
  // where the number came from: true = measured off this speaker, false = a fixed number (the 600/800ms
  // guess, or the step the operator picked). `pauseRhythm` names that step, so an operator who wonders
  // why sentences cut where they do can read the answer instead of guessing.
  pauseWindowMs: number;
  pauseSamples: number;
  pauseAdaptive: boolean;
  pauseRhythm: string;
```

**(e)** The state variable goes.

> **This block quotes PART 2 §13.4(c)'s output.**

Replace:

```ts
  let vendorTags = 0;
  let asrPauseSecs: number | null = null;
```

with

```ts
  let vendorTags = 0;
```

**(f)** The chooser. It sits right before the planner driver, and it is the whole policy in one place.
Replace:

```ts
    }, nextScribeForceCommitDelay(scribeLastCommitAt, now));
  }

  // Drive the planner from the vendor's live partial. Called on every partial: the planner is cheap and
```

with

```ts
    }, nextScribeForceCommitDelay(scribeLastCommitAt, now));
  }

  // TASK 24: which two waits the planner should use for THIS partial, given the step the operator picked
  // in Cài đặt. Read live (not cached at start) so a technician can move the knob between two speakers
  // without restarting the session — the same rule the loud-gate knob follows.
  //
  // Three different intents, deliberately not collapsed:
  //   • Bình thường  → exactly what the lane did before this knob existed: the M13 learner, its own
  //                    1_100ms ceiling, planner constants until it has 8 pauses. Nobody who never opened
  //                    Cài đặt gets a changed session.
  //   • Chậm / Nhanh → the operator has stated the answer. Their numbers win outright and the learner is
  //                    ignored; a machine that quietly overrules an explicit choice is worse than one
  //                    that never adapts.
  //   • Tự học       → the learner with a wider ceiling, so a speaker who really does leave 1.6s between
  //                    clauses keeps 1.6s instead of being flattened to 1.1s. Until it has measured
  //                    enough, it runs at a middle stand-in (900/1_100ms) rather than at 600ms.
  function stableCommitWindows(): {
    windows: { sentenceMs: number; longMs: number } | null;
    /** true only when the number was MEASURED off this speaker — the diagnostics line says so. */
    learned: boolean;
  } {
    const rhythm = loadSpeechRhythm();
    if (rhythm === SPEECH_RHYTHM_DEFAULT) {
      const measured = pauseProfile.windows(pauseKey);
      return { windows: measured, learned: Boolean(measured) };
    }
    const rung = rhythmCommitWindows(rhythm);
    const fixed = { sentenceMs: rung.sentenceMs, longMs: rung.longMs };
    if (!rung.adaptive) return { windows: fixed, learned: false };
    const measured = pauseProfile.windows(pauseKey, rung.maxMs);
    return measured ? { windows: measured, learned: true } : { windows: fixed, learned: false };
  }

  // Drive the planner from the vendor's live partial. Called on every partial: the planner is cheap and
```

**(g)** The planner driver uses it. Replace:

```ts
    // M13: this speaker's own measured windows when the profile has enough pauses to be trusted; null
    // until then, and the planner falls back to its constants.
    const plan = planStableScribeCommit(
      text,
      scribePartialChangedAt,
      scribeLastCommitAt,
      Date.now(),
      pauseProfile.windows(pauseKey),
    );
    if (!plan) return; // no punctuation and not long yet — the VAD backstop still owns this turn
    lastStableWindowMs = plan.stableMs;
    lastStableWindowAdaptive = plan.adaptive;
```

with

```ts
    // M13 + the rhythm knob: this speaker's own measured windows, or the step the operator chose; null
    // means neither had an answer and the planner falls back to its constants.
    const chosen = stableCommitWindows();
    const plan = planStableScribeCommit(
      text,
      scribePartialChangedAt,
      scribeLastCommitAt,
      Date.now(),
      chosen.windows,
    );
    if (!plan) return; // no punctuation and not long yet — the VAD backstop still owns this turn
    lastStableWindowMs = plan.stableMs;
    // NOT `plan.adaptive`: the planner only knows it was handed numbers, not whether they were measured
    // off this speaker or picked by hand in Cài đặt.
    lastStableWindowAdaptive = chosen.learned;
```

**(h)** The dial sends the step's seconds directly.

> **This block quotes PART 2 §13.4(d)'s output** (the `pauseSecs` line; the line above it is baseline).

Replace:

```ts
        language: twoWay ? 'auto' : opts!.sourceLanguage,
        pauseSecs: config.getPauseSecs?.(),
```

with

```ts
        language: twoWay ? 'auto' : opts!.sourceLanguage,
        // TASK 24: re-read at EVERY dial, never latched at create — change the step in Cài đặt, press
        // Bắt đầu again, and the new backstop is already in the handshake. No page reload.
        pauseSecs: rhythmPauseSecs(loadSpeechRhythm()),
```

**(i)** The applied-value read-back goes.

> **This block quotes PART 2 §13.4(e)'s output** (the second line; the first is baseline).

Replace:

```ts
    codec = session.transport === 'direct' ? createAsrCodec(initial ? undefined : (lastFinalForReconnect || undefined)) : null;
    asrPauseSecs = typeof session.pauseSecs === 'number' ? session.pauseSecs : null;
```

with

```ts
    codec = session.transport === 'direct' ? createAsrCodec(initial ? undefined : (lastFinalForReconnect || undefined)) : null;
```

`AsrSession.pauseSecs` itself stays (PART 2 §13.3): the transport still reports what the handshake really
carries, and a later prompt may surface it again. Nothing else reads it today, and an optional field that
goes unread is not an error.

**(j)** The reset goes.

> **This block quotes PART 2 §13.4(f)'s output** (the second line; the first is baseline).

Replace:

```ts
    vendorTags = 0;
    asrPauseSecs = null;
```

with

```ts
    vendorTags = 0;
```

**(k)** Out of the diagnostics object.

> **This block quotes PART 2 §13.4(g)'s output** (the second line; the first is baseline).

Replace:

```ts
      vendorTags,
      asrPauseSecs,
```

with

```ts
      vendorTags,
```

**(l)** And the step's name goes in. Replace:

```ts
      pauseWindowMs: lastStableWindowMs,
      pauseSamples: learned?.samples ?? 0,
      pauseAdaptive: lastStableWindowAdaptive,
```

with

```ts
      pauseWindowMs: lastStableWindowMs,
      pauseSamples: learned?.samples ?? 0,
      pauseAdaptive: lastStableWindowAdaptive,
      pauseRhythm: speechRhythmLabel(loadSpeechRhythm()),
```

## 24.4 `index.ts` (facade) — the hook lets go; the Settings page takes over

The hook no longer carries rhythm state: the Settings component below and the lane both talk to
`speechRhythm.ts` directly, through one localStorage key, so the two can never disagree. Seven blocks
retract PART 2 §13.5's wiring; the eighth exports the new Settings section.

**(a)** The re-export block grows the two names the new module adds.

> **This block quotes PART 2 §13.5(a)'s output.**

Replace:

```ts
export { SUBTITLE_FONT } from '../../audienceSubtitles'
// TASK 13 — "nhịp nói của buổi". The console picks the step; the lane sends the seconds.
export type { SpeechRhythm } from './speechRhythm'
export {
  SPEECH_RHYTHM_KEY, SPEECH_RHYTHM_DEFAULT, SPEECH_RHYTHM_OPTIONS, PAUSE_SECS_MIN, PAUSE_SECS_MAX,
  isSpeechRhythm, loadSpeechRhythm, saveSpeechRhythm, speechRhythmLabel, rhythmPauseSecs, clampPauseSecs,
} from './speechRhythm'
```

with

```ts
export { SUBTITLE_FONT } from '../../audienceSubtitles'
// TASK 13 + TASK 24 — "nhịp nói của buổi". The Settings page picks the step; the lane reads it live
// (the client pair that actually cuts) and sends the seconds upstream at each dial (the backstop).
export type { SpeechRhythm } from './speechRhythm'
export {
  SPEECH_RHYTHM_KEY, SPEECH_RHYTHM_DEFAULT, SPEECH_RHYTHM_OPTIONS, PAUSE_SECS_MIN, PAUSE_SECS_MAX,
  RHYTHM_ADAPTIVE_MAX_MS, isSpeechRhythm, loadSpeechRhythm, saveSpeechRhythm, speechRhythmLabel,
  rhythmPauseSecs, rhythmCommitWindows, clampPauseSecs,
} from './speechRhythm'
```

**(b)** The hook-side import goes — nothing in this file uses the module once the wiring below is gone.

> **This block quotes PART 2 §13.5(b)'s output** (the middle line; its neighbours are baseline).

Replace:

```ts
} from './audienceWindows'
import { loadSpeechRhythm, rhythmPauseSecs, saveSpeechRhythm, type SpeechRhythm } from './speechRhythm'

export type { LaneLine, LaneStatus } from '../types'
```

with

```ts
} from './audienceWindows'

export type { LaneLine, LaneStatus } from '../types'
```

**(c)** Off the `UseOnlineLane` interface.

> **This block quotes PART 2 §13.5(c)'s output.**

Replace:

```ts
  script: ScriptMatcherEntry[]
  setScript: (rows: ScriptMatcherEntry[]) => void
  // TASK 13 — the meeting's speech rhythm, persisted per machine.
  speechRhythm: SpeechRhythm
  setSpeechRhythm: (v: SpeechRhythm) => void
```

with

```ts
  script: ScriptMatcherEntry[]
  setScript: (rows: ScriptMatcherEntry[]) => void
```

**(d)** The state goes.

> **This block quotes PART 2 §13.5(d)'s output** (the second line; the first is baseline).

Replace:

```ts
  const [script, setScript] = useState<ScriptMatcherEntry[]>([])
  const [speechRhythm, setSpeechRhythmState] = useState<SpeechRhythm>(() => loadSpeechRhythm())
```

with

```ts
  const [script, setScript] = useState<ScriptMatcherEntry[]>([])
```

**(e)** The ref and the setter go.

> **This block quotes PART 2 §13.5(e)'s output.**

Replace:

```ts
  const scriptRef = useRef<ScriptMatcherEntry[]>([])
  scriptRef.current = script
  const speechRhythmRef = useRef<SpeechRhythm>('normal')
  speechRhythmRef.current = speechRhythm
  const setSpeechRhythm = useCallback((v: SpeechRhythm) => { setSpeechRhythmState(v); saveSpeechRhythm(v) }, [])
```

with

```ts
  const scriptRef = useRef<ScriptMatcherEntry[]>([])
  scriptRef.current = script
```

**(f)** The lane-config getter goes.

> **This block quotes PART 2 §13.5(f)'s output.**

Replace:

```ts
        getScript: () => scriptRef.current,
        // TASK 13: read at ticket time, so changing the step applies from the next dial.
        getPauseSecs: () => rhythmPauseSecs(speechRhythmRef.current),
```

with

```ts
        getScript: () => scriptRef.current,
```

**(g)** Out of the returned object.

> **This block quotes the line as PART 2 left it** — §13.5(g) wrote `speechRhythm, setSpeechRhythm,` and
> TASK 14 §14.3 appended `eventId, setEventId,` to the same line. `eventId, setEventId` stays.

Replace:

```ts
    speechRhythm, setSpeechRhythm, eventId, setEventId,
```

with

```ts
    eventId, setEventId,
```

**(h)** The Settings section is exported from the facade root, next to its sibling.

> **This block quotes PART 1 TASK 2's output** (the `OnlineMicSettings` export it added).

Replace:

```ts
//   OnlineMicSettings  — the Settings "Độ nhạy micro" section (per machine / per hall)
export { default as OnlineMicSettings } from './components/OnlineMicSettings'
```

with

```ts
//   OnlineMicSettings  — the Settings "Độ nhạy micro" section (per machine / per hall)
export { default as OnlineMicSettings } from './components/OnlineMicSettings'
//   OnlineRhythmSettings — the Settings "Nhịp nói của buổi" section (per meeting, TASK 24): the
//   anti-fragment knob — how long a silence must last before a sentence is closed.
export { default as OnlineRhythmSettings } from './components/OnlineRhythmSettings'
```

## 24.5 `OnlineConsole.tsx` — the select leaves the drawer; the diagnostics line names the step

**(a)** The select goes back out of "Nguồn vào" — the knob lives in Settings now, where a technician sets
it per meeting; the drawer keeps only the per-machine and mid-session controls.

> **This block quotes PART 2 §13.6's output**; the replacement restores the `3afcee3` seam it was
> inserted into.

Replace:

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

with

```tsx
              </section>

              <div className="h-px bg-outline-variant"></div>

              {/* Chiều dịch */}
```

**(b)** The diagnostics "ngưỡng cắt" line gains the step's name and stops calling a hand-picked step
"mặc định". Replace:

```tsx
                    {/* M13 — ngưỡng cắt đang dùng cho người đang nói. "mặc định" là con số cố định
                        600/800ms; "theo người nói" nghĩa là máy đã đo đủ (từ 8 nhịp ngắt trở lên) và
                        đang dùng nhịp của chính người đó. Số nhịp đứng yên suốt buổi = người nói
                        không ngắt giữa câu, và ngưỡng mặc định vẫn đang giữ việc. */}
                    <div>ngưỡng cắt {diag.pauseWindowMs || '—'}{diag.pauseWindowMs ? 'ms' : ''} · {diag.pauseAdaptive ? 'theo người nói' : 'mặc định'} · {diag.pauseSamples} nhịp</div>
```

with

```tsx
                    {/* M13 + TASK 24 — the sentence-cut wait in force for the current speaker. "theo
                        người nói" = the profile has measured enough (8+ pauses) and is using this
                        speaker's own rhythm; "đặt sẵn" = a fixed number, either the original 600/800ms
                        pair or the step picked in Cài đặt — whose name is printed right after. A sample
                        count frozen all session = the speaker never pauses mid-sentence, so there is
                        nothing to learn from yet. */}
                    <div>ngưỡng cắt {diag.pauseWindowMs || '—'}{diag.pauseWindowMs ? 'ms' : ''} · {diag.pauseAdaptive ? 'theo người nói' : 'đặt sẵn'} · {diag.pauseSamples} nhịp · {diag.pauseRhythm}</div>
```

**(c)** The import. Remove `SPEECH_RHYTHM_OPTIONS` and the type `SpeechRhythm` from the facade import on
line 16 (PART 2 §13.6 added them there) — after (a), nothing in this file uses either, and `tsc` will say
so. This is an instruction and not a replace block for the same reason PART 3 §19.5(a) gives: that line
has been rewritten by many tasks and no quotable form of it exists. Touch nothing else on the line.

## 24.6 New file `src/lib/lanes/online/components/OnlineRhythmSettings.tsx`, and the Settings section

**(a)** The component. Same shape as its sibling `OnlineMicSettings`: radios, a toast on pick, no
`useOnlineLane`.

```tsx
// src/lib/lanes/online/components/OnlineRhythmSettings.tsx — the "Nhịp nói của buổi" Settings section.
//
// This is the anti-fragment knob. Every step adjusts TWO numbers, not one:
//   • the client-side wait (600ms on Bình thường) — in practice THE thing that cuts sentences, and it
//     takes effect IMMEDIATELY, mid-session, because the lane re-reads the step on every partial;
//   • the seconds sent upstream to the recogniser (server default 1.5s) — only the final backstop, and
//     it only changes from the next session start, because it rides the session handshake.
// The operator complaint "one breath and it becomes a sentence" is the FIRST number.
//
// Waiting longer ⇒ whole thoughts, fewer mid-clause cuts, slower subtitles; waiting less ⇒ faster
// subtitles that break into fragments more easily. The hints say this in the operator's own terms.
//
// Unlike "Độ nhạy micro" (per machine, per hall), this one is PER MEETING — a ceremony with a scripted
// MC is nothing like an internal meeting where people think aloud.
//
// Deliberately does NOT call `useOnlineLane` — same reason as OnlineMicSettings: a config page must not
// spin up diagnostics timers, the audience publisher, or the voice-catalog fetch.

import React, { useState } from 'react'
import {
  SPEECH_RHYTHM_OPTIONS,
  loadSpeechRhythm,
  saveSpeechRhythm,
  speechRhythmLabel,
  rhythmPauseSecs,
  rhythmCommitWindows,
  type SpeechRhythm,
} from '../index'
import { toast } from '../../../toast'

/** 600 → "0,6s". The operator thinks in seconds, not milliseconds. */
const secsOf = (ms: number): string => (ms / 1000).toFixed(1).replace('.', ',')

const OnlineRhythmSettings: React.FC = () => {
  const [value, setValue] = useState<SpeechRhythm>(() => loadSpeechRhythm())

  const choose = (v: SpeechRhythm) => {
    setValue(v)
    saveSpeechRhythm(v)
    const w = rhythmCommitWindows(v)
    toast.success(
      w.adaptive
        ? `Đã chọn ${speechRhythmLabel(v)} — máy sẽ tự đo nhịp của người đang nói`
        : `Đã chọn ${speechRhythmLabel(v)} — chờ ${secsOf(w.sentenceMs)}s im lặng mới chốt câu`,
    )
  }

  const secs = rhythmPauseSecs(value)

  return (
    <div className="space-y-3">
      <p className="text-sm text-on-surface-variant">
        Máy phải nghe <strong>im lặng bao lâu</strong> thì mới coi là người nói đã hết câu. Đặt ngắn quá thì
        câu bị <strong>cắt vụn</strong> giữa chừng; đặt dài quá thì phụ đề lên chậm. Chọn theo{' '}
        <strong>cách nói của buổi này</strong>, không theo micro.
      </p>

      <div role="radiogroup" aria-label="Nhịp nói của buổi" className="space-y-2">
        {SPEECH_RHYTHM_OPTIONS.map((o) => {
          const on = value === o.value
          return (
            <label
              key={o.value}
              htmlFor={`rhythm-${o.value}`}
              className={`flex items-start gap-3 rounded-DEFAULT border px-3 py-2.5 cursor-pointer transition-colors ${on ? 'border-secondary bg-surface' : 'border-outline-variant hover:border-primary'}`}
            >
              <input
                id={`rhythm-${o.value}`}
                type="radio"
                name="rhythm"
                value={o.value}
                checked={on}
                onChange={() => choose(o.value)}
                className="accent-secondary mt-1"
              />
              <span className="min-w-0">
                <span className={`font-label-caps text-label-caps ${on ? 'text-secondary' : 'text-on-surface'}`}>
                  {o.label}
                  <span className="ml-2 tabular-nums text-on-surface-variant">
                    {o.adaptive ? 'tự đo' : `cắt sau ${secsOf(o.sentenceMs)}s`}
                  </span>
                </span>
                <span className="block text-xs text-on-surface-variant leading-relaxed mt-0.5">{o.hint}</span>
              </span>
            </label>
          )
        })}
      </div>

      <p className="text-xs text-on-surface-variant/80">
        Đang chọn: <strong>{speechRhythmLabel(value)}</strong>
        {rhythmCommitWindows(value).adaptive
          ? ' — mốc chờ do máy tự đo theo người đang nói (tối đa 2,0s); chưa đo đủ thì tạm chờ 0,9s.'
          : ` — máy chờ ${secsOf(rhythmCommitWindows(value).sentenceMs)}s im lặng mới chốt một câu.`}{' '}
        <strong>Có hiệu lực ngay</strong>, kể cả đang chạy giữa buổi.
      </p>
      <p className="text-xs text-on-surface-variant/60">
        Chốt chặn cuối gửi lên máy nhận dạng:{' '}
        {secs === undefined ? 'giữ cài đặt sẵn (1,5s)' : `${String(secs).replace('.', ',')}s`} — phần này
        nằm trong lần bắt tay đầu phiên nên chỉ đổi từ lần bấm Bắt đầu kế tiếp. Lưu trên máy này.
      </p>
    </div>
  )
}

export default OnlineRhythmSettings
```

**(b)** `src/pages/Settings.tsx` — the import.

> **This block quotes PART 1 §2.4's output.**

Replace:

```tsx
import { OnlineKeysSettings, OnlineMicSettings } from '../lib/lanes/online';
```

with

```tsx
import { OnlineKeysSettings, OnlineMicSettings, OnlineRhythmSettings } from '../lib/lanes/online';
```

**(c)** `src/pages/Settings.tsx` — the section, right under the mic section.

> **This block quotes PART 1 §2.4's output** (the mic section it added; the `{/* HIỂN THỊ */}` marker is
> baseline).

Replace:

```tsx
                    {/* CHẾ ĐỘ ONLINE — ĐỘ NHẠY MICRO (theo máy / theo hội trường) */}
                    <Section id="ms" icon="mic" title="Chế độ ONLINE — Độ nhạy micro" desc="Máy này đang nghe bằng loại micro nào. Đặt một lần theo phòng, không phải đặt lại mỗi buổi.">
                        <OnlineMicSettings />
                    </Section>

                    {/* HIỂN THỊ */}
```

with

```tsx
                    {/* CHẾ ĐỘ ONLINE — ĐỘ NHẠY MICRO (theo máy / theo hội trường) */}
                    <Section id="ms" icon="mic" title="Chế độ ONLINE — Độ nhạy micro" desc="Máy này đang nghe bằng loại micro nào. Đặt một lần theo phòng, không phải đặt lại mỗi buổi.">
                        <OnlineMicSettings />
                    </Section>

                    {/* CHẾ ĐỘ ONLINE — NHỊP NÓI CỦA BUỔI (theo từng buổi — nút chống vụn câu) */}
                    <Section id="rh" icon="graphic_eq" title="Chế độ ONLINE — Nhịp nói của buổi" desc="Máy chờ im lặng bao lâu mới chốt một câu. Chờ ngắn thì câu bị cắt vụn, chờ lâu thì phụ đề lên chậm.">
                        <OnlineRhythmSettings />
                    </Section>

                    {/* HIỂN THỊ */}
```

## 24.7 `docs/ONLINE-LANE-UI-API.md` — say where it went

At the very end of the file (after the hall-babble removal note PART 1 wrote).

> **The anchor below is PART 1 TASK 4's output** — the closing paragraph of its removal note.

Replace:

```md
**The way back in, when the vendor lifts the restriction:** the server is untouched. `buildScribeWsParams`
still implements the three-state rule (`true` → set it; `false` → send nothing and beat the env; absent →
`SCRIBE_FILTER_BACKGROUND`) and the token endpoint still accepts a boolean `roomFilter` in the request
body. The client simply always takes the "absent" branch now, so switching it back on is one environment
variable — no code change, no client redeploy.
```

with

```md
**The way back in, when the vendor lifts the restriction:** the server is untouched. `buildScribeWsParams`
still implements the three-state rule (`true` → set it; `false` → send nothing and beat the env; absent →
`SCRIBE_FILTER_BACKGROUND`) and the token endpoint still accepts a boolean `roomFilter` in the request
body. The client simply always takes the "absent" branch now, so switching it back on is one environment
variable — no code change, no client redeploy.

## Speech rhythm — "Nhịp nói của buổi" (four steps, lives in Settings)

The per-meeting rhythm knob is **Settings → "Chế độ ONLINE — Nhịp nói của buổi"** (`Section id="rh"`,
component `OnlineRhythmSettings`, exported from the facade root). It is NOT in the console drawer and it
is NOT hook state — the Settings page and the lane both go through `speechRhythm.ts` and one localStorage
key, so they can never disagree.

Each of the four steps carries THREE numbers, split across the two halves of the pipeline:

- the client pair `sentenceMs`/`longMs` (via `rhythmCommitWindows`) — the stability waits that actually
  cut sentences. The lane re-reads the step on every partial, so a change applies IMMEDIATELY,
  mid-session.
- the upstream `secs` (via `rhythmPauseSecs`) — the recogniser's silence backstop, ridden on the token
  request as `pauseSecs`. It is baked into the handshake, so it applies from the next Bắt đầu. `normal`
  sends nothing and leaves the server default standing.

The fourth step, `adaptive` ("Tự học theo người đang nói"), lets the M13 pause profile override the
client pair with the speaker's own measured rhythm under a wider ceiling (`RHYTHM_ADAPTIVE_MAX_MS`,
2,000ms — the profile's own ceiling stays 1,100ms for every other caller). Until the profile has its 8
pauses the step runs at a fixed 900/1,100ms stand-in. An explicit `slow`/`fast` pick always beats the
learner; `normal` behaves exactly as the lane did before the knob existed.

The diagnostics line `ngưỡng cắt … · <tên nấc>` names the step in force (`diag.pauseRhythm`), and its
"đặt sẵn"/"theo người nói" flag says whether the wait in use was hand-picked or measured.
```

## 24.8 `tests/speechRhythm.test.ts` — the whole suite is replaced: 18 cases → **16**

PART 2 §13.7 created this file and PART 3 §20.6 updated one number in it. This task REPLACES ITS CONTENT
WHOLE — do not merge, do not keep old cases. Three of the old cases (§13.7's 16–18) pin things this task
removed or re-homed (the `getPauseSecs`/`asrPauseSecs` plumbing, the facade getter, the endpoint count),
and the rest are superseded by the four-step module. The endpoint-count guard is NOT lost: `tests/sessionBoxes.test.ts`
(PART 3 §20.7, cases 16 and its server round-trips) still pins `server/online-api.mjs` at exactly **16**
occurrences of `pathname === '/online-api/` — which is also why this file no longer needs to.

The new file: imports from `'../src/lib/lanes/online/speechRhythm'` (`SPEECH_RHYTHM_OPTIONS`,
`SPEECH_RHYTHM_DEFAULT`, `PAUSE_SECS_MIN`, `PAUSE_SECS_MAX`, `RHYTHM_ADAPTIVE_MAX_MS`, `isSpeechRhythm`,
`rhythmPauseSecs`, `rhythmCommitWindows`, `clampPauseSecs`, `speechRhythmLabel`), from
`'../src/lib/lanes/online/speechPauseProfile'` (`createSpeechPauseProfile`, `recommendStableWindows`,
`STABLE_WINDOW_MAX_MS`), from `'../src/lib/lanes/online/scribeManualCommit'`
(`SCRIBE_MANUAL_SENTENCE_STABLE_MS`, `SCRIBE_MANUAL_LONG_STABLE_MS`), and `buildScribeWsParams` from
`'../server/online-api.mjs'` behind the same `// @ts-expect-error — plain .mjs` line
`tests/serverAsr.test.ts` uses. One shared
`const base = { token: 't', language: 'auto', keyterms: [] as string[], roomFilter: undefined }`.

**`describe('speechRhythm — the anti-fragment knob')` — 11 cases**

1. Exactly four steps, in the order `['slow', 'normal', 'fast', 'adaptive']`, and the upstream seconds
   are `2.4` / `undefined` / `0.9` / `2.4` — the middle step deliberately sends nothing, and the
   adaptive step's `2.4` is only the wide backstop (the real cutting is the measured client pair).
2. The default is `'normal'`: `SPEECH_RHYTHM_DEFAULT` is `'normal'` and
   `rhythmPauseSecs(SPEECH_RHYTHM_DEFAULT)` is `undefined` — nobody's behaviour changes until they
   choose.
3. Every step that does send seconds sends them inside the safe range: for each option with `secs`
   defined, `PAUSE_SECS_MIN <= secs <= PAUSE_SECS_MAX`.
4. Junk is rejected and labels always read: `isSpeechRhythm('slow')` true, `'turbo'` and `null` false,
   and `speechRhythmLabel('fast')` is `'MC nói liền mạch'`.
5. Each step carries the client pair, ascending with slowness: `rhythmCommitWindows('fast')` matches
   `{ sentenceMs: 450, longMs: 650, adaptive: false }`, `'normal'` → `{ 600, 800, false }`, `'slow'` →
   `{ 1_100, 1_400, false }`; `'normal'`'s two numbers EQUAL `SCRIBE_MANUAL_SENTENCE_STABLE_MS` and
   `SCRIBE_MANUAL_LONG_STABLE_MS` (otherwise the default changed behaviour for people who never touched
   the knob); and the three `sentenceMs` values sort ascending `fast < normal < slow`.
6. Only the learning step lets the measurement override, and its ceiling is wider:
   `rhythmCommitWindows('adaptive').adaptive` is true with `maxMs === RHYTHM_ADAPTIVE_MAX_MS`,
   `RHYTHM_ADAPTIVE_MAX_MS > STABLE_WINDOW_MAX_MS`, and for the three fixed steps `adaptive` is false
   and `maxMs` equals their own `sentenceMs`.
7. The wider ceiling really frees the learned wait: with twelve 1 600ms gaps,
   `recommendStableWindows(gaps)` still flattens to `sentenceMs: STABLE_WINDOW_MAX_MS` (the old
   ceiling), while `recommendStableWindows(gaps, RHYTHM_ADAPTIVE_MAX_MS)` returns `sentenceMs: 1_720`
   (1 600 + the 120ms margin) — the speaker who pauses 1.6s is no longer clamped to 1.1s.
8. An unknown step falls back to `normal`, not to `undefined`:
   `rhythmCommitWindows('turbo' as never)` matches `{ sentenceMs: 600, longMs: 800 }`.
9. The lane's chooser rule, restated verbatim (a local `pick()` mirroring
   `onlineLane.stableCommitWindows()` over a `createSpeechPauseProfile()` fed twelve 1 600ms gaps on one
   key): `pick('fast')` → 450 and `pick('slow')` → 1 100 (the operator has spoken — the machine does not
   argue), `pick('normal')` → `STABLE_WINDOW_MAX_MS` (exactly as before the knob), `pick('adaptive')` →
   1 720 (the speaker's real rhythm).
10. Not enough samples yet ⇒ the adaptive step runs at its stand-in, not at 600ms: with only one
    observed gap, `profile.windows('ja', rhythmCommitWindows('adaptive').maxMs)` is null, so the chosen
    pair is the step's own `{ 900, 1_100 }`, and `900 > SCRIBE_MANUAL_SENTENCE_STABLE_MS`.
11. `clampPauseSecs`: `undefined`, `null`, `''`, `'xin chào'` and `NaN` → `undefined`; `0.1` →
    `PAUSE_SECS_MIN`; `99` → `PAUSE_SECS_MAX`; `1.8` → `1.8`.

**`describe('speechRhythm — the server has the last word')` — 5 cases**

12. Sending nothing keeps the server's 1.5s: `buildScribeWsParams({ ...base })` yields
    `params.get('vad_silence_threshold_secs') === '1.5'` and `vadApplied === 1.5`.
13. A valid step's seconds ride through exactly: `vadSilenceSecs: 2.4` → `'2.4'` / `2.4`, and
    `vadSilenceSecs: 0.9` → `'0.9'` / `0.9`.
14. The server clamps on its own — a hand-edited client cannot push past the range: `0.05` →
    `vadApplied === 0.6`, `60` → `vadApplied === 3`.
15. Junk never corrupts the handshake: for each of `null`, `'nhanh'`, `NaN`, `{}` as `vadSilenceSecs`,
    `vadApplied === 1.5`.
16. The three other VAD parameters do not move: with `vadSilenceSecs: 0.9`,
    `vad_threshold === '0.4'`, `min_speech_duration_ms === '100'`, `min_silence_duration_ms === '100'`
    and `commit_strategy === 'vad'`.

Running total after this task: 620 − 18 + 16 = **618**.

---

# When PART 4 is done

Run all three, in this order, and report the numbers verbatim:

```
npx vitest run
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

**Expected: 618 tests passing.** PART 3 left the suite at 605; TASK 21 rewrites one case in place (±0),
TASK 22 adds 7, TASK 23 adds 8, and TASK 24 replaces an 18-case file with a 16-case one (−2).
605 + 0 + 7 + 8 − 2 = **618**.
(For the record: 288 at `3afcee3`, still untouched, + 315 cases from PARTS 1–3 after the rhythm-suite
swap took two back, + 15 new here = 618. The −2 is the deliberate cost of replacing the rhythm suite
whole rather than patching cases that pin removed wiring.)

Then check these by hand, because a passing test suite does not prove them:

1. `git diff --stat package.json package-lock.json` is **empty**, and `git diff --name-only` lists no
   file under `src/lib/lanes/offline/`, and neither `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`,
   `src/lib/useMeter.ts` nor `src/lib/lanes/types.ts`.
2. `git grep -n "SCRIBE_LANGUAGE_WHITELIST = env" -- server/online-api.mjs` shows the default `'vi,ja'`
   — Vietnamese first — and the comment above it still forbids the empty-string fallback.
3. `git grep -c "segmentCharLimit(" -- src/lib/lanes/online/onlineLane.ts` prints **3**, and
   `git grep -n "SEGMENT_MIN_CHARS;" -- src/lib/lanes/online/onlineLane.ts` prints nothing (no bare
   comparison against the unscaled floor is left on the live path).
4. `git grep -n "asrPauseSecs" -- src/` prints **nothing**, `git grep -n "getPauseSecs" -- src/` prints
   **nothing**, and `git grep -n "online-console-rhythm" -- src/` prints **nothing** — the three pieces
   of PART 2 wiring this part retracts are gone without residue.
5. `git grep -n "pauseRhythm" -- src/lib/lanes/online/onlineLane.ts` finds exactly three lines: the
   comment on the pause trio that documents it, the `OnlineDiagnostics` field, and the `getDiagnostics`
   entry. `git grep -n "pauseRhythm" -- src/lib/lanes/online/components/OnlineConsole.tsx` finds exactly
   one: the diagnostics line that prints it.
6. `server/online-api.mjs` still has exactly **16** occurrences of `pathname === '/online-api/` — count
   them; this part added no route.
7. `git grep -c '  it(' -- tests/serverAsr.test.ts tests/asrTransport.test.ts tests/sessionExport.test.ts`
   prints **26**, **26** and **3** — unchanged from what PART 2 left — and the same count on
   `tests/asrSpeechEvidence.test.ts` prints **12** (5 baseline + the 7 TASK 22 added).
8. Open the app once: **Cài đặt** shows the new section "Chế độ ONLINE — Nhịp nói của buổi" with four
   radio choices and a toast on pick; the console's "Nguồn vào" drawer no longer contains a "Nhịp nói
   của buổi" select; and after a session starts, the Chẩn đoán line reads
   `ngưỡng cắt … · đặt sẵn/theo người nói · … nhịp · <tên nấc>`.

Report once, at the end: the three command outputs, the eight checks above, and anything you had to
decide that this file did not decide for you.

This is the LAST part of PROMPT-11. Nothing waits behind it; deploy order stays PART 1 → 2 → 3 → 4, and
parts 1–3 do not need to wait for this one.
