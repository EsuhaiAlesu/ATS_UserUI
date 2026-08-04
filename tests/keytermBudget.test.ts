import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { previewKeyterms, KEYTERM_MAX, KEYTERM_MAX_LEN } from '../src/lib/lanes/online/keytermBudget'
// @ts-expect-error — the server is plain .mjs (no types); we only exercise the pure exported helper here.
const { pickScribeKeyterms } = await import('../server/online-api.mjs')

// TASK 7 — the server keeps at most 30 keyterms and drops anything over 20 characters, in silence. That
// silence already cost this project once: `Chương trình Vinh danh` (22 chars) and the glossary line
// `Lê Long Sơn = レ・ロン・ソン` were thrown away, and what the recogniser most needed help with was exactly
// what never reached it. `previewKeyterms` is a MIRROR of the server's `pickScribeKeyterms`; the parity
// block below is what keeps the mirror honest, so the console can never promise a term the server drops.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const SERVER = 'server/online-api.mjs'
const CONSOLE = 'src/lib/lanes/online/components/OnlineConsole.tsx'

/** The console renders the split reasons; the server only counts. Both views must agree, term for term. */
const parity = (corpus: string) => {
  const mine = previewKeyterms(corpus)
  const theirs = pickScribeKeyterms(corpus)
  expect(mine.kept).toEqual(theirs.kept)
  expect(mine.tooLong.length + mine.overflow.length).toBe(theirs.dropped)
}

describe('the rule', () => {
  it('1 · hai con số là của chính máy chủ, không phải bản sao trôi dạt', () => {
    const src = read(SERVER)
    const maxLen = src.match(/const SCRIBE_KEYTERM_MAX_LEN = (\d+);/)
    const max = src.match(/const SCRIBE_KEYTERM_MAX = (\d+);/)
    expect(maxLen).not.toBeNull()
    expect(max).not.toBeNull()
    expect(Number(maxLen?.[1])).toBe(KEYTERM_MAX_LEN)
    expect(Number(max?.[1])).toBe(KEYTERM_MAX)
  })

  it('2 · dòng "nguồn = đích" góp cả hai vế, xen kẽ theo từng dòng', () => {
    const { kept } = previewKeyterms('Lê Long Sơn = レ・ロン・ソン\nEsuhai = エスハイ')
    expect(kept).toEqual(['Lê Long Sơn', 'レ・ロン・ソン', 'Esuhai', 'エスハイ'])
  })

  it('3 · cùng một tên trên hai dòng chỉ là MỘT từ khoá', () => {
    const { kept } = previewKeyterms('Esuhai\nAlesu\nEsuhai')
    expect(kept).toEqual(['Esuhai', 'Alesu'])
  })

  it('4 · "Chương trình Vinh danh" (22 ký tự) rơi vào tooLong, đúng mục đã mất hôm 14/07', () => {
    const { kept, tooLong } = previewKeyterms('Esuhai, Chương trình Vinh danh, Sếp')
    expect('Chương trình Vinh danh'.length).toBeGreaterThan(KEYTERM_MAX_LEN)
    expect(tooLong).toContain('Chương trình Vinh danh')
    expect(kept).not.toContain('Chương trình Vinh danh')
    expect(kept).toEqual(['Esuhai', 'Sếp'])
  })

  it('5 · mục thứ 31 rơi vào overflow, kept dừng đúng ở KEYTERM_MAX', () => {
    const corpus = Array.from({ length: 31 }, (_, i) => `t${i}`).join(',')
    const { kept, overflow, tooLong } = previewKeyterms(corpus)
    expect(kept).toHaveLength(KEYTERM_MAX)
    expect(overflow).toEqual(['t30'])
    expect(tooLong).toEqual([])
  })

  it('6 · dòng "~" chỉ góp vế ĐÚNG, không bao giờ góp dạng nghe nhầm', () => {
    const { kept } = previewKeyterms('suhai ~ Esuhai')
    expect(kept).toEqual(['Esuhai'])
    expect(kept).not.toContain('suhai')
  })

  it('7 · dòng "~" có nhiều dạng nghe nhầm bên trái thì không giữ dạng nào', () => {
    const { kept } = previewKeyterms('suhai, S-Hi Group, SI ~ Esuhai')
    expect(kept).toEqual(['Esuhai'])
  })

  it('8 · cả bốn dấu ngăn đều tách: dấu phẩy, xuống dòng, chấm phẩy, chấm giữa', () => {
    const { kept } = previewKeyterms(['Alpha,Beta', 'Gamma;Delta·Epsilon'].join('\n'))
    expect(kept).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'])
  })

  it('9 · rỗng / chỉ khoảng trắng / undefined đều cho ba mảng rỗng và không ném lỗi', () => {
    for (const corpus of ['', '   \n \t \n  ', undefined as unknown as string]) {
      expect(() => previewKeyterms(corpus)).not.toThrow()
      expect(previewKeyterms(corpus)).toEqual({ kept: [], tooLong: [], overflow: [] })
    }
  })
})

describe('parity with the server', () => {
  it('10 · bảng thuật ngữ thường, dòng nào cũng có "="', () => {
    parity('Lê Long Sơn = レ・ロン・ソン\nEsuhai = エスハイ\nAlesu = アレス\nSếp = 社長')
  })

  it('11 · ngữ liệu có hai mục dài quá khổ', () => {
    parity('Esuhai\nChương trình Vinh danh\nAlesu\nLễ kỷ niệm hai mươi năm thành lập\nSếp')
  })

  it('12 · danh sách 40 dòng, tràn khỏi 30 chỗ', () => {
    parity(Array.from({ length: 40 }, (_, i) => `Thuat ngu ${i}`).join('\n'))
  })

  it('13 · ngữ liệu trộn mục thường với dòng "~"', () => {
    parity([
      'Esuhai',
      'suhai, S-Hi Group ~ Esuhai',
      'Lê Long Sơn = レ・ロン・ソン',
      'chuong trinh vinh zanh ~ Chương trình Vinh danh',
      'Alesu; Sếp·Kaizen',
    ].join('\n'))
  })
})

describe('the console says it', () => {
  it('14 · bảng điều khiển tính trước trên CẢ thuật ngữ lẫn nghe nhầm, và in ra số chỗ đã dùng', () => {
    const src = read(CONSOLE)
    expect(src).toMatch(/previewKeyterms\(/)
    expect(src).toMatch(/previewKeyterms\([^)]*lane\.mishearing/)
    expect(src).toContain('{keyterms.kept.length}/{KEYTERM_MAX}')
  })

  it('15 · cảnh báo mục quá dài hiện bằng màu lỗi và gọi tên mục', () => {
    const src = read(CONSOLE)
    const at = src.indexOf('keyterms.tooLong.length > 0')
    expect(at).toBeGreaterThan(-1)
    const to = src.indexOf('</p>', at)
    expect(to).toBeGreaterThan(at)
    const block = src.slice(at, to)
    expect(block).toContain('text-error')
    expect(block).toContain('keyterms.tooLong.slice(0, 3)')
  })

  it('16 · bảng điều khiển không với tay qua mặt tiền để lấy quy tắc', () => {
    const src = read(CONSOLE)
    expect(src).not.toContain("from '../keytermBudget'")
    expect(src).not.toContain('online-api')
  })
})
