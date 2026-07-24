import { describe, it, expect } from 'vitest'
import {
  decideDraftAdmission,
  getAdaptiveShortUtteranceFlushDelay,
  DRAFT_MAX_REQUESTS_PER_MINUTE,
  DRAFT_COMMA_RESERVED_REQUESTS,
} from '../src/lib/lanes/online/livePipelinePolicy'

const input = (o: Partial<Parameters<typeof decideDraftAdmission>[0]>) => ({
  commaFinal: false,
  inFlightCount: 0,
  duplicateInFlight: false,
  requestsInWindow: 0,
  ...o,
})

describe('livePipelinePolicy — draft admission', () => {
  it('duplicate in-flight is denied first', () => {
    expect(decideDraftAdmission(input({ duplicateInFlight: true }))).toEqual({ allow: false, reason: 'duplicate' })
  })

  it('ordinary drafts stop at 30-6=24/min, comma-final may use the full 30', () => {
    expect(DRAFT_MAX_REQUESTS_PER_MINUTE - DRAFT_COMMA_RESERVED_REQUESTS).toBe(24)
    expect(decideDraftAdmission(input({ requestsInWindow: 23 }))).toEqual({ allow: true })
    expect(decideDraftAdmission(input({ requestsInWindow: 24 }))).toEqual({ allow: false, reason: 'rate-limit' })
    expect(decideDraftAdmission(input({ commaFinal: true, requestsInWindow: 24 }))).toEqual({ allow: true })
    expect(decideDraftAdmission(input({ commaFinal: true, requestsInWindow: 30 }))).toEqual({ allow: false, reason: 'rate-limit' })
  })

  it('concurrency: ordinary single-flight, comma up to 2', () => {
    expect(decideDraftAdmission(input({ inFlightCount: 1 }))).toEqual({ allow: false, reason: 'in-flight' })
    expect(decideDraftAdmission(input({ commaFinal: true, inFlightCount: 1 }))).toEqual({ allow: true })
    expect(decideDraftAdmission(input({ commaFinal: true, inFlightCount: 2 }))).toEqual({ allow: false, reason: 'in-flight' })
  })
})

describe('livePipelinePolicy — adaptive flush delay', () => {
  it('fillers keep the conservative 2500ms', () => {
    expect(getAdaptiveShortUtteranceFlushDelay({ text: 'à ừm' })).toBe(2500)
  })
  it('punctuated / session-term / ceremony → 850ms', () => {
    expect(getAdaptiveShortUtteranceFlushDelay({ text: 'Kính thưa quý vị,' })).toBe(850)
    expect(getAdaptiveShortUtteranceFlushDelay({ text: 'Chào Esuhai', sessionTerms: 'Esuhai => エスハイ' })).toBe(850)
    expect(getAdaptiveShortUtteranceFlushDelay({ text: 'xin chào' })).toBe(850)
  })
  it('≥18 chars or ≥4 units → 1100ms, else short → 1500ms', () => {
    expect(getAdaptiveShortUtteranceFlushDelay({ text: 'chúng ta bắt đầu ngay bây' })).toBe(1100)
    expect(getAdaptiveShortUtteranceFlushDelay({ text: 'nó tốt' })).toBe(1500)
  })
})
