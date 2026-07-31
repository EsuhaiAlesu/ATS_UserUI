// src/lib/lanes/online/ttsLanguageGuard.ts — do not let the loudspeaker read a sentence in a language
// the voice cannot pronounce.
//
// The failure this exists for: the refine model is asked for Japanese and returns an English line —
// usually because the speaker themselves said an English sentence, a song title, a slogan on the slide —
// and the Japanese voice then reads English letter-shapes as Japanese syllables. Over a hall PA that is
// not "slightly wrong", it is a noise nobody can parse, and it lands on top of the next sentence.
//
// The rule is narrow on purpose: SKIP THE VOICE, NEVER THE SUBTITLE. The line is still displayed and
// still saved to the transcript; only the speaker stays quiet. So the cost of a wrong skip is one
// sentence the audience reads instead of hears, while the cost of a wrong speak is a burst of noise over
// the sentence after it.
//
// Applied to MODEL output only. An approved script row is human-authored truth: if a person put an
// English line in the Japanese column, they meant it, and this must not overrule them.
//
// Pure functions, no network, no DOM.

import { scriptSignals, type Lang } from './utteranceDirection'

// Below this there is not enough text to say anything at all. "OK", "GEM Center", "2026" carry no
// language evidence in any script, and refusing to speak them would be a guess, not a guard.
export const TTS_GUARD_MIN_CHARS = 24
// At or above this share of Japanese characters the line IS Japanese, rather than a Vietnamese sentence
// that happens to quote a Japanese name.
export const TTS_GUARD_JA_SHARE = 0.5

export interface TtsLanguageVerdict {
  speak: boolean
  /** Operator-facing, Vietnamese, and short enough for the diagnostics line. Empty when speaking. */
  reason: string
}

const SPEAK: TtsLanguageVerdict = { speak: true, reason: '' }

/**
 * Decide whether `text` may be spoken by the `target` voice.
 *
 * Evidence, in the order it is trusted:
 *  - Vietnamese tone marks are conclusive FOR Vietnamese — no other language in this room has them, and
 *    a Vietnamese sentence keeps them even when it quotes a Japanese name.
 *  - kana/kanji are conclusive FOR Japanese, but only by SHARE when the target is Vietnamese: one quoted
 *    エスハイ inside a Vietnamese sentence must not silence it.
 *  - No evidence at all — pure unaccented Latin — is exactly what an English sentence looks like, and
 *    also what a name or a number looks like. That is what the length floor is for.
 */
export function checkTtsLanguage(text: string, target: Lang): TtsLanguageVerdict {
  const t = (text || '').trim()
  if (!t) return { speak: false, reason: 'không có nội dung' }
  const s = scriptSignals(t)
  const japanese = s.kana + s.kanji

  if (target === 'ja') {
    // Any Japanese character means the model did produce Japanese — err towards speaking.
    if (japanese > 0) return SPEAK
    if (s.vnMarks > 0) return { speak: false, reason: 'câu tiếng Việt lọt vào giọng Nhật' }
    if (s.chars >= TTS_GUARD_MIN_CHARS) return { speak: false, reason: 'câu không phải tiếng Nhật (có thể là tiếng Anh)' }
    return SPEAK
  }

  if (s.vnMarks > 0) return SPEAK
  if (s.chars > 0 && japanese / s.chars >= TTS_GUARD_JA_SHARE) {
    return { speak: false, reason: 'câu tiếng Nhật lọt vào giọng Việt' }
  }
  if (s.chars >= TTS_GUARD_MIN_CHARS) return { speak: false, reason: 'câu không phải tiếng Việt (có thể là tiếng Anh)' }
  return SPEAK
}
