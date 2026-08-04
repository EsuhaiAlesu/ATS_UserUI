import { describe, it, expect } from 'vitest'
import { createScriptMatcher } from '../src/lib/lanes/online/scriptMatcher'
import type { ScriptMatcherEntry } from '../src/lib/lanes/online/scriptMatcher'

// TASK 32 — the script is allowed to overrule the recogniser about WHAT LANGUAGE was spoken.
//
// `match()` filters candidates by the language label the recogniser attached (`candidate.sourceLanguage
// !== language` → skip), so ONE wrong label throws away a perfectly matching approved line in complete
// silence. That happened three times at the 2026-08-01 rehearsal. `matchBothWays` asks both directions
// and hands back whichever one actually snapped.
//
// Case 10 is the safety proof: Dice over character bigrams (diacritics and whitespace stripped) gives a
// Vietnamese sentence and a Japanese one almost no shared bigrams, so asking "the other way too" cannot
// invent a cross-language match. If case 10 ever goes red, TASK 32 is not safe and must be stopped.

const GALA: ScriptMatcherEntry[] = [
  { id: 't01', src_lang: 'vi', src: 'Kính thưa quý vị đại biểu, quý vị khách quý.', dst_lang: 'ja', dst: 'ご来賓の皆様、ご列席の皆様。', status: 'approved' },
  { id: 't02', src_lang: 'vi', src: 'Kính thưa các vị lãnh đạo các cơ quan ban ngành.', dst_lang: 'ja', dst: '関係官庁のご来賓の皆様。', status: 'approved' },
  { id: 't03', src_lang: 'vi', src: 'Kính thưa toàn thể cán bộ nhân viên công ty Esuhai.', dst_lang: 'ja', dst: 'エスハイ社の社員の皆様。', status: 'approved' },
  { id: 't04', src_lang: 'vi', src: 'Hôm nay chúng ta long trọng tổ chức lễ kỷ niệm hai mươi năm thành lập công ty.', dst_lang: 'ja', dst: '本日、私たちは創立二十周年記念式典を厳かに執り行います。', status: 'approved' },
  { id: 't05', src_lang: 'vi', src: 'Xin trân trọng kính mời quý vị cùng hướng lên sân khấu.', dst_lang: 'ja', dst: '皆様、どうぞステージにご注目ください。', status: 'approved' },
  { id: 't06', src_lang: 'vi', src: 'Esuhai được thành lập năm hai nghìn lẻ sáu tại thành phố Hồ Chí Minh.', dst_lang: 'ja', dst: 'エスハイは二〇〇六年にホーチミン市で設立されました。', status: 'approved' },
]

const LINE1_VI = 'Kính thưa quý vị đại biểu, quý vị khách quý.'
const LINE1_JA = 'ご来賓の皆様、ご列席の皆様。'

describe('scriptTwoWay — kịch bản được hỏi cả hai chiều', () => {
  it('1 · chiều đúng vẫn khớp như cũ', () => {
    const m = createScriptMatcher(GALA)
    const got = m.matchBothWays(LINE1_VI, 'vi')
    expect(got.result.band).toBe('snap')
    expect(got.language).toBe('vi')
  })

  it('2 · máy nghe GÁN SAI thứ tiếng, kịch bản vẫn khớp — ca trung tâm của TASK 32', () => {
    const m = createScriptMatcher(GALA)
    const got = m.matchBothWays(LINE1_VI, 'ja') // câu tiếng Việt bị gán nhãn 'ja'
    expect(got.result.band).toBe('snap')
    expect(got.language).toBe('vi') // kịch bản cãi thắng
  })

  it('3 · và câu được đọc ra là bản tiếng Nhật ĐÃ DUYỆT của đúng dòng đó', () => {
    const m = createScriptMatcher(GALA)
    const got = m.matchBothWays(LINE1_VI, 'ja')
    expect(got.result.targetLanguage).toBe('ja')
    expect(got.result.scriptTarget.trim()).toBe(GALA[0].dst)
  })

  it('4 · chiều Nhật→Việt chạy y như trước', () => {
    const m = createScriptMatcher(GALA)
    const got = m.matchBothWays(LINE1_JA, 'ja')
    expect(got.result.band).toBe('snap')
    expect(got.language).toBe('ja')
    expect(got.result.targetLanguage).toBe('vi')
  })

  it('5 · không bên nào khớp ⇒ giữ nguyên bên máy nghe nói (vi)', () => {
    const m = createScriptMatcher(GALA)
    const got = m.matchBothWays('Chiều nay trời Sài Gòn mưa rất to và kéo dài mãi không dứt.', 'vi')
    expect(got.result.band).not.toBe('snap')
    expect(got.language).toBe('vi')
  })

  it('6 · cùng câu ngoài kịch bản, gọi bằng ja ⇒ giữ nguyên ja', () => {
    const m = createScriptMatcher(GALA)
    const got = m.matchBothWays('Chiều nay trời Sài Gòn mưa rất to và kéo dài mãi không dứt.', 'ja')
    expect(got.result.band).not.toBe('snap')
    expect(got.language).toBe('ja')
  })

  it('7 · chỉ tới mức "gần khớp" thì vẫn trả về bên CÓ gần khớp, không trả về bên trắng trơn', () => {
    const m = createScriptMatcher(GALA)
    // Câu này ĐO ĐƯỢC là 0,684 — dưới cửa snap 0,82 nhưng còn trong vùng suggest. Bản nháp đầu của ca
    // này dùng một câu chỉ sai vài chữ ở cuối dòng 1; đo ra 0,893, tức vẫn snap, nên không kiểm được
    // điều cần kiểm. Đổi câu chứ không đổi ngưỡng.
    const gần = 'Hôm nay chúng ta tổ chức lễ kỷ niệm hai mươi năm nhưng mà trời mưa rất to.'
    const direct = m.match(gần, 'vi')
    expect(direct.band).toBe('suggest')

    const got = m.matchBothWays(gần, 'ja')
    expect(got.language).toBe('vi')
    expect(got.result.band).toBe('suggest')
  })

  it('8 · matchBothWays KHÔNG làm con trỏ nhúc nhích — chỉ accept() mới được', () => {
    const m = createScriptMatcher(GALA)
    // `position()` là chỉ số 0-based; dòng chẩn đoán trong lane mới là cái cộng thêm 1
    // (`(scriptMatcher?.position() ?? 0) + 1`). Nên máy khớp mới dựng đứng ở 0, không phải 1.
    expect(m.position()).toBe(0)
    for (let i = 0; i < 5; i += 1) m.matchBothWays(LINE1_VI, 'vi')
    expect(m.position()).toBe(0) // không nhúc nhích
  })

  it('9 · kịch bản rỗng: trả về none với lý do đọc được, không ném lỗi', () => {
    const m = createScriptMatcher([])
    let got: ReturnType<typeof m.matchBothWays> | undefined
    expect(() => { got = m.matchBothWays('Một câu tiếng Việt đủ dài để qua sàn ký tự.', 'vi') }).not.toThrow()
    expect(got!.result.band).toBe('none')
    expect(got!.result.reason).toContain('kịch bản trống')
  })

  it('10 · AN TOÀN: chấm một câu tiếng Việt ở chiều ja không thể ra khớp bậy', () => {
    // Đây là ca ghim lời khẳng định "hỏi thêm chiều kia không tạo khớp giữa hai thứ tiếng".
    // Đỏ ở đây nghĩa là TASK 32 không an toàn và phải dừng.
    const m = createScriptMatcher(GALA)
    const viNgoài = 'Chiều nay trời Sài Gòn mưa rất to và kéo dài mãi không dứt.'
    const jaNgoài = '今日の午後、サイゴンでは雨がとても激しく降り続いておりました。'
    expect(m.match(viNgoài, 'ja').band).toBe('none')
    expect(m.match(jaNgoài, 'vi').band).toBe('none')
  })
})
