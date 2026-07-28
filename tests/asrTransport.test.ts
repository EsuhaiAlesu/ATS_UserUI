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

  it('accepts transcript OR text, and carries language when present', () => {
    const r = createAsrCodec().decode(
      JSON.stringify({ message_type: 'final_transcript', transcript: 'こんにちは', language: 'ja' }),
    )
    const ev = r!.event as { type: string; transcript: string; language?: string }
    expect(ev.type).toBe('conversation.item.input_audio_transcription.completed')
    expect(ev.transcript).toBe('こんにちは')
    expect(ev.language).toBe('ja')
  })

  it('commit_throttled → asr.commit_throttled (diagnostic)', () => {
    const r = createAsrCodec().decode(JSON.stringify({ message_type: 'commit_throttled' }))
    expect(r).toEqual({ event: { type: 'asr.commit_throttled' }, fatal: false })
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
