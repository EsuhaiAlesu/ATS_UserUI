import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GlossaryEntry } from '../src/lib/api'
import type { Conference } from '../src/lib/schedule'

// Isolate collectPrepPack from the four Chuẩn bị stores (no localStorage, no /api). vi.hoisted lets the
// mock factories reference these fns despite hoisting.
const h = vi.hoisted(() => ({
  glossary: vi.fn<() => Promise<unknown>>(),
  speakers: vi.fn<() => unknown>(),
  findSpeaker: vi.fn<(n: string) => unknown>(),
  script: vi.fn<(id: string) => unknown>(),
  readiness: vi.fn<(rows: unknown) => unknown>(),
}))
vi.mock('../src/lib/api', () => ({ getGlossary: h.glossary }))
vi.mock('../src/lib/speakers', () => ({ getSpeakers: h.speakers, findSpeakerByName: h.findSpeaker }))
vi.mock('../src/lib/script', () => ({ getScriptLocal: h.script, readiness: h.readiness }))

import { collectPrepPack, PREP_MAX_TERM_LINES } from '../src/lib/prepData'

const conf = (over: Partial<Conference> = {}): Conference => ({
  id: 'c1', title: 'Lễ 20 năm', date: '2026-08-08', startTime: '09:00', endTime: '11:00', booker: 'x',
  venue: 'Hội trường A', agenda: 'Khai mạc · Vinh danh', speakers: [], createdAt: '', ...over,
})
const gloss = (g: GlossaryEntry[]) => h.glossary.mockResolvedValue(g)

beforeEach(() => {
  h.glossary.mockReset(); h.speakers.mockReset(); h.findSpeaker.mockReset(); h.script.mockReset(); h.readiness.mockReset()
  h.glossary.mockResolvedValue([]); h.speakers.mockReturnValue([]); h.findSpeaker.mockReturnValue(undefined)
  h.script.mockReturnValue([]); h.readiness.mockReturnValue({ approved: 0 })
})

describe('collectPrepPack', () => {
  it('the session direction decides the left side of each glossary line', async () => {
    gloss([{ vi: 'công ty', ja: '会社' }])
    expect((await collectPrepPack(conf(), 'vi2ja')).terms).toBe('công ty = 会社')
    expect((await collectPrepPack(conf(), 'ja2vi')).terms).toBe('会社 = công ty')
  })

  it('speaker names are bare lines and aliases become `alias = name`', async () => {
    h.speakers.mockReturnValue([{ name: 'Ông Suzuki', aliases: ['ông su zu ki', 'suzuki'] }])
    const lines = (await collectPrepPack(conf(), 'vi2ja')).terms.split('\n')
    expect(lines).toContain('Ông Suzuki')
    expect(lines).toContain('ông su zu ki = Ông Suzuki')
    expect(lines).toContain('suzuki = Ông Suzuki')
  })

  it('ranks hotwords/names first, truncates to 40 lines and reports the dropped count', async () => {
    const g: GlossaryEntry[] = []
    for (let i = 0; i < 50; i++) g.push({ vi: `term${i}`, ja: `t${i}` }) // rank 2
    g.push({ vi: 'HOT', ja: '', asr_hotword: true })                     // rank 0
    gloss(g)
    const p = await collectPrepPack(conf(), 'vi2ja')
    const lines = p.terms.split('\n')
    expect(lines.length).toBe(PREP_MAX_TERM_LINES) // 40
    expect(lines[0]).toBe('HOT')                   // rank 0 takes the first slot
    expect(p.stats.termLines).toBe(40)
    expect(p.stats.dropped).toBe(51 - PREP_MAX_TERM_LINES) // 11
  })

  it('de-duplicates case-insensitively, keeping the most important rank', async () => {
    gloss([{ vi: 'Esuhai', ja: 'エスハイ', asr_hotword: true }])
    h.speakers.mockReturnValue([{ name: 'esuhai', aliases: [] }])
    const hits = (await collectPrepPack(conf(), 'vi2ja')).terms.split('\n').filter((l) => l.toLowerCase().startsWith('esuhai'))
    expect(hits).toEqual(['Esuhai'])
  })

  it('still returns a usable pack when the glossary fetch rejects', async () => {
    h.glossary.mockRejectedValue(new Error('/api down'))
    h.speakers.mockReturnValue([{ name: 'Ông A', aliases: [] }])
    const p = await collectPrepPack(conf(), 'vi2ja')
    expect(p.glossaryReachable).toBe(false)
    expect(p.stats.glossary).toBe(0)
    expect(p.terms).toContain('Ông A') // roster still contributes
  })

  it('builds the brief from the active conference', async () => {
    h.readiness.mockReturnValue({ approved: 3 })
    const p = await collectPrepPack(conf({ speakers: [{ id: 's1', name: 'Ông A', role: 'CEO' }] }), 'vi2ja')
    expect(p.brief).toContain('Hội nghị: Lễ 20 năm · 2026-08-08 · Hội trường A')
    expect(p.brief).toContain('Nội dung: Khai mạc · Vinh danh')
    expect(p.brief).toContain('- Ông A (CEO)')
    expect(p.stats.scriptApproved).toBe(3)
  })
})
