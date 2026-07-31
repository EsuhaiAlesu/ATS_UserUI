import { describe, it, expect } from 'vitest'
import {
  checkTtsLanguage,
  TTS_GUARD_MIN_CHARS,
  TTS_GUARD_JA_SHARE,
} from '../src/lib/lanes/online/ttsLanguageGuard'

const SPEAK = { speak: true, reason: '' }

// A plain English sentence: no tone marks, no kana/kanji — exactly the shape the guard cannot tell from a
// name or a number, which is why the length floor is the only thing that decides it.
const ENGLISH = 'Thank you very much for coming to our ceremony tonight'
const VIETNAMESE = 'Kính thưa quý vị đại biểu và các bạn thực tập sinh'
const JAPANESE = '本日はお越しいただきまして誠にありがとうございます'

describe('checkTtsLanguage — giọng Nhật', () => {
  it('real Japanese speaks', () => {
    expect(checkTtsLanguage(JAPANESE, 'ja')).toEqual(SPEAK)
    expect(checkTtsLanguage('エスハイへようこそ', 'ja')).toEqual(SPEAK)
  })

  it('a long English sentence is blocked', () => {
    expect(ENGLISH.replace(/\s+/g, '').length).toBeGreaterThanOrEqual(TTS_GUARD_MIN_CHARS)
    expect(checkTtsLanguage(ENGLISH, 'ja')).toEqual({
      speak: false,
      reason: 'câu không phải tiếng Nhật (có thể là tiếng Anh)',
    })
  })

  it('a Vietnamese sentence is blocked', () => {
    expect(checkTtsLanguage(VIETNAMESE, 'ja')).toEqual({
      speak: false,
      reason: 'câu tiếng Việt lọt vào giọng Nhật',
    })
    // Tone marks are conclusive, so this one does not need the length floor to be caught.
    expect(checkTtsLanguage('Xin chào', 'ja').speak).toBe(false)
  })

  it('short text is never guessed at', () => {
    expect(checkTtsLanguage('OK', 'ja')).toEqual(SPEAK)
    expect(checkTtsLanguage('GEM Center', 'ja')).toEqual(SPEAK)
    expect(checkTtsLanguage('2026', 'ja')).toEqual(SPEAK)
    // The floor is counted on non-space characters: one short of it still speaks.
    expect(checkTtsLanguage('a'.repeat(TTS_GUARD_MIN_CHARS - 1), 'ja')).toEqual(SPEAK)
    expect(checkTtsLanguage('a'.repeat(TTS_GUARD_MIN_CHARS), 'ja').speak).toBe(false)
  })

  it('any Japanese character at all is enough to speak', () => {
    expect(checkTtsLanguage(`${ENGLISH} ね`, 'ja')).toEqual(SPEAK) // one kana rescues a long Latin line
    expect(checkTtsLanguage('2026年', 'ja')).toEqual(SPEAK)        // one kanji is evidence too
  })
})

describe('checkTtsLanguage — giọng Việt', () => {
  it('real Vietnamese speaks', () => {
    expect(checkTtsLanguage(VIETNAMESE, 'vi')).toEqual(SPEAK)
    expect(checkTtsLanguage('Xin trân trọng cảm ơn quý vị', 'vi')).toEqual(SPEAK)
  })

  it('a long English sentence is blocked', () => {
    expect(checkTtsLanguage(ENGLISH, 'vi')).toEqual({
      speak: false,
      reason: 'câu không phải tiếng Việt (có thể là tiếng Anh)',
    })
  })

  it('a Japanese sentence is blocked', () => {
    expect(checkTtsLanguage(JAPANESE, 'vi')).toEqual({
      speak: false,
      reason: 'câu tiếng Nhật lọt vào giọng Việt',
    })
    // Blocked by SHARE: 10 kana out of 16 non-space characters is over the line even with English in it.
    const half = 'ありがとうございます thanks'
    expect(10 / half.replace(/\s+/g, '').length).toBeGreaterThanOrEqual(TTS_GUARD_JA_SHARE)
    expect(checkTtsLanguage(half, 'vi').speak).toBe(false)
  })

  it('a Vietnamese sentence quoting a Japanese name still speaks', () => {
    expect(checkTtsLanguage('Công ty エスハイ xin kính chào quý vị', 'vi')).toEqual(SPEAK)
    expect(checkTtsLanguage('Chương trình do Esuhai 株式会社 tổ chức tại GEM Center', 'vi')).toEqual(SPEAK)
  })

  it('short text is never guessed at', () => {
    expect(checkTtsLanguage('OK', 'vi')).toEqual(SPEAK)
    expect(checkTtsLanguage('GEM Center', 'vi')).toEqual(SPEAK)
    expect(checkTtsLanguage('2026', 'vi')).toEqual(SPEAK)
    expect(checkTtsLanguage('a'.repeat(TTS_GUARD_MIN_CHARS - 1), 'vi')).toEqual(SPEAK)
    expect(checkTtsLanguage('a'.repeat(TTS_GUARD_MIN_CHARS), 'vi').speak).toBe(false)
  })
})

describe('checkTtsLanguage — không có nội dung', () => {
  it('empty and whitespace-only input is never spoken, in either voice', () => {
    const silent = { speak: false, reason: 'không có nội dung' }
    expect(checkTtsLanguage('', 'ja')).toEqual(silent)
    expect(checkTtsLanguage('', 'vi')).toEqual(silent)
    expect(checkTtsLanguage('   \n\t ', 'ja')).toEqual(silent)
    expect(checkTtsLanguage('   \n\t ', 'vi')).toEqual(silent)
  })
})
