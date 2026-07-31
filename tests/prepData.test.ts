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

// M14 — the document shelf and the AI summary. `docs` is mocked one level BELOW kbscope on purpose: the
// real kbScopeId still resolves the scope, so "a session in a series reads the series' store" is a real
// assertion about the argument `getDocs` is called with, not about a stub. Defaults match what the node
// environment produced before (no localStorage → empty shelf, no summary), so the group above is unchanged.
const h14 = vi.hoisted(() => ({
  docs: vi.fn<(scope: string) => unknown>(() => []),
  summary: vi.fn<(scope: string, dir: string) => unknown>(),
}))
vi.mock('../src/lib/docs', () => ({ getDocs: h14.docs }))
vi.mock('../src/lib/prepSummary', () => ({ getPrepSummary: h14.summary }))

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

// ── M14 ───────────────────────────────────────────────────────────────────────────────────────────────
const BRIEF_MAX_CHARS = 1500
const doc = (name: string, text: string) => ({ name, text })
const resetM14 = () => {
  h14.docs.mockReset(); h14.docs.mockReturnValue([])
  h14.summary.mockReset(); h14.summary.mockReturnValue(undefined)
}

describe('collectPrepPack — M14: tài liệu vào Bối cảnh', () => {
  beforeEach(resetM14)

  it('lists the file names and counts them', async () => {
    h14.docs.mockReturnValue([doc('kichban-gala.docx', 'x'.repeat(600)), doc('bai-phat-bieu.txt', 'y'.repeat(600))])
    const p = await collectPrepPack(conf(), 'vi2ja')
    expect(p.brief).toContain('Tài liệu: kichban-gala.docx · bai-phat-bieu.txt')
    expect(p.stats.documents).toBe(2)
  })

  it('carries the OPENING of each document — that is where the subject is', async () => {
    h14.docs.mockReturnValue([doc('kichban.docx', `MODAU Nghi thức Kagami Biraki. ${'x'.repeat(4000)} KETTHUC`)])
    const p = await collectPrepPack(conf(), 'vi2ja')
    expect(p.brief).toContain('- kichban.docx: MODAU Nghi thức Kagami Biraki.')
    expect(p.brief).not.toContain('KETTHUC') // the tail is stage directions the model cannot use
  })

  it('flattens a document onto one line', async () => {
    h14.docs.mockReturnValue([doc('kichban.docx', `Dòng một\nDòng hai\r\n\tDòng ba\n${'x'.repeat(300)}`)])
    const p = await collectPrepPack(conf(), 'vi2ja')
    expect(p.brief).toContain('- kichban.docx: Dòng một Dòng hai Dòng ba')
    expect(p.brief.split('\n').filter((l) => l.startsWith('- kichban.docx: ')).length).toBe(1)
  })

  it('skips a document too short to be context rather than tearing it', async () => {
    h14.docs.mockReturnValue([doc('ngan.txt', 'Chỉ một câu ngắn.'), doc('dai.docx', `DAIDAI ${'y'.repeat(2000)}`)])
    const p = await collectPrepPack(conf(), 'vi2ja')
    expect(p.brief).toContain('Tài liệu: ngan.txt · dai.docx') // still named…
    expect(p.brief).not.toContain('- ngan.txt:')                // …but never quoted as a torn phrase
    expect(p.brief).not.toContain('Chỉ một câu ngắn.')
    expect(p.brief).toContain('- dai.docx: DAIDAI')
    expect(p.stats.documents).toBe(2)
  })

  it('never crowds out the conference header or the speakers, and never exceeds 1500 chars', async () => {
    h14.docs.mockReturnValue(Array.from({ length: 3 }, (_, i) => doc(`d${i}.docx`, 'z'.repeat(100_000))))
    const p = await collectPrepPack(conf({ speakers: [{ id: 's1', name: 'Ông A', role: 'CEO' }] }), 'vi2ja')
    expect(p.brief.length).toBeLessThanOrEqual(BRIEF_MAX_CHARS)
    expect(p.brief.startsWith('Hội nghị: Lễ 20 năm · 2026-08-08 · Hội trường A')).toBe(true)
    expect(p.brief).toContain('Người phát biểu:')
    expect(p.brief).toContain('- Ông A (CEO)')
    expect(p.brief).toContain('Tài liệu: d0.docx · d1.docx · d2.docx')
    // …and the three files really did spend the leftover budget (an even share each), so the ceiling
    // above is a real limit being respected, not an empty brief passing by default.
    for (const i of [0, 1, 2]) expect(p.brief).toContain(`- d${i}.docx: zzz`)
    expect(p.brief.length).toBeGreaterThan(1000)
  })

  it("a session belonging to a series reads the SERIES' store, not the event's own", async () => {
    h14.docs.mockReturnValue([doc('kho-chuoi.docx', 'w'.repeat(600))])
    const p = await collectPrepPack(conf({ id: 'c9', seriesId: 's1' }), 'vi2ja')
    expect(h14.docs).toHaveBeenCalledWith('series:s1')
    expect(h14.docs).not.toHaveBeenCalledWith('c9')
    expect(p.brief).toContain('Tài liệu: kho-chuoi.docx')
  })

  it('a broken document store costs nothing', async () => {
    h14.docs.mockImplementation(() => { throw new Error('localStorage hỏng') })
    const p = await collectPrepPack(conf(), 'vi2ja')
    expect(p.stats.documents).toBe(0)
    expect(p.brief).toContain('Hội nghị: Lễ 20 năm')
    expect(p.brief).not.toContain('Tài liệu:')
  })
})

describe('collectPrepPack — M14: bản tóm tắt của AI', () => {
  beforeEach(resetM14)

  const summary = (over: Record<string, unknown> = {}) =>
    h14.summary.mockReturnValue({
      brief: 'Lễ 20 năm Esuhai. Mở màn bằng nghi thức Kagami Biraki (鏡開き).',
      terms: [], dir: 'vi2ja', docNames: [], usedChars: 0, at: '2026-07-01T00:00:00.000Z', ...over,
    })

  it('when one exists it becomes the brief and the mechanical build is skipped', async () => {
    h14.docs.mockReturnValue([doc('kichban.docx', 'x'.repeat(2000))])
    summary()
    const p = await collectPrepPack(conf({ speakers: [{ id: 's1', name: 'Ông A', role: 'CEO' }] }), 'vi2ja')
    expect(p.brief).toBe('Lễ 20 năm Esuhai. Mở màn bằng nghi thức Kagami Biraki (鏡開き).')
    expect(p.stats.aiBrief).toBe(true)
    expect(p.brief).not.toContain('Hội nghị:')
    expect(p.brief).not.toContain('Tài liệu:')
    expect(p.stats.documents).toBe(1) // …but the shelf is still counted for the operator
  })

  it('without one, nothing changes', async () => {
    h14.docs.mockReturnValue([doc('kichban.docx', 'x'.repeat(2000))])
    const p = await collectPrepPack(conf(), 'vi2ja')
    expect(p.stats.aiBrief).toBe(false)
    expect(p.stats.aiTerms).toBe(0)
    expect(p.brief).toContain('Hội nghị: Lễ 20 năm')
    expect(p.brief).toContain('- kichban.docx: ')
  })

  it("the scope resolution matches the documents'", async () => {
    summary()
    await collectPrepPack(conf({ id: 'c9', seriesId: 's1' }), 'ja2vi')
    expect(h14.summary).toHaveBeenCalledWith('series:s1', 'ja2vi')
    expect(h14.docs).toHaveBeenCalledWith('series:s1')

    h14.summary.mockClear(); h14.docs.mockClear()
    await collectPrepPack(conf({ id: 'c1' }), 'vi2ja')
    expect(h14.summary).toHaveBeenCalledWith('c1', 'vi2ja')
    expect(h14.docs).toHaveBeenCalledWith('c1')
  })

  it('AI terms are added and counted separately', async () => {
    summary({ terms: ['Kagami Biraki = 鏡開き', 'Ikusei Shuro'] })
    const p = await collectPrepPack(conf(), 'vi2ja')
    expect(p.terms.split('\n')).toEqual(['Kagami Biraki = 鏡開き', 'Ikusei Shuro'])
    expect(p.stats.aiTerms).toBe(2)
    expect(p.stats.termLines).toBe(2)
    expect(p.stats.glossary).toBe(0)
  })

  it('they rank AFTER the curated glossary and the speaker roster', async () => {
    gloss([{ vi: 'công ty', ja: '会社' }])
    h.speakers.mockReturnValue([{ name: 'Ông A', aliases: [] }])
    summary({ terms: ['Sếp lớn'] })
    const p = await collectPrepPack(conf(), 'vi2ja')
    expect(p.terms.split('\n')).toEqual(['Ông A', 'công ty = 会社', 'Sếp lớn'])
    expect(p.stats.aiTerms).toBe(1)
  })

  it('an AI term duplicating a glossary entry loses to the curated one', async () => {
    gloss([{ vi: 'Esuhai', ja: 'エスハイ' }])
    summary({ terms: ['esuhai = ESUHAI Co., Ltd.'] })
    const p = await collectPrepPack(conf(), 'vi2ja')
    expect(p.terms.split('\n')).toEqual(['Esuhai = エスハイ'])
    expect(p.stats.aiTerms).toBe(0)
  })

  it('when the 40-line budget runs out it is the AI terms that are dropped, never the glossary', async () => {
    gloss(Array.from({ length: PREP_MAX_TERM_LINES }, (_, i) => ({ vi: `t${i}`, ja: `j${i}` })))
    summary({ terms: Array.from({ length: 5 }, (_, i) => `AI${i}`) })
    const p = await collectPrepPack(conf(), 'vi2ja')
    const lines = p.terms.split('\n')
    expect(lines.length).toBe(PREP_MAX_TERM_LINES)
    expect(lines.every((l) => l.startsWith('t'))).toBe(true)
    expect(p.terms).not.toContain('AI0')
    expect(p.stats.aiTerms).toBe(0)
    expect(p.stats.dropped).toBe(5)
  })

  it('an over-long AI brief is still cut to 1500 chars', async () => {
    summary({ brief: 'A'.repeat(2000) })
    const p = await collectPrepPack(conf(), 'vi2ja')
    expect(p.brief.length).toBe(BRIEF_MAX_CHARS)
    expect(p.stats.aiBrief).toBe(true)
  })

  it('a corrupt summary store behaves as "no summary"', async () => {
    h14.summary.mockImplementation(() => { throw new Error('JSON hỏng') })
    const p = await collectPrepPack(conf(), 'vi2ja')
    expect(p.stats.aiBrief).toBe(false)
    expect(p.stats.aiTerms).toBe(0)
    expect(p.brief).toContain('Hội nghị: Lễ 20 năm')
  })
})
