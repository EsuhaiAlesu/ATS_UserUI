export function joinLiveDraftSource(base: string, tail: string) {
  const normalizedBase = base.trim();
  const normalizedTail = tail.trim();
  if (!normalizedBase) return normalizedTail;
  if (!normalizedTail) return normalizedBase;
  return `${normalizedBase} ${normalizedTail}`;
}

/**
 * True when `candidate` is a complete leading unit of the current ASR text.
 * The boundary check prevents promoting/TTS-reading half of a word while a
 * realtime partial is still extending that word.
 */
export function isStableDraftPrefix(current: string, candidate: string) {
  const normalizedCurrent = current.trim();
  const normalizedCandidate = candidate.trim();
  if (!normalizedCandidate || !normalizedCurrent.startsWith(normalizedCandidate)) return false;
  if (normalizedCurrent.length === normalizedCandidate.length) return true;
  return /[\s.,!?;:…。、！？]/u.test(normalizedCurrent.charAt(normalizedCandidate.length));
}

export type PromotedPrefixResult = {
  text: string;
  matched: boolean;
  /** The ASR briefly regressed to an earlier prefix already shown/spoken. */
  coveredByPromoted: boolean;
};

/**
 * Removes a previously promoted partial only on an exact prefix match. When
 * ASR revises that prefix, callers keep the corrected text instead of
 * slicing by character count and silently losing words.
 */
export function stripPromotedPrefix(text: string, promotedPrefix: string): PromotedPrefixResult {
  const value = text.trim();
  const prefix = promotedPrefix.trim();
  if (!prefix) return { text: value, matched: false, coveredByPromoted: false };
  if (value.startsWith(prefix)) {
    return { text: value.slice(prefix.length).trimStart(), matched: true, coveredByPromoted: false };
  }
  if (prefix.startsWith(value)) {
    return { text: '', matched: true, coveredByPromoted: true };
  }
  return { text: value, matched: false, coveredByPromoted: false };
}
