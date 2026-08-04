import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { scriptKeyterms } from '../src/lib/lanes/online/scriptMatcher'
import type { ScriptMatcherEntry } from '../src/lib/lanes/online/scriptMatcher'

// TASK 6 — the approved script already holds the names the recogniser will stumble on hours before the
// ceremony starts. `scriptKeyterms` lifts them; these pin BOTH halves, because the function sat written
// and uncalled from the day it was merged and nothing failed to say so. Half is real calls into the
// matcher module, half is source guards on the lane: an unused lifter primes nothing.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const LANE = 'src/lib/lanes/online/onlineLane.ts'

/** A minimal approved row — `scriptKeyterms` only ever reads `src` and `dst`. */
const row = (id: string, src: string, dst = ''): ScriptMatcherEntry =>
  ({ id, src_lang: 'vi', src, dst_lang: 'ja', dst, status: 'approved' })

/** The body of a lane-local `function name(` — from its own `function` keyword to the next `\n  }`. */
const bodyOf = (src: string, name: string): string => {
  const from = src.indexOf(`function ${name}`)
  expect(from).toBeGreaterThan(-1)
  const to = src.indexOf('\n  }', from)
  expect(to).toBeGreaterThan(from)
  return src.slice(from, to)
}

describe('scriptKeyterms lifts the right words', () => {
  it('1 · chuỗi viết hoa tiếng Việt được giữ NGUYÊN CỤM, không cắt nhỏ', () => {
    const out = scriptKeyterms([row('g01', 'Kính thưa ông Lê Long Sơn, Tổng giám đốc Esuhai')])
    expect(out).toContain('Lê Long Sơn')
    expect(out).toContain('Esuhai')
    // the run is one keyterm, not three — priming on "Lê" alone teaches the recogniser nothing
    expect(out).not.toContain('Lê')
    expect(out).not.toContain('Long')
    expect(out).not.toContain('Sơn')
  })

  it('2 · katakana từ 3 ký tự trở lên được lấy, cụm 2 ký tự thì không', () => {
    const out = scriptKeyterms([row('g02', '', 'エスハイとアイです')])
    expect(out).toEqual(['エスハイ'])
    expect(out).not.toContain('アイ')
  })

  it('3 · từ dưới 3 ký tự không bao giờ xuất hiện, dù đến từ vế nào', () => {
    const out = scriptKeyterms([row('g03', 'Ai, Bo, Lê Long Sơn', 'Ko')])
    expect(out).toEqual(['Lê Long Sơn'])
  })

  it('4 · cả src lẫn dst cùng góp vào một kết quả', () => {
    const out = scriptKeyterms([row('g04', 'Esuhai', 'エスハイ')])
    expect(out).toContain('Esuhai')
    expect(out).toContain('エスハイ')
    expect(out).toHaveLength(2)
  })

  it('5 · tần suất trước, rồi mới đến thứ tự chữ cái', () => {
    const out = scriptKeyterms([
      row('g05', 'Esuhai'),
      row('g06', 'Esuhai'),
      row('g07', 'Esuhai'),
      row('g08', 'Alesu, Zeta'),
    ])
    expect(out).toEqual(['Esuhai', 'Alesu', 'Zeta'])
  })

  it('6 · limit được tôn trọng đúng con số, và giữ đúng 30 mục xếp hạng cao nhất', () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    const names = Array.from(
      { length: 50 },
      (_, i) => `Ten${letters[Math.floor(i / 26)]}${letters[i % 26]}`,
    )
    const entries = names.map((name, i) => row(`n${i}`, name))
    // the last name is read on five rows, so frequency must float it to the very top
    for (let i = 0; i < 4; i += 1) entries.push(row(`extra${i}`, names[49]))

    const out = scriptKeyterms(entries, 30)
    expect(out).toHaveLength(30)
    expect(out).toEqual([names[49], ...names.slice(0, 29)])
  })

  it('7 · đầu vào hỏng thì trả mảng rỗng hoặc bỏ qua dòng đó, không ném lỗi', () => {
    expect(scriptKeyterms(undefined as never)).toEqual([])
    expect(scriptKeyterms(null as never)).toEqual([])
    const dirty = [
      null,
      { id: 'bad1', src: 123, dst: null },
      row('ok', 'Lê Long Sơn'),
    ] as unknown as ScriptMatcherEntry[]
    expect(() => scriptKeyterms(dirty)).not.toThrow()
    expect(scriptKeyterms(dirty)).toEqual(['Lê Long Sơn'])
  })
})

describe('the lane actually uses it', () => {
  it('8 · onlineLane nhập scriptKeyterms từ ./scriptMatcher', () => {
    // the regression that matters: the lifter existed and nothing called it
    expect(read(LANE)).toMatch(/import\s*\{[^}]*\bscriptKeyterms\b[^}]*\}\s*from\s*'\.\/scriptMatcher'/)
  })

  it('9 · SCRIPT_KEYTERM_LIMIT = 30 và chính nó là tham số thứ hai lúc gọi', () => {
    const src = read(LANE)
    expect(src).toContain('const SCRIPT_KEYTERM_LIMIT = 30;')
    expect(src).toMatch(/scriptKeyterms\(scriptSeed, SCRIPT_KEYTERM_LIMIT\)/)
  })

  it('10 · lấy từ CÙNG một bản kịch bản đã chốt với bộ so khớp', () => {
    const src = read(LANE)
    const from = src.indexOf('const scriptSeed = config.getScript?.()')
    expect(from).toBeGreaterThan(-1)
    const to = src.indexOf('scriptSnaps = 0;', from)
    expect(to).toBeGreaterThan(from)
    const slice = src.slice(from, to)
    expect(slice).toContain('createScriptMatcher(scriptSeed)')
    expect(slice).toContain('scriptKeyterms(scriptSeed')
  })

  it('11 · kịch bản rỗng thì XOÁ, không để tên buổi trước sót lại', () => {
    const src = read(LANE)
    const from = src.indexOf('const scriptSeed = config.getScript?.()')
    const slice = src.slice(from, src.indexOf('scriptSnaps = 0;', from))
    expect(slice).toContain('scriptSeed.length ? scriptKeyterms(')
    expect(slice).toContain(": ''")
  })

  it('12 · trong ngữ liệu, thuật ngữ của người vận hành đứng TRƯỚC tên lấy từ kịch bản', () => {
    const body = bodyOf(read(LANE), 'buildAsrCorpus')
    const plainAt = body.indexOf('plain')
    const correctedAt = body.indexOf('corrected')
    const scriptAt = body.indexOf('scriptKeytermCorpus')
    expect(plainAt).toBeGreaterThan(-1)
    expect(correctedAt).toBeGreaterThan(plainAt)
    expect(scriptAt).toBeGreaterThan(correctedAt)
  })
})
