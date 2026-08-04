import { describe, it, expect } from 'vitest'
import { resolveVoiceFloor } from '../src/lib/lanes/online/pcm16Capture'

// TASK 2 — the capture worklet used ONE hard-coded voice floor (rms 0.012 / peak 0.035) tuned for a mic
// at the mouth. A speakerphone in the middle of a meeting table never reaches it, so the machine heard
// the room as silence and the anti-hallucination guard starved. These pin the four steps.
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9

describe('resolveVoiceFloor — sàn giọng đi theo độ nhạy micro', () => {
  it('"close" giữ NGUYÊN cách chỉnh cũ: rms 0.012 / peak 0.035', () => {
    const f = resolveVoiceFloor('close', 0.002)
    expect(near(f.rms, 0.012)).toBe(true)
    expect(near(f.peak, 0.035)).toBe(true)
  })

  it('"medium" → rms 0.006 (một nửa)', () => {
    expect(near(resolveVoiceFloor('medium', 0.002).rms, 0.006)).toBe(true)
  })

  it('"far" → rms 0.003, peak 0.00875 — TASK 3 phụ thuộc con số peak này', () => {
    const f = resolveVoiceFloor('far', 0.002)
    expect(near(f.rms, 0.003)).toBe(true)
    expect(near(f.peak, 0.00875)).toBe(true)
  })

  it('giá trị lạ → rơi về cách chỉnh close, tức là bản thận trọng nhất', () => {
    const f = resolveVoiceFloor('loud', 0.002)
    expect(near(f.rms, 0.012)).toBe(true)
    expect(near(f.peak, 0.035)).toBe(true)
  })

  it('"auto" với nền ồn 0.002 → 0.007 (gấp 3,5 lần nền)', () => {
    expect(near(resolveVoiceFloor('auto', 0.002).rms, 0.007)).toBe(true)
  })

  it('"auto" bị CHẶN TRÊN bởi cách chỉnh close: nền ồn 0.05 vẫn chỉ ra 0.012', () => {
    expect(near(resolveVoiceFloor('auto', 0.05).rms, 0.012)).toBe(true)
  })

  it('"auto" bị CHẶN DƯỚI ở 0.003: nền ồn 0 hoặc NaN không bao giờ trả 0', () => {
    expect(resolveVoiceFloor('auto', 0).rms).toBeGreaterThanOrEqual(0.003)
    expect(resolveVoiceFloor('auto', Number.NaN).rms).toBeGreaterThanOrEqual(0.003)
    expect(resolveVoiceFloor('auto', -1).rms).toBeGreaterThanOrEqual(0.003)
  })

  it('hàm TỰ CHỨA — vì nó bị bơm vào AudioWorklet bằng toString(), nơi không có scope module', () => {
    const src = resolveVoiceFloor.toString()
    // Mọi hằng số phải khai báo BÊN TRONG thân hàm; nếu nó tham chiếu ra ngoài thì worklet sẽ ném
    // ReferenceError ngay khung âm thanh đầu tiên — và lỗi đó chỉ lộ ra khi đang chạy thật.
    expect(src).toContain('CLOSE_RMS')
    expect(src).toMatch(/const\s+CLOSE_RMS\s*=/)
    expect(src).toMatch(/const\s+PEAK_RATIO\s*=/)
  })
})
