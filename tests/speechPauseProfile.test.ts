import { describe, it, expect } from 'vitest'
import {
  pauseGapIsUsable,
  pausePercentile,
  recommendStableWindows,
  createSpeechPauseProfile,
  PAUSE_GAP_MIN_MS,
  PAUSE_GAP_MAX_MS,
  PAUSE_PROFILE_MIN_SAMPLES,
  PAUSE_PROFILE_WINDOW,
  PAUSE_PROFILE_PERCENTILE,
  STABLE_WINDOW_MIN_MS,
  STABLE_WINDOW_MAX_MS,
  PAUSE_SENTENCE_MARGIN_MS,
  PAUSE_LONG_EXTRA_MS,
} from '../src/lib/lanes/online/speechPauseProfile'
import {
  planStableScribeCommit,
  SCRIBE_MANUAL_SENTENCE_STABLE_MS,
  SCRIBE_MANUAL_LONG_STABLE_MS,
  SCRIBE_MANUAL_MIN_COMMIT_GAP_MS,
} from '../src/lib/lanes/online/scribeManualCommit'

// A ceremonial MC leaves long gaps between clauses; a briefing speaker rattles through. Both sets are
// eight samples — exactly the minimum evidence the module will act on.
const FAST_SPEAKER = [180, 200, 220, 240, 260, 280, 300, 320]
const SLOW_SPEAKER = [600, 650, 700, 720, 750, 780, 800, 900]

describe('which gaps count as a deliberate pause', () => {
  it('a gap inside the band is a pause', () => {
    expect(pauseGapIsUsable(400)).toBe(true)
    expect(pauseGapIsUsable(PAUSE_GAP_MIN_MS)).toBe(true) // the band is inclusive at both ends
    expect(pauseGapIsUsable(PAUSE_GAP_MAX_MS)).toBe(true)
  })

  it('too short is the cadence of the audio chunks, not the speaker', () => {
    expect(pauseGapIsUsable(PAUSE_GAP_MIN_MS - 1)).toBe(false)
    expect(pauseGapIsUsable(40)).toBe(false)
    expect(pauseGapIsUsable(0)).toBe(false)
    expect(pauseGapIsUsable(-300)).toBe(false)
  })

  it('too long is end-of-turn silence, which would drag every threshold up', () => {
    expect(pauseGapIsUsable(PAUSE_GAP_MAX_MS + 1)).toBe(false)
    expect(pauseGapIsUsable(6_000)).toBe(false)
  })

  it('a non-finite measurement is rejected outright', () => {
    expect(pauseGapIsUsable(Number.NaN)).toBe(false)
    expect(pauseGapIsUsable(Number.POSITIVE_INFINITY)).toBe(false)
    expect(pauseGapIsUsable(Number.NEGATIVE_INFINITY)).toBe(false)
  })
})

describe('the recommendation', () => {
  it('under eight samples it returns null rather than guessing', () => {
    expect(recommendStableWindows([])).toBeNull()
    expect(recommendStableWindows(FAST_SPEAKER.slice(0, PAUSE_PROFILE_MIN_SAMPLES - 1))).toBeNull()
    expect(recommendStableWindows(FAST_SPEAKER)).not.toBeNull()
    // Unusable gaps do not count towards the eight.
    expect(recommendStableWindows([...FAST_SPEAKER.slice(0, 7), 50, 9_000, Number.NaN])).toBeNull()
  })

  it('a fast speaker gets a shorter window than the constant, a slow one a longer', () => {
    const fast = recommendStableWindows(FAST_SPEAKER)
    expect(fast).toEqual({ sentenceMs: 400, longMs: 600, samples: 8 })
    expect(fast!.sentenceMs).toBeLessThan(SCRIBE_MANUAL_SENTENCE_STABLE_MS)
    expect(fast!.longMs).toBeLessThan(SCRIBE_MANUAL_LONG_STABLE_MS)

    const slow = recommendStableWindows(SLOW_SPEAKER)
    expect(slow).toEqual({ sentenceMs: 900, longMs: 1100, samples: 8 })
    expect(slow!.sentenceMs).toBeGreaterThan(SCRIBE_MANUAL_SENTENCE_STABLE_MS)
    expect(slow!.longMs).toBeGreaterThan(SCRIBE_MANUAL_LONG_STABLE_MS)
  })

  it('the clamp holds a wild measurement inside 400–1100 ms', () => {
    const barelyPausing = recommendStableWindows(Array(10).fill(PAUSE_GAP_MIN_MS + 10))
    expect(barelyPausing!.sentenceMs).toBe(STABLE_WINDOW_MIN_MS)
    expect(barelyPausing!.longMs).toBe(STABLE_WINDOW_MIN_MS + PAUSE_LONG_EXTRA_MS)

    const enormousPauses = recommendStableWindows(Array(10).fill(PAUSE_GAP_MAX_MS - 100))
    expect(enormousPauses!.sentenceMs).toBe(STABLE_WINDOW_MAX_MS)
    expect(enormousPauses!.longMs).toBe(STABLE_WINDOW_MAX_MS)
  })

  it('the no-punctuation window is never the shorter of the two', () => {
    const sets = [FAST_SPEAKER, SLOW_SPEAKER, Array(9).fill(160), Array(9).fill(2_400), Array(9).fill(900)]
    for (const gaps of sets) {
      const windows = recommendStableWindows(gaps)!
      expect(windows.longMs).toBeGreaterThanOrEqual(windows.sentenceMs)
      expect(windows.sentenceMs).toBeGreaterThanOrEqual(STABLE_WINDOW_MIN_MS)
      expect(windows.longMs).toBeLessThanOrEqual(STABLE_WINDOW_MAX_MS)
    }
    // Documenting the real boundary: the extra 200ms is added BEFORE the ceiling clamp, so at the top
    // of the range the two windows are equal rather than 200ms apart.
    expect(recommendStableWindows(Array(9).fill(2_400))).toMatchObject({ sentenceMs: 1_100, longMs: 1_100 })
  })

  it('one abnormally long pause does not decide the threshold', () => {
    const steady = Array(9).fill(300)
    const withOutlier = [...steady, 2_400] // the MC pauses for effect exactly once
    expect(recommendStableWindows(withOutlier)!.sentenceMs).toBe(recommendStableWindows(steady)!.sentenceMs)
    expect(recommendStableWindows(withOutlier)).toMatchObject({ sentenceMs: 420, longMs: 620, samples: 10 })
  })

  it('the percentile lands on the documented rank', () => {
    // index = ceil(share × n) − 1, so 0.75 of eight sorted gaps is the sixth.
    expect(pausePercentile([100, 200, 300, 400, 500, 600, 700, 800], PAUSE_PROFILE_PERCENTILE)).toBe(600)
    expect(pausePercentile([400, 100, 800, 300, 700, 200, 600, 500], PAUSE_PROFILE_PERCENTILE)).toBe(600)
    expect(pausePercentile([100, 200, 300, 400], PAUSE_PROFILE_PERCENTILE)).toBe(300)
    expect(pausePercentile([100, 200, 300, 400], 0)).toBe(100) // clamped to the first rank
    expect(pausePercentile([100, 200, 300, 400], 1)).toBe(400) // clamped to the last
    expect(pausePercentile([], PAUSE_PROFILE_PERCENTILE)).toBe(0)
    // The recommendation is that percentile plus the fixed margin.
    expect(recommendStableWindows(FAST_SPEAKER)!.sentenceMs).toBe(
      pausePercentile(FAST_SPEAKER, PAUSE_PROFILE_PERCENTILE) + PAUSE_SENTENCE_MARGIN_MS,
    )
  })
})

describe('the accumulator', () => {
  it('keeps only the recent window, so a speaker who slows down drags the threshold with them', () => {
    const profile = createSpeechPauseProfile()
    for (let i = 0; i < PAUSE_PROFILE_WINDOW; i += 1) profile.observe(250)
    expect(profile.windows()).toEqual({ sentenceMs: 400, longMs: 600, samples: PAUSE_PROFILE_WINDOW })

    // The same speaker slows right down after forty minutes; the fast half must age out entirely.
    for (let i = 0; i < PAUSE_PROFILE_WINDOW; i += 1) profile.observe(800)
    expect(profile.windows()).toEqual({ sentenceMs: 920, longMs: 1_100, samples: PAUSE_PROFILE_WINDOW })
  })

  it('measures two languages separately — a new speaker inherits nothing', () => {
    const profile = createSpeechPauseProfile()
    for (const gap of SLOW_SPEAKER) profile.observe(gap, 'vi')
    for (const gap of FAST_SPEAKER) profile.observe(gap, 'ja')
    expect(profile.windows('vi')).toEqual({ sentenceMs: 900, longMs: 1_100, samples: 8 })
    expect(profile.windows('ja')).toEqual({ sentenceMs: 400, longMs: 600, samples: 8 })
    // A key nobody has spoken on yet has no opinion at all.
    expect(profile.windows('en')).toBeNull()
    expect(profile.windows()).toBeNull() // the default key was never used either
  })

  it('an unusable gap is not recorded', () => {
    const profile = createSpeechPauseProfile()
    for (const gap of FAST_SPEAKER) expect(profile.observe(gap, 'vi')).toBe(true)
    expect(profile.observe(80, 'vi')).toBe(false)
    expect(profile.observe(9_000, 'vi')).toBe(false)
    expect(profile.observe(Number.NaN, 'vi')).toBe(false)
    expect(profile.windows('vi')!.samples).toBe(FAST_SPEAKER.length)
  })

  it('reset() clears everything', () => {
    const profile = createSpeechPauseProfile()
    for (const gap of SLOW_SPEAKER) profile.observe(gap, 'vi')
    for (const gap of FAST_SPEAKER) profile.observe(gap, 'ja')
    expect(profile.windows('vi')).not.toBeNull()
    profile.reset()
    expect(profile.windows('vi')).toBeNull()
    expect(profile.windows('ja')).toBeNull()
  })
})

describe('integration with planStableScribeCommit', () => {
  // The lane owns the clock: every timestamp below is derived from one fixed NOW.
  const NOW = 2_000_000
  const ago = (ms: number) => NOW - ms
  const NO_COMMIT_YET = 0
  const FINISHED_SENTENCE = 'Kính thưa quý vị đại biểu, quý vị khách quý.'

  it('with no profile the existing constants are unchanged', () => {
    const fixed = planStableScribeCommit(FINISHED_SENTENCE, ago(200), NO_COMMIT_YET, NOW)
    expect(fixed).toEqual({
      reason: 'sentence',
      delayMs: SCRIBE_MANUAL_SENTENCE_STABLE_MS - 200,
      stableMs: SCRIBE_MANUAL_SENTENCE_STABLE_MS,
      adaptive: false,
    })
    // An explicit null (the profile has not gathered eight pauses yet) is the same as passing nothing.
    expect(planStableScribeCommit(FINISHED_SENTENCE, ago(200), NO_COMMIT_YET, NOW, recommendStableWindows([]))).toEqual(fixed)
  })

  it('with a fast speaker\'s profile the commit fires sooner', () => {
    const profile = createSpeechPauseProfile()
    for (const gap of FAST_SPEAKER) profile.observe(gap, 'vi')
    const windows = profile.windows('vi')

    const adapted = planStableScribeCommit(FINISHED_SENTENCE, ago(200), NO_COMMIT_YET, NOW, windows)
    expect(adapted).toEqual({ reason: 'sentence', delayMs: 200, stableMs: 400, adaptive: true })
    const fixed = planStableScribeCommit(FINISHED_SENTENCE, ago(200), NO_COMMIT_YET, NOW)!
    expect(adapted!.delayMs).toBeLessThan(fixed.delayMs)

    // And a slow ceremonial MC waits longer than the constant instead of being cut mid-sentence.
    const slow = createSpeechPauseProfile()
    for (const gap of SLOW_SPEAKER) slow.observe(gap, 'vi')
    const patient = planStableScribeCommit(FINISHED_SENTENCE, ago(200), NO_COMMIT_YET, NOW, slow.windows('vi'))
    expect(patient).toEqual({ reason: 'sentence', delayMs: 700, stableMs: 900, adaptive: true })
    expect(patient!.delayMs).toBeGreaterThan(fixed.delayMs)
  })

  it('the minimum spacing between two commits still holds', () => {
    const windows = recommendStableWindows(FAST_SPEAKER)
    // The sentence has been still for its whole (short) adapted window, but a commit landed 1s ago.
    const plan = planStableScribeCommit(FINISHED_SENTENCE, ago(400), ago(1_000), NOW, windows)
    expect(plan).toEqual({
      reason: 'sentence',
      delayMs: SCRIBE_MANUAL_MIN_COMMIT_GAP_MS - 1_000, // the spacing wins over the 0ms left of the window
      stableMs: 400,
      adaptive: true,
    })
    // Once the spacing has elapsed the adapted window is the only limit again.
    expect(planStableScribeCommit(FINISHED_SENTENCE, ago(400), ago(3_000), NOW, windows)!.delayMs).toBe(0)
  })

  it('text that does not qualify is still not cut', () => {
    const windows = recommendStableWindows(FAST_SPEAKER)
    // No sentence-ending punctuation and nowhere near the length trigger: the vendor VAD keeps it.
    expect(planStableScribeCommit('Kính thưa quý vị', ago(5_000), NO_COMMIT_YET, NOW, windows)).toBeNull()
    expect(planStableScribeCommit('', ago(5_000), NO_COMMIT_YET, NOW, windows)).toBeNull()
    // A decimal number is not a full stop, however fast the speaker is.
    expect(planStableScribeCommit('Tổng cộng 100.000.000 đồng', ago(5_000), NO_COMMIT_YET, NOW, windows)).toBeNull()
  })
})
