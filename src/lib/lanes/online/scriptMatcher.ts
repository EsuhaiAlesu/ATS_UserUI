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
