// src/lib/lanes/online/utteranceDirection.ts — decide, from the transcript SCRIPT alone (kana/kanji vs
// Latin), whether an utterance was Vietnamese or Japanese, so ONE microphone can serve both directions.
// Pure functions, no network: kana/kanji vs Latin is unambiguous, and every extra round trip is latency
// the audience feels. TASK 6.1.

export type Lang = 'vi' | 'ja'
export type Dir = 'vi2ja' | 'ja2vi'

export interface UtteranceVerdict {
  language: Lang
  confidence: number
  basis: 'script' | 'sticky' | 'default'
}

// hiragana + katakana (+ half-width katakana); CJK ideographs; Vietnamese tone/letter diacritics.
const KANA = /[぀-ゟ゠-ヿｦ-ﾝ]/g
const KANJI = /[一-鿿㐀-䶿]/g
const VN_MARKS = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/gi

const count = (s: string, re: RegExp) => (s.match(re) || []).length
const clampConf = (c: number) => Math.max(0, Math.min(0.99, c))

/**
 * Classify a single utterance by its script. `previous` is the sticky fallback when there is not enough
 * evidence (undiacriticised Latin such as "OK", "2026", "Esuhai", or Vietnamese typed without tones):
 * people rarely switch language on a filler word, and flipping direction on a guess is far worse than
 * being sticky.
 */
export function classifyUtterance(text: string, previous?: Lang): UtteranceVerdict {
  const t = (text || '').trim()
  if (!t) return { language: previous ?? 'vi', confidence: 0.5, basis: 'sticky' }
  const kana = count(t, KANA)
  if (kana > 0) return { language: 'ja', confidence: clampConf(0.8 + kana / 10), basis: 'script' }
  const marks = count(t, VN_MARKS)
  const kanji = count(t, KANJI)
  if (kanji > 0 && marks === 0) return { language: 'ja', confidence: clampConf(0.7 + kanji / 10), basis: 'script' }
  if (marks > 0) return { language: 'vi', confidence: clampConf(0.7 + marks / 8), basis: 'script' }
  return { language: previous ?? 'vi', confidence: 0.5, basis: 'sticky' } // not enough evidence → sticky
}

export const directionOf = (language: Lang): Dir => (language === 'vi' ? 'vi2ja' : 'ja2vi')

export interface DirectionTracker {
  next(text: string): UtteranceVerdict
  current(): Lang
  reset(initial?: Lang): void
}

/**
 * A stateful tracker seeded with the technician's chosen source language (used for the first utterance).
 * It only remembers a verdict when it is script-based AND confident (≥ 0.6), so one guessed utterance
 * cannot drag the following ones off course.
 */
export function createDirectionTracker(initial: Lang): DirectionTracker {
  let cur: Lang = initial
  return {
    next(text: string) {
      const v = classifyUtterance(text, cur)
      if (v.basis === 'script' && v.confidence >= 0.6) cur = v.language
      return v
    },
    current: () => cur,
    reset(next?: Lang) { cur = next ?? initial },
  }
}
