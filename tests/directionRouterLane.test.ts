import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// 06/08 — LỚP ROUTER ĐÃ ĐƯỢC ĐẤU VÀO LANE, và bộ test này canh đúng cái mối nối đó.
//
// `directionRouter.test.ts` chứng minh module tự nó nghĩ đúng. Nhưng một module đúng mà không ai gọi thì
// không cứu được câu nào — mà đó lại đúng là chuyện đã xảy ra một lần trong dự án này (PROMPT-16 viết xong
// phần "máy trắng tự lấy về" rồi bị `migrateToEventScoped()` bịa một buổi trước `bootCloud()` làm cho vô
// hiệu 100%, không test nào đỏ). Nên chỗ nối phải được ghim riêng.
//
// Ba thứ phải đúng, và mất bất cứ cái nào cũng là im lặng chứ không phải lỗi:
//   1. cửa `foreign` PHẢI biến mất — còn nó thì câu tiếng Việt bị gán nhãn tiếng Trung vẫn bị xoá;
//   2. router phải được TẠO mỗi phiên và được HỎI ở mỗi câu chốt;
//   3. `baseMode` phải theo việc có kịch bản hay không — buổi lễ ≠ cuộc họp.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const LANE = read('src/lib/lanes/online/onlineLane.ts')
const CONSOLE = read('src/lib/lanes/online/components/OnlineConsole.tsx')
const FACADE = read('src/lib/lanes/online/index.ts')
const CAPTURE = read('src/lib/lanes/online/pcm16Capture.ts')

/** Thân một hàm khai bằng `function ten(` — cắt tới dấu đóng ngoặc cùng cấp. */
function body(src: string, decl: string): string {
    const at = src.indexOf(decl)
    expect(at, `không tìm thấy ${decl}`).toBeGreaterThan(-1)
    const eol = src.indexOf('\n', at)
    const open = src.lastIndexOf('{', eol)
    let depth = 0
    for (let i = open; i < src.length; i += 1) {
        if (src[i] === '{') depth += 1
        else if (src[i] === '}') { depth -= 1; if (depth === 0) return src.slice(open, i + 1) }
    }
    throw new Error(`không đóng được thân ${decl}`)
}

describe('cửa "tiếng lạ thì vứt câu" đã bị gỡ', () => {
    it('1 · không còn đường nào bỏ câu vì tiếng lạ', () => {
        expect(LANE).not.toContain("dropGhost('foreign-language'")
        expect(LANE).not.toContain('decided.foreign')
        // Chỉ soi các chỗ DÙNG THẬT: chú thích còn nhắc tên cũ là cố ý, để đọc lại còn biết vì sao đổi.
        expect(LANE).not.toContain('foreignDrops +=')
        expect(LANE).not.toContain('foreignDrops = 0')
        expect(LANE).not.toContain('foreignDrops,')
    })

    it('2 · thay bằng bộ đếm câu được CỨU, không phải câu bị bỏ — con số phải nói thật', () => {
        expect(LANE).toContain('languageProjections: number')
        expect(LANE).toContain('if (routed?.projected) languageProjections += 1')
        expect(CONSOLE).toContain('cứu tiếng lạ')
        expect(CONSOLE).not.toContain('bỏ tiếng lạ')
    })

    it('3 · hai cái chốt còn lại vẫn đứng — gỡ cửa này KHÔNG mở lại lỗ "（聞き取り不能）"', () => {
        // Nhãn "không nghe được" của chính máy nghe do isNonSpeechAnnotation bắt, không phải cửa vừa gỡ.
        expect(LANE).toContain('if (isNonSpeechAnnotation(transcript))')
        expect(LANE).toContain('if (isInventedNumber(transcript))')
    })
})

describe('router được tạo mỗi phiên và được hỏi ở mỗi câu chốt', () => {
    it('4 · tạo trong start(), cạnh tracker, và dọn luôn mốc thời gian của phiên cũ', () => {
        const start = body(LANE, 'async function start(startOpts: StartOpts)')
        expect(start).toContain('router = createDirectionRouter(startOpts.sourceLanguage)')
        expect(start).toContain('lastAcceptedFinalAt = 0')
    })

    it('5 · mỗi câu chốt đều đi qua router, kèm khoảng lặng đo được', () => {
        const fn = body(LANE, 'function acceptFinalText(')
        // 06/08 chiều — thêm `sourceLang` (chiều theo NGUỒN TIẾNG) rồi `vendorCarriedRaw` (nhãn âm mượn
        // của câu kề bên, cho những câu nhả sớm vốn không bao giờ có nhãn của riêng nó). Ý của khẳng định
        // này không đổi: mọi câu chốt vẫn phải đi qua router và vẫn phải mang khoảng lặng đo được. Hai thứ
        // thêm vào chỉ là bằng chứng đi kèm, và cả hai đều `undefined` khi không có gì để đưa.
        expect(fn).toContain('router.next({ text: transcript, vendorRaw: vendorLanguage, vendorCarriedRaw, gapMs, sourceLang })')
        expect(fn).toContain('const gapMs = lastAcceptedFinalAt ? finalAt - lastAcceptedFinalAt : 0')
        // Câu ĐẦU TIÊN của phiên bàn giao từ không ai cả, nên phải là 0 chứ không phải "cả buổi".
        expect(fn).toContain('lastAcceptedFinalAt = finalAt')
    })

    it('6 · phiên MỘT CHIỀU không định tuyến — đường nghe đã bị ghim sẵn tiếng rồi', () => {
        expect(body(LANE, 'function acceptFinalText(')).toContain('twoWay && router ? router.next(')
        expect(LANE).toContain("language: twoWay ? 'auto' : opts!.sourceLanguage")
    })

    it('7 · tracker bị hạ cấp: nó soi theo chiều ĐANG CHẠY của router, không theo câu vừa rồi', () => {
        // Khác nhau đúng ở câu được CHIẾU: nhãn tiếng thứ ba mượn cho một dòng, không được thành cả lượt.
        expect(body(LANE, 'function acceptFinalText(')).toContain('tracker.reset(router.current())')
    })

    it('8 · khoá của bảng chương trình được chuyển xuống router luôn', () => {
        expect(body(LANE, 'function lockLanguage(')).toContain('router?.lock(language)')
    })
})

// R5 — mối nối giữa HIỆN và ĐỌC. `speakGate.test.ts` chứng minh cái cổng nghĩ đúng; phần dưới đây canh
// việc nó được đấu vào đúng ba chỗ, và quan trọng nhất là canh CHIỀU của bất đối xứng: chỉ có giọng đọc
// được chờ. Đấu ngược lại — bắt phụ đề chờ trọng tài — là biến mọi mili-giây trọng tài nghĩ thêm thành
// mili-giây tường trống, tức là xoá sạch lý do tồn tại của cả lớp này.
describe('R5 — chỉ giọng đọc phải chờ, tường thì không bao giờ', () => {
    it('11 · giọng đọc hỏi cổng trước khi phát, ở CẢ hai đường (refine và snap)', () => {
        const refine = body(LANE, 'async function refine(')
        expect(refine).toContain('await speakGate.wait(lid, DIRECTION_SETTLE_WAIT_MS, dl.source)')
        expect(body(LANE, 'async function speakSnap(')).toContain('await speakGate.wait(lid, DIRECTION_SETTLE_WAIT_MS, source)')
    })

    it('12 · chốt chiều KHÁC chiều đã dịch ⇒ NGẬM MIỆNG, không phải đọc bằng tiếng khác', () => {
        // Bản dịch làm theo chiều cũ thì sai từ gốc, chứ không sai mỗi cái giọng. Đọc lên bằng tiếng kia
        // là đưa một câu ngược vào loa; giữ lại thì khán phòng vẫn ĐỌC được nó trên tường.
        expect(LANE).toContain('if (settled.changed) { voiceDirectionHolds += 1; speakGate.forget(lid); return; }')
        expect(body(LANE, 'async function refine(')).toContain('voiceDirectionHolds += 1')
        expect(LANE).toContain('voiceDirectionHolds: number')
    })

    it('13 · phụ đề KHÔNG chờ — emitLine không bao giờ nằm sau một lần chờ cổng', () => {
        for (const fn of ['async function refine(', 'function trySnapToScript(']) {
            const src = body(LANE, fn)
            const firstEmit = src.indexOf('emitLine(')
            const firstWait = src.indexOf('speakGate.wait(')
            expect(firstEmit, fn).toBeGreaterThan(-1)
            if (firstWait > -1) expect(firstEmit, fn).toBeLessThan(firstWait)
        }
    })

    it('14 · hạn giờ có thật và nằm trong ngân sách đã tuyên bố cho lớp router', () => {
        const m = LANE.match(/const DIRECTION_SETTLE_WAIT_MS = ([\d_]+);/)
        expect(m, 'không tìm thấy hạn giờ').toBeTruthy()
        const ms = Number(m![1].replace(/_/g, ''))
        expect(ms).toBeGreaterThanOrEqual(1_000)
        expect(ms).toBeLessThanOrEqual(2_000)
    })

    it('15 · người BẤM DÒNG và kịch bản lật chiều thì tự chốt cổng — không bắt chúng chờ trọng tài', () => {
        // Người ngồi cạnh sân khấu bấm dòng, và cặp câu trong kịch bản do người duyệt từ mấy tiếng trước:
        // cả hai đều là bằng chứng mạnh hơn trọng tài đọc chữ từ một cái máy nghe giữa hội trường ồn.
        const snap = body(LANE, 'function trySnapToScript(')
        expect(snap).toContain('speakGate.settle(lid, guidedSource)')
        expect(snap).toContain('if (flipped) speakGate.settle(lid, heardLanguage)')
    })

    it('16 · phiên mới dọn sạch cổng — không để một câu của buổi trước treo lời hứa', () => {
        expect(body(LANE, 'async function start(startOpts: StartOpts)')).toContain('speakGate.reset()')
    })
})

// ── CHIỀU THEO NGUỒN TIẾNG — cả sợi dây từ đầu đến cuối ──────────────────────────────────────────────
//
// `sourceAttribution.test.ts` chứng minh lớp gán nguồn nghĩ đúng; `directionRouter.test.ts` chứng minh
// router đặt nó lên trên mọi phép đoán. Cả hai đúng mà không ai nối dây thì cứu được đúng 0 câu — và đó
// là chuyện ĐÃ XẢY RA một lần trong dự án này (PROMPT-16, không test nào đỏ). Nên đường đi phải được ghim
// từng mắt một, vì mất bất cứ mắt nào cũng là im lặng chứ không phải lỗi:
//
//   micro + tiếng máy → worklet đo RIÊNG từng đường → gói tiếng → lớp gán nguồn → router → chiều dịch
//
// và một cái van ở giữa: người vận hành phải tự đấu được đường thứ hai bằng một cú bấm, nếu không thì cả
// nhánh này chỉ chạy được trong đầu người viết ra nó.
describe('chiều theo nguồn tiếng — sợi dây được nối đủ từ worklet tới router', () => {
    it('17 · worklet nhận HAI đường vào và đo năng lượng riêng từng đường', () => {
        // Trộn chung rồi mới đo là mất trắng: cái cần biết không phải "có tiếng hay không" (đã có sẵn),
        // mà là tiếng đó vào bằng cổng nào.
        expect(CAPTURE).toContain('numberOfInputs: 2')
        expect(CAPTURE).toContain('micVoicedMs: this.micVoicedCount / 16')
        expect(CAPTURE).toContain('sysVoicedMs: this.sysVoicedCount / 16')
        // Đường thứ hai chỉ được đấu khi nó CÓ TIẾNG thật. Luồng chia sẻ màn hình quên tích ô âm thanh
        // vẫn là một MediaStream hợp lệ, và nối nó vào là dựng một đầu vào câm rồi tin nó.
        expect(CAPTURE).toContain('if (sysStream && sysStream.getAudioTracks().length > 0)')
        expect(CAPTURE).toContain('sysSrc.connect(node, 0, 1)')
    })

    it('18 · lane ghi năng lượng hai đường ở MỖI gói tiếng, không phải chỉ khi có câu', () => {
        // Cửa sổ của một câu được hỏi lại lúc chốt, nên tiếng phải được ghi liên tục từ trước đó. Ghi
        // theo câu là ghi sau khi đã cần.
        expect(LANE).toContain('sourceAttributor.observe(packetAt, packet.micVoicedMs, packet.sysVoicedMs)')
    })

    it('19 · mỗi câu chốt hỏi lại cửa sổ của CHÍNH nó, và chỉ khi đường thứ hai sống thật', () => {
        const fn = body(LANE, 'function acceptFinalText(')
        expect(fn).toContain('sourceAttributor.verdictFor(lastAcceptedFinalAt, finalAt)')
        // Không có cửa này thì `sysVoicedMs` luôn bằng 0, mọi câu gán về micro, và "mọi câu về một phía"
        // không phải là không có tín hiệu — nó là một tín hiệu SAI, ghim cứng chiều của cả buổi.
        expect(fn).toContain('systemSourceLive && twoWay')
    })

    it('20 · gán nguồn → tiếng: đường tiếng máy là tiếng của đầu cầu bên kia, mic là tiếng của phòng', () => {
        const fn = body(LANE, 'function acceptFinalText(')
        expect(fn).toContain("sourceVerdict.source === 'system' ? systemLang :")
        // Không đặt thì mặc định phía bên kia nói thứ tiếng CÒN LẠI so với chiều nguồn của phiên.
        expect(fn).toContain("opts?.sourceLanguage === 'ja' ? 'vi' : 'ja'")
    })

    it('21 · người vận hành đấu được đường thứ hai bằng một cú bấm, và facade truyền nó xuống lane', () => {
        // `getDisplayMedia` bắt buộc phải có cử chỉ người dùng, nên nút bấm KHÔNG phải chuyện trang trí:
        // không có nó thì không đời nào có luồng thứ hai, và cả nhánh này chết trên giấy.
        expect(FACADE).toContain('navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })')
        expect(FACADE).toContain('getSystemStream: () => systemStreamRef.current')
        expect(FACADE).toContain('getSystemLanguage: ()')
        expect(CONSOLE).toContain('lane.attachSystemSource()')
        expect(CONSOLE).toContain('lane.detachSystemSource()')
    })

    it('22 · luồng chỉ có HÌNH bị từ chối ngay, không nhận bừa rồi báo xanh cả buổi', () => {
        expect(FACADE).toContain('if (!audio.length)')
        expect(FACADE).toContain('stream.getTracks().forEach((t) => t.stop())')
        // Và màn điều khiển phải đỏ lên khi đã đấu mà lane không thấy tiếng nào — đây là ca hay gặp nhất
        // (quên tích ô chia sẻ âm thanh), và cũng là ca im lặng nhất.
        expect(CONSOLE).toContain('diag.systemSourceLive')
        expect(CONSOLE).toContain('lane.systemSourceOn')
    })

    it('23 · và đếm được CÁI GÌ quyết chiều — không có số này thì "bớt quán tính" chỉ là cảm giác', () => {
        expect(LANE).toContain('routerBasis: router?.stats().byBasis ?? {}')
        expect(CONSOLE).toContain('basisReadout(diag.routerBasis)')
    })
})

// ── Ba bản vá của phiên chạy thử 06/08 ───────────────────────────────────────────────────────────────
//
// Cả ba đều đến từ MỘT phiên có ghi log (`online_20260806-131634.json`, 60 dòng), không phải từ suy đoán:
//
//   ① máy nghe đọc lại đoạn đã nhả — 7/60 dòng (12%), khoảng cách 1–3 dòng;
//   ② câu nhả sớm không có nhãn tiếng — 39/52 câu, nên 3/4 số câu định chiều bằng cách đọc mặt chữ;
//   ③ trần 25s vô hiệu khi máy nghe câm — ba lần đổi tiếng cho ba khoảng câm 6,2s → 24,3s → 131s.
//
// Mỗi cái mất đi đều là im lặng chứ không phải lỗi, nên phải ghim từng cái.
describe('ba bản vá 06/08 — đấu đủ dây, không nằm chờ trên giấy', () => {
    it('24 · ① chốt chặn lặp nay nhớ NHIỀU câu và so theo BAO HÀM, không còn sâu-1 so bằng nhau', () => {
        const fn = body(LANE, 'function acceptFinalText(')
        expect(fn).toContain('judgeEcho(incoming, echoMemory, REPEAT_GUARD_MIN_CHARS)')
        expect(fn).toContain("if (echo.kind === 'repeat')")
        // Phần đuôi CÒN MỚI của một câu bị cắt đầu vẫn phải được nhả, không được bỏ cả câu.
        expect(fn).toContain("if (echo.kind === 'trimmed') echoTrims += 1")
        expect(fn).toContain('const transcript = echo.text')
        // Và bộ nhớ phải được ghi bằng chữ ĐÃ TRỪ, không phải chữ thô: ghi chữ thô là lần sau so với một
        // chuỗi chứa sẵn phần trùng, và cái lặp kế tiếp lọt lưới.
        expect(fn).toContain('echoMemory = rememberEcho(echoMemory, transcript, ECHO_MEMORY)')
        // Chốt chặn cũ phải đi hẳn — để lại là hai chốt cùng nói về một chuyện và sẽ lệch nhau. Cùng quy
        // ước với ca 1 ở đầu tệp: chỉ soi các chỗ DÙNG THẬT, chú thích còn nhắc tên cũ là cố ý (để đọc
        // lại còn biết vì sao đổi).
        expect(LANE).not.toContain('previousFinalTranscript =')
        expect(LANE).not.toContain('=== previousFinalTranscript')
    })

    it('25 · ② nhãn ÂM được giữ lại và chuyền cho câu không có nhãn, kèm hạn tươi', () => {
        expect(LANE).toContain('const VENDOR_TAG_CARRY_MS')
        // Nhặt ở CẢ HAI đường: bản chốt của máy nghe, và dòng partial (nhãn tươi nhất có thể có).
        expect(body(LANE, 'function acceptFinalText(')).toContain('noteVendorTag(vendorLanguage, Date.now())')
        expect(body(LANE, 'function handlePartial(')).toContain('noteVendorTag(')
        // Chỉ mượn khi câu này KHÔNG có nhãn riêng — nhãn thật luôn thắng nhãn mượn.
        expect(LANE).toContain('const vendorCarriedRaw = vendorLanguage ? undefined : carriedVendorTag(finalAt)')
    })

    it('26 · ③ trần 25s có đường CẤP CỨU, không bỏ cuộc vì thiếu partial', () => {
        // Đây là lỗi treo: `scribeLastPartial` bị xoá ở mỗi lần chốt lượt và chỉ được ghi lại khi CÓ
        // partial về. Máy nghe câm ⇒ không partial ⇒ trần bỏ cuộc ⇒ hẹn lại trọn 25s ⇒ lặp vô hạn.
        expect(LANE).toContain("sendManualCommit('max-duration', true)")
        expect(LANE).toContain('function sendManualCommit(reason: ScribeManualCommitReason, atCeiling = false)')
        expect(LANE).toContain('if (scribeCommitPending && !atCeiling) return false')
        // Nhưng cấp cứu vẫn phải có bằng chứng CÓ TIẾNG, nếu không một phòng im sẽ bị bắn lệnh chốt suốt
        // buổi. Bằng chứng là micro (`lastLoudAt`), không phải dòng chữ trả về.
        expect(LANE).toContain('const soundSinceCommit = lastLoudAt > 0 && lastLoudAt >= scribeLastCommitAt')
        expect(LANE).toContain('if (!scribeLastPartial.trim() && !(atCeiling && soundSinceCommit)) return false')
        // Và khi cấp cứu cũng không vào được thì phải ĐẾM — đó là số duy nhất nhìn thấy trước cái treo.
        expect(LANE).toContain('ceilingNoops += 1')
        expect(CONSOLE).toContain('diag.ceilingNoops')
    })

    it('27 · cả ba đều dọn sạch ở phiên mới — buổi trước không được quyết chuyện buổi này', () => {
        const start = body(LANE, 'async function start(startOpts: StartOpts)')
        for (const line of ['echoMemory = []', "lastVendorTag = ''", 'carriedTags = 0', 'ceilingNoops = 0', 'forceGapWaits = 0']) {
            expect(start, line).toContain(line)
        }
    })

    it('28 · rác không lên tường: hai chốt của `notLanguage` nằm trong đúng đường mà câu nhả sớm cũng đi qua', () => {
        const fn = body(LANE, 'function acceptFinalText(')
        expect(fn).toContain('if (hasNoLetters(transcript))')
        expect(fn).toContain('if (isSyllableSoup(transcript))')
        // Đọc `transcript` chứ không phải `incoming`: mảnh `"` cô độc chỉ LỘ RA sau khi đã trừ phần nhả
        // sớm và phần máy nghe đọc lại. Soi trên chữ thô là bỏ sót đúng cái ca đã đo được.
        expect(fn).not.toContain('hasNoLetters(incoming)')
        expect(fn).not.toContain('isSyllableSoup(incoming)')
        // Và dùng lại bộ đếm sẵn có, để dòng "bỏ tiếng không phải giọng" trên màn hiện ra mà không phải
        // thêm một ô số thứ hai nói về cùng một chuyện.
        expect(fn).toContain("lastNonSpeechReason = 'không có chữ nào'")
        expect(fn).toContain("lastNonSpeechReason = 'cháo âm tiết'")
        expect(CONSOLE).toContain('diag.lastNonSpeechReason')
    })

    it('29 · THỨ TỰ là cả vấn đề — rác phải bị chặn TRƯỚC khi nó kịp bỏ phiếu', () => {
        // Đứng sau `rememberEcho` thì cháo âm tiết vào bộ nhớ chống-đọc-lại và thành dao cắt câu thật.
        // Đứng sau `noteVendorTag` thì nhãn của cái ngôn ngữ máy nghe ĐANG KẸT được chuyền cho câu sau —
        // đúng lúc câu sau cần mượn nhãn nhất, vì đó là chỗ nối giữa hai người nói.
        const fn = body(LANE, 'function acceptFinalText(')
        const soup = fn.indexOf('if (isSyllableSoup(transcript))')
        const letters = fn.indexOf('if (hasNoLetters(transcript))')
        const remember = fn.indexOf('echoMemory = rememberEcho(')
        const note = fn.indexOf('noteVendorTag(vendorLanguage')
        for (const [name, at] of [['hasNoLetters', letters], ['isSyllableSoup', soup]] as const) {
            expect(at, name).toBeGreaterThan(-1)
            expect(at, `${name} phải đứng trước rememberEcho`).toBeLessThan(remember)
            expect(at, `${name} phải đứng trước noteVendorTag`).toBeLessThan(note)
        }
    })

    it('30 · đường partial cũng vậy — cháo không được gắn nhãn cho câu kế tiếp', () => {
        expect(body(LANE, 'function handlePartial(')).toContain('if (!isSyllableSoup(base))')
    })

    it('31 · và cháo cũng không được lên tường ở dạng chữ MỜ', () => {
        const fn = body(LANE, 'function handlePartial(')
        expect(fn).toContain('if (isSyllableSoup(live)) return')
        // Phải chặn TRƯỚC khi vẽ và trước khi đặt lịch dịch — chặn sau thì tường đã hiện rác rồi, và một
        // lượt gọi bộ dịch đã tiêu cho nó.
        const gate = fn.indexOf('if (isSyllableSoup(live)) return')
        expect(gate).toBeGreaterThan(-1)
        expect(gate).toBeLessThan(fn.indexOf('emitLine({'))
        expect(gate).toBeLessThan(fn.indexOf('scheduleDraft()'))
        // Soi `live` (phần chưa nhả) chứ không phải cả dòng ghép với bộ đệm đoạn: ghép vào rồi soi là để
        // một câu thật đã chốt pha loãng tỉ lệ gạch của phần rác đang tới.
        expect(fn).not.toContain('isSyllableSoup(currentInterimSource)')
    })
})

describe('buổi lễ hay cuộc họp — chọn theo việc có kịch bản hay không', () => {
    it('9 · có kịch bản ⇒ anchor (nghỉ về chiều nền); không có ⇒ free (nghỉ mở lại câu hỏi)', () => {
        const start = body(LANE, 'async function start(startOpts: StartOpts)')
        expect(start).toContain("router.setBaseMode(scriptRows ? 'anchor' : 'free')")
        // Phải đặt SAU khi đếm được số dòng kịch bản, nếu không nó luôn thấy 0 và cả buổi lễ chạy như họp.
        expect(start.indexOf('scriptRows = scriptSeed.length')).toBeLessThan(start.indexOf('setBaseMode'))
    })

    it('10 · màn điều khiển nói ra lý do chiều dịch, để người vận hành thấy nó đang nghĩ gì', () => {
        expect(LANE).toContain('lastRouterReason: string')
        expect(CONSOLE).toContain('diag.lastRouterReason')
    })
})
