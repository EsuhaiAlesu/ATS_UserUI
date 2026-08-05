import { describe, it, expect } from 'vitest'
import {
  wallWindowGeometry,
  DEFAULT_WALL_OUTPUTS,
  DOCK_MIN_W,
  DOCK_MAX_W,
  DOCK_FRACTION,
  type WallOutput,
  type WallScreen,
} from '../src/lib/lanes/online/audienceWindows'
import { wallLayout, wallNeedsTouchControls, WALL_SCALE } from '../src/lib/audienceSubtitles'
import { DEFAULT_HALL_WALLS } from '../src/lib/hallScreens'

// Both modules are pure and take their dimensions as arguments, so no DOM is needed here.
const output = (o: Partial<WallOutput> = {}): WallOutput => ({
  id: 'center', label: 'Màn giữa', enabled: true, view: 'both', showSource: false, ...o,
})

const HALL: WallScreen[] = [
  { left: 0, top: 0, width: 1920, height: 1080, label: 'Màn 1' },
  { left: 1920, top: 0, width: 3840, height: 2160, label: 'Màn 2' },
]
const LAPTOP = { width: 1920, height: 1080 }

describe('wallWindowGeometry', () => {
  it('with no dock and no monitor it is still the even slice (Bước 1, unchanged)', () => {
    // Three windows share the current screen; the operator drags each onto its hall monitor.
    for (const dock of [undefined, 'full' as const]) {
      const o = output({ dock })
      expect(wallWindowGeometry(o, [], 0, 3, LAPTOP)).toEqual({ left: 0, top: 0, width: 640, height: 1080 })
      expect(wallWindowGeometry(o, [], 1, 3, LAPTOP)).toEqual({ left: 640, top: 0, width: 640, height: 1080 })
      expect(wallWindowGeometry(o, [], 2, 3, LAPTOP)).toEqual({ left: 1280, top: 0, width: 640, height: 1080 })
      // A single window takes the whole screen.
      expect(wallWindowGeometry(o, [], 0, 1, LAPTOP)).toEqual({ left: 0, top: 0, width: 1920, height: 1080 })
    }
  })

  it('an assigned monitor is still honoured, exactly', () => {
    expect(wallWindowGeometry(output({ screenIdx: 1 }), HALL, 0, 3, LAPTOP))
      .toEqual({ left: 1920, top: 0, width: 3840, height: 2160 })
    expect(wallWindowGeometry(output({ screenIdx: 0 }), HALL, 2, 3, LAPTOP))
      .toEqual({ left: 0, top: 0, width: 1920, height: 1080 })
    // A monitor that is no longer plugged in falls back to the even slice rather than off-screen.
    expect(wallWindowGeometry(output({ screenIdx: 7 }), HALL, 1, 3, LAPTOP))
      .toEqual({ left: 640, top: 0, width: 640, height: 1080 })
  })

  it('a right dock sits flush to the right edge and full height, a left dock flush left', () => {
    const width = Math.round(LAPTOP.width * DOCK_FRACTION) // 499, inside the readable band
    expect(wallWindowGeometry(output({ dock: 'right' }), [], 0, 3, LAPTOP))
      .toEqual({ left: LAPTOP.width - width, top: 0, width, height: 1080 })
    expect(wallWindowGeometry(output({ dock: 'left' }), [], 0, 3, LAPTOP))
      .toEqual({ left: 0, top: 0, width, height: 1080 })
    // The strip ignores its index: docking is about this desk, not about sharing the screen evenly.
    expect(wallWindowGeometry(output({ dock: 'right' }), [], 2, 3, LAPTOP))
      .toEqual(wallWindowGeometry(output({ dock: 'right' }), [], 0, 1, LAPTOP))
  })

  it('a dock outranks an assigned monitor', () => {
    // A stale monitor assignment must not drag the strip onto a projector.
    const docked = wallWindowGeometry(output({ dock: 'right', screenIdx: 1 }), HALL, 0, 3, LAPTOP)
    expect(docked).toEqual(wallWindowGeometry(output({ dock: 'right' }), [], 0, 3, LAPTOP))
    expect(docked.left).toBe(LAPTOP.width - docked.width)
    expect(docked.width).toBeLessThan(HALL[1].width)
  })

  it('the strip width always stays inside its readable band', () => {
    for (const width of [800, 1024, 1280, 1440, 1920, 2560, 3840]) {
      for (const dock of ['left', 'right'] as const) {
        const g = wallWindowGeometry(output({ dock }), [], 0, 3, { width, height: 900 })
        expect(g.width).toBeGreaterThanOrEqual(DOCK_MIN_W)
        expect(g.width).toBeLessThanOrEqual(DOCK_MAX_W)
        expect(g.height).toBe(900)           // always full height
        expect(g.left + g.width).toBeLessThanOrEqual(width) // never hangs off the edge
      }
    }
    // 1024 × 0.26 = 266 → lifted to the 320 floor; 2560 × 0.26 = 666 → capped at 520.
    expect(wallWindowGeometry(output({ dock: 'left' }), [], 0, 1, { width: 1024, height: 900 }).width).toBe(DOCK_MIN_W)
    expect(wallWindowGeometry(output({ dock: 'left' }), [], 0, 1, { width: 2560, height: 900 }).width).toBe(DOCK_MAX_W)
    // On a screen narrower than the floor the strip is clamped to the screen instead of overflowing it.
    const tiny = wallWindowGeometry(output({ dock: 'right' }), [], 0, 1, { width: 280, height: 600 })
    expect(tiny).toEqual({ left: 0, top: 0, width: 280, height: 600 })
  })

  // ── cỡ màn THẬT (mét): cửa sổ tạm phải mở đúng hình dạng tấm màn ngoài hội trường ──
  it('biết cỡ màn thật thì lát tạm được nắn đúng tỉ lệ tấm màn', () => {
    // Màn chính 6 × 3 m nhận lát 640 × 1080 → mở 640 × 320. Không nắn thì người điều khiển tập dượt trên
    // một cửa sổ DỌC rồi kết luận "chừng này chữ là vừa" cho một tấm màn NGANG.
    expect(wallWindowGeometry(output({ widthM: 6, heightM: 3 }), [], 0, 3, LAPTOP))
      .toEqual({ left: 0, top: 0, width: 640, height: 320 })
    // Màn hông 3,5 × 2,5 m ở lát thứ hai: vẫn đúng chỗ, chỉ đổi hình dạng.
    const side = wallWindowGeometry(output({ widthM: 3.5, heightM: 2.5 }), [], 1, 3, LAPTOP)
    expect(side.left).toBe(640)
    expect(side.top).toBe(0)
    expect(side.width / side.height).toBeCloseTo(3.5 / 2.5, 1)
  })

  it('màn hình được gán vẫn thắng cỡ mét — màn hình ĐÃ LÀ tấm màn', () => {
    // Máy chiếu nhận bao nhiêu điểm ảnh thì lấy trọn bấy nhiêu; chữ tự ra đúng centimet nhờ hallFontPx.
    expect(wallWindowGeometry(output({ screenIdx: 1, widthM: 6, heightM: 3 }), HALL, 0, 3, LAPTOP))
      .toEqual({ left: 1920, top: 0, width: 3840, height: 2160 })
  })

  it('dải dọc vẫn thắng cỡ mét — dải là chuyện của cái bàn đang ngồi', () => {
    const docked = wallWindowGeometry(output({ dock: 'right', widthM: 6, heightM: 3 }), [], 0, 3, LAPTOP)
    expect(docked).toEqual(wallWindowGeometry(output({ dock: 'right' }), [], 0, 3, LAPTOP))
  })

  it('thiếu một cạnh thì coi như chưa khai cỡ màn — giữ nguyên nếp cũ', () => {
    // Nửa cỡ màn không suy ra được hình dạng; đoán bừa còn tệ hơn là để y như trước.
    expect(wallWindowGeometry(output({ widthM: 6 }), [], 0, 3, LAPTOP))
      .toEqual({ left: 0, top: 0, width: 640, height: 1080 })
    expect(wallWindowGeometry(output({ heightM: 3 }), [], 0, 3, LAPTOP))
      .toEqual({ left: 0, top: 0, width: 640, height: 1080 })
  })
})

describe('DEFAULT_WALL_OUTPUTS mang sẵn cỡ hội trường 20 năm', () => {
  it('ba màn mặc định đã có cỡ mét, khớp từng con số với DEFAULT_HALL_WALLS', () => {
    // Dựng từ một danh sách duy nhất (hallScreens.DEFAULT_HALL_WALLS) nên bảng điều khiển và màn tượng
    // trưng không thể mô tả hai hội trường khác nhau.
    expect(DEFAULT_WALL_OUTPUTS.map((o) => `${o.id} ${o.widthM}x${o.heightM}`))
      .toEqual(['center 6x3', 'left 3.5x2.5', 'right 3.5x2.5'])
    expect(DEFAULT_WALL_OUTPUTS.map((o) => o.enabled)).toEqual([true, true, true])
    expect(DEFAULT_WALL_OUTPUTS.map((o) => o.dock)).toEqual(['full', 'full', 'full'])
    for (const o of DEFAULT_WALL_OUTPUTS) {
      const src = DEFAULT_HALL_WALLS.find((w) => w.id === o.id)!
      expect([o.label, o.view, o.showSource]).toEqual([src.label, src.view, src.showSource])
    }
  })
})

describe('wallLayout', () => {
  it('a hall projector keeps two columns at 2.6×', () => {
    expect(wallLayout(1920, 1080, 'both')).toEqual({ stacked: false, scale: WALL_SCALE })
    expect(wallLayout(3840, 2160, 'both')).toEqual({ stacked: false, scale: WALL_SCALE })
    expect(wallNeedsTouchControls(1920)).toBe(false) // a hall window keeps the keyboard hint
  })

  it('a one-way view on a large screen is unchanged', () => {
    expect(wallLayout(1920, 1080, 'vi2ja')).toEqual({ stacked: false, scale: WALL_SCALE })
    expect(wallLayout(1920, 1080, 'ja2vi')).toEqual({ stacked: false, scale: WALL_SCALE })
    // One column uses the whole width, so even a fairly narrow window keeps hall size.
    expect(wallLayout(800, 600, 'ja2vi')).toEqual({ stacked: false, scale: WALL_SCALE })
  })

  it('a phone-shaped strip stacks and shrinks', () => {
    const strip = wallLayout(499, 1040, 'both') // the docked strip from wallWindowGeometry
    expect(strip.stacked).toBe(true)
    expect(strip.scale).toBeGreaterThan(1)
    expect(strip.scale).toBeLessThan(WALL_SCALE)
    expect(strip.scale).toBeCloseTo(499 / 400, 5)
    expect(wallNeedsTouchControls(499)).toBe(true) // no keyboard at this size — buttons instead
  })

  it('a tall window stacks even when it is wide', () => {
    // Portrait beats width: two columns side by side in a tall window are unreadable.
    expect(wallLayout(1000, 1400, 'both')).toEqual({ stacked: true, scale: WALL_SCALE })
    expect(wallLayout(1080, 1920, 'both').stacked).toBe(true)
    // …and a one-way view never stacks, whatever the shape.
    expect(wallLayout(1000, 1400, 'vi2ja').stacked).toBe(false)
  })

  it('a narrow landscape window keeps two columns but scales the text down by column width', () => {
    const narrow = wallLayout(1000, 600, 'both') // columns of 500 → below the 760 hall minimum
    expect(narrow.stacked).toBe(false)
    expect(narrow.scale).toBeCloseTo(500 / 400, 5)
    // The same width as ONE column is full size, so the shrink really does follow the column.
    expect(wallLayout(1000, 600, 'vi2ja').scale).toBe(WALL_SCALE)
    // At 1520 the two columns reach 760 and hall size returns.
    expect(wallLayout(1520, 800, 'both')).toEqual({ stacked: false, scale: WALL_SCALE })
  })

  it('the scale never drops below 1× (the console\'s own size)', () => {
    expect(wallLayout(390, 844, 'both')).toEqual({ stacked: true, scale: 1 })
    expect(wallLayout(320, 600, 'both').scale).toBe(1)
    expect(wallLayout(200, 200, 'vi2ja').scale).toBe(1)
    expect(wallLayout(1, 1, 'both').scale).toBe(1)
  })
})
