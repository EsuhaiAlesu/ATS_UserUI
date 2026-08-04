import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createAsrCodec } from '../src/lib/lanes/online/asrTransport'

// TASK 9 — the self-heal used to cost a sentence every time it fired: the held plain final was set to
// null and no event was ever produced for it, so a sentence somebody actually said vanished from the
// screen, the translation, the voice and the saved transcript, in silence. It also threw away
// `sawTimestampedFinal` — evidence, not policy — on the very first late twin, sending the NEXT sentence
// out with no language tag at all. These pin the rescue queue, the strike counter, and the wiring that
// delivers the rescued sentence in spoken order.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const TRANSPORT = 'src/lib/lanes/online/asrTransport.ts'
const LANE = 'src/lib/lanes/online/onlineLane.ts'
const COMPLETED = 'conversation.item.input_audio_transcription.completed'

type Emitted = { type: string; transcript: string; detectedLanguage?: string }

/** A codec whose handshake PROMISED language detection, so the hold path is armed from sentence one. */
const armed = () => {
  const codec = createAsrCodec()
  codec.decode(JSON.stringify({ message_type: 'session_started', config: { include_language_detection: true } }))
  return codec
}

/** A codec whose handshake said nothing about detection — the untouched, pre-TASK-9 path. */
const bare = () => {
  const codec = createAsrCodec()
  codec.decode(JSON.stringify({ message_type: 'session_started', config: {} }))
  return codec
}

const plainOn = (codec: ReturnType<typeof createAsrCodec>) => (t: string) =>
  codec.decode(JSON.stringify({ message_type: 'final_transcript', transcript: t }))
const taggedOn = (codec: ReturnType<typeof createAsrCodec>) => (t: string, lang = 'vie') =>
  codec.decode(JSON.stringify({ message_type: 'final_transcript_with_timestamps', transcript: t, language_code: lang }))
const drainOn = (codec: ReturnType<typeof createAsrCodec>) => () => (codec.drain?.() ?? []) as Emitted[]

describe('the promise kept', () => {
  it('1 · bản trơn được GIỮ, bản mang nhãn phát một lần kèm nhãn — không cứu gì, không mất gì', () => {
    const codec = armed()
    const plain = plainOn(codec); const tagged = taggedOn(codec); const drain = drainOn(codec)

    expect(plain('A')).toBeNull()
    expect(drain()).toEqual([])

    const r = tagged('A')
    expect(r).not.toBeNull()
    expect(r!.event.type).toBe(COMPLETED)
    expect((r!.event as Emitted).transcript).toBe('A')
    expect((r!.event as Emitted).detectedLanguage).toBe('vie')
    expect(drain()).toEqual([])
  })

  it('2 · một bản mang nhãn ĐẶT LẠI bộ đếm: bội 1 → giữ lời → bội 2 lần nữa, cổng vẫn đóng', () => {
    const codec = armed()
    const plain = plainOn(codec); const tagged = taggedOn(codec); const drain = drainOn(codec)

    expect(plain('A')).toBeNull()
    expect(plain('B')).toBeNull() // bội lần 1 → cứu A, giữ B
    expect(drain().map((e) => e.transcript)).toEqual(['A'])

    const kept = tagged('B') // lời hứa được giữ lại → bộ đếm về 0
    expect((kept!.event as Emitted).transcript).toBe('B')

    expect(plain('C')).toBeNull()
    expect(plain('D')).toBeNull() // bội lần 1 (đã đặt lại) → cứu C, giữ D
    expect(plain('E')).toBeNull() // bội lần 2 → cứu D, giữ E; cổng VẪN đóng
    expect(drain().map((e) => e.transcript)).toEqual(['C', 'D'])
  })
})

describe('the promise broken once', () => {
  it('3 · bản trơn thứ hai trả về null, và drain() trả đúng MỘT sự kiện', () => {
    const codec = armed()
    const plain = plainOn(codec); const drain = drainOn(codec)

    expect(plain('A')).toBeNull()
    expect(plain('B')).toBeNull()
    expect(drain()).toHaveLength(1)
  })

  it('4 · sự kiện được cứu là câu A, đúng nguyên văn, và KHÔNG mang nhãn ngôn ngữ', () => {
    const codec = armed()
    const plain = plainOn(codec); const drain = drainOn(codec)

    plain('A'); plain('B')
    const [rescued] = drain()
    expect(rescued.type).toBe(COMPLETED)
    expect(rescued.transcript).toBe('A')
    expect('detectedLanguage' in rescued).toBe(false)
  })

  it('5 · drain() dọn sạch hàng đợi: gọi lần thứ hai ngay sau đó trả về []', () => {
    const codec = armed()
    const plain = plainOn(codec); const drain = drainOn(codec)

    plain('A'); plain('B')
    expect(drain()).toHaveLength(1)
    expect(drain()).toEqual([])
  })

  it('6 · B vẫn đang được giữ: bản mang nhãn của B phát B một lần, kèm nhãn của nó', () => {
    const codec = armed()
    const plain = plainOn(codec); const tagged = taggedOn(codec); const drain = drainOn(codec)

    plain('A'); plain('B'); drain()
    const r = tagged('B', 'jpn')
    expect(r).not.toBeNull()
    expect((r!.event as Emitted).transcript).toBe('B')
    expect((r!.event as Emitted).detectedLanguage).toBe('jpn')
    expect(drain()).toEqual([])
  })

  it('7 · gửi lại y hệt bản trơn KHÔNG phải là bội lời hứa', () => {
    const codec = armed()
    const plain = plainOn(codec); const tagged = taggedOn(codec); const drain = drainOn(codec)

    expect(plain('A')).toBeNull()
    expect(plain('A')).toBeNull()
    expect(drain()).toEqual([]) // không cứu ai cả — vẫn đang giữ A
    expect((tagged('A')!.event as Emitted).transcript).toBe('A')
  })

  it('8 · chỉ khác dấu câu cũng KHÔNG phải bội lời hứa (đây là việc normaliseFinal đang làm)', () => {
    const codec = armed()
    const plain = plainOn(codec); const drain = drainOn(codec)

    expect(plain('Kính thưa quý vị.')).toBeNull()
    expect(plain('Kính thưa quý vị')).toBeNull()
    expect(drain()).toEqual([])
  })
})

describe('the promise broken for good', () => {
  it('9 · ba lần bội liên tiếp cứu ba câu, và sau lần thứ ba cổng mở: câu kế phát NGAY', () => {
    const codec = armed()
    const plain = plainOn(codec); const drain = drainOn(codec)
    const rescued: string[] = []

    expect(plain('A')).toBeNull(); expect(drain()).toEqual([])
    expect(plain('B')).toBeNull(); rescued.push(...drain().map((e) => e.transcript)) // bội 1 → cứu A
    expect(plain('C')).toBeNull(); rescued.push(...drain().map((e) => e.transcript)) // bội 2 → cứu B

    const r = plain('D') // bội 3 → cứu C VÀ mở cổng, nên D ra thẳng từ decode
    rescued.push(...drain().map((e) => e.transcript))
    expect(rescued).toEqual(['A', 'B', 'C'])
    expect(r).not.toBeNull()
    expect((r!.event as Emitted).transcript).toBe('D')
    expect(drain()).toEqual([])
  })

  it('10 · bằng chứng sống qua hai lần bội đầu: sau hai lần, bản trơn vẫn bị GIỮ chứ không phát', () => {
    const codec = armed()
    const plain = plainOn(codec)

    expect(plain('A')).toBeNull()
    expect(plain('B')).toBeNull() // bội 1 — mã cũ mở cổng ngay tại đây
    expect(plain('C')).toBeNull() // bội 2 — cổng vẫn đóng, C bị giữ chờ nhãn
  })

  it('11 · BROKEN_PROMISE_LIMIT là 3', () => {
    expect(read(TRANSPORT)).toMatch(/const BROKEN_PROMISE_LIMIT = 3;/)
  })

  it('12 · phiên không hứa nhận diện thì không bị đụng tới: mọi bản trơn ra thẳng, drain() luôn rỗng', () => {
    const codec = bare()
    const plain = plainOn(codec); const drain = drainOn(codec)

    for (const t of ['A', 'B', 'C', 'D']) {
      const r = plain(t)
      expect(r).not.toBeNull()
      expect((r!.event as Emitted).transcript).toBe(t)
      expect(drain()).toEqual([])
    }
  })
})

describe('wiring', () => {
  it('13 · AsrCodec khai báo drain và createAsrCodec cài đặt nó', () => {
    const src = read(TRANSPORT)
    expect(src).toContain('drain?(): DecodedEvent[];')
    expect(src).toContain('drain(): DecodedEvent[] {')
  })

  it('14 · lane rút hàng đợi TRƯỚC khi giao sự kiện của chính lần decode đó', () => {
    const src = read(LANE)
    const drainAt = src.indexOf('codec.drain?.()')
    const handleAt = src.indexOf('handleEvent(decoded.event')
    expect(drainAt).toBeGreaterThan(-1)
    expect(handleAt).toBeGreaterThan(-1)
    expect(drainAt).toBeLessThan(handleAt)
  })
})
