import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
