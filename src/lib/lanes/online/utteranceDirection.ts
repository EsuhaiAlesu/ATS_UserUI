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
 * The raw script evidence in a piece of text, for a caller that must WEIGH it rather than be handed a
 * verdict: the TTS guard needs to know how much of a line is Japanese, not merely whether any of it is —
 * a Vietnamese sentence quoting エスハイ is still Vietnamese. Exported from here so there is exactly one
 * copy of these three character classes in the lane.
 */
export function scriptSignals(text: string): { kana: number; kanji: number; vnMarks: number; chars: number } {
  const t = (text || '').trim()
  return { kana: count(t, KANA), kanji: count(t, KANJI), vnMarks: count(t, VN_MARKS), chars: t.replace(/\s+/g, '').length }
}

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

/**
 * The INTERIM classifier: the same evidence, but a much higher bar to CHANGE direction.
 *
 * A draft is shown before the vendor's language tag exists — the tag rides the finalised transcript
 * only — so the only evidence a draft has is the script. Bare kanji with no kana is exactly the signal
 * that cannot be trusted here: a Chinese mis-transcription of Vietnamese speech looks identical to
 * Japanese, and a single stray kanji in a Vietnamese partial used to be enough to send the first half
 * of the sentence into the Japanese→Vietnamese window and translate it backwards. Kana and Vietnamese
 * tone marks may flip the direction mid-turn; nothing weaker may. The final settles it properly
 * (decideFinalLanguage), so a draft that stays one beat behind costs nothing.
 */
export function classifyInterimUtterance(text: string, previous?: Lang): UtteranceVerdict {
  const t = (text || '').trim()
  if (!t) return { language: previous ?? 'vi', confidence: 0.5, basis: 'sticky' }
  const kana = count(t, KANA)
  if (kana > 0) return { language: 'ja', confidence: clampConf(0.8 + kana / 10), basis: 'script' }
  const marks = count(t, VN_MARKS)
  if (marks > 0) return { language: 'vi', confidence: clampConf(0.7 + marks / 8), basis: 'script' }
  return { language: previous ?? 'vi', confidence: 0.5, basis: 'sticky' } // kanji-only included: stay put
}

// ── The ASR vendor's own language detection ──────────────────────────────────────────────────────
// The session is opened with `include_language_detection=true` and every completed transcript carries a
// language tag, but nothing used to read it: direction was guessed from the script alone. Script alone
// has two blind spots that both showed up in the ceremony logs — Vietnamese typed without tone marks
// looks like nothing at all, and Chinese (kanji, no kana) looks exactly like Japanese, so a Chinese
// mis-transcription of Vietnamese speech was routed into the Japanese→Vietnamese direction and came out
// "translated" into itself. Reading the tag costs nothing: it is already on the wire.

export type VendorLanguage = 'vi' | 'ja' | 'other'

// Codes that mean "I could not tell", not "a third language". They must NOT read as `other`: `other` is
// half of what discards a sentence, and a recogniser admitting it does not know is no evidence at all.
const UNDETERMINED_CODES = new Set(['und', 'unknown', 'unk', 'auto', 'mul', 'mis', 'zxx', 'none', 'null'])

/** Fold whatever the vendor calls the language (`vi`, `vie`, `ja-JP`, `zh`, …) into our two, or `other`. */
export function normalizeVendorLanguage(raw?: string): VendorLanguage | null {
  const s = (raw || '').trim().toLowerCase()
  if (!s) return null
  const base = s.split(/[-_]/)[0]
  if (base === 'vi' || base === 'vie') return 'vi'
  if (base === 'ja' || base === 'jpn' || base === 'jp') return 'ja'
  if (UNDETERMINED_CODES.has(base)) return null
  return 'other'
}

export interface FinalLanguageDecision {
  /** The language to translate FROM, or null when there is not enough evidence (caller stays sticky). */
  language: Lang | null
  /** Both signals agree this is neither Vietnamese nor Japanese — somebody else's language, or noise. */
  foreign: boolean
  basis: 'kana' | 'vendor' | 'script' | 'none'
}

/**
 * Decide the language of a FINALISED transcript from the two independent signals we have.
 *
 * Precedence is deliberate:
 *  1. kana beats everything — hiragana/katakana appear in no other language, so no vendor tag can be
 *     right about a kana sentence being anything but Japanese;
 *  2. then the vendor, when it names one of our two — it hears the audio, we only see the text, and it
 *     is the only thing that can tell toneless Vietnamese from any other Latin script;
 *  3. then the script;
 *  4. and when the vendor names some THIRD language and the text carries neither kana nor Vietnamese
 *     tone marks, nothing here is ours: report it foreign so the caller can drop it rather than feed the
 *     hall a translation of a hallucination.
 *
 * Note the asymmetry in step 4: the guard needs BOTH signals to agree before it discards anything. A
 * dropped sentence is unrecoverable, so this errs towards keeping.
 */
export function decideFinalLanguage(text: string, vendorRaw?: string): FinalLanguageDecision {
  const t = (text || '').trim()
  const vendor = normalizeVendorLanguage(vendorRaw)
  if (count(t, KANA) > 0) return { language: 'ja', foreign: false, basis: 'kana' }
  if (vendor === 'vi' || vendor === 'ja') return { language: vendor, foreign: false, basis: 'vendor' }
  const script = classifyUtterance(t)
  if (vendor === 'other') {
    // Vietnamese tone marks are the one script signal strong enough to overrule the vendor here; bare
    // kanji is NOT (that is precisely the Chinese case this guard exists for).
    if (count(t, VN_MARKS) > 0) return { language: 'vi', foreign: false, basis: 'script' }
    return { language: null, foreign: true, basis: 'none' }
  }
  if (script.basis === 'script') return { language: script.language, foreign: false, basis: 'script' }
  return { language: null, foreign: false, basis: 'none' }
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
