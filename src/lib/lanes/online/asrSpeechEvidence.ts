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
