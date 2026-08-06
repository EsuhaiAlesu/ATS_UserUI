import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { judgeGuided, GUIDED_OFF, type GuidedState } from '../src/lib/lanes/online/guidedScript'
import { createScriptMatcher } from '../src/lib/lanes/online/scriptMatcher'
import type { ScriptMatcherEntry } from '../src/lib/lanes/online/scriptMatcher'

// TASK 34 — the operator's cursor is asked BEFORE the automatic matcher.
//
// `onlineLane.ts` is a long-lived closure over a live WebSocket and is not instantiated anywhere in this
// repo's node test environment. So, exactly as PART 4 §24.8 case 9 did with `pick()`, the decision path is
// rebuilt here as a faithful copy driven by the REAL `judgeGuided` and the REAL matcher, and the lane's own
// wiring is pinned with source guards below. If the copy and the lane ever disagree, the guards go red.

const lane = readFileSync(new URL('../src/lib/lanes/online/onlineLane.ts', import.meta.url), 'utf8')

const ROWS: ScriptMatcherEntry[] = [
  { id: 'r1', src_lang: 'vi', src: 'Kính thưa quý vị đại biểu, quý vị khách quý.', dst_lang: 'ja', dst: 'ご来賓の皆様、ご列席の皆様。', status: 'approved' },
  { id: 'r2', src_lang: 'vi', src: 'Kính thưa toàn thể cán bộ nhân viên công ty Esuhai.', dst_lang: 'ja', dst: 'エスハイ社の社員の皆様。', status: 'approved' },
  { id: 'r3', src_lang: 'vi', src: 'Hôm nay chúng ta long trọng tổ chức lễ kỷ niệm hai mươi năm thành lập công ty.', dst_lang: 'ja', dst: '本日、私たちは創立二十周年記念式典を厳かに執り行います。', status: 'approved' },
  { id: 'r4', src_lang: 'vi', src: 'Xin trân trọng kính mời quý vị cùng hướng lên sân khấu.', dst_lang: 'ja', dst: '皆様、どうぞステージにご注目ください。', status: 'approved' },
]

type Outcome = {
  guidedReleases: number
  guidedMisses: number
  scriptSnaps: number
  refineCalled: boolean
  spokenLanguage: string
  lastScriptReason: string
}

/** The lane's `trySnapToScript` decision order, rebuilt. Guided first, then the automatic matcher. */
function runSentence(getGuided: (() => GuidedState | undefined) | undefined, heard: string, sourceLang: 'vi' | 'ja' = 'vi'): Outcome {
  const out: Outcome = { guidedReleases: 0, guidedMisses: 0, scriptSnaps: 0, refineCalled: false, spokenLanguage: '', lastScriptReason: '' }
  const matcher = createScriptMatcher(ROWS)

  const guided = getGuided?.() ?? GUIDED_OFF
  if (guided.armed) {
    const verdict = judgeGuided(guided, ROWS, heard)
    if (verdict.kind === 'release') {
      out.guidedReleases += 1
      out.lastScriptReason = `dẫn tay · dòng ${guided.index + 1} (${verdict.score})`
      out.spokenLanguage = verdict.language
      return out
    }
    if (verdict.kind === 'mismatch') out.guidedMisses += 1 // and FALL THROUGH, never return
  }

  const both = matcher.matchBothWays(heard, sourceLang)
  if (both.result.band === 'snap') {
    out.scriptSnaps += 1
    out.spokenLanguage = both.result.targetLanguage
    return out
  }
  out.refineCalled = true // nothing answered it — the ordinary machine-translation path
  return out
}

describe('guidedRelease — chưa bật thì không đổi gì', () => {
  it('1 · không có getGuided: câu trong kịch bản vẫn snap tự động', () => {
    const r = runSentence(undefined, ROWS[0].src)
    expect(r.guidedReleases).toBe(0)
    expect(r.scriptSnaps).toBe(1)
  })

  it('2 · chỉ TRỎ mà chưa BẬT thì cũng không phát gì', () => {
    const r = runSentence(() => ({ armed: false, index: 2 }), ROWS[0].src)
    expect(r.guidedReleases).toBe(0)
    expect(r.scriptSnaps).toBe(1)
  })
})

describe('guidedRelease — bật rồi', () => {
  it('3 · trỏ đúng dòng ⇒ phát nguyên văn, KHÔNG gọi refine', () => {
    const r = runSentence(() => ({ armed: true, index: 0 }), ROWS[0].src)
    expect(r.guidedReleases).toBe(1)
    expect(r.refineCalled).toBe(false)
  })

  it('4 · và lý do ghi rõ là dẫn tay, dòng mấy', () => {
    const r = runSentence(() => ({ armed: true, index: 0 }), ROWS[0].src)
    expect(r.lastScriptReason).toContain('dẫn tay')
    expect(r.lastScriptReason).toContain('dòng 1')
  })

  it('5 · TRỎ SAI không được làm tệ hơn khi tắt: bộ khớp tự động vẫn cứu được câu', () => {
    const r = runSentence(() => ({ armed: true, index: 0 }), ROWS[3].src)
    expect(r.guidedMisses).toBe(1)
    expect(r.scriptSnaps).toBe(1) // rơi xuống matcher và vẫn khớp đúng dòng 4
    expect(r.refineCalled).toBe(false)
  })

  it('6 · câu ngoài kịch bản: trượt dẫn, trượt khớp, đi đường dịch máy', () => {
    const r = runSentence(() => ({ armed: true, index: 0 }), 'Chiều nay trời Sài Gòn mưa rất to và kéo dài mãi không dứt.')
    expect(r.guidedMisses).toBe(1)
    expect(r.scriptSnaps).toBe(0)
    expect(r.refineCalled).toBe(true)
  })

  it('7 · giọng đọc nhận đúng thứ tiếng của BẢN DỊCH, không phải của câu nghe được', () => {
    expect(runSentence(() => ({ armed: true, index: 0 }), ROWS[0].src).spokenLanguage).toBe('ja')
    expect(runSentence(() => ({ armed: true, index: 0 }), ROWS[0].dst).spokenLanguage).toBe('vi')
  })
})

describe('guidedRelease — lane nối đúng như bản sao trên', () => {
  it('8 · start() đặt lại hai bộ đếm, và cổng dẫn đứng TRƯỚC bộ khớp tự động', () => {
    expect(lane).toContain('guidedReleases = 0;')
    expect(lane).toContain('guidedMisses = 0;')

    const from = lane.indexOf('const guided = config.getGuided?.() ?? GUIDED_OFF;')
    const auto = lane.indexOf('const both = scriptMatcher.matchBothWays(head, dl.source);')
    expect(from).toBeGreaterThan(0)
    expect(auto).toBeGreaterThan(from) // dẫn tay hỏi trước

    // trượt thì RƠI XUỐNG, không return — đây là ca 5 ở phía mã nguồn
    expect(lane).toContain('guidedMisses += 1;')
    // R5 (06/08): speakSnap nay nhận thêm chiều NGUỒN, để cổng "hiện tách khỏi đọc" có thứ mà đối chiếu
    // với phán quyết của router. Ý của khẳng định này không đổi — nhả dẫn tay vẫn phải ĐỌC LÊN.
    expect(lane).toContain('void speakSnap(verdict.target, verdict.language, guidedSource, lid, order)')
  })
})
