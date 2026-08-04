import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest'
import type { ScriptEntry } from '../src/lib/api'
import {
  loadScriptForSession,
  scriptLoadMessage,
  approveTranslatedRows,
  scriptEventKey,
} from '../src/lib/scriptLoad'

// TASK 1 — the 2026-08-01 failure: the Kịch bản screen showed 40 approved rows and the live console
// loaded ZERO, silently, so the whole ceremony ran as free translation. The key derivation is the thing
// under test here, so localStorage is a REAL in-memory stub and `src/lib/script.ts` is NOT mocked — a
// mock would assert against our own idea of the key instead of the one the writer actually uses.
const store = new Map<string, string>()
const localStorageStub = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size },
}
vi.stubGlobal('localStorage', localStorageStub)
afterAll(() => { vi.unstubAllGlobals() })

const SCRIPT_KEY = (eventId: string) => `proyaku_script:${eventId || '_default'}`

const row = (o: Partial<ScriptEntry> & { id: string }): ScriptEntry => ({
  src_lang: 'vi', src: 'Kính thưa quý vị đại biểu.',
  dst_lang: 'ja', dst: 'ご来賓の皆様。',
  status: 'approved', ...o,
})

const put = (eventId: string, rows: ScriptEntry[]) => store.set(SCRIPT_KEY(eventId), JSON.stringify(rows))

beforeEach(() => { store.clear() })

describe('loadScriptForSession — đọc kịch bản và nói rõ tình trạng', () => {
  it('3 dòng đã duyệt, đủ hai vế → rows 3, reason "ok"', () => {
    put('evt-1', [row({ id: 'a' }), row({ id: 'b' }), row({ id: 'c' })])
    const load = loadScriptForSession('evt-1')
    expect(load.rows).toHaveLength(3)
    expect(load.total).toBe(3)
    expect(load.reason).toBe('ok')
  })

  it('đọc theo POINTER THÔ — đúng khoá mà trang Kịch bản ghi vào', () => {
    store.set('proyaku_script:evt-9', JSON.stringify([row({ id: 'x' }), row({ id: 'y' })]))
    const load = loadScriptForSession('evt-9')
    expect(load.rows).toHaveLength(2)
    expect(load.eventId).toBe('evt-9')
    expect(scriptEventKey('evt-9')).toBe('evt-9') // không bao giờ suy từ event đã giải
  })

  it('pointer không khớp khoá nào → 0 dòng, và KHÔNG rơi về _default (chính là lỗi 01/08)', () => {
    put('', [row({ id: 'd1' }), row({ id: 'd2' }), row({ id: 'd3' }), row({ id: 'd4' }), row({ id: 'd5' })])
    const load = loadScriptForSession('evt-missing')
    expect(load.total).toBe(0)
    expect(load.rows).toHaveLength(0)
    expect(loadScriptForSession('').total).toBe(5) // kho _default vẫn còn nguyên 5 dòng
  })

  it('chuỗi rỗng → đọc kho _default (trường hợp chưa chọn buổi nào)', () => {
    put('', [row({ id: 'z' })])
    const load = loadScriptForSession('')
    expect(load.rows).toHaveLength(1)
    expect(load.eventId).toBe('')
  })

  it('dòng nháp đủ hai vế → reason "all-draft", đếm vào draft, rows rỗng', () => {
    put('e', [row({ id: 'a', status: 'draft' }), row({ id: 'b', status: 'draft' })])
    const load = loadScriptForSession('e')
    expect(load.reason).toBe('all-draft')
    expect(load.draft).toBe(2)
    expect(load.rows).toHaveLength(0)
  })

  it('dòng đã duyệt nhưng THIẾU dst → không được vào rows', () => {
    put('e', [row({ id: 'a' }), row({ id: 'b', dst: '   ' })])
    const load = loadScriptForSession('e')
    expect(load.rows).toHaveLength(1)
    expect(load.rows[0].id).toBe('a')
  })

  it('có src nhưng không có dst → đếm missingTranslation, và reason "missing-translation" khi không có nháp', () => {
    put('e', [row({ id: 'a', status: 'approved', dst: '' }), row({ id: 'b', status: 'approved', dst: '' })])
    const load = loadScriptForSession('e')
    expect(load.missingTranslation).toBe(2)
    expect(load.draft).toBe(0)
    expect(load.reason).toBe('missing-translation')
  })

  it('kho rỗng → reason "no-rows"', () => {
    expect(loadScriptForSession('e').reason).toBe('no-rows')
  })

  it('giá trị hỏng dưới khoá → KHÔNG ném lỗi, total 0, reason "no-rows"', () => {
    store.set(SCRIPT_KEY('e'), '{{{')
    const load = loadScriptForSession('e')
    expect(load.total).toBe(0)
    expect(load.reason).toBe('no-rows')
  })
})

describe('scriptLoadMessage — một câu tiếng Việt cho người đứng trước nút Bắt đầu', () => {
  it('ok: nêu số dòng đã duyệt trên tổng', () => {
    put('e', [row({ id: 'a' }), row({ id: 'b', status: 'draft' })])
    expect(scriptLoadMessage(loadScriptForSession('e'))).toContain('1/2 dòng đã duyệt')
  })

  it('all-draft: nêu đúng chữ trên nút và số dòng nháp', () => {
    put('e', [row({ id: 'a', status: 'draft' }), row({ id: 'b', status: 'draft' })])
    const msg = scriptLoadMessage(loadScriptForSession('e'))
    expect(msg).toContain('Duyệt')
    expect(msg).toContain('2')
    expect(msg).toContain('CHƯA DUYỆT')
  })

  it('missing-translation: nêu số dòng thiếu bản dịch', () => {
    put('e', [row({ id: 'a', dst: '' }), row({ id: 'b', dst: '' }), row({ id: 'c', dst: '' })])
    const msg = scriptLoadMessage(loadScriptForSession('e'))
    expect(msg).toContain('3 dòng THIẾU BẢN DỊCH')
  })

  it('no-rows: nói rõ máy sẽ tự dịch toàn bộ', () => {
    expect(scriptLoadMessage(loadScriptForSession('e'))).toContain('máy sẽ tự dịch toàn bộ')
  })
})

describe('approveTranslatedRows — duyệt tại chỗ, không phải rời màn hình đang chạy', () => {
  it('duyệt mọi dòng nháp đủ hai vế, trả về số lượng, và lần đọc sau báo "ok"', () => {
    put('e', [row({ id: 'a', status: 'draft' }), row({ id: 'b', status: 'draft' })])
    expect(approveTranslatedRows('e')).toBe(2)
    const after = loadScriptForSession('e')
    expect(after.reason).toBe('ok')
    expect(after.rows).toHaveLength(2)
  })

  it('KHÔNG bao giờ duyệt dòng thiếu dst — dòng đó vẫn là nháp', () => {
    put('e', [row({ id: 'a', status: 'draft' }), row({ id: 'b', status: 'draft', dst: '' })])
    expect(approveTranslatedRows('e')).toBe(1)
    const after = loadScriptForSession('e')
    expect(after.rows).toHaveLength(1)
    expect(after.rows[0].id).toBe('a')
    expect(after.missingTranslation).toBe(1)
  })

  it('không có gì để duyệt → trả 0 và KHÔNG ghi gì (chuỗi JSON y nguyên từng byte)', () => {
    put('e', [row({ id: 'a' })])
    const before = store.get(SCRIPT_KEY('e'))
    expect(approveTranslatedRows('e')).toBe(0)
    expect(store.get(SCRIPT_KEY('e'))).toBe(before)
  })
})
