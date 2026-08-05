import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// TASK 35 — the guided panel on the console. Source guards, like every other UI assertion in this repo:
// the vitest environment is `node`, nothing is rendered.

const CONSOLE = readFileSync(new URL('../src/lib/lanes/online/components/OnlineConsole.tsx', import.meta.url), 'utf8')
const FACADE = readFileSync(new URL('../src/lib/lanes/online/index.ts', import.meta.url), 'utf8')

describe('guidedConsole — bảng dẫn', () => {
  it('1 · bảng có mặt và đọc trạng thái từ làn', () => {
    expect(CONSOLE).toContain('Dẫn theo kịch bản')
    expect(CONSOLE).toContain('lane.guided.armed')
  })

  // PHẦN 6 ghim đúng một vế: `lane.script.length > 0 && (`. TASK 58 nới ra, có chủ ý — Timeline đáng giá
  // nhất ở những buổi KHÔNG có kịch bản (video, bài hát, Yosakoi: việc của nó là tự câm, chẳng dính gì tới
  // kịch bản). Luật cũ "không có gì thì không bày bảng" vẫn nguyên, chỉ rộng thêm một vế; và mọi thứ THẬT
  // SỰ cần kịch bản vẫn nằm sau cổng riêng của nó.
  it('2 · không kịch bản mà cũng không Timeline thì không có bảng; có một trong hai là hiện', () => {
    expect(CONSOLE).toContain('(lane.script.length > 0 || runSegments.length > 0) && (')
    expect(CONSOLE).toContain('{lane.script.length > 0 && (<>')
  })

  it('3 · hai nút TỚI/LÙI, và cả hai đều biết tự tắt', () => {
    expect(CONSOLE).toContain('lane.stepGuided(-1)')
    expect(CONSOLE).toContain('lane.stepGuided(1)')
    expect(CONSOLE).toContain('disabled={lane.guided.index <= 0}')
    expect(CONSOLE).toContain('disabled={lane.guided.index >= lane.script.length - 1}')
  })

  it('4 · bấm thẳng vào một dòng là chuyển con trỏ tới dòng đó', () => {
    expect(CONSOLE).toContain('lane.setGuidedIndex(i)')
  })

  // TASK 58 dựng lại bảng này bằng Tailwind/M3 nên lớp CSS tay `guided-line-now` không còn; thứ được ghim
  // bây giờ là CHÍNH cái quyết định "dòng nào đang tới lượt", cộng cái ref tự cuộn nó vào tầm mắt — dòng
  // thứ 180 của kịch bản mà không tự cuộn thì nhìn ra cũng bằng thừa.
  it('5 · dòng đang tới lượt nhìn ra ngay, và tự cuộn vào tầm mắt', () => {
    expect(CONSOLE).toContain('const now = i === lane.guided.index')
    expect(CONSOLE).toContain("now ? 'border-secondary bg-secondary/[0.14]'")
    expect(CONSOLE).toContain('ref={now ? guidedLineRef : undefined}')
  })

  // Ghi chú an toàn vẫn phải có, nhưng nay nó phải NÓI THẬT. Con số in ra không còn là hằng số 45% mà là
  // sàn đang chạy, do nấc trong Cài đặt quyết định; và nấc "Thả cửa" (sàn 0) đảo ngược hẳn lời trấn an —
  // ở nấc đó bấm nhầm dòng LÀ phòng tiệc nghe nhầm câu, nên màn hình phải nói đúng như thế.
  it('6 · ghi chú an toàn in đúng sàn đang chạy, và đảo lời khi nấc là "Thả cửa"', () => {
    expect(CONSOLE).toContain('bấm nhầm dòng không làm buổi lễ tệ đi')
    expect(CONSOLE).toContain('Math.round(guidedMatchFloor(matchStep) * 100)')
    expect(CONSOLE).toContain('guidedMatchFloor(matchStep) > 0')
    expect(CONSOLE).toContain('Bấm nhầm dòng là phòng tiệc nghe nhầm câu')
    // và không còn đường nào in ra hằng số mặc định
    expect(CONSOLE).not.toContain('GUIDED_FLOOR')
  })

  it('7 · con trỏ KHÔNG BAO GIỜ được nhớ qua phiên', () => {
    for (const line of FACADE.split('\n')) {
      const lower = line.toLowerCase()
      if (lower.includes('guided') && lower.includes('localstorage')) {
        throw new Error(`con trỏ dẫn bị lưu vào localStorage: ${line.trim()}`)
      }
    }
    expect(FACADE).toContain('const [guided, setGuided] = useState<GuidedState>(GUIDED_OFF)')
  })
})

describe('guidedConsole — ô "đang tới lượt"', () => {
  // Nhãn nay viết hoa theo hàng nhãn của màn console; và danh sách gợi ý vẫn lấy từ danh sách diễn giả của
  // buổi chứ không phải một kho tên nào khác — đó mới là điều ca này giữ.
  it('8 · ô chọn người có mặt, gợi ý tên lấy từ danh sách diễn giả của buổi', () => {
    expect(CONSOLE).toContain('ĐANG TỚI LƯỢT')
    expect(CONSOLE).toContain('(event?.speakers ?? []).filter((s) => s.name.trim())')
    // và lối thoát "gõ tay" vẫn còn, cho buổi chưa ai điền danh sách
    expect(CONSOLE).toContain('<option value={OTHER_SPEAKER}>Khác… (gõ tên)</option>')
  })

  it('9 · ô tick dẫn bị khoá khi người nói không bám kịch bản', () => {
    expect(CONSOLE).toContain('disabled={!guidedAllowed(lane.speakerMode)}')
  })

  it('10 · luật MỘT CHIỀU nằm ở facade chứ không phải chỉ ở giao diện', () => {
    // Đổi kiểu người nói phải TẮT dẫn; và không đường nào bật nó lên hộ người vận hành.
    expect(FACADE).toContain('if (!guidedAllowed(mode)) setGuided')
    expect(FACADE).toContain('armed && !guidedAllowed(speakerModeRef.current)')
  })
})

// TASK 58 — ô "ĐANG TỚI PHẦN". Đây là mặt lớn nhất mà TASK 58 thêm vào màn console và tới giờ chưa ca nào
// ghim: bấm sang một đoạn của Timeline phải đặt CẢ BỐN thứ mà hôm nay người điều khiển bấm rời rạc giữa
// buổi lễ. Gala 08/08 có ~17 đoạn máy bắt buộc phải câm rải trong bốn tiếng — quên đúng một cái là loa
// phòng tiệc đọc lời bài hát.
describe('guidedConsole — ô "đang tới phần"', () => {
  it('11 · chỉ những đoạn CHẠY ĐƯỢC mới vào ô chọn, dòng nhan đề bị loại', () => {
    expect(CONSOLE).toContain("const runSegments = useMemo(() => (event?.segments ?? []).filter((s) => !s.divider), [event])")
  })

  it('12 · bấm sang một đoạn đặt đủ bốn thứ trong MỘT lời gọi, cộng bối cảnh riêng của đoạn', () => {
    expect(CONSOLE).toContain('lane.setSegmentBrief(collectSegmentBrief(event, seg.docIds, segmentSpeakerName(seg, event)))')
    const at = CONSOLE.indexOf('lane.applySegment({')
    expect(at).toBeGreaterThan(0)
    const call = CONSOLE.slice(at, CONSOLE.indexOf('})', at))
    for (const key of ['speakerName:', 'mode:', 'listen:', 'scriptIndex:', 'language:']) {
      expect(call).toContain(key)
    }
  })

  it('13 · con trỏ chỉ nhảy khi neo giải được; giải không ra thì bỏ trỏ chứ không đoán bừa', () => {
    expect(CONSOLE).toContain('const a = resolveScriptAnchor(seg, lane.script, allScriptRows)')
    expect(CONSOLE).toContain('scriptIndex: a.kind === \'ok\' ? a.index : -1,')
    // "mất dòng" khác "dòng chưa duyệt" — phân biệt được là nhờ danh sách MỌI dòng của buổi, lấy từ CÙNG
    // một lần đọc kho kịch bản chứ không mở kho lần hai.
    expect(CONSOLE).toContain('scriptLoad.allRows.map((r) => ({ id: r.id, src: r.src }))')
  })

  it('14 · đoạn đang chạy nói thẳng máy đang nghe hay đang câm', () => {
    expect(CONSOLE).toContain("segmentListens(curSegment) ? 'MÁY ĐANG NGHE' : 'MÁY ĐANG CÂM'")
    // và khoá chiều gắn cho đoạn phải tự thú khi phiên đang MỘT CHIỀU, lúc đó nó là nút bấm giả
    expect(CONSOLE).toContain('segmentLanguage(curSegment, event) && !lane.twoWay')
  })
})
