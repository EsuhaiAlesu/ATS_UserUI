// TASK 23 — the two segmentation ceilings COUNT CHARACTERS, and they were tuned around Japanese. The same
// sentence is 1.85× longer in Vietnamese (measured: 63 saved sessions, 1,519 lines, 836 aligned pairs), so
// one fixed pair of numbers cut Vietnamese 40× as often as Japanese while gluing Japanese into whole
// thoughts and Vietnamese almost never. These cases pin the scaled ruler AND that Japanese does not move.

import { describe, it, expect } from 'vitest';
import {
  isJapaneseHeavy,
  segmentCharLimit,
  SEGMENT_VI_CHAR_FACTOR,
  endsWithStrongSentenceBreak,
} from '../src/lib/lanes/online/transcriptSegmentation';

// The lane's two numbers, repeated here ON PURPOSE. If somebody changes them in onlineLane.ts without
// re-reading the measured evidence above, this file must go red rather than quietly follow along.
const SEGMENT_MAX_CHARS = 120;
const SEGMENT_MIN_CHARS = 18;

const JA = 'それでは、皆様にこのアプリを一緒に体験していただきたいと思います。';
const VI = 'Dạ, sau đây thì mời các thầy cô, các anh chị mình cùng trải nghiệm thử cái app này nhé.';

// The lane's two rules, restated verbatim.
const complete = (buf: string) => endsWithStrongSentenceBreak(buf, true) && buf.length >= segmentCharLimit(SEGMENT_MIN_CHARS, buf);
const mustCut = (buf: string) => buf.length >= segmentCharLimit(SEGMENT_MAX_CHARS, buf);

describe('segmentCharLimit — one Vietnamese character is not one Japanese character', () => {
  it('tells the two languages apart on the plain cases', () => {
    expect(isJapaneseHeavy(JA)).toBe(true);
    expect(isJapaneseHeavy(VI)).toBe(false);
    expect(isJapaneseHeavy('')).toBe(false);
    expect(isJapaneseHeavy('123 456')).toBe(false); // no letters at all
  });

  it('keeps a Japanese sentence Japanese when it carries a Latin proper noun', () => {
    expect(isJapaneseHeavy('JPCクラウドベンがこのアプリを使っております。')).toBe(true);
    expect(isJapaneseHeavy('N5から5つのレベルがあります。')).toBe(true);
  });

  it('keeps a Vietnamese sentence Vietnamese when it quotes a kanji or two', () => {
    expect(isJapaneseHeavy('Trong một cái tổng thể như vậy thì có năm cấp độ, từ N5 đến 日本語 nhé.')).toBe(false);
    expect(isJapaneseHeavy('Hán tự 一 này là chữ nhất, các em nhớ giùm cô.')).toBe(false);
  });

  it('leaves the Japanese numbers alone and scales the Vietnamese ones', () => {
    expect(segmentCharLimit(SEGMENT_MAX_CHARS, JA)).toBe(120);
    expect(segmentCharLimit(SEGMENT_MIN_CHARS, JA)).toBe(18);
    expect(segmentCharLimit(SEGMENT_MAX_CHARS, VI)).toBe(222); // 120 × 1.85
    expect(segmentCharLimit(SEGMENT_MIN_CHARS, VI)).toBe(33);  // 18 × 1.85, rounded
  });

  it('uses a measured factor, not a pretty one', () => {
    // p25 1.54 · p75 2.23 over the 836 aligned pairs — the factor has to sit inside its own evidence.
    expect(SEGMENT_VI_CHAR_FACTOR).toBeGreaterThanOrEqual(1.54);
    expect(SEGMENT_VI_CHAR_FACTOR).toBeLessThanOrEqual(2.23);
  });

  it('stops calling an average Vietnamese line "too long"', () => {
    const p90 = 'x'.repeat(152); // the measured p90 of Vietnamese lines
    expect(p90.length >= SEGMENT_MAX_CHARS).toBe(true); // the OLD rule cut it here
    expect(mustCut(p90)).toBe(false);                   // the new rule leaves it whole
  });

  it('lets a short Vietnamese fragment wait to be glued, like Japanese always did', () => {
    // 14 chars, has a full stop, still under the scaled floor of 33 — so it waits for the next final.
    expect(complete('Dạ, cảm ơn cô.')).toBe(false);
    // Long enough and finished: out at once.
    expect(complete('Dạ, cảm ơn cô, sau đây mời các anh chị trải nghiệm thử.')).toBe(true);
  });

  it('does not move Japanese behaviour, which was already working', () => {
    expect(complete(JA)).toBe(true);
    expect(mustCut(JA)).toBe(false);
    expect(complete('はい。')).toBe(false); // still under the unchanged floor of 18, still glued
  });
});
