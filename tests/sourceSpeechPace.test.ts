import { describe, it, expect } from 'vitest'
import { estimateSourceSpeechPace } from '../src/lib/lanes/online/sourceSpeechPace'

describe('sourceSpeechPace', () => {
  it('undefined when too short or too few units', () => {
    expect(estimateSourceSpeechPace('a b', 400)).toBeUndefined() // duration < 500
    expect(estimateSourceSpeechPace('một hai', 2000)).toBeUndefined() // < 3 units
  })

  it('labels by units/second thresholds (2.3 / 3.6 / 4.8)', () => {
    expect(estimateSourceSpeechPace('một hai ba bốn năm sáu', 3000)?.label).toBe('slow') // 6/3 = 2.0
    expect(estimateSourceSpeechPace('một hai ba bốn năm sáu', 2000)?.label).toBe('normal') // 6/2 = 3.0
    expect(estimateSourceSpeechPace('a b c d e f g h i', 2000)?.label).toBe('fast') // 9/2 = 4.5
    expect(estimateSourceSpeechPace('a b c d e f g h i j k l', 2000)?.label).toBe('very_fast') // 12/2 = 6.0
  })

  it('confidence is clamped to [0.2, 1]', () => {
    const pace = estimateSourceSpeechPace('một hai ba bốn năm sáu', 2000)
    expect(pace!.confidence).toBeGreaterThanOrEqual(0.2)
    expect(pace!.confidence).toBeLessThanOrEqual(1)
  })
})
