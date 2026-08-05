import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// TASK 55 — khoá chiều theo người của Timeline.
//
// Một người nói MỘT thứ tiếng. Câu ngoại ngữ chêm vào giữa lượt của họ là một câu TRÍCH DẪN, không phải
// đổi người: khách Nhật mở lời bằng "Xin chào" thì vẫn là Nhật → Việt, và hai chữ đó nằm nguyên trong câu.
// Máy tự nhận không biết điều đó — nó đọc chữ, mà chữ thì đúng là tiếng Việt thật, nên nó lật chiều cho
// cả phần còn lại của bài phát biểu VÀ cắt câu làm đôi (turn split của M11).
//
// Chỉ có bảng chương trình mới biết ai đang cầm micro. Nên khi đoạn khai tiếng, chiều bị KHOÁ, và ba chỗ
// từng có quyền lật chiều đều phải đứng im. Bộ test này ghim đúng ba chỗ đó — mất một chỗ là buổi lễ lại
// lật chiều giữa câu, mà đó là lỗi không nhìn thấy được cho tới lúc nó xảy ra trước mặt khán giả.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const LANE = read('src/lib/lanes/online/onlineLane.ts')
const FACADE = read('src/lib/lanes/online/index.ts')
const CONSOLE = read('src/lib/lanes/online/components/OnlineConsole.tsx')

/** Thân một hàm khai bằng `function ten(` — cắt tới dấu đóng ngoặc cùng cấp. */
function body(src: string, decl: string): string {
    const at = src.indexOf(decl)
    expect(at, `không tìm thấy ${decl}`).toBeGreaterThan(-1)
    // Thân hàm mở ở dấu `{` CUỐI CÙNG của dòng khai — dấu `{` đầu tiên có thể thuộc kiểu trả về
    // (`): { source: Lang; … } {`), lấy nhầm nó thì cắt ra được mỗi cái kiểu.
    const eol = src.indexOf('\n', at)
    const open = src.lastIndexOf('{', eol)
    let depth = 0
    for (let i = open; i < src.length; i += 1) {
        if (src[i] === '{') depth += 1
        else if (src[i] === '}') { depth -= 1; if (depth === 0) return src.slice(open, i + 1) }
    }
    throw new Error(`không đóng được thân ${decl}`)
}

describe('khoá chiều theo đoạn — cái khoá tồn tại và mặc định là TẮT', () => {
    it('1 · lane giữ một trạng thái khoá riêng, khởi tạo rỗng', () => {
        expect(LANE).toContain('let lockedSource: Lang | null = null')
    })

    it('2 · mỗi phiên mới bắt đầu bằng máy tự nhận — khoá không sống sót qua lần Bắt đầu sau', () => {
        const start = body(LANE, 'async function start(startOpts: StartOpts)')
        expect(start).toContain('lockedSource = null')
        // Cùng chỗ với việc dọn hướng đã chốt của phiên cũ, để không ai xoá một cái mà quên cái kia.
        expect(start.indexOf('lockedSource = null')).toBeGreaterThan(start.indexOf('settledDir.clear()'))
    })

    it('3 · controller phơi ra lockLanguage', () => {
        expect(LANE).toContain('lockLanguage(language: Lang | null): void')
        expect(LANE).toContain('saveSession, lockLanguage }')
    })
})

describe('khi khoá bật, ba chỗ từng lật chiều phải đứng im', () => {
    it('4 · dirLangs lấy tiếng của khoá, không hỏi chữ nữa', () => {
        const fn = body(LANE, 'function dirLangs(')
        expect(fn).toContain('else if (lockedSource)')
        // Câu ĐÃ CHỐT vẫn được xét trước khoá: một dòng cũ không bao giờ được nhảy cửa sổ khán giả khi
        // người điều khiển bấm sang đoạn sau.
        expect(fn.indexOf('if (settled)')).toBeLessThan(fn.indexOf('else if (lockedSource)'))
        // …và khoá phải đứng TRƯỚC hai nhánh đoán chữ, nếu không nó chẳng bao giờ tới lượt.
        expect(fn.indexOf('else if (lockedSource)')).toBeLessThan(fn.indexOf('else if (interim)'))
    })

    it('5 · câu chốt dưới khoá tự ghi hướng, nên nó không bị đoán lại về sau', () => {
        const fn = body(LANE, 'function dirLangs(')
        expect(fn).toContain('if (!interim) settledDir.set(lid, directionOf(source))')
    })

    it('6 · nhãn tiếng của nhà cung cấp KHÔNG được ghi đè khoá', () => {
        expect(LANE).toContain("if (twoWay && tracker && !lockedSource && decided.language && decided.basis !== 'none')")
    })

    it('7 · turn split của M11 đứng im — câu trích dẫn không được cắt câu làm đôi', () => {
        expect(LANE).toContain('if (twoWay && !lockedSource && decided.language && segmentBuffer.trim())')
    })
})

describe('đổi khoá = đổi người, nên phải chốt nốt câu của người trước', () => {
    it('8 · lockLanguage xả bộ đệm trước khi đổi, và chỉ khi thật sự có đổi', () => {
        const fn = body(LANE, 'function lockLanguage(')
        expect(fn).toContain('if (lockedSource === language) return')
        expect(fn).toContain("if (segmentBuffer.trim()) flushSegment('turn-end')")
        // Xả TRƯỚC khi gán, nếu không phần đuôi của người trước bị chốt bằng tiếng của người sau.
        expect(fn.indexOf('flushSegment')).toBeLessThan(fn.indexOf('lockedSource = language'))
    })

    it('9 · phiên một chiều thì lockLanguage không làm gì cả', () => {
        expect(body(LANE, 'function lockLanguage(')).toContain('if (!twoWay || !tracker) return')
    })
})

describe('đường từ bảng chương trình xuống lane', () => {
    it('10 · đoạn để trống tiếng thì NHẢ khoá, không giữ lại tiếng của người trước', () => {
        expect(FACADE).toContain('if (seg.language !== undefined)')
        expect(FACADE).toContain("lockLanguage(seg.language === 'vi' || seg.language === 'ja' ? seg.language : null)")
    })

    it('11 · màn điều khiển nói rõ đang khoá chiều nào, hay đang để máy tự nhận', () => {
        expect(CONSOLE).toContain('khoá chiều')
        expect(CONSOLE).toContain('chiều dịch: máy tự nhận')
    })

    it('12 · và nói thẳng khi phiên một chiều làm ô tiếng của đoạn thành nút bấm giả', () => {
        expect(CONSOLE).toContain('segmentLanguage(curSegment, event) && !lane.twoWay')
        expect(CONSOLE).toContain('MỘT CHIỀU nên tiếng gắn cho đoạn không có tác dụng')
    })
})

describe('máy NGHE vẫn để tự nhận — chỉ chiều DỊCH bị khoá', () => {
    it('13 · tham số tiếng gửi lúc mở đường nghe không đụng tới khoá', () => {
        // Nếu khoá lọt vào đây thì khách Nhật nói "Xin chào" sẽ ra chữ Nhật bậy, và đổi đoạn giữa buổi
        // sẽ phải nối lại đường nghe — đúng cái giá đã tuyên bố là không trả.
        expect(LANE).toContain("language: twoWay ? 'auto' : opts!.sourceLanguage")
        const dial = LANE.slice(LANE.indexOf('session = await fetchAsrSession({'), LANE.indexOf('} catch (err) {', LANE.indexOf('session = await fetchAsrSession({')))
        expect(dial).not.toContain('lockedSource')
    })
})
