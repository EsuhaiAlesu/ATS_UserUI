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
// Bấm "Mở màn" lần thứ hai — cái phản xạ của người điều khiển sau mỗi thay đổi nhỏ.
//
// Trước bản vá này, mỗi lần bấm là MỌI cửa sổ đang mở bị `moveTo` + `resizeTo` về đúng ô đã tính, vô
// điều kiện. Trên sân khấu điều đó có nghĩa: tấm màn mà kỹ thuật đã kéo sang LED và bấm toàn màn hình
// nhảy ra khỏi toàn màn hình và về lại laptop, trước mặt cả hội trường. Hai chốt chặn, cả hai đều hẹp:
// cửa sổ đang toàn màn hình thì không đụng vào, và một ô y hệt ô lần trước thì không phải một cú dời.
describe('openWallWindows — mở lại cửa sổ đã mở', () => {
  type StubWin = {
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
      open: () => win,
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
})
