import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DEFAULT_WALL_OUTPUTS, loadWallOutputs, saveWallOutputs, scanWallScreens,
  type WallOutput,
} from '../src/lib/lanes/online/audienceWindows'

// Only the pure logic that runs in node without a DOM is covered here — window.open / getScreenDetails
// need a browser. A tiny Map-backed localStorage stub lets us exercise the load/save/merge path.
function makeStorage(): Storage {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => { m.set(k, String(v)) },
    removeItem: (k: string) => { m.delete(k) },
    clear: () => { m.clear() },
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size },
  } as unknown as Storage
}

const g = globalThis as unknown as { localStorage?: Storage }
const out = (id: string) => (o: WallOutput) => o.id === id

describe('loadWallOutputs', () => {
  beforeEach(() => { g.localStorage = makeStorage() })
  afterEach(() => { delete g.localStorage })

  it('returns exactly the three defaults when nothing is stored', () => {
    const list = loadWallOutputs()
    expect(list.map((o) => o.id)).toEqual(['center', 'left', 'right'])
    expect(list).toEqual(DEFAULT_WALL_OUTPUTS)
  })

  it('merges a partial stored entry over its default and ignores unknown ids', () => {
    g.localStorage!.setItem('proyaku_online_wall_outputs', JSON.stringify([
      { id: 'left', enabled: false, screenIdx: 2 }, // only two fields present
      { id: 'ghost', enabled: true, view: 'both' },  // unknown id → dropped
    ]))
    const list = loadWallOutputs()
    expect(list.map((o) => o.id)).toEqual(['center', 'left', 'right']) // still the 3 defaults
    const left = list.find(out('left'))!
    expect(left.enabled).toBe(false)      // stored value wins
    expect(left.screenIdx).toBe(2)        // stored value wins
    expect(left.view).toBe('vi2ja')       // absent field falls back to default
    expect(left.label).toBe('Màn trái')   // absent field falls back to default
    expect(list.some(out('ghost'))).toBe(false)
  })

  it('drops corrupt fields (bad view, non-numeric screenIdx) back to the default', () => {
    g.localStorage!.setItem('proyaku_online_wall_outputs', JSON.stringify([
      { id: 'center', view: 'garbage', screenIdx: 'x' },
    ]))
    const center = loadWallOutputs().find(out('center'))!
    expect(center.view).toBe('both')          // invalid view ignored
    expect(center.screenIdx).toBeUndefined()  // invalid screenIdx ignored
  })

  it('round-trips a customised set through saveWallOutputs', () => {
    const custom = loadWallOutputs().map((o) => (o.id === 'right' ? { ...o, showSource: true, screenIdx: 1 } : o))
    saveWallOutputs(custom)
    const right = loadWallOutputs().find(out('right'))!
    expect(right.showSource).toBe(true)
    expect(right.screenIdx).toBe(1)
  })

  it('falls back to the defaults when localStorage is unavailable', () => {
    delete g.localStorage
    expect(loadWallOutputs()).toEqual(DEFAULT_WALL_OUTPUTS)
  })
})

describe('scanWallScreens', () => {
  const mk = (id: string, screenIdx?: number): WallOutput =>
    ({ id, label: id, enabled: true, view: 'both', showSource: false, screenIdx })

  it('clears a screenIdx that points past the detected screen count', () => {
    const scanned = scanWallScreens([mk('center', 0), mk('left', 2)], 1) // only 1 screen remains
    expect(scanned.find(out('center'))!.screenIdx).toBe(0)       // 0 < 1 → kept
    expect(scanned.find(out('left'))!.screenIdx).toBeUndefined() // 2 >= 1 → cleared
  })

  it('clears every assignment when no screens are detected', () => {
    expect(scanWallScreens([mk('center', 0)], 0)[0].screenIdx).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Bấm lại nút vàng "Xuất lại" — cái phản xạ của người điều khiển sau mỗi thay đổi nhỏ.
//
// Trước bản vá này, mỗi lần bấm là MỌI cửa sổ đang mở bị `moveTo` + `resizeTo` về đúng ô đã tính, vô
// điều kiện. Trên sân khấu điều đó có nghĩa: tấm màn mà kỹ thuật đã kéo sang LED và bấm toàn màn hình
// nhảy ra khỏi toàn màn hình và về lại laptop, trước mặt cả hội trường. Hai chốt chặn, cả hai đều hẹp:
// cửa sổ đang toàn màn hình thì không đụng vào, và một ô y hệt ô lần trước thì không phải một cú dời.
describe('openWallWindows — mở lại cửa sổ đã mở', () => {
  type StubWin = {
    // Sổ ghi đi THEO cửa sổ, không phải theo biến ngoài: `boot()` cần ghi lại tham số của `window.open`,
    // mà nó chỉ nhận được `win`. Ghi vào một biến ngoài tầm vực thì `push` ném lỗi, và lỗi đó bị chính
    // `try/catch` quanh `window.open` nuốt mất — ca test hoá ra xanh/đỏ vì một lý do không ai thấy.
    acts: string[]
    closed: boolean
    document: { fullscreenElement: unknown }
    location: { replace: (u: string) => void }
    moveTo: (l: number, t: number) => void
    resizeTo: (w: number, h: number) => void
    focus: () => void
    close: () => void
  }

  function makeWin(acts: string[]): StubWin {
    return {
      acts,
      closed: false,
      document: { fullscreenElement: null },
      location: { replace: (u) => { acts.push(`replace ${u}`) } },
      moveTo: (l, t) => { acts.push(`moveTo ${l},${t}`) },
      resizeTo: (w, h) => { acts.push(`resizeTo ${w},${h}`) },
      focus: () => { acts.push('focus') },
      close: () => { acts.push('close') },
    }
  }

  const out1: WallOutput = { id: 'center', label: 'Màn giữa', enabled: true, view: 'both', showSource: false, screenIdx: 0 }
  const scr = (left: number) => [{ left, top: 0, width: 1024, height: 2048, label: 'LED' }]

  async function boot(win: StubWin) {
    vi.resetModules()
    ;(globalThis as unknown as { window: unknown }).window = {
      screen: { availWidth: 1920, availHeight: 1080 },
      innerWidth: 1920, innerHeight: 1080,
      // Ghi lại CẢ tham số, không chỉ trả về cửa sổ. Nhánh mở-mới của TASK 136.3 tồn tại đúng vì nó hỏi
      // bằng địa chỉ RỖNG (`window.open('', tên)`) — hỏi bằng địa chỉ thật là nạp lại trang và mất toàn
      // màn hình. Stub bỏ qua tham số thì không ca nào thấy được sự khác nhau đó.
      open: (u: string, n: string) => { win.acts.push(`open ${u === '' ? '(rong)' : u}|${n}`); return win },
    }
    return import('../src/lib/lanes/online/audienceWindows')
  }

  afterEach(() => { delete (globalThis as unknown as { window?: unknown }).window })

  it('bấm lại mà không có gì đổi ⇒ không dời, không đổi cỡ', async () => {
    const acts: string[] = []
    const win = makeWin(acts)
    const mod = await boot(win)
    mod.openWallWindows([out1], scr(0), 40)
    expect(acts.filter((a) => a.startsWith('moveTo'))).toHaveLength(1) // lần mở đầu: có

    acts.length = 0
    const again = mod.openWallWindows([out1], scr(0), 40)
    expect(again.opened).toBe(1)
    expect(acts.some((a) => a.startsWith('moveTo') || a.startsWith('resizeTo'))).toBe(false)
  })

  it('cửa sổ đang TOÀN MÀN HÌNH ⇒ không đụng vào, kể cả khi ô đã tính đổi chỗ', async () => {
    const acts: string[] = []
    const win = makeWin(acts)
    const mod = await boot(win)
    mod.openWallWindows([out1], scr(0), 40)

    win.document.fullscreenElement = {} // kỹ thuật đã kéo sang LED và bấm F
    acts.length = 0
    mod.openWallWindows([out1], scr(1920), 40) // màn hình được gán nay nằm chỗ khác
    expect(acts.some((a) => a.startsWith('moveTo') || a.startsWith('resizeTo'))).toBe(false)
  })

  it('ô đã tính ĐỔI thật, cửa sổ không toàn màn hình ⇒ vẫn đưa về đúng chỗ', async () => {
    const acts: string[] = []
    const win = makeWin(acts)
    const mod = await boot(win)
    mod.openWallWindows([out1], scr(0), 40)

    acts.length = 0
    mod.openWallWindows([out1], scr(1920), 40)
    expect(acts).toContain('moveTo 1920,0')
    expect(acts).toContain('resizeTo 1024,2048')
  })

  it('đang toàn màn hình mà đổi cỡ chữ ⇒ KHÔNG nạp lại trang, tường đứng yên trên LED', async () => {
    // `&cm=` CHỈ vào url khi màn có số đo mét (`hasPhysicalSize`). Thiếu mét thì đổi cỡ chữ không đổi url,
    // và ca test sẽ xanh vì một lý do khác hẳn cái nó tự nhận — gỡ hẳn chốt chặn ra nó vẫn xanh. Nên ca này
    // dựng một màn CÓ mét, đúng như mọi màn ngoài đời. Trước đây lệnh nạp lại đứng TRƯỚC hai chốt chặn, nên
    // một cú chỉnh cỡ chữ đủ để kéo màn LED ra khỏi toàn màn hình ngay giữa buổi.
    const led: WallOutput = { ...out1, widthM: 6, heightM: 3 }
    const acts: string[] = []
    const win = makeWin(acts)
    const mod = await boot(win)
    mod.openWallWindows([led], scr(0), 40, 12)

    // TIỀN ĐỀ, ca này phải tự chứng minh chứ không được tin. Chưa toàn màn hình thì đúng cú đổi cỡ chữ
    // đó PHẢI nạp lại trang — đó là bằng chứng `&cm=` thật sự vào url. Thiếu bước này, ngày nào đó
    // `&cm=` rời khỏi url là ca test xanh vì url không đổi, chứ không phải vì chốt chặn làm đúng việc:
    // gỡ hẳn chốt chặn ra nó vẫn xanh, và cái hỏng đi thẳng lên LED giữa buổi.
    acts.length = 0
    mod.openWallWindows([led], scr(0), 40, 18)
    expect(acts.some((a) => a.startsWith('replace'))).toBe(true)

    win.document.fullscreenElement = {} // kỹ thuật đã kéo sang LED và bấm F
    acts.length = 0
    mod.openWallWindows([led], scr(0), 40, 24) // cùng một cú đổi cỡ chữ, url vẫn đổi THẬT
    expect(acts.some((a) => a.startsWith('replace'))).toBe(false)
    expect(acts.some((a) => a.startsWith('moveTo') || a.startsWith('resizeTo'))).toBe(false)
  })

  it('Bảng điều khiển vừa F5 ⇒ tường toàn màn hình không bị nạp lại, không bị kéo về', async () => {
    // F5 xoá sạch Map trong module, nên cửa sổ tường quay lại bằng nhánh MỞ MỚI chứ không phải nhánh
    // dùng lại. `window.open('', tên)` phải trả về cửa sổ cũ mà KHÔNG đụng vào nó.
    const acts: string[] = []
    const win = makeWin(acts)
    const mod = await boot(win)
    mod.openWallWindows([out1], scr(0), 40)

    win.document.fullscreenElement = {}
    acts.length = 0
    const afterReload = await boot(win) // nạp lại module = đúng cảnh F5
    const res = afterReload.openWallWindows([out1], scr(1920), 40)
    expect(res.opened).toBe(1)
    // Đây là khẳng định thật của ca này: lần hỏi ĐẦU TIÊN sau F5 phải đi kèm địa chỉ RỖNG, để lấy lại
    // cửa sổ cũ mà không nạp lại nó. Hỏi bằng `/wall?...` là trang nạp lại và toàn màn hình bay ngay.
    expect(acts[0]).toBe('open (rong)|proyaku-wall-center')
    expect(acts.some((a) => a.startsWith('open /wall'))).toBe(false)
    expect(acts.some((a) => a.startsWith('moveTo') || a.startsWith('resizeTo'))).toBe(false)
  })
})
