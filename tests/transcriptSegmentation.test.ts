import { describe, it, expect } from 'vitest'
import {
  endsWithStrongSentenceBreak,
  findLastStrongSentenceBreak,
  isNumericSeparator,
  findFirstCommaClauseBreak,
} from '../src/lib/lanes/online/transcriptSegmentation'

describe('transcriptSegmentation — number-safe breaks', () => {
  const S = 'Chi phí là 10.000 yên.'

  it('the final period IS a sentence break', () => {
    expect(endsWithStrongSentenceBreak(S, true)).toBe(true)
    expect(findLastStrongSentenceBreak(S, true)).toBe(S.length)
  })

  it('a dot inside 10.000 is NOT a break', () => {
    expect(findLastStrongSentenceBreak('Chi phí là 10.000', true)).toBe(0)
    expect(isNumericSeparator('10.000', 2)).toBe(true)
  })

  it('100.000.000 — both dots are numeric', () => {
    expect(findLastStrongSentenceBreak('Tổng 100.000.000', true)).toBe(0)
  })

  it('a real period after a number word still breaks', () => {
    expect(findLastStrongSentenceBreak('Giá 3,14 xong.', true)).toBe('Giá 3,14 xong.'.length)
  })

  it('a comma inside 3,14 is not a clause break', () => {
    expect(findFirstCommaClauseBreak('3,14 kg')).toBe(0)
  })

  it('a >120 cut lands on the last real break, never inside a number', () => {
    const long = 'A'.repeat(50) + '. ' + 'giá 10.000 và ' + 'D'.repeat(80)
    // period at index 50 → break at 51 (right after it), not inside 10.000
    expect(findLastStrongSentenceBreak(long, true)).toBe(51)
  })

  it('strong breaks: 。！？!? finalize', () => {
    expect(endsWithStrongSentenceBreak('終わりです。', true)).toBe(true)
    expect(endsWithStrongSentenceBreak('本当ですか？', true)).toBe(true)
    expect(endsWithStrongSentenceBreak('chưa xong', true)).toBe(false)
  })
})
