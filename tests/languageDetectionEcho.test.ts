import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createAsrCodec } from '../src/lib/lanes/online/asrTransport'

// TASK 12 — the whole one-microphone-two-directions mechanism rests on the vendor tagging each final with
// the language it heard. The codec has been reading the handshake's answer all along and putting it on
// `session.created` as `languageDetection`; the lane simply never looked. A vendor that silently declines
// therefore produced a session that looked perfectly healthy on the console while every sentence was
// routed blind. These pin the echo end to end: codec → lane → the line the console already prints.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const LANE = 'src/lib/lanes/online/onlineLane.ts'
const CONSOLE = 'src/lib/lanes/online/components/OnlineConsole.tsx'

type Created = { type: string; asrLanguages?: string[]; languageDetection?: boolean }

const started = (config: Record<string, unknown>): Created => {
  const r = createAsrCodec().decode(JSON.stringify({ message_type: 'session_started', config }))
  expect(r).not.toBeNull()
  expect(r!.event.type).toBe('session.created')
  return r!.event as Created
}

describe('the codec already had it', () => {
  it('1 · include_language_detection: true → sự kiện mang languageDetection: true', () => {
    expect(started({ include_language_detection: true }).languageDetection).toBe(true)
  })

  it("2 · chuỗi 'true' được tính y như boolean — nhà cung cấp đã gửi cả hai dạng", () => {
    expect(started({ include_language_detection: 'true' }).languageDetection).toBe(true)
  })

  it('3 · false → languageDetection: false, KHÔNG bị bỏ đi, vì "từ chối" cũng là thông tin', () => {
    const ev = started({ include_language_detection: false })
    expect(ev.languageDetection).toBe(false)
    expect('languageDetection' in ev).toBe(true)
  })

  it('4 · vắng mặt → sự kiện không có khoá languageDetection nào, đó là cái lane đọc thành null', () => {
    expect('languageDetection' in started({})).toBe(false)
  })
})

describe('the lane now reads it', () => {
  it('5 · OnlineDiagnostics khai báo asrLanguageDetection: boolean | null;', () => {
    const src = read(LANE)
    const from = src.indexOf('export interface OnlineDiagnostics {')
    expect(from).toBeGreaterThan(-1)
    const to = src.indexOf('\n}', from)
    expect(to).toBeGreaterThan(from)
    expect(src.slice(from, to)).toContain('asrLanguageDetection: boolean | null;')
  })

  it('6 · nhánh session.created gán giá trị đó', () => {
    expect(read(LANE)).toContain("asrLanguageDetection = typeof msg.languageDetection === 'boolean' ? msg.languageDetection : null;")
  })

  it('7 · nó được báo cáo: đối tượng chẩn đoán có asrLanguageDetection, trên một dòng riêng', () => {
    expect(read(LANE)).toMatch(/\n\s*asrLanguageDetection,\n/)
  })

  it('8 · nó được đặt lại lúc bắt đầu, ngay cạnh asrLanguages = null;', () => {
    const src = read(LANE)
    const a = src.indexOf('asrLanguages = null;')
    const b = src.indexOf('asrLanguageDetection = null;')
    expect(a).toBeGreaterThan(-1)
    expect(b).toBeGreaterThan(a)
    // "trong vòng hai mươi ký tự" = khoảng CÁCH giữa hai câu lệnh, không phải khoảng cách đầu-tới-đầu:
    // `asrLanguages = null;` tự nó đã dài 20 ký tự, nên đo đầu-tới-đầu thì không lệnh nào lọt được.
    expect(b - (a + 'asrLanguages = null;'.length)).toBeLessThanOrEqual(20)
  })
})

describe('the console says it', () => {
  it('9 · console in "nhận diện tiếng" trên CÙNG một <div> với "máy nghe:", và in KHÔNG khi bị từ chối', () => {
    const src = read(CONSOLE)
    const at = src.indexOf('máy nghe:')
    expect(at).toBeGreaterThan(-1)
    const open = src.lastIndexOf('<div>', at)
    const close = src.indexOf('</div>', at)
    expect(open).toBeGreaterThan(-1)
    expect(close).toBeGreaterThan(at)
    const block = src.slice(open, close)
    expect(block).toContain('nhận diện tiếng')
    expect(block).toContain('KHÔNG')
  })

  it('10 · chỉ đỏ khi thật sự nguy: điều kiện đi kèm text-error trên cùng một dòng', () => {
    const src = read(CONSOLE)
    const line = src.split('\n').find((l) => l.includes('diag.asrLanguageDetection === false && lane.twoWay'))
    expect(line).toBeDefined()
    expect(line).toContain('text-error')
  })
})
