import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
// @ts-expect-error — the server is plain .mjs (no types); we only exercise the pure exported helper here.
const { buildRefinePrompt } = await import('../server/online-api.mjs')

// TASK 10 — the continuation block used to label the first half "already translated and shown to the
// audience". It never was: the lane sends `head`, the source transcript exactly as the recogniser heard
// it. A model handed Vietnamese under that label did all three things it could do wrong on 01/08 — copied
// it, re-translated it, and stuttered inside its own Japanese. The mechanism is unchanged; only the label
// and two explicit instructions are.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const SERVER = 'server/online-api.mjs'
const LANE = 'src/lib/lanes/online/onlineLane.ts'

const build = (o: Record<string, unknown>): string => buildRefinePrompt({
  sourceText: 'quý khách từ Nhật Bản', previewText: '', sourceLanguage: 'vi', targetLanguage: 'ja',
  sourceEmotion: '', sourcePace: undefined, recentFinals: [], sessionBrief: '', sessionTerms: [], ...o,
}) as string

const FRAGMENT = 'Chúng tôi rất vinh dự được đón tiếp'

describe('the label is honest', () => {
  it('1 · nửa đầu được gọi đúng tên: TIẾNG NGUỒN, không phải bản dịch, và trích nguyên văn ngay dòng dưới', () => {
    const p = build({ previousFragment: FRAGMENT })
    expect(p).toContain('SOURCE language, NOT a translation')
    expect(p).toContain(`First half, exactly as the recogniser heard it — SOURCE language, NOT a translation:\n${FRAGMENT}`)
  })

  it('2 · nhãn cũ đã biến mất khỏi TOÀN BỘ file máy chủ', () => {
    expect(read(SERVER)).not.toContain('already translated and shown to the audience')
  })

  it('3 · mô hình được nói thẳng rằng nó KHÔNG được xem bản dịch', () => {
    expect(build({ previousFragment: FRAGMENT })).toContain('you are NOT being shown the translation')
  })
})

describe('the three ways it went wrong on 01/08', () => {
  it('4 · chép lại: cấm chép bất kỳ chữ nào của nửa đầu, ở bất kỳ thứ tiếng nào, vào target_final', () => {
    expect(build({ previousFragment: FRAGMENT })).toContain('Never copy any of its words, in any language, into target_final')
  })

  it('5 · dịch lại: lệnh cũ vẫn còn nguyên', () => {
    expect(build({ previousFragment: FRAGMENT })).toContain('Do NOT repeat, re-translate, or summarise the first half')
  })

  it('6 · coi nửa đầu là mẫu cho đầu ra: nói rõ đó không bao giờ là mẫu', () => {
    expect(build({ previousFragment: FRAGMENT })).toContain('never an example of what the target language should look like')
  })
})

describe('nothing else moved', () => {
  it('7 · không có previousFragment thì không có khối CONTINUATION nào', () => {
    expect(build({})).not.toContain('CONTINUATION')
  })

  it('8 · thứ tự không đổi: CONTINUATION vẫn nằm TRÊN "Source transcript:"', () => {
    const p = build({ previousFragment: FRAGMENT })
    expect(p.indexOf('CONTINUATION')).toBeGreaterThan(-1)
    expect(p.indexOf('CONTINUATION')).toBeLessThan(p.indexOf('Source transcript:'))
  })

  it('9 · hai miếng vá vẫn xếp đúng thứ tự: CONTINUATION → UNFINISHED FRAGMENT → Source transcript:', () => {
    const p = build({ previousFragment: FRAGMENT, sourceIsFragment: true })
    const cont = p.indexOf('CONTINUATION')
    const frag = p.indexOf('UNFINISHED FRAGMENT')
    const src = p.indexOf('Source transcript:')
    expect(cont).toBeGreaterThan(-1)
    expect(frag).toBeGreaterThan(cont)
    expect(src).toBeGreaterThan(frag)
  })

  it('10 · lane thật sự gửi chữ NGUỒN, nên nhãn mới là nhãn đúng', () => {
    const src = read(LANE)
    expect(src).toContain("pendingFragmentTail = fragment && reason !== 'turn-end' ? head : '';")
    expect(src).toContain('previousFragment: cont.previousFragment || undefined,')
  })
})
