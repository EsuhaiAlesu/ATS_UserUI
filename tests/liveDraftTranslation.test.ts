import { describe, it, expect } from 'vitest'
import {
  joinLiveDraftSource,
  isStableDraftPrefix,
  stripPromotedPrefix,
} from '../src/lib/lanes/online/liveDraftTranslation'

describe('liveDraftTranslation', () => {
  it('joinLiveDraftSource trims + joins with one space', () => {
    expect(joinLiveDraftSource('  Xin chào ', ' các bạn ')).toBe('Xin chào các bạn')
    expect(joinLiveDraftSource('', 'abc')).toBe('abc')
    expect(joinLiveDraftSource('abc', '')).toBe('abc')
  })

  it('isStableDraftPrefix requires a boundary after the candidate', () => {
    expect(isStableDraftPrefix('xin chào', 'xin chào')).toBe(true) // equal
    expect(isStableDraftPrefix('xin chào các', 'xin chào')).toBe(true) // space boundary
    expect(isStableDraftPrefix('xin chàoo', 'xin chào')).toBe(false) // mid-word extension
    expect(isStableDraftPrefix('xin biệt', 'xin chào')).toBe(false) // revised
  })

  it('stripPromotedPrefix — exact / regressed(covered) / revised', () => {
    expect(stripPromotedPrefix('xin chào các bạn', 'xin chào')).toEqual({ text: 'các bạn', matched: true, coveredByPromoted: false })
    expect(stripPromotedPrefix('xin', 'xin chào')).toEqual({ text: '', matched: true, coveredByPromoted: true })
    expect(stripPromotedPrefix('xin biệt', 'xin chào')).toEqual({ text: 'xin biệt', matched: false, coveredByPromoted: false })
    expect(stripPromotedPrefix('bất kỳ', '')).toEqual({ text: 'bất kỳ', matched: false, coveredByPromoted: false })
  })
})
