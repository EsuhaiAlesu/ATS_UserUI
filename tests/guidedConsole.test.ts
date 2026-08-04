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

  it('2 · chưa nạp kịch bản thì không có bảng', () => {
    expect(CONSOLE).toContain('lane.script.length > 0 && (')
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

  it('5 · dòng đang tới lượt có lớp riêng để nhìn ra ngay', () => {
    expect(CONSOLE).toContain('guided-line-now')
  })

  it('6 · ghi chú an toàn nói rõ bấm sai thì không tệ hơn khi tắt', () => {
    expect(CONSOLE).toContain('bấm sai')
    expect(CONSOLE).toContain('GUIDED_FLOOR')
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
  it('8 · ô chọn người có mặt, gợi ý tên lấy từ danh sách diễn giả của buổi', () => {
    expect(CONSOLE).toContain('Đang tới lượt')
    expect(CONSOLE).toContain('guided-speaker-names')
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
