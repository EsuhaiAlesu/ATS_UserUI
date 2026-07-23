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
