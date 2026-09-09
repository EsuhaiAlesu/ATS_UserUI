import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  SPEECH_RHYTHM_OPTIONS,
  SPEECH_RHYTHM_DEFAULT,
  PAUSE_SECS_MIN,
  PAUSE_SECS_MAX,
  RHYTHM_ADAPTIVE_MAX_MS,
  isSpeechRhythm,
  rhythmPauseSecs,
  rhythmCommitWindows,
  rhythmUsesManualCommit,
  clampPauseSecs,
  speechRhythmLabel,
  type SpeechRhythm,
} from '../src/lib/lanes/online/speechRhythm'
import {
  createSpeechPauseProfile,
  recommendStableWindows,
  STABLE_WINDOW_MAX_MS,
} from '../src/lib/lanes/online/speechPauseProfile'
import {
  SCRIBE_MANUAL_SENTENCE_STABLE_MS,
  SCRIBE_MANUAL_LONG_STABLE_MS,
} from '../src/lib/lanes/online/scribeManualCommit'
// @ts-expect-error — plain .mjs
const { buildScribeWsParams } = await import('../server/online-api.mjs')

// TASK 24 — "nhịp nói của buổi", the full version. PART 2's three-step knob only moved the RECOGNISER's
// silence backstop (~1.5s). The 03/08 measurements showed the thing that actually cuts a sentence is the
// CLIENT pair — the 600/800ms stability windows `scribeManualCommit` waits before committing a partial
// that already reads as finished. The operator's "one breath and it becomes a sentence" is the 600ms.
// So every step now carries BOTH, a fourth step learns the speaker's own rhythm under a wider ceiling,
// and the knob lives in Cài đặt. This suite REPLACES §13.7's — three of its cases pinned wiring this
// part removed (`getPauseSecs`/`asrPauseSecs`) or a count now pinned by tests/sessionBoxes.test.ts.

const base = { token: 't', language: 'auto', keyterms: [] as string[], roomFilter: undefined }

describe('speechRhythm — the anti-fragment knob', () => {
  it('1 · đúng NĂM nấc, đúng thứ tự, và số giây gửi lên đúng như đã chốt', () => {
    expect(SPEECH_RHYTHM_OPTIONS.map((o) => o.value)).toEqual(['slow', 'normal', 'fast', 'adaptive', 'vendor'])
    expect(SPEECH_RHYTHM_OPTIONS.map((o) => o.secs)).toEqual([2.4, undefined, 0.9, 2.4, 3.0])
    // Nấc giữa cố ý KHÔNG gửi gì lên, để cài đặt sẵn của máy chủ giữ quyền.
    expect(SPEECH_RHYTHM_OPTIONS[1].secs).toBeUndefined()
    // Nấc thứ năm nằm đúng ở PAUSE_SECS_MAX, và KHÔNG nấc nào khác chạm tới trần đó: nếu có, im lặng lại
    // giành lại việc cắt câu và nấc này mất hết ý nghĩa.
    expect(SPEECH_RHYTHM_OPTIONS[4].secs).toBe(PAUSE_SECS_MAX)
    for (const o of SPEECH_RHYTHM_OPTIONS.slice(0, 4)) {
      expect(o.secs === undefined || o.secs < PAUSE_SECS_MAX, String(o.value)).toBe(true)
    }
  })

  it('2 · mặc định là "vendor" — chạy liền mạch, không bao giờ cắt vì dấu câu (chốt bàn giao 26/08)', () => {
    expect(SPEECH_RHYTHM_DEFAULT).toBe('vendor')
    expect(rhythmPauseSecs(SPEECH_RHYTHM_DEFAULT)).toBe(PAUSE_SECS_MAX)
    expect(rhythmUsesManualCommit(SPEECH_RHYTHM_DEFAULT)).toBe(false)
    // Nấc "normal" vẫn phải giữ nguyên hành vi cũ cho ai chọn tay nó.
    expect(rhythmPauseSecs('normal')).toBeUndefined()
  })

  it('3 · nấc nào có gửi giây thì giây đó nằm trong khoảng an toàn', () => {
    for (const o of SPEECH_RHYTHM_OPTIONS) {
      if (o.secs === undefined) continue
      expect(o.secs).toBeGreaterThanOrEqual(PAUSE_SECS_MIN)
      expect(o.secs).toBeLessThanOrEqual(PAUSE_SECS_MAX)
    }
  })

  it('4 · rác bị loại, nhãn luôn đọc được', () => {
    expect(isSpeechRhythm('slow')).toBe(true)
    expect(isSpeechRhythm('adaptive')).toBe(true)
    expect(isSpeechRhythm('turbo')).toBe(false)
    expect(isSpeechRhythm(null)).toBe(false)
    expect(speechRhythmLabel('fast')).toBe('MC nói liền mạch')
  })

  it('5 · mỗi nấc mang theo cặp mốc chờ phía client, tăng dần theo độ chậm', () => {
    expect(rhythmCommitWindows('fast')).toMatchObject({ sentenceMs: 450, longMs: 650, adaptive: false })
    expect(rhythmCommitWindows('normal')).toMatchObject({ sentenceMs: 600, longMs: 800, adaptive: false })
    expect(rhythmCommitWindows('slow')).toMatchObject({ sentenceMs: 1_100, longMs: 1_400, adaptive: false })
    // "Bình thường" PHẢI bằng đúng hai hằng số gốc, nếu không thì mặc định đã đổi hành vi của người
    // chưa từng mở Cài đặt.
    expect(rhythmCommitWindows('normal').sentenceMs).toBe(SCRIBE_MANUAL_SENTENCE_STABLE_MS)
    expect(rhythmCommitWindows('normal').longMs).toBe(SCRIBE_MANUAL_LONG_STABLE_MS)
    const asc = (['fast', 'normal', 'slow'] as SpeechRhythm[]).map((v) => rhythmCommitWindows(v).sentenceMs)
    expect(asc).toEqual([...asc].sort((a, b) => a - b))
  })

  it('6 · chỉ nấc tự học mới cho phép số đo đè lên, và trần của nó rộng hơn', () => {
    const ad = rhythmCommitWindows('adaptive')
    expect(ad.adaptive).toBe(true)
    expect(ad.maxMs).toBe(RHYTHM_ADAPTIVE_MAX_MS)
    expect(RHYTHM_ADAPTIVE_MAX_MS).toBeGreaterThan(STABLE_WINDOW_MAX_MS)
    for (const v of ['slow', 'normal', 'fast'] as SpeechRhythm[]) {
      const w = rhythmCommitWindows(v)
      expect(w.adaptive).toBe(false)
      expect(w.maxMs).toBe(w.sentenceMs)
    }
  })

  it('7 · trần rộng hơn thật sự cởi trói cho mốc chờ đã học được', () => {
    const gaps = Array.from({ length: 12 }, () => 1_600)
    expect(recommendStableWindows(gaps)?.sentenceMs).toBe(STABLE_WINDOW_MAX_MS)          // trần cũ ép xuống 1_100
    expect(recommendStableWindows(gaps, RHYTHM_ADAPTIVE_MAX_MS)?.sentenceMs).toBe(1_720) // 1_600 + 120 biên
  })

  it('8 · nấc lạ rơi về "normal", không rơi về undefined', () => {
    expect(rhythmCommitWindows('turbo' as never)).toMatchObject({ sentenceMs: 600, longMs: 800 })
  })

  it('9 · luật chọn của lane, chép lại nguyên văn', () => {
    // Bản sao của onlineLane.stableCommitWindows() trên một hồ sơ đã đo đủ 12 nhịp 1_600ms.
    const profile = createSpeechPauseProfile()
    for (let i = 0; i < 12; i += 1) profile.observe(1_600, 'ja')
    const pick = (v: SpeechRhythm): number => {
      // 26/08: lane hỏi thẳng nấc 'normal', không hỏi qua hằng số mặc định — đổi mặc định không được
      // lặng lẽ đổi hành vi của nấc mà người vận hành đã chọn tay.
      if (v === 'normal') return profile.windows('ja')!.sentenceMs
      const rung = rhythmCommitWindows(v)
      if (!rung.adaptive) return rung.sentenceMs
      return profile.windows('ja', rung.maxMs)?.sentenceMs ?? rung.sentenceMs
    }
    expect(pick('fast')).toBe(450)                       // người vận hành đã nói — máy không cãi
    expect(pick('slow')).toBe(1_100)
    expect(pick('normal')).toBe(STABLE_WINDOW_MAX_MS)    // y như trước khi có nút này
    expect(pick('adaptive')).toBe(1_720)                 // nhịp thật của người đang nói
  })

  it('10 · chưa đo đủ thì nấc tự học chạy bằng số tạm, không tụt về 600ms', () => {
    const profile = createSpeechPauseProfile()
    profile.observe(1_600, 'ja')
    const rung = rhythmCommitWindows('adaptive')
    expect(profile.windows('ja', rung.maxMs)).toBeNull()
    expect({ sentenceMs: rung.sentenceMs, longMs: rung.longMs }).toEqual({ sentenceMs: 900, longMs: 1_100 })
    expect(rung.sentenceMs).toBeGreaterThan(SCRIBE_MANUAL_SENTENCE_STABLE_MS)
  })

  it('11 · clampPauseSecs: rác ra undefined, ngoài khoảng bị kẹp, số hợp lệ đi thẳng', () => {
    for (const junk of [undefined, null, '', 'xin chào', NaN]) expect(clampPauseSecs(junk)).toBeUndefined()
    expect(clampPauseSecs(0.1)).toBe(PAUSE_SECS_MIN)
    expect(clampPauseSecs(99)).toBe(PAUSE_SECS_MAX)
    expect(clampPauseSecs(1.8)).toBe(1.8)
  })
})

describe('speechRhythm — the server has the last word', () => {
  it('12 · không gửi gì thì giữ nguyên 1.5s của máy chủ', () => {
    const { params, vadApplied } = buildScribeWsParams({ ...base })
    expect(params.get('vad_silence_threshold_secs')).toBe('1.5')
    expect(vadApplied).toBe(1.5)
  })

  it('13 · số giây của một nấc hợp lệ đi qua đúng nguyên', () => {
    for (const secs of [2.4, 0.9]) {
      const { params, vadApplied } = buildScribeWsParams({ ...base, vadSilenceSecs: secs })
      expect(params.get('vad_silence_threshold_secs')).toBe(String(secs))
      expect(vadApplied).toBe(secs)
    }
  })

  it('14 · máy chủ tự kẹp — client sửa tay không đẩy ra ngoài khoảng được', () => {
    expect(buildScribeWsParams({ ...base, vadSilenceSecs: 0.05 }).vadApplied).toBe(0.6)
    expect(buildScribeWsParams({ ...base, vadSilenceSecs: 60 }).vadApplied).toBe(3)
  })

  it('15 · rác không bao giờ làm hỏng lần bắt tay', () => {
    for (const junk of [null, 'nhanh', NaN, {}]) {
      expect(buildScribeWsParams({ ...base, vadSilenceSecs: junk }).vadApplied).toBe(1.5)
    }
  })

  it('16 · ba tham số VAD còn lại không xê dịch', () => {
    const { params } = buildScribeWsParams({ ...base, vadSilenceSecs: 0.9 })
    expect(params.get('vad_threshold')).toBe('0.4')
    expect(params.get('min_speech_duration_ms')).toBe('100')
    expect(params.get('min_silence_duration_ms')).toBe('100')
    expect(params.get('commit_strategy')).toBe('vad')
  })
})

describe('speechRhythm — the step that never closes a turn', () => {
  it('17 · chỉ nấc thứ năm được miễn; bốn nấc kia vẫn đóng lượt như cũ', () => {
    expect(rhythmUsesManualCommit('vendor')).toBe(false)
    for (const v of ['slow', 'normal', 'fast', 'adaptive'] as SpeechRhythm[]) {
      expect(rhythmUsesManualCommit(v), v).toBe(true)
    }
  })

  it('18 · nấc lạ giữ hành vi CŨ chứ không lặng lẽ tắt việc đóng lượt', () => {
    expect(rhythmUsesManualCommit('turbo' as never)).toBe(true)
  })

  it('19 · hai mốc chờ của nấc thứ năm còn đó cho trang Cài đặt, nhưng không còn quyết định gì', () => {
    expect(rhythmCommitWindows('vendor')).toMatchObject({ sentenceMs: 900, longMs: 1_200, adaptive: false })
    expect(rhythmUsesManualCommit('vendor')).toBe(false)
  })

  it('20 · cổng chặn phải đứng TRƯỚC lúc hẹn giờ, không phải sau', () => {
    const lane = readFileSync(new URL('../src/lib/lanes/online/onlineLane.ts', import.meta.url), 'utf8')
    const from = lane.indexOf('function scheduleStableCommit')
    expect(from).toBeGreaterThan(0)
    const body = lane.slice(from)
    const gate = body.indexOf('rhythmUsesManualCommit(loadSpeechRhythm())')
    const timer = body.indexOf('scribeCommitTimer = setTimeout')
    expect(gate).toBeGreaterThan(-1)
    expect(timer).toBeGreaterThan(-1)
    expect(gate).toBeLessThan(timer)
  })
})

describe('nấc thứ năm phải tự mô tả đúng', () => {
  const ui = readFileSync(new URL('../src/lib/lanes/online/components/OnlineRhythmSettings.tsx', import.meta.url), 'utf8')
  const doc = readFileSync(new URL('../docs/ONLINE-LANE-UI-API.md', import.meta.url), 'utf8')

  it('21 · hàm phụ đọc thẳng danh sách nấc, không đi qua facade', () => {
    expect(ui).toContain('const usesManualCommit = (v: SpeechRhythm): boolean =>')
    expect(ui).toContain("SPEECH_RHYTHM_OPTIONS.find((o) => o.value === v)?.manualCommit !== false")
  })

  it('22 · nhãn xám không còn in một con số đã chết', () => {
    expect(ui).toContain("'chốt khi im 2,5s'")
    const from = ui.indexOf('{o.label}')
    const to = ui.indexOf('{o.hint}')
    expect(from).toBeGreaterThan(0)
    expect(to).toBeGreaterThan(from)
    expect(ui.slice(from, to)).toContain('o.manualCommit === false')
  })

  it('23 · toast cũng nói đúng sự thật', () => {
    expect(ui).toContain('máy nghe chạy liền mạch, chốt khi chữ đứng im 2,5s')
  })

  it('24 · dòng tóm tắt cũng nói đúng sự thật', () => {
    expect(ui).toContain('máy nghe không bao giờ bị cắt vì dấu chấm')
  })

  it('25 · không lén thêm import mới vào facade cho một sửa đổi hiển thị', () => {
    const from = ui.indexOf('import {')
    const to = ui.indexOf("} from '../index'")
    expect(from).toBeGreaterThan(-1)
    expect(to).toBeGreaterThan(from)
    expect(ui.slice(from, to)).not.toContain('rhythmUsesManualCommit')
  })

  it('26 · tài liệu đếm đúng số nấc', () => {
    expect(doc).toContain('(five steps, lives in Settings)')
    expect(doc).not.toContain('(four steps, lives in Settings)')
    expect(doc).not.toContain('Each of the four steps')
  })
})

// PROMPT-19 (07/09/2026) — nhịp nói bày bằng THANH KÉO và trở lại màn Cài đặt.
describe('thanh kéo nhịp nói', () => {
  const ui = readFileSync(new URL('../src/lib/lanes/online/components/OnlineRhythmSettings.tsx', import.meta.url), 'utf8')
  const settings = readFileSync(new URL('../src/pages/Settings.tsx', import.meta.url), 'utf8')

  it('27 · thanh kéo đi đúng năm nấc, xếp theo thời gian chờ TĂNG DẦN', () => {
    expect(ui).toContain("const SLIDER_ORDER: readonly SpeechRhythm[] = ['fast', 'normal', 'adaptive', 'slow', 'vendor']")
    // Bốn nấc còn chốt theo dấu câu phải đơn điệu tăng, nếu không thì kéo sang phải lại hoá ra chờ ít hơn.
    const waits = (['fast', 'normal', 'adaptive', 'slow'] as SpeechRhythm[]).map((v) => rhythmCommitWindows(v).sentenceMs)
    expect(waits).toEqual([...waits].sort((a, b) => a - b))
    expect(new Set(waits).size).toBe(waits.length)
    // Nấc cuối là nấc KHÁC LOẠI: nó không chờ lâu hơn, nó không chốt vì dấu câu.
    expect(rhythmUsesManualCommit('vendor')).toBe(false)
    // Và nấc 'normal' KHÔNG chờ cố định 600ms như hàng của nó trong bảng: `stableCommitWindows` trong
    // `onlineLane` hỏi thẳng `rhythm === 'normal'` rồi giao cho bộ tự đo (0,4–1,1s). Chữ hiện ra phải nói
    // đúng điều đó, ở CẢ HAI chỗ — lời chú dưới thanh kéo và câu báo lúc chọn.
    expect(SPEECH_RHYTHM_OPTIONS[1].value).toBe('normal')
    expect(SPEECH_RHYTHM_OPTIONS[1].hint).toContain('0,4–1,1s')
    expect(ui).toContain("const selfMeasures = w.adaptive || v === 'normal'")
  })

  it('28 · thứ tự bày KHÔNG được lấy từ SPEECH_RHYTHM_OPTIONS — nấc dự phòng vẫn phải là Bình thường', () => {
    // `rhythmCommitWindows` rơi về SPEECH_RHYTHM_OPTIONS[1] theo CHỈ SỐ. Nếu ai đó xếp lại mảng gốc cho
    // khớp ĐÚNG thanh kéo thì [1] tình cờ vẫn là 'normal'; mọi phép xếp lại khác thì đẩy một nấc lạ vào
    // vị trí đó và nấc dự phòng lặng lẽ đổi theo. Nên ghim TRỌN cả hai mảng, không ghim mỗi [1].
    expect(SPEECH_RHYTHM_OPTIONS[1].value).toBe('normal')
    expect(SPEECH_RHYTHM_OPTIONS.map((o) => o.value)).toEqual(['slow', 'normal', 'fast', 'adaptive', 'vendor'])
    expect(rhythmCommitWindows('khong-co-nac-nay' as SpeechRhythm)).toEqual(rhythmCommitWindows('normal'))
  })

  it('29 · vị trí thanh kéo không bao giờ rơi về mép trái vì một giá trị lạ', () => {
    // Hai lưới khác nhau, đừng lẫn. Chữ lạ trong localStorage đã bị `loadSpeechRhythm()` đưa về
    // SPEECH_RHYTHM_DEFAULT ('vendor', mép PHẢI) từ trước khi tới đây. Lưới Ở ĐÂY là lưới của KIỂU DỮ
    // LIỆU: nếu một nấc hợp lệ nào đó vắng mặt trong SLIDER_ORDER thì `indexOf` trả -1, và -1 phải rơi
    // về 'normal' chứ không rơi về mép trái — mép trái là nấc cắt sớm nhất, đúng cái hỏng mà nút này
    // sinh ra để tránh.
    // ĐẾM, không phải `toContain`: tệp này có HAI bản thanh kéo (bản màn Cài đặt và bản rail Bảng điều
    // khiển), nên hỏi "có xuất hiện không" là xanh ngay cả khi một trong hai bản bị phá.
    // Và BỎ CHÚ THÍCH TRƯỚC KHI ĐẾM: chỉ đếm chữ thô thì cách vá kiểu "bọc dòng cũ vào /* */ rồi viết
    // dòng hỏng bên dưới" vẫn xanh — chốt chặn còn nằm đó nhưng không còn chạy nữa.
    const code = ui.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    const guard = "SLIDER_ORDER.indexOf(value) >= 0 ? SLIDER_ORDER.indexOf(value) : SLIDER_ORDER.indexOf('normal')"
    expect(code.split(`const at = ${guard}`).length - 1).toBe(2)
    expect(code).not.toContain('Math.max(0, SLIDER_ORDER.indexOf(value))')
    // CÓ chốt chặn chưa đủ, phải THẬT SỰ DÙNG nó. Chốt còn nguyên mà ô thanh kéo lại đọc thẳng
    // `SLIDER_ORDER.indexOf(value)` thì mép trái vẫn quay lại y như cũ. Nên ghim luôn cái mà MỖI ô
    // `type="range"` nhận vào: cả hai đều phải nhận `at`.
    const binds = [...code.matchAll(/type="range"[\s\S]*?value=\{([^}]*)\}/g)].map((m) => m[1].trim())
    expect(binds).toEqual(['at', 'at'])
  })

  it('30 · là thanh kéo thật, không còn năm ô tròn', () => {
    // Cũng đếm: hai bản thanh kéo, hai lần. Bản rail bị trả về năm ô tròn thì ca này phải đỏ.
    expect(ui.split('type="range"').length - 1).toBe(2)
    expect(ui.split('aria-label="Nhịp nói của buổi"').length - 1).toBe(2)
    expect(ui).not.toContain('role="radiogroup"')
    expect(ui).not.toContain('type="radio"')
  })

  it('31 · khối "Nhịp nói của buổi" nằm NGOÀI vòng ẩn SHOW_ONLINE_TUNING', () => {
    const rh = settings.indexOf('<Section id="rh"')
    const hidden = settings.indexOf('{SHOW_ONLINE_TUNING && (<>')
    expect(rh).toBeGreaterThan(-1)
    expect(hidden).toBeGreaterThan(-1)
    expect(rh).toBeLessThan(hidden)
    // Đúng MỘT khối rh. Bỏ sót bước xoá khối cũ thì kho còn lại một khối chết trùng id HTML mà không
    // cổng nào bắt được — mã vẫn dịch, test vẫn xanh, số ca vẫn đủ.
    expect(settings.split('<Section id="rh"').length - 1).toBe(1)
    // Ba khối kia vẫn ẩn.
    for (const id of ['ms', 'gm', 'lp']) {
      expect(settings.indexOf(`<Section id="${id}"`)).toBeGreaterThan(hidden)
    }
  })
})

// PROMPT-19 TASK 130 — thanh kéo cũng có mặt ở rail trái của Bảng điều khiển.
describe('thanh kéo nhịp nói trên rail Bảng điều khiển', () => {
  const ui = readFileSync(new URL('../src/lib/lanes/online/components/OnlineRhythmSettings.tsx', import.meta.url), 'utf8')
  const con = readFileSync(new URL('../src/lib/lanes/online/components/OnlineConsole.tsx', import.meta.url), 'utf8')

  it('32 · bản rail dùng CHUNG khoá lưu và CHUNG thứ tự nấc với màn Cài đặt', () => {
    // Hai nơi mà lệch nhau thì người vận hành chỉnh ở màn này, màn kia vẫn nói số cũ — đúng kiểu lỗi
    // không ai tìm ra giữa buổi lễ. Chung tệp, chung SLIDER_ORDER, chung loadSpeechRhythm/saveSpeechRhythm.
    expect(ui).toContain('export const OnlineRhythmRail: React.FC = () =>')
    const from = ui.indexOf('export const OnlineRhythmRail')
    const to = ui.indexOf('const OnlineRhythmSettings: React.FC')
    expect(from).toBeGreaterThan(-1)
    expect(to).toBeGreaterThan(from)
    const rail = ui.slice(from, to)
    expect(rail).toContain('loadSpeechRhythm()')
    expect(rail).toContain('saveSpeechRhythm(next)')
    expect(rail).toContain('SLIDER_ORDER')
    // Rail không tự dựng danh sách nấc riêng.
    expect(rail).not.toContain('SPEECH_RHYTHM_OPTIONS')
  })

  it('33 · rail nằm trong Bảng điều khiển, TRÊN nhóm Màn khán giả, và không đi qua mặt tiền', () => {
    // Cùng thư mục components/ thì import thẳng; mặt tiền chỉ để cho mã NGOÀI lane dùng.
    expect(con).toContain("import { OnlineRhythmRail } from './OnlineRhythmSettings'")
    const rail = con.indexOf('<OnlineRhythmRail />')
    const wall = con.indexOf('{/* B · MÀN KHÁN GIẢ */}')
    expect(rail).toBeGreaterThan(-1)
    expect(wall).toBeGreaterThan(-1)
    expect(rail).toBeLessThan(wall)
    // Đúng một chỗ — rail không được dựng hai lần.
    expect(con.split('<OnlineRhythmRail />').length - 1).toBe(1)
  })
})
