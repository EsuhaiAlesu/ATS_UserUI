import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import * as rhythm from '../src/lib/lanes/online/speechRhythm'
// @ts-expect-error — the server is plain .mjs (no types); we only exercise the pure exported helper here.
const { buildScribeWsParams } = await import('../server/online-api.mjs')

// TASK 13 — "nhịp nói của buổi". How long a silence has to last before the recogniser calls the sentence
// over was one number for every room and every speaker, and 01/08 showed both failure modes in one
// rehearsal: cut mid-sentence on a thinking pause, and sentences run together when the MC read straight
// through. Three named steps, no numbers for the operator, riding the token request that already exists —
// no new endpoint. The clamp lives on BOTH sides and the server has the last word; the parity block below
// is what keeps the client's copy from drifting away from it.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const RHYTHM = 'src/lib/lanes/online/speechRhythm.ts'
const TRANSPORT = 'src/lib/lanes/online/asrTransport.ts'
const LANE = 'src/lib/lanes/online/onlineLane.ts'
const FACADE = 'src/lib/lanes/online/index.ts'
const SERVER = 'server/online-api.mjs'

const store = new Map<string, string>()
const stub = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size },
}
vi.stubGlobal('localStorage', stub)
afterAll(() => { vi.unstubAllGlobals() })
beforeEach(() => { store.clear(); vi.stubGlobal('localStorage', stub) })

const base = { token: 'TK', language: 'auto', keyterms: ['Esuhai'], roomFilter: undefined }
const build = (vadSilenceSecs?: unknown) => buildScribeWsParams({ ...base, vadSilenceSecs }) as {
  params: URLSearchParams; filterApplied: boolean; vadApplied: number
}

/** Every file under a directory, recursively — used to prove one storage key lives in exactly one file. */
const filesUnder = (dir: string): string[] =>
  readdirSync(new URL(`../${dir}`, import.meta.url), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => `${e.parentPath ?? e.path}/${e.name}`)

describe('the three steps', () => {
  it('1 · SPEECH_RHYTHM_OPTIONS có đúng ba mục, theo thứ tự slow · normal · fast', () => {
    expect(rhythm.SPEECH_RHYTHM_OPTIONS).toHaveLength(3)
    expect(rhythm.SPEECH_RHYTHM_OPTIONS.map((o) => o.value)).toEqual(['slow', 'normal', 'fast'])
  })

  it('2 · bậc giữa KHÔNG gửi gì cả, để cài đặt sẵn của máy chủ tiếp tục cầm trịch', () => {
    expect(rhythm.rhythmPauseSecs('normal')).toBeUndefined()
  })

  it('3 · hai bậc đầu-cuối nằm trong khoảng an toàn', () => {
    expect(rhythm.rhythmPauseSecs('slow')).toBe(2.4)
    expect(rhythm.rhythmPauseSecs('fast')).toBe(0.9)
    for (const v of [rhythm.rhythmPauseSecs('slow')!, rhythm.rhythmPauseSecs('fast')!]) {
      expect(v).toBeGreaterThanOrEqual(rhythm.PAUSE_SECS_MIN)
      expect(v).toBeLessThanOrEqual(rhythm.PAUSE_SECS_MAX)
    }
  })

  it('4 · hai đầu khoảng là 0.6 và 3', () => {
    expect(rhythm.PAUSE_SECS_MIN).toBe(0.6)
    expect(rhythm.PAUSE_SECS_MAX).toBe(3)
  })

  it('5 · isSpeechRhythm nhận đúng ba bậc và từ chối mọi thứ khác', () => {
    for (const v of ['slow', 'normal', 'fast']) expect(rhythm.isSpeechRhythm(v)).toBe(true)
    for (const v of ['auto', '', null, 2.4]) expect(rhythm.isSpeechRhythm(v)).toBe(false)
  })

  it('6 · lưu rồi đọc lại đi qua ĐÚNG một khoá; rác có sẵn trong bộ nhớ đọc thành mặc định, không ném lỗi', () => {
    rhythm.saveSpeechRhythm('fast')
    expect(store.get(rhythm.SPEECH_RHYTHM_KEY)).toBe('fast')
    expect(store.size).toBe(1)
    expect(rhythm.loadSpeechRhythm()).toBe('fast')

    store.set(rhythm.SPEECH_RHYTHM_KEY, 'rất chậm')
    expect(() => rhythm.loadSpeechRhythm()).not.toThrow()
    expect(rhythm.loadSpeechRhythm()).toBe(rhythm.SPEECH_RHYTHM_DEFAULT)
  })

  it('7 · clampPauseSecs kẹp cả hai đầu và cho giá trị hợp lệ đi thẳng', () => {
    expect(rhythm.clampPauseSecs(0.1)).toBe(0.6)
    expect(rhythm.clampPauseSecs(9)).toBe(3)
    expect(rhythm.clampPauseSecs(1.5)).toBe(1.5)
  })

  it('8 · clampPauseSecs trả undefined cho undefined, null, chuỗi rỗng và NaN', () => {
    expect(rhythm.clampPauseSecs(undefined)).toBeUndefined()
    expect(rhythm.clampPauseSecs(null)).toBeUndefined()
    expect(rhythm.clampPauseSecs('')).toBeUndefined()
    expect(rhythm.clampPauseSecs(NaN)).toBeUndefined()
  })
})

describe('the server has the last word', () => {
  it('9 · không gửi gì → giữ mặc định của máy chủ (1.5)', () => {
    const { params, vadApplied } = build(undefined)
    expect(vadApplied).toBe(1.5)
    expect(params.get('vad_silence_threshold_secs')).toBe('1.5')
  })

  it('10 · 2.4 đi thẳng vào handshake', () => {
    const { params, vadApplied } = build(2.4)
    expect(vadApplied).toBe(2.4)
    expect(params.get('vad_silence_threshold_secs')).toBe('2.4')
  })

  it('11 · quá cao (9) bị kẹp xuống 3', () => {
    const { params, vadApplied } = build(9)
    expect(vadApplied).toBe(3)
    expect(params.get('vad_silence_threshold_secs')).toBe('3')
  })

  it('12 · quá thấp (0.1) bị kéo lên 0.6', () => {
    const { params, vadApplied } = build(0.1)
    expect(vadApplied).toBe(0.6)
    expect(params.get('vad_silence_threshold_secs')).toBe('0.6')
  })

  it('13 · rác → mặc định của máy chủ, và không bao giờ có NaN trong chuỗi truy vấn', () => {
    for (const junk of ['fast', null, NaN]) {
      const { params, vadApplied } = build(junk)
      expect(vadApplied).toBe(1.5)
      expect(params.get('vad_silence_threshold_secs')).toBe('1.5')
      expect(params.toString()).not.toContain('NaN')
    }
  })

  it('14 · máy khách và máy chủ nói cùng một luật, con số nào cũng vậy', () => {
    for (const x of [0.1, 0.6, 0.9, 1.5, 2.4, 3, 9]) {
      expect(rhythm.clampPauseSecs(x)).toBe(build(x).vadApplied)
    }
  })
})

describe('the wire', () => {
  it('15 · asrTransport gửi đi và đọc câu trả lời về', () => {
    const src = read(TRANSPORT)
    expect(src).toContain('pauseSecs: opts.pauseSecs,')
    expect(src).toContain('asrVadSilenceSecs?: number')
    expect(src).toContain('pauseSecs: data.asrVadSilenceSecs')
  })

  it('16 · lane hỏi lúc lấy vé và giữ lại giá trị ĐÃ ÁP DỤNG', () => {
    const src = read(LANE)
    expect(src).toContain('pauseSecs: config.getPauseSecs?.(),')
    expect(src).toContain("asrPauseSecs = typeof session.pauseSecs === 'number' ? session.pauseSecs : null;")
    const from = src.indexOf('export interface OnlineDiagnostics {')
    expect(from).toBeGreaterThan(-1)
    expect(src.slice(from, src.indexOf('\n}', from))).toContain('asrPauseSecs: number | null;')
  })

  it('17 · facade nối getter, và khoá lưu trữ chỉ nằm ở đúng một file dưới src/', () => {
    expect(read(FACADE)).toContain('getPauseSecs: () => rhythmPauseSecs(speechRhythmRef.current),')
    const owners = filesUnder('src').filter((f) => readFileSync(f, 'utf8').includes('proyaku_online_speech_rhythm'))
    expect(owners).toHaveLength(1)
    expect(owners[0].endsWith('speechRhythm.ts')).toBe(true)
    expect(read(RHYTHM)).toContain("export const SPEECH_RHYTHM_KEY = 'proyaku_online_speech_rhythm';")
  })

  it('18 · không có endpoint mới nào được thêm vào: vẫn đúng 10 chỗ khớp pathname', () => {
    const hits = read(SERVER).match(/pathname === '\/online-api\//g) ?? []
    expect(hits).toHaveLength(10)
  })
})
