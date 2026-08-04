import { describe, it, expect, vi, afterEach } from 'vitest'
import { createAsrCodec } from '../src/lib/lanes/online/asrTransport'

// Decode a base64 string back to raw bytes, the mirror of the codec's encoder.
const b64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// A realistic PCM16 packet: 4096 mono samples (~256 ms @16k) = 8192 bytes.
const makePcm = (): { buf: ArrayBuffer; bytes: Uint8Array } => {
  const samples = new Int16Array(4096)
  for (let i = 0; i < samples.length; i++) samples[i] = ((i * 37) % 65536) - 32768
  return { buf: samples.buffer, bytes: new Uint8Array(samples.buffer) }
}

describe('createAsrCodec — encodeAudio', () => {
  it('frames PCM16 as base64 at sample_rate 16000, decoding back to the original bytes', () => {
    const { buf, bytes } = makePcm()
    const frame = JSON.parse(createAsrCodec().encodeAudio(buf))
    expect(frame.message_type).toBe('input_audio_chunk')
    expect(frame.sample_rate).toBe(16000)
    expect(typeof frame.audio_base_64).toBe('string')
    expect(b64ToBytes(frame.audio_base_64)).toEqual(bytes)
  })

  it('sends previous_text on the FIRST chunk only when reconnecting', () => {
    const { buf } = makePcm()
    const codec = createAsrCodec('Câu trước đó.')
    const first = JSON.parse(codec.encodeAudio(buf))
    const second = JSON.parse(codec.encodeAudio(buf))
    expect(first.previous_text).toBe('Câu trước đó.')
    expect('previous_text' in second).toBe(false)
  })

  it('never sends previous_text on a fresh session (no arg)', () => {
    const { buf } = makePcm()
    const codec = createAsrCodec()
    const first = JSON.parse(codec.encodeAudio(buf))
    const second = JSON.parse(codec.encodeAudio(buf))
    expect('previous_text' in first).toBe(false)
    expect('previous_text' in second).toBe(false)
  })
})

describe('createAsrCodec — encodeCommit', () => {
  it('carries empty audio and commit:true at 16000', () => {
    const frame = JSON.parse(createAsrCodec().encodeCommit())
    expect(frame.message_type).toBe('input_audio_chunk')
    expect(frame.audio_base_64).toBe('')
    expect(frame.commit).toBe(true)
    expect(frame.sample_rate).toBe(16000)
  })
})

describe('createAsrCodec — decode maps the vendor vocabulary', () => {
  it('session_started → session.created', () => {
    const r = createAsrCodec().decode(JSON.stringify({ message_type: 'session_started' }))
    expect(r).toEqual({ event: { type: 'session.created' }, fatal: false })
  })

  it('partial_transcript lands its text in stash with text:""', () => {
    const r = createAsrCodec().decode(JSON.stringify({ message_type: 'partial_transcript', text: 'đang nói...' }))
    expect(r).not.toBeNull()
    expect(r!.event.type).toBe('conversation.item.input_audio_transcription.text')
    // narrow for the fields
    const ev = r!.event as { type: string; text: string; stash: string }
    expect(ev.text).toBe('')
    expect(ev.stash).toBe('đang nói...')
    expect(r!.fatal).toBe(false)
  })

  it('accepts transcript OR text, and carries the DETECTED language when present', () => {
    const r = createAsrCodec().decode(
      JSON.stringify({ message_type: 'final_transcript', transcript: 'こんにちは', language_code: 'ja' }),
    )
    const ev = r!.event as { type: string; transcript: string; detectedLanguage?: string }
    expect(ev.type).toBe('conversation.item.input_audio_transcription.completed')
    expect(ev.transcript).toBe('こんにちは')
    expect(ev.detectedLanguage).toBe('ja')
  })

  it('commit_throttled → asr.commit_throttled (diagnostic)', () => {
    const r = createAsrCodec().decode(JSON.stringify({ message_type: 'commit_throttled' }))
    expect(r).toEqual({ event: { type: 'asr.commit_throttled' }, fatal: false })
  })
})

// M11 — the vendor's own language verdict, and the twin that carries it.
describe('createAsrCodec — nhãn ngôn ngữ của máy nhận dạng', () => {
  it('BỎ QUA trường `language` trần — đó là lựa chọn của người vận hành, không phải kết quả nhận diện', () => {
    const r = createAsrCodec().decode(
      JSON.stringify({ message_type: 'final_transcript', transcript: 'Xin chào', language_code: 'vi', language: 'ja' }),
    )
    const ev = r!.event as { detectedLanguage?: string }
    expect(ev.detectedLanguage).toBe('vi') // đọc nhầm trường kia là lý do bộ lọc tiếng lạ không bao giờ nổ
  })

  it('đọc được nhãn trên cả bản nháp (partial)', () => {
    const r = createAsrCodec().decode(
      JSON.stringify({ message_type: 'partial_transcript', text: 'đang nói', language_code: 'vi' }),
    )
    const ev = r!.event as { detectedLanguage?: string }
    expect(ev.detectedLanguage).toBe('vi')
  })

  it('session_started báo đúng những thứ tiếng máy ĐÃ CHẤP NHẬN, tiếng chính đứng đầu', () => {
    const r = createAsrCodec().decode(JSON.stringify({
      message_type: 'session_started',
      config: { language_code: 'ja', secondary_languages: ['vi'], include_language_detection: true },
    }))
    const ev = r!.event as { asrLanguages?: string[]; languageDetection?: boolean }
    expect(ev.asrLanguages).toEqual(['ja', 'vi'])
    expect(ev.languageDetection).toBe(true)
  })

  it('echo dạng csv đọc y hệt dạng danh sách', () => {
    const r = createAsrCodec().decode(JSON.stringify({
      message_type: 'session_started',
      config: { language_code: 'ja', secondary_languages: 'vi,en' },
    }))
    const ev = r!.event as { asrLanguages?: string[] }
    expect(ev.asrLanguages).toEqual(['ja', 'vi', 'en'])
  })

  it('echo KHÔNG có thứ tiếng nào → không báo gì: giới hạn đã KHÔNG được áp dụng', () => {
    const r = createAsrCodec().decode(JSON.stringify({
      message_type: 'session_started',
      config: { language_code: null, include_language_detection: false },
    }))
    const ev = r!.event as { asrLanguages?: string[]; languageDetection?: boolean }
    expect(ev.asrLanguages).toBeUndefined()
    expect(ev.languageDetection).toBe(false)
  })
})

// M11 — the plain twin always arrives first and always without a tag; hold it when a tagged one is due.
describe('createAsrCodec — giữ bản twin mang nhãn', () => {
  afterEach(() => vi.useRealTimers())

  const started = (detection: boolean) => JSON.stringify({
    message_type: 'session_started',
    config: { language_code: 'ja', secondary_languages: ['vi'], include_language_detection: detection },
  })
  const plain = (text: string) => JSON.stringify({ message_type: 'committed_transcript', text })
  const tagged = (text: string, code?: string) => JSON.stringify({
    message_type: 'committed_transcript_with_timestamps', text, ...(code ? { language_code: code } : {}),
  })

  it('khi bản có timestamp đã tự chứng minh, bản trơn thôi thắng cuộc đua', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const codec = createAsrCodec()
    expect(codec.decode(plain('Câu một.'))).not.toBeNull() // câu đầu chưa có bằng chứng → vẫn dùng
    vi.setSystemTime(100)
    expect(codec.decode(tagged('Câu một.', 'vi'))).toBeNull() // dedup nuốt bản trùng
    vi.setSystemTime(5_000)
    expect(codec.decode(plain('Câu hai.'))).toBeNull() // giờ thì chờ bản mang nhãn
    const r = codec.decode(tagged('Câu hai.', 'vi'))
    expect((r!.event as { detectedLanguage?: string }).detectedLanguage).toBe('vi')
  })

  it('khi handshake đã hứa có nhận diện ngôn ngữ, NGAY câu đầu tiên đã chờ bản mang nhãn', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const codec = createAsrCodec()
    codec.decode(started(true))
    expect(codec.decode(plain('我是海空啊'))).toBeNull() // câu 1 không còn bị định tuyến mù
    const r = codec.decode(tagged('我是海空啊', 'zh'))
    expect((r!.event as { detectedLanguage?: string }).detectedLanguage).toBe('zh')
  })

  it('lời hứa bị bội: câu đang giữ được CỨU qua drain, không mất câu nào', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const codec = createAsrCodec()
    codec.decode(started(true))
    expect(codec.decode(plain('Câu bị mất.'))).toBeNull()
    vi.setSystemTime(5_000)
    // Bản trơn thứ hai là một lời hứa bị bội (lần 1 trong 3): đến lượt NÓ bị giữ để chờ nhãn...
    expect(codec.decode(plain('Câu sau vẫn qua.'))).toBeNull()
    // ...còn câu thứ nhất được cứu ra, đúng thứ tự đã nói, không còn biến mất như trước.
    const rescued = codec.drain?.() ?? []
    expect(rescued.map((e) => (e as { transcript: string }).transcript)).toEqual(['Câu bị mất.'])
    expect(codec.drain?.() ?? []).toEqual([]) // hàng đợi đã rỗng
    // Câu thứ hai vẫn ra, và ra KÈM nhãn, khi bản mang nhãn của nó tới.
    const r = codec.decode(tagged('Câu sau vẫn qua.', 'vi'))
    expect((r!.event as { transcript: string }).transcript).toBe('Câu sau vẫn qua.')
    expect((r!.event as { detectedLanguage?: string }).detectedLanguage).toBe('vi')
  })

  it('handshake KHÔNG hứa gì → bản trơn dùng y như trước', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const codec = createAsrCodec()
    codec.decode(started(false))
    const r = codec.decode(plain('Xin chào quý vị.'))
    expect((r!.event as { transcript: string }).transcript).toBe('Xin chào quý vị.')
  })

  it('bản timestamp RỖNG không chứng minh được gì — bản trơn vẫn chạy', () => {
    vi.useFakeTimers(); vi.setSystemTime(0)
    const codec = createAsrCodec()
    expect(codec.decode(plain('Câu một.'))).not.toBeNull()
    vi.setSystemTime(100)
    codec.decode(tagged('')) // twin rỗng: không có chữ nào thì không chứng minh gì
    vi.setSystemTime(5_000)
    const r = codec.decode(plain('Câu hai.'))
    expect((r!.event as { transcript: string }).transcript).toBe('Câu hai.')
  })
})

describe('createAsrCodec — final de-duplication (2s window)', () => {
  afterEach(() => vi.useRealTimers())

  it('swallows the timestamped twin of a committed sentence', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const codec = createAsrCodec()
    const first = codec.decode(JSON.stringify({ message_type: 'committed_transcript', text: 'Vâng.' }))
    expect(first).not.toBeNull()
    expect((first!.event as { transcript: string }).transcript).toBe('Vâng.')
    // The timestamped twin arrives a moment later with identical text → swallowed.
    vi.setSystemTime(120)
    const twin = codec.decode(JSON.stringify({ message_type: 'committed_transcript_with_timestamps', text: 'Vâng.' }))
    expect(twin).toBeNull()
  })

  it('does NOT swallow a genuinely different sentence', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const codec = createAsrCodec()
    expect(codec.decode(JSON.stringify({ message_type: 'committed_transcript', text: 'Xin chào' }))).not.toBeNull()
    vi.setSystemTime(50)
    const different = codec.decode(JSON.stringify({ message_type: 'committed_transcript_with_timestamps', text: 'Tạm biệt' }))
    expect(different).not.toBeNull()
    expect((different!.event as { transcript: string }).transcript).toBe('Tạm biệt')
  })

  it('does NOT swallow the same text repeated beyond the 2s window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const codec = createAsrCodec()
    expect(codec.decode(JSON.stringify({ message_type: 'committed_transcript', text: 'Vâng.' }))).not.toBeNull()
    // A speaker really can say "Vâng." twice — after the window it must get through.
    vi.setSystemTime(2500)
    expect(codec.decode(JSON.stringify({ message_type: 'committed_transcript', text: 'Vâng.' }))).not.toBeNull()
  })
})

describe('createAsrCodec — errors: fatal vs retryable', () => {
  const message = (r: ReturnType<ReturnType<typeof createAsrCodec>['decode']>) =>
    (r!.event as { type: string; error: { message: string } }).error.message

  it('auth_error, quota_exceeded, unaccepted_terms are fatal', () => {
    const codec = createAsrCodec()
    for (const t of ['auth_error', 'quota_exceeded', 'unaccepted_terms']) {
      const r = codec.decode(JSON.stringify({ message_type: t }))
      expect(r).not.toBeNull()
      expect(r!.event.type).toBe('error')
      expect(r!.fatal).toBe(true)
    }
  })

  it('a generic transcriber error is error-shaped but NOT fatal', () => {
    const r = createAsrCodec().decode(
      JSON.stringify({ message_type: 'transcription_error', error: { message: 'transcriber failed' } }),
    )
    expect(r).not.toBeNull()
    expect(r!.event.type).toBe('error')
    expect(r!.fatal).toBe(false)
    expect(message(r)).toBe('transcriber failed')
  })

  it('a fatal token inside a nested error object is still fatal', () => {
    const r = createAsrCodec().decode(JSON.stringify({ message_type: 'error', error: { code: 'quota_exceeded' } }))
    expect(r!.fatal).toBe(true)
  })
})

describe('createAsrCodec — decode ignores what it cannot use', () => {
  it('unknown message types return null', () => {
    expect(createAsrCodec().decode(JSON.stringify({ message_type: 'some_future_event', foo: 1 }))).toBeNull()
  })

  it('malformed JSON returns null instead of throwing', () => {
    const codec = createAsrCodec()
    expect(() => codec.decode('not json {{{')).not.toThrow()
    expect(codec.decode('not json {{{')).toBeNull()
    expect(codec.decode('null')).toBeNull()
    expect(codec.decode('"a bare string"')).toBeNull()
  })
})
