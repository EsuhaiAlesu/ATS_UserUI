// src/lib/lanes/online/audienceWindows.ts — place the audience-wall windows on the hall's monitors.
// One detachable /wall popup per enabled output (giữa / trái / phải), positioned through the Window
// Management API when the browser grants it and evenly split across the current screen when it does not:
// there is ALWAYS a manual fallback (drag across + press F), because Firefox/Safari have no such API and
// Chrome may deny the permission. Popup handles are remembered so a reused window is re-navigated ONLY
// when its URL actually changed (no flicker mid-ceremony) and the live open-count can be read back from
// the windows themselves — a browser never tells the parent that a child window was closed. TASK 7.3.

// The physical model (mét → cm chữ → px) is lane-neutral: /wall and /wall-mockup are not lane pages and
// cannot import from this directory, so the maths lives in src/lib/hallScreens.ts and BOTH sides use it.
import { DEFAULT_HALL_WALLS, HALL_CHAR_CM, WALL_M, clampCharCm, fitToAspect, hasPhysicalSize } from '../../hallScreens'

export type WallView = 'vi2ja' | 'ja2vi' | 'both'
// `dock` (M10) — a narrow PORTRAIT strip pinned to one edge of the current screen, for the operator who
// keeps the two-way window beside their other apps instead of on a hall monitor. It is a placement, not a
// view: the /wall page itself reflows to one column when the window is this shape.
export type WallDock = 'full' | 'right' | 'left'
// `widthM`/`heightM` — the LIT AREA of the real screen, in metres. Optional, and everything degrades to the
// old pixel behaviour without them; present, they are what makes the letters a fixed physical size and the
// window a fixed shape, whatever resolution the video processor happens to take (hallScreens.ts).
export interface WallOutput { id: string; label: string; enabled: boolean; view: WallView; showSource: boolean; screenIdx?: number; dock?: WallDock; widthM?: number; heightM?: number }
export type ScreenSupport = 'idle' | 'unsupported' | 'single' | 'multi' | 'denied'
export interface WallScreen { left: number; top: number; width: number; height: number; label: string }

// Window Management API (Chrome/Edge 100+) — declared locally so we do NOT depend on a particular TS lib
// version; mirrors the shape used in src/pages/AudioRouting.tsx. There is always a manual fallback.
interface WmScreen { availLeft: number; availTop: number; availWidth: number; availHeight: number; isPrimary: boolean; label: string }
interface WmScreenDetails { screens: WmScreen[]; addEventListener?: (t: string, cb: () => void) => void }

const STORAGE_KEY = 'proyaku_online_wall_outputs'

// Gala default: Màn giữa = cả hai chiều · Màn trái = VI→JA · Màn phải = JA→VI. Nguồn ẩn mặc định.
// Kích thước mặc định = hội trường 20 năm (08/08/2026): màn chính 6 × 3 m, hai màn hông 3,5 × 2,5 m. Đọc
// theo RỘNG × CAO — sửa được ngay trong bảng "Xuất màn khán giả" nếu hội trường khác.
export const DEFAULT_WALL_OUTPUTS: WallOutput[] = DEFAULT_HALL_WALLS.map((w) => ({
  id: w.id, label: w.label, enabled: true, view: w.view, showSource: w.showSource,
  dock: 'full' as WallDock, widthM: w.widthM, heightM: w.heightM,
}))

// A docked strip is sized like a phone held beside the operator's other windows: about a quarter of the
// screen, never so thin that a Japanese line cannot hold a few characters (min 320) and never so wide that
// it stops being a strip (max 520).
export const DOCK_MIN_W = 320
export const DOCK_MAX_W = 520
export const DOCK_FRACTION = 0.26

// localStorage is absent in SSR/tests and can throw in locked-down browsers — reach it defensively.
function safeStorage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null } catch { return null }
}

const isView = (v: unknown): v is WallView => v === 'vi2ja' || v === 'ja2vi' || v === 'both'
const isDock = (v: unknown): v is WallDock => v === 'full' || v === 'right' || v === 'left'
// A stored metre value is taken only when it is a real number inside the physical bounds; anything else
// (a string, a NaN, 600 typed for 6,00) falls back to the default rather than sizing the wall from junk.
const storedM = (v: unknown, fallback: number | undefined): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= WALL_M.min && v <= WALL_M.max ? v : fallback

// Merge one stored entry (which may be partial or corrupt) over its default, field by field, so a stale
// value can never break the console: any field that is missing or the wrong type falls back to the default.
function mergeStored(def: WallOutput, stored: Record<string, unknown> | undefined): WallOutput {
  if (!stored) return { ...def }
  const idx = stored.screenIdx
  return {
    id: def.id,
    label: typeof stored.label === 'string' ? stored.label : def.label,
    enabled: typeof stored.enabled === 'boolean' ? stored.enabled : def.enabled,
    view: isView(stored.view) ? stored.view : def.view,
    showSource: typeof stored.showSource === 'boolean' ? stored.showSource : def.showSource,
    screenIdx: typeof idx === 'number' && Number.isInteger(idx) && idx >= 0 ? idx : undefined,
    dock: isDock(stored.dock) ? stored.dock : (def.dock ?? 'full'),
    widthM: storedM(stored.widthM, def.widthM),
    heightM: storedM(stored.heightM, def.heightM),
  }
}

// Always returns the 3 defaults, each merged over its stored counterpart (matched by id). Unknown stored
// ids are ignored, so a corrupt array can never add, drop or reorder an output.
export function loadWallOutputs(): WallOutput[] {
  let raw: unknown = null
  const store = safeStorage()
  if (store) {
    try { raw = JSON.parse(store.getItem(STORAGE_KEY) || 'null') } catch { raw = null }
  }
  const byId = new Map<string, Record<string, unknown>>()
  if (Array.isArray(raw)) {
    for (const o of raw) {
      if (o && typeof o === 'object' && typeof (o as { id?: unknown }).id === 'string') {
        byId.set((o as { id: string }).id, o as Record<string, unknown>)
      }
    }
  }
  return DEFAULT_WALL_OUTPUTS.map((def) => mergeStored(def, byId.get(def.id)))
}

// Best-effort persist; a full or blocked quota must never crash the console mid-event.
export function saveWallOutputs(outputs: WallOutput[]): void {
  const store = safeStorage()
  if (!store) return
  try { store.setItem(STORAGE_KEY, JSON.stringify(outputs)) } catch { /* best-effort */ }
}

// Learn how many monitors exist and where they are. Never throws: no API → 'unsupported'; permission
// denied / any failure → 'denied'; otherwise 'multi'/'single'. Every branch keeps a manual fallback.
export async function detectWallScreens(): Promise<{ support: ScreenSupport; screens: WallScreen[] }> {
  const getScreenDetails = (window as unknown as { getScreenDetails?: () => Promise<WmScreenDetails> }).getScreenDetails
  if (typeof getScreenDetails !== 'function') return { support: 'unsupported', screens: [] }
  // A non-extended desktop is unambiguously one screen — answer 'single' WITHOUT prompting for the
  // window-management permission (the operator may not have plugged the wall in yet). Fallback covers it.
  const isExtended = (window.screen as unknown as { isExtended?: boolean }).isExtended
  if (isExtended === false) return { support: 'single', screens: [] }
  try {
    const details = await getScreenDetails()
    const list = Array.isArray(details.screens) ? details.screens : []
    const screens: WallScreen[] = list.map((s, i) => ({
      left: s.availLeft, top: s.availTop, width: s.availWidth, height: s.availHeight, label: s.label || `Màn ${i + 1}`,
    }))
    return { support: screens.length > 1 ? 'multi' : 'single', screens }
  } catch {
    return { support: 'denied', screens: [] }
  }
}

// A monitor was unplugged: drop any screenIdx that now points past the detected count, so the next Xuất
// never opens a window on a screen that no longer exists. Returns the same array when nothing changed.
export function scanWallScreens(outputs: WallOutput[], screenCount: number): WallOutput[] {
  let changed = false
  const next = outputs.map((o) => {
    if (o.screenIdx != null && o.screenIdx >= screenCount) { changed = true; return { ...o, screenIdx: undefined } }
    return o
  })
  return changed ? next : outputs
}

// window.open reuses a window with the same name and IGNORES the position string on reuse — so we remember
// the live handles here (the Map<id, Window> the count is read back from) plus the URL each was last sent
// to, to decide whether a reused window actually needs re-navigating.
const wallWindows = new Map<string, Window>()
const wallUrls = new Map<string, string>()
// …and the rectangle each was last actually moved to, so pressing the button again with nothing changed
// does not count as a move. See the two guards in `openWallWindows`.
const wallGeom = new Map<string, string>()

// Reading `.closed` on a lost or cross-origin handle can throw — a handle we cannot inspect counts as closed.
function isClosed(win: Window): boolean {
  try { return win.closed } catch { return true }
}

// A wall window showing fullscreen is where somebody deliberately put it — on ceremony night that is a
// technician who dragged it onto the LED and pressed F. Same-origin, so `document` is readable; a browser
// that refuses to answer says "not fullscreen" and the old behaviour stands.
function isFullscreen(win: Window): boolean {
  try { return win.document.fullscreenElement != null } catch { return false }
}

export interface WallGeometry { left: number; top: number; width: number; height: number }

/**
 * Where ONE window goes. Three placements, in priority order:
 *  1. `dock` right/left — a narrow portrait strip on the CURRENT screen's edge, so the operator can keep
 *     working next to it. Deliberately outranks `screenIdx`: docking is a choice about this desk, and a
 *     stale monitor assignment must not drag the strip onto a projector.
 *  2. an assigned monitor (`screenIdx` resolving to a detected screen) — the hall wall.
 *  3. the fallback slice — the current screen divided evenly between the enabled windows.
 * Pure: takes the available area instead of reading `window`, so the geometry is testable.
 */
export function wallWindowGeometry(
  output: WallOutput,
  screens: WallScreen[],
  index: number,
  total: number,
  avail: { width: number; height: number },
): WallGeometry {
  const availW = Math.max(1, avail.width)
  const availH = Math.max(1, avail.height)
  const dock = output.dock ?? 'full'
  if (dock === 'right' || dock === 'left') {
    // Clamp to the screen too: on a small laptop DOCK_MIN_W could otherwise exceed the whole width.
    const width = Math.min(availW, Math.max(DOCK_MIN_W, Math.min(DOCK_MAX_W, Math.round(availW * DOCK_FRACTION))))
    return { left: dock === 'right' ? availW - width : 0, top: 0, width, height: availH }
  }
  const scr = (output.screenIdx != null && screens[output.screenIdx]) ? screens[output.screenIdx] : null
  // An assigned monitor IS the wall — take it whole, at whatever resolution the processor is feeding it.
  if (scr) return { left: scr.left, top: scr.top, width: scr.width, height: scr.height }
  const colW = total > 0 ? Math.max(320, Math.round(availW / total)) : availW
  // No monitor assigned yet: the even slice, but shaped like the real screen when its metres are known. A
  // 6 × 3 m wall handed a 640 × 1080 slice opens 640 × 320 — otherwise the operator rehearses on a
  // portrait window, decides the text fits, and the landscape wall in the hall says otherwise.
  if (hasPhysicalSize(output.widthM, output.heightM)) {
    const fit = fitToAspect({ width: colW, height: availH }, output.widthM!, output.heightM!)
    return { left: index * colW, top: 0, width: fit.width, height: fit.height }
  }
  return { left: index * colW, top: 0, width: colW, height: availH }
}

// Open (or re-place) one popup per ENABLED output. An already-open window is re-navigated ONLY when its URL
// changed, then always steered back onto its assigned screen. Returns { opened, total, blocked } so the UI
// can say something true — `blocked` is the popups the blocker ate (window.open returned null).
export function openWallWindows(outputs: WallOutput[], screens: WallScreen[], fontSize: number, charCm: number = HALL_CHAR_CM.default): { opened: number; total: number; blocked: number } {
  const enabled = outputs.filter((o) => o.enabled)
  const total = enabled.length
  let opened = 0
  let blocked = 0

  // Manual fallback geometry: with no assigned monitor, divide the CURRENT screen evenly across the windows
  // (Bước 1) — the operator drags each onto its hall monitor and presses F.
  const availW = window.screen.availWidth || window.innerWidth || 1280
  const availH = window.screen.availHeight || window.innerHeight || 720

  enabled.forEach((o, i) => {
    const src = o.showSource ? '&src=1' : ''
    // With metres known the wall sizes its text physically and `font` becomes a dead fallback; it is still
    // sent so an operator who clears the metres mid-event gets the old behaviour back without a reload.
    const hall = hasPhysicalSize(o.widthM, o.heightM) ? `&wm=${o.widthM}&hm=${o.heightM}&cm=${clampCharCm(charCm)}` : ''
    const url = `/wall?dir=${o.view}&font=${fontSize}${src}${hall}`
    const { left, top, width, height } = wallWindowGeometry(o, screens, i, total, { width: availW, height: availH })

    const geomKey = `${left},${top},${width},${height}`
    const existing = wallWindows.get(o.id)
    if (existing && !isClosed(existing)) {
      // Already open: re-navigate ONLY when the content changed (avoid flicker / a dropped BroadcastChannel
      // mid-ceremony), then move it back onto its assigned screen — but only when there is a move to make.
      if (wallUrls.get(o.id) !== url) {
        try { existing.location.replace(url); wallUrls.set(o.id, url) } catch { /* navigation blocked — leave as-is */ }
      }
      // Pressing "Mở màn" again is the operator's reflex after every small change — one more window, a font
      // step, a second look. It used to yank EVERY open window back to the computed rectangle, so the wall
      // a technician had already dragged onto the hall LED and put into fullscreen jumped out of fullscreen
      // and back onto the laptop, in front of the room. Two narrow guards: a fullscreen window is never
      // touched, and a rectangle identical to the one last applied is not a move at all.
      if (!isFullscreen(existing) && wallGeom.get(o.id) !== geomKey) {
        try { existing.moveTo(left, top); existing.resizeTo(width, height); wallGeom.set(o.id, geomKey) } catch { /* browsers restrict move/resize */ }
      }
      try { existing.focus() } catch { /* ignore */ }
      opened++
      return
    }

    // Not open (or the handle went dead): open a fresh popup with the position hint window.open honours only
    // on first creation.
    let win: Window | null = null
    try { win = window.open(url, `proyaku-wall-${o.id}`, `popup=yes,left=${left},top=${top},width=${width},height=${height}`) } catch { win = null }
    if (!win) {
      wallWindows.delete(o.id); wallUrls.delete(o.id); wallGeom.delete(o.id)
      blocked++
      return
    }
    wallWindows.set(o.id, win); wallUrls.set(o.id, url); wallGeom.set(o.id, geomKey)
    try { win.moveTo(left, top); win.resizeTo(width, height) } catch { /* browsers restrict move/resize */ }
    try { win.focus() } catch { /* ignore */ }
    opened++
  })

  return { opened, total, blocked }
}

// The only honest source of the open count: ask each remembered window whether it is still open, drop the
// dead ones from the Map, and return the live ids. A browser fires no event when a child window closes.
export function getOpenWallIds(): string[] {
  const live: string[] = []
  for (const [id, win] of wallWindows) {
    if (isClosed(win)) { wallWindows.delete(id); wallUrls.delete(id); wallGeom.delete(id) }
    else live.push(id)
  }
  return live
}

// Close every remembered audience window at once (end of the event) and forget the handles.
export function closeWallWindows(): void {
  for (const win of wallWindows.values()) {
    try { win.close() } catch { /* already gone */ }
  }
  wallWindows.clear()
  wallUrls.clear()
  wallGeom.clear()
}
