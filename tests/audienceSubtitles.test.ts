import { describe, it, expect } from 'vitest'
import { buildParagraphs, appendedTail, subtitleEmptyState, clampSubtitleFont, SUBTITLE_FONT, languageThread } from '../src/lib/audienceSubtitles'
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

// The two-way wall splits by LANGUAGE, not by direction: each half is the WHOLE conversation in one
// language, so a Vietnamese reader still sees the Vietnamese that was actually spoken in the hall.
describe('languageThread', () => {
  // A Vietnamese speaker (vi2ja) and a Japanese speaker (ja2vi), one turn each.
  const viTurn = L({ lid: 'vi-1', dir: 'vi2ja', sourceText: 'Xin chào quý vị', targetText: '皆様、こんにちは', at: 0 })
  const jaTurn = L({ lid: 'ja-1', dir: 'ja2vi', sourceText: 'ようこそ', targetText: 'Chào mừng', at: 1000 })

  it('the Vietnamese panel carries BOTH the Vietnamese spoken and the Vietnamese translated from Japanese', () => {
    const vi = languageThread([viTurn, jaTurn], 'vi')
    expect(vi.map((l) => l.targetText)).toEqual(['Xin chào quý vị', 'Chào mừng'])
    // every line in this panel now reads as "into Vietnamese", so the renderer picks the Vietnamese face
    expect(vi.every((l) => l.dir === 'ja2vi')).toBe(true)
  })

  it('the Japanese panel likewise carries the Japanese spoken and the Japanese translated from Vietnamese', () => {
    const ja = languageThread([viTurn, jaTurn], 'ja')
    expect(ja.map((l) => l.targetText)).toEqual(['皆様、こんにちは', 'ようこそ'])
    expect(ja.every((l) => l.dir === 'vi2ja')).toBe(true)
  })

  it('the spoken order is preserved and never re-sorted, even when the timestamps are not increasing', () => {
    const lines = [
      L({ lid: 'a', dir: 'ja2vi', sourceText: 'いち', targetText: 'Một', at: 9000 }),
      L({ lid: 'b', dir: 'vi2ja', sourceText: 'Hai', targetText: 'に', at: 200 }),
      L({ lid: 'c', dir: 'ja2vi', sourceText: 'さん', targetText: 'Ba', at: 5000 }),
    ]
    expect(languageThread(lines, 'vi').map((l) => l.lid)).toEqual(['a', 'b', 'c'])
    expect(languageThread(lines, 'ja').map((l) => l.lid)).toEqual(['a', 'b', 'c'])
  })

  it('every sentence appears exactly once in each panel', () => {
    const lines = [viTurn, jaTurn, L({ lid: 'vi-2', dir: 'vi2ja', sourceText: 'Cảm ơn', targetText: 'ありがとう', at: 2000 })]
    for (const lang of ['vi', 'ja'] as const) {
      const lids = languageThread(lines, lang).map((l) => l.lid)
      expect(lids.length).toBe(lines.length)
      expect(new Set(lids).size).toBe(lines.length)
    }
  })

  it('a line still being translated shows in the panel of the language being SPOKEN', () => {
    const pending = L({ lid: 'p', dir: 'vi2ja', sourceText: 'Kính thưa quý vị', targetText: '', at: 0 })
    expect(languageThread([pending], 'vi').map((l) => l.targetText)).toEqual(['Kính thưa quý vị'])
    expect(languageThread([pending], 'ja')).toEqual([]) // nothing to read in Japanese yet
  })

  it('does not mutate the caller’s array or its lines', () => {
    const lines = [viTurn, jaTurn]
    const before = JSON.parse(JSON.stringify(lines))
    languageThread(lines, 'vi')
    languageThread(lines, 'ja')
    expect(lines.length).toBe(2)
    expect(JSON.parse(JSON.stringify(lines))).toEqual(before)
  })
})
