import { describe, it, expect } from 'vitest'
import { classifyInterimUtterance, classifyUtterance, directionOf, createDirectionTracker } from '../src/lib/lanes/online/utteranceDirection'

describe('classifyUtterance', () => {
  it('any kana → ja', () => {
    const v = classifyUtterance('こんにちは')
    expect(v.language).toBe('ja')
    expect(v.basis).toBe('script')
    expect(v.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('kanji only (no Vietnamese diacritics) → ja', () => {
    const v = classifyUtterance('会議')
    expect(v.language).toBe('ja')
    expect(v.basis).toBe('script')
  })

  it('Vietnamese with diacritics → vi', () => {
    const v = classifyUtterance('Xin chào quý vị')
    expect(v.language).toBe('vi')
    expect(v.basis).toBe('script')
  })

  it('mixed kana + latin → ja (kana wins)', () => {
    expect(classifyUtterance('はい OK').language).toBe('ja')
  })

  it('undiacriticised Latin only → sticky to previous', () => {
    const v = classifyUtterance('OK 2026 Esuhai', 'ja')
    expect(v).toMatchObject({ language: 'ja', basis: 'sticky', confidence: 0.5 })
  })

  it('empty string → sticky to previous', () => {
    expect(classifyUtterance('', 'vi')).toMatchObject({ language: 'vi', basis: 'sticky' })
  })
})

describe('createDirectionTracker', () => {
  it('a low-confidence (sticky) verdict never moves the tracker', () => {
    const tr = createDirectionTracker('vi')
    tr.next('OK')          // sticky → stays vi
    expect(tr.current()).toBe('vi')
    tr.next('日本語です')    // kana present → confident ja → moves
    expect(tr.current()).toBe('ja')
    tr.next('2026')        // sticky → stays ja (one filler cannot flip direction)
    expect(tr.current()).toBe('ja')
  })

  it('directionOf maps language to session direction', () => {
    expect(directionOf('vi')).toBe('vi2ja')
    expect(directionOf('ja')).toBe('ja2vi')
  })
})

describe('classifyInterimUtterance (M12 — a draft inherits the settled direction)', () => {
  it('kanji-only does NOT flip a Vietnamese turn — that is the Chinese mis-transcription trap', () => {
    // classifyUtterance (finals) flips here; a draft must not, because bare kanji is exactly what a
    // Chinese mis-transcription of Vietnamese speech looks like.
    expect(classifyUtterance('我是海空啊').language).toBe('ja')
    const v = classifyInterimUtterance('我是海空啊', 'vi')
    expect(v.language).toBe('vi')
    expect(v.basis).toBe('sticky')
  })

  it('kana still flips immediately — no other language has it', () => {
    const v = classifyInterimUtterance('こんにちは', 'vi')
    expect(v.language).toBe('ja')
    expect(v.basis).toBe('script')
  })

  it('Vietnamese tone marks still flip immediately', () => {
    const v = classifyInterimUtterance('Kính thưa quý vị', 'ja')
    expect(v.language).toBe('vi')
    expect(v.basis).toBe('script')
  })

  it('no evidence at all → stays with the inherited direction', () => {
    expect(classifyInterimUtterance('OK 2026', 'ja').language).toBe('ja')
    expect(classifyInterimUtterance('', 'ja').language).toBe('ja')
    expect(classifyInterimUtterance('OK 2026').language).toBe('vi') // no previous → the lane default
  })
})
