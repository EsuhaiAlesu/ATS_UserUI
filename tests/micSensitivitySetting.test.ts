import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  MIC_SENSITIVITY_KEY,
  MIC_SENSITIVITY_OPTIONS,
  isMicSensitivity,
  loadMicSensitivity,
  saveMicSensitivity,
  micSensitivityLabel,
} from '../src/lib/lanes/online/micSensitivity'
import { resolveVoiceFloor, type MicSensitivity } from '../src/lib/lanes/online/pcm16Capture'

// TASK 2 — "Độ nhạy micro" belongs to the ROOM, not the meeting: the Settings page writes it, the hook
// reads it at mount, and both go through one module so they cannot drift apart.
const store = new Map<string, string>()
const stub = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size },
}
vi.stubGlobal('localStorage', stub)
afterAll(() => { vi.unstubAllGlobals() })
beforeEach(() => { store.clear(); vi.stubGlobal('localStorage', stub) })

const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8')

// Code only. The prompt's own header comment for OnlineMicSettings SAYS it "deliberately does NOT call
// `useOnlineLane`" — naming the hook is how the next reader learns why. What must never come back is the
// CALL, not the sentence explaining its absence, so the guard below reads code with comments removed.
const readCode = (p: string) => read(p)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n')

describe('micSensitivity — vòng đời lưu trữ', () => {
  it('chưa lưu gì → "auto"', () => {
    expect(loadMicSensitivity()).toBe('auto')
  })

  it('lưu rồi đọc lại: "far"', () => {
    expect(saveMicSensitivity('far')).toBe(true)
    expect(loadMicSensitivity()).toBe('far')
  })

  it('cả bốn giá trị đều đi-về được', () => {
    for (const v of ['auto', 'close', 'medium', 'far'] as MicSensitivity[]) {
      expect(saveMicSensitivity(v)).toBe(true)
      expect(loadMicSensitivity()).toBe(v)
    }
  })

  it('giá trị rác trong kho → "auto"', () => {
    store.set(MIC_SENSITIVITY_KEY, 'loud')
    expect(loadMicSensitivity()).toBe('auto')
  })

  it('lưu giá trị lạ → trả false và KHÔNG ghi gì', () => {
    expect(saveMicSensitivity('loud' as MicSensitivity)).toBe(false)
    expect(store.has(MIC_SENSITIVITY_KEY)).toBe(false)
  })

  it('getItem ném lỗi → vẫn trả "auto", không ném ra ngoài', () => {
    vi.stubGlobal('localStorage', { ...stub, getItem: () => { throw new Error('blocked') } })
    expect(() => loadMicSensitivity()).not.toThrow()
    expect(loadMicSensitivity()).toBe('auto')
  })

  it('setItem ném lỗi → trả false, không ném ra ngoài (chế độ riêng tư / hết quota)', () => {
    vi.stubGlobal('localStorage', { ...stub, setItem: () => { throw new Error('quota') } })
    expect(() => saveMicSensitivity('far')).not.toThrow()
    expect(saveMicSensitivity('far')).toBe(false)
  })

  it('khoá lưu trữ đúng tên đã chốt', () => {
    expect(MIC_SENSITIVITY_KEY).toBe('proyaku_online_mic_sense')
  })
})

describe('micSensitivity — danh sách lựa chọn', () => {
  it('đúng 4 mục, theo thứ tự auto · close · medium · far', () => {
    expect(MIC_SENSITIVITY_OPTIONS.map((o) => o.value)).toEqual(['auto', 'close', 'medium', 'far'])
  })

  it('mục nào cũng có lời giải thích tiếng Việt, không để trống', () => {
    for (const o of MIC_SENSITIVITY_OPTIONS) {
      expect(o.label.trim().length).toBeGreaterThan(0)
      expect(o.hint.trim().length).toBeGreaterThan(10)
    }
  })

  it('micSensitivityLabel trả đúng nhãn trong danh sách', () => {
    for (const o of MIC_SENSITIVITY_OPTIONS) expect(micSensitivityLabel(o.value)).toBe(o.label)
  })

  it('isMicSensitivity nhận đúng bốn giá trị và từ chối rác', () => {
    for (const v of ['auto', 'close', 'medium', 'far']) expect(isMicSensitivity(v)).toBe(true)
    for (const v of [null, '', 'FAR', 3, undefined, {}]) expect(isMicSensitivity(v)).toBe(false)
  })

  it('thứ tự trong danh sách khớp ngưỡng thật: close → medium → far là giảm dần', () => {
    const c = resolveVoiceFloor('close', 0.002).rms
    const m = resolveVoiceFloor('medium', 0.002).rms
    const f = resolveVoiceFloor('far', 0.002).rms
    expect(c).toBeGreaterThanOrEqual(m)
    expect(m).toBeGreaterThanOrEqual(f)
  })
})

describe('micSensitivity — ghim số để không ai đổi nhầm', () => {
  it('rms của "close" là 0.012', () => {
    expect(resolveVoiceFloor('close', 0.002).rms).toBeCloseTo(0.012, 9)
  })

  it('rms của "far" là 0.003', () => {
    expect(resolveVoiceFloor('far', 0.002).rms).toBeCloseTo(0.003, 9)
  })

  it('peak của "far" là 0.00875 — TASK 3 (ngưỡng đủ to) dựa vào đúng con số này', () => {
    expect(resolveVoiceFloor('far', 0.002).peak).toBeCloseTo(0.00875, 9)
  })
})

describe('micSensitivity — chốt chặn ở mã nguồn', () => {
  it('OnlineMicSettings chỉ nhập từ facade "../index", không sâu hơn', () => {
    const src = read('../src/lib/lanes/online/components/OnlineMicSettings.tsx')
    expect(src).toContain("from '../index'")
    expect(src).not.toMatch(/from '\.\.\/micSensitivity'/)
    expect(src).not.toMatch(/from '\.\.\/pcm16Capture'/)
  })

  it('OnlineMicSettings KHÔNG gọi useOnlineLane — trang cấu hình không được khởi động phiên', () => {
    expect(readCode('../src/lib/lanes/online/components/OnlineMicSettings.tsx')).not.toContain('useOnlineLane')
  })

  it('trang Cài đặt có mục id="ms" và có gắn OnlineMicSettings', () => {
    const src = read('../src/pages/Settings.tsx')
    expect(src).toContain('id="ms"')
    expect(src).toContain('OnlineMicSettings')
  })

  it('facade đọc qua loadMicSensitivity, KHÔNG tự cầm chuỗi khoá', () => {
    const src = read('../src/lib/lanes/online/index.ts')
    expect(src).toContain('loadMicSensitivity')
    expect(src).not.toContain("'proyaku_online_mic_sense'")
  })
})
