import { describe, it, expect } from 'vitest'
import {
  splitMishearingLines, applyMishearings,
  MISHEARING_MAX_RULES, MISHEARING_MAX_HEARD_PER_RULE,
  type MishearingRule,
} from '../src/lib/lanes/online/mishearing'

// TASK 5 — keyterms bias the recogniser BEFORE it decides; they cannot correct what it has already
// decided. On 01/08/2026 the company's own name came back as "suhai", "S-Hi Group" and "SI" with the
// glossary loaded, and every one of those mistakes was translated and spoken aloud. These pin the layer
// that fixes a decision after the fact: the grammar the operator types, and the replace that runs on
// every partial.

describe('splitMishearingLines', () => {
  it('1 · một danh sách không có dấu ~ đi qua nguyên vẹn từng byte', () => {
    const corpus = 'Esuhai\n# ghi chú của người vận hành\n\n  Lê Long Sơn = レ・ロン・ソン  \nSếp'
    const out = splitMishearingLines(corpus)
    expect(out.terms).toBe(corpus)
    expect(out.rules).toEqual([])
    expect(out.invalid).toEqual([])
  })

  it('2 · một dòng luật trở thành luật, và KHÔNG còn sót lại trong thuật ngữ', () => {
    const out = splitMishearingLines('suhai ~ Esuhai')
    expect(out.rules).toEqual([{ heard: ['suhai'], correct: 'Esuhai' }])
    expect(out.terms).toBe('')
    expect(out.invalid).toEqual([])
  })

  it('3 · vế trái tách trên cả bốn dấu ngăn, đúng thứ tự đã gõ', () => {
    const out = splitMishearingLines('a, b、c/d|e ~ X')
    expect(out.rules).toHaveLength(1)
    expect(out.rules[0].heard).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(out.rules[0].correct).toBe('X')
  })

  it('4 · cả ba dấu ~ 〜 ～ đều được nhận — bàn phím Nhật và bàn phím Mỹ cho ra ký tự khác nhau', () => {
    const expected: MishearingRule[] = [{ heard: ['a'], correct: 'X' }]
    expect(splitMishearingLines('a ~ X').rules).toEqual(expected)
    expect(splitMishearingLines('a 〜 X').rules).toEqual(expected)
    expect(splitMishearingLines('a ～ X').rules).toEqual(expected)
  })

  it('5 · chỉ dấu ĐẦU TIÊN cắt dòng; phần còn lại thuộc về dạng đúng', () => {
    const out = splitMishearingLines('a ~ B ~ C')
    expect(out.rules).toHaveLength(1)
    expect(out.rules[0].correct).toBe('B ~ C')
    expect(out.rules[0].heard).toEqual(['a'])
  })

  it('6 · dòng bắt đầu bằng # là ghi chú, giữ nguyên trong thuật ngữ dù có dấu ~', () => {
    const corpus = '# suhai ~ Esuhai'
    const out = splitMishearingLines(corpus)
    expect(out.terms).toBe(corpus)
    expect(out.rules).toEqual([])
    expect(out.invalid).toEqual([])
  })

  it('7 · dòng luật bị rút ra, các dòng khác giữ nguyên thứ tự VÀ khoảng trắng gốc', () => {
    const out = splitMishearingLines('Esuhai\n  Sếp  \nsuhai ~ Esuhai\nLê Long Sơn = レ・ロン・ソン')
    expect(out.terms).toBe('Esuhai\n  Sếp  \nLê Long Sơn = レ・ロン・ソン')
    expect(out.terms).not.toContain('suhai ~ Esuhai')
    expect(out.rules).toEqual([{ heard: ['suhai'], correct: 'Esuhai' }])
  })

  it('8 · thiếu một bên ⇒ báo là dòng chưa dùng được, không âm thầm bỏ và cũng không hoá thành thuật ngữ', () => {
    const out = splitMishearingLines('~ X\na ~')
    expect(out.invalid).toEqual(['~ X', 'a ~'])
    expect(out.rules).toEqual([])
    expect(out.terms).toBe('')
  })

  it('9 · hai vế giống nhau (không phân biệt hoa thường) là việc vô nghĩa, không phải luật', () => {
    const same = splitMishearingLines('Esuhai ~ Esuhai')
    expect(same.rules).toEqual([])
    expect(same.invalid).toEqual(['Esuhai ~ Esuhai'])

    const cased = splitMishearingLines('ESUHAI ~ Esuhai')
    expect(cased.rules).toEqual([])
    expect(cased.invalid).toEqual(['ESUHAI ~ Esuhai'])
  })

  it('10 · hai dòng cùng một dạng đúng gộp thành MỘT luật; dạng nghe nhầm trùng không vào hai lần', () => {
    const out = splitMishearingLines('suhai ~ Esuhai\nSI, suhai ~ Esuhai')
    expect(out.rules).toHaveLength(1)
    expect(out.rules[0].correct).toBe('Esuhai')
    expect(out.rules[0].heard).toEqual(['suhai', 'SI'])
  })

  it('11 · trần luật và trần dạng nghe nhầm đều giữ đúng con số đã chốt', () => {
    const many = Array.from({ length: 50 }, (_, i) => `h${i} ~ C${i}`).join('\n')
    const out = splitMishearingLines(many)
    expect(out.rules).toHaveLength(MISHEARING_MAX_RULES)
    expect(out.invalid).toHaveLength(50 - MISHEARING_MAX_RULES)
    expect(out.invalid[0]).toBe(`h${MISHEARING_MAX_RULES} ~ C${MISHEARING_MAX_RULES}`)

    const wide = splitMishearingLines(`${Array.from({ length: 12 }, (_, i) => `s${i}`).join(', ')} ~ X`)
    expect(wide.rules).toHaveLength(1)
    expect(wide.rules[0].heard).toHaveLength(MISHEARING_MAX_HEARD_PER_RULE)
    expect(wide.rules[0].heard).toEqual(Array.from({ length: MISHEARING_MAX_HEARD_PER_RULE }, (_, i) => `s${i}`))
  })

  it('12 · dán từ Windows (CRLF) cho ra đúng cùng một kết quả như LF', () => {
    const lf = 'Esuhai\n# ghi chú\nsuhai, SI ~ Esuhai\nSếp'
    expect(splitMishearingLines(lf.replace(/\n/g, '\r\n'))).toEqual(splitMishearingLines(lf))
  })
})

describe('applyMishearings', () => {
  const rulesOf = (raw: string) => splitMishearingLines(raw).rules

  it('13 · thay đúng chỗ và đếm đúng một lần', () => {
    const out = applyMishearings('Công ty suhai xin chào', rulesOf('suhai ~ Esuhai'))
    expect(out.text).toBe('Công ty Esuhai xin chào')
    // "không còn suhai" phải hỏi theo RANH GIỚI TỪ, vì dạng đúng "Esuhai" tự nó chứa chuỗi con "suhai" —
    // một `not.toContain('suhai')` trần sẽ luôn thất bại kể cả khi luật chạy hoàn hảo.
    expect(out.text).not.toMatch(/\bsuhai\b/)
    expect(out.hits).toBe(1)
  })

  it('14 · không phân biệt hoa thường — máy nghe không viết hoa theo ý ta', () => {
    const rules = rulesOf('suhai ~ Esuhai')
    expect(applyMishearings('SUHAI', rules)).toEqual({ text: 'Esuhai', hits: 1 })
    expect(applyMishearings('Suhai', rules)).toEqual({ text: 'Esuhai', hits: 1 })
  })

  it('15 · dạng DÀI NHẤT được thử trước, nên "S-Hi Group" không bị xé làm đôi', () => {
    const rules = rulesOf('SI ~ Esuhai\nS-Hi Group ~ Esuhai')
    const out = applyMishearings('S-Hi Group', rules)
    expect(out.text).toBe('Esuhai')
    expect(out.text).not.toBe('Esuhai-Hi Group')
    expect(out.hits).toBe(1)
  })

  it('16 · không cắn vào giữa một từ Latinh dài hơn: "SIM" và "SINH" nguyên vẹn', () => {
    const rules = rulesOf('SI ~ Esuhai')
    expect(applyMishearings('SIM', rules)).toEqual({ text: 'SIM', hits: 0 })
    expect(applyMishearings('SINH', rules)).toEqual({ text: 'SINH', hits: 0 })
  })

  it('17 · tiếng Nhật không có dấu cách — vẫn sửa được giữa câu', () => {
    const out = applyMishearings('本日はエスハイの式典です', rulesOf('エスハイ ~ ESUHAI'))
    expect(out.text).toBe('本日はESUHAIの式典です')
    expect(out.hits).toBe(1)
  })

  it('18 · phần đã thay KHÔNG bao giờ bị quét lại — "hai ~ Esuhai" không lặp vô tận', () => {
    const out = applyMishearings('hai', rulesOf('hai ~ Esuhai'))
    expect(out.text).toBe('Esuhai')
    expect(out.hits).toBe(1)
  })

  it('19 · không có gì để làm thì không đụng vào: chuỗi rỗng, và danh sách luật rỗng', () => {
    expect(applyMishearings('', rulesOf('suhai ~ Esuhai'))).toEqual({ text: '', hits: 0 })
    expect(applyMishearings('Công ty suhai xin chào', [])).toEqual({ text: 'Công ty suhai xin chào', hits: 0 })
  })

  it('20 · nhiều luật trong một câu: hai cái tên được sửa, phần còn lại giữ nguyên từng ký tự', () => {
    const rules = rulesOf('suhai ~ Esuhai\nson lee ~ Lê Long Sơn')
    const out = applyMishearings('Kính thưa son lee, chủ tịch suhai.', rules)
    expect(out.text).toBe('Kính thưa Lê Long Sơn, chủ tịch Esuhai.')
    expect(out.hits).toBe(2)
  })
})
