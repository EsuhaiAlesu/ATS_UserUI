export const ASR_PARTIAL_MIN_VOICED_MS = 96;
export const ASR_FINAL_MIN_VOICED_MS = 160;

export type EvidenceGatedAsrProvider = 'qwen3';

export function providerNeedsSpeechEvidence(provider: string): provider is EvidenceGatedAsrProvider {
  return provider === 'qwen3';
}

export function hasClearSpeechEvidence(voicedMs: number, minimumMs: number) {
  return Number.isFinite(voicedMs) && voicedMs >= minimumMs;
}

// A transcriber does not only return words. When it cannot make out the audio it says so, in band, in
// its own language: （聞き取り不能）, (inaudible), [音楽], ♪. Nothing downstream can tell those from speech,
// so the ceremony logs contain a sentence whose translation is "(không nghe rõ)" — read out to the hall
// in a synthesised voice. They are annotations ABOUT the audio, not the audio's content.
const ANNOTATION_WRAPPERS: readonly (readonly [string, string])[] = [
  ['(', ')'], ['（', '）'], ['[', ']'], ['［', '］'], ['【', '】'], ['〔', '〕'], ['<', '>'], ['♪', '♪'],
];

/**
 * True when the whole transcript is one bracketed annotation or pure music marks.
 *
 * The test is deliberately all-or-nothing: a real utterance that merely CONTAINS a parenthesis keeps its
 * words, and only a line with nothing outside the brackets is discarded. "(Xin chào)" would be a false
 * positive, but a speaker whose entire sentence is parenthesised does not exist in a live hall.
 */
export function isNonSpeechAnnotation(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  if (/^[♪♬🎵\s]+$/u.test(t)) return true;
  for (const [open, close] of ANNOTATION_WRAPPERS) {
    if (!t.startsWith(open) || !t.endsWith(close)) continue;
    if (t.length <= open.length + close.length) continue;
    const inner = t.slice(open.length, t.length - close.length);
    if (!inner.includes(close)) return true; // the pair wraps everything — nothing is left outside it
  }
  return false;
}
