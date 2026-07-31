import { describe, it, expect } from 'vitest'
// @ts-expect-error — the server is plain .mjs (no types); we only exercise pure exported helpers here.
import { clipPrepDocuments, buildPrepBriefPrompt } from '../server/online-api.mjs'

// M14 "Tóm tắt bằng AI" — the one call that reads a whole event script. Both helpers are pure: the clipper
// decides what a single call is allowed to read, the prompt builder decides what it is allowed to answer.
// The ceilings below (12 documents · 12 000 chars per file · 48 000 total · 1500-char brief · 40 terms) are
// the deliberate ones from the spec, not defaults to be re-tuned by a failing test.

const PER_DOC = 12_000
const TOTAL = 48_000

describe('clipPrepDocuments — what one call is allowed to read', () => {
  it('drops empty documents and passes small ones through untouched', () => {
    const { docs, usedChars } = clipPrepDocuments([
      { name: 'trong.txt', text: '   ' },
      { name: 'kichban.docx', text: 'Lễ Kagami Biraki mở màn' },
      { name: '  ', text: 'Bài phát biểu của Chủ tịch' },
    ])
    expect(docs).toEqual([
      { name: 'kichban.docx', text: 'Lễ Kagami Biraki mở màn' },
      { name: '(không tên)', text: 'Bài phát biểu của Chủ tịch' },
    ])
    expect(usedChars).toBe('Lễ Kagami Biraki mở màn'.length + 'Bài phát biểu của Chủ tịch'.length)
  })

  it('one huge file cannot swallow the share of the others', () => {
    const { docs } = clipPrepDocuments([
      { name: 'kichban-200-trang.docx', text: 'A'.repeat(200_000) },
      { name: 'danh-sach-khach.txt', text: 'B'.repeat(500) },
    ])
    expect(docs.length).toBe(2)
    expect(docs[0].text.length).toBe(PER_DOC) // capped at its own ceiling, not at the whole budget
    expect(docs[1].text).toBe('B'.repeat(500)) // …so the small one is still read in full
  })

  it('a file shorter than its share leaves the remainder to the ones after it', () => {
    // Small ceilings so the redistribution is visible: an even share would be 100 chars each.
    const { docs, usedChars } = clipPrepDocuments(
      [
        { name: 'ngan.txt', text: 'x'.repeat(10) },
        { name: 'dai-1.txt', text: 'y'.repeat(1_000) },
        { name: 'dai-2.txt', text: 'z'.repeat(1_000) },
      ],
      { total: 300, perDoc: 1_000 },
    )
    expect(docs.map((d: { text: string }) => d.text.length)).toEqual([10, 145, 145])
    expect(usedChars).toBe(300) // the 90 chars the short file did not want went to the two after it
  })

  it('neither the per-file nor the total ceiling is ever exceeded', () => {
    const { docs, usedChars } = clipPrepDocuments(
      Array.from({ length: 12 }, (_, i) => ({ name: `d${i}.txt`, text: 'x'.repeat(100_000) })),
    )
    expect(docs.length).toBe(12)
    for (const d of docs) expect(d.text.length).toBeLessThanOrEqual(PER_DOC)
    expect(usedChars).toBeLessThanOrEqual(TOTAL)
    expect(usedChars).toBe(TOTAL) // …and the budget is fully spent, evenly (4 000 each)
    expect(new Set(docs.map((d: { text: string }) => d.text.length))).toEqual(new Set([4_000]))
  })

  it('past 12 documents only the first 12 survive', () => {
    const { docs } = clipPrepDocuments(
      Array.from({ length: 20 }, (_, i) => ({ name: `d${i}.txt`, text: `nội dung ${i}` })),
    )
    expect(docs.length).toBe(12)
    expect(docs.map((d: { name: string }) => d.name)).toEqual(Array.from({ length: 12 }, (_, i) => `d${i}.txt`))
  })

  it('null / non-array input returns empty instead of throwing', () => {
    expect(clipPrepDocuments(null)).toEqual({ docs: [], usedChars: 0 })
    expect(clipPrepDocuments(undefined)).toEqual({ docs: [], usedChars: 0 })
    expect(clipPrepDocuments('không phải mảng')).toEqual({ docs: [], usedChars: 0 })
    expect(clipPrepDocuments([null, undefined, {}, { text: 42 }])).toEqual({ docs: [], usedChars: 0 })
  })
})

const prompt = (over: Record<string, unknown> = {}) =>
  buildPrepBriefPrompt({
    sourceLanguage: 'vi',
    targetLanguage: 'ja',
    header: 'Hội nghị: Lễ 20 năm · 2026-08-08 · Hội trường A',
    docs: [{ name: 'kichban.docx', text: 'Nghi thức Kagami Biraki.' }],
    ...over,
  }) as string

describe('buildPrepBriefPrompt — what the call is allowed to answer', () => {
  it('the direction decides which side of a term line is the source', () => {
    const vi2ja = prompt({ sourceLanguage: 'vi', targetLanguage: 'ja' })
    expect(vi2ja).toContain('The session runs Vietnamese → Japanese.')
    expect(vi2ja).toContain('The left-hand side must be the Vietnamese form')
    expect(vi2ja).toContain('the Japanese form of the same name')

    const ja2vi = prompt({ sourceLanguage: 'ja', targetLanguage: 'vi' })
    expect(ja2vi).toContain('The session runs Japanese → Vietnamese.')
    expect(ja2vi).toContain('The left-hand side must be the Japanese form')
    expect(ja2vi).toContain('the Vietnamese form of the same name')
  })

  it('both ceilings — 1500 characters and 40 term lines — are stated in the prompt', () => {
    const p = prompt()
    expect(p).toContain('at most 1500 characters')
    expect(p).toContain('at most 40 lines')
  })

  it('the "never invent, keep proper nouns exactly" rules are present', () => {
    const p = prompt()
    expect(p).toContain('Keep every proper noun EXACTLY as the documents spell it.')
    expect(p).toContain('Never state a fact the documents do not contain, and never guess a date, a title or a name.')
    expect(p).toContain('Kagami Biraki (鏡開き)') // the both-forms example
    expect(p).toContain('Return JSON only with keys: brief, terms.')
  })

  it("each document's own name is attached to its text", () => {
    const p = prompt({
      docs: [
        { name: 'kichban.docx', text: 'Nghi thức Kagami Biraki.' },
        { name: 'baiphatbieu.txt', text: 'Kính thưa quý vị đại biểu.' },
      ],
    })
    expect(p).toContain('--- Document: kichban.docx ---\nNghi thức Kagami Biraki.')
    expect(p).toContain('--- Document: baiphatbieu.txt ---\nKính thưa quý vị đại biểu.')
  })

  it('an absent header adds no empty section', () => {
    const withHeader = prompt()
    expect(withHeader).toContain('What the operator already knows about this session:\nHội nghị: Lễ 20 năm · 2026-08-08 · Hội trường A')

    const without = prompt({ header: '' })
    expect(without).not.toContain('What the operator already knows')
    expect(without).not.toMatch(/\n{3}/) // no blank hole where the header would have been
    expect(prompt({ header: undefined })).toBe(without)
  })
})
