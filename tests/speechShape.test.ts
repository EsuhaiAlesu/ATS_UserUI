import { describe, it, expect } from 'vitest'
import {
  analyzeSubframes,
  createSpeechShapeMonitor,
  SHAPE_SUBFRAME,
  SHAPE_ACTIVE_RMS,
  SHAPE_MIN_ACTIVE,
  SHAPE_GAP_RATIO,
  SHAPE_STEADY_SHARE,
  SHAPE_HISS_ZCR,
  SHAPE_HUM_ZCR,
  type SpeechShapeMonitor,
} from '../src/lib/lanes/online/speechShape'

// ── synthesised PCM16 @16kHz ────────────────────────────────────────────────────────────────────────
// Every signal below is deterministic and built out of WHOLE sub-frames wherever a level matters, so no
// 32 ms frame ever straddles a segment boundary and each frame's RMS is exactly one of the levels asked
// for. That is what makes the thresholds re-derivable by hand from these numbers.

const RATE = 16_000
const FULL = 32_767
const SPEECH = { speechLike: true, reason: '' }

/** A continuous sine of `samples` samples; `amp` is a fraction of full scale. RMS ≈ amp / √2. */
function tone(freq: number, samples: number, amp = 0.3): Int16Array {
  const out = new Int16Array(samples)
  for (let i = 0; i < samples; i++) out[i] = Math.round(amp * FULL * Math.sin((2 * Math.PI * freq * i) / RATE))
  return out
}

/**
 * One carrier, amplitude-gated through a repeating pattern of `[sub-frames, amplitude]` segments. The
 * phase runs off the absolute sample index, so the gate never adds a click the crossing count could see.
 */
function gated(freq: number, pattern: [number, number][], cycles: number): Int16Array {
  const framesPerCycle = pattern.reduce((n, [f]) => n + f, 0)
  const out = new Int16Array(framesPerCycle * cycles * SHAPE_SUBFRAME)
  let i = 0
  for (let c = 0; c < cycles; c++) {
    for (const [frames, amp] of pattern) {
      const end = i + frames * SHAPE_SUBFRAME
      for (; i < end; i++) out[i] = Math.round(amp * FULL * Math.sin((2 * Math.PI * freq * i) / RATE))
    }
  }
  return out
}

/** White noise (mulberry32, seeded → identical every run). Sign flips ≈ every sample ⇒ zcr ≈ 0.5. */
function noise(frames: number, amp = 0.3, seed = 20260731): Int16Array {
  const out = new Int16Array(frames * SHAPE_SUBFRAME)
  let s = seed >>> 0
  for (let i = 0; i < out.length; i++) {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    const r = ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
    out[i] = Math.round((r * 2 - 1) * amp * FULL)
  }
  return out
}

/**
 * Syllabic speech: a mid carrier switched on for ~190–225 ms and off for ~160–190 ms, so the window holds
 * real loud/quiet gaps. 36 sub-frames per cycle, 20 of them audible ⇒ active share ≈ 0.56, well under
 * SHAPE_STEADY_SHARE, which is exactly why real speech is exempt from the steadiness rule.
 */
const SYLLABLES: [number, number][] = [[7, 0.30], [5, 0], [6, 0.28], [6, 0], [7, 0.32], [5, 0]]

/** Feed a signal as a stream of packets (16 sub-frames = 512 ms each), returning the end timestamp. */
function feed(mon: SpeechShapeMonitor, samples: Int16Array, startAt: number, framesPerPacket = 16): number {
  const packet = framesPerPacket * SHAPE_SUBFRAME
  let at = startAt
  for (let off = 0; off < samples.length; off += packet) {
    const end = Math.min(off + packet, samples.length)
    mon.observe(samples.subarray(off, end), at)
    at += ((end - off) / RATE) * 1000
  }
  return at
}

const medianZcr = (samples: Int16Array): number => {
  const z = analyzeSubframes(samples).map((f) => f.zcr).sort((a, b) => a - b)
  return z[Math.floor(z.length / 2)]
}

/** The same nearest-rank percentiles the monitor uses for its loud/quiet ratio. */
function percentileRms(frames: { rms: number }[], p: number): number {
  const sorted = frames.map((f) => f.rms).sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))]
}
const mostlyQuiet = (frames: { rms: number }[]) => percentileRms(frames, 0.1)
const mostlyLoud = (frames: { rms: number }[]) => percentileRms(frames, 0.9)

describe('analyzeSubframes', () => {
  it('splits a packet into 32 ms frames and drops the tail that cannot fill one', () => {
    expect((SHAPE_SUBFRAME / RATE) * 1000).toBe(32)
    expect(analyzeSubframes(tone(500, 10 * SHAPE_SUBFRAME))).toHaveLength(10)
    // 511 leftover samples are not a frame — measured on padding they would be a fabricated measurement.
    expect(analyzeSubframes(tone(500, 10 * SHAPE_SUBFRAME + 511))).toHaveLength(10)
    expect(analyzeSubframes(tone(500, SHAPE_SUBFRAME - 1))).toHaveLength(0)
    expect(analyzeSubframes(new Int16Array(0))).toHaveLength(0)
  })

  it('a 500 Hz sine crosses zero ≈1000 times a second', () => {
    const frames = analyzeSubframes(tone(500, 32 * SHAPE_SUBFRAME))
    // zcr is per sample-step, so crossings = zcr × 511 and a frame lasts 0.032 s.
    const perSecond = frames.map((f) => (f.zcr * (SHAPE_SUBFRAME - 1)) / 0.032)
    for (const rate of perSecond) expect(rate).toBeGreaterThan(940)
    for (const rate of perSecond) expect(rate).toBeLessThan(1060)
    // …and it doubles with the frequency, which is what makes zcr usable as a pitch-band measure.
    const k = analyzeSubframes(tone(1000, 32 * SHAPE_SUBFRAME))[0].zcr / frames[0].zcr
    expect(k).toBeGreaterThan(1.9)
    expect(k).toBeLessThan(2.1)
    // A 500 Hz tone sits comfortably inside the human band: neither hiss nor hum.
    expect(frames[0].zcr).toBeGreaterThan(SHAPE_HUM_ZCR)
    expect(frames[0].zcr).toBeLessThan(SHAPE_HISS_ZCR)
  })

  it('digital silence measures nothing at all', () => {
    const frames = analyzeSubframes(new Int16Array(10 * SHAPE_SUBFRAME))
    expect(frames).toHaveLength(10)
    for (const f of frames) {
      expect(f.rms).toBe(0)
      expect(f.zcr).toBe(0)
      expect(f.rms).toBeLessThan(SHAPE_ACTIVE_RMS) // never audible ⇒ never evidence
    }
  })
})

describe('createSpeechShapeMonitor', () => {
  it('says "speech" before it has heard anything, and while it has heard too little', () => {
    const mon = createSpeechShapeMonitor()
    expect(mon.verdict(1_000)).toEqual(SPEECH)

    // One sub-frame short of the floor, applause is still not accused: the guard says nothing until it
    // has ≈1 s of audible sound on the books.
    mon.observe(noise(SHAPE_MIN_ACTIVE - 1), 1_000)
    expect(mon.verdict(1_000)).toEqual(SPEECH)

    // The 32nd active sub-frame is the one that unlocks a verdict.
    mon.observe(noise(1), 1_000)
    expect(mon.verdict(1_000).speechLike).toBe(false)
  })

  it('absolute silence is never accused', () => {
    const mon = createSpeechShapeMonitor()
    const end = feed(mon, new Int16Array(150 * SHAPE_SUBFRAME), 0)
    expect(mon.verdict(end)).toEqual(SPEECH) // 150 frames heard, none of them audible
  })

  it('synthesised syllabic speech passes', () => {
    const mon = createSpeechShapeMonitor()
    const speech = gated(500, SYLLABLES, 3) // 108 sub-frames = 3456 ms, 60 of them audible
    const end = feed(mon, speech, 0)
    expect(analyzeSubframes(speech).filter((f) => f.rms >= SHAPE_ACTIVE_RMS).length).toBeGreaterThan(SHAPE_MIN_ACTIVE)
    expect(mon.verdict(end)).toEqual(SPEECH)
  })

  it('white-noise applause is caught as âm rào rào', () => {
    const mon = createSpeechShapeMonitor()
    const applause = noise(64) // 2048 ms, every frame audible, zcr ≈ 0.5
    expect(medianZcr(applause)).toBeGreaterThanOrEqual(SHAPE_HISS_ZCR)
    const end = feed(mon, applause, 0)
    expect(mon.verdict(end)).toEqual({ speechLike: false, reason: 'âm rào rào (vỗ tay / nhiễu)' })
  })

  it('a low hum is caught as âm ù trầm', () => {
    for (const freq of [60, 80]) {
      const mon = createSpeechShapeMonitor()
      const hum = tone(freq, 112 * SHAPE_SUBFRAME) // 3584 ms of held bass
      expect(medianZcr(hum)).toBeLessThanOrEqual(SHAPE_HUM_ZCR)
      const end = feed(mon, hum, 0)
      expect(mon.verdict(end)).toEqual({ speechLike: false, reason: 'âm ù trầm (nhạc nền)' })
    }
  })

  it('a steady tone inside the human range is caught as âm đều, không có nhịp nói', () => {
    const mon = createSpeechShapeMonitor()
    const music = tone(500, 112 * SHAPE_SUBFRAME) // unbroken, one level, 3584 ms
    // Not hiss and not hum — the pitch alone would let this through; only the missing rhythm catches it.
    expect(medianZcr(music)).toBeGreaterThan(SHAPE_HUM_ZCR)
    expect(medianZcr(music)).toBeLessThan(SHAPE_HISS_ZCR)
    const end = feed(mon, music, 0)
    expect(mon.verdict(end)).toEqual({ speechLike: false, reason: 'âm đều, không có nhịp nói' })
  })

  it('a sound with any audible break is exempt from the steadiness rule entirely', () => {
    // Two signals with the SAME two levels — loud RMS ≈ 0.0141, quiet RMS ≈ 0.0064, ratio ≈ 2.22, i.e.
    // under SHAPE_GAP_RATIO either way. Only the amount of break differs.
    const levels = (loudFrames: number, quietFrames: number) =>
      gated(500, [[loudFrames, 0.020], [quietFrames, 0.009]], 6)

    // 17 audible : 3 inaudible per cycle ⇒ active share 0.85 ≥ SHAPE_STEADY_SHARE ⇒ the rule applies.
    const unbroken = createSpeechShapeMonitor()
    const wall = levels(17, 3)
    const wallFrames = analyzeSubframes(wall)
    expect(wallFrames.filter((f) => f.rms >= SHAPE_ACTIVE_RMS).length / wallFrames.length)
      .toBeGreaterThanOrEqual(SHAPE_STEADY_SHARE)
    expect(mostlyLoud(wallFrames) / mostlyQuiet(wallFrames)).toBeLessThan(SHAPE_GAP_RATIO)
    expect(unbroken.verdict(feed(unbroken, wall, 0)))
      .toEqual({ speechLike: false, reason: 'âm đều, không có nhịp nói' })

    // Same levels, 12 : 8 ⇒ active share 0.6 < SHAPE_STEADY_SHARE ⇒ the steadiness rule is off the table.
    const broken = createSpeechShapeMonitor()
    const withGaps = levels(12, 8)
    const gapFrames = analyzeSubframes(withGaps)
    expect(gapFrames.filter((f) => f.rms >= SHAPE_ACTIVE_RMS).length / gapFrames.length)
      .toBeLessThan(SHAPE_STEADY_SHARE)
    expect(mostlyLoud(gapFrames) / mostlyQuiet(gapFrames)).toBeLessThan(SHAPE_GAP_RATIO) // still "steady"…
    expect(broken.verdict(feed(broken, withGaps, 0))).toEqual(SPEECH) // …and still not accused
  })

  it('the hiss and hum thresholds bracket the real human voice range', () => {
    // A voice's crossing rate lives between a held bass note (≈96 Hz) and hiss (≈2.8 kHz).
    for (const freq of [110, 150, 300, 500, 1_000, 2_000, 2_500]) {
      const z = medianZcr(tone(freq, 32 * SHAPE_SUBFRAME))
      expect(z).toBeGreaterThan(SHAPE_HUM_ZCR)
      expect(z).toBeLessThan(SHAPE_HISS_ZCR)
    }
    // …and syllabic sound at either end of that band is passed by the monitor itself.
    for (const freq of [150, 2_500]) {
      const mon = createSpeechShapeMonitor()
      expect(mon.verdict(feed(mon, gated(freq, SYLLABLES, 3), 0))).toEqual(SPEECH)
    }
  })

  it('a speaker resuming after music is judged normally again within the 4 s window', () => {
    const mon = createSpeechShapeMonitor()
    const musicEnd = feed(mon, tone(500, 112 * SHAPE_SUBFRAME), 0) // 0 → 3584 ms
    expect(mon.verdict(musicEnd).speechLike).toBe(false)

    // The music stops, a person starts. Once 4 s have passed the music is no longer in the window and the
    // speaker is judged on their own sound only.
    const speechEnd = feed(mon, gated(500, SYLLABLES, 3), 4_096) // 4096 → 7552 ms
    expect(speechEnd - musicEnd).toBeGreaterThan(SHAPE_MIN_ACTIVE * 32)
    expect(mon.verdict(speechEnd)).toEqual(SPEECH)
  })

  it('reset() forgets the previous session', () => {
    const mon = createSpeechShapeMonitor()
    const end = feed(mon, noise(64), 0)
    expect(mon.verdict(end).speechLike).toBe(false)

    mon.reset()
    expect(mon.verdict(end)).toEqual(SPEECH)
    // …and the next session starts accumulating from zero again.
    mon.observe(noise(SHAPE_MIN_ACTIVE - 1), end)
    expect(mon.verdict(end)).toEqual(SPEECH)
  })
})
