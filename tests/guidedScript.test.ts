import { describe, it, expect } from 'vitest'
import {
  GUIDED_OFF,
  GUIDED_FLOOR,
  SPEAKER_MODES,
  guidedAllowed,
  guidedBlockedReason,
  speakerModeLabel,
  type SpeakerMode,
  clampGuidedIndex,
  stepGuidedIndex,
  guidedSimilarity,
  judgeGuided,
  guidedReadout,
} from '../src/lib/lanes/online/guidedScript'
import type { ScriptMatcherEntry } from '../src/lib/lanes/online/scriptMatcher'

// TASK 33 — the operator-driven cursor. `scriptMatcher` guesses where the ceremony has got to; this does
// not guess, because the person beside the stage is holding the paper script.
//
// Case 8 is the safety gate and it is not negotiable: a wrong cursor plus verbatim release means an
// entirely different sentence goes out over the ballroom speakers, in a confident human voice, and it
// cannot be taken back. If case 8 ever returns `release`, STOP — do not lower the floor to make it green.

const ROWS: ScriptMatcherEntry[] = [
  { id: 'r1', src_lang: 'vi', src: 'Kính thưa quý vị đại biểu, quý vị khách quý.', dst_lang: 'ja', dst: 'ご来賓の皆様、ご列席の皆様。', status: 'approved' },
  { id: 'r2', src_lang: 'vi', src: 'Kính thưa toàn thể cán bộ nhân viên công ty Esuhai.', dst_lang: 'ja', dst: 'エスハイ社の社員の皆様。', status: 'approved' },
  { id: 'r3', src_lang: 'vi', src: 'Hôm nay chúng ta long trọng tổ chức lễ kỷ niệm hai mươi năm thành lập công ty.', dst_lang: 'ja', dst: '本日、私たちは創立二十周年記念式典を厳かに執り行います。', status: 'approved' },
  { id: 'r4', src_lang: 'vi', src: 'Xin trân trọng kính mời quý vị cùng hướng lên sân khấu.', dst_lang: 'ja', dst: '皆様、どうぞステージにご注目ください。', status: 'approved' },
  { id: 'r5', src_lang: 'vi', src: 'Sau đây là tiết mục văn nghệ chào mừng của các bạn thực tập sinh.', dst_lang: 'ja', dst: '続きまして、技能実習生の皆さんによる歓迎の演目でございます。', status: 'draft' },
]

const armed = (index: number) => ({ armed: true, index })

describe('guidedScript — con trỏ', () => {
  it('1 · clamp giữ con trỏ trong kịch bản', () => {
    expect(clampGuidedIndex(5, 4)).toBe(3)
    expect(clampGuidedIndex(-2, 4)).toBe(-1)
    expect(clampGuidedIndex(0, 0)).toBe(-1)
  })

  it('2 · bấm TỚI lần đầu vào dòng 1, không phải dòng 2', () => {
    expect(stepGuidedIndex(armed(-1), 1, 4).index).toBe(0)
  })

  it('3 · không chạy quá cuối kịch bản', () => {
    expect(stepGuidedIndex(armed(3), 1, 4).index).toBe(3)
  })

  // MÂU THUẪN TRONG PROMPT (§33.1 vs §33.2 ca 4). Mô tả test nói lùi từ dòng 1 thì "giữ nguyên 0", nhưng
  // mã nguyên văn ở §33.1 cho ra -1: `from = 0` → `clampGuidedIndex(-1, 4)` → -1, vì clamp coi mọi số âm
  // là "chưa chọn dòng". Theo luật Thầy đặt: GIỮ MÃ, sửa ca test, ghi lý do vào đây.
  //
  // Và -1 là phía AN TOÀN chứ không phải phía nguy hiểm: nó làm `judgeGuided` trả về off/'chưa chọn dòng'
  // nên không phát gì cả, câu rơi về đường dịch thường. Lùi khỏi dòng 1 = bỏ chọn, không phải kẹt ở dòng 1.
  it('4 · lùi khỏi đầu kịch bản ⇒ về "chưa chọn dòng" (-1), không phát gì', () => {
    expect(stepGuidedIndex(armed(0), -1, 4).index).toBe(-1)
    // và ở trạng thái đó thì đúng là không phát gì
    expect(judgeGuided({ armed: true, index: -1 }, ROWS, ROWS[0].src).kind).toBe('off')
  })
})

describe('guidedScript — phát hay không phát', () => {
  it('5 · chưa bật dẫn thì tuyệt đối không phát gì', () => {
    const v = judgeGuided(GUIDED_OFF, ROWS, ROWS[0].src)
    expect(v.kind).toBe('off')
    expect(v.kind === 'off' && v.reason).toContain('chưa bật dẫn')
  })

  it('6 · nguyên văn dòng 1 tiếng Việt ⇒ phát bản Nhật đã duyệt', () => {
    const v = judgeGuided(armed(0), ROWS, ROWS[0].src)
    expect(v.kind).toBe('release')
    if (v.kind !== 'release') return
    expect(v.target).toBe(ROWS[0].dst)
    expect(v.language).toBe('ja')
    expect(v.score).toBe(1)
  })

  it('7 · cùng dòng đó đọc từ chiều Nhật ⇒ phát bản Việt', () => {
    const v = judgeGuided(armed(0), ROWS, ROWS[0].dst)
    expect(v.kind).toBe('release')
    if (v.kind !== 'release') return
    expect(v.target).toBe(ROWS[0].src)
    expect(v.language).toBe('vi')
  })

  it('8 · CỬA AN TOÀN: trỏ dòng 1 mà nghe ra dòng 4 ⇒ KHÔNG phát', () => {
    const v = judgeGuided(armed(0), ROWS, ROWS[3].src)
    expect(v.kind).toBe('mismatch')
    expect(v.kind === 'mismatch' && v.reason).toContain('1')
  })

  it('9 · MC nói lệch vài chữ vẫn phát — cửa 0,45 phải chịu được', () => {
    const v = judgeGuided(armed(0), ROWS, 'Thưa quý vị đại biểu, quý vị khách quý ạ')
    expect(v.kind).toBe('release')
  })

  it('10 · dòng chưa duyệt thì không có gì để phát', () => {
    const v = judgeGuided(armed(4), ROWS, ROWS[4].src)
    expect(v.kind).toBe('off')
    expect(v.kind === 'off' && v.reason).toContain('chưa được duyệt')
  })

  it('11 · câu quá ngắn thì không phát, dù trỏ đúng dòng', () => {
    const v = judgeGuided(armed(0), ROWS, 'Vâng ạ')
    expect(v.kind).toBe('mismatch')
    expect(v.kind === 'mismatch' && v.reason).toContain('quá ngắn')
  })

  it('12 · kịch bản rỗng: off, và không ném lỗi', () => {
    let v: ReturnType<typeof judgeGuided> | undefined
    expect(() => { v = judgeGuided(armed(0), [], 'Kính thưa quý vị đại biểu') }).not.toThrow()
    expect(v!.kind).toBe('off')
  })
})

describe('guidedScript — dòng chữ người vận hành đọc', () => {
  it('13 · bốn trạng thái nói đúng bốn câu', () => {
    expect(guidedReadout(GUIDED_OFF, ROWS)).toContain('Đang tự động')
    expect(guidedReadout(armed(0), ROWS)).toContain('dòng 1/')
    expect(guidedReadout(armed(4), ROWS)).toContain('CHƯA DUYỆT')
    expect(guidedReadout(armed(0), [])).toContain('Chưa nạp')
  })

  it('14 · bỏ dấu và bỏ khoảng trắng là toàn bộ lý do cửa 0,45 dùng được', () => {
    expect(guidedSimilarity('Kính thưa quý vị đại biểu', 'Kinh thua quy vi dai bieu')).toBeGreaterThan(0.9)
    expect(GUIDED_FLOOR).toBe(0.45)
  })
})

// TASK 36 — ba kiểu người nói. Điểm mấu chốt: kiểu người nói KHÔNG BAO GIỜ tự bật chế độ dẫn, nó chỉ
// được phép TẮT. Bật dẫn luôn phải là một hành động có chủ ý của con người.
describe('guidedScript — ba kiểu người nói', () => {
  it('15 · chỉ MC bám kịch bản mới được bật dẫn', () => {
    expect(guidedAllowed('script')).toBe(true)
    expect(guidedAllowed('partial')).toBe(false)
    expect(guidedAllowed('none')).toBe(false)
  })

  it('16 · hai kiểu bị chặn đều nói rõ vì sao', () => {
    expect(guidedBlockedReason('script')).toBe('')
    expect(guidedBlockedReason('partial').length).toBeGreaterThan(0)
    expect(guidedBlockedReason('none').length).toBeGreaterThan(0)
  })

  it('17 · đúng ba kiểu, đúng thứ tự', () => {
    expect(SPEAKER_MODES).toHaveLength(3)
    expect(SPEAKER_MODES.map((m) => m.value)).toEqual(['script', 'partial', 'none'])
  })

  it('18 · kiểu nào cũng có nhãn và gợi ý đọc được', () => {
    for (const m of SPEAKER_MODES) {
      expect(m.label.length, m.value).toBeGreaterThan(0)
      expect(m.hint.length, m.value).toBeGreaterThan(0)
    }
  })

  it('19 · nhãn đúng, và giá trị rác không ném lỗi', () => {
    expect(speakerModeLabel('partial')).toBe('Nói lệch một nửa')
    expect(speakerModeLabel('rác' as SpeakerMode)).toBe('Bám kịch bản')
  })

  it('20 · KHÔNG kiểu nào ngoài "script" được phép bật dẫn', () => {
    const allowed = SPEAKER_MODES.filter((m) => guidedAllowed(m.value)).map((m) => m.value)
    expect(allowed).toEqual(['script'])
  })
})
