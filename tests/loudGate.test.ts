import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  LOUD_GATE_KEY, LOUD_BASE_THRESHOLD, LOUD_GATE_OPTIONS, LOUD_NOISE_REFERENCE_RMS,
  loadLoudGate, saveLoudGate, loudGateLabel, resolveLoudThreshold, type LoudGateMode,
} from '../src/lib/lanes/online/loudGate'
import { resolveVoiceFloor, type MicSensitivity } from '../src/lib/lanes/online/pcm16Capture'

// TASK 3 — the machine had TWO loudness thresholds and only ONE followed the mic setting. With a
// speakerphone the same speech was "a voice" to the worklet and "no sound at all" to the lane, so every
// final was thrown away as long-silence. THE INVARIANT these pin: at the close step the threshold is
// still EXACTLY 0.09, the number that has run all along — the gala uses hand-held mics at the mouth.
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

const ALL_SENSE: MicSensitivity[] = ['auto', 'close', 'medium', 'far']
const ALL_MODES: LoudGateMode[] = ['auto', 'standard', 'low', 'verylow']
const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8')

describe('loudGate — lưu trữ', () => {
  it('chưa lưu gì → "verylow" — bàn giao: gần như tắt hẳn chốt đủ to', () => {
    expect(loadLoudGate()).toBe('verylow')
  })

  it('cả bốn giá trị đều đi-về được', () => {
    for (const v of ALL_MODES) {
      expect(saveLoudGate(v)).toBe(true)
      expect(loadLoudGate()).toBe(v)
    }
  })

  it('giá trị rác trong kho → "verylow"', () => {
    store.set(LOUD_GATE_KEY, 'loudest')
    expect(loadLoudGate()).toBe('verylow')
  })

  it('lưu giá trị lạ → false và KHÔNG ghi gì', () => {
    expect(saveLoudGate('loudest' as LoudGateMode)).toBe(false)
    expect(store.has(LOUD_GATE_KEY)).toBe(false)
  })

  it('getItem ném lỗi → trả mặc định, không ném ra ngoài', () => {
    vi.stubGlobal('localStorage', { ...stub, getItem: () => { throw new Error('blocked') } })
    expect(() => loadLoudGate()).not.toThrow()
    expect(loadLoudGate()).toBe('verylow')
  })

  it('setItem ném lỗi → trả false, không ném ra ngoài', () => {
    vi.stubGlobal('localStorage', { ...stub, setItem: () => { throw new Error('quota') } })
    expect(() => saveLoudGate('low')).not.toThrow()
    expect(saveLoudGate('low')).toBe(false)
  })

  it('khoá và ngưỡng nền đúng tên/số đã chốt', () => {
    expect(LOUD_GATE_KEY).toBe('proyaku_online_loud_gate')
    expect(LOUD_BASE_THRESHOLD).toBe(0.09)
  })
})

describe('loudGate — danh sách lựa chọn', () => {
  it('đúng 4 mục theo thứ tự auto · standard · low · verylow, mục nào cũng có lời giải thích', () => {
    expect(LOUD_GATE_OPTIONS.map((o) => o.value)).toEqual(['auto', 'standard', 'low', 'verylow'])
    for (const o of LOUD_GATE_OPTIONS) expect(o.hint.trim().length).toBeGreaterThan(10)
  })

  it('loudGateLabel trả đúng nhãn trong danh sách', () => {
    for (const o of LOUD_GATE_OPTIONS) expect(loudGateLabel(o.value)).toBe(o.label)
  })
})

describe('loudGate — bậc thang ngưỡng', () => {
  it('BẤT BIẾN: auto + mic sát miệng = ĐÚNG 0.09, con số đã chạy từ trước tới nay', () => {
    expect(resolveLoudThreshold('auto', 'close')).toBe(0.09)
  })

  it('auto + "medium" = 0.045', () => {
    expect(resolveLoudThreshold('auto', 'medium')).toBe(0.045)
  })

  it('auto + "far" = 0.0225', () => {
    expect(resolveLoudThreshold('auto', 'far')).toBe(0.0225)
  })

  it('auto + "auto" = 0.0525', () => {
    expect(resolveLoudThreshold('auto', 'auto')).toBe(0.0525)
  })

  it('dựng lại công thức một cách độc lập cho cả bốn độ nhạy', () => {
    const round4 = (n: number) => Math.round(n * 10_000) / 10_000
    const close = resolveVoiceFloor('close', LOUD_NOISE_REFERENCE_RMS).rms
    for (const s of ALL_SENSE) {
      const here = resolveVoiceFloor(s, LOUD_NOISE_REFERENCE_RMS).rms
      expect(resolveLoudThreshold('auto', s)).toBe(round4(LOUD_BASE_THRESHOLD * (here / close)))
    }
  })

  it('"standard" ép về 0.09 bất kể độ nhạy đang đặt gì', () => {
    for (const s of ALL_SENSE) expect(resolveLoudThreshold('standard', s)).toBe(0.09)
  })

  it('"low" là 0.02 và "verylow" là 0.008, bất kể độ nhạy', () => {
    for (const s of ALL_SENSE) {
      expect(resolveLoudThreshold('low', s)).toBe(0.02)
      expect(resolveLoudThreshold('verylow', s)).toBe(0.008)
    }
  })

  it('hai nấc tay nằm THẤP HƠN HẲN đáy của thang tự động (0.0225) — đó là lý do chúng tồn tại', () => {
    const lowestAuto = Math.min(...ALL_SENSE.map((s) => resolveLoudThreshold('auto', s)))
    expect(lowestAuto).toBe(0.0225)
    expect(resolveLoudThreshold('low', 'far')).toBeLessThan(lowestAuto)
    expect(resolveLoudThreshold('verylow', 'far')).toBeLessThan(lowestAuto)
  })

  it('"verylow" thấp hơn cả peak mà nấc "far" đã coi là có tiếng nói — hai ngưỡng thôi mâu thuẫn nhau', () => {
    expect(resolveLoudThreshold('verylow', 'far')).toBeLessThan(resolveVoiceFloor('far', LOUD_NOISE_REFERENCE_RMS).peak)
  })
})

describe('loudGate — chốt chặn ở mã nguồn', () => {
  it('onlineLane bỏ hằng số cứng AUDIO_LOUD_LEVEL_THRESHOLD và dùng resolveLoudThreshold', () => {
    const src = read('../src/lib/lanes/online/onlineLane.ts')
    expect(src).not.toContain('AUDIO_LOUD_LEVEL_THRESHOLD')
    expect(src).toContain('resolveLoudThreshold(')
  })

  it('lane đọc núm NGAY TRONG callback mức tín hiệu (đọc live từng khung)', () => {
    expect(read('../src/lib/lanes/online/onlineLane.ts')).toContain("config.getLoudGate?.() ?? 'auto'")
  })

  it('ô "Ngưỡng đủ to" KHÔNG bị khoá khi đang chạy; ô "Độ nhạy micro" thì CÓ', () => {
    const lines = read('../src/lib/lanes/online/components/OnlineConsole.tsx').split('\n')
    const loud = lines.find((l) => l.includes('id="online-console-loudgate"'))
    const sense = lines.find((l) => l.includes('id="online-console-micsense"'))
    expect(loud).toBeDefined()
    expect(sense).toBeDefined()
    expect(loud).not.toContain('disabled=')            // núm vặn giữa buổi
    expect(sense).toContain('disabled={lane.running}') // chốt vào worklet lúc Bắt đầu
  })
})
