import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { decideCaptureFrame } from '../src/lib/lanes/online/livePipelinePolicy'

// TASK 56 — nhả xong một dòng kịch bản thì micro ngủ, và cái bấm dòng sau đánh thức nó.
//
// Giữa lúc nhả dòng N và lúc bấm dòng N+1, trong phòng chỉ có đúng một việc: MC bên kia đọc bản dịch.
// Đó là NGƯỜI THỨ HAI, không phải câu trích dẫn — cổng nửa song công chỉ biết giọng của chính máy, còn
// khoá chiều thì đang khoá theo người nói trước, nên nghe được là đẩy rác lên tường khán giả.
//
// Cái phải ghim chặt nhất ở đây là ĐỘ TRỄ THỨC DẬY, vì người điều khiển bấm xong là Mika nói ngay:
//   · quyết định câm/nghe đọc lại MỖI GÓI tiếng, không phải mỗi lần React vẽ lại ⇒ ăn ngay gói kế tiếp;
//   · một gói = 4096 mẫu @16kHz = 256ms;
//   · và gói đó mang theo 256ms tiếng THU TRƯỚC lúc bấm, nên bấm hơi trễ vẫn vớt lại được, không mất chữ.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const LANE = read('src/lib/lanes/online/onlineLane.ts')
const CAPTURE = read('src/lib/lanes/online/pcm16Capture.ts')
const CONSOLE = read('src/lib/lanes/online/components/OnlineConsole.tsx')

describe('độ trễ thức dậy — con số, không phải lời hứa', () => {
    it('1 · một gói tiếng là 4096 mẫu @16kHz = 256ms', () => {
        expect(CAPTURE).toContain('new Int16Array(4096)')
        expect(CAPTURE).toContain('this.outCount >= 4096')
        expect(4096 / 16).toBe(256) // mẫu / 16 = ms @16kHz
    })

    it('2 · trạng thái ngủ được xét lại NGAY TRONG đường đi của gói tiếng, không qua React', () => {
        const at = LANE.indexOf('const frame = decideCaptureFrame({')
        expect(at).toBeGreaterThan(-1)
        const before = LANE.slice(at - 700, at)
        expect(before).toContain('if (guidedDeafAtIndex >= 0) {')
        expect(before).toContain('config.getGuided?.() ?? GUIDED_OFF')
        // Con trỏ nhích = thức. Đó là chính cái bấm của người điều khiển, không phải một cái hẹn giờ.
        expect(before).toContain('g.index !== guidedDeafAtIndex')
    })

    it('3 · gói bị câm là im lặng CÙNG ĐỘ DÀI, không phải gói vắng mặt', () => {
        // Vắng gói thì đồng hồ đóng câu 1,5s của máy nghe ngừng đếm giữa câu ⇒ ASR không còn chạy liên tục.
        expect(LANE).toContain('pcm = new ArrayBuffer(packet.pcm.byteLength)')
        expect(decideCaptureFrame({ listenPaused: true, gateActive: false }).mute).toBe(true)
        expect(decideCaptureFrame({ listenPaused: false, gateActive: false }).mute).toBe(false)
    })
})

describe('ngủ khi nào, thức khi nào', () => {
    it('4 · nhả một dòng kịch bản là ngủ, và nhớ mình ngủ ở dòng nào', () => {
        const at = LANE.indexOf("if (verdict.kind === 'release')")
        expect(at).toBeGreaterThan(-1)
        // Cửa sổ nới 1400 → 2200 sau khi R5 chèn cổng "hiện tách khỏi đọc" vào giữa khối này. Con số chỉ
        // là bề rộng đủ để bọc trọn nhánh `release`, không mang ý nghĩa gì khác.
        const block = LANE.slice(at, at + 2200)
        expect(block).toContain('guidedDeafAtIndex = guided.index')
        expect(block).toContain('guidedDeafSince = Date.now()')
        // Ngủ SAU khi câu đã lên tường và đã vào bản ghi buổi — không được nuốt mất chính câu vừa nhả.
        expect(block.indexOf('emitLine(')).toBeLessThan(block.indexOf('guidedDeafAtIndex = guided.index'))
        expect(block.indexOf('recordSessionLine(')).toBeLessThan(block.indexOf('guidedDeafAtIndex = guided.index'))
    })

    it('5 · tắt dẫn theo kịch bản cũng là thức — không để lại một micro điếc sau khi rút đạn', () => {
        const at = LANE.indexOf('const frame = decideCaptureFrame({')
        expect(LANE.slice(at - 700, at)).toContain('!g.armed')
    })

    it('6 · có trần thời gian, vì quên bấm là cái sai duy nhất cơ chế này gây ra', () => {
        expect(LANE).toContain('const GUIDED_DEAF_MAX_MS = 30_000')
        const at = LANE.indexOf('const frame = decideCaptureFrame({')
        expect(LANE.slice(at - 700, at)).toContain('Date.now() - guidedDeafSince > GUIDED_DEAF_MAX_MS')
    })

    it('7 · phiên mới luôn bắt đầu ở trạng thái THỨC', () => {
        const at = LANE.indexOf('async function start(startOpts: StartOpts)')
        const block = LANE.slice(at, at + 2000)
        expect(block).toContain('guidedDeafAtIndex = -1')
        expect(block).toContain('guidedDeafSince = 0')
    })
})

describe('không bao giờ ngủ mà không ai thấy', () => {
    it('8 · lane công bố guidedDeaf riêng, KHÔNG trộn vào listenPaused của "Ngưng nghe"', () => {
        expect(LANE).toContain('guidedDeaf: boolean')
        expect(LANE).toContain('guidedDeaf: guidedDeafAtIndex >= 0')
        // Trộn thì người điều khiển không phân biệt được "máy đang chờ tôi bấm" với "tôi bấm Ngưng nghe
        // rồi quên bật lại" — hai chuyện cần hai phản ứng khác hẳn nhau.
        expect(LANE).toContain('listenPaused: config.getListenPaused?.() ?? false,')
    })

    it('9 · màn điều khiển hiện băng ĐANG IM và nói phải làm gì tiếp', () => {
        expect(CONSOLE).toContain('diag?.guidedDeaf')
        expect(CONSOLE).toContain('ĐANG IM')
        expect(CONSOLE).toContain('MC bên kia đọc bản dịch')
    })
})
