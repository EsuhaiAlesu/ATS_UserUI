import { describe, it, expect } from 'vitest'
import {
  ASR_PARTIAL_MIN_VOICED_MS,
  ASR_FINAL_MIN_VOICED_MS,
  hasClearSpeechEvidence,
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
