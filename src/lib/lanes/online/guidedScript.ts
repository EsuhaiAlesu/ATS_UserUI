// src/lib/lanes/online/guidedScript.ts — the operator-driven script cursor for "dẫn theo kịch bản".
// DEPENDENCY-FREE like the rest of the lane core: no React, no fetch, no DOM.
//
// `scriptMatcher` guesses where the ceremony has got to. This module does not guess: the operator sits
// beside the stage with the paper script and knows. Arming it turns the approved pair for the current
// line into the answer, released verbatim the moment that sentence finalises — no draft, no refine.
//
// The safety gate is the whole reason this file is not three lines long. A wrong cursor plus verbatim
// release means an entirely different sentence goes out over the ballroom speakers in a confident human
// voice, and it cannot be taken back. So the armed line still has to LOOK like what was just heard —
// a much lower bar than the automatic snap (a second witness, the operator, is now present), but a bar.

// `normalizeForMatch` and `diceCoefficient` are reused, NOT copied. They are already exported and
// already tested, and they encode the one measurement that makes any of this work on speech-recognition
// output: strip diacritics and ALL whitespace, then score character bigrams. A second copy here would
// drift from the first the moment either is tuned, and the two would disagree about the same sentence.
import {
    DEFAULT_SCRIPT_MATCH_CONFIG,
    normalizeForMatch,
    diceCoefficient,
    coverageOf,
    type ScriptMatcherEntry,
    type ScriptLanguage,
} from './scriptMatcher';

/** How closely the heard sentence must resemble the armed line before it may be released verbatim. */
export const GUIDED_FLOOR = 0.45;

/**
 * The length floor — measured against the ARMED LINE, not as an absolute.
 *
 * It used to be an absolute floor on the heard text, and that was wrong: it made a SHORT LINE
 * unreleasable for ever. "Một… Hai… Ba — Kagami Biraki! Kanpai!" is in the script, the operator presses
 * it, the MC says exactly that, and the machine refused because "kanpai" is six characters. The point of
 * the floor was never to filter the room — the microphone is at the mouth and there is a noise gate in
 * front of it already — it was to stop a stray grunt releasing a LONG line it happens to share bigrams
 * with. So the requirement is now `min(8, độ dài dòng)`: a six-character line asks for six characters.
 */
export const GUIDED_MIN_CHARS = 8;

/**
 * A line this short has almost no bigrams, so `diceCoefficient` gets coarse — three characters is two
 * bigrams, and a chance collision is no longer rare. Such a line is held to a higher bar instead of being
 * refused: "Một" must actually be heard as "Một", not as "Hai".
 */
export const GUIDED_SHORT_LINE = 8;
export const GUIDED_SHORT_FLOOR = 0.8;

/**
 * HAS THE LINE BEEN FINISHED — the question the similarity score cannot ask.
 *
 * `GUIDED_FLOOR` is 0.45 deliberately: a human is pointing at the line, so the machine only has to agree
 * that the sentence is roughly that one, and the low bar is what forgives a bad microphone. But Dice is
 * symmetric, and a PREFIX is rewarded for being short — 2p/(p+L) puts one third of a line at 0.50. So the
 * low bar was also forgiving something it was never meant to forgive: **a line the MC is only a third of
 * the way through was released in full, out loud, ahead of the person speaking it.**
 *
 * The tail is what separates the two cases and the similarity score never could. Measured on a real
 * ceremonial line: three quarters read → tail 0.47; the whole line read through a bad microphone → tail
 * 1.0. The bar goes in that gap. `recall` is the second net, low enough that mishearing still passes.
 */
export const GUIDED_COVERAGE_FLOOR = 0.55;
export const GUIDED_TAIL_FLOOR = 0.6;

/**
 * The bar this heard sentence really has to clear.
 *
 * `base <= 0` is "thả cửa": the operator pressing the line IS the evidence and nothing is measured. Every
 * other setting keeps the short-line bump, which never blocks a correct press — only a wrong one.
 */
export function guidedBarFor(lineLength: number, base: number = GUIDED_FLOOR): number {
    if (base <= 0) return 0;
    return lineLength > 0 && lineLength < GUIDED_SHORT_LINE ? Math.max(base, GUIDED_SHORT_FLOOR) : base;
}

export type GuidedState = {
    /** false = the cursor is parked and the lane behaves exactly as it did before TASK 33. */
    armed: boolean;
    /** 0-based row the ceremony is on. -1 when nothing is selected. */
    index: number;
};

export const GUIDED_OFF: GuidedState = { armed: false, index: -1 };

export type GuidedVerdict =
    /** Release `target` verbatim, in `language`. */
    | { kind: 'release'; entryId: string; source: string; target: string; language: ScriptLanguage; score: number }
    /** The cursor is armed but this sentence does not resemble the line — fall through to the normal path. */
    | { kind: 'mismatch'; score: number; reason: string }
    /** Guided mode is not in play for this sentence at all. */
    | { kind: 'off'; reason: string };

/**
 * Clamp a proposed cursor to the script. Kept separate so the console and the lane cannot disagree about
 * what "line 12 of a 9-line script" means.
 */
export function clampGuidedIndex(index: number, size: number): number {
    if (!Number.isFinite(index) || size <= 0) return -1;
    const whole = Math.trunc(index);
    if (whole < 0) return -1;
    return whole >= size ? size - 1 : whole;
}

/** Step the cursor, clamped. `delta` is +1 for TỚI and -1 for LÙI. */
export function stepGuidedIndex(state: GuidedState, delta: number, size: number): GuidedState {
    if (size <= 0) return { ...state, index: -1 };
    // Stepping forward from "nothing selected" lands on the first line rather than the second.
    const from = state.index < 0 ? (delta > 0 ? -1 : 0) : state.index;
    return { ...state, index: clampGuidedIndex(from + delta, size) };
}

/**
 * How much the heard sentence resembles one KNOWN line. Thin wrapper over the matcher's own measure, so
 * "similar" means exactly the same thing in guided mode as it does in automatic mode — only the bar is
 * lower here, because a human is also pointing at the line.
 */
export function guidedSimilarity(a: string, b: string): number {
    // Rounded because this number is READ, not just compared: it goes into the diagnostics line, and
    // `0.8666666666666667` in the middle of a ceremony is noise where `0.867` is information.
    return Number(diceCoefficient(normalizeForMatch(a), normalizeForMatch(b)).toFixed(3));
}

/**
 * Decide what the armed line does with a just-finalised sentence.
 *
 * `heard` must be a FINALISED sentence, never a running partial — half a sentence is not evidence.
 */
export function judgeGuided(
    state: GuidedState,
    rows: readonly ScriptMatcherEntry[],
    heard: string,
    floor: number = GUIDED_FLOOR,
): GuidedVerdict {
    if (!state.armed) return { kind: 'off', reason: 'chưa bật dẫn' };
    if (!Array.isArray(rows) || rows.length === 0) return { kind: 'off', reason: 'kịch bản trống' };
    const index = clampGuidedIndex(state.index, rows.length);
    if (index < 0) return { kind: 'off', reason: 'chưa chọn dòng' };
    const row = rows[index];
    if (!row) return { kind: 'off', reason: 'chưa chọn dòng' };
    // An unapproved row is a draft translation. The entire value of releasing verbatim is that a human
    // signed off on the wording; without that signature there is nothing to release.
    if (row.status !== 'approved') return { kind: 'off', reason: `dòng ${index + 1} chưa được duyệt` };

    const text = normalizeForMatch(heard);
    // Measured against the LINE the operator is pointing at, so a short line stays reachable. The longer
    // of the two sides is the yardstick: the same row is read in Vietnamese by one MC and in Japanese by
    // the other, and whichever is being read now, the row is as long as its longer side.
    const lineLength = Math.max(normalizeForMatch(row.src).length, normalizeForMatch(row.dst).length);
    const need = Math.min(GUIDED_MIN_CHARS, lineLength);
    if (floor > 0 && text.length < need) {
        return { kind: 'mismatch', score: 0, reason: `câu quá ngắn (${text.length}/${need} ký tự)` };
    }

    // Either side of the row may be the one being spoken — the same line gets read in Vietnamese by the
    // MC and in Japanese by the interpreter, and both are "line 12".
    const forward = guidedSimilarity(heard, row.src);
    const backward = guidedSimilarity(heard, row.dst);
    const useForward = forward >= backward;
    const score = useForward ? forward : backward;
    const bar = guidedBarFor(lineLength, floor);
    if (score < bar) {
        return { kind: 'mismatch', score, reason: `không giống dòng ${index + 1} (${score}/${bar})` };
    }

    // It looks like the line. That is not the same as the line being FINISHED, and until this gate existed
    // nothing here asked the difference: a third of a line scores 0.50 on a 0.45 bar, so the machine read
    // the whole approved sentence out over the hall while the MC was still in the middle of saying it.
    // Skipped entirely at floor 0 ("thả cửa") — there the operator's press is the only evidence wanted.
    const spoken = useForward ? row.src : row.dst;
    if (floor > 0) {
        const cover = coverageOf(heard, spoken);
        if (cover.recall < GUIDED_COVERAGE_FLOOR || cover.tailRecall < GUIDED_TAIL_FLOOR) {
            return {
                kind: 'mismatch',
                score,
                reason: `mới nghe được ${Math.round(cover.recall * 100)}% dòng ${index + 1} — chưa hết câu`,
            };
        }
    }

    const source = spoken;
    const target = useForward ? row.dst : row.src;
    const language = (useForward ? row.dst_lang : row.src_lang) as ScriptLanguage;
    // The lane only speaks Vietnamese and Japanese. A row translating into anything else is a row this
    // build cannot voice, and releasing it would hand the voice a language it has no speaker for.
    if (language !== 'vi' && language !== 'ja') {
        return { kind: 'off', reason: `dòng ${index + 1} không phải Việt/Nhật` };
    }
    if (!String(target).trim()) return { kind: 'off', reason: `dòng ${index + 1} chưa có bản dịch` };

    return { kind: 'release', entryId: row.id, source, target: String(target).trim(), language, score };
}

/**
 * The reading under the TỚI/LÙI buttons. One short line, in the operator's own language, because during
 * a ceremony nobody reads two.
 */
export function guidedReadout(state: GuidedState, rows: readonly ScriptMatcherEntry[]): string {
    const size = Array.isArray(rows) ? rows.length : 0;
    if (size === 0) return 'Chưa nạp kịch bản';
    if (!state.armed) return `Đang tự động · kịch bản ${size} dòng`;
    const index = clampGuidedIndex(state.index, size);
    if (index < 0) return `Đang dẫn · chưa chọn dòng (1–${size})`;
    const row = rows[index];
    const approved = row?.status === 'approved';
    return `Đang dẫn · dòng ${index + 1}/${size}${approved ? '' : ' · CHƯA DUYỆT, sẽ dịch như thường'}`;
}

/** Sanity ceiling shared with the console so both agree what a "reasonable" floor is. */
export const GUIDED_FLOOR_RANGE = { min: 0.3, max: DEFAULT_SCRIPT_MATCH_CONFIG.snapThreshold } as const;

/**
 * TASK 36 — how closely the person now at the microphone follows the written script.
 *
 * `script` is the MC: reads it near-verbatim, and the only kind guided mode is actually for.
 * `partial` is the prepared speaker who drifts: their text still helps the machine translate in the
 * right register (it is in the brief), but releasing approved lines verbatim would be wrong more often
 * than right. `none` is the guest or the Q&A.
 */
export type SpeakerMode = 'script' | 'partial' | 'none';

export const SPEAKER_MODES: { value: SpeakerMode; label: string; hint: string }[] = [
    { value: 'script', label: 'Bám kịch bản', hint: 'Đọc gần đúng từng dòng — bật dẫn được' },
    { value: 'partial', label: 'Nói lệch một nửa', hint: 'Có bài nhưng nói thêm — máy tự dịch, vẫn dùng kịch bản làm bối cảnh' },
    { value: 'none', label: 'Không có kịch bản', hint: 'Nói tự do — máy dịch hoàn toàn tự động' },
];

export function speakerModeLabel(mode: SpeakerMode): string {
    return SPEAKER_MODES.find((m) => m.value === mode)?.label ?? 'Bám kịch bản';
}

/**
 * May guided mode be armed for this speaker?
 *
 * One-way only: a mode can FORBID arming, never cause it. Arming is always a deliberate human act, and
 * picking a name off a dropdown is not that — an operator setting up the speaker list an hour before the
 * ceremony must not discover afterwards that they also switched on verbatim release.
 */
export function guidedAllowed(mode: SpeakerMode): boolean {
    return mode === 'script';
}

/** Why the checkbox is greyed out, in the operator's language. Empty string when it is not. */
export function guidedBlockedReason(mode: SpeakerMode): string {
    if (mode === 'partial') return 'Người này có bài nhưng thường nói lệch — máy tự dịch sẽ đúng hơn là đọc thẳng kịch bản';
    if (mode === 'none') return 'Người này không có kịch bản — không có dòng nào để đọc thẳng';
    return '';
}
