import { describe, it, expect } from 'vitest'
import {
  ASR_PARTIAL_MIN_VOICED_MS,
  ASR_FINAL_MIN_VOICED_MS,
  hasClearSpeechEvidence,
  isInventedNumber,
  providerNeedsSpeechEvidence,
} from '../src/lib/lanes/online/asrSpeechEvidence'

describe('asrSpeechEvidence — voiced thresholds', () => {
  it('thresholds are the measured 96 / 160 ms', () => {
    expect(ASR_PARTIAL_MIN_VOICED_MS).toBe(96)
    expect(ASR_FINAL_MIN_VOICED_MS).toBe(160)
  })

  it('partial evidence gate: ≥96ms passes, below fails', () => {
    expect(hasClearSpeechEvidence(96, ASR_PARTIAL_MIN_VOICED_MS)).toBe(true)
    expect(hasClearSpeechEvidence(95.9, ASR_PARTIAL_MIN_VOICED_MS)).toBe(false)
    expect(hasClearSpeechEvidence(0, ASR_PARTIAL_MIN_VOICED_MS)).toBe(false)
  })

  it('final evidence gate: ≥160ms passes, below fails', () => {
    expect(hasClearSpeechEvidence(160, ASR_FINAL_MIN_VOICED_MS)).toBe(true)
    expect(hasClearSpeechEvidence(120, ASR_FINAL_MIN_VOICED_MS)).toBe(false)
  })

  it('non-finite voicedMs never passes', () => {
    expect(hasClearSpeechEvidence(Number.NaN, 0)).toBe(false)
    expect(hasClearSpeechEvidence(Number.POSITIVE_INFINITY, 160)).toBe(false)
  })

  it('qwen3 needs speech evidence', () => {
    expect(providerNeedsSpeechEvidence('qwen3')).toBe(true)
    expect(providerNeedsSpeechEvidence('other')).toBe(false)
  })
})

describe('asrSpeechEvidence — invented numbers (03/08 rehearsal)', () => {
  it('drops the six lines the 47 saved sessions actually produced', () => {
    // Every one of these was translated and read aloud to the hall.
    expect(isInventedNumber('177。')).toBe(true)                        // no letters at all
    expect(isInventedNumber('Anh 1000, anh 1000,')).toBe(true)          // "anh anh anh" collapsed
    expect(isInventedNumber('Hả? 2, 2, 2, 2,')).toBe(true)
    expect(isInventedNumber('Dạ, anh 10, 10, 10, 1')).toBe(true)
    expect(isInventedNumber('1000. 1000. 1000. 1000. 1000.')).toBe(true)
    expect(isInventedNumber('100g, 100g, 10')).toBe(true)
  })

  it('a line with digits but no letters is never a sentence', () => {
    expect(isInventedNumber('177')).toBe(true)
    expect(isInventedNumber('１０、１０')).toBe(true)
    expect(isInventedNumber('12:30')).toBe(true)
  })

  it('keeps the real amounts from the same logs', () => {
    expect(isInventedNumber('Của... 100.000 đồng.')).toBe(false)
    expect(isInventedNumber('Và tôi gửi 500.000.')).toBe(false)
    expect(isInventedNumber('Thì nó là cái... 100.000.000.000, nó sẽ học được cái gì?')).toBe(false)
    expect(isInventedNumber('Có một đàm thoại thứ hai, 120.500. Cảm ơn.')).toBe(false)
    expect(isInventedNumber('Trên, trên 93,5.')).toBe(false)
    expect(isInventedNumber('100 triệu.')).toBe(false)
  })

  it('a number repeated inside real speech is speech, not noise', () => {
    // The repeat alone must not convict — the digits have to outweigh the words too.
    expect(isInventedNumber('Ờ, thì cứ đến 30.000 là hoàn trả, 5 phút hoàn trả, 5 phút hoàn trả.')).toBe(false)
    expect(isInventedNumber('Không sao, không sao. 100% 100%.')).toBe(false)
    expect(isInventedNumber('Dạ vâng. Dạ vâng 1. Dạ cho số 3, 3.')).toBe(false)
  })

  it('a number said once is never invented, however short the line', () => {
    expect(isInventedNumber('Anh 111.')).toBe(false)
    expect(isInventedNumber('10 người.')).toBe(false)
    expect(isInventedNumber('50周年')).toBe(false)
    expect(isInventedNumber('20年')).toBe(false)
  })

  it('text with no digits, and empty text, are left alone', () => {
    expect(isInventedNumber('Xin chào quý vị.')).toBe(false)
    expect(isInventedNumber('ええと、そのテーブルです。')).toBe(false)
    expect(isInventedNumber('')).toBe(false)
    expect(isInventedNumber('   ')).toBe(false)
  })

  it('the global regexes do not carry state between calls', () => {
    // DIGITS/LETTERS/NUMBER_TOKENS are module-level and /g — the same input must answer the same twice.
    for (let i = 0; i < 3; i++) {
      expect(isInventedNumber('Anh 1000, anh 1000,')).toBe(true)
      expect(isInventedNumber('Của... 100.000 đồng.')).toBe(false)
    }
  })
})
