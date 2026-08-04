import { describe, it, expect } from 'vitest'
import { buildSessionExport, type SessionLine } from '../src/lib/lanes/online/sessionExport'

describe('sessionExport.buildSessionExport', () => {
  const started = new Date(2026, 6, 23, 9, 8, 7).getTime() // 2026-07-23 09:08:07 local
  const at1 = new Date(2026, 6, 23, 9, 8, 30).getTime()
  const lines: SessionLine[] = [
    // TASK 14: `dir` is part of every line now, so the fixture has to say it; the second line also carries
    // the script flag so the new last column has something to show.
    { lid: 'online-1', at: at1, sourceText: 'Chi phí là 10.000 yên.', targetText: '費用は1万円です。', sourceLanguage: 'vi', targetLanguage: 'ja', dir: 'vi2ja' },
    { lid: 'online-2', at: at1 + 5000, sourceText: 'A | B\nC', targetText: 'x', sourceLanguage: 'vi', targetLanguage: 'ja', dir: 'vi2ja', fromScript: true },
  ]
  const exp = buildSessionExport(lines, { startedAt: started, endedAt: at1 + 9000, sourceLanguage: 'vi', targetLanguage: 'ja' })

  it('filename derives from the SESSION START time (stable for overwrite)', () => {
    expect(exp.filename).toBe('online_20260723-090807')
  })

  it('md is a table with dir + script columns, HH:mm:ss, and escapes | + collapses newlines', () => {
    expect(exp.md.startsWith('| Time | Dir | Source | Translation | Script |\n| --- | --- | --- | --- | --- |')).toBe(true)
    expect(exp.md).toContain('| 09:08:30 | vi2ja |') // TASK 14: the direction sits between time and source
    expect(exp.md).toContain('| kịch bản |') // TASK 14: the script-answered line is marked as such
    expect(exp.md).toContain('A \\| B C') // pipe escaped, newline collapsed to a space
    expect(exp.md).not.toContain('A | B\nC')
  })

  it('json has ISO timestamps, langs, and all lines', () => {
    const parsed = JSON.parse(exp.json)
    expect(typeof parsed.startedAt).toBe('string')
    expect(parsed.startedAt).toContain('T')
    expect([parsed.sourceLanguage, parsed.targetLanguage]).toEqual(['vi', 'ja'])
    expect(parsed.lines).toHaveLength(2)
  })
})
