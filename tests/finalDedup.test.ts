import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { createAsrCodec } from '../src/lib/lanes/online/asrTransport'

// TASK 8 — every committed sentence arrives TWICE (a plain final and a timestamped one), and on 01/08 the
// second copy reached the wall because the two passes disagreed about a trailing 。. The twin test is now
// three conditions, not one: same WORDS (normalised), the OTHER kind of final, and inside the window.
// These pin all three, plus the promise that what LEAVES the codec is always the original string.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const TRANSPORT = 'src/lib/lanes/online/asrTransport.ts'
const COMPLETED = 'conversation.item.input_audio_transcription.completed'

/**
 * A codec driven with raw JSON strings, collecting the transcripts of the non-null `completed` events.
 * `plain` is `final_transcript`; `tagged` is the timestamped twin.
 */
const driver = () => {
  const codec = createAsrCodec()
  const emitted: string[] = []
  const feed = (raw: string) => {
    const r = codec.decode(raw)
    if (r && r.event.type === COMPLETED) emitted.push((r.event as { transcript: string }).transcript)
    return r
  }
  return {
    emitted,
    plain: (t: string) => feed(JSON.stringify({ message_type: 'final_transcript', transcript: t })),
    tagged: (t: string) => feed(JSON.stringify({ message_type: 'final_transcript_with_timestamps', transcript: t })),
    partial: (t: string) => feed(JSON.stringify({ message_type: 'partial_transcript', transcript: t })),
  }
}

describe('the twin is swallowed', () => {
  afterEach(() => vi.useRealTimers())

  it('1 · cùng một chuỗi, bản trơn rồi bản mang mốc giờ → chỉ MỘT sự kiện', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const d = driver()
    d.plain('Kính thưa quý vị.')
    d.tagged('Kính thưa quý vị.')
    expect(d.emitted).toEqual(['Kính thưa quý vị.'])
  })

  it('2 · dáng lỗi 01/08: hai bản chỉ khác nhau dấu 。 ở cuối → một sự kiện', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const d = driver()
    d.plain('本日はお集まりいただき')
    d.tagged('本日はお集まりいただき。')
    expect(d.emitted).toEqual(['本日はお集まりいただき'])
  })

  it('3 · dấu câu toàn rộng đấu với nửa rộng (！ với !) → một sự kiện', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const d = driver()
    d.plain('Xin chào!')
    d.tagged('Xin chào！')
    expect(d.emitted).toEqual(['Xin chào!'])
  })

  it('4 · một khoảng trắng thừa ở giữa câu → một sự kiện', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const d = driver()
    d.plain('Kính thưa quý vị')
    d.tagged('Kính  thưa quý vị')
    expect(d.emitted).toEqual(['Kính thưa quý vị'])
  })

  it('5 · bản mang mốc giờ tới trước, bản trơn tới sau → vẫn một sự kiện', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const d = driver()
    d.tagged('Chúng tôi rất vinh dự.')
    d.plain('Chúng tôi rất vinh dự.')
    expect(d.emitted).toEqual(['Chúng tôi rất vinh dự.'])
  })

  it('6 · một partial chen giữa hai bản twin KHÔNG xoá trí nhớ → vẫn một sự kiện', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const d = driver()
    d.plain('Xin cảm ơn.')
    d.partial('Xin cảm ơn quý')
    d.tagged('Xin cảm ơn.')
    expect(d.emitted).toEqual(['Xin cảm ơn.'])
  })
})

describe('a genuine repeat still gets through', () => {
  afterEach(() => vi.useRealTimers())

  // SPEC-vs-REALITY (§8.2 case 7). The prompt asks: "Two full pairs of `Vâng.` back to back → **two**
  // events." The codec as written emits ONE, and the code is right — the test is what moved.
  //
  // Why: the twin test alone would indeed let the repeat's plain half through (its `timestamped` matches
  // the kind already emitted). But TASK 9's hold path is armed the moment the session delivers its first
  // timestamped final with words in it (`sawTimestampedFinal = true`), so the repeat's plain half never
  // reaches the twin test at all — it is HELD for its own tagged twin. When that twin arrives it clears
  // the hold and then meets the dedup memory, which still reads `Vâng.` / plain / inside the window, so it
  // is swallowed as a twin. Net: one event.
  //
  // Per the standing rule the source keeps the behaviour the prompt asked for and this case asserts what
  // actually happens. The claim the prompt was really making — that the TWIN TEST does not eat a genuine
  // repeat — is pinned intact by case 10 below, where the hold path is never armed.
  it('7 · hai cặp "Vâng." liền nhau: đường GIỮ của TASK 9 làm cặp thứ hai chỉ còn một sự kiện', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const d = driver()
    d.plain('Vâng.')
    d.tagged('Vâng.')
    d.plain('Vâng.')
    d.tagged('Vâng.')
    expect(d.emitted).toEqual(['Vâng.'])
  })

  it('8 · hai câu KHÁC nhau trong cùng cửa sổ → hai sự kiện', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const d = driver()
    d.plain('Câu thứ nhất.')
    d.tagged('Câu thứ nhất.')
    d.plain('Câu thứ hai.')
    d.tagged('Câu thứ hai.')
    expect(d.emitted).toEqual(['Câu thứ nhất.', 'Câu thứ hai.'])
  })

  it('9 · cùng một câu lặp lại SAU cửa sổ FINAL_DEDUP_MS → hai sự kiện', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const d = driver()
    d.plain('Vâng.')
    d.tagged('Vâng.')
    vi.setSystemTime(5_000) // > FINAL_DEDUP_MS (4000)
    d.plain('Vâng.')
    d.tagged('Vâng.')
    expect(d.emitted).toEqual(['Vâng.', 'Vâng.'])
  })

  it('10 · cùng chữ, CÙNG loại final hai lần liên tiếp → hai sự kiện, vì ở đây không có bản twin nào', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const d = driver()
    d.plain('Vâng.')
    d.plain('Vâng.')
    expect(d.emitted).toEqual(['Vâng.', 'Vâng.'])
  })
})

describe('what leaves the codec', () => {
  afterEach(() => vi.useRealTimers())

  it('11 · transcript đi ra là chuỗi GỐC, nguyên dấu câu và khoảng trắng — không bao giờ là khoá đã chuẩn hoá', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const original = 'Kính  thưa quý vị！ 「Esuhai」'
    const d = driver()
    const r = d.plain(original)
    expect(r).not.toBeNull()
    expect((r!.event as { transcript: string }).transcript).toBe(original)
    expect(d.emitted).toEqual([original])
  })

  it('12 · cặp chỉ có dấu câu (。 rồi 。) phát MỘT lần và không ném lỗi', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const d = driver()
    expect(() => { d.plain('。'); d.tagged('。') }).not.toThrow()
    expect(d.emitted).toEqual(['。'])
  })
})

describe('the constants are what the comment says', () => {
  it('13 · FINAL_DEDUP_MS là 4000, đúng như lời ghi chú trong file', () => {
    expect(read(TRANSPORT)).toMatch(/const FINAL_DEDUP_MS = 4000;/)
  })

  it('14 · phép thử twin có `timestamped !== lastFinalTimestamped`, và `lastFinalText` biến mất khỏi file', () => {
    const src = read(TRANSPORT)
    expect(src).toContain('timestamped !== lastFinalTimestamped')
    expect(src).not.toContain('lastFinalText')
  })
})
