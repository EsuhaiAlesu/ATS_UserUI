// src/lib/hallScreens.ts — the hall's screens described in MÉT, not in browser pixels.
//
// Why this file exists: until now the wall text was sized in CSS pixels (`wallLayout` → 2.6× of an 18px
// base ≈ 47px). A pixel is not a size. On a 6 m wall fed at 1920 px, 47px letters are ~15 cm tall and the
// back row can read them; the SAME code on the SAME wall fed at 3840 px draws them 7 cm tall and the back
// row cannot. The only figure that survives a change of processor, of scaler, of browser zoom is the
// PHYSICAL height of a letter — so that is what the operator sets, and the pixels are derived from it at
// render time out of the window's real width and the wall's real width in metres.
//
// Lane-neutral on purpose (same reason as audienceSubtitles.ts / audienceChannel.ts): `/wall` and
// `/wall-mockup` are not lane pages and may not import anything under src/lib/lanes/online/. The view union
// is re-declared here rather than imported for the same reason — it is structurally identical to
// `WallView`, so the two assign to each other freely with no dependency in either direction.

export type HallView = 'vi2ja' | 'ja2vi' | 'both'

/** One physical screen in the hall. `widthM`/`heightM` are the LIT AREA, not the frame. */
export interface HallWall {
  id: string
  label: string
  view: HallView
  showSource: boolean
  widthM: number
  heightM: number
}

/**
 * Hội trường 20 năm (08/08/2026): màn chính 6 × 3 m ở giữa sân khấu, hai màn hông 3,5 × 2,5 m.
 * RỘNG × CAO. The one place the hall is written down: `DEFAULT_WALL_OUTPUTS` builds the console's outputs
 * from this list, and `/wall-mockup` opened with no query falls back to it, so the preview and the real
 * windows can never describe two different halls. Editable per-output in the console for another venue.
 */
export const DEFAULT_HALL_WALLS: HallWall[] = [
  { id: 'center', label: 'Màn giữa', view: 'both', showSource: false, widthM: 6, heightM: 3 },
  { id: 'left', label: 'Màn trái', view: 'vi2ja', showSource: false, widthM: 3.5, heightM: 2.5 },
  { id: 'right', label: 'Màn phải', view: 'ja2vi', showSource: false, widthM: 3.5, heightM: 2.5 },
]

// ── Physical bounds ──────────────────────────────────────────────────────────
// A hall screen below half a metre is a monitor, above 40 m is not a screen. Both ends only exist to keep
// a typo (60 instead of 6) from producing a wall of 2 mm letters that nobody notices until the ceremony.
export const WALL_M = { min: 0.5, max: 40 } as const
export const clampWallM = (n: number): number =>
  Math.min(WALL_M.max, Math.max(WALL_M.min, Number.isFinite(n) ? n : 1))

/** A physical size is only usable if BOTH sides are real numbers inside the bounds. */
export const hasPhysicalSize = (w?: number, h?: number): boolean =>
  typeof w === 'number' && typeof h === 'number' &&
  Number.isFinite(w) && Number.isFinite(h) &&
  w >= WALL_M.min && w <= WALL_M.max && h >= WALL_M.min && h <= WALL_M.max

// ── Letter height ────────────────────────────────────────────────────────────
// `charCm` = how tall ONE character stands on the wall, in centimetres: a capital 'A' (without its
// accent) for Vietnamese, the body of a kanji for Japanese. That is what a person at the back actually
// resolves, and it is the number a stage crew can check with a tape measure.
//
// A CSS font-size is the em box, which is TALLER than the letter inside it. Latin cap height is ~0.70 em
// in most UI faces, a kanji fills ~0.88 em. We size against the SMALLER (Latin, 0.72) so a wall set to
// 12 cm gives Vietnamese capitals of 12 cm and Japanese slightly more — erring towards bigger, never
// towards a wall that measures short.
export const WALL_GLYPH_RATIO = 0.72
export const HALL_CHAR_CM = { min: 4, max: 40, default: 12, step: 1 } as const
export const clampCharCm = (n: number): number =>
  Math.max(HALL_CHAR_CM.min, Math.min(HALL_CHAR_CM.max, Math.round(Number.isFinite(n) ? n : HALL_CHAR_CM.default)))

/**
 * The CSS font-size that makes a character stand `charCm` centimetres tall on a wall `widthM` metres wide
 * being drawn into a viewport `viewportPx` pixels wide.
 *
 * Deliberately takes the viewport instead of a stored resolution: the window may end up at 1920, at 3840,
 * or at 2/3 of either because the operator left browser zoom at 150 %. Whatever it ends up at, THAT is the
 * number of pixels covering those metres, so the letters come out the right size without anyone knowing
 * what the video processor is doing. The same call, given a 480 px miniature of the same wall, returns a
 * proportionally smaller font — which is what makes the màn tượng trưng a true scale model.
 */
export function hallFontPx(viewportPx: number, widthM: number, charCm: number): number {
  if (!(viewportPx > 0) || !(widthM > 0)) return 0
  const pxPerM = viewportPx / widthM
  return Math.max(1, Math.round((clampCharCm(charCm) / 100) * pxPerM / WALL_GLYPH_RATIO))
}

/**
 * How far back that letter height still reads, in metres. The stage rule of thumb for projected text is
 * 1 cm of letter per 2 m of distance (the 1:200 ratio used for subtitles; signage uses a slacker 1:250).
 * Reported so the operator sets the size against the hall, not against how it looks on their laptop.
 */
export const readingDistanceM = (charCm: number): number => Math.round(clampCharCm(charCm) * 2)

// ── Fitting a physical shape into an available box ───────────────────────────

export interface Box { width: number; height: number }

/**
 * The biggest box with the wall's own proportions that fits inside `avail`. Used to shape the fallback
 * popup: a 6 × 3 m wall handed a 640 × 1080 slice must open 640 × 320, not 640 × 1080 — otherwise the
 * operator rehearses on a portrait window and the hall shows a landscape one, and every judgement they
 * made about how much text fits was made on the wrong shape.
 */
export function fitToAspect(avail: Box, widthM: number, heightM: number): Box {
  if (!(avail.width > 0) || !(avail.height > 0) || !(widthM > 0) || !(heightM > 0)) return avail
  const scale = Math.min(avail.width / widthM, avail.height / heightM)
  return {
    width: Math.max(1, Math.round(widthM * scale)),
    height: Math.max(1, Math.round(heightM * scale)),
  }
}

// ── Màn tượng trưng: the whole hall on one monitor ───────────────────────────

export interface MockupBox extends Box { id: string; left: number; top: number }
export interface MockupLayout { pxPerM: number; boxes: MockupBox[]; spanM: number }

// Gap between two screens in the mockup, in metres of hall. Not a real measurement of this hall — just
// enough air that three screens read as three objects and not as one long strip.
export const HALL_GAP_M = 1.5

// Left flank · main · right flank, the way somebody facing the stage sees them. Ids outside this list keep
// their given order behind the known ones, so a fourth screen added later still appears.
const RANK: Record<string, number> = { left: 0, center: 1, right: 2 }
export const hallOrder = (walls: HallWall[]): HallWall[] =>
  walls.map((w, i) => ({ w, k: RANK[w.id] ?? 10 + i })).sort((a, b) => a.k - b.k).map((x) => x.w)

/**
 * Lay the enabled walls out side by side at ONE scale, so their relative sizes on the monitor are their
 * relative sizes in the hall — a 6 m main screen really is 1.7× the width of a 3.5 m flank. Vertically the
 * screens are centred on a common line (hall screens are hung to a shared centre, not to a shared floor).
 */
export function mockupLayout(walls: HallWall[], avail: Box, gapM: number = HALL_GAP_M): MockupLayout {
  const list = hallOrder(walls)
  if (list.length === 0 || !(avail.width > 0) || !(avail.height > 0)) return { pxPerM: 0, boxes: [], spanM: 0 }
  const spanM = list.reduce((n, w) => n + w.widthM, 0) + gapM * (list.length - 1)
  const tallestM = list.reduce((n, w) => Math.max(n, w.heightM), 0)
  const pxPerM = Math.min(avail.width / spanM, avail.height / tallestM)
  const originX = (avail.width - spanM * pxPerM) / 2
  const midY = avail.height / 2
  let cursorM = 0
  const boxes = list.map((w) => {
    const width = w.widthM * pxPerM
    const height = w.heightM * pxPerM
    const box: MockupBox = {
      id: w.id,
      left: Math.round(originX + cursorM * pxPerM),
      top: Math.round(midY - height / 2),
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    }
    cursorM += w.widthM + gapM
    return box
  })
  return { pxPerM, boxes, spanM }
}

// ── URL codec ────────────────────────────────────────────────────────────────
// /wall-mockup is not a lane page, so it cannot read the console's stored outputs (CLAUDE.md rule 2: only
// two sanctioned files may import the lane facade). It is handed the hall on its query string instead —
// the same way /wall is already handed its direction and font.

const SEP_WALL = ','
const SEP_FIELD = '|'
// A label carrying a separator would silently eat the fields after it; strip both rather than escape, the
// labels are three short Vietnamese words we control.
const safeLabel = (s: string): string => s.replace(/[|,]/g, ' ').trim().slice(0, 40)
const isView = (v: string): v is HallView => v === 'vi2ja' || v === 'ja2vi' || v === 'both'

export function encodeHallWalls(walls: HallWall[]): string {
  return walls
    .map((w) => [w.id, safeLabel(w.label), w.view, w.showSource ? '1' : '0', w.widthM, w.heightM].join(SEP_FIELD))
    .join(SEP_WALL)
}

/** Never throws and never returns a half-built wall: a field that does not parse drops the whole entry. */
export function decodeHallWalls(raw: string | null): HallWall[] {
  if (!raw) return []
  const out: HallWall[] = []
  for (const chunk of raw.split(SEP_WALL)) {
    const f = chunk.split(SEP_FIELD)
    if (f.length < 6) continue
    const [id, label, view, src, w, h] = f
    const widthM = Number(w)
    const heightM = Number(h)
    if (!id.trim() || !isView(view) || !hasPhysicalSize(widthM, heightM)) continue
    out.push({ id: id.trim(), label: safeLabel(label) || id.trim(), view, showSource: src === '1', widthM, heightM })
  }
  return out
}

/** The whole `/wall-mockup` query string, console side. */
export function hallMockupUrl(walls: HallWall[], charCm: number): string {
  const q = new URLSearchParams({ walls: encodeHallWalls(walls), cm: String(clampCharCm(charCm)) })
  return `/wall-mockup?${q.toString()}`
}
