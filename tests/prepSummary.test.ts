import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getPrepSummary, savePrepSummary, clearPrepSummary } from '../src/lib/prepSummary'
import type { PrepSummary } from '../src/lib/prepSummary'
import { kbScopeId } from '../src/lib/kbscope'

// M14 — the AI brief has to survive the days between Chuẩn bị and the morning of the event, so it lives in
// localStorage. vitest runs in NODE: there is no localStorage at all, and prepSummary must not care. Every
// test installs its own in-memory store (and one installs a store that is FULL) as the global.

function memoryStorage() {
  const raw = new Map<string, string>()
  return {
    raw,
    getItem: (k: string): string | null => (raw.has(k) ? (raw.get(k) as string) : null),
    setItem: (k: string, v: string): void => { raw.set(k, String(v)) },
    removeItem: (k: string): void => { raw.delete(k) },
    clear: (): void => raw.clear(),
    key: (i: number): string | null => [...raw.keys()][i] ?? null,
    get length(): number { return raw.size },
  }
}

let store: ReturnType<typeof memoryStorage>

const sk = (scope: string) => `proyaku_prep_ai:${scope}`

const mk = (over: Partial<PrepSummary> = {}): PrepSummary => ({
  brief: 'Lễ 20 năm Esuhai · Hội trường A · nghi thức Kagami Biraki mở màn.',
  terms: ['Kagami Biraki = 鏡開き'],
  dir: 'vi2ja',
  docNames: ['kichban-gala.docx'],
  usedChars: 4_200,
  at: '2026-07-01T02:00:00.000Z',
  ...over,
})

beforeEach(() => {
  store = memoryStorage()
  vi.stubGlobal('localStorage', store)
})
afterEach(() => { vi.unstubAllGlobals() })

describe('prepSummary — the AI brief between Chuẩn bị and the event', () => {
  it('saves and reads back the same record', () => {
    const s = mk()
    savePrepSummary('c1', s)
    expect(getPrepSummary('c1', 'vi2ja')).toEqual(s)
  })

  it('the two directions are separate records and do not overwrite each other', () => {
    savePrepSummary('c1', mk({ dir: 'vi2ja', brief: 'Bối cảnh cho chiều Việt → Nhật' }))
    savePrepSummary('c1', mk({ dir: 'ja2vi', brief: '日本語→ベトナム語 の文脈', terms: ['鏡開き = Kagami Biraki'] }))

    expect(getPrepSummary('c1', 'vi2ja')?.brief).toBe('Bối cảnh cho chiều Việt → Nhật')
    expect(getPrepSummary('c1', 'ja2vi')?.brief).toBe('日本語→ベトナム語 の文脈')
    expect(getPrepSummary('c1', 'vi2ja')?.terms).toEqual(['Kagami Biraki = 鏡開き'])
    expect(getPrepSummary('c1', 'ja2vi')?.terms).toEqual(['鏡開き = Kagami Biraki'])
    // one shelf per scope, both directions inside it
    expect([...store.raw.keys()]).toEqual([sk('c1')])
  })

  it('an unsummarised session returns undefined', () => {
    expect(getPrepSummary('chua-tom-tat', 'vi2ja')).toBeUndefined()
    savePrepSummary('c1', mk({ dir: 'vi2ja' }))
    expect(getPrepSummary('c1', 'ja2vi')).toBeUndefined() // the other direction is still unsummarised
  })

  it('each scope has its own store, and a session in a series uses the series key', () => {
    const oneOff = { id: 'c1' }
    const inSeries = { id: 'c2', seriesId: 's1' }
    expect(kbScopeId(oneOff)).toBe('c1')
    expect(kbScopeId(inSeries)).toBe('series:s1')

    savePrepSummary(kbScopeId(oneOff), mk({ brief: 'buổi một lần' }))
    savePrepSummary(kbScopeId(inSeries), mk({ brief: 'kho chung của chuỗi' }))

    expect(getPrepSummary(kbScopeId(oneOff), 'vi2ja')?.brief).toBe('buổi một lần')
    expect(getPrepSummary(kbScopeId(inSeries), 'vi2ja')?.brief).toBe('kho chung của chuỗi')
    // the session's OWN id never holds the record of a session that belongs to a series
    expect(getPrepSummary('c2', 'vi2ja')).toBeUndefined()
    expect([...store.raw.keys()]).toEqual([sk('c1'), sk('series:s1')])
  })

  it('clearing one direction leaves the other one intact', () => {
    savePrepSummary('c1', mk({ dir: 'vi2ja', brief: 'VI' }))
    savePrepSummary('c1', mk({ dir: 'ja2vi', brief: 'JA' }))

    clearPrepSummary('c1', 'vi2ja')

    expect(getPrepSummary('c1', 'vi2ja')).toBeUndefined()
    expect(getPrepSummary('c1', 'ja2vi')?.brief).toBe('JA')
  })

  it('corrupt JSON returns nothing instead of throwing — and can be written over', () => {
    store.raw.set(sk('c1'), '{ khong phai JSON')
    expect(() => getPrepSummary('c1', 'vi2ja')).not.toThrow()
    expect(getPrepSummary('c1', 'vi2ja')).toBeUndefined()
    expect(() => clearPrepSummary('c1', 'vi2ja')).not.toThrow()

    store.raw.set(sk('c1'), '"mot chuoi, khong phai object"')
    expect(getPrepSummary('c1', 'vi2ja')).toBeUndefined()

    store.raw.set(sk('c1'), '{ khong phai JSON')
    savePrepSummary('c1', mk({ brief: 'ghi de len rac' }))
    expect(getPrepSummary('c1', 'vi2ja')?.brief).toBe('ghi de len rac')
  })

  it('a full localStorage fails silently — the operator keeps the brief already on screen', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError') },
      removeItem: () => {},
    })
    expect(() => savePrepSummary('c1', mk())).not.toThrow()
    expect(() => clearPrepSummary('c1', 'vi2ja')).not.toThrow()
    expect(getPrepSummary('c1', 'vi2ja')).toBeUndefined()
  })

  it('a record carrying only terms (no brief) is still kept', () => {
    savePrepSummary('c1', mk({ brief: '', terms: ['Esuhai', 'Ikusei Shuro'] }))
    const back = getPrepSummary('c1', 'vi2ja')
    expect(back).toBeDefined()
    expect(back?.brief).toBe('')
    expect(back?.terms).toEqual(['Esuhai', 'Ikusei Shuro'])
    // …but a record with neither is not a record at all
    savePrepSummary('c2', mk({ brief: '', terms: [] }))
    expect(getPrepSummary('c2', 'vi2ja')).toBeUndefined()
  })
})
