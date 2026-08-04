import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// TASK 4 — the "Bỏ qua tiếng xì xào hội trường" checkbox was not a weak option, it was a trap: ticking it
// made the recogniser refuse to start, and the screen never said so. Measured against the live vendor on
// 02/08/2026 — three handshakes, a fresh token each, disconnected right after the first reply, NOT ONE
// BYTE of audio sent, parameters built by the server's own buildScribeWsParams. The evidence travels with
// the test so nobody has to take it on trust:
//
// (A) filter_background_audio=true AND include_timestamps=true — exactly what the app sent when ticked:
//     WS OPEN (handshake accepted, HTTP 101)
//     {"message_type":"invalid_request","error":"filter_background_audio cannot be combined with
//      include_timestamps. This will be supported in a future update."}
//     WS CLOSE code=1008 wasClean=true reason="invalid_request"
//
// (B) the filter alone, timestamps dropped:
//     {"message_type":"session_started",…,"include_timestamps":false,"filter_background_audio":true,…}
//
// (C) control — exactly what the app sends when unticked:
//     {"message_type":"session_started",…,"include_timestamps":true,"filter_background_audio":false,…}
//
// We cannot pay (B)'s price: the SECOND, timestamped final is the message carrying `language_code`, and
// the one-mic-two-directions mechanism stands on it.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

describe('client — no trace of the hall-babble switch left', () => {
  it('facade: không còn state, ref, setter hay khoá lưu trữ', () => {
    const src = read('src/lib/lanes/online/index.ts')
    expect(src).not.toMatch(/^\s*roomFilter: boolean$/m)
    expect(src).not.toContain('setRoomFilterState')
    expect(src).not.toContain('roomFilterRef')
    expect(src).not.toContain('proyaku_online_room_filter')
  })

  it('console: không còn ô tick lẫn hai đoạn mô tả tiếng Việt', () => {
    const src = read('src/lib/lanes/online/components/OnlineConsole.tsx')
    expect(src).not.toContain('lane.roomFilter')
    expect(src).not.toContain('setRoomFilter')
    expect(src).not.toContain('xì xào')
    expect(src).not.toContain('Máy nghe bắt mọi thứ lọt vào micro')
  })

  it('lane: không còn getter lẫn trường trong vé phiên', () => {
    const src = read('src/lib/lanes/online/onlineLane.ts')
    expect(src).not.toContain('getRoomFilter?:')
    expect(src).not.toContain('roomFilter: config.getRoomFilter')
  })

  it('thân yêu cầu token chỉ còn ĐÚNG ba trường', () => {
    const src = read('src/lib/lanes/online/asrTransport.ts')
    expect(src).toMatch(
      /body: JSON\.stringify\(\{\s*targetLanguage: opts\.targetLanguage,\s*language: opts\.language,\s*corpus: opts\.corpus,\s*\}\)/,
    )
    expect(src).not.toContain('roomFilter?: boolean')
    expect(src).not.toContain('roomFilter: opts.roomFilter')
  })

  it('lý do được ghi ở đúng chỗ người sau sẽ tìm', () => {
    const doc = read('docs/ONLINE-LANE-UI-API.md')
    expect(doc).toContain('filter_background_audio cannot be combined with')
    expect(doc).toContain('Removed from the UI: the hall-babble switch')
  })
})

describe('server — kept intact as the way back in', () => {
  const base = { token: 'TK', language: 'auto', keyterms: [] as string[] }

  it('client im lặng ⇒ server rơi về env (đang rỗng) ⇒ handshake KHÔNG mang tham số lọc', async () => {
    // @ts-expect-error — the server is plain .mjs (no types)
    const { buildScribeWsParams } = await import('../server/online-api.mjs')
    const { params, filterApplied } = buildScribeWsParams({ ...base, roomFilter: undefined })
    expect(params.get('filter_background_audio')).toBeNull()
    expect(filterApplied).toBe(false)
  })

  it('cả ba trạng thái vẫn chạy, và env vẫn còn nguyên trong server', async () => {
    // @ts-expect-error — plain .mjs
    const { buildScribeWsParams } = await import('../server/online-api.mjs')
    expect(buildScribeWsParams({ ...base, roomFilter: true }).params.get('filter_background_audio')).toBe('true')
    expect(buildScribeWsParams({ ...base, roomFilter: false }).params.get('filter_background_audio')).toBeNull()
    expect(read('server/online-api.mjs')).toContain('SCRIBE_FILTER_BACKGROUND')
  })

  it('timestamps là thứ ta KHÔNG đánh đổi — nó và nhận diện ngôn ngữ đều bật ở đường "vắng mặt"', async () => {
    // @ts-expect-error — plain .mjs
    const { buildScribeWsParams } = await import('../server/online-api.mjs')
    const { params } = buildScribeWsParams({ ...base, roomFilter: undefined })
    expect(params.get('include_timestamps')).toBe('true')
    expect(params.get('include_language_detection')).toBe('true')
  })

  it('tổ hợp mà nhà cung cấp từ chối VẪN dựng được từ hàm này — đó đúng là cái bẫy đã gỡ khỏi giao diện', async () => {
    // @ts-expect-error — plain .mjs
    const { buildScribeWsParams } = await import('../server/online-api.mjs')
    const { params } = buildScribeWsParams({ ...base, roomFilter: true })
    expect(params.get('filter_background_audio')).toBe('true')
    expect(params.get('include_timestamps')).toBe('true')
  })
})

describe('why this never surfaced at run time', () => {
  it('invalid_request KHÔNG nằm trong FATAL_TOKENS → lane đốt hết thang reconnect rồi mới báo', () => {
    const transport = read('src/lib/lanes/online/asrTransport.ts')
    const m = transport.match(/const FATAL_TOKENS = \[([^\]]*)\]/)
    expect(m).not.toBeNull()
    expect(m![1]).not.toContain('invalid_request')

    const lane = read('src/lib/lanes/online/onlineLane.ts')
    expect(lane).toContain('if (decoded.fatal) {')
    expect(lane).toContain('scheduleReconnect();')
    expect(lane).toContain('const RECONNECT_MAX_ATTEMPTS = 5;')
  })
})
