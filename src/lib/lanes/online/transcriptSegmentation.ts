const ALWAYS_STRONG_BREAKS = new Set(['。', '！', '？', '!', '?']);
const PERIOD_BREAKS = new Set(['.', '．']);
const COMMA_BREAKS = new Set([',', '，', '、']);

function isAsciiDigit(value: string | undefined) {
  return value !== undefined && value >= '0' && value <= '9';
}

/**
 * A dot between two digits is part of a decimal or a grouped number, not the
 * end of a sentence. Vietnamese transcripts commonly contain 10.000 and
 * 100.000.000, so treating every dot as punctuation corrupts segmentation.
 */
export function isNumericSeparator(text: string, index: number) {
  return (
    PERIOD_BREAKS.has(text[index] ?? '') &&
    isAsciiDigit(text[index - 1]) &&
    isAsciiDigit(text[index + 1])
  );
}

/**
 * Return the first usable comma boundary, including the comma itself.
 * A comma between two digits (for example 3,14) is numeric punctuation and
 * must not finalize a subtitle clause.
 */
export function findFirstCommaClauseBreak(text: string, minimumClauseChars = 1) {
  for (let index = 0; index < text.length; index += 1) {
    if (!COMMA_BREAKS.has(text[index] ?? '')) continue;
    if (isAsciiDigit(text[index - 1]) && isAsciiDigit(text[index + 1])) continue;
    if (text.slice(0, index).trim().length < minimumClauseChars) continue;
    return index + 1;
  }
  return 0;
}

export function findLastStrongSentenceBreak(text: string, includePeriods: boolean) {
  let lastBreak = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] ?? '';
    if (ALWAYS_STRONG_BREAKS.has(character)) {
      lastBreak = index + 1;
      continue;
    }
    if (includePeriods && PERIOD_BREAKS.has(character) && !isNumericSeparator(text, index)) {
      lastBreak = index + 1;
    }
  }
  return lastBreak;
}

export function endsWithStrongSentenceBreak(text: string, includePeriods: boolean) {
  const trimmed = text.trimEnd();
  if (!trimmed) return false;
  return findLastStrongSentenceBreak(trimmed, includePeriods) === trimmed.length;
}

/** Punctuation that follows a sentence break and belongs to the same sentence, never to the next one. */
const TRAILING_PUNCTUATION = new Set(['…', '.', '．', '"', '”', '»', '」', '』', ')', '）', '’', "'"]);

/**
 * EVERY sentence boundary in `text`, as exclusive end offsets that already include the punctuation.
 *
 * Different from `findLastStrongSentenceBreak` in that it returns the whole list rather than the final
 * one — which is what counting "have we got 2–3 sentences yet?" needs, without slicing the string over and
 * over. A run of punctuation ("?!", "。」") is swallowed into ONE boundary; otherwise "Thật không?!" counts
 * as two sentences. `…` is deliberately NOT a boundary: an ellipsis announces that more is coming, and
 * `SOFT_BREAK_END_PATTERN` in livePipelinePolicy already treats it that way.
 */
export function findSentenceEnds(text: string, includePeriods = true): number[] {
  const ends: number[] = [];
  const isBreakAt = (index: number) => {
    const character = text[index] ?? '';
    if (ALWAYS_STRONG_BREAKS.has(character)) return true;
    return includePeriods && PERIOD_BREAKS.has(character) && !isNumericSeparator(text, index);
  };
  for (let index = 0; index < text.length; index += 1) {
    if (!isBreakAt(index)) continue;
    let last = index;
    while (last + 1 < text.length && (isBreakAt(last + 1) || TRAILING_PUNCTUATION.has(text[last + 1] ?? ''))) {
      last += 1;
    }
    ends.push(last + 1);
    index = last;
  }
  return ends;
}

/**
 * The length of the LAST sentence in `text`, its punctuation included. When the string does not end on a
 * boundary, the unfinished tail is what gets measured. One question only: is the thing at the end being
 * CALLED a sentence actually long enough to be one?
 */
export function lastSentenceLength(text: string): number {
  const trimmed = text.trimEnd();
  if (!trimmed) return 0;
  const ends = findSentenceEnds(trimmed);
  if (!ends.length || ends[ends.length - 1] !== trimmed.length) {
    const start = ends.length ? ends[ends.length - 1] : 0;
    return trimmed.slice(start).trim().length;
  }
  const start = ends.length >= 2 ? ends[ends.length - 2] : 0;
  return trimmed.slice(start).trim().length;
}

/**
 * Was this trailing full stop INVENTED BY THE RECOGNISER as it closed the turn?
 *
 * 04/08 evidence: "Nếu mà tính." / "năng nó bật lên" — the speaker hesitated between the two syllables of
 * the compound word "tính năng", the recogniser heard enough silence to close the turn, and added a full
 * stop nobody spoke. Everything downstream then treats that stop as proof the thought is over: the stub
 * waits only the base continuation window, is flushed alone, and drags a stub translation and a stub
 * loudspeaker line with it.
 *
 * The tell is LENGTH, not vocabulary: the last sentence is shorter than the minimum this lane requires
 * before it will call anything a sentence. Deliberately the same ruler `handleFinal` uses for `complete` —
 * if these two ever disagree, one of them is throwing away what the other is waiting for.
 *
 * Only full stops count. A question mark or an exclamation mark has to be heard in the intonation, and the
 * recogniser essentially never invents one.
 */
export function endsProvisionalSentence(text: string, baseMinChars: number): boolean {
  const trimmed = text.trimEnd();
  if (!/[.．。]$/.test(trimmed)) return false;
  return lastSentenceLength(trimmed) < segmentCharLimit(baseMinChars, trimmed);
}

/**
 * Drop the invented full stop at a join, but only once there is EVIDENCE the speaker carried on: the
 * continuation starts with a lowercase letter. An uppercase start means the recogniser believes a new
 * sentence began — and then the full stop stays, because deleting a real one would glue two sentences into
 * a run-on that the paragraph rule can no longer break.
 */
export function stripProvisionalSentenceEnd(previous: string, next: string, baseMinChars: number): string {
  const head = next.trimStart();
  if (!head || !/^\p{Ll}/u.test(head)) return previous;
  if (!endsProvisionalSentence(previous, baseMinChars)) return previous;
  return previous.trimEnd().slice(0, -1).trimEnd();
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
