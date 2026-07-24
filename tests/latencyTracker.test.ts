import { describe, it, expect, vi } from 'vitest'
import { createLatencyTracker } from '../src/lib/lanes/online/latencyTracker'

describe('latencyTracker', () => {
  it('emits a report exactly every 10 refine-shown segments with correct p50/p90', () => {
    const onReport = vi.fn()
    const lt = createLatencyTracker(onReport)
    // 10 segments: draft delta = i*100 (100..1000); refine delta = 400 + i*100 (500..1400)
    for (let i = 1; i <= 10; i++) {
      const lid = `online-${i}`
      const base = i * 10000
      lt.markFirstPartial(lid, base)
      lt.markDraftShown(lid, base + i * 100)
      lt.markFinal(lid, base + 2000)
      lt.markRefineShown(lid, base + 2000 + (400 + i * 100))
    }
    expect(onReport).toHaveBeenCalledTimes(1)
    const rep = lt.getReport()
    expect(rep.samples).toBe(10)
    // nearest-rank: p50 → index ceil(0.5*10)-1=4, p90 → index 8
    expect([rep.draftP50, rep.draftP90]).toEqual([500, 900])
    expect([rep.refineP50, rep.refineP90]).toEqual([900, 1300])
    expect([rep.ttsP50, rep.ttsP90]).toEqual([null, null])
  })

  it('marks are first-wins (a re-mark does not double-count)', () => {
    const onReport = vi.fn()
    const lt = createLatencyTracker(onReport)
    lt.markFinal('online-1', 2000)
    lt.markRefineShown('online-1', 2500)
    lt.markRefineShown('online-1', 999999) // must not recount
    expect(onReport).not.toHaveBeenCalled() // only 1 segment, never reaches 10
    lt.markTtsStart('online-1', 2300)
    expect(lt.getReport().ttsP50).toBe(300) // 2300 - 2000
  })

  it('reset clears everything', () => {
    const lt = createLatencyTracker()
    lt.markFinal('online-1', 1)
    lt.reset()
    expect(lt.getReport().samples).toBe(0)
  })
})
