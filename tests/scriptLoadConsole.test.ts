import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// TASK 1 — source guards over the console. React behaviour is asserted by READING the source (the pattern
// tests/wallCompactLayout.test.ts already uses), never by rendering: this repo's vitest runs in the node
// environment and pulling in jsdom for four assertions would be a dependency nobody needs.
//
// What these guard is the exact shape of the 2026-08-01 failure: the console derived the script key its
// own way and loaded the script behind a network call, so it read 0 rows and said nothing.
const SRC = readFileSync(
  resolve(__dirname, '../src/lib/lanes/online/components/OnlineConsole.tsx'),
  'utf8',
)

// Comments stripped. The prompt's own replacement text keeps a comment that QUOTES the old broken
// derivation (`event?.id ?? ''`) so the next reader knows what went wrong on 2026-08-01 — while the same
// prompt asks the guard below to prove that string is gone. Both are right about the thing that matters:
// what must never come back is the CODE, not the record of it. So the guard reads code only.
const CODE = SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n')

describe('OnlineConsole — kịch bản phải tới nơi, và màn hình phải nói ra', () => {
  it('nhập loadScriptForSession từ module dùng chung', () => {
    expect(SRC).toContain("from '../../../scriptLoad'")
    expect(SRC).toContain('loadScriptForSession')
  })

  it('không còn tự đọc kho kịch bản nữa (getScriptLocal / loadScriptForLane đã biến mất)', () => {
    expect(CODE).not.toContain('getScriptLocal')
    expect(CODE).not.toContain('loadScriptForLane')
  })

  it("không còn suy khoá kịch bản từ event ĐÃ GIẢI — mã không được chứa \"event?.id ?? ''\"", () => {
    expect(CODE).not.toContain("event?.id ?? ''")
  })

  it('kịch bản đọc TRƯỚC, mạng sau — applyScript() nằm NGOÀI .then() của collectPrepPack', () => {
    expect(SRC).toContain('applyScript()\n    let cancelled = false')
  })

  it('thẻ tình trạng kịch bản chuyển ĐỎ khi không có dòng nào', () => {
    expect(SRC).toContain('border-error/60 bg-error/[0.08]')
  })

  it('nút duyệt tại chỗ có tồn tại và bị khoá khi đang chạy', () => {
    const line = SRC.split('\n').find((l) => /onClick=\{approveAllDrafts\}/.test(l))
    expect(line).toBeDefined()
    expect(line).toContain('disabled={lane.running}')
  })
})
