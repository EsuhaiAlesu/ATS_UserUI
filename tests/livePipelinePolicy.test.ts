import { describe, it, expect } from 'vitest'
import {
  decideDraftAdmission,
  endsOpenEnded,
  getContinuationWaitMs,
  CONTINUATION_MIN_WAIT_MS,
  CONTINUATION_MAX_WAIT_MS,
  CONTINUATION_BASE_WAIT_MS,
  CONTINUATION_OPEN_ENDED_WAIT_MS,
  CONTINUATION_SELF_CONTAINED_WAIT_MS,
  CONTINUATION_FILLER_WAIT_MS,
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

describe('livePipelinePolicy — M12: kết câu mở (endsOpenEnded)', () => {
  it('câu tiếng Việt kết ở hư từ thì chắc chắn chưa hết ý', () => {
    expect(endsOpenEnded('Chúng tôi rất vinh dự được đón tiếp và')).toBe(true)
    expect(endsOpenEnded('kết quả này là')).toBe(true)
    expect(endsOpenEnded('sẽ được trao cho')).toBe(true)
  })

  it('trợ từ và thể liên dụng tiếng Nhật đọc y như vậy', () => {
    expect(endsOpenEnded('皆様に')).toBe(true)
    expect(endsOpenEnded('ご来賓の皆様をお迎えして')).toBe(true)
    expect(endsOpenEnded('準備しましたので')).toBe(true)
    expect(endsOpenEnded('そして')).toBe(true)
  })

  it('dấu phẩy là ranh giới mệnh đề, không phải kết câu', () => {
    expect(endsOpenEnded('Kính thưa quý vị,')).toBe(true)
    expect(endsOpenEnded('第一に、')).toBe(true)
    expect(endsOpenEnded('và sau đó…')).toBe(true)
  })

  it('một mệnh đề trọn vẹn thì KHÔNG mở', () => {
    expect(endsOpenEnded('Xin chào quý vị')).toBe(false)
    expect(endsOpenEnded('Chương trình bắt đầu.')).toBe(false)
    expect(endsOpenEnded('')).toBe(false)
  })
})

describe('livePipelinePolicy — M12: cửa sổ chờ phần tiếp (getContinuationWaitMs)', () => {
  it('tiếng đệm giữ nguyên 2500ms thận trọng như cũ', () => {
    expect(getContinuationWaitMs({ text: 'à ừm' })).toBe(CONTINUATION_FILLER_WAIT_MS)
    expect(getContinuationWaitMs({ text: '' })).toBe(CONTINUATION_FILLER_WAIT_MS)
  })

  it('câu kết mở chờ lâu nhất; câu chưa xong bình thường chờ mức nền', () => {
    expect(getContinuationWaitMs({ text: 'Chúng tôi rất vinh dự được đón tiếp và' })).toBe(CONTINUATION_OPEN_ENDED_WAIT_MS)
    expect(getContinuationWaitMs({ text: 'nó tốt' })).toBe(CONTINUATION_BASE_WAIT_MS)
  })

  it('lời chào hoặc thuật ngữ của phiên tự đứng một mình → chờ ít nhất', () => {
    expect(getContinuationWaitMs({ text: 'xin chào' })).toBe(CONTINUATION_SELF_CONTAINED_WAIT_MS)
    expect(getContinuationWaitMs({ text: 'Chào Esuhai', sessionTerms: 'Esuhai => エスハイ' })).toBe(CONTINUATION_SELF_CONTAINED_WAIT_MS)
  })

  it('lời chào NHƯNG kết mở thì vẫn giữ cửa sổ dài — câu mới chỉ vừa bắt đầu', () => {
    expect(getContinuationWaitMs({ text: 'Kính thưa quý vị,' })).toBe(CONTINUATION_OPEN_ENDED_WAIT_MS)
  })

  it('nhịp nói kéo dãn cửa sổ cho người nói chậm và thu hẹp cho người nói nhanh', () => {
    const base = getContinuationWaitMs({ text: 'nó tốt' })
    const slow = getContinuationWaitMs({ text: 'nó tốt', unitsPerSecond: 2 })
    const fast = getContinuationWaitMs({ text: 'nó tốt', unitsPerSecond: 6 })
    expect(slow).toBeGreaterThan(base)
    expect(fast).toBeLessThan(base)
    expect(slow).toBe(Math.round(CONTINUATION_BASE_WAIT_MS * 1.5)) // 3/2 = 1.5, trong biên
    expect(fast).toBe(Math.round(CONTINUATION_BASE_WAIT_MS * 0.6)) // 3/6 = 0.5 → chặn ở 0.6
  })

  it('cửa sổ luôn nằm trong khoảng 0,4–1,2 s mà hội trường chịu được', () => {
    const texts = ['nó tốt', 'xin chào', 'Kính thưa quý vị,', 'Chúng tôi rất vinh dự được đón tiếp và', '皆様に']
    for (const text of texts) {
      for (const unitsPerSecond of [undefined, 0.5, 2, 3, 6, 12]) {
        const wait = getContinuationWaitMs({ text, unitsPerSecond })
        expect(wait).toBeGreaterThanOrEqual(CONTINUATION_MIN_WAIT_MS)
        expect(wait).toBeLessThanOrEqual(CONTINUATION_MAX_WAIT_MS)
      }
    }
  })
})
