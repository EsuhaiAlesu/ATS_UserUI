import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
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

// ---------------------------------------------------------------------------
// PROMPT-20 · việc 1 — làn OFFLINE đang kéo tường của làn ONLINE ra khỏi toàn màn hình.
//
// Hai làn đặt CÙNG MỘT tên cửa sổ `proyaku-wall-${id}` trên CÙNG bộ id center/left/right, nên trình duyệt
// coi cửa sổ của hai làn là MỘT. Làn ONLINE đã có chốt chặn từ TASK 136; làn OFFLINE thì không có gì —
// nó `moveTo`/`resizeTo` vô điều kiện. Hậu quả ở hội trường: tường ONLINE đang toàn màn hình trên LED, ai
// đó gạt sang OFFLINE rồi bấm "Mở màn phụ đề" là cửa sổ đó bị lôi về màn chính trước mặt phòng.
//
// `openSubOutputs` nằm TRONG một component React và không được export; bộ test này chạy ở môi trường node
// không có DOM, nên không gọi thẳng được. Xuất nó ra chỉ để test thì sinh cảnh báo `only-export-components`
// mới và làm đỏ cổng oxlint. Nên hai ca dưới đây soi MÃ NGUỒN — cùng kỹ thuật mà cả kho đã dùng cho những
// khẳng định kiểu này. Để chúng không thành ca trang trí, mã được BỎ CHÚ THÍCH trước khi dò (bọc một dòng
// vào `/* */` cũng phải đỏ, y như xoá hẳn), và ca ghim cả THỨ TỰ chứ không chỉ sự có mặt.
describe('làn OFFLINE không được đụng vào tường đang toàn màn hình (PROMPT-20 việc 1)', () => {
  // Bỏ chú thích TRƯỚC khi dò: bọc một dòng vào `/* */` là chuỗi vẫn nằm trong tệp, nên dò trên bản thô
  // thì mã chết mà ca vẫn xanh — đúng cái bẫy đã sập nhiều lần trong dự án này.
  const routing = readFileSync(new URL('../src/pages/AudioRouting.tsx', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n')
  // Và ghim NGUYÊN VĂN đã gộp khoảng trắng, không ghim từng mảnh rời.
  //
  // Vì sao phải chặt tới mức này: vòng nghiệm thu đã chứng minh bộ khẳng định kiểu `toContain` từng mảnh
  // bị qua mặt dễ dàng mà không đụng một chữ nào của các mảnh đó — chèn `return false;` NGAY TRƯỚC dòng
  // `try`, hoặc thêm `&& false` vào điều kiện, hoặc chèn một lệnh dời cửa sổ TRƯỚC chốt: mọi chuỗi được
  // dò vẫn còn nguyên, mã đã chết, và cả 15 ca vẫn xanh. So nguyên khối thì mọi kiểu chèn đều đỏ.
  //
  // Cái giá phải trả, nói thẳng: sửa hợp lệ ba khối này cũng làm đỏ. Đó là CỐ Ý — đây là bản đóng băng v1
  // trước khi bàn giao, không phải mã đang phát triển; ba khối này không được đổi mà không ai hay.
  const nen = (t: string) => t.split(/\s+/).filter(Boolean).join(' ')

  it('phép hỏi "đang toàn màn hình không" phải hỏi THẬT — nguyên khối, không chèn được gì vào', () => {
    const i = routing.indexOf('function isWallFullscreen')
    expect(i).toBeGreaterThan(-1)
    expect(nen(routing.slice(i, routing.indexOf('\n}', i) + 2))).toBe(
      'function isWallFullscreen(win: Window): boolean { try { return win.document.fullscreenElement != null; } catch { return false; } }',
    )
    // Bản sao cục bộ, KHÔNG với sang làn online: luật hai làn cấm mọi tệp ngoài `lanes/online/` nhập sâu
    // vào trong, và `isFullscreen` bên ấy cố ý không export.
    expect(routing).not.toMatch(/from\s+['"][^'"]*lanes\/online\/audienceWindows/)
  })

  it('lối 1 · cửa sổ làn này đang nhớ: toàn màn hình thì thoát TRƯỚC mọi lệnh dời/đổi cỡ/điều hướng', () => {
    const chot = routing.indexOf('if (isWallFullscreen(prev.win))')
    const dieuHuong = routing.indexOf('prev.win.location.replace(url)')
    const doi = routing.indexOf('prev.win.moveTo(left, top)')
    expect(chot).toBeGreaterThan(-1)
    expect(dieuHuong).toBeGreaterThan(-1)
    expect(doi).toBeGreaterThan(-1)
    // Nguyên khối: chèn thêm bất cứ lệnh nào vào giữa chốt là đỏ.
    expect(nen(routing.slice(chot, routing.indexOf('\n', chot)))).toBe(
      'if (isWallFullscreen(prev.win)) { opened++; return; }',
    )
    // Thứ tự mới là điều đáng ghim: đặt chốt SAU lệnh dời thì nó vô dụng, mà mọi khẳng định "có mặt" vẫn xanh.
    expect(chot).toBeLessThan(dieuHuong)
    expect(chot).toBeLessThan(doi)
    // Và giữa đầu nhánh `prev` với chốt KHÔNG được có lệnh nào đụng vào cửa sổ.
    const dauNhanh = routing.indexOf('if (prev && !prev.win.closed) {')
    expect(dauNhanh).toBeGreaterThan(-1)
    expect(dauNhanh).toBeLessThan(chot)
    expect(routing.slice(dauNhanh, chot)).not.toMatch(/prev\.win\.(moveTo|resizeTo|focus|location)/)
  })

  it('lối 2 · dò bằng url RỖNG trước, nhận về thì ghi url RỖNG — không ghi url chưa hề được nạp', () => {
    const i = routing.indexOf('let probe: Window | null = null;')
    const j = routing.indexOf('let win: Window | null = null;')
    expect(i).toBeGreaterThan(-1)
    expect(j).toBeGreaterThan(i)   // dò PHẢI đi trước; hỏi bằng url là trang nạp lại, toàn màn hình bay ngay
    expect(nen(routing.slice(i, j))).toBe(
      "let probe: Window | null = null; try { probe = window.open('', name, feat); } catch { probe = null; } "
      + 'let probeAlive = false; try { probeAlive = probe != null && !probe.closed; } catch { probeAlive = false; } '
      + "if (probeAlive && probe && isWallFullscreen(probe)) { wallWinsRef.current[o.id] = { win: probe, url: '' }; opened++; return; }",
    )
    // `url: ''` là chỗ vòng nghiệm thu bắt được lỗi thật, nên ghim riêng một lần nữa cho rõ ý.
    //
    // Cửa sổ nhận về đang chiếu trang của làn KIA, không phải `url`. Ghi `url` vào sổ thì lần bấm sau lối 1
    // thấy `prev.url === url` và không bao giờ điều hướng — cửa sổ kẹt vĩnh viễn ở trang làn kia trong khi
    // nút vẫn báo mở thành công. Làn ONLINE tránh đúng bẫy này bằng cách không đụng tới `wallUrls`.
    expect(routing).toContain("wallWinsRef.current[o.id] = { win: probe, url: '' };")
    expect(routing).not.toContain('wallWinsRef.current[o.id] = { win: probe, url };')
    // Hai làn phải dùng ĐÚNG một tên, nếu không thì cả chốt này canh nhầm cửa sổ.
    expect(routing).toContain('const name = `proyaku-wall-${o.id}`;')
  })
})
