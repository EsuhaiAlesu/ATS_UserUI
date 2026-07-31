import { describe, it, expect } from 'vitest'
import {
  planStableScribeCommit,
  nextScribeForceCommitDelay,
  SCRIBE_MANUAL_SENTENCE_STABLE_MS,
  SCRIBE_MANUAL_LONG_STABLE_MS,
  SCRIBE_MANUAL_LONG_PARTIAL_CHARS,
  SCRIBE_MANUAL_FORCE_COMMIT_MS,
  SCRIBE_MANUAL_MIN_COMMIT_GAP_MS,
} from '../src/lib/lanes/online/scribeManualCommit'

// These are pure functions: the lane owns the clock and passes it in, so every timestamp here is a
// plain number derived from one fixed NOW. No Date.now(), no fake timers.
const NOW = 1_000_000
const ago = (ms: number) => NOW - ms
const NO_COMMIT_YET = 0
const LONG_AGO = ago(60_000) // far past any window — stability is never the limiting factor

// 200+ characters, not one mark of punctuation: the "one enormous block" case the module exists for.
const LONG_UNPUNCTUATED = 'kinh thua quy vi dai bieu va cac ban '.repeat(6).trim()

describe('planning the cut', () => {
  it('leaves an unfinished, short partial to the vendor VAD', () => {
    expect(planStableScribeCommit('Kính thưa quý vị', LONG_AGO, NO_COMMIT_YET, NOW)).toBeNull()
  })

  it('cuts immediately when a punctuated partial has already been still for the full window', () => {
    expect(
      planStableScribeCommit('Xin chào quý vị.', ago(SCRIBE_MANUAL_SENTENCE_STABLE_MS), NO_COMMIT_YET, NOW),
    ).toEqual({ reason: 'sentence', delayMs: 0, stableMs: 600, adaptive: false })
  })

  it('waits out the remainder of the window when the text has just changed', () => {
    expect(planStableScribeCommit('Xin chào quý vị.', ago(200), NO_COMMIT_YET, NOW)).toEqual({
      reason: 'sentence',
      delayMs: 400, // 600ms window − 200ms already still
      stableMs: 600,
      adaptive: false,
    })
  })

  it('treats ?, ! and 。 as a finished sentence', () => {
    for (const partial of ['Quý vị nghe rõ không?', 'Tuyệt vời!', 'よろしくお願いします。']) {
      expect(planStableScribeCommit(partial, LONG_AGO, NO_COMMIT_YET, NOW)).toMatchObject({
        reason: 'sentence',
        delayMs: 0,
      })
    }
  })

  it('does NOT treat a decimal number as the end of a sentence (regression: 10.000)', () => {
    expect(planStableScribeCommit('Chi phí là 10.000', LONG_AGO, NO_COMMIT_YET, NOW)).toBeNull()
    expect(planStableScribeCommit('Tổng cộng 100.000.000 đồng', LONG_AGO, NO_COMMIT_YET, NOW)).toBeNull()
    // Trailing whitespace must not rescue it either — the text is still mid-number.
    expect(planStableScribeCommit('Chi phí là 10.000   ', LONG_AGO, NO_COMMIT_YET, NOW)).toBeNull()
    // Documenting the real boundary: a dot is only "numeric" with a digit on BOTH sides, so a dot
    // that ends the text (nothing after it) still reads as a full stop.
    expect(planStableScribeCommit('Chi phí là 10.', LONG_AGO, NO_COMMIT_YET, NOW)).toMatchObject({
      reason: 'sentence',
    })
  })

  it('cuts a 200+ character unpunctuated partial on length, using the longer window', () => {
    expect(LONG_UNPUNCTUATED.length).toBeGreaterThanOrEqual(SCRIBE_MANUAL_LONG_PARTIAL_CHARS)
    expect(planStableScribeCommit(LONG_UNPUNCTUATED, LONG_AGO, NO_COMMIT_YET, NOW)).toEqual({
      reason: 'length',
      delayMs: 0,
      stableMs: SCRIBE_MANUAL_LONG_STABLE_MS,
      adaptive: false,
    })
    // Same text, only 300ms of stillness → it waits out the 800ms window, not the 600ms one.
    expect(planStableScribeCommit(LONG_UNPUNCTUATED, ago(300), NO_COMMIT_YET, NOW)).toMatchObject({
      reason: 'length',
      delayMs: 500,
      stableMs: 800,
    })
  })

  it('pushes the next cut out to the vendor gap when the last commit was 500ms ago', () => {
    expect(planStableScribeCommit('Xin chào quý vị.', LONG_AGO, ago(500), NOW)).toEqual({
      reason: 'sentence',
      delayMs: 2000, // 2500ms minimum gap − 500ms since the last commit, even though the text is stable
      stableMs: SCRIBE_MANUAL_SENTENCE_STABLE_MS,
      adaptive: false,
    })
    expect(SCRIBE_MANUAL_MIN_COMMIT_GAP_MS).toBe(2500)
    // Once the gap has fully elapsed it stops mattering.
    expect(planStableScribeCommit('Xin chào quý vị.', LONG_AGO, ago(2500), NOW)).toMatchObject({ delayMs: 0 })
  })

  it('does not hold back the first commit of a session', () => {
    expect(planStableScribeCommit('Xin chào quý vị.', LONG_AGO, NO_COMMIT_YET, NOW)).toMatchObject({
      reason: 'sentence',
      delayMs: 0,
    })
  })

  it('lets a per-speaker pause profile replace the constants and flags the plan adaptive', () => {
    const windows = { sentenceMs: 300, longMs: 450 }
    expect(planStableScribeCommit('Xin chào quý vị.', ago(100), NO_COMMIT_YET, NOW, windows)).toEqual({
      reason: 'sentence',
      delayMs: 200, // 300ms profile window − 100ms already still
      stableMs: 300,
      adaptive: true,
    })
    expect(planStableScribeCommit(LONG_UNPUNCTUATED, ago(100), NO_COMMIT_YET, NOW, windows)).toEqual({
      reason: 'length',
      delayMs: 350, // 450ms profile window − 100ms already still
      stableMs: 450,
      adaptive: true,
    })
  })
})

describe('the hard ceiling', () => {
  it('counts a full 25s from now when nothing has been committed yet', () => {
    expect(nextScribeForceCommitDelay(NO_COMMIT_YET, NOW)).toBe(25_000)
    expect(SCRIBE_MANUAL_FORCE_COMMIT_MS).toBe(25_000)
  })

  it('counts down from the last commit', () => {
    expect(nextScribeForceCommitDelay(ago(10_000), NOW)).toBe(15_000)
    expect(nextScribeForceCommitDelay(ago(24_999), NOW)).toBe(1)
  })

  it('never goes negative once the ceiling has passed', () => {
    expect(nextScribeForceCommitDelay(ago(25_000), NOW)).toBe(0)
    expect(nextScribeForceCommitDelay(ago(90_000), NOW)).toBe(0)
  })
})
