import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
    decidePromotion,
    livePromoteStableMs,
    livePromoteLabel,
    LIVE_PROMOTE_DEFAULT,
    LIVE_PROMOTE_OPTIONS,
    LIVE_PROMOTE_MIN_CHARS,
} from '../src/lib/lanes/online/livePromote'
import { findLastStrongSentenceBreak, segmentCharLimit } from '../src/lib/lanes/online/transcriptSegmentation'
import { isStableDraftPrefix, stripPromotedPrefix } from '../src/lib/lanes/online/liveDraftTranslation'

// "Nhả câu sớm" — cắt câu từ dòng partial thay vì chờ máy nghe chốt lượt.
//
// Vì sao phải có: trên micro hội trường có AGC, máy nghe chốt lượt rất thưa (đo 04/08: có phiên KHÔNG chốt
// lần nào). Mọi thứ đứng sau một câu — phụ đề đậm, bản dịch tinh, giọng đọc — đều chờ cái chốt đó. Dòng
// partial thì không bao giờ đứt, nên câu cắt được từ đó.
//
// Rủi ro thật duy nhất của cách này là partial BỊ SỬA LẠI sau khi ta đã nhả. Những ca dưới đây ghim ba
// lớp chống: cửa sổ đứng yên · sàn ký tự theo ngôn ngữ · biên phải là một đơn vị trọn vẹn. Và ghim luôn
// phép trừ khi lượt thật sự chốt — chỗ mà làm sai là câu lên tường HAI LẦN.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const LANE = 'src/lib/lanes/online/onlineLane.ts'

/** Cùng bộ tham số mà lane dùng, để test đo đúng thứ đang chạy chứ không phải một bản mô phỏng. */
const decide = (live: string, candidate: string, candidateAt: number, now: number, stableMs = 650) =>
    decidePromotion({
        live,
        candidate,
        candidateAt,
        now,
        stableMs,
        minChars: segmentCharLimit(LIVE_PROMOTE_MIN_CHARS, live),
        breakAt: (t) => findLastStrongSentenceBreak(t, true),
        boundaryOk: isStableDraftPrefix,
    })

describe('nấc', () => {
    it('1 · mặc định là THẬN TRỌNG (0,90s) — chốt bàn giao 26/08', () => {
        expect(LIVE_PROMOTE_DEFAULT).toBe('careful')
        expect(livePromoteStableMs(LIVE_PROMOTE_DEFAULT)).toBe(900)
        expect(livePromoteLabel(LIVE_PROMOTE_DEFAULT)).toBe('Thận trọng')
        expect(livePromoteStableMs('off')).toBe(0)
        expect(livePromoteLabel('off')).toBe('Tắt')
    })

    it('2 · bốn nấc, và chỉ nấc Tắt mới có cửa sổ 0', () => {
        expect(LIVE_PROMOTE_OPTIONS).toHaveLength(4)
        for (const o of LIVE_PROMOTE_OPTIONS) {
            if (o.value === 'off') expect(o.stableMs).toBe(0)
            else expect(o.stableMs).toBeGreaterThan(0)
        }
        // càng nhanh thì cửa sổ càng ngắn — thứ tự này là thứ người vận hành đọc trên màn hình
        expect(livePromoteStableMs('careful')).toBeGreaterThan(livePromoteStableMs('normal'))
        expect(livePromoteStableMs('normal')).toBeGreaterThan(livePromoteStableMs('fast'))
    })

    // 26/08: mặc định đổi từ 'off' sang 'careful', nên giá trị lạ nay rơi về 'careful' chứ không về 0.
    // Điều PHẢI giữ vẫn là điều cũ: giá trị lạ không bao giờ được thành nấc NHANH NHẤT. Nấc mặc định là
    // nấc chậm nhất trong ba nấc có bật, nên tính chất đó còn nguyên.
    it('3 · nấc lạ rơi về nấc mặc định, và không bao giờ thành nấc nhanh nhất', () => {
        expect(livePromoteStableMs('khong-co-nac-nay' as never)).toBe(livePromoteStableMs(LIVE_PROMOTE_DEFAULT))
        expect(livePromoteStableMs('khong-co-nac-nay' as never)).toBeGreaterThan(livePromoteStableMs('fast'))
    })
})

describe('ba lớp chống nhả bậy', () => {
    it('4 · cửa sổ đứng yên: đổi một chữ là đồng hồ chạy lại từ đầu', () => {
        const a = decide('Kính thưa quý vị đại biểu. Hôm', '', 0, 1000)
        expect(a.promote).toBe(false)
        expect(a.candidate).toBe('Kính thưa quý vị đại biểu.')     // bắt đầu theo dõi

        // chưa đủ lâu
        expect(decide('Kính thưa quý vị đại biểu. Hôm nay', a.candidate, 1000, 1000 + 649).promote).toBe(false)
        // đủ lâu
        expect(decide('Kính thưa quý vị đại biểu. Hôm nay', a.candidate, 1000, 1000 + 650).promote).toBe(true)
    })

    it('5 · máy nghe SỬA LẠI đoạn đầu ⇒ ứng viên đổi ⇒ không nhả', () => {
        const first = decide('Kính thưa quý vị đại biểu. Hôm', '', 0, 1000)
        // cùng một câu nhưng máy nghe vừa sửa "quý vị" thành "quý bà"
        const revised = decide('Kính thưa quý bà đại biểu. Hôm nay', first.candidate, 1000, 1000 + 5000)
        expect(revised.promote).toBe(false)
        expect(revised.candidate).not.toBe(first.candidate)   // đồng hồ chạy lại cho bản mới
    })

    it('6 · biên: không bao giờ cắt giữa một từ đang viết dở', () => {
        // dấu chấm nằm trong một số, không phải hết câu ⇒ findLastStrongSentenceBreak không nhận
        const d = decide('Doanh thu đạt 1.500 tỷ đồng trong', '', 0, 1000)
        expect(d.promote).toBe(false)
        expect(d.candidate).toBe('')
    })

    it('7 · sàn ký tự: câu quá ngắn thì không nhả, dù đã đứng yên rất lâu', () => {
        const a = decide('Vâng.', '', 0, 1000)
        expect(a.candidate).toBe('')
        expect(decide('Vâng.', 'Vâng.', 1000, 99_999).promote).toBe(false)
    })

    it('8 · sàn đi theo ngôn ngữ: tiếng Nhật cần ít ký tự hơn tiếng Việt cho cùng lượng nghĩa', () => {
        const ja = 'ただいまより式典を開始いたします。'
        const vi = 'Bây giờ chúng tôi xin phép bắt đầu buổi lễ.'
        expect(segmentCharLimit(LIVE_PROMOTE_MIN_CHARS, ja)).toBeLessThan(segmentCharLimit(LIVE_PROMOTE_MIN_CHARS, vi))
        const a = decide(ja + 'つ', '', 0, 1000)
        expect(a.candidate).toBe(ja)
        expect(decide(ja + 'つぎに', a.candidate, 1000, 1000 + 650).promote).toBe(true)
    })

    it('9 · dấu chấm ASCII vẫn phải có khoảng trắng theo sau — không cắt giữa tên miền', () => {
        // Đây là lý do `boundaryOk` còn được giữ lại sau khi tiếng Nhật được cho đi tắt: mối ngắt MẠNH cuối
        // cùng ở đây nằm trong "esuhai.com", đủ dài để qua sàn ký tự, và chỉ phép kiểm biên chặn được.
        const d = decide('Kính mời quý vị vào www.esuhai.com để xem', '', 0, 1000)
        expect(d.promote).toBe(false)
        expect(d.candidate).toBe('')
    })

    it('10 · nấc Tắt: không bao giờ nhả, dù mọi điều kiện khác đều đúng', () => {
        const live = 'Kính thưa quý vị đại biểu. Hôm nay'
        expect(decide(live, 'Kính thưa quý vị đại biểu.', 1000, 99_999, 0).promote).toBe(false)
    })
})

describe('phép trừ khi lượt thật sự chốt — chỗ sai là câu lên tường HAI lần', () => {
    it('11 · lượt chốt chứa đúng phần đã nhả ⇒ chỉ phần MỚI đi tiếp', () => {
        const promoted = 'Kính thưa quý vị đại biểu.'
        const commit = 'Kính thưa quý vị đại biểu. Hôm nay là một ngày đặc biệt.'
        const r = stripPromotedPrefix(commit, promoted)
        expect(r.matched).toBe(true)
        expect(r.coveredByPromoted).toBe(false)
        expect(r.text).toBe('Hôm nay là một ngày đặc biệt.')
    })

    it('12 · lượt chốt KHÔNG có gì mới ⇒ không sinh câu nào nữa', () => {
        const promoted = 'Kính thưa quý vị đại biểu.'
        const r = stripPromotedPrefix('Kính thưa quý vị đại biểu.', promoted)
        expect(r.text).toBe('')
    })

    it('13 · máy nghe sửa lại đoạn đã nhả ⇒ GIỮ bản đã sửa (lặp, chứ không nuốt chữ)', () => {
        const promoted = 'Kính thưa quý vị đại biểu.'
        const commit = 'Kính thưa quý bà đại biểu. Hôm nay là một ngày đặc biệt.'
        const r = stripPromotedPrefix(commit, promoted)
        expect(r.matched).toBe(false)
        expect(r.text).toBe(commit)   // thà lặp một câu — thấy được — còn hơn nuốt chữ, không ai thấy
    })
})

describe('nối vào lane', () => {
    it('14 · cả hai đường vào đều đi qua acceptFinalText, không đường nào có bản sao chốt chặn riêng', () => {
        const lane = read(LANE)
        expect(lane.split('acceptFinalText(').length - 1).toBe(3)   // 1 khai báo + 2 lời gọi
        expect(lane).toContain('function acceptFinalText(')
    })

    it('15 · handleFinal giữ lại promotedPrefix TRƯỚC khi resetScribeCommitState xoá nó', () => {
        const lane = read(LANE)
        const at = lane.indexOf('function handleFinal')
        const body = lane.slice(at, lane.indexOf('acceptFinalText(', at))
        // thứ tự này là cả ca: dọn trước rồi mới đọc thì phép trừ luôn chạy trên chuỗi rỗng
        expect(body.indexOf('const promotedInTurn = promotedPrefix')).toBeLessThan(body.indexOf('resetScribeCommitState(true)'))
        expect(body).toContain('stripPromotedPrefix(raw, promotedInTurn)')
    })

    it('16 · lượt chết thì phần đã nhả cũng bị quên, nếu không lượt sau bị trừ oan', () => {
        const lane = read(LANE)
        const at = lane.indexOf('function resetScribeCommitState')
        const body = lane.slice(at, lane.indexOf('\n  function ', at))
        expect(body).toContain("promotedPrefix = ''")
        expect(body).toContain("promoteCandidate = ''")
    })

    it('17 · nhả TRƯỚC khi vẽ, để dòng chữ mờ không lặp lại câu vừa nhả', () => {
        const lane = read(LANE)
        const at = lane.indexOf('function handlePartial')
        const body = lane.slice(at, lane.indexOf('\n  function ', at))
        expect(body.indexOf('maybePromote(')).toBeLessThan(body.indexOf('emitLine('))
        expect(body).toContain('stripPromotedPrefix(base, promotedPrefix)')
    })

    it('18 · bộ đếm nhịp chốt lượt vẫn nhận TOÀN BỘ đoạn, kể cả phần đã nhả', () => {
        const lane = read(LANE)
        // scheduleStableCommit đo việc của MÁY NGHE, không phải việc của màn hình
        expect(lane).toContain('scheduleStableCommit(base)')
        const at = lane.indexOf('function handlePartial')
        const body = lane.slice(at, lane.indexOf('\n  function ', at))
        expect(body.indexOf('scheduleStableCommit(base)')).toBeLessThan(body.indexOf('maybePromote('))
    })

    it('19 · số câu nhả sớm lên bảng chẩn đoán', () => {
        const lane = read(LANE)
        expect(lane).toContain('promotions: number')
        expect(lane).toContain('promotions += 1')
        expect(read('src/lib/lanes/online/components/OnlineConsole.tsx')).toContain('nhả sớm {diag.promotions} câu')
    })
})
