# PROMPT-10 — PHẦN 2: Đọc đúng câu đã duyệt · Màn khán giả · Không nghe nhầm nhạc · Bối cảnh do AI viết

**Gửi cho:** Claude trong repo `EsuhaiAlesu/ATS_UserUI` (nhánh `develop`).
**Nền:** commit `c8e19f4` trên nhánh `develop` — tức là **phần 1 đã chạy xong và đã lên mạng rồi**. Prompt này viết tiếp lên trên phần 1.
**Đã trả lời sẵn 2 câu hỏi bên kia hỏi sau phần 1** (đổi tên file tài liệu, và chuyện hai thứ tiếng Nhật–Việt cùng lúc) — nằm ngay trong prompt, Sếp không phải trả lời gì thêm.

**Nội dung phần 2 — 4 việc còn lại:**

1. **Đọc đúng câu đã duyệt.** Buổi lễ nào cũng có kịch bản, và trong phần Chuẩn bị đã có người duyệt sẵn từng câu tiếng Nhật. Khi MC đọc đúng một câu trong kịch bản thì bản dịch hay nhất **không phải** câu máy vừa dịch, mà chính là câu người đã duyệt. Máy sẽ nhận ra và đọc thẳng câu đó — đúng từng chữ, và nhanh hơn 1–2 giây. Nhận sai một câu là đọc sai trước cả hội trường, nên máy được đặt rất "nhát": không chắc chắn thì im, cứ dịch như thường.
2. **Màn khán giả.** Cửa sổ phụ đề nay có thể thu thành **một dải dọc hẹp nằm nép bên phải (hoặc trái) màn hình đang ngồi**, để vừa dịch vừa mở việc khác. Dải hẹp thì hai cột tự xếp trên–dưới, chữ tự co lại, và có nút bấm tay thay cho phím tắt. Chữ phụ đề cũng **đậm hơn**, câu đang nói **màu vàng thương hiệu** — đọc từ cuối hội trường rõ hơn hẳn.
3. **Không nghe nhầm nhạc thành lời nói.** Ba chốt: (a) máy **tự học nhịp ngắt của chính người đang nói** để cắt câu đúng lúc, thay vì dùng một con số cố định cho mọi người; (b) câu nào chữ không đúng thứ tiếng của giọng đọc thì **hiện phụ đề nhưng không đọc lên loa** (tránh giọng Nhật đọc một câu tiếng Anh thành tiếng ồn); (c) máy phân biệt **tiếng vỗ tay / nhạc nền / tiếng ù** với giọng người, và thêm nút **"Ngưng nghe"** để kỹ thuật viên tự bấm khi có tiết mục, chiếu video hay hát.
4. **Bối cảnh do AI viết.** Hiện nay ô "Bối cảnh" chỉ dán được đoạn **mở đầu** của mỗi tài liệu — với một kịch bản gala 40 trang thì đó là trang bìa. Nay có nút **"Tóm tắt tài liệu bằng AI"**: máy đọc hết tài liệu đã nhập rồi tự viết bối cảnh và gợi ý danh sách tên riêng. Bấm **trước buổi**, kết quả hiện ra trong ô để người vận hành đọc và sửa lại, lưu luôn cho lần sau.

**Cách gửi:** copy **toàn bộ phần dưới dấu `---`** (tiếng Anh) rồi dán cho Claude. Không cần sửa gì thêm.

---

<role>
You are working in `EsuhaiAlesu/ATS_UserUI`, on the **ONLINE lane only**. Base: commit `c8e19f4` on
`develop` — the commit in which you landed PROMPT-10 PART 1, already deployed. Every anchor quoted in
this prompt was checked against that exact commit, so the text you are told to replace should match
character for character. If PART 1 is not in the tree — if `decideFinalLanguage`,
`planStableScribeCommit`, `getContinuationWaitMs` or `sourceIsFragment` do not exist — stop and say so
instead of guessing; every anchor below assumes them.

Read `CLAUDE.md` and `docs/ONLINE-LANE-CONTRACT.md` first. Online-lane client code lives only in
`src/lib/lanes/online/`; the online backend is `server/online-api.mjs`. You must not touch any
offline-lane file (`src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`) and you
must not add or change any npm dependency.

Three files in this part live OUTSIDE `src/lib/lanes/online/` and that is correct, not a violation:
`src/lib/audienceSubtitles.ts`, `src/lib/prepData.ts` and `src/lib/prepSummary.ts` are lane-neutral —
the audience-wall page and the Chuẩn bị pages import them, and neither belongs to a lane. They must not
import anything from `src/lib/lanes/online/`.
</role>

<context>
PART 1 fixed what the lane HEARS and where it CUTS. This part is about four things that sit on top of
it, and they are independent of each other — none of them blocks the others.

**1. The approved script is being ignored.**
Chuẩn bị → Kịch bản already holds the ceremony line by line, with a human-approved Japanese sentence
against each Vietnamese one. During the session the lane never looks at it: every sentence is translated
from scratch, so the audience gets the model's wording rather than the wording the company approved, and
pays a 1–2 s refine round trip for the privilege. Matching a finalised sentence against that script and
speaking the approved line instead is the single largest quality win left.

The risk is asymmetric and shapes the whole design: **a wrong snap is spoken aloud, in a fluent,
confident, human-approved voice, and it cannot be taken back.** Missing a line that could have snapped
costs 1–2 seconds and the machine translation is still correct. So every threshold below is set to
REFUSE when unsure, and each one was measured rather than guessed — including against the real
20th-anniversary gala script (71 approved lines, VI↔JA).

**2. The audience wall only knows one shape.**
The wall window assumes a hall projector: two columns, text at 2.6× the console size, and a keyboard hint
for controls. An operator who wants the two-way subtitle beside their other applications has nowhere to
put it, and a narrow window renders two unreadable columns with a control bar that fades out three
seconds in and cannot be brought back without a mouse. Separately, the subtitle weight is the design
system's regular — which loses its thin strokes at twenty metres, over a projector's washed-out black.

**3. Loud is not the same as spoken.**
The near-mic gate measures LOUD vs QUIET. In a hall, music, applause, a video soundtrack and a lion dance
are all LOUD, so every downstream guard that counts "voiced milliseconds" agrees somebody must be
speaking, and the recogniser is handed four seconds of music and writes down words nobody said. Three
independent repairs, all of which only ever cost ONE line when they are wrong:
  (a) the sentence-cut threshold stops being one fixed number for everybody and is learned from the
      pauses the person at the microphone is actually taking;
  (b) the loudspeaker refuses text that is not in the language of the voice (the refine model sometimes
      returns English, and a Japanese voice reading English letter-shapes is noise over the next
      sentence) — the subtitle is still shown;
  (c) a shape monitor tells applause and a hum from a voice, and a "Ngưng nghe" button lets the
      technician mute the microphone by hand for a performance or a video.

**4. The Bối cảnh box describes a 40-page script by its cover page.**
The brief is the only context the refine model holds for the whole event, and it is currently built
mechanically: conference header, speaker list, then the OPENING paragraph of each imported file, cut at
1500 characters. This part adds one pre-session call that reads the documents properly and writes the
brief — and returns the proper nouns it found. It is a SUGGESTION: it lands in an editable box the
operator approves before pressing Bắt đầu, and it is never spoken.

**What is already done (PART 1) — do not redo it.** The language whitelist, the vendor language tag,
`decideFinalLanguage`, the client-side commit (`scribeManualCommit.ts` / `planStableScribeCommit`), the
completeness gate (`getContinuationWaitMs`, `endsOpenEnded`), `sourceIsFragment` / `previousFragment`,
and the diagnostics lines `cắt …`, `ghép ý …`, `máy nghe: …`. Contract is at **v0.5**; this part takes it
to **v0.6**.
</context>

<answers_to_the_two_questions_you_raised_after_part_1>
You ended the PART 1 report with two open questions. Both are answered here; neither needs anything
from the owner.

**1. Yes — rename the PART 1 prompt file.** `docs/index.html` is PART 1's Markdown saved under an
`.html` name by the upload, and it is dead weight under that name: nothing in the repo links to it, no
GitHub Pages workflow exists, and nothing serves `docs/`. Rename it with `git mv` to exactly the name
you proposed:

```
git mv docs/index.html docs/PROMPT-10-part1-hear-cut-translate.md
```

Do not edit its contents — it is the historical record of what PART 1 asked for, including the parts
you had to interpret. Save THIS prompt beside it as `docs/PROMPT-10-part2-script-wall-brief.md`, and
your report for this part as `docs/PROMPT-10-PART-2-RUN-LOG.md` (PART 1's log convention).

**2. The `ja,vi` language whitelist is already proven against the live vendor — treat it as settled.**
You were right that you could not verify it from the desk, and right not to claim it. It has since been
verified on a real session against the real endpoint, and these are the findings, so that you do not
design around a risk that is not there:

- Sending both tags in one session is accepted by the vendor. Two-way translation still worked in both
  directions; nothing degraded to a single language.
- The vendor reports two different things and they are not interchangeable: `language_code` is what it
  **heard**, `language` is what it was **told to expect**. PART 1's `decideFinalLanguage` reads the
  first, which is correct — do not "simplify" it to the second.
- The heard-language tag rides on the SECOND, timestamped final only. The first final for an utterance
  arrives without it. Any code that expects the tag on the first final will read `undefined` and fall
  back forever, which looks exactly like the vendor not supporting the feature. It does support it.

So: no fallback path, no single-language mode, and no probing session is needed. If a rehearsal ever
shows the `máy nghe:` diagnostics line stuck on one language, the cause is the ordering above, not the
whitelist.
</answers_to_the_two_questions_you_raised_after_part_1>

<task>
Ten tasks. TASKS 1–5 are self-contained pure modules and can be written in any order; TASK 6 wires all of
them into the lane and depends on all five; TASKS 7–10 depend on TASK 6.

- TASK 1 — The approved-script matcher (new pure module).
- TASK 2 — Learn the sentence-cut threshold from the speaker instead of fixing it.
- TASK 3 — Never let the loudspeaker read a language the voice cannot pronounce.
- TASK 4 — Tell applause, music and a hum from a human voice.
- TASK 5 — One place decides what the microphone actually puts on the wire.
- TASK 6 — Wire all five into `onlineLane.ts`.
- TASK 7 — The console: the script, "Ngưng nghe", the wall dock, five diagnostics lines.
- TASK 8 — The audience wall: docking, one-column reflow, both languages per panel, bolder gold text.
- TASK 9 — M14: let the model read the documents and write the Bối cảnh.
- TASK 10 — Tests.
</task>

---

## TASK 1 — The approved-script matcher

**File: `src/lib/lanes/online/scriptMatcher.ts`** (NEW). Dependency-free: no React, no fetch, no DOM.
Create it with exactly this content.

```ts
// src/lib/lanes/online/scriptMatcher.ts — match a just-finalised utterance against the approved event
// script. DEPENDENCY-FREE and framework-neutral (no React, no fetch, no DOM), like the rest of the lane
// core; the facade owns all state.
//
// An Esuhai ceremony always runs to a script: the MC reads it near-verbatim and a human has already
// approved the Japanese for each line. When a finalised sentence matches a script line, the best
// translation is NOT the one the model just produced — it is the approved line already sitting in the
// script. Snapping to it skips both draft and refine: exact wording, and 1–2s sooner.
//
// The risk is asymmetric, so this module is biased towards REFUSAL: a wrong snap is spoken aloud in a
// fluent, confident, human-approved voice, and once spoken it cannot be taken back. Missing a line that
// could have snapped costs 1–2 seconds and the machine translation is still correct; snapping the wrong
// line puts entirely different content in front of the audience.
//
// The measure is the Dice coefficient over character bigrams, after stripping Latin diacritics and ALL
// whitespace. That shape is chosen because the real noise from speech recognition is syllable
// splitting/joining and wrong diacritics — "Ê su hai" vs "Esuhai", "kính thưa" vs "kinh thưa". With
// whitespace gone those strings nearly coincide; compared word-by-word they miss completely.

export type ScriptLanguage = 'vi' | 'ja';

/** One script line. Structurally the same as the UI's `ScriptEntry`, so rows pass straight through. */
export type ScriptMatcherEntry = {
    id: string;
    src_lang: string;      // the script tool allows vi|ja|en|th|ko|zh; anything but vi/ja simply never matches
    src: string;
    dst_lang: string;
    dst: string;
    status: 'draft' | 'approved';
};

/** `snap` = speak the approved line · `suggest` = show it but translate as usual · `none` = ignore. */
export type ScriptMatchBand = 'snap' | 'suggest' | 'none';

export type ScriptMatch = {
    band: ScriptMatchBand;
    /** Final score after the order bonus/penalty — this is what picks the band. */
    score: number;
    /** Raw Dice, before bonus/penalty. For the diagnostics readout. */
    rawScore: number;
    /** The runner-up's score; too close and the two lines are indistinguishable. */
    runnerUpScore: number;
    /** One line, or a run of adjacent lines when the MC reads them in a single breath. */
    entryIds: string[];
    /** Position of the first line in the script — drives the order window. */
    index: number;
    /** The script's own source sentence (for review). */
    scriptSource: string;
    /** The approved line that would be spoken. */
    scriptTarget: string;
    targetLanguage: ScriptLanguage;
    /** Why it did not reach a higher band — shown verbatim to the operator. */
    reason: string;
};

export type ScriptMatchConfig = {
    /** At or above this, speak the script line verbatim. */
    snapThreshold: number;
    /** At or above this, surface a suggestion but still translate normally. */
    suggestThreshold: number;
    /** The winner must beat the runner-up by at least this much. */
    runnerUpMargin: number;
    /** Reject outright past this length difference, however many bigrams agree. */
    lengthTolerance: number;
    /** Minimum normalised length of a Vietnamese utterance before it is considered. */
    minCharsVi: number;
    /** Minimum for Japanese — denser script, so a lower floor. */
    minCharsJa: number;
    /** How many lines behind the expected next line still counts as in order. */
    orderWindowBack: number;
    /** How far ahead (an MC skipping a few lines is routine). */
    orderWindowForward: number;
    /** Added when the candidate IS the expected next line. */
    orderBonus: number;
    /** Subtracted when it falls outside the order window. */
    outOfOrderPenalty: number;
    /** How many consecutive script lines may be merged into one candidate (1 = no merging). */
    maxMergeLines: number;
};

// The three thresholds below were measured over 139 real sessions (6,950 utterances), not chosen by
// feel. At 0.82, with 2,135 off-script utterances as counter-examples:
//   · snapped to the wrong line : 0.0%
//   · snapped an off-script line: 0.0%
//   · caught a scripted line    : 98.0% (6% misheard) · 95.1% (12%) · 86.2% (20%)
// Wrong snaps were already 0 from 0.74 up, so raising the bar only loses catches without buying safety:
// 0.86 costs 11 points under bad audio and returns 0.0% → 0.0%.
//
// RE-MEASURED against the real 20th-anniversary gala script (71 approved lines, VI↔JA, 2026-07-31).
// The three thresholds hold: 100% / 100% / 99% / 90% caught at 0 / 6 / 12 / 20% mishearing, 0 wrong
// snaps at every level. A ceremonial script does contain frighteningly same-shaped lines —
// 「竹部様、誠にありがとうございました。」 and 「里村様、…」 score 0.867 against each other, above the snap
// bar — but the 0.06 runner-up margin holds them apart.
//
// `maxMergeLines: 6` is measured too, not guessed. When the MC reads several lines in one breath the
// recogniser commits them as ONE utterance, and every read longer than the merge span pushes the
// machine onto a run offset by one line. Measured on that same gala script, wrong-start snaps (first
// line dropped, next line spoken early) by number of lines read in one breath:
//   merge span 2 (old): 3 lines 25% · 4 lines 9%
//   merge span 4      : up to 4 lines 0% · 5 lines 11% · 6 lines 10%
//   merge span 6      : up to 6 lines 0% · 7 lines 1%
// And the residue only survives on a PERFECTLY clean transcript; at 6% and 12% mishearing it is 0 at
// every read length, because bad audio drags the score down and the matcher stays silent. Reading 7
// lines straight is roughly 45 seconds without a 1.5 s pause — beyond what an MC working a ceremonial
// script does — so 6 is enough, and anything past it only makes the matcher silent, never wrong.
export const DEFAULT_SCRIPT_MATCH_CONFIG: ScriptMatchConfig = {
    snapThreshold: 0.82,
    suggestThreshold: 0.66,
    runnerUpMargin: 0.06,
    lengthTolerance: 0.35,
    minCharsVi: 14,
    minCharsJa: 8,
    orderWindowBack: 2,
    orderWindowForward: 6,
    orderBonus: 0.04,
    outOfOrderPenalty: 0.06,
    maxMergeLines: 6,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const round2 = (value: number) => Number(value.toFixed(3));

const isMatchLanguage = (lang: string): lang is ScriptLanguage => lang === 'vi' || lang === 'ja';

/**
 * Reduce a sentence to a comparable form: drop Vietnamese tone marks, fold katakana onto hiragana,
 * remove all whitespace and punctuation.
 *
 * Only the U+0300–U+036F combining block (the Vietnamese marks) is stripped. Japanese dakuten/handakuten
 * live at U+3099/U+309A and are left alone — stripping those would turn 「が」into「か」, a different word.
 */
export function normalizeForMatch(text: string): string {
    if (typeof text !== 'string' || !text) return '';
    return text
        .normalize('NFKC')
        .toLowerCase()
        .replace(/đ/g, 'd')
        .normalize('NFD')
        .replace(/[\u0300-\u036F]/g, '')
        .normalize('NFC')
        .replace(/[ァ-ヶ]/g, (kana) => String.fromCharCode(kana.charCodeAt(0) - 0x60))
        .replace(/[^\p{L}\p{N}]+/gu, '');
}

/** Character bigrams as a multiset — repeats counted, so a repetitive sentence cannot score high on echo. */
function bigrams(normalized: string): Map<string, number> {
    const counts = new Map<string, number>();
    for (let i = 0; i + 1 < normalized.length; i += 1) {
        const gram = normalized.slice(i, i + 2);
        counts.set(gram, (counts.get(gram) ?? 0) + 1);
    }
    return counts;
}

const gramTotal = (counts: Map<string, number>) => {
    let total = 0;
    for (const value of counts.values()) total += value;
    return total;
};

/** Dice coefficient: 2 × shared ÷ the two totals. 1 = identical, 0 = nothing in common. */
export function diceCoefficient(left: string, right: string): number {
    if (!left || !right) return 0;
    if (left === right) return 1;
    if (left.length < 2 || right.length < 2) return left === right ? 1 : 0;

    const a = bigrams(left);
    const b = bigrams(right);
    let shared = 0;
    for (const [gram, count] of a) {
        const other = b.get(gram);
        if (other) shared += Math.min(count, other);
    }
    const total = gramTotal(a) + gramTotal(b);
    return total === 0 ? 0 : (2 * shared) / total;
}

type Candidate = {
    entryIds: string[];
    index: number;
    /** Language of this candidate's source side — only compared against speech in the same language. */
    sourceLanguage: ScriptLanguage;
    targetLanguage: ScriptLanguage;
    source: string;
    target: string;
    normalized: string;
    approved: boolean;
};

/** Filler that ends up in a translation box when a script is half-filled or a failed result was pasted. */
const JUNK_TEXT = /^(n\/?a|none|null|undefined|not available|chưa dịch|chưa có|-+)$/i;

/**
 * Is this box actually filled in, in the language it claims?
 *
 * A half-filled row — empty Japanese, still Vietnamese, or carrying an error string — spoken aloud is
 * worse than a wrong snap: a wrong snap at least produces a plausible Japanese sentence, this produces
 * nonsense in a ballroom. So each side must contain the script of the language it declares.
 */
export function isUsableText(text: string, language: ScriptLanguage): boolean {
    const trimmed = typeof text === 'string' ? text.trim() : '';
    if (trimmed.length < 2 || JUNK_TEXT.test(trimmed)) return false;
    return language === 'ja'
        ? /[぀-ゟ゠-ヿ一-鿿]/.test(trimmed)
        : /[a-zà-ỹ]/i.test(trimmed);
}

function pushCandidate(list: Candidate[], candidate: Omit<Candidate, 'normalized'>) {
    if (!isUsableText(candidate.source, candidate.sourceLanguage)) return;
    if (!isUsableText(candidate.target, candidate.targetLanguage)) return;
    const normalized = normalizeForMatch(candidate.source);
    if (normalized.length < 2) return;
    list.push({ ...candidate, normalized });
}

/**
 * Build the candidate list from the script.
 *
 * Every row enters in BOTH directions: hearing the Vietnamese returns the Japanese, and hearing the
 * Japanese returns the script's own Vietnamese. One two-way microphone means either side may speak first.
 *
 * Rows also enter as RUNS of adjacent lines (2, then 3, …up to `maxMergeLines`), because an MC reads
 * "Kính thưa quý vị đại biểu. Kính thưa quý khách. Kính thưa các vị lãnh đạo." in a single breath and the
 * recogniser returns all three as ONE final. Without a run candidate of the same length, the only
 * candidates that survive the length gate are the SHORTER runs sitting inside it — so the matcher snaps
 * to lines 2+3, never speaks line 1, and speaks line 3 ahead of its turn. Covering the full run makes the
 * correct candidate score ~1.0 and win outright, which is why this is a candidate-shape fix and not a
 * threshold change.
 */
export function buildScriptCandidates(
    entries: readonly ScriptMatcherEntry[],
    maxMergeLines: number = DEFAULT_SCRIPT_MATCH_CONFIG.maxMergeLines,
): Candidate[] {
    const candidates: Candidate[] = [];
    if (!Array.isArray(entries)) return candidates;
    const maxRun = Math.max(1, Math.floor(maxMergeLines));

    entries.forEach((entry, index) => {
        if (!entry || typeof entry.src !== 'string' || typeof entry.dst !== 'string') return;
        if (!isMatchLanguage(entry.src_lang) || !isMatchLanguage(entry.dst_lang)) return;
        const src_lang = entry.src_lang;
        const dst_lang = entry.dst_lang;

        // Grow the run one line at a time, emitting a candidate at every length. A run stops at the first
        // row that is missing, malformed, or points a different way — never merge across a direction flip.
        const ids: string[] = [];
        const srcParts: string[] = [];
        const dstParts: string[] = [];
        let approved = true;

        for (let run = 1; run <= maxRun; run += 1) {
            const row = run === 1 ? entry : entries[index + run - 1];
            if (!row || typeof row.src !== 'string' || typeof row.dst !== 'string') break;
            if (row.src_lang !== src_lang || row.dst_lang !== dst_lang) break;
            ids.push(row.id);
            srcParts.push(row.src);
            dstParts.push(row.dst);
            approved = approved && row.status === 'approved';

            const source = srcParts.join(' ');
            const target = dstParts.join(' ');
            const entryIds = [...ids];
            pushCandidate(candidates, {
                entryIds,
                index,
                sourceLanguage: src_lang,
                targetLanguage: dst_lang,
                source,
                target,
                approved,
            });
            pushCandidate(candidates, {
                entryIds,
                index,
                sourceLanguage: dst_lang,
                targetLanguage: src_lang,
                source: target,
                target: source,
                approved,
            });
        }
    });

    return candidates;
}

const NO_MATCH = (reason: string): ScriptMatch => ({
    band: 'none',
    score: 0,
    rawScore: 0,
    runnerUpScore: 0,
    entryIds: [],
    index: -1,
    scriptSource: '',
    scriptTarget: '',
    targetLanguage: 'ja',
    reason,
});

/**
 * Session-long matcher. Remembers the last line it accepted, so it knows where the script has got to.
 *
 * Only call this on a FINALISED sentence, never on a running partial: matching mid-utterance makes the
 * text on screen jump back and forth, and half a sentence is not evidence enough to match on anyway.
 */
export function createScriptMatcher(
    entries: readonly ScriptMatcherEntry[],
    overrides: Partial<ScriptMatchConfig> = {},
) {
    const config: ScriptMatchConfig = { ...DEFAULT_SCRIPT_MATCH_CONFIG, ...overrides };
    const candidates = buildScriptCandidates(entries, config.maxMergeLines);
    let lastIndex = -1;

    function match(text: string, language: ScriptLanguage): ScriptMatch {
        if (candidates.length === 0) return NO_MATCH('kịch bản trống');

        const heard = normalizeForMatch(text);
        const floor = language === 'ja' ? config.minCharsJa : config.minCharsVi;
        // Short utterances are the main source of wrong snaps: "Xin cảm ơn", "Kính mời" recur a dozen
        // times in a script and every one of them scores about the same, so there is no right line.
        if (heard.length < floor) return NO_MATCH(`câu quá ngắn (${heard.length} ký tự)`);

        const expected = lastIndex + 1;
        const scored: { candidate: Candidate; raw: number; adjusted: number }[] = [];

        for (const candidate of candidates) {
            if (candidate.sourceLanguage !== language) continue;

            // Length gate BEFORE scoring: two sentences too far apart in length are different sentences
            // however many bigrams agree (the short one simply sits inside the long one).
            const longer = Math.max(heard.length, candidate.normalized.length);
            if (longer === 0) continue;
            if (Math.abs(heard.length - candidate.normalized.length) / longer > config.lengthTolerance) continue;

            const raw = diceCoefficient(heard, candidate.normalized);
            if (raw <= 0) continue;

            const distance = candidate.index - expected;
            const inWindow = distance >= -config.orderWindowBack && distance <= config.orderWindowForward;
            const adjusted = clamp01(
                raw
                + (distance === 0 ? config.orderBonus : 0)
                - (inWindow ? 0 : config.outOfOrderPenalty),
            );

            scored.push({ candidate, raw, adjusted });
        }

        if (scored.length === 0) return NO_MATCH('không có dòng nào gần giống');

        scored.sort((a, b) => b.adjusted - a.adjusted);
        const { candidate, raw, adjusted } = scored[0];
        // The real rival is the best-scoring candidate STARTING ON A DIFFERENT ROW. The same row seen
        // from the other direction, or a single row vs a run beginning at that same row, is not a
        // second option.
        const runnerUp = scored.find((item) => !sameStart(candidate, item.candidate))?.adjusted ?? 0;
        const result: ScriptMatch = {
            band: 'none',
            score: round2(adjusted),
            rawScore: round2(raw),
            runnerUpScore: round2(runnerUp),
            entryIds: candidate.entryIds,
            index: candidate.index,
            scriptSource: candidate.source,
            scriptTarget: candidate.target,
            targetLanguage: candidate.targetLanguage,
            reason: '',
        };

        if (adjusted < config.suggestThreshold) {
            return { ...result, band: 'none', reason: `điểm thấp (${result.score})` };
        }
        if (adjusted < config.snapThreshold) {
            return { ...result, band: 'suggest', reason: `gần giống nhưng chưa đủ chắc (${result.score})` };
        }
        // Winner and runner-up neck and neck means the script holds two near-identical lines — if they
        // cannot be told apart, do not guess.
        if (adjusted - runnerUp < config.runnerUpMargin) {
            return { ...result, band: 'suggest', reason: `sát điểm với một dòng khác (${result.runnerUpScore})` };
        }
        if (!candidate.approved) {
            return { ...result, band: 'suggest', reason: 'dòng chưa được duyệt' };
        }
        return { ...result, band: 'snap', reason: 'khớp kịch bản' };
    }

    return {
        /** Judge one finalised sentence. Does NOT remember the result — call `accept()` when it is used. */
        match,
        /**
         * Record that a line was used, so the order window advances with the script. Kept separate from
         * `match()` because the operator can veto, and a vetoed line must not drag the cursor forward.
         */
        accept(result: ScriptMatch): void {
            if (result.index >= 0) lastIndex = result.index + (result.entryIds.length - 1);
        },
        /** The script line currently awaiting its turn (for a "we are on line N" readout). */
        position(): number {
            return lastIndex + 1;
        },
        reset(): void {
            lastIndex = -1;
        },
        /** How many candidates were built — 0 means an empty script, which must be flagged before going live. */
        size: candidates.length,
        config,
    };
}

export type ScriptMatcher = ReturnType<typeof createScriptMatcher>;

/**
 * Two candidates off the same script row are not rivals: the same sentence from either direction, or a
 * single row against a longer run built from it, are not two different choices.
 *
 * The test is the SAME STARTING ROW, not "shares some row". The run 1–2–3 and the run 2–3–4 share two
 * rows yet are genuinely different choices: one starts at row 1, the other drops row 1 and speaks row 4
 * early. When the MC reads more lines in one breath than the merge span covers, exactly those two
 * candidates come out level — treating them as "the same choice" disables the runner-up guard at the
 * one moment it matters most, and the machine picks one at random and speaks it out loud.
 */
function sameStart(a: Candidate, b: Candidate): boolean {
    return a.entryIds[0] === b.entryIds[0];
}

/**
 * Proper nouns lifted from the script to prime speech recognition (people, companies, places).
 *
 * Priming these cuts mishearings at the source — which in turn makes script matching more accurate,
 * because the string coming in is cleaner.
 */
export function scriptKeyterms(entries: readonly ScriptMatcherEntry[], limit = 100): string[] {
    const seen = new Map<string, number>();
    if (!Array.isArray(entries)) return [];

    for (const entry of entries) {
        for (const text of [entry?.src, entry?.dst]) {
            if (typeof text !== 'string') continue;
            // A capital mid-sentence in Vietnamese is almost always a proper noun; Japanese contributes
            // its katakana runs.
            const words = text.match(/[\p{Lu}][\p{L}]+(?:\s+[\p{Lu}][\p{L}]+)*|[ァ-ヶー]{3,}/gu) ?? [];
            for (const word of words) {
                const key = word.trim();
                if (key.length < 3) continue;
                seen.set(key, (seen.get(key) ?? 0) + 1);
            }
        }
    }

    return [...seen.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([word]) => word);
}
```

Two notes you must not "clean up":

- The character-class ranges are deliberate and every one of them is load-bearing. Copy them exactly.
  The diacritic strip is written as the escape `[\u0300-\u036F]` and covers ONLY that block:
  Japanese dakuten lives at U+3099/U+309A, and stripping it would turn 「が」 into 「か」, a different
  word. Do not widen it, and do not rewrite any of these classes "more simply".
- `scriptKeyterms` is exported and not yet called from anywhere in this part. That is intentional — it
  exists so the script's proper nouns can be sent to the recogniser later, and removing it as "dead code"
  would throw away a measured piece of the design.

---

## TASK 2 — Learn the sentence-cut threshold from the speaker

`planStableScribeCommit` (PART 1) already accepts an optional `windows` parameter and has never been
given one: it falls back to a fixed 600 ms (sentence-ending punctuation) / 800 ms (none). Those two
numbers have to be wrong for somebody — the ceremonial MC who leaves 800 ms between clauses gets cut
mid-sentence, and the fast speaker waits out a pause they never took. This module measures the pauses the
person at the microphone is actually taking and produces that `windows` object.

**File: `src/lib/lanes/online/speechPauseProfile.ts`** (NEW).

```ts
// src/lib/lanes/online/speechPauseProfile.ts — the sentence-cut threshold, learned from the speaker
// instead of being a fixed timer.
//
// scribeManualCommit.ts closes a turn once the partial has READ as a finished sentence and then stopped
// changing for 600ms (800ms without punctuation). Those two numbers have to be wrong for somebody: the
// ceremonial MC who leaves 800ms between clauses gets cut mid-sentence, while the fast speaker waits out
// a pause they never took. This module measures the pauses the person at the microphone is ACTUALLY
// taking and hands `planStableScribeCommit` its own numbers — the `windows` parameter it has been
// carrying, unused, since it was written.
//
// Pauses are measured in MILLISECONDS, which is why this is its own module rather than something folded
// into sourceSpeechPace.ts: that one counts whitespace-separated tokens as a syllable proxy, so it yields
// nothing at all for Japanese (no spaces between words). Silence is the same quantity in both languages.
//
// Pure functions plus one tiny accumulator — no timers, no network, no DOM.

export const PAUSE_GAP_MIN_MS = 150;
export const PAUSE_GAP_MAX_MS = 2_500;
export const PAUSE_PROFILE_MIN_SAMPLES = 8;
export const PAUSE_PROFILE_WINDOW = 40;
export const STABLE_WINDOW_MIN_MS = 400;
export const STABLE_WINDOW_MAX_MS = 1_100;
export const PAUSE_SENTENCE_MARGIN_MS = 120;
export const PAUSE_LONG_EXTRA_MS = 200;
/** Of this speaker's own pauses, wait out this share before cutting. */
export const PAUSE_PROFILE_PERCENTILE = 0.75;

export type StableWindows = {
  sentenceMs: number;
  longMs: number;
  /** How many pauses the recommendation rests on — the operator's diagnostics read this. */
  samples: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * A gap only counts as a deliberate pause. Below the floor it is the cadence of the audio chunks
 * themselves; above the ceiling the speaker has stopped talking altogether, and counting end-of-turn
 * silence would drag every threshold up until the adaptation is worse than the constant it replaced.
 */
export function pauseGapIsUsable(gapMs: number): boolean {
  return Number.isFinite(gapMs) && gapMs >= PAUSE_GAP_MIN_MS && gapMs <= PAUSE_GAP_MAX_MS;
}

export function pausePercentile(gaps: number[], share: number): number {
  if (gaps.length === 0) return 0;
  const sorted = [...gaps].sort((left, right) => left - right);
  const index = clamp(Math.ceil(share * sorted.length) - 1, 0, sorted.length - 1);
  return sorted[index] ?? 0;
}

/**
 * null means "not enough evidence yet" — the caller keeps its fixed defaults. Returning a half-learned
 * number would be worse than not adapting at all, because the first pauses of a session are usually the
 * microphone being adjusted rather than the speaker talking.
 */
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

/**
 * Keyed because one microphone carries two speakers taking turns (the Vietnamese MC, then the Japanese
 * guest): a fast Japanese guest must not set the threshold for the slow Vietnamese MC. In a one-way
 * session every observation lands on the same key and the keying costs nothing.
 */
export function createSpeechPauseProfile() {
  const gapsByKey = new Map<string, number[]>();

  return {
    observe(gapMs: number, key = 'default'): boolean {
      if (!pauseGapIsUsable(gapMs)) return false;
      const gaps = gapsByKey.get(key) ?? [];
      gaps.push(gapMs);
      // Only the recent past: a speaker who slows down after forty minutes should drag the threshold
      // with them.
      if (gaps.length > PAUSE_PROFILE_WINDOW) gaps.splice(0, gaps.length - PAUSE_PROFILE_WINDOW);
      gapsByKey.set(key, gaps);
      return true;
    },
    windows(key = 'default'): StableWindows | null {
      return recommendStableWindows(gapsByKey.get(key) ?? []);
    },
    reset(): void {
      gapsByKey.clear();
    },
  };
}

export type SpeechPauseProfile = ReturnType<typeof createSpeechPauseProfile>;
```

Do not change `scribeManualCommit.ts`. Its `windows` parameter already does the right thing with this
shape; TASK 6 simply starts passing one.

---

## TASK 3 — Never let the loudspeaker read a language the voice cannot pronounce

### 3.1 Expose the raw script evidence

**File: `src/lib/lanes/online/utteranceDirection.ts`** — insert immediately after the
`const clampConf = …` line, before the `classifyUtterance` doc-comment:

```ts
/**
 * The raw script evidence in a piece of text, for a caller that must WEIGH it rather than be handed a
 * verdict: the TTS guard needs to know how much of a line is Japanese, not merely whether any of it is —
 * a Vietnamese sentence quoting エスハイ is still Vietnamese. Exported from here so there is exactly one
 * copy of these three character classes in the lane.
 */
export function scriptSignals(text: string): { kana: number; kanji: number; vnMarks: number; chars: number } {
  const t = (text || '').trim()
  return { kana: count(t, KANA), kanji: count(t, KANJI), vnMarks: count(t, VN_MARKS), chars: t.replace(/\s+/g, '').length }
}
```

Nothing else in that file changes. `KANA`, `KANJI`, `VN_MARKS` and `count` already exist above it.

### 3.2 The guard

**File: `src/lib/lanes/online/ttsLanguageGuard.ts`** (NEW).

```ts
// src/lib/lanes/online/ttsLanguageGuard.ts — do not let the loudspeaker read a sentence in a language
// the voice cannot pronounce.
//
// The failure this exists for: the refine model is asked for Japanese and returns an English line —
// usually because the speaker themselves said an English sentence, a song title, a slogan on the slide —
// and the Japanese voice then reads English letter-shapes as Japanese syllables. Over a hall PA that is
// not "slightly wrong", it is a noise nobody can parse, and it lands on top of the next sentence.
//
// The rule is narrow on purpose: SKIP THE VOICE, NEVER THE SUBTITLE. The line is still displayed and
// still saved to the transcript; only the speaker stays quiet. So the cost of a wrong skip is one
// sentence the audience reads instead of hears, while the cost of a wrong speak is a burst of noise over
// the sentence after it.
//
// Applied to MODEL output only. An approved script row is human-authored truth: if a person put an
// English line in the Japanese column, they meant it, and this must not overrule them.
//
// Pure functions, no network, no DOM.

import { scriptSignals, type Lang } from './utteranceDirection'

// Below this there is not enough text to say anything at all. "OK", "GEM Center", "2026" carry no
// language evidence in any script, and refusing to speak them would be a guess, not a guard.
export const TTS_GUARD_MIN_CHARS = 24
// At or above this share of Japanese characters the line IS Japanese, rather than a Vietnamese sentence
// that happens to quote a Japanese name.
export const TTS_GUARD_JA_SHARE = 0.5

export interface TtsLanguageVerdict {
  speak: boolean
  /** Operator-facing, Vietnamese, and short enough for the diagnostics line. Empty when speaking. */
  reason: string
}

const SPEAK: TtsLanguageVerdict = { speak: true, reason: '' }

/**
 * Decide whether `text` may be spoken by the `target` voice.
 *
 * Evidence, in the order it is trusted:
 *  - Vietnamese tone marks are conclusive FOR Vietnamese — no other language in this room has them, and
 *    a Vietnamese sentence keeps them even when it quotes a Japanese name.
 *  - kana/kanji are conclusive FOR Japanese, but only by SHARE when the target is Vietnamese: one quoted
 *    エスハイ inside a Vietnamese sentence must not silence it.
 *  - No evidence at all — pure unaccented Latin — is exactly what an English sentence looks like, and
 *    also what a name or a number looks like. That is what the length floor is for.
 */
export function checkTtsLanguage(text: string, target: Lang): TtsLanguageVerdict {
  const t = (text || '').trim()
  if (!t) return { speak: false, reason: 'không có nội dung' }
  const s = scriptSignals(t)
  const japanese = s.kana + s.kanji

  if (target === 'ja') {
    // Any Japanese character means the model did produce Japanese — err towards speaking.
    if (japanese > 0) return SPEAK
    if (s.vnMarks > 0) return { speak: false, reason: 'câu tiếng Việt lọt vào giọng Nhật' }
    if (s.chars >= TTS_GUARD_MIN_CHARS) return { speak: false, reason: 'câu không phải tiếng Nhật (có thể là tiếng Anh)' }
    return SPEAK
  }

  if (s.vnMarks > 0) return SPEAK
  if (s.chars > 0 && japanese / s.chars >= TTS_GUARD_JA_SHARE) {
    return { speak: false, reason: 'câu tiếng Nhật lọt vào giọng Việt' }
  }
  if (s.chars >= TTS_GUARD_MIN_CHARS) return { speak: false, reason: 'câu không phải tiếng Việt (có thể là tiếng Anh)' }
  return SPEAK
}
```

---

## TASK 4 — Tell applause, music and a hum from a human voice

**File: `src/lib/lanes/online/speechShape.ts`** (NEW).

```ts
// speechShape.ts — M13: is the loud thing in the hall actually a PERSON SPEAKING?
//
// The near-mic gate in pcm16Capture.ts measures LOUD vs QUIET. That is the right question for a hand mic
// held to the mouth and the wrong one for a hall: music, applause, a video soundtrack and a lion dance are
// all LOUD, so the gate lets them through untouched, and every downstream guard that counts "voiced
// milliseconds" then agrees that somebody must be speaking. That is where the remaining hallucinations come
// from — the recogniser is handed four seconds of music and writes down words nobody said, frequently in a
// third language, which is also how a wrong language reaches the voice.
//
// This module asks the other question — does the sound have the SHAPE of speech? — from two cheap measures
// taken over a rolling window of the very audio we are already sending:
//
//   • gaps — speech is syllables separated by stop closures and breaths, so across four seconds its quiet
//     moments sit far below its loud ones. Sustained music and applause hold one level.
//   • rate — how often the waveform crosses zero. Applause and hiss cross constantly; a bass line or a
//     room hum barely crosses at all. Speech sits in between, and stays there even for a sibilant
//     language, because the measure below is a MEDIAN over the window rather than a peak.
//
// DELIBERATELY ONE-SIDED. A verdict of "not speech" only ever DROPS A SENTENCE. It never cuts the audio on
// the wire, so it can never take the middle out of a word, and the worst a wrong verdict can cost is one
// line — against a ghost sentence that would otherwise be translated and READ ALOUD to the hall. Every
// threshold below is therefore set so that anything ambiguous is called speech: this accuses only when the
// evidence is unmistakable, and says nothing at all until it has heard enough.

/** Same window the voiced-evidence guard uses, so both guards judge the same stretch of sound. */
export const SHAPE_WINDOW_MS = 4_000;
/** 32ms @16kHz — short enough to fall INSIDE one syllable, which is what makes the gaps visible. */
export const SHAPE_SUBFRAME = 512;
/** Below this a sub-frame is silence, not sound; it can never be evidence of non-speech. */
export const SHAPE_ACTIVE_RMS = 0.01;
/** ≈1s of audible sound must be on the books before any verdict other than "speech" is allowed. */
export const SHAPE_MIN_ACTIVE = 32;
/** loud/quiet ratio below this = the level never moves = no syllable rhythm at all. */
export const SHAPE_GAP_RATIO = 2.5;
/**
 * …and the rule may only be applied at all when this share of the window is audible end to end.
 *
 * The one way the gap rule could take a real sentence is a hall whose background noise sits so high that
 * the speaker's own quiet moments never drop below it — the level then looks as steady as music. Requiring
 * an unbroken wall of sound first costs nothing against the target (a musical number IS unbroken) and
 * takes the rule off the table entirely for speech that has any audible break in four seconds.
 */
export const SHAPE_STEADY_SHARE = 0.8;
/** Median crossing rate at or above this ≈ 2.8kHz of hiss — applause, not words. */
export const SHAPE_HISS_ZCR = 0.35;
/** Median crossing rate at or below this ≈ 96Hz — below any human voice; a hum or a held bass note. */
export const SHAPE_HUM_ZCR = 0.012;

export interface SpeechShapeVerdict {
  speechLike: boolean;
  /** Vietnamese, operator-facing, shown in diagnostics — '' when the verdict is "speech". */
  reason: string;
}

export interface SpeechShapeMonitor {
  /** Feed one captured packet of PCM16 @16kHz. Only ever pass audio the microphone REALLY heard. */
  observe(pcm: ArrayBuffer | Int16Array, at?: number): void;
  verdict(at?: number): SpeechShapeVerdict;
  reset(): void;
}

const SPEECH: SpeechShapeVerdict = { speechLike: true, reason: '' };

interface Frame {
  at: number;
  rms: number;
  zcr: number;
}

/**
 * Split one packet into 32ms sub-frames and measure each. Exported because these two numbers are the whole
 * basis of the verdict, and a threshold nobody can measure is a threshold nobody can trust.
 */
export function analyzeSubframes(samples: Int16Array): { rms: number; zcr: number }[] {
  const out: { rms: number; zcr: number }[] = [];
  for (let start = 0; start + SHAPE_SUBFRAME <= samples.length; start += SHAPE_SUBFRAME) {
    let sumSq = 0;
    let crossings = 0;
    let prev = samples[start];
    for (let i = start; i < start + SHAPE_SUBFRAME; i++) {
      const cur = samples[i];
      const s = cur / 32768;
      sumSq += s * s;
      if (cur >= 0 !== prev >= 0) crossings += 1;
      prev = cur;
    }
    out.push({ rms: Math.sqrt(sumSq / SHAPE_SUBFRAME), zcr: crossings / (SHAPE_SUBFRAME - 1) });
  }
  return out;
}

/** Nearest-rank percentile over an already-sorted ascending list. */
function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[idx];
}

export function createSpeechShapeMonitor(): SpeechShapeMonitor {
  let frames: Frame[] = [];

  function prune(now: number): void {
    const cutoff = now - SHAPE_WINDOW_MS;
    while (frames.length && frames[0].at < cutoff) frames.shift();
  }

  return {
    observe(pcm: ArrayBuffer | Int16Array, at: number = Date.now()): void {
      const samples = pcm instanceof Int16Array ? pcm : new Int16Array(pcm);
      for (const f of analyzeSubframes(samples)) frames.push({ at, rms: f.rms, zcr: f.zcr });
      prune(at);
    },

    verdict(at: number = Date.now()): SpeechShapeVerdict {
      prune(at);
      // Only audible sub-frames can testify. The quiet ones still count for the gap measure below — they
      // ARE the gaps — but a window that is mostly silence has nothing to accuse.
      const active = frames.filter((f) => f.rms >= SHAPE_ACTIVE_RMS);
      if (active.length < SHAPE_MIN_ACTIVE) return SPEECH;

      // Median, not mean: one sibilant or one thump must not decide four seconds.
      const zcrs = active.map((f) => f.zcr).sort((a, b) => a - b);
      const zcr = percentile(zcrs, 0.5);
      if (zcr >= SHAPE_HISS_ZCR) return { speechLike: false, reason: 'âm rào rào (vỗ tay / nhiễu)' };
      if (zcr <= SHAPE_HUM_ZCR) return { speechLike: false, reason: 'âm ù trầm (nhạc nền)' };

      // Gaps, over the WHOLE window including its silences. When the near-mic gate is doing its job the
      // quiet end is a flat zero and the ratio is infinite — speech, correctly. The rule only bites when
      // the sound never breaks AND its level never falls, which is exactly a sustained hall sound.
      if (active.length / frames.length < SHAPE_STEADY_SHARE) return SPEECH;
      const rmsSorted = frames.map((f) => f.rms).sort((a, b) => a - b);
      const quiet = percentile(rmsSorted, 0.1);
      const loud = percentile(rmsSorted, 0.9);
      if (quiet > 0 && loud / quiet < SHAPE_GAP_RATIO) {
        return { speechLike: false, reason: 'âm đều, không có nhịp nói' };
      }
      return SPEECH;
    },

    reset(): void {
      frames = [];
    },
  };
}
```

---

## TASK 5 — One place decides what the microphone puts on the wire

**File: `src/lib/lanes/online/livePipelinePolicy.ts`** — append at the end of the file (after
`getContinuationWaitMs`, which PART 1 added):

```ts
// ---- M13: what leaves the microphone ----

export type CaptureFrameInput = {
  /** The operator pressed "Ngưng nghe" — a performance, a video or music is running. */
  listenPaused: boolean;
  /** The half-duplex anti-feedback gate: our own translated voice is audible right now. */
  gateActive: boolean;
};

export type CaptureFrameDecision = {
  /** Replace the frame with equal-length digital silence before sending it. */
  mute: boolean;
  /** Charge this frame to the "ngưng nghe" meter (takes precedence — it is the operator's own doing). */
  countPaused: boolean;
  /** Charge this frame to the anti-feedback meter. */
  countGated: boolean;
  /** Let the voice-shape monitor learn from this frame — only true audio the microphone really heard. */
  observeShape: boolean;
};

/**
 * The one place that decides what the microphone actually puts on the wire.
 *
 * Muting means sending SILENCE, never sending NOTHING: the recogniser closes a turn by counting 1.5s of
 * quiet in the stream it is given, so a stream that stops flowing stops that clock and leaves the last
 * sentence hanging. Equal-length digital zeros keep the clock honest while carrying nothing to transcribe.
 *
 * A muted frame teaches the voice-shape monitor nothing — it is our own silence, not the room's sound —
 * and neither does a gated one, which is our own voice.
 */
export function decideCaptureFrame(input: CaptureFrameInput): CaptureFrameDecision {
  const mute = input.listenPaused || input.gateActive;
  return {
    mute,
    countPaused: input.listenPaused,
    countGated: input.gateActive && !input.listenPaused,
    observeShape: !mute,
  };
}
```

---

## TASK 6 — Wire all five into the lane

**File: `src/lib/lanes/online/onlineLane.ts`** — the only file in this task. Work through it in file
order; every anchor below is the state of the file AFTER PART 1.

### 6.1 Imports

Add `decideCaptureFrame` to the existing `livePipelinePolicy` import, and add four new import lines
beside the other lane imports:

```ts
import { DRAFT_RATE_WINDOW_MS, decideCaptureFrame, decideDraftAdmission, getContinuationWaitMs } from './livePipelinePolicy';
import { createSpeechPauseProfile } from './speechPauseProfile';
import { createSpeechShapeMonitor } from './speechShape';
import { checkTtsLanguage } from './ttsLanguageGuard';
import { createScriptMatcher, type ScriptMatch, type ScriptMatcher, type ScriptMatcherEntry } from './scriptMatcher';
```

### 6.2 Two constants

Next to the other module constants (near `STOP_REFINE_WAIT_MS`):

```ts
// M9 — script snap. A snapped line is ready the instant the sentence finalises, while a refined line
// takes 1–2s. If an EARLIER sentence is still at refine, speaking the snap straight away would put the
// two sentences on the loudspeaker in the wrong order. The subtitle still snaps at once (it is addressed
// by lid, so it cannot land out of order) — only the VOICE waits, and only this long: past that the
// earlier line has effectively failed and holding the hall in silence is worse than one inverted pair.
const SNAP_TTS_ORDER_WAIT_MS = 1_500;
const SNAP_TTS_ORDER_POLL_MS = 60;
```

### 6.3 Two config getters

In `OnlineLaneConfig`, after `getSpeakEnabled`:

```ts
  // M13 "Ngưng nghe" — read LIVE on every captured frame, because its whole purpose is to be flipped
  // mid-ceremony: the technician holds it down for a performance, a video or a musical number, and the
  // microphone goes silent on the wire until they release it. Never latched at start().
  getListenPaused?: () => boolean;
```

and after `getRoomFilter`:

```ts
  // M9: the approved event script (Chuẩn bị → Kịch bản). It rides here, NOT in start(): the treaty in
  // src/lib/lanes/types.ts is shared with the offline lane and only changes by explicit decision, while
  // this config object is the sanctioned home for lane-private options (same as the device/gate getters
  // above). Read ONCE at start() and latched for the session, like getTwoWay — a script edited under a
  // running ceremony would move the cursor mid-sentence. Rows in either direction are fine: the matcher
  // only considers rows whose source language is the one actually being spoken.
  getScript?: () => readonly ScriptMatcherEntry[] | undefined;
```

### 6.4 Fourteen diagnostics fields

In `OnlineDiagnostics`, after `gatedMs`:

```ts
  // M13 — "Ngưng nghe". `listenPaused` is the only way to tell a deliberately deaf microphone from a
  // broken one, and `pausedMs` says how much of the ceremony was spent that way (a technician who forgets
  // to release it is the one failure this feature can cause, so it must be visible at a glance).
  listenPaused: boolean;
  pausedMs: number;
  // M13 — finished sentences discarded because the sound behind them had the shape of music, applause or a
  // hum rather than of a voice. Zero all evening means the guard never fired; a number that climbs during
  // a musical number means it is doing exactly its job.
  nonSpeechDrops: number;
  lastNonSpeechReason: string;
```

after `sendBacklogBytes`:

```ts
  // M9 — script matching. `scriptLines` is 0 when no script was loaded, which is the one state the
  // operator must be able to see before going live: everything else looks identical to a script that
  // simply never matches.
  scriptLines: number;
  scriptSnaps: number; // sentences answered by the approved line (refine skipped entirely)
  scriptSuggests: number; // close, but judged not safe enough to speak — translated as usual
  scriptPosition: number; // 1-based script line expected next; 1 until something is accepted
  lastScriptReason: string; // why the last finalised sentence did not snap — verbatim for the operator
```

and at the end of the interface, after `asrLanguages`:

```ts
  // M13 — the sentence-cut threshold in force for the speaker at the microphone right now.
  // `pauseWindowMs` is what the last planned commit waited for (0 before the first one); `pauseSamples`
  // is how many of this speaker's pauses the profile has collected, and stays under 8 — the point where
  // it starts trusting itself — for a speaker who never pauses inside a sentence. `pauseAdaptive` says
  // which of the two numbers is being used: false = the fixed 600/800ms guess, true = this speaker's own.
  pauseWindowMs: number;
  pauseSamples: number;
  pauseAdaptive: boolean;
  // M13 — sentences displayed but NOT spoken, because the text was not in the target language.
  // `lastTtsSkipReason` is the guard's own words for the most recent one.
  ttsLanguageSkips: number;
  lastTtsSkipReason: string;
```

### 6.5 Lane state

Inside `createOnlineLane`, after `let asrLanguages: string | null = null;`:

```ts
  // M13 — the cut threshold this speaker earns for themselves. The 600/800ms stability windows in
  // scribeManualCommit.ts are one guess for everybody; this measures the pauses the person at the
  // microphone is actually taking and hands the planner their own numbers. `lastVoicedAt` is the last
  // audio frame that carried voice, and the silence between two such frames is one pause. Keyed by the
  // language being spoken, because the microphone is shared: a fast Japanese guest must not set the
  // threshold for the slow Vietnamese MC. The key starts as the technician's chosen source language and
  // follows the recogniser from there.
  const pauseProfile = createSpeechPauseProfile();
  let lastVoicedAt = 0;
  let pauseKey: Lang = 'vi';
  // What the LAST planned commit actually waited for, and whether that number was learned or the
  // constant. The operator needs both: a window that never leaves 600ms means the profile is not
  // learning, and a window that has moved is the single visible proof that it is.
  let lastStableWindowMs = 0;
  let lastStableWindowAdaptive = false;
  // M13 — sentences whose VOICE was held back because the text was not in the target language (the
  // subtitle was still shown). A number that climbs during a ceremony means the model is handing back
  // English, and the operator should know it rather than wonder why some lines are silent.
  let ttsLanguageSkips = 0;
  let lastTtsSkipReason = '';

  // M13 — the hall's OWN sound, judged by shape rather than by loudness. The near-mic gate cannot tell
  // applause from a voice, so the ghost guards above (which only count "voiced ms") all agree that music
  // is somebody speaking. This monitor is the second opinion, and it only ever drops a finished sentence —
  // never a byte of audio. See speechShape.ts.
  const speechShape = createSpeechShapeMonitor();
  let nonSpeechDrops = 0;
  let lastNonSpeechReason = '';
  // M13 — "Ngưng nghe": the technician tells us a performance/video is running. While it is held the
  // microphone puts silence on the wire, so nothing at all can be transcribed out of the music.
  let pausedMs = 0;
```

and after the `refineRetries` counter, before the half-duplex gate state:

```ts
  // M9 script-snap state. The matcher is built once per session from the script handed to start();
  // `flushSeq` + `outstandingRefine` exist only to keep the loudspeaker in speaking order (see
  // SNAP_TTS_ORDER_WAIT_MS): a line goes into the map when it is sent to refine and comes out when
  // refine settles, so a snap can tell whether anything said EARLIER is still unspoken.
  let scriptMatcher: ScriptMatcher | null = null;
  let scriptRows = 0; // approved rows this session; the matcher's own `size` counts candidates, not lines
  let scriptSnaps = 0;
  let scriptSuggests = 0;
  let lastScriptReason = '';
  let flushSeq = 0;
  const outstandingRefine = new Map<string, number>();
```

`Lang` is already imported in this file (from `./utteranceDirection`).

### 6.6 The capture callback

Inside `ensureCapture`'s packet callback, **replace**:

```ts
          if (gateActive) {
            // Half-duplex: while the app's own voice is audible, replace outgoing frames with
            // equal-length silence (preserve server-VAD timing) so TTS never loops into the ASR.
            gatedMs += packet.pcm.byteLength / 2 / 16; // samples / 16 = ms @16kHz
            pcm = new ArrayBuffer(packet.pcm.byteLength);
            voicedMs = 0;
          }
          voicedWindow.push({ at: Date.now(), voicedMs });
          pruneVoiced();
```

with:

```ts
          // One decision, one place (livePipelinePolicy.decideCaptureFrame): the half-duplex gate mutes
          // our own voice, "Ngưng nghe" mutes a performance, and a muted frame is equal-length silence —
          // never an absent frame, or the recogniser's 1.5s close would stop counting mid-sentence.
          const frame = decideCaptureFrame({ listenPaused: config.getListenPaused?.() ?? false, gateActive });
          const frameMs = packet.pcm.byteLength / 2 / 16; // samples / 16 = ms @16kHz
          if (frame.countPaused) pausedMs += frameMs;
          if (frame.countGated) gatedMs += frameMs;
          if (frame.observeShape) speechShape.observe(packet.pcm);
          if (frame.mute) {
            pcm = new ArrayBuffer(packet.pcm.byteLength);
            voicedMs = 0;
          }
          voicedWindow.push({ at: Date.now(), voicedMs });
          pruneVoiced();
          notePausePace(voicedMs);
```

`speechShape.observe` is given `packet.pcm` — the audio the microphone REALLY heard — not the possibly
muted `pcm`. That is the point: it must judge the room, not our own silence.

### 6.7 `notePausePace`

Immediately after `ensureCapture`, before the `noteSpeechTiming` helper:

```ts
  // ---- M13: learn the speaker's own pauses ----

  // Called on every captured audio frame. Only silence taken MID-TURN teaches anything: the quiet before
  // somebody starts speaking, and the quiet after a turn was closed, is an empty room, and counting it
  // would drag every threshold to the ceiling. `scribeLastPartial` being non-empty is exactly the
  // condition "a turn is open right now", so it is the gate.
  //
  // A stretch of TTS needs no special case: the half-duplex gate zeroes `voicedMs` while the app's own
  // voice plays, so the gap spanning it is longer than PAUSE_GAP_MAX_MS and the profile discards it.
  function notePausePace(voicedMs: number): void {
    if (!(voicedMs > 0)) return;
    const now = Date.now();
    const previous = lastVoicedAt;
    lastVoicedAt = now;
    if (previous > 0 && scribeLastPartial) pauseProfile.observe(now - previous, pauseKey);
  }
```

### 6.8 Feed the learned windows to the commit planner

In `scheduleStableCommit`, **replace** the `planStableScribeCommit(…)` call and the line after it:

```ts
    const plan = planStableScribeCommit(text, scribePartialChangedAt, scribeLastCommitAt, Date.now());
    if (!plan) return; // no punctuation and not long yet — the VAD backstop still owns this turn
```

with:

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

### 6.9 The shape guard on partials and finals

In `handlePartial`, after the `LONG_SILENCE_MS` guard and before `noteSpeechTiming()`:

```ts
    // M13: loud is not the same as spoken. Keep the lyrics of the song playing in the hall off the
    // audience wall — where an interim line is the most visible thing in the room.
    if (!speechShape.verdict().speechLike) return;
```

In `handleFinal`, after the `LONG_SILENCE_MS` ghost guard and before the repeat guard:

```ts
    // M13: the guards above ask "was there sound?", and during a musical number the answer is yes, which
    // is how a song became a sentence that was translated and READ ALOUD. This one asks whether the sound
    // had the shape of a person speaking. It accuses only on unmistakable evidence (speechShape.ts), and
    // the whole cost of being wrong is this one line.
    const shape = speechShape.verdict();
    if (!shape.speechLike) {
      nonSpeechDrops += 1;
      lastNonSpeechReason = shape.reason;
      dropGhost(`non-speech sound · ${shape.reason}`, transcript);
      return;
    }
```

Still in `handleFinal`, immediately after the `decided.foreign` block (PART 1) and before the two-way
turn-end block:

```ts
    // M13: the recogniser has just named the language that was at the microphone. Point the pause profile
    // at that speaker's bucket, so the next turn is measured against pauses taken in the same language.
    if (decided.language) pauseKey = decided.language;
```

### 6.10 The script gate in `flushSegment`

At the tail of `flushSegment`, **replace** PART 1's three lines:

```ts
    if (fragment) fragmentRefines += 1;
    if (previousFragment) fragmentLinks += 1;
    scheduleRefine(lid, head, priorFinals, sourcePace, draftFallback, finalizedAt, {
      fragment,
      previousFragment,
      alreadyWaited: reason !== 'ceiling',
    });
```

with:

```ts
    // M9: the approved script may answer this sentence outright — exact human wording, and no refine
    // round trip. Only when it refuses does the sentence take the normal draft → refine path.
    const order = ++flushSeq;
    if (!trySnapToScript(lid, head, finalizedAt, order)) {
      if (fragment) fragmentRefines += 1; // a snapped line came from the approved script — not a fragment
      if (previousFragment) fragmentLinks += 1;
      outstandingRefine.set(lid, order);
      scheduleRefine(lid, head, priorFinals, sourcePace, draftFallback, finalizedAt, {
        fragment,
        previousFragment,
        alreadyWaited: reason !== 'ceiling',
      });
    }
```

### 6.11 The snap itself

Between `flushSegment` and the `// ---- M6: refine tier ----` section:

```ts
  // ---- M9: script snap ----

  // Answer a finalised sentence from the approved script when the match is beyond doubt; return true
  // when it did, so the caller skips refine.
  //
  // The source line keeps the words actually HEARD, not the script's own wording. If a snap ever lands
  // on the wrong line, whoever is watching the console sees source and translation disagree — replacing
  // the heard text with the script's would make a wrong snap look flawless on screen.
  function trySnapToScript(lid: string, head: string, finalizedAt: number, order: number): boolean {
    // A script whose every row is unusable (junk text, a language the matcher does not handle) builds
    // zero candidates. That is deliberately NOT short-circuited here: letting the matcher answer puts
    // its own "kịch bản trống" into the diagnostics line, where a script silently doing nothing would
    // otherwise look exactly like a script that simply never matches.
    if (!scriptMatcher) return false;
    const dl = dirLangs(lid, head, false); // settled at finalisation — never changes again
    let result: ScriptMatch;
    try {
      result = scriptMatcher.match(head, dl.source);
    } catch {
      return false; // a fault in the matcher must never cost the session a sentence
    }
    lastScriptReason = result.reason;
    if (result.band !== 'snap') {
      if (result.band === 'suggest') scriptSuggests += 1;
      return false;
    }
    // The matched row must translate INTO the language this utterance is being shown in: the same row
    // read from the other direction is a different sentence for this audience.
    if (result.targetLanguage !== dl.target) return false;
    const target = result.scriptTarget.trim();
    if (!target) return false;

    scriptMatcher.accept(result); // the script cursor advances only on a line actually used
    scriptSnaps += 1;
    emitLine({ lid, sourceText: head, targetText: target, interim: false, corrected: true });
    latency.markRefineShown(lid, performance.now()); // final quality reached, just without the round trip
    recordSessionLine(lid, finalizedAt, head, target);
    if (config.getSpeakEnabled?.()) void speakSnap(target, dl.target, lid, order);
    // eslint-disable-next-line no-console
    console.info(`[onlineLane][script] snap lid=${lid} score=${result.score} line=${result.index + 1}/${scriptRows}`);
    return true;
  }

  // Hold a snap's VOICE — never its subtitle — until every sentence spoken before it has left refine,
  // so the hall hears the sentences in the order they were said. Bounded: see SNAP_TTS_ORDER_WAIT_MS.
  async function speakSnap(text: string, language: Lang, lid: string, order: number): Promise<void> {
    const gen = sessionGen;
    const deadline = Date.now() + SNAP_TTS_ORDER_WAIT_MS;
    while (Date.now() < deadline) {
      let earlier = false;
      for (const pending of outstandingRefine.values()) {
        if (pending < order) { earlier = true; break; }
      }
      if (!earlier) break;
      await delay(SNAP_TTS_ORDER_POLL_MS);
      if (gen !== sessionGen) return; // stopped or restarted while waiting — this line is history
    }
    if (gen !== sessionGen) return;
    enqueueTtsSentence(text, language, undefined, undefined, lid);
    ttsSentences += 1;
  }
```

### 6.12 `refine`: release the order lock, then guard the voice

In `refine`, immediately after the retry `await` block and **before** the `if (gen !== sessionGen) return;`:

```ts
    // M9: this sentence is no longer waiting on refine, so a later snap is free to speak. The delete
    // MUST stay in the same synchronous run as the enqueueTtsSentence below — a snap released here and
    // queued before this line's own voice is exactly the inversion the wait exists to prevent.
    outstandingRefine.delete(lid);
```

And inside `if (config.getSpeakEnabled?.())`, **replace**:

```ts
        if (speakText) {
          enqueueTtsSentence(speakText, dl.target, data.emotion, data.ttsSpeed, lid);
          ttsSentences += 1;
        }
```

with:

```ts
        if (speakText) {
          // M13: never hand the voice a language it cannot pronounce. The subtitle above has ALREADY been
          // shown and saved — only the loudspeaker is held back, so a wrong skip costs one sentence the
          // hall reads instead of hears, while a wrong speak is a burst of noise over the next sentence.
          const guard = checkTtsLanguage(speakText, dl.target);
          if (guard.speak) {
            enqueueTtsSentence(speakText, dl.target, data.emotion, data.ttsSpeed, lid);
            ttsSentences += 1;
          } else {
            ttsLanguageSkips += 1;
            lastTtsSkipReason = guard.reason;
            // eslint-disable-next-line no-console
            console.debug(`[onlineLane][tts] skipped (${guard.reason}): ${speakText.slice(0, 40)}`);
          }
        }
```

The snap path deliberately does NOT go through this guard: an approved script row is human-authored
truth, and if a person put an English line in the Japanese column they meant it.

### 6.13 Three resets

In `teardown`, after `pendingRefineTimers.clear();`:

```ts
    outstandingRefine.clear(); // M9: nothing is owed a turn on the loudspeaker any more
```

In the reconnect/session reset (the block that clears `voicedWindow`), after `voicedWindow.length = 0;`:

```ts
    // M13: the learned pauses SURVIVE a reconnect (same speaker, same room), but the open gap does not —
    // the silence spanning a dropped socket is dead air, not a pause somebody took.
    lastVoicedAt = 0;
    // The sound the room was making before the socket dropped says nothing about the sound after it.
    speechShape.reset();
```

In `start()`, after `asrLanguages = null;`:

```ts
    // M13: a new session is a new speaker in a new room — never inherit the previous event's pauses. The
    // key starts at the technician's chosen source language, so the very first turn is already measured
    // into the right bucket instead of into a nameless one.
    pauseProfile.reset();
    lastVoicedAt = 0;
    pauseKey = startOpts.sourceLanguage;
    lastStableWindowMs = 0;
    lastStableWindowAdaptive = false;
    ttsLanguageSkips = 0;
    lastTtsSkipReason = '';
    speechShape.reset();
    nonSpeechDrops = 0;
    lastNonSpeechReason = '';
    pausedMs = 0;
```

and, in the same `start()`, after `refineRetries = 0;`:

```ts
    // M9: build the session's script matcher. Rows are read ONCE here, like terms/brief — editing the
    // script mid-session would move the cursor under a running ceremony. An absent or empty script
    // leaves the matcher null and every sentence takes the normal path.
    const scriptSeed = config.getScript?.() ?? [];
    scriptMatcher = scriptSeed.length ? createScriptMatcher(scriptSeed) : null;
    scriptRows = scriptSeed.length;
    scriptSnaps = 0;
    scriptSuggests = 0;
    lastScriptReason = '';
    flushSeq = 0;
    outstandingRefine.clear();
```

### 6.14 `getDiagnostics`

Read the learned windows once at the top, and report the fourteen new fields in the same order they were
declared in 6.4:

```ts
  function getDiagnostics(): OnlineDiagnostics {
    const learned = pauseProfile.windows(pauseKey);
    return {
      …
      gatedMs: Math.round(gatedMs),
      listenPaused: config.getListenPaused?.() ?? false,
      pausedMs: Math.round(pausedMs),
      nonSpeechDrops,
      lastNonSpeechReason,
      …
      sendBacklogBytes,
      scriptLines: scriptRows,
      scriptSnaps,
      scriptSuggests,
      scriptPosition: (scriptMatcher?.position() ?? 0) + 1,
      lastScriptReason,
      …
      asrLanguages,
      pauseWindowMs: lastStableWindowMs,
      pauseSamples: learned?.samples ?? 0,
      pauseAdaptive: lastStableWindowAdaptive,
      ttsLanguageSkips,
      lastTtsSkipReason,
    };
  }
```

---

## TASK 7 — The console

### 7.1 The facade

**File: `src/lib/lanes/online/index.ts`**

Imports and re-exports:

```ts
import type { ScriptMatcherEntry } from './scriptMatcher'
```

```ts
export type { ScriptMatcherEntry } from './scriptMatcher'
export type { WallOutput, WallView, WallDock, ScreenSupport, WallScreen } from './audienceWindows'
export { SUBTITLE_FONT } from '../../audienceSubtitles'
// M14 — the pre-session document summariser. A plain async function, not part of the hook: it belongs to
// Chuẩn bị, runs at most once per session, and must never be reachable from anything a live session does.
export { summarizePrepDocs, PREP_DOCS_MAX, PREP_DOC_MAX_CHARS } from './prepBrief'
export type { PrepBriefInput, PrepBriefResult, PrepBriefDoc } from './prepBrief'
```

(the `WallOutput` line replaces the existing one — only `WallDock` is added).

In `UseOnlineLane`, after `setGateMode`:

```ts
  // M13 "Ngưng nghe" — the one control meant to be used WHILE a session runs: held during a performance,
  // a video or a musical number so the recogniser is fed silence instead of music. Always released by
  // start(), because a session that begins deaf looks exactly like a session that is broken.
  listenPaused: boolean
  setListenPaused: (v: boolean) => void
```

and after `setBrief`:

```ts
  // Kịch bản (M9). The console hands over the approved rows from Chuẩn bị; the lane reads them once at
  // Bắt đầu, exactly like terms/brief.
  script: ScriptMatcherEntry[]
  setScript: (rows: ScriptMatcherEntry[]) => void
```

In `useOnlineLane`, two new state hooks beside the existing ones:

```ts
  const [listenPaused, setListenPaused] = useState(false)
  const [script, setScript] = useState<ScriptMatcherEntry[]>([])
```

two new refs beside the existing `termsRef` / `briefRef` / `gateModeRef`:

```ts
  const scriptRef = useRef<ScriptMatcherEntry[]>([])
  scriptRef.current = script
  const listenPausedRef = useRef(false)
  listenPausedRef.current = listenPaused
```

in `start()`, right after `setLines([])`:

```ts
    // Never begin a session deaf: whatever the technician left "Ngưng nghe" on for is over.
    setListenPaused(false)
    listenPausedRef.current = false
```

in the `createOnlineLane` config object, after `getSpeakEnabled` and after `getRoomFilter`:

```ts
        getListenPaused: () => listenPausedRef.current,
```
```ts
        // M9: the approved script rides on the lane config, not on start() — start()'s shape is the
        // two-lane treaty (src/lib/lanes/types.ts) and the offline lane has no script. The lane calls
        // this once at Bắt đầu and latches the rows for the whole session.
        getScript: () => scriptRef.current,
```

and in the returned object, extend the two existing lines:

```ts
    nearMicGate, setNearMicGate, speakEnabled, setSpeakEnabled, gateMode, setGateMode,
    listenPaused, setListenPaused,
    direction, setDirection, terms, setTerms, brief, setBrief, script, setScript,
```

### 7.2 The console component

**File: `src/lib/lanes/online/components/OnlineConsole.tsx`**

New imports (`summarizePrepDocs`, `WallDock`, `ScriptMatcherEntry` from the facade; and four
Chuẩn bị-side imports — these are read-only uses of stores this component already reads through
`collectPrepPack`):

```tsx
import { useOnlineLane, fetchOnlineConfigStatus, summarizePrepDocs, ONLINE_SPEED_RANGE, SUBTITLE_FONT, type LaneStatus, type OnlineVoice, type AudienceLine, type WallOutput, type WallDock, type ScriptMatcherEntry } from '../index'
import { collectPrepPack, collectPrepDocuments, collectPrepHeader, type PrepPack } from '../../../prepData'
import { savePrepSummary, clearPrepSummary, getPrepSummary, type PrepSummary } from '../../../prepSummary'
import { kbScopeId } from '../../../kbscope'
import { getScriptLocal } from '../../../script'
```

Two module-level helpers, above the component:

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

New state beside `prep`:

```tsx
  const [scriptCount, setScriptCount] = useState({ approved: 0, total: 0 })
```

`applyScript`, called from both load paths:

```tsx
  // M9: the script rides along. There is no box for it to overwrite — it is data, not typing — so it is
  // reloaded on every Nạp, which is also how a script edited in Chuẩn bị reaches a console already open.
  // Stable identity (useCallback) so the auto-load effect below can depend on it honestly instead of
  // hiding it from the dependency array — the effect's own `prepLoadedRef` guard is what keeps it to one
  // run per (event × direction), not a short dependency list.
  const applyScript = useCallback(() => {
    const { rows, total } = loadScriptForLane(event?.id ?? '')
    lane.setScript(rows)
    setScriptCount({ approved: rows.length, total })
  }, [event, lane])
```

Call `applyScript()` as the last statement of `loadPrep`, and again inside the auto-load effect right
after the two `if (!lane.…trim())` lines. Add `applyScript` to that effect's dependency array.

The M14 block (state + the two handlers) goes immediately after `loadPrep`:

```tsx
  // ── M14: let the model read the imported documents and WRITE the Bối cảnh ──
  // The mechanical brief above can only paste the opening of each file, so a 40-page gala script arrives
  // as its cover page. This sends the documents to the server (the same model that refines every line
  // already lives there) and gets back a real brief plus a list of proper nouns.
  //
  // Off the live path on purpose: the button is disabled while a session runs, the answer takes tens of
  // seconds, and it lands in a box the operator reads, edits and approves before pressing Bắt đầu. The
  // result is saved per event+direction so it survives a reload and is not paid for twice.
  const [ai, setAi] = useState<{ busy: boolean; error: string; note: string }>({ busy: false, error: '', note: '' })
  // Held in state, not read during render: this component re-renders on every subtitle line, and a
  // localStorage read per line during a live session is a cost for nothing. It is refreshed when the
  // session or its direction changes, and after a generate or a drop — the only moments it can change.
  const [savedSummary, setSavedSummary] = useState<PrepSummary | undefined>(undefined)
  const refreshSummary = useCallback(() => {
    setSavedSummary(event ? getPrepSummary(kbScopeId(event), lane.direction) : undefined)
  }, [event, lane.direction])
  useEffect(() => { refreshSummary() }, [refreshSummary])
  const runAiSummary = async () => {
    if (!event) { setAi({ busy: false, error: 'Chưa chọn buổi nào.', note: '' }); return }
    const documents = collectPrepDocuments(event)
    if (!documents.length) { setAi({ busy: false, error: 'Buổi này chưa có tài liệu nào trong phần Chuẩn bị.', note: '' }); return }
    setAi({ busy: true, error: '', note: `Đang đọc ${documents.length} tài liệu…` })
    try {
      const result = await summarizePrepDocs({
        sourceLanguage: lane.direction === 'vi2ja' ? 'vi' : 'ja',
        targetLanguage: lane.direction === 'vi2ja' ? 'ja' : 'vi',
        header: collectPrepHeader(event),
        documents,
      })
      savePrepSummary(kbScopeId(event), {
        brief: result.brief, terms: result.terms, dir: lane.direction,
        docNames: documents.map((d) => d.name), usedChars: result.usedChars, at: new Date().toISOString(),
      })
      refreshSummary()
      // Reload through the ONE existing path, so the AI terms are merged with the glossary and the
      // speaker roster under the same 40-line budget instead of replacing them.
      await loadPrep(true)
      setAi({ busy: false, error: '', note: `Xong — đã đọc ${result.documents} tài liệu (${result.usedChars.toLocaleString('vi-VN')} ký tự). Đọc lại và sửa nếu cần.` })
    } catch (error) {
      setAi({ busy: false, error: String((error as Error)?.message ?? error), note: '' })
    }
  }
  const dropAiSummary = async () => {
    if (!event) return
    clearPrepSummary(kbScopeId(event), lane.direction)
    refreshSummary()
    setAi({ busy: false, error: '', note: 'Đã bỏ bản tóm tắt AI — quay lại bối cảnh ghép sẵn.' })
    await loadPrep(true)
  }
```

`prepCounts` stops being `prep ? (…) : null` — the script line must render even before the prep pack
loads, because "no script" is precisely the state that has to be visible before going live:

```tsx
  const prepCounts = (
    <div className="text-[11px] text-on-surface-variant leading-relaxed">
      {prep && (
        <div>
          {prep.stats.termLines} thuật ngữ · {prep.stats.glossary} mục từ điển · {prep.stats.speakers} diễn giả
          {prep.stats.documents > 0 ? ` · ${prep.stats.documents} tài liệu` : ' · chưa có tài liệu nào'}
          {prep.stats.dropped > 0 ? ` · còn ${prep.stats.dropped} mục vượt hạn mức 40 dòng` : ''}
          {!prep.glossaryReachable ? ' · chưa với tới Từ điển trên máy chủ nội bộ' : ''}
          {/* M14 — say which brief is in the box. An operator who cannot tell the AI summary from the
              pasted-together one cannot judge whether it is worth generating again. */}
          {prep.stats.aiBrief ? ' · bối cảnh do AI tóm tắt từ tài liệu' : ''}
          {prep.stats.aiTerms > 0 ? ` · ${prep.stats.aiTerms} thuật ngữ AI gợi ý từ tài liệu` : ''}
        </div>
      )}
      {/* M9 — an empty or unapproved script behaves exactly like a script that never matches, so it must
          be said out loud here; nothing else on this screen would tell the operator before going live. */}
      <div>{scriptCountLine(scriptCount)}</div>
    </div>
  )
```

The "Ngưng nghe" rail button, right after the Bắt đầu / Dừng button:

```tsx
          {/* M13 · NGƯNG NGHE — for the parts of a gala nobody is speaking at: a performance, a musical
              number, a video. The microphone keeps its socket but puts silence on the wire, so the
              recogniser cannot invent lyrics out of the music. Only while running, right under Dừng, so
              the technician never has to hunt for it mid-show. */}
          {lane.running && (
            <RailBtn icon={lane.listenPaused ? 'hearing_disabled' : 'hearing'}
              label={lane.listenPaused ? 'ĐANG NGƯNG NGHE' : 'Ngưng nghe'}
              tone={lane.listenPaused ? 'danger' : 'default'}
              ariaLabel={lane.listenPaused ? 'Đang ngưng nghe — bấm để nghe lại' : 'Ngưng nghe'}
              title="Bấm khi có tiết mục / nhạc / chiếu video — máy ngưng nghe, không ghi chữ nào. Bấm lại để nghe tiếp."
              onClick={() => lane.setListenPaused(!lane.listenPaused)} />
          )}
```

and its unmissable twin in the monitor strip, immediately after the status/`mmss` block:

```tsx
          {/* M13: a microphone that was told to stop listening looks EXACTLY like a broken one. The one
              way this feature can cost the ceremony a speech is a technician who forgets to release it,
              so while it is held the state is unmissable in the monitor strip, not only on the rail. */}
          {lane.running && lane.listenPaused && (
            <button type="button" onClick={() => lane.setListenPaused(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-error text-on-error font-label-caps text-label-caps animate-pulse shrink-0"
              title="Bấm để nghe lại">
              <span className="material-symbols-outlined text-base" aria-hidden="true">hearing_disabled</span>
              ĐANG NGƯNG NGHE — bấm để nghe lại
            </button>
          )}
```

The wall-placement picker, in the audience-wall output row — the new `<select>` goes above the existing
screen picker, and the screen picker gains a second condition:

```tsx
                            {/* M10: chỗ đặt cửa sổ. "Góc phải/trái" là dải dọc hẹp trên chính màn hình
                                đang ngồi — dùng khi cần vừa dịch vừa mở ứng dụng khác. */}
                            <select value={o.dock ?? 'full'} onChange={(e) => updateWallOutput(o.id, { dock: e.target.value as WallDock })} className={`${SELECT_CLS} w-auto text-xs py-1`}>
                              <option value="full">Cả màn hình</option>
                              <option value="right">Dải dọc góc phải</option>
                              <option value="left">Dải dọc góc trái</option>
                            </select>
                            {lane.wallScreens.length > 1 && (o.dock ?? 'full') === 'full' && (
```

and one more hint line beside the existing one-way warning:

```tsx
                        {o.enabled && (o.dock ?? 'full') !== 'full' && <p className="text-[10px] text-on-surface-variant/80">Cửa sổ hẹp: "cả 2" sẽ tự xếp trên–dưới thay vì 2 cột.</p>}
```

The AI summariser controls, in the Bối cảnh panel between the `<textarea>` and `{prepCounts}`:

```tsx
                {/* M14 — the AI summariser. Disabled while a session runs, like every other box on this
                    panel: the brief is latched by start() and the model must never be asked to re-read a
                    40-page script in the middle of a ceremony. */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => { void runAiSummary() }} disabled={lane.running || ai.busy}
                    title="Đọc toàn bộ tài liệu đã nhập ở Chuẩn bị rồi tự viết bối cảnh"
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/60 text-primary px-2.5 py-1 text-xs hover:bg-primary/10 transition-colors disabled:opacity-50">
                    <span className={`material-symbols-outlined text-[15px] ${ai.busy ? 'animate-spin' : ''}`} aria-hidden="true">{ai.busy ? 'progress_activity' : 'auto_awesome'}</span>
                    {ai.busy ? 'Đang tóm tắt…' : 'Tóm tắt tài liệu bằng AI'}
                  </button>
                  {savedSummary && !ai.busy && (
                    <button onClick={() => { void dropAiSummary() }} disabled={lane.running} title="Quay lại bối cảnh ghép sẵn từ Chuẩn bị"
                      className="inline-flex items-center gap-1 rounded-lg border border-outline-variant text-on-surface-variant px-2.5 py-1 text-xs hover:text-error hover:border-error transition-colors disabled:opacity-50">
                      <span className="material-symbols-outlined text-[15px]" aria-hidden="true">undo</span>Bỏ bản AI
                    </button>
                  )}
                </div>
                {ai.busy && <p className="text-[11px] text-primary leading-relaxed">{ai.note} Việc này mất vài chục giây — đừng đóng cửa sổ.</p>}
                {!ai.busy && ai.note && <p className="text-[11px] text-secondary leading-relaxed">{ai.note}</p>}
                {ai.error && <p className="text-[11px] text-error leading-relaxed">{ai.error}</p>}
                {savedSummary && !ai.busy && (
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Bản AI lưu lúc {new Date(savedSummary.at).toLocaleString('vi-VN')} · {savedSummary.docNames.length} tài liệu: {savedSummary.docNames.join(' · ')}
                  </p>
                )}
```

### 7.3 Five diagnostics lines

In the diagnostics block, in this order. PART 1 already added `cắt …`, `ghép ý …` and `máy nghe: …` —
these five sit around them.

After the `voiced … ghosts` line:

```tsx
                    {/* M13 — hai chốt chống "có tiếng to nhưng không phải giọng người". `ngưng nghe` là
                        do kỹ thuật viên tự bấm (tổng thời gian đã ngưng trong buổi); `bỏ tiếng không
                        phải giọng` là máy tự bỏ, kèm lý do của chính nó. Cả hai bằng 0 suốt buổi nghĩa
                        là chưa lần nào cần đến — không phải là hỏng. */}
                    <div>ngưng nghe {diag.listenPaused ? 'ĐANG BẬT' : 'tắt'} · tổng {Math.round(diag.pausedMs / 1000)}s</div>
                    {diag.nonSpeechDrops > 0 && (
                      <div>bỏ tiếng không phải giọng {diag.nonSpeechDrops} · {diag.lastNonSpeechReason}</div>
                    )}
```

After PART 1's `cắt …` line:

```tsx
                    {/* M13 — ngưỡng cắt đang dùng cho người đang nói. "mặc định" là con số cố định
                        600/800ms; "theo người nói" nghĩa là máy đã đo đủ (từ 8 nhịp ngắt trở lên) và
                        đang dùng nhịp của chính người đó. Số nhịp đứng yên suốt buổi = người nói
                        không ngắt giữa câu, và ngưỡng mặc định vẫn đang giữ việc. */}
                    <div>ngưỡng cắt {diag.pauseWindowMs || '—'}{diag.pauseWindowMs ? 'ms' : ''} · {diag.pauseAdaptive ? 'theo người nói' : 'mặc định'} · {diag.pauseSamples} nhịp</div>
```

After the `refine … retries` line:

```tsx
                    {/* M9 — snaps vs gần-khớp, and where the script thinks it is. `lastScriptReason` is the
                        matcher's own words for why the last sentence did not snap. */}
                    {diag.scriptLines > 0 && (
                      <div>kịch bản {diag.scriptSnaps} khớp · {diag.scriptSuggests} gần khớp · dòng {diag.scriptPosition}/{diag.scriptLines}{diag.lastScriptReason ? ` · ${diag.lastScriptReason}` : ''}</div>
                    )}
```

After the `ttsQueue … gate …` line:

```tsx
                    {/* M13 — câu ĐÃ hiện phụ đề nhưng KHÔNG đọc lên loa, vì chữ không đúng thứ tiếng của
                        giọng đọc (thường là một câu tiếng Anh). Hiện ra để người vận hành biết vì sao có
                        câu im lặng, thay vì tưởng loa hỏng. */}
                    {diag.ttsLanguageSkips > 0 && (
                      <div>không đọc {diag.ttsLanguageSkips} câu · {diag.lastTtsSkipReason}</div>
                    )}
```

---

## TASK 8 — The audience wall

### 8.1 Layout maths

**File: `src/lib/audienceSubtitles.ts`** — insert after the `MERGE_MAX_CHARS` constant, before
`export interface SubtitleParagraph`:

```ts
// ── M10: how the wall window lays itself out at the size it actually IS ──
// The same page serves a hall projector and a phone-shaped strip docked beside the operator's other apps.
// Pure maths, kept next to the other subtitle rules so the wall page stays presentation-only.
export const WALL_SCALE = 2.6      // read from thirty metres — the console slider is laptop-calibrated
const HALL_COLUMN_MIN = 760        // a column at least this wide keeps hall size, unchanged, forever
const COMPACT_BASE = 400           // narrower than that: the column width at which text is 1× console size
const STACK_MAX_WIDTH = 720        // two columns stop being readable well before they stop fitting

export function wallLayout(vw: number, vh: number, view: 'vi2ja' | 'ja2vi' | 'both'): { stacked: boolean; scale: number } {
  const stacked = view === 'both' && (vw < STACK_MAX_WIDTH || vh > vw)
  const columnWidth = view === 'both' && !stacked ? vw / 2 : vw
  const scale = columnWidth >= HALL_COLUMN_MIN
    ? WALL_SCALE
    : Math.max(1, Math.min(WALL_SCALE, columnWidth / COMPACT_BASE))
  return { stacked, scale }
}

/** Below this the wall's keyboard hint is both too wide and useless (no keyboard) — show buttons. */
export const wallNeedsTouchControls = (vw: number): boolean => vw < STACK_MAX_WIDTH

/**
 * Everything the audience should read IN one language, in the order it was said: the translations INTO
 * that language, plus the utterances originally SPOKEN in it.
 *
 * The two-way window normally splits by DIRECTION — one half is "translated into Japanese", the other
 * "translated into Vietnamese" — and each half shows only translations. That leaves a Vietnamese reader
 * seeing nothing when a Vietnamese person speaks: their words exist only as the source of the Japanese
 * half. Splitting by LANGUAGE instead fixes it without adding a third panel: the Vietnamese half becomes
 * the whole conversation in Vietnamese, the Japanese half the whole conversation in Japanese, and every
 * sentence appears exactly once in each.
 *
 * Order is the caller's array order, deliberately not re-sorted: the lines already arrive interleaved
 * from one lane over one channel, and sorting on `at` would let a live line that keeps re-stamping
 * itself jump over a sentence that has just finalised.
 */
export function languageThread(lines: AudienceLine[], lang: 'vi' | 'ja'): AudienceLine[] {
  const want: 'vi2ja' | 'ja2vi' = lang === 'ja' ? 'vi2ja' : 'ja2vi'
  return lines
    // A line already going INTO this language keeps its translation; the others contribute their source,
    // which IS this language — and the direction is rewritten so the renderer treats it as such.
    .map((l) => (l.dir === want ? l : { ...l, targetText: l.sourceText, dir: want }))
    .filter((l) => l.targetText.trim() !== '')
}
```

`languageThread` returns NEW objects and never mutates its input — the caller's array is shared with the
live channel.

### 8.2 Window placement

**File: `src/lib/lanes/online/audienceWindows.ts`**

The `WallOutput` type gains `dock`, and the three gala defaults gain `dock: 'full'`:

```ts
// `dock` (M10) — a narrow PORTRAIT strip pinned to one edge of the current screen, for the operator who
// keeps the two-way window beside their other apps instead of on a hall monitor. It is a placement, not a
// view: the /wall page itself reflows to one column when the window is this shape.
export type WallDock = 'full' | 'right' | 'left'
export interface WallOutput { id: string; label: string; enabled: boolean; view: WallView; showSource: boolean; screenIdx?: number; dock?: WallDock }
```

```ts
export const DEFAULT_WALL_OUTPUTS: WallOutput[] = [
  { id: 'center', label: 'Màn giữa', enabled: true, view: 'both', showSource: false, dock: 'full' },
  { id: 'left', label: 'Màn trái', enabled: true, view: 'vi2ja', showSource: false, dock: 'full' },
  { id: 'right', label: 'Màn phải', enabled: true, view: 'ja2vi', showSource: false, dock: 'full' },
]

// A docked strip is sized like a phone held beside the operator's other windows: about a quarter of the
// screen, never so thin that a Japanese line cannot hold a few characters (min 320) and never so wide that
// it stops being a strip (max 520).
export const DOCK_MIN_W = 320
export const DOCK_MAX_W = 520
export const DOCK_FRACTION = 0.26
```

A guard beside `isView`, and one more line in `mergeStored` (a stale stored entry with no `dock` must
fall back to the default, not to `undefined`):

```ts
const isDock = (v: unknown): v is WallDock => v === 'full' || v === 'right' || v === 'left'
```
```ts
    dock: isDock(stored.dock) ? stored.dock : (def.dock ?? 'full'),
```

The geometry becomes a pure exported function, placed just above `openWallWindows`:

```ts
export interface WallGeometry { left: number; top: number; width: number; height: number }

/**
 * Where ONE window goes. Three placements, in priority order:
 *  1. `dock` right/left — a narrow portrait strip on the CURRENT screen's edge, so the operator can keep
 *     working next to it. Deliberately outranks `screenIdx`: docking is a choice about this desk, and a
 *     stale monitor assignment must not drag the strip onto a projector.
 *  2. an assigned monitor (`screenIdx` resolving to a detected screen) — the hall wall.
 *  3. the fallback slice — the current screen divided evenly between the enabled windows.
 * Pure: takes the available area instead of reading `window`, so the geometry is testable.
 */
export function wallWindowGeometry(
  output: WallOutput,
  screens: WallScreen[],
  index: number,
  total: number,
  avail: { width: number; height: number },
): WallGeometry {
  const availW = Math.max(1, avail.width)
  const availH = Math.max(1, avail.height)
  const dock = output.dock ?? 'full'
  if (dock === 'right' || dock === 'left') {
    // Clamp to the screen too: on a small laptop DOCK_MIN_W could otherwise exceed the whole width.
    const width = Math.min(availW, Math.max(DOCK_MIN_W, Math.min(DOCK_MAX_W, Math.round(availW * DOCK_FRACTION))))
    return { left: dock === 'right' ? availW - width : 0, top: 0, width, height: availH }
  }
  const scr = (output.screenIdx != null && screens[output.screenIdx]) ? screens[output.screenIdx] : null
  if (scr) return { left: scr.left, top: scr.top, width: scr.width, height: scr.height }
  const colW = total > 0 ? Math.max(320, Math.round(availW / total)) : availW
  return { left: index * colW, top: 0, width: colW, height: availH }
}
```

and inside `openWallWindows`, delete the `colW` line and the four `scr`/`left`/`top`/`width`/`height`
lines, replacing them with one call:

```ts
    const { left, top, width, height } = wallWindowGeometry(o, screens, i, total, { width: availW, height: availH })
```

### 8.3 The wall page

**File: `src/pages/AudienceWall.tsx`**

Import the three new helpers and delete the local `WALL_SCALE` constant:

```tsx
// M10: the window may now be a hall projector OR a phone-shaped strip docked beside the operator's other
// apps, so the layout maths lives with the other subtitle rules in audienceSubtitles.ts.
import { clampSubtitleFont, languageThread, wallLayout, wallNeedsTouchControls } from '../lib/audienceSubtitles'
```

Track the viewport:

```tsx
  // M10: the layout follows the WINDOW, not the device — the operator shrinks this window into a strip and
  // it must reflow live, with no reload (a reload would lose the lines already on screen).
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
```
```tsx
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [])
```

Let a tap bring the control bar back (there is no mouse on a touch screen, and the bar fades in three
seconds) — add `pointerdown` beside `mousemove` in the fade effect, and remove both on cleanup. Update
that effect's comment:

```tsx
  // The control bar fades out after a few seconds of no mouse movement, because it is projected. On a
  // touch screen there is no mouse at all, so a tap has to be able to bring it back — otherwise the bar
  // hides three seconds in and the phone-shaped window has no controls left.
```

Two new memos beside the existing `jaLines` / `viLines`, and the layout call:

```tsx
  // With "Gốc" on, each half of the two-way window becomes one LANGUAGE rather than one direction, so a
  // Vietnamese reader sees Vietnamese speech in the Vietnamese half instead of only as small source text
  // over somebody else's translation. Two panels either way — nothing new has to fit on a narrow strip.
  const jaThread = useMemo(() => languageThread(lines, 'ja'), [lines])
  const viThread = useMemo(() => languageThread(lines, 'vi'), [lines])
  const single = view === 'vi2ja' ? jaLines : viLines
  const { stacked, scale } = wallLayout(viewport.w, viewport.h, view)
  const compact = wallNeedsTouchControls(viewport.w)
```

Every `scale={WALL_SCALE}` becomes `scale={scale}` (and `WALL_SCALE * 0.7` becomes `scale * 0.7`). The
two-way container reflows and the two columns take the language threads when "Gốc" is on:

```tsx
        // Stacked: 日本語 on top, Tiếng Việt below — the reading order the hall screens already use
        // left-to-right, so an operator who learned one layout has not learned a second one.
        <div className={`h-full flex ${stacked ? 'flex-col' : ''}`}>
          <div className={`relative flex-1 min-h-0 min-w-0 ${stacked ? 'border-b' : 'border-r'} border-outline-variant`}>
            {columnLabel(showSource ? '日本語 ＋ 原文' : '日本語', true)}
            <SubtitleParagraphs lines={showSource ? jaThread : jaLines} direction="vi2ja" fontSize={font} scale={scale} />
          </div>
          <div className="relative flex-1 min-h-0 min-w-0">
            {columnLabel(showSource ? 'Tiếng Việt + lời gốc' : 'Tiếng Việt', false)}
            <SubtitleParagraphs lines={showSource ? viThread : viLines} direction="ja2vi" fontSize={font} scale={scale} />
          </div>
        </div>
```

And the control bar gains a touch mode (declare `barButton` next to `columnLabel`):

```tsx
  const barButton = 'inline-flex items-center justify-center rounded-full border border-outline-variant w-9 h-9 text-on-surface-variant active:text-primary active:border-primary'
```
```tsx
        {compact ? (
          <>
            <button type="button" onClick={() => setFont((f) => clampSubtitleFont(f - 1))} className={barButton} aria-label="Chữ nhỏ hơn">−</button>
            <button type="button" onClick={() => setFont((f) => clampSubtitleFont(f + 1))} className={barButton} aria-label="Chữ to hơn">+</button>
            <button type="button" onClick={() => setShowSource((v) => !v)} className={`${barButton} w-auto px-3 ${showSource ? 'text-primary border-primary' : ''}`}>Gốc</button>
            <button
              type="button"
              onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.() }}
              className={`${barButton} w-auto px-3`}
            >Toàn màn</button>
          </>
        ) : (
          <span className="font-label-caps tracking-wide">F toàn màn · S bản gốc · +/− cỡ chữ · 0 mặc định</span>
        )}
```

(the bar's own padding goes from `px-4` to `px-3` to make room). The keyboard shortcuts stay; the buttons
are an addition, not a replacement.

### 8.4 Bolder subtitles, gold on the live line

**File: `src/components/SubtitleParagraphs.tsx`** — the paragraph's className only:

```tsx
                className={`${lang === 'ja' ? 'jp-text' : ''} sub-para border-l-4 pl-[2vw] ${p.live ? 'sub-para--live border-secondary text-secondary' : 'border-outline-variant text-on-surface/85'}`}
```

**File: `src/index.css`** — append:

```css
/* Subtitle weight + the brand gold.
   A hall screen is read from 20–30 m away, off-axis, over a projector's washed-out black. Regular
   weight loses its thin strokes at that distance, so EVERY paragraph is bold and the one being spoken
   right now is heavier still and carries the gold (--color-secondary #f4d06a) — the same gold the
   design system already uses for the live marker on its left border, so the accent and the text agree.
   Gold is reserved for the LIVE paragraph on purpose: a whole wall of gold would flatten the page and
   the eye would have nothing to land on. Finished paragraphs stay in the light on-surface tone and
   simply recede.
   Only `color` transitions — a font-weight transition reflows the text mid-sentence, and a subtitle
   line must never move under someone who is reading it. */
.sub-para {
    font-weight: 700;
    transition: color 260ms ease;
    /* Lifts the glyph edges off a projector's grey black without smearing the counters. */
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.sub-para--live {
    font-weight: 800;
    /* A whisper of the gold behind the glyphs, so the live line still separates when a projector
       crushes the colour difference. Deliberately weaker than the text shadow — never a halo. */
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55), 0 0 18px rgba(244, 208, 106, 0.18);
}
@media (prefers-reduced-motion: reduce) { .sub-para { transition: none; } }
```

---

## TASK 9 — M14: let the model write the Bối cảnh

### 9.1 Server constants

**File: `server/online-api.mjs`** — after the existing `REFINE_TIMEOUT_MS`:

```js
// M14 "Tóm tắt bằng AI" — build the session brief from the event's imported documents. Same key and the
// same model as refine; only the ceilings and the timeout differ, because this call runs ONCE, BEFORE a
// session, with a whole event script as its input instead of one sentence during it. Nothing here is on
// the live path: the operator reads the result, edits it, and may throw it away.
const PREP_SUMMARY_TIMEOUT_MS = num('PREP_SUMMARY_TIMEOUT_MS', 60_000);
/** Ceilings on what one call may read. The gala script alone is larger than all of them together. */
const PREP_DOCS_MAX = 12;
const PREP_DOC_MAX_CHARS = 12_000;
const PREP_DOCS_MAX_CHARS = 48_000;
/** …and on what it may return: exactly the console's own two boxes. */
const PREP_BRIEF_MAX_CHARS = 1_500;
const PREP_TERMS_MAX = 40;
```

### 9.2 The summariser

Same file, as its own section (put it just above `// ---------- TTS (streamed) ----------`):

```js
// ---------- prep brief from the imported documents (M14) ----------
//
// The Bối cảnh box is the one piece of context the refine model holds for the WHOLE event, and until now
// the app filled it mechanically: the conference header, the speaker list, then the opening paragraph of
// each imported file, cut at 1500 characters. For a 40-page gala script the opening paragraph is the
// cover page, so the box described the title and nothing that is actually said on stage.
//
// This reads the documents properly and writes the brief a human would have written. It is deliberately
// OFF the live path (see PREP_SUMMARY_TIMEOUT_MS above) and its output is a SUGGESTION: the console puts
// it in an editable box and the operator approves it before the session starts.

/** Trim the document set to the ceilings, longest-first-fair: every file gets an equal share. */
export function clipPrepDocuments(list, { maxDocs = PREP_DOCS_MAX, perDoc = PREP_DOC_MAX_CHARS, total = PREP_DOCS_MAX_CHARS } = {}) {
  const docs = (Array.isArray(list) ? list : [])
    .map((d) => ({ name: limitText(d?.name, 120) || '(không tên)', text: normalizeText(d?.text) }))
    .filter((d) => d.text.length > 0)
    .slice(0, maxDocs);
  if (!docs.length) return { docs: [], usedChars: 0 };
  // An equal share, so one 200-page file cannot swallow the budget of the four that matter. A file
  // shorter than its share leaves the remainder to the others (recomputed as we go).
  const out = [];
  let left = total;
  let remaining = docs.length;
  for (const d of docs) {
    const share = Math.min(perDoc, Math.floor(left / remaining));
    const text = d.text.slice(0, share);
    remaining -= 1;
    if (!text) continue;
    out.push({ name: d.name, text });
    left -= text.length;
  }
  return { docs: out, usedChars: out.reduce((n, d) => n + d.text.length, 0) };
}

export function buildPrepBriefPrompt({ sourceLanguage, targetLanguage, header, docs }) {
  const srcName = sourceLanguage === 'ja' ? 'Japanese' : 'Vietnamese';
  const tgtName = targetLanguage === 'ja' ? 'Japanese' : 'Vietnamese';
  return [
    'You prepare the CONTEXT BRIEF for a live conference interpreter system.',
    [
      'Read the event documents below and write the brief that the translation model will hold in context',
      'for the entire event. Rules:',
      `- Write the brief in Vietnamese, at most ${PREP_BRIEF_MAX_CHARS} characters. This is a hard budget: when short of room, drop the least useful lines, never truncate mid-sentence.`,
      '- One fact per line. No markdown, no headings, no numbering; a list item starts with "- ".',
      '- Cover, in this order and ONLY where the documents support it: what the event is (name, host, date, place, purpose); the running order of the programme; who speaks and in what capacity; the recurring proper nouns and set phrases.',
      '- Keep every proper noun EXACTLY as the documents spell it. Where a document gives both a Vietnamese and a Japanese form of the same name, keep both, e.g. "Kagami Biraki (鏡開き)".',
      '- Never state a fact the documents do not contain, and never guess a date, a title or a name. Thin documents must produce a short brief.',
      '- This is a brief, not a translation and not a sentence-by-sentence summary. Skip stage directions, cue numbers, lighting and sound notes.',
    ].join('\n'),
    [
      `Also return terms: at most ${PREP_TERMS_MAX} lines naming what the recogniser and the translator must not mangle.`,
      `- The session runs ${srcName} → ${tgtName}. The left-hand side must be the ${srcName} form — that is what the speaker will actually say.`,
      `- Write "source = target" when the documents give the ${tgtName} form of the same name; otherwise write the source form alone.`,
      '- Only proper nouns and fixed expressions: people, companies, places, ceremonies, awards, song titles, programme segments, job titles, product names.',
      '- No ordinary vocabulary, no full sentences, no duplicates. One term per line, no bullet marks.',
    ].join('\n'),
    header ? `What the operator already knows about this session:\n${header}` : '',
    docs.map((d) => `--- Document: ${d.name} ---\n${d.text}`).join('\n\n'),
    'Return JSON only with keys: brief, terms.',
  ].filter(Boolean).join('\n\n');
}

async function summarizePrepDocsWithLlm(params) {
  const apiKey = openaiApiKey();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');
  const response = await withTimeout(
    fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: REFINE_MODEL,
        input: buildPrepBriefPrompt(params),
        max_output_tokens: 4_000,
        temperature: 0.2,
        text: {
          format: {
            type: 'json_schema',
            name: 'prep_brief_result',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                brief: { type: 'string' },
                terms: { type: 'array', items: { type: 'string' } },
              },
              required: ['brief', 'terms'],
              additionalProperties: false,
            },
          },
        },
      }),
    }),
    PREP_SUMMARY_TIMEOUT_MS,
    'prep brief',
  );
  const raw = await response.text();
  if (!response.ok) throw new Error(`Prep brief failed: ${response.status} ${raw.slice(0, 300)}`);
  const text = extractResponseText(JSON.parse(raw));
  let parsed = {};
  try { parsed = JSON.parse(text); } catch { throw new Error('Prep brief returned malformed JSON.'); }
  // Enforce the ceilings on the way out too — a schema constrains the SHAPE, never the length.
  const brief = limitText(parsed?.brief, PREP_BRIEF_MAX_CHARS);
  const seen = new Set();
  const terms = [];
  for (const line of Array.isArray(parsed?.terms) ? parsed.terms : []) {
    const term = limitText(line, 160).replace(/^[-•*\s]+/, '');
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
    if (terms.length >= PREP_TERMS_MAX) break;
  }
  return { brief, terms };
}
```

`limitText`, `normalizeText`, `withTimeout`, `extractResponseText`, `openaiApiKey` and `REFINE_MODEL`
already exist in this file — do not re-declare them.

### 9.3 The route

Same file, in the request handler, beside the other `/online-api/*` routes:

```js
      // M14 — one pre-session call: the event's documents in, the Bối cảnh + suggested terms out.
      // 4 MB body: the documents are the payload here, unlike every other route in this file.
      if (pathname === '/online-api/summarize-prep-docs' && req.method === 'POST') {
        const body = await readJsonBody(req, 4 * 1024 * 1024);
        const sourceLanguage = normalizeLanguage(body?.sourceLanguage, 'vi');
        const targetLanguage = normalizeLanguage(body?.targetLanguage, 'ja');
        const { docs, usedChars } = clipPrepDocuments(body?.documents);
        if (!docs.length) {
          sendJson(res, 400, { error: 'documents is required.' });
          return true;
        }
        try {
          const result = await summarizePrepDocsWithLlm({
            sourceLanguage,
            targetLanguage,
            header: limitText(body?.header, SESSION_BRIEF_MAX_CHARS),
            docs,
          });
          logLine('prep.brief.ok', { documents: docs.length, usedChars, briefLength: result.brief.length, terms: result.terms.length });
          sendJson(res, 200, { ...result, documents: docs.length, usedChars });
        } catch (error) {
          logLine('prep.brief.fail', { message: String(error?.message ?? error).slice(0, 300) });
          sendJson(res, 502, { error: 'Prep brief failed.' });
        }
        return true;
      }
```

### 9.4 The client call

**File: `src/lib/lanes/online/prepBrief.ts`** (NEW).

```ts
// prepBrief.ts — M14: ask the server to read the event's imported documents and write the Bối cảnh.
//
// The console's Bối cảnh box is the only context the refine model holds for the whole event. Filling it
// mechanically (conference header + the opening paragraph of each file) describes a 40-page gala script by
// its cover page. This asks the model that is already configured server-side to read the documents and
// write the brief instead.
//
// This is the ONLY network call in the lane that is not on the live path. It is slow ON PURPOSE — a whole
// script goes up — so it is pressed once during Chuẩn bị, never while a session runs, and its result lands
// in an editable box that the operator approves. Nothing here is ever spoken.
//
// Contract: POST /online-api/summarize-prep-docs (docs/ONLINE-LANE-CONTRACT.md §7). Like every other lane
// call it goes through the `/online-api` base path, and it names no vendor, model or key.

const ONLINE_BASE = '/online-api';

/** Client-side ceiling, mirroring the server's. Sending more only pays for tokens the server clips off. */
export const PREP_DOCS_MAX = 12;
export const PREP_DOC_MAX_CHARS = 12_000;
/** The request can be megabytes; give it far more room than a live call would ever get. */
export const PREP_SUMMARY_CLIENT_TIMEOUT_MS = 90_000;

export interface PrepBriefDoc {
  name: string;
  text: string;
}

export interface PrepBriefInput {
  /** The session direction decides which side of a term line the speaker will actually say. */
  sourceLanguage: 'vi' | 'ja';
  targetLanguage: 'vi' | 'ja';
  /** What the operator already knows — the conference header + speaker roster. May be empty. */
  header?: string;
  documents: PrepBriefDoc[];
}

export interface PrepBriefResult {
  brief: string;
  terms: string[];
  /** How much the server actually read, so the console can say so instead of implying it read everything. */
  documents: number;
  usedChars: number;
}

/**
 * Never throws for a caller that awaits it — it rejects, and the console shows the message. The message is
 * Vietnamese and operator-facing: whoever presses this button is standing in a hall, not reading a log.
 */
export async function summarizePrepDocs(input: PrepBriefInput): Promise<PrepBriefResult> {
  const documents = input.documents
    .map((d) => ({ name: (d.name ?? '').trim(), text: (d.text ?? '').trim().slice(0, PREP_DOC_MAX_CHARS) }))
    .filter((d) => d.text.length > 0)
    .slice(0, PREP_DOCS_MAX);
  if (!documents.length) throw new Error('Buổi này chưa có tài liệu nào để tóm tắt.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PREP_SUMMARY_CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch(`${ONLINE_BASE}/summarize-prep-docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
        header: input.header ?? '',
        documents,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(res.status === 502 ? 'Máy chủ tóm tắt không trả lời. Thử lại sau ít phút.' : `Tóm tắt thất bại (${res.status}).`);
    const data = (await res.json()) as Partial<PrepBriefResult>;
    const brief = typeof data.brief === 'string' ? data.brief.trim() : '';
    const terms = Array.isArray(data.terms) ? data.terms.map((t) => String(t).trim()).filter(Boolean) : [];
    if (!brief && !terms.length) throw new Error('Tóm tắt trả về rỗng — kiểm tra lại nội dung tài liệu.');
    return {
      brief,
      terms,
      documents: typeof data.documents === 'number' ? data.documents : documents.length,
      usedChars: typeof data.usedChars === 'number' ? data.usedChars : 0,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Tóm tắt quá lâu (trên 90 giây). Bớt tài liệu rồi thử lại.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
```

### 9.5 Where the result lives

**File: `src/lib/prepSummary.ts`** (NEW). Lane-neutral — it is read by `prepData.ts`, which both lanes'
Chuẩn bị pages use.

```ts
// src/lib/prepSummary.ts — where the AI-written brief lives between the day it is generated and the day
// it is used. Lane-neutral, localStorage-only, never throws.
//
// The summary is written once during Chuẩn bị, days before the event, and read by a console that has been
// reloaded a hundred times since. Holding it in React state would mean regenerating (and paying for) it on
// every reload, and — worse — a technician arriving on the morning of the event would find the box empty.
//
// Keyed by the SAME scope as the documents it was made from (kbScopeId: a session in a series shares its
// series' shelf), and kept per direction, because the term lines of a vi→ja session are the mirror of a
// ja→vi one and re-using them would bias the recogniser toward the language nobody is speaking.

import type { PrepDir } from './prepData'

export interface PrepSummary {
  brief: string
  terms: string[]
  dir: PrepDir
  /** What it was made from — shown to the operator, and how they notice a document arrived afterwards. */
  docNames: string[]
  usedChars: number
  at: string // ISO
}

const sk = (scope: string) => `proyaku_prep_ai:${scope || '_default'}`

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const strList = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : [])

function normalize(x: unknown, dir: PrepDir): PrepSummary | undefined {
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
  const brief = str(o.brief)
  const terms = strList(o.terms)
  if (!brief && !terms.length) return undefined
  return {
    brief,
    terms,
    dir,
    docNames: strList(o.docNames),
    usedChars: typeof o.usedChars === 'number' && isFinite(o.usedChars) ? o.usedChars : 0,
    at: str(o.at) || new Date().toISOString(),
  }
}

/** All directions currently stored for a scope. Shape on disk: `{ vi2ja?: …, ja2vi?: … }`. */
function readAll(scope: string): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(sk(scope))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function getPrepSummary(scope: string, dir: PrepDir): PrepSummary | undefined {
  return normalize(readAll(scope)[dir], dir)
}

export function savePrepSummary(scope: string, summary: PrepSummary): void {
  try {
    const all = readAll(scope)
    all[summary.dir] = summary
    localStorage.setItem(sk(scope), JSON.stringify(all))
  } catch {
    // A full or unavailable localStorage must not lose the operator the brief that is already on screen —
    // it stays in the box either way. Silence is correct here.
  }
}

export function clearPrepSummary(scope: string, dir: PrepDir): void {
  try {
    const all = readAll(scope)
    delete all[dir]
    localStorage.setItem(sk(scope), JSON.stringify(all))
  } catch {
    /* nothing to undo */
  }
}
```

**File: `src/lib/settings.ts`** — the backup must carry it, or a machine restored from backup on the
morning of the event has no brief:

```ts
const LOCAL_PREFIXES = ['proyaku_script:', 'proyaku_script_sync:', 'proyaku_glossary:', 'proyaku_glossary_sync:', 'proyaku_docs:',
    // M14 — bối cảnh do AI tóm tắt từ tài liệu (proyaku_prep_ai:<scope>). Thiếu ở đây thì bản sao lưu
    // mang sang máy gala sẽ mất bối cảnh, và phải gọi lại model (mất tiền, mất thời gian) ngay tại chỗ.
    'proyaku_prep_ai:'];
```

### 9.6 The brief builder reads the documents — and the AI summary wins

**File: `src/lib/prepData.ts`**

New imports:

```ts
import { effectiveDocs, kbScopeId } from './kbscope'
import { getPrepSummary } from './prepSummary'
```

`PrepPack.stats` gains three fields:

```ts
  stats: {
    termLines: number; glossary: number; speakers: number; scriptApproved: number; dropped: number
    documents: number
    /** M14 — an AI summary of the documents was found for this scope+direction and used for the brief. */
    aiBrief: boolean
    /** …and how many of its suggested term lines survived the 40-line budget. */
    aiTerms: number
  }
```

Two module-level helpers beside `clean`, and `Ranked` gains an `ai` flag:

```ts
// Below this a document extract is a torn phrase rather than context — worse than nothing, because the
// model would try to make sense of the fragment. Skip the document instead.
const DOC_EXTRACT_MIN = 120
```
```ts
// The brief is line-oriented — one fact per line. A document's own newlines would forge extra lines and
// break that, so an extract is collapsed onto a single line before it is measured or added.
const flat = (s: unknown) => clean(s).replace(/\s+/g, ' ')
```
```ts
interface Ranked { rank: 0 | 1 | 2; key: string; line: string; ai?: true }
```

Four new functions, after `safeFindSpeaker`:

```ts
// Through kbScopeId, NEVER getDocs(conf.id) directly: a session belonging to a series keeps its documents
// in the series' shared store, and reading the bare event id would find an empty shelf for exactly the
// events that have the most material.
function safeDocs(conf: Conference | undefined) {
  if (!conf) return []
  try { return effectiveDocs(conf) } catch { return [] }
}

function safeSummary(conf: Conference | undefined, dir: PrepDir) {
  if (!conf) return undefined
  try { return getPrepSummary(kbScopeId(conf), dir) } catch { return undefined }
}

/**
 * The documents of the active session, name + text, for whoever wants to SEND them somewhere (M14: the
 * online console's "Tóm tắt bằng AI" button). Same scope resolution as the brief below — never
 * `getDocs(conf.id)`. Read-only, never throws.
 */
export function collectPrepDocuments(conf: Conference | undefined): { name: string; text: string }[] {
  return safeDocs(conf)
    .map((d) => ({ name: clean(d.name) || '(không tên)', text: clean(d.text) }))
    .filter((d) => d.text.length > 0)
}

/**
 * The short, exact part of the brief: what the session IS and who speaks at it, from the schedule entry
 * and the speaker roster. Short, exact and always worth more per character than prose — which is why it
 * leads the mechanical brief, and why M14 hands it to the summariser as `header` (the model must not have
 * to guess the date and the venue from a script that may never state them).
 */
export function collectPrepHeader(conf: Conference | undefined): string {
  if (!conf) return ''
  const parts: string[] = []
  const head = [clean(conf.title), clean(conf.date), clean(conf.venue)].filter(Boolean).join(' · ')
  if (head) parts.push(`Hội nghị: ${head}`)
  const agenda = clean(conf.agenda)
  if (agenda) parts.push(`Nội dung: ${agenda}`)
  const sp = (conf.speakers ?? []).filter((s) => clean(s.name))
  if (sp.length) {
    parts.push('Người phát biểu:')
    for (const s of sp) {
      const name = clean(s.name)
      const prof = safeFindSpeaker(name)
      const roleOrg = [clean(s.role) || clean(prof?.role), clean(prof?.org)].filter(Boolean).join(' · ')
      parts.push(`- ${name}${roleOrg ? ` (${roleOrg})` : ''}`)
    }
  }
  return parts.join('\n')
}
```

Inside `collectPrepPack`, the AI terms enter LAST, just before the de-duplication step:

```ts
  // ── M14: the terms the AI read out of the documents — strictly last in the queue ──
  // They come from the event's real script, which is precisely why they are TENTATIVE: no human has
  // checked them. Rank 2, pushed after everything else (a stable sort keeps that order), so they can
  // only ever spend budget the curated glossary and the speaker roster did not want. The de-duplication
  // below keys on the SOURCE side, so an AI line that repeats a glossary entry loses to the curated one.
  const summary = safeSummary(conf, dir)
  for (const raw of summary?.terms ?? []) {
    const line = clean(raw)
    const src = clean(line.split(/\s*=\s*/)[0])
    if (!src) continue
    items.push({ rank: 2, key: lc(src), line, ai: true })
  }
```

The budget loop counts them (`let aiTerms = 0` beside `let dropped = 0`, and `if (it.ai) aiTerms++`
inside the `kept.push` branch).

Then the brief. The AI summary takes precedence and returns early; the mechanical build becomes the
fallback and gains the document extracts:

```ts
  // ── brief ──
  // M14: when the operator has generated an AI summary for this session and direction, THAT is the brief.
  // It was written from the whole document set, and the conference header and speaker roster were handed
  // to it as input, so everything the mechanical build below produces is already inside it — in prose the
  // model can use rather than a cover page cut at 1500 characters. Everything below therefore runs only
  // when no summary exists: it is the fallback that keeps the box useful without a network call.
  const docList = safeDocs(conf)
  const aiBrief = clean(summary?.brief).slice(0, BRIEF_MAX_CHARS)
  if (aiBrief) {
    return {
      terms,
      brief: aiBrief,
      stats: {
        termLines: kept.length, glossary: glossary.length, speakers: speakers.length,
        scriptApproved, dropped, documents: docList.length, aiBrief: true, aiTerms,
      },
      glossaryReachable,
    }
  }

  const briefParts: string[] = []
  const header = collectPrepHeader(conf)
  if (header) briefParts.push(header)
  // ── Tài liệu nguồn → whatever brief budget is left over ──
  // The imported documents are the only place the event's REAL wording lives: the songs, the ritual
  // names, the job titles, the province names. Handing the refine model a slice of it is what stops
  // "Kagami Biraki" and "Ikusei Shuro" from being translated as if they were ordinary nouns.
  //
  // Strictly last in line. The conference header and the speaker list are short, exact, and always
  // worth more per character than prose, so they are already in `briefParts` and can never be crowded
  // out by a document. A document only spends what is left, and spends it on the OPENING of each file —
  // an event document leads with its subject, and the tail is stage directions the model cannot use.
  if (docList.length) {
    const names = docList.map((d) => flat(d.name)).filter(Boolean)
    const header = `Tài liệu: ${names.join(' · ')}`
    // +1 for the newline that will join it.
    if (briefParts.join('\n').length + header.length + 1 <= BRIEF_MAX_CHARS) {
      briefParts.push(header)
      let left = BRIEF_MAX_CHARS - briefParts.join('\n').length
      // Split what remains evenly, so one long file cannot swallow the budget of the others.
      const share = Math.floor(left / docList.length) - DOC_EXTRACT_MIN
      if (share >= DOC_EXTRACT_MIN) {
        for (const d of docList) {
          const body = flat(d.text).slice(0, share)
          if (body.length < DOC_EXTRACT_MIN) continue
          const line = `- ${flat(d.name)}: ${body}`
          if (line.length + 1 > left) break
          briefParts.push(line)
          left -= line.length + 1
        }
      }
    }
  }
```

The old inline conference-header block inside `if (conf) { … }` is DELETED — `collectPrepHeader` is now
the single copy of it. The final `return` carries the three new stats with `aiBrief: false`.

### 9.7 `.tsv` in the two file pickers

A bilingual script is exported as `nguồn⇥đích`, one line each — the format the delimiter detector reads
best. `readImportFile` has always handled it as plain text and a dropped `.tsv` always worked; it was
missing only from the file-picker filter, so the operator had to discover drag-and-drop.

**File: `src/pages/ScriptPrep.tsx`**

```ts
    // `.tsv` is the format a bilingual script is actually exported in (one line = nguồn⇥đích), and it is
    // the one the delimiter detector reads best. It was missing only from this picker: readImportFile
    // already handles it as plain text, and a dropped .tsv always worked. Adding it here means the
    // operator can pick the same file with the button instead of discovering drag-and-drop.
    const accept = `.md,.markdown,.txt,.tsv,.csv,.srt,.docx,.docm,.dotx,.dotm${backendOnline ? ',.pdf' : ''}`;
```

**File: `src/pages/DocumentsLibrary.tsx`**

```ts
    // `.tsv` — see the same list in ScriptPrep: readImportFile has always read it as plain text and a
    // dropped .tsv always worked; it was missing only from the picker.
    const accept = useMemo(() => `.md,.markdown,.txt,.tsv,.csv,.srt,.docx,.docm,.dotx,.dotm${session.backendOnline ? ',.pdf' : ''}`, [session.backendOnline]);
```

### 9.8 The contract

**File: `docs/ONLINE-LANE-CONTRACT.md`** — header to `# Online Lane Contract — v0.6 (2026-07-31)`, a v0.6
changelog paragraph above the existing v0.5 one, and a new §7:

```markdown
> **v0.6 changelog (M14 — the brief is written, not pasted):** one new endpoint, `POST /online-api/summarize-prep-docs` (§7). It is the only route in this contract that is NOT on the live path: it is pressed during Chuẩn bị, reads the event's imported documents, and returns a session brief + suggested terms for the operator to edit. Nothing else changes — no new event, no change to any existing request or response.
```

```markdown
7. `POST /online-api/summarize-prep-docs` (v0.6) — **pre-session only, never during a live session.** Body `{ sourceLanguage:'vi'|'ja', targetLanguage:'vi'|'ja', header?, documents:[{ name, text }] }` → `{ brief, terms:[string], documents, usedChars }`.
   - `documents` are the files imported in Chuẩn bị → Tài liệu, resolved through the session's knowledge scope (a session in a series sees the series' shelf). The server clips them to at most 12 files / 12 000 chars each / 48 000 chars total, sharing the total budget evenly, and reports what it actually read as `documents` + `usedChars`. Request body limit 4 MB — the only route in this contract whose payload is the documents themselves.
   - `header` is what the operator already knows (conference title · date · venue, agenda, speaker roster). It exists so the model never has to guess a date or a venue the script does not state.
   - `brief` is Vietnamese, ≤1500 chars, line-oriented — the same shape and budget as the `sessionBrief` field of §3, because that is where it ends up. `terms` is ≤40 lines of `source = target` (or a bare source form), source side = `sourceLanguage`; they are SUGGESTIONS that the client merges under its own 40-line budget, always behind the curated glossary and the speaker roster.
   - Slow by design (server budget 60 s, client 90 s) and **not retried**: the operator presses the button again. `502 { error }` on any vendor failure; `400` when no document carries text.
   - The result is the operator's to accept — the client puts it in an editable box, saves it per event+direction, and never sends it anywhere on its own.
```

**File: `docs/ONLINE-LANE-UI-API.md`** — a section above `### useOnlineLane()`:

```markdown
### `summarizePrepDocs(input): Promise<PrepBriefResult>` (M14)

Not part of the hook, on purpose. `summarizePrepDocs({ sourceLanguage, targetLanguage, header?, documents })`
posts the event's imported documents to `POST /online-api/summarize-prep-docs` and returns
`{ brief, terms, documents, usedChars }` — the Bối cảnh text plus suggested term lines. It is a
**pre-session** call: tens of seconds, a whole script on the wire, and its result is a SUGGESTION the
operator reads and edits in the box before pressing Bắt đầu. Never call it while a session runs. It
rejects with an operator-facing Vietnamese message; the console shows it verbatim. Also exported:
`PREP_DOCS_MAX`, `PREP_DOC_MAX_CHARS`, and the `PrepBriefInput` / `PrepBriefResult` / `PrepBriefDoc` types.
```

and, in the config bullet list, one more bullet after `terms`, `brief`:

```markdown
- **live control (the exception)**: `listenPaused` / `setListenPaused(v)` — every other config value above
  is latched by `start()`; this one is read on every captured audio frame precisely so it can be flipped
  MID-SESSION. While true the microphone puts equal-length digital silence on the wire (the socket and the
  recogniser's own 1.5s close keep running; there is simply nothing in the audio to transcribe), which is
  what a performance, a video or a musical number needs. `start()` always releases it.
```

---

## TASK 10 — Tests

Seven new suites and three extended ones, all vitest, all under `tests/`. Write real assertions — not
snapshots — and use fake/injected timestamps rather than sleeping.

**`tests/scriptMatcher.test.ts`** (new) — five groups:
1. *normalisation*: Vietnamese tone marks and ALL whitespace are stripped, so a syllable split apart still
   matches; Japanese dakuten is NOT stripped (`が` must not become `か`); katakana folds onto hiragana and
   half/full-width digits fold together; Dice is 1 for identical and 0 for disjoint.
2. *snapping*: a near-verbatim read snaps and returns the approved Japanese; a read with several words
   misheard still snaps; the reverse direction works (hearing Japanese returns the script's Vietnamese);
   two lines read in one breath match the merged candidate; **five** ceremonial lines read in one breath
   still cover all five, in order and starting at line 1; a run never merges across a direction flip; and
   a run that includes one unapproved row is demoted to `suggest` as a whole.
3. *the refusals*: a short utterance never snaps; two near-identical script lines are demoted to `suggest`
   by the runner-up margin; an unapproved line is `suggest` however high it scores; an off-script
   improvised sentence matches nothing; a sentence twice the length of its best line is stopped by the
   length gate; a read LONGER than the merge span is demoted to `suggest` rather than snapping onto a run
   offset by one line; a half-filled row is never spoken; an empty script says `kịch bản trống`; and a
   sentence in the other language is not even compared.
4. *the order window*: `accept()` — and only `accept()` — advances the cursor; a merged run advances it
   past every line it covered; `reset()` returns it to the top; and an MC who skips a few lines still
   matches a later one.
5. *`scriptKeyterms`*: Vietnamese proper nouns and katakana runs are lifted, and the limit is honoured.

**`tests/speechPauseProfile.test.ts`** (new) — four groups: which gaps count as a deliberate pause (too
short is chunk cadence, too long is end-of-turn, non-finite is rejected); the recommendation itself (under
8 samples it returns null rather than guessing; a fast speaker gets a shorter window than the constant, a
slow one a longer; the clamp holds a wild measurement inside 400–1100 ms; the no-punctuation window is
always the longer of the two; one abnormally long pause does not decide the threshold; the percentile
lands on the documented rank); the accumulator (only the recent window is kept, so a speaker slowing down
drags the threshold with them; two languages are measured separately and a new speaker does not inherit
the other's number; an unusable gap is not recorded; `reset()` clears everything); and the integration
with `planStableScribeCommit` — with no profile the existing constants are unchanged, with a fast
speaker's profile the commit fires sooner, the minimum spacing between two commits still holds, and text
that does not qualify is still not cut.

**`tests/speechShape.test.ts`** (new) — two groups. `analyzeSubframes`: a packet splits into 32 ms frames;
a 500 Hz sine crosses zero ≈1000 times a second; digital silence measures nothing. The monitor: it
defaults to "speech" before it has heard anything and while it has heard too little; absolute silence is
never accused; synthesised syllabic speech passes; white-noise applause is caught as `âm rào rào`; a low
hum as `âm ù trầm`; a steady tone inside the human range as `âm đều, không có nhịp nói`; a sound with any
audible break is exempt from the steadiness rule entirely; the hiss/hum thresholds bracket the real human
voice range; a speaker resuming after music is judged normally again within the 4 s window; and `reset()`
forgets the previous session.

**`tests/ttsLanguageGuard.test.ts`** (new) — three groups: the Japanese voice (real Japanese speaks; a
long English sentence is blocked; a Vietnamese sentence is blocked; short text is never guessed at; any
Japanese character at all is enough to speak); the Vietnamese voice (real Vietnamese speaks; long English
blocked; a Japanese sentence blocked; a Vietnamese sentence quoting a Japanese name still speaks; short
text never guessed at); and empty input.

**`tests/prepSummary.test.ts`** (new) — save/read round-trip; the two directions are separate records
that do not overwrite each other; an unsummarised session returns `undefined`; each scope has its own
store and a session in a series uses the series key; clearing one direction leaves the other; corrupt
localStorage JSON returns nothing instead of throwing; a full localStorage fails silently; and a record
carrying only terms (no brief) is still kept.

**`tests/serverPrepBrief.test.ts`** (new) — `clipPrepDocuments`: empty documents dropped and small ones
passed through untouched; one huge file cannot swallow the others' share; a file shorter than its share
leaves the remainder to the ones after it; neither the per-file nor the total ceiling is ever exceeded;
past 12 documents only the first 12 survive; and `null`/non-array input returns empty instead of throwing.
`buildPrepBriefPrompt`: the direction decides which side of a term line is the source; both ceilings
(1500 chars, 40 lines) are stated in the prompt; the "never invent, keep proper nouns exactly" rules are
present; each document's own name is attached to its text; and an absent header adds no empty section.

**`tests/wallCompactLayout.test.ts`** (new) — `wallWindowGeometry`: the default is still the even slice
(the old behaviour, unchanged); an assigned monitor is still honoured; a right dock sits flush to the
right edge and full height, a left dock flush left; a dock outranks an assigned monitor; and the strip
width always stays inside its readable band. `wallLayout`: a hall projector keeps two columns at 2.6×; a
one-way view on a large screen is unchanged; a phone-shaped strip stacks and shrinks; a tall window stacks
even when it is wide; a narrow landscape window keeps two columns but scales the text down by column
width; and the scale never drops below 1× (the console's own size).

**`tests/audienceSubtitles.test.ts`** (extend) — one new group for `languageThread`: the Vietnamese panel
carries BOTH the Vietnamese that was spoken and the Vietnamese translated from Japanese; the Japanese
panel likewise; the spoken order is preserved (never re-sorted); every sentence appears exactly once per
panel; a line still being translated appears in the panel of the language being spoken; and the input
array is not mutated.

**`tests/livePipelinePolicy.test.ts`** (extend) — one new group for `decideCaptureFrame`: an ordinary
frame goes out untouched and teaches the shape monitor; "Ngưng nghe" mutes it and teaches nothing; the
half-duplex gate mutes it too; and when both are true only the "Ngưng nghe" meter is charged.

**`tests/prepData.test.ts`** (extend) — two new groups. *Documents into the brief*: the file names are
listed and counted; the OPENING of each document is carried (that is where the subject is); a document is
flattened onto one line; a document too short to be context is skipped rather than torn; the conference
header and speakers are never crowded out and the 1500-char limit is never exceeded; a session belonging
to a series reads the series' store; and a broken document store costs nothing. *The AI summary*: when
one exists it becomes the brief and the mechanical build is skipped; without one nothing changes; the
scope resolution matches the documents'; AI terms are added and counted separately; they rank after the
glossary and the speaker roster; an AI term duplicating a glossary entry loses to the curated one; when
the 40-line budget runs out it is the AI terms that are dropped, never the glossary; an over-long AI brief
is still cut to 1500 chars; and a corrupt summary store behaves as "no summary".

---

<constraints>
1. **Online lane only.** No offline-lane file (`src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`,
   `src/lib/useMeter.ts`) may be touched. Say so explicitly in your report. The three lane-neutral files
   named in `<role>` are expected and must not import from `src/lib/lanes/online/`.
2. **No new npm dependency**, and no change to `package.json` / `package-lock.json`.
3. **No secret, vendor env name, model id, or API host may appear under `src/`.** The summariser's model
   and key live in `server/online-api.mjs` only; `prepBrief.ts` knows nothing but `/online-api`.
4. **Nothing outside the contract.** Exactly one new endpoint, documented in §7 as v0.6. No new WS event,
   and no change to any existing request or response — including the ones PART 1 added.
5. **A wrong snap is the worst outcome in this prompt.** Do not lower `snapThreshold`, do not remove the
   runner-up margin, do not let an unapproved row snap, and do not "simplify" `sameStart` to "shares any
   row" — every one of those was measured, and the comments record what the measurement was. If a test
   you write disagrees with a threshold, the test is wrong; say so rather than moving the threshold.
6. **The three M13 guards may only ever cost ONE line.** `speechShape` drops a finished sentence and never
   touches the audio on the wire; `checkTtsLanguage` silences the loudspeaker and never the subtitle;
   "Ngưng nghe" sends equal-length digital silence and never stops the stream. Do not "optimise" any of
   them into skipping a send, muting the display, or closing the socket.
7. **The AI brief is a suggestion, never an action.** The button is disabled while a session runs, the
   result lands in an editable box, and nothing generated by it is ever spoken without a human seeing it
   first. Do not call it automatically, do not call it on a timer, and do not retry it.
8. **Comments explain WHY.** Every non-obvious constant above ships with the measurement that produced it;
   keep those comments verbatim, including the Vietnamese ones (they are read by the operator's own
   colleagues). Do not add a comment that only restates the code.
9. Do not commit or push unless explicitly asked. Leave the work in the tree and report.
</constraints>

<acceptance_criteria>
Run all four and paste the real output — not a summary:

1. `npx tsc -b` → exit 0, no errors.
2. `npx vitest run` → every suite green. State the file count and test count.
3. `npx oxlint src/lib/lanes/online server` → **zero warnings**. That lane lints completely clean today,
   so any warning at all is one you introduced. Fix it, do not explain it.
4. `npm run build` → succeeds.

Then confirm each of these by reading your own diff:

- A sentence matching an approved script line is shown and spoken as the APPROVED line, with no refine
  call at all — and the SOURCE line still shows the words actually heard, not the script's wording.
- Two script lines that score within 0.06 of each other are demoted to `suggest`; nothing is spoken.
- An MC reading six lines in one breath snaps to all six starting at the first; reading seven is demoted
  to `suggest` rather than snapping onto a run that drops line 1.
- A snap whose sentence came AFTER one still at refine waits (max 1.5 s) before speaking, while its
  subtitle appears immediately.
- With no script loaded, the console says so before the session starts, and every sentence takes the
  normal path.
- "Ngưng nghe" puts equal-length silence on the wire — the socket stays open, the stream never stops —
  and the state is visible in two places while it is held.
- A finalised sentence produced during applause or a musical number is dropped with a reason, and the
  audio on the wire is untouched.
- A refined line that comes back in the wrong language is DISPLAYED and SAVED but not spoken; a snapped
  line from the approved script is never subjected to that check.
- After 8+ measured pauses the commit window moves off 600/800 ms, and the diagnostics say `theo người
  nói` instead of `mặc định`.
- A wall window docked right is a narrow full-height strip on the current screen even when a monitor is
  assigned; "cả 2" in that strip stacks top/bottom and the text scales down; the touch bar replaces the
  keyboard hint; and a tap brings the bar back.
- With "Gốc" on, the Vietnamese panel contains every sentence in Vietnamese — spoken and translated —
  each exactly once.
- Pressing "Tóm tắt tài liệu bằng AI" is impossible while a session runs; the result lands in the
  editable Bối cảnh box; it survives a page reload; and its terms sit behind the glossary and the
  speakers under the same 40-line budget.
</acceptance_criteria>

<report_format>
Answer in **Vietnamese**, in these five sections, and keep it short — the reader is not a programmer:

1. **Đã làm gì** — one line per task (10 lines).
2. **File đã sửa** — the list, with one clause each on why. State plainly: **có động vào file của luồng
   offline không?** (expected answer: không). Include the `docs/` rename in this list.
3. **Kết quả kiểm tra** — the four commands, with their real output.
4. **Những con số có thể chỉnh** — the thresholds an operator might want to move after a rehearsal
   (snap/suggest, the pause window, the shape thresholds, the dock width), where each one lives, and what
   moving it costs. Do NOT change any of them; just say where they are.
5. **Chưa làm / cần chú ý** — anything you deliberately left out, anything only a live rehearsal can
   confirm, and any place where you had to guess.
</report_format>
