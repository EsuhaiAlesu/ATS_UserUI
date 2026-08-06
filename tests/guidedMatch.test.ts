import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  GUIDED_MATCH_KEY,
  GUIDED_MATCH_DEFAULT,
  GUIDED_MATCH_OPTIONS,
  loadGuidedMatch,
  saveGuidedMatch,
  guidedMatchFloor,
  guidedMatchLabel,
} from '../src/lib/lanes/online/guidedMatch'
import {
  judgeGuided,
  guidedBarFor,
  guidedSimilarity,
  GUIDED_FLOOR,
  GUIDED_MIN_CHARS,
  GUIDED_SHORT_LINE,
  GUIDED_SHORT_FLOOR,
} from '../src/lib/lanes/online/guidedScript'
import type { ScriptMatcherEntry } from '../src/lib/lanes/online/scriptMatcher'

// TASK 57 — the length floor used to be ABSOLUTE, and that quietly made a short script line
// unreleasable for ever: "Một…", "Hai…", "Kanpai!" are all in the 08/08 script, the operator presses
// them, the MC says exactly that, and the machine refused because "kanpai" is six characters. The
// microphone is at the mouth and a noise gate already sits in front of it — a second hard filter was one
// too many. So the floor is now measured against the ARMED LINE, a short line is held to a HIGHER
// similarity bar instead of being refused, and how strict any of it is became a four-step setting.

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

const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8')
// Comments stripped: a header sentence EXPLAINING why the hook is absent must stay legal.
const readCode = (p: string) => read(p)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n')

const row = (over: Partial<ScriptMatcherEntry> = {}): ScriptMatcherEntry => ({
  id: 'r1', src_lang: 'vi', src: 'Xin kính chào quý vị đại biểu', dst_lang: 'ja', dst: 'ご来賓の皆様、ようこそ',
  status: 'approved', ...over,
})
const armed = { armed: true, index: 0 }

describe('guidedMatch — bốn nấc độ khớp', () => {
  it('1 · đúng bốn nấc, đúng thứ tự, đúng sàn; nấc cuối là 0 = không đo', () => {
    expect(GUIDED_MATCH_OPTIONS.map((o) => o.value)).toEqual(['strict', 'normal', 'loose', 'open'])
    expect(GUIDED_MATCH_OPTIONS.map((o) => o.floor)).toEqual([0.6, 0.45, 0.3, 0])
    // Sàn phải giảm dần: một nấc "thoáng hơn" mà lại đòi giống hơn thì cái tên nói dối.
    const floors = GUIDED_MATCH_OPTIONS.map((o) => o.floor)
    expect([...floors].sort((a, b) => b - a)).toEqual(floors)
  })

  it('2 · mặc định là "Thường" — KHÔNG phải "Thả cửa"', () => {
    // Cố ý: sàn tương đối ở dưới đã đủ để nhả "Một…"/"Kanpai!". Mặc định thả cửa thì một con trỏ đặt
    // nhầm dòng sẽ đẩy hẳn một câu KHÁC ra loa hội trường bằng giọng người, và không rút lại được.
    expect(GUIDED_MATCH_DEFAULT).toBe('normal')
    expect(guidedMatchFloor(GUIDED_MATCH_DEFAULT)).toBe(GUIDED_FLOOR)
    expect(loadGuidedMatch()).toBe('normal')
  })

  it('3 · lưu rồi đọc lại; rác trong localStorage đọc ra mặc định, không phải "không đo"', () => {
    saveGuidedMatch('open')
    expect(store.get(GUIDED_MATCH_KEY)).toBe('open')
    expect(loadGuidedMatch()).toBe('open')
    expect(guidedMatchFloor(loadGuidedMatch())).toBe(0)

    store.set(GUIDED_MATCH_KEY, 'turbo')
    expect(loadGuidedMatch()).toBe('normal')
    // @ts-expect-error — cố tình đưa rác vào
    expect(guidedMatchFloor('turbo')).toBe(GUIDED_FLOOR)
    // @ts-expect-error — cố tình đưa rác vào
    expect(guidedMatchLabel('turbo')).toBe('Thường')
  })

  it('4 · localStorage hỏng (chế độ ẩn danh) thì trả mặc định chứ không nổ', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
    })
    expect(loadGuidedMatch()).toBe('normal')
    expect(() => saveGuidedMatch('loose')).not.toThrow()
  })
})

describe('guidedBarFor — dòng ngắn bị đòi giống hơn, không bị cấm', () => {
  it('5 · dòng dài giữ nguyên sàn đang chọn', () => {
    expect(guidedBarFor(30, 0.45)).toBe(0.45)
    expect(guidedBarFor(30, 0.6)).toBe(0.6)
    expect(guidedBarFor(GUIDED_SHORT_LINE, 0.45)).toBe(0.45) // đúng vạch = chưa phải dòng ngắn
  })

  it('6 · dòng ngắn nâng lên 0,8 — nhưng không bao giờ HẠ sàn đang chọn', () => {
    expect(guidedBarFor(6, 0.45)).toBe(GUIDED_SHORT_FLOOR)
    expect(guidedBarFor(3, 0.3)).toBe(GUIDED_SHORT_FLOOR)
    expect(guidedBarFor(6, 0.9)).toBe(0.9)
  })

  it('7 · "thả cửa" là 0 ở MỌI độ dài — nấc đó bỏ hẳn việc đo', () => {
    expect(guidedBarFor(6, 0)).toBe(0)
    expect(guidedBarFor(400, 0)).toBe(0)
    expect(guidedBarFor(0, 0.45)).toBe(0.45) // không đo được độ dài thì giữ sàn thường
  })
})

describe('judgeGuided — ba dòng ngắn của kịch bản 08/08 phải nhả được', () => {
  it('8 · "Kanpai!" nhả được: đòi 6 ký tự vì dòng chỉ dài 6', () => {
    const v = judgeGuided(armed, [row({ src: 'Kanpai!', dst: '乾杯！' })], 'Kanpai!')
    expect(v.kind).toBe('release')
    if (v.kind === 'release') {
      expect(v.target).toBe('乾杯！')
      expect(v.language).toBe('ja')
    }
  })

  it('9 · "Một..." nhả được, mà "Hai..." bấm nhầm vào dòng đó thì không', () => {
    const rows = [row({ src: 'Một...', dst: '一…' })]
    expect(judgeGuided(armed, rows, 'Một...').kind).toBe('release')
    const wrong = judgeGuided(armed, rows, 'Hai...')
    expect(wrong.kind).toBe('mismatch')
    // Trượt vì KHÔNG GIỐNG, chứ không phải vì "quá ngắn" — sàn ngắn mới là thứ chặn nó.
    if (wrong.kind === 'mismatch') expect(wrong.reason).toContain('không giống')
  })

  it('10 · sàn độ dài vẫn giữ cho dòng DÀI: một tiếng ậm ừ không nhả nổi câu 28 ký tự', () => {
    const v = judgeGuided(armed, [row()], 'Ừ')
    expect(v.kind).toBe('mismatch')
    if (v.kind === 'mismatch') expect(v.reason).toContain(`/${GUIDED_MIN_CHARS} ký tự`)
  })

  it('11 · "thả cửa": bấm dòng nào nhả dòng đó, kể cả nghe ra một tiếng ậm ừ', () => {
    const v = judgeGuided(armed, [row()], 'Ừ', 0)
    expect(v.kind).toBe('release')
  })

  // Ca này trước đây dùng một TIỀN TỐ ("Kính thưa quý vị đại biểu" của dòng dài gấp đôi) rồi khẳng định
  // nấc lỏng phải NHẢ. Đó chính là lỗi "kịch bản nhảy trước MC": bốn nấc sinh ra để cân xem câu nghe được
  // GIỐNG dòng tới đâu, không phải để cân xem MC đã đọc XONG dòng chưa. Nay câu thử là một lượt đọc TRỌN
  // dòng nhưng nghe sai vài chữ — đúng thứ bốn nấc phải cân — và ca 12b dưới khoá lại phần còn lại.
  it('12 · nấc "Chặt" vẫn chặn được câu na ná mà nấc "Thường" cho qua', () => {
    const rows = [row({ src: 'Kính thưa quý vị đại biểu và toàn thể quý khách', dst: 'ご来賓の皆様' })]
    const heard = 'Kính thưa quý bà quý ông và toàn thể quý khách'
    const score = guidedSimilarity(heard, rows[0].src)
    expect(score).toBeGreaterThan(0.3)   // fixture phải nằm GIỮA hai nấc, nếu không ca này không đo gì cả
    expect(score).toBeLessThan(0.82)
    expect(judgeGuided(armed, rows, heard, 0.3).kind).toBe('release')
    expect(judgeGuided(armed, rows, heard, 0.82).kind).toBe('mismatch')
  })

  it('12b · KHÔNG nấc nào nhả một dòng MC mới đọc được một nửa — kể cả nấc lỏng nhất', () => {
    const rows = [row({ src: 'Kính thưa quý vị đại biểu và toàn thể quý khách', dst: 'ご来賓の皆様' })]
    const half = 'Kính thưa quý vị đại biểu'
    for (const floor of [0.3, 0.45, 0.6, 0.82]) {
      const v = judgeGuided(armed, rows, half, floor)
      expect(v.kind, `sàn ${floor}`).toBe('mismatch')
    }
  })

  it('13 · dòng chưa duyệt thì không nấc nào nhả được — kể cả "thả cửa"', () => {
    const rows = [row({ status: 'draft', src: 'Kanpai!', dst: '乾杯！' })]
    expect(judgeGuided(armed, rows, 'Kanpai!', 0).kind).toBe('off')
  })
})

describe('nối dây — nấc trong Cài đặt phải chạy tới đúng chỗ đo', () => {
  const LANE = read('../src/lib/lanes/online/onlineLane.ts')
  const FACADE = read('../src/lib/lanes/online/index.ts')
  const SETTINGS = read('../src/pages/Settings.tsx')

  it('14 · onlineLane hỏi sàn qua config, và đọc LẠI ở từng câu (không nhớ lúc khởi động)', () => {
    expect(LANE).toContain('getGuidedFloor?: () => number')
    expect(LANE).toContain('config.getGuidedFloor?.() ?? GUIDED_FLOOR')
    // Đọc ngay tại chỗ gọi judgeGuided ⇒ đổi nấc giữa buổi là ăn ngay câu sau.
    const call = LANE.slice(LANE.indexOf('judgeGuided(guided'), LANE.indexOf('judgeGuided(guided') + 160)
    expect(call).toContain('getGuidedFloor')
  })

  it('15 · facade nối nấc đã lưu vào lane, và nhớ hộ khi tắt trình duyệt', () => {
    expect(FACADE).toContain('getGuidedFloor: () => guidedMatchFloor(loadGuidedMatch())')
    expect(FACADE).toContain("from './guidedMatch'")
    expect(FACADE).toContain("export { default as OnlineGuidedMatchSettings } from './components/OnlineGuidedMatchSettings'")
  })

  it('16 · màn Cài đặt có gắn mục này, đúng một chỗ', () => {
    expect(SETTINGS).toContain('OnlineGuidedMatchSettings')
    expect(SETTINGS.match(/<OnlineGuidedMatchSettings \/>/g)?.length).toBe(1)
    expect(SETTINGS).toContain('Chế độ ONLINE — Độ khớp khi dẫn theo kịch bản')
  })

  it('17 · màn cài đặt KHÔNG được gọi useOnlineLane (trang cấu hình không dựng phiên chạy)', () => {
    const UI = readCode('../src/lib/lanes/online/components/OnlineGuidedMatchSettings.tsx')
    expect(UI).not.toContain('useOnlineLane')
    expect(UI).toContain('saveGuidedMatch')
  })

  it('18 · sàn độ dài trong guidedScript là TƯƠNG ĐỐI theo dòng, không còn là số tuyệt đối', () => {
    const CODE = readCode('../src/lib/lanes/online/guidedScript.ts')
    expect(CODE).toContain('Math.min(GUIDED_MIN_CHARS, lineLength)')
    expect(CODE).toContain('guidedBarFor(lineLength, floor)')
    // Nếu ai đó bỏ `floor > 0` thì nấc "thả cửa" lại đi chặn câu ngắn, đúng thứ vừa sửa.
    expect(CODE).toContain('floor > 0 && text.length < need')
  })
})
