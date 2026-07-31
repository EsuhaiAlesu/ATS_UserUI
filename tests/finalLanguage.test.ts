import { describe, it, expect } from 'vitest'
import {
  normalizeVendorLanguage,
  decideFinalLanguage,
  type VendorLanguage,
  type FinalLanguageDecision,
} from '../src/lib/lanes/online/utteranceDirection'
import { isNonSpeechAnnotation } from '../src/lib/lanes/online/asrSpeechEvidence'

// PROMPT-10 TASK 8 — the two signals that decide a finalised sentence (the vendor's language tag and the
// script), plus the annotation filter. The case that hurt in the ceremony logs: Chinese (kanji, no kana)
// read exactly like Japanese and was routed into the Japanese→Vietnamese direction.

describe('normalizeVendorLanguage — folding the vendor code into our two', () => {
  it('every spelling of Vietnamese → vi', () => {
    expect(normalizeVendorLanguage('vi')).toBe<VendorLanguage>('vi')
    expect(normalizeVendorLanguage('vie')).toBe('vi')
    expect(normalizeVendorLanguage('vi-VN')).toBe('vi')
  })

  it('every spelling of Japanese → ja', () => {
    expect(normalizeVendorLanguage('ja')).toBe<VendorLanguage>('ja')
    expect(normalizeVendorLanguage('ja-JP')).toBe('ja')
    expect(normalizeVendorLanguage('jpn')).toBe('ja')
    expect(normalizeVendorLanguage('jp')).toBe('ja')
  })

  it('case and separator do not matter (JA_jp, Vie, ja_JP, whitespace)', () => {
    expect(normalizeVendorLanguage('JA')).toBe('ja')
    expect(normalizeVendorLanguage('ja_JP')).toBe('ja')
    expect(normalizeVendorLanguage('JA_jp')).toBe('ja')
    expect(normalizeVendorLanguage('Vie')).toBe('vi')
    expect(normalizeVendorLanguage('  VI-vn  ')).toBe('vi')
  })

  it('a third language → other', () => {
    expect(normalizeVendorLanguage('zh')).toBe<VendorLanguage>('other')
    expect(normalizeVendorLanguage('zh-CN')).toBe('other')
    expect(normalizeVendorLanguage('it')).toBe('other')
    expect(normalizeVendorLanguage('th')).toBe('other')
    expect(normalizeVendorLanguage('en-US')).toBe('other')
  })

  it('empty / undefined → null', () => {
    expect(normalizeVendorLanguage('')).toBeNull()
    expect(normalizeVendorLanguage(undefined)).toBeNull()
    expect(normalizeVendorLanguage('   ')).toBeNull()
  })

  it('"không nhận ra được" ≠ "một ngôn ngữ khác": und/unknown/unk/auto/mul/mis/zxx/none/null đọc thành null, KHÔNG phải other (other là một nửa điều kiện loại bỏ câu, nên máy nhận dạng tự nhận không biết thì không được tính là bằng chứng)', () => {
    for (const code of ['und', 'unknown', 'unk', 'auto', 'mul', 'mis', 'zxx', 'none', 'null']) {
      expect(normalizeVendorLanguage(code), code).toBeNull()
      expect(normalizeVendorLanguage(code.toUpperCase()), code).toBeNull()
    }
  })
})

describe('decideFinalLanguage — deciding a finalised sentence', () => {
  it('kana beats ANY vendor tag (Japanese kana tagged zh stays ja)', () => {
    const d = decideFinalLanguage('これは日本語です', 'zh')
    expect(d).toMatchObject<Partial<FinalLanguageDecision>>({ language: 'ja', foreign: false, basis: 'kana' })
  })

  it('toneless Vietnamese is saved ONLY by the vendor', () => {
    const d = decideFinalLanguage('Xin chao quy vi dai bieu', 'vi')
    expect(d).toMatchObject({ language: 'vi', foreign: false, basis: 'vendor' })
  })

  it('Chinese — all kanji, no kana, tagged zh — is dropped as foreign (the case that used to be sent into ja→vi)', () => {
    const d = decideFinalLanguage('我是海空啊', 'zh')
    expect(d.foreign).toBe(true)
    expect(d.language).toBeNull()
    expect(d.basis).toBe('none')
  })

  it('Japanese written in ALL KANJI is kept because the vendor names it', () => {
    const d = decideFinalLanguage('会議室予約', 'ja')
    expect(d).toMatchObject({ language: 'ja', foreign: false, basis: 'vendor' })
  })

  it('no vendor tag at all → fall back to reading the script, exactly as before', () => {
    expect(decideFinalLanguage('Xin chào quý vị')).toMatchObject({ language: 'vi', foreign: false, basis: 'script' })
    expect(decideFinalLanguage('こんにちは')).toMatchObject({ language: 'ja', foreign: false, basis: 'kana' })
    expect(decideFinalLanguage('会議室予約')).toMatchObject({ language: 'ja', foreign: false, basis: 'script' })
  })

  it('Vietnamese tone marks survive a vendor naming a THIRD language', () => {
    const d = decideFinalLanguage('Kính thưa quý vị đại biểu', 'zh')
    expect(d).toMatchObject({ language: 'vi', foreign: false, basis: 'script' })
  })

  it('not enough evidence → language null and NOT foreign, so the caller stays sticky', () => {
    const d = decideFinalLanguage('OK 2026')
    expect(d.language).toBeNull()
    expect(d.foreign).toBe(false)
    expect(d.basis).toBe('none')
    expect(decideFinalLanguage('')).toMatchObject({ language: null, foreign: false, basis: 'none' })
  })
})

describe('isNonSpeechAnnotation — the transcriber talking ABOUT the audio', () => {
  it('the marker is dropped in every bracket style', () => {
    expect(isNonSpeechAnnotation('（聞き取り不能）')).toBe(true)
    expect(isNonSpeechAnnotation('(inaudible)')).toBe(true)
    expect(isNonSpeechAnnotation('[音楽]')).toBe(true)
    expect(isNonSpeechAnnotation('【…】')).toBe(true)
    expect(isNonSpeechAnnotation('♪')).toBe(true)
    expect(isNonSpeechAnnotation('♪♪')).toBe(true)
  })

  it('a REAL sentence that merely CONTAINS a parenthesis is kept', () => {
    expect(isNonSpeechAnnotation('Kính thưa quý vị (đại diện Esuhai) đã có mặt')).toBe(false)
    expect(isNonSpeechAnnotation('本日(月曜日)の会議です')).toBe(false)
  })

  it('an empty string is not an annotation', () => {
    expect(isNonSpeechAnnotation('')).toBe(false)
    expect(isNonSpeechAnnotation('   ')).toBe(false)
  })
})
