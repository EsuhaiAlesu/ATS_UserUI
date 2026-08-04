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

  // Hành vi mà ca này từng ghi lại (hai cặp → một sự kiện) là LỖI THẬT, đã vá ngày 04/08/2026 bằng
  // TASK 8B: nhánh nuốt bản sao nay cập nhật `lastFinalTimestamped` trước khi `return null`. Mong đợi
  // ban đầu của prompt là đúng.
  it('7 · hai cặp "Vâng." liền nhau → hai sự kiện; ba cặp → ba; và はい。 cũng vậy', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const two = driver()
    two.plain('Vâng.')
    two.tagged('Vâng.')
    two.plain('Vâng.')
    two.tagged('Vâng.')
    expect(two.emitted).toEqual(['Vâng.', 'Vâng.'])

    // Ba cặp liền nhau → BA sự kiện. Đây là chỗ chốt quyết định KHÔNG làm mới `lastFinalAt` trong nhánh
    // nuốt: làm mới nó thì cặp thứ ba đo cửa sổ từ một bản sao chứ không từ một câu thật.
    const three = driver()
    for (let i = 0; i < 3; i += 1) { three.plain('Vâng.'); three.tagged('Vâng.') }
    expect(three.emitted).toEqual(['Vâng.', 'Vâng.', 'Vâng.'])

    // Cùng một lỗi, tiếng Nhật — dạng mà lễ Esuhai sinh ra nhiều nhất.
    const ja = driver()
    ja.plain('はい。')
    ja.tagged('はい。')
    ja.plain('はい。')
    ja.tagged('はい。')
    expect(ja.emitted).toEqual(['はい。', 'はい。'])
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
