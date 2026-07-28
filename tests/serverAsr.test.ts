import { describe, it, expect } from 'vitest'
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
})

describe('buildScribeWsParams (TASK 11.1 / 11.13)', () => {
  const base = { token: 'TK', language: 'auto', keyterms: ['Esuhai', 'Sếp'] }

  it('sets VAD params, timestamps, language detection + one keyterm each; pins NO language, no no_verbatim, no audio_format by default', () => {
    const { params } = buildScribeWsParams({ ...base, roomFilter: undefined })
    expect(params.get('token')).toBe('TK')
    expect(params.get('commit_strategy')).toBe('vad')
    expect(params.get('vad_threshold')).toBe('0.4')
    expect(params.get('include_timestamps')).toBe('true')
    expect(params.get('include_language_detection')).toBe('true')
    expect(params.getAll('keyterms')).toEqual(['Esuhai', 'Sếp'])
    expect(params.get('language_code')).toBeNull()
    expect(params.get('no_verbatim')).toBeNull()
    expect(params.get('audio_format')).toBeNull()
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
