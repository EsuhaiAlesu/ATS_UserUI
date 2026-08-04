import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { formatMishearingRules, type MishearingRule } from '../src/lib/lanes/online/mishearing'

// TASK 5 — the parser is only half the job. These pin WHERE the correction runs: on arrival, before every
// guard, from a getter that is read live; never in the ASR keyterm list; and again on the server as the
// model's backstop. A correct parser wired to the wrong place is exactly the failure of 01/08/2026, where
// the glossary was loaded and the company's own name still went out wrong.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const LANE = 'src/lib/lanes/online/onlineLane.ts'

/** The body of a lane-local `function name(` — from its own `function` keyword to the next `\n  }`. */
const bodyOf = (src: string, name: string): string => {
  const from = src.indexOf(`function ${name}`)
  expect(from).toBeGreaterThan(-1)
  const to = src.indexOf('\n  }', from)
  expect(to).toBeGreaterThan(from)
  return src.slice(from, to)
}

describe('the lane corrects on arrival', () => {
  it('1 · cả partial lẫn final đều đi qua applyMishearings', () => {
    const src = read(LANE)
    const partialAt = src.indexOf('function handlePartial')
    const finalAt = src.indexOf('function handleFinal')
    expect(partialAt).toBeGreaterThan(-1)
    expect(finalAt).toBeGreaterThan(partialAt)
    const nextTop = src.indexOf('\n  function ', finalAt)
    expect(nextTop).toBeGreaterThan(finalAt)

    expect(src.slice(partialAt, finalAt)).toContain('applyMishearings(')
    expect(src.slice(finalAt, nextTop)).toContain('applyMishearings(')
  })

  it('2 · trong handleFinal việc sửa xảy ra TRƯỚC mọi chốt chặn', () => {
    const src = read(LANE)
    const finalAt = src.indexOf('function handleFinal')
    const slice = src.slice(finalAt, src.indexOf('\n  function ', finalAt))
    expect(slice.indexOf('applyMishearings(')).toBeGreaterThan(-1)
    expect(slice.indexOf("dropGhost('repeat'")).toBeGreaterThan(-1)
    expect(slice.indexOf('applyMishearings(')).toBeLessThan(slice.indexOf("dropGhost('repeat'"))
  })

  it('3 · getter đọc LIVE từng lần, không chốt một lần lúc Bắt đầu', () => {
    const src = read(LANE)
    expect(bodyOf(src, 'activeMishearings')).toContain('config.getMishearing?.()')

    const startAt = src.indexOf('async function start(')
    expect(startAt).toBeGreaterThan(-1)
    const startEnd = src.indexOf('\n  async function ', startAt + 1)
    expect(startEnd).toBeGreaterThan(startAt)
    expect(src.slice(startAt, startEnd)).not.toContain('getMishearing')
  })
})

describe('what the recogniser is primed with', () => {
  it('4 · cả hai đường quay số đều đi qua đúng MỘT hàm dựng ngữ liệu', () => {
    const src = read(LANE)
    expect(src).toContain('corpus: buildAsrCorpus(),')
    expect(src).toContain('const proxyTerms = codec ? null : buildAsrCorpus();')
    expect(src).not.toContain("(opts!.terms ?? '').slice(0, CORPUS_MAX_CHARS)")
  })

  it('5 · vế NGHE NHẦM không bao giờ được mồi cho máy nghe — chỉ vế đúng', () => {
    const body = bodyOf(read(LANE), 'buildAsrCorpus')
    expect(body).toContain('rule.correct')
    expect(body).not.toContain('.heard')
  })

  it('6 · refine nhận hai trường tách bạch: thuật ngữ đã sạch dấu ~, và luật nghe nhầm riêng', () => {
    const src = read(LANE)
    expect(src).toContain("sessionTerms: splitMishearingLines(o.terms ?? '').terms,")
    expect(src).toContain('sessionMishearings: formatMishearingRules(activeMishearings()),')
    expect(src).not.toContain('sessionTerms: o.terms,')
  })
})

describe('facade and console', () => {
  it('7 · facade khai báo state + setter, lưu bền, và trả ra từ hook', () => {
    const src = read('src/lib/lanes/online/index.ts')
    expect(src).toMatch(/^\s*mishearing: string$/m)
    expect(src).toMatch(/^\s*setMishearing: \(v: string\) => void$/m)
    expect(src).toContain("'proyaku_online_mishearing'")
    expect(src).toContain('mishearing, setMishearing')
  })

  it('8 · lane nhận getter từ facade qua ref, không qua state đã đóng băng', () => {
    expect(read('src/lib/lanes/online/index.ts')).toContain('getMishearing: () => mishearingRef.current,')
  })

  it('9 · ô "Sửa nghe nhầm" KHÔNG bị khoá khi đang chạy; ô "Thuật ngữ" thì CÓ', () => {
    const src = read('src/lib/lanes/online/components/OnlineConsole.tsx')
    // Lưới bắt phải là `.*?` với cờ `s`, KHÔNG phải `[^>]*`: thuộc tính onChange chứa một mũi tên `=>`,
    // và dấu `>` trong đó chặn `[^>]*` lại trước khi tới `/>` nên thẻ không bao giờ khớp.
    const mishearing = src.match(/<textarea value=\{lane\.mishearing\}.*?\/>/s)
    expect(mishearing).not.toBeNull()
    expect(mishearing![0]).not.toContain('disabled=') // núm sửa được giữa buổi lễ

    const terms = src.match(/<textarea value=\{lane\.terms\}.*?\/>/s)
    expect(terms).not.toBeNull()
    expect(terms![0]).toContain('disabled={lane.running}') // chốt vào lane lúc Bắt đầu
  })

  it('10 · console chạm tới bộ phân tích qua GỐC facade, không qua đường dẫn sâu', () => {
    const src = read('src/lib/lanes/online/components/OnlineConsole.tsx')
    const line = src.split('\n').find((l) => l.includes('splitMishearingLines') && l.trimStart().startsWith('import'))
    expect(line).toBeDefined()
    expect(line!.trimEnd().endsWith("from '../index'")).toBe(true)
    expect(src).not.toContain("from '../mishearing'")
  })
})

describe('the server backstop', () => {
  const rules: MishearingRule[] = [
    { heard: ['suhai', 'SI'], correct: 'Esuhai' },
    { heard: ['son lee', 'xon li'], correct: 'Lê Long Sơn' },
  ]
  const minimal = {
    sourceText: 'Công ty suhai xin chào', previewText: '', sourceLanguage: 'vi', targetLanguage: 'ja',
    sourceEmotion: '', sourcePace: undefined, recentFinals: [] as string[], sessionBrief: '',
  }

  it('11 · hai bản cài đặt nói cùng một thứ tiếng: client format → server parse, đi về nguyên vẹn', async () => {
    // @ts-expect-error — the server is plain .mjs (no types)
    const { parseMishearingRules } = await import('../server/online-api.mjs')
    expect(parseMishearingRules(formatMishearingRules(rules))).toEqual(rules)
  })

  it('12 · client cũ không gửi trường mới ⇒ không ném lỗi, và không có khối nghe nhầm nào', async () => {
    // @ts-expect-error — plain .mjs
    const { buildRefinePrompt } = await import('../server/online-api.mjs')
    let prompt = ''
    expect(() => { prompt = buildRefinePrompt({ ...minimal, sessionTerms: [] }) }).not.toThrow()
    expect(prompt).not.toContain('Known mishearings')
  })

  it('13 · có luật ⇒ khối nghe nhầm xuất hiện, kèm câu chốt "đây là sửa, không phải gợi ý"', async () => {
    // @ts-expect-error — plain .mjs
    const { buildRefinePrompt } = await import('../server/online-api.mjs')
    const prompt: string = buildRefinePrompt({ ...minimal, sessionTerms: [], sessionMishearings: rules })
    expect(prompt).toContain('Known mishearings for this meeting')
    expect(prompt).toContain('Esuhai')
    expect(prompt).toContain('Lê Long Sơn')
    expect(prompt).toContain('this is a correction, not a suggestion')
  })

  it('14 · keyterm chỉ giữ vế ĐÚNG, kể cả khi vế trái có dấu phẩy', async () => {
    // @ts-expect-error — plain .mjs
    const { pickScribeKeyterms } = await import('../server/online-api.mjs')
    const { kept } = pickScribeKeyterms('suhai, S-Hi Group, SI ~ Esuhai\nLê Long Sơn = レ・ロン・ソン')
    expect(kept).toContain('Esuhai')
    expect(kept).toContain('Lê Long Sơn')
    expect(kept).toContain('レ・ロン・ソン')
    expect(kept).not.toContain('suhai')
    expect(kept).not.toContain('S-Hi Group')
    expect(kept).not.toContain('SI')
  })
})
