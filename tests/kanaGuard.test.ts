import { describe, it, expect } from 'vitest'
// @ts-expect-error — the server is plain .mjs (no types); we only exercise the pure exported helper here.
const { buildRefinePrompt } = await import('../server/online-api.mjs')

// TASK 11 — on 01/08 a half-heard fragment came back as 東立二十少年記念 where the speaker said
// 創立二十周年記念. Wrong kanji fails twice at once: on the wall it is a DIFFERENT word (not a typo anybody
// can read past), and the voice reads it aloud with the wrong pronunciation, so the mistake leaves the
// screen and enters the hall. Kana has neither problem. These pin the standing rule and the extra warning
// at the cut edge, where a compound word gets sliced in half.
const build = (o: Record<string, unknown>): string => buildRefinePrompt({
  sourceText: 'kỷ niệm hai mươi năm thành lập', previewText: '', sourceLanguage: 'vi', targetLanguage: 'ja',
  sourceEmotion: '', sourcePace: undefined, recentFinals: [], sessionBrief: '', sessionTerms: [], ...o,
}) as string

describe('kana guard (TASK 11)', () => {
  it('1 · mọi prompt tiếng Nhật đều mang luật thường trực "NEVER guess kanji"', () => {
    expect(build({ targetLanguage: 'ja' })).toContain('NEVER guess kanji')
  })

  it('2 · nêu ĐỦ hai cái giá, vì chỉ một cái nghe như chuyện thẩm mỹ', () => {
    const p = build({ targetLanguage: 'ja' })
    expect(p).toContain('a DIFFERENT word rather than a misspelling')
    expect(p).toContain('the voice reads it aloud with the wrong pronunciation')
  })

  it('3 · luật nằm TRÊN transcript, nơi mô hình đọc nó trước khi đọc lời', () => {
    const p = build({ targetLanguage: 'ja' })
    expect(p.indexOf('NEVER guess kanji')).toBeGreaterThan(-1)
    expect(p.indexOf('NEVER guess kanji')).toBeLessThan(p.indexOf('Source transcript:'))
  })

  it('4 · phép được giới hạn, không phải cấm sạch: nêu đúng ba nơi kanji vẫn được tin', () => {
    const p = build({ targetLanguage: 'ja' })
    expect(p).toContain('the session terms')
    expect(p).toContain('the known-mishearing list')
    expect(p).toContain('the recent subtitles above')
  })

  it('5 · luật ở mép cắt bật lên với mảnh câu tiếng Nhật, giữ nguyên cặp chữ thật của 01/08', () => {
    const p = build({ sourceIsFragment: true, targetLanguage: 'ja' })
    expect(p).toContain('創立二十周年記念')
    expect(p).toContain('東立二十少年記念')
  })

  it('6 · không bật lên khi đích là tiếng Việt', () => {
    const p = build({ sourceIsFragment: true, targetLanguage: 'vi', sourceLanguage: 'ja' })
    expect(p).not.toContain('創立二十周年記念')
    expect(p).not.toContain('東立二十少年記念')
  })

  it('7 · không bật lên với câu trọn vẹn, nhưng luật thường trực thì vẫn còn', () => {
    const p = build({ targetLanguage: 'ja' })
    expect(p).not.toContain('創立二十周年記念')
    expect(p).toContain('NEVER guess kanji')
  })

  it('8 · không mâu thuẫn với luật katakana cho tên nước ngoài', () => {
    const p = build({ targetLanguage: 'ja' })
    expect(p).toContain('NEVER guess kanji')
    expect(p).toContain('ALWAYS render non-Japanese person and organization names in katakana')
  })
})
