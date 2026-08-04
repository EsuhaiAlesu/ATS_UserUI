import { describe, it, expect, vi } from 'vitest'
// @ts-expect-error — the server is plain .mjs (no types); we only exercise pure exported helpers here.
import { buildRefinePrompt, pickScribeKeyterms, buildScribeWsParams } from '../server/online-api.mjs'
// @ts-expect-error — plain .mjs
import { getConfigStatus } from '../server/online-config.mjs'

describe('pickScribeKeyterms (TASK 11.1)', () => {
  it('drops terms over 20 chars (a long keyterm kills the whole session) and reports the dropped count', () => {
    const { kept, dropped } = pickScribeKeyterms('Esuhai, Chương trình Vinh danh, Sếp')
    expect(kept).toContain('Esuhai')
    expect(kept).toContain('Sếp')
    expect(kept).not.toContain('Chương trình Vinh danh') // 22 chars → dropped
    expect(dropped).toBe(1)
  })

  it('caps the list at 30', () => {
    const { kept, dropped } = pickScribeKeyterms(Array.from({ length: 40 }, (_, i) => `t${i}`).join(','))
    expect(kept.length).toBe(30)
    expect(dropped).toBe(10)
  })

  // PROMPT-10 TASK 1.3: a glossary line is `nguồn = đích`, and the whole line used to be dropped for
  // being over 20 chars — so proper nouns, the one thing the recogniser most needs, never reached it.
  it('tách dòng "nguồn = đích" thành hai dạng đọc thay vì bỏ cả dòng', () => {
    const { kept } = pickScribeKeyterms('Lê Long Sơn = レ・ロン・ソン')
    expect(kept).toContain('Lê Long Sơn')
    expect(kept).toContain('レ・ロン・ソン')
  })

  it('dòng không có dấu "=" giữ nguyên văn', () => {
    const { kept } = pickScribeKeyterms('Esuhai')
    expect(kept).toEqual(['Esuhai'])
  })

  it('xen kẽ theo dòng để những tên xếp trên giữ được CẢ HAI dạng trước khi chạm trần', () => {
    const corpus = Array.from({ length: 20 }, (_, i) => `Tên${i} = ナマエ${i}`).join('\n')
    const { kept } = pickScribeKeyterms(corpus)
    expect(kept.length).toBe(30)
    // 15 dòng đầu giữ đủ cặp nguồn+đích (không phải 30 nguồn rồi mới tới đích)
    expect(kept.slice(0, 4)).toEqual(['Tên0', 'ナマエ0', 'Tên1', 'ナマエ1'])
    expect(kept).toContain('ナマエ14')
  })

  it('một tên xuất hiện ở hai dòng chỉ tính một lần', () => {
    const { kept } = pickScribeKeyterms('Esuhai = エスハイ\nEsuhai = エスハイ')
    expect(kept).toEqual(['Esuhai', 'エスハイ'])
  })

  it('chỉ bỏ VẾ quá dài, không bỏ cả dòng', () => {
    const { kept, dropped } = pickScribeKeyterms('Sếp = Chương trình Vinh danh dài quá')
    expect(kept).toEqual(['Sếp'])
    expect(dropped).toBe(1)
  })
})

describe('buildScribeWsParams (TASK 11.1 / 11.13)', () => {
  const base = { token: 'TK', language: 'auto', keyterms: ['Esuhai', 'Sếp'] }

  it('sets VAD params, timestamps, language detection + one keyterm each; no no_verbatim, no audio_format by default', () => {
    const { params } = buildScribeWsParams({ ...base, roomFilter: undefined })
    expect(params.get('token')).toBe('TK')
    expect(params.get('commit_strategy')).toBe('vad')
    expect(params.get('vad_threshold')).toBe('0.4')
    expect(params.get('include_timestamps')).toBe('true')
    expect(params.get('include_language_detection')).toBe('true')
    expect(params.getAll('keyterms')).toEqual(['Esuhai', 'Sếp'])
    expect(params.get('no_verbatim')).toBeNull()
    expect(params.get('audio_format')).toBeNull()
  })

  // PROMPT-10 TASK 1: a two-way session is RESTRICTED to the event's two languages, not pinned to one.
  it('a two-way session is restricted to exactly Japanese + Vietnamese by default', () => {
    const { params } = buildScribeWsParams({ ...base, roomFilter: undefined })
    expect(params.get('language_code')).toBe('ja') // the whitelist leads
    expect(params.getAll('secondary_languages')).toEqual(['vi']) // the mic stays two-way
  })

  it('roomFilter three states: ON sets the parameter; OFF sets nothing (demo parity); absent inherits the off-by-default env', () => {
    const on = buildScribeWsParams({ ...base, roomFilter: true })
    expect(on.params.get('filter_background_audio')).toBe('true')
    expect(on.filterApplied).toBe(true)

    const off = buildScribeWsParams({ ...base, roomFilter: false })
    expect(off.params.get('filter_background_audio')).toBeNull()
    expect(off.filterApplied).toBe(false)

    const absent = buildScribeWsParams({ ...base, roomFilter: undefined })
    expect(absent.params.get('filter_background_audio')).toBeNull() // SCRIBE_FILTER_BACKGROUND defaults off
    expect(absent.filterApplied).toBe(false)
  })
})

describe('buildRefinePrompt (TASK 11.12 — read-only transcript)', () => {
  const prompt: string = buildRefinePrompt({
    sourceText: 'công ty Ê su hai', previewText: '', sourceLanguage: 'vi', targetLanguage: 'ja',
    sourceEmotion: '', sourcePace: undefined, recentFinals: [], sessionBrief: '',
    sessionTerms: [{ source: 'Ê su hai', target: 'エスハイ' }],
  })

  it('never asks for source_corrected and states the transcript is read-only', () => {
    expect(prompt).toContain('Return JSON only with keys: target_final, tts_text, emotion, tts_speed')
    expect(prompt).not.toContain('source_corrected')
    expect(prompt).toContain('READ-ONLY')
  })

  it('still shows the transcript + the session term and still asks for target_final / emotion / tts_speed', () => {
    expect(prompt).toContain('công ty Ê su hai')  // transcript is shown as evidence
    expect(prompt).toContain('Ê su hai → エスハイ')  // session term still travels
    expect(prompt).toContain('target_final')
    expect(prompt).toContain('emotion')
    expect(prompt).toContain('tts_speed')
  })
})

describe('getConfigStatus (TASK 11.10)', () => {
  it('reports all six keys but a required SUBSET; unknown slug ignored; absent/empty → all six', () => {
    const four = ['refine_key', 'tts_key', 'tts_voice_ja', 'tts_voice_vi']
    const s = getConfigStatus(four)
    expect(Object.keys(s.keys).length).toBe(6)
    expect(s.required).toEqual(four)
    expect(getConfigStatus(['refine_key', 'bogus']).required).toEqual(['refine_key']) // unknown ignored
    expect(getConfigStatus().required.length).toBe(6)
    expect(getConfigStatus([]).required.length).toBe(6)
  })

  it('ready follows required, not the full slug list', () => {
    const names = ['OPENAI_API_KEY', 'ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID', 'VI_ELEVENLABS_VOICE_ID', 'QWEN3_ASR_WS_BASE', 'QWEN3_ASR_API_KEY']
    const saved: Record<string, string | undefined> = {}
    for (const n of names) saved[n] = process.env[n]
    try {
      process.env.OPENAI_API_KEY = 'x'; process.env.ELEVENLABS_API_KEY = 'x'
      process.env.ELEVENLABS_VOICE_ID = 'x'; process.env.VI_ELEVENLABS_VOICE_ID = 'x'
      delete process.env.QWEN3_ASR_WS_BASE; delete process.env.QWEN3_ASR_API_KEY
      expect(getConfigStatus(['refine_key', 'tts_key', 'tts_voice_ja', 'tts_voice_vi']).ready).toBe(true) // 4 direct keys set
      expect(getConfigStatus().ready).toBe(false) // all six required → the two ASR keys are missing
    } finally {
      for (const n of names) { if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n] }
    }
  })
})

// PROMPT-10 TASK 1.1/1.2 — the language whitelist. The constants are read from env at MODULE LOAD, so
// each variant re-imports the server module with its own env (vi.resetModules + dynamic import).
describe('SCRIBE_LANGUAGE_WHITELIST (PROMPT-10 TASK 1)', () => {
  const load = async (env: Record<string, string | undefined>) => {
    const saved: Record<string, string | undefined> = {}
    for (const k of Object.keys(env)) { saved[k] = process.env[k]; if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k] }
    vi.resetModules()
    const mod = await import('../server/online-api.mjs')
    for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k] }
    return mod as unknown as { buildScribeWsParams: typeof buildScribeWsParams }
  }
  const base = { token: 'TK', keyterms: [] as string[], roomFilter: undefined }

  it('phiên hai chiều: một tiếng chính + một tiếng phụ, KHÔNG phải ghim một tiếng', async () => {
    const mod = await load({ SCRIBE_LANGUAGE_WHITELIST: 'ja,vi' })
    const { params } = mod.buildScribeWsParams({ ...base, language: 'auto' })
    expect(params.get('language_code')).toBe('ja')
    expect(params.getAll('secondary_languages')).toEqual(['vi'])
  })

  it('phiên một chiều dẫn bằng CHÍNH tiếng của nó, phần còn lại làm tiếng phụ', async () => {
    const mod = await load({ SCRIBE_LANGUAGE_WHITELIST: 'ja,vi' })
    const { params } = mod.buildScribeWsParams({ ...base, language: 'vi' })
    expect(params.get('language_code')).toBe('vi')
    expect(params.getAll('secondary_languages')).toEqual(['ja'])
  })

  it('dùng dạng csv khi nhà cung cấp không nhận tham số lặp', async () => {
    const mod = await load({ SCRIBE_LANGUAGE_WHITELIST: 'ja,vi,en', SCRIBE_SECONDARY_LANGUAGE_FORMAT: 'csv' })
    const { params } = mod.buildScribeWsParams({ ...base, language: 'auto' })
    expect(params.get('language_code')).toBe('ja')
    expect(params.get('secondary_languages')).toBe('vi,en')
    expect(params.getAll('secondary_languages')).toEqual(['vi,en']) // đúng MỘT tham số
  })

  it('tiếng chính không bao giờ bị liệt kê hai lần; khoảng trắng bị bỏ qua', async () => {
    const mod = await load({ SCRIBE_LANGUAGE_WHITELIST: ' ja , , vi , JA ' })
    const { params } = mod.buildScribeWsParams({ ...base, language: 'auto' })
    expect(params.get('language_code')).toBe('ja')
    expect(params.getAll('secondary_languages')).toEqual(['vi'])
  })

  it('whitelist rỗng khôi phục tự-dò tự do — đây là đường lùi không cần deploy', async () => {
    const mod = await load({ SCRIBE_LANGUAGE_WHITELIST: '' })
    const { params } = mod.buildScribeWsParams({ ...base, language: 'auto' })
    expect(params.get('language_code')).toBeNull()
    expect(params.getAll('secondary_languages')).toEqual([])
  })
})

// PROMPT-10 TASK 6.2 — the two prompt blocks.
describe('buildRefinePrompt — mảnh câu & phần nối (PROMPT-10 TASK 6)', () => {
  const build = (o: Record<string, unknown>) => buildRefinePrompt({
    sourceText: 'Chúng tôi rất vinh dự được đón tiếp', previewText: '', sourceLanguage: 'vi', targetLanguage: 'ja',
    sourceEmotion: '', sourcePace: undefined, recentFinals: [], sessionBrief: '', sessionTerms: [], ...o,
  }) as string

  it('một câu trọn vẹn KHÔNG mang chỉ dẫn mảnh câu nào', () => {
    const p = build({})
    expect(p).not.toContain('UNFINISHED FRAGMENT')
    expect(p).not.toContain('CONTINUATION')
  })

  it('mảnh câu được gọi đúng tên, và tiếng Nhật được dặn KHÔNG đóng câu', () => {
    const p = build({ sourceIsFragment: true })
    expect(p).toContain('UNFINISHED FRAGMENT')
    expect(p).toContain('です/ます/だ')
    expect(p).toContain('Translate ONLY the words that are actually present')
  })

  it('chiều dịch sang tiếng Việt có câu chữ riêng', () => {
    const p = build({ sourceIsFragment: true, targetLanguage: 'vi', sourceLanguage: 'ja' })
    expect(p).toContain('In Vietnamese: do not add a closing particle')
    expect(p).not.toContain('です/ます/だ')
  })

  it('khối mảnh câu nằm TRÊN phần transcript để mô hình đọc cảnh báo trước', () => {
    const p = build({ sourceIsFragment: true })
    expect(p.indexOf('UNFINISHED FRAGMENT')).toBeLessThan(p.indexOf('Source transcript:'))
  })

  it('một câu bình thường không bao giờ bị bảo là nối tiếp cái gì', () => {
    expect(build({ sourceIsFragment: true })).not.toContain('CONTINUATION')
  })

  it('nửa đầu được trích NGUYÊN VĂN, nói rõ đó là TIẾNG NGUỒN, và mô hình được dặn đừng lặp lại', () => {
    const p = build({ previousFragment: 'Chúng tôi rất vinh dự được đón tiếp' })
    expect(p).toContain('CONTINUATION')
    expect(p).toContain('First half, exactly as the recogniser heard it — SOURCE language, NOT a translation:\nChúng tôi rất vinh dự được đón tiếp')
    expect(p).toContain('Do NOT repeat, re-translate, or summarise the first half')
    // Cái nhãn cũ ("already translated") nói sai sự thật: chuỗi này là transcript tiếng nguồn.
    expect(p).not.toContain('First half, already translated')
  })

  it('hai cách vá có thể áp dụng cùng lúc, đúng thứ tự', () => {
    const p = build({ sourceIsFragment: true, previousFragment: 'nửa đầu' })
    expect(p.indexOf('CONTINUATION')).toBeLessThan(p.indexOf('UNFINISHED FRAGMENT'))
    expect(p.indexOf('UNFINISHED FRAGMENT')).toBeLessThan(p.indexOf('Source transcript:'))
  })
})
