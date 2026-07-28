import { describe, it, expect } from 'vitest'
import { buildParagraphs, appendedTail, subtitleEmptyState, clampSubtitleFont, SUBTITLE_FONT } from '../src/lib/audienceSubtitles'
import type { AudienceLine } from '../src/lib/audienceChannel'

const L = (over: Partial<AudienceLine> = {}): AudienceLine =>
  ({ lid: 'x', sourceText: 'src', targetText: 'dst', interim: false, corrected: false, at: 0, dir: 'ja2vi', ...over })

describe('buildParagraphs', () => {
  it('merges two utterances within 7s, same direction', () => {
    const p = buildParagraphs([L({ lid: 'a', targetText: 'Xin chào', at: 0 }), L({ lid: 'b', targetText: 'quý vị', at: 5000 })])
    expect(p.length).toBe(1)
    expect(p[0].stable).toBe('Xin chào quý vị')
  })

  it('splits when the gap exceeds 7s', () => {
    expect(buildParagraphs([L({ lid: 'a', targetText: 'A', at: 0 }), L({ lid: 'b', targetText: 'B', at: 8000 })]).length).toBe(2)
  })

  it('splits on a direction change', () => {
    expect(buildParagraphs([L({ lid: 'a', targetText: 'A', at: 0, dir: 'ja2vi' }), L({ lid: 'b', targetText: '日本', at: 1000, dir: 'vi2ja' })]).length).toBe(2)
  })

  it('splits when the merged translation reaches 200 chars', () => {
    const long = 'x'.repeat(150)
    expect(buildParagraphs([L({ lid: 'a', targetText: long, at: 0 }), L({ lid: 'b', targetText: long, at: 1000 })]).length).toBe(2)
  })

  it('drops untranslated lines (empty targetText)', () => {
    const p = buildParagraphs([L({ lid: 'a', targetText: '' }), L({ lid: 'b', targetText: 'có' })])
    expect(p.length).toBe(1)
    expect(p[0].stable).toBe('có')
  })

  it('joins Japanese with no space, Vietnamese with a space', () => {
    const ja = buildParagraphs([L({ lid: 'a', targetText: 'こんにちは', at: 0, dir: 'vi2ja' }), L({ lid: 'b', targetText: '皆さん', at: 1000, dir: 'vi2ja' })])
    expect(ja[0].stable).toBe('こんにちは皆さん')
    expect(ja[0].lang).toBe('ja')
    const vi = buildParagraphs([L({ lid: 'a', targetText: 'Xin', at: 0 }), L({ lid: 'b', targetText: 'chào', at: 1000 })])
    expect(vi[0].stable).toBe('Xin chào')
  })

  it('an interim tail becomes volatile, not stable', () => {
    const p = buildParagraphs([L({ lid: 'a', targetText: 'Đang', at: 0, interim: true })])
    expect(p[0].stable).toBe('')
    expect(p[0].volatile).toBe('Đang')
  })

  it('marks only the last paragraph live', () => {
    const p = buildParagraphs([L({ lid: 'a', targetText: 'A', at: 0 }), L({ lid: 'b', targetText: 'B', at: 9000 })])
    expect(p[0].live).toBe(false)
    expect(p[1].live).toBe(true)
  })
})

describe('appendedTail', () => {
  it('returns only the appended chars when extended', () => expect(appendedTail('Xin ch', 'Xin chào')).toBe('ào'))
  it('returns the whole text when rewritten', () => expect(appendedTail('Xin chào', 'Chào quý vị')).toBe('Chào quý vị'))
})

describe('subtitleEmptyState', () => {
  it("'listening' when nothing has arrived", () => expect(subtitleEmptyState([])).toBe('listening'))
  it("'translating' when utterances exist but none is translated", () => expect(subtitleEmptyState([L({ targetText: '' })])).toBe('translating'))
  it('null once something is translated', () => expect(subtitleEmptyState([L({ targetText: 'ok' })])).toBeNull())
})

describe('clampSubtitleFont', () => {
  it('clamps into range and rounds', () => {
    expect(clampSubtitleFont(5)).toBe(SUBTITLE_FONT.min)
    expect(clampSubtitleFont(999)).toBe(SUBTITLE_FONT.max)
    expect(clampSubtitleFont(18.6)).toBe(19)
  })
})
