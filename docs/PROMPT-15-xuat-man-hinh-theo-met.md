# PROMPT-15 — Màn khán giả đo bằng MÉT, và "màn tượng trưng"

**Nền để áp: `dbbf8d6` trên nhánh `develop`** (PROMPT-13 phần 2 — commit cuối đang có trên GitHub).
Mọi đoạn "TÌM" dưới đây đã được máy dò lại trên đúng commit đó và **mỗi đoạn chỉ xuất hiện một lần**.

> **Chạy trước hay sau PROMPT-14 (`6d9a8e2`) đều được.** Đã dò: PROMPT-14 không đụng tới bất kỳ dòng
> nào mà PROMPT-15 tìm. Hai việc rời nhau hoàn toàn.

---

## Vì sao phải làm việc này

Hội trường 20 năm có **ba tấm màn**: màn chính giữa sân khấu **6 m ngang × 3 m cao**, hai màn hai bên hông
**3,5 m ngang × 2,5 m cao**.

Cỡ chữ phụ đề hiện nay đang đặt bằng **điểm ảnh** — và điểm ảnh thì không nói lên kích thước thật:

| Vẫn tấm màn 6 m đó | Chữ 47 điểm ảnh hiện ra là… |
| --- | --- |
| máy chiếu nhận 1920 điểm ảnh | chữ cao **khoảng 15 cm** → hàng ghế cuối đọc được |
| máy chiếu nhận 3840 điểm ảnh | chữ cao **khoảng 7 cm** → hàng ghế cuối chịu thua |

Cùng một dòng lệnh, cùng một tấm màn, hai kết quả ngược nhau — và không ai biết trước, vì máy chiếu của
hội trường mới là thứ quyết định con số đó, thường chỉ biết vào hôm dựng sân khấu.

Nên PROMPT-15 lật ngược lại: người điều khiển chỉnh **centimet** (chữ trên tường cao mấy phân), máy tự
quy ra điểm ảnh **ngay lúc vẽ**, dựa trên bề ngang thật của cửa sổ tại thời điểm đó. Đổi máy chiếu, phóng
to trình duyệt, kéo cửa sổ sang màn khác — chữ vẫn cao đúng từng ấy phân.

Kèm theo là một trang xem thử: **màn tượng trưng** — cả hội trường thu nhỏ đúng tỉ lệ trên một màn hình,
để canh cỡ chữ trước buổi lễ thay vì canh lúc đang diễn.

### Ba điều dễ hiểu nhầm, xin đọc kỹ

1. **Một cỡ centimet chung cho ba màn KHÔNG ra một cỡ điểm ảnh chung.** Cùng 1920 điểm ảnh, tấm màn
   3,5 m có nhiều điểm ảnh trên mỗi mét hơn tấm 6 m, nên 12 cm ăn **91 điểm ảnh ở màn hông** và **53 ở
   màn giữa**. Đặt một cỡ điểm ảnh chung cho cả ba màn — đúng như hiện nay — chính là cách làm cho chữ
   trên ba tấm màn cao thấp khác nhau.
2. **Màn tượng trưng là để CANH CỠ CHỮ, không phải tín hiệu đưa vào máy chiếu.** Ba khung nhỏ đẩy qua một
   đường HDMI sẽ ra ba khung nhỏ trên mọi tấm màn. Đầu ra thật vẫn là một cửa sổ `/wall` cho mỗi màn,
   đúng như cũ.
3. **Chưa điền mét thì mọi thứ chạy y như trước.** Cỡ mét là tuỳ chọn; thiếu một cạnh cũng coi như chưa
   điền (nửa cỡ màn không suy ra được hình dạng, đoán bừa tệ hơn giữ nguyên).

### Con số mặc định đã nạp sẵn

Ba tấm màn của hội trường 20 năm đã được ghi sẵn ở **đúng một chỗ** (`DEFAULT_HALL_WALLS`): 6 × 3 m và
hai màn 3,5 × 2,5 m. Nếu hội trường đo ra khác, sửa thẳng hai ô mét trong bảng "Xuất màn khán giả",
không cần đụng mã.

Cỡ chữ mặc định **12 cm**, tức đọc tốt tới khoảng **24 m** (quy tắc sân khấu: 1 cm chữ cho 2 m khoảng cách).

---

## TASK 80 — `src/lib/hallScreens.ts` (TỆP MỚI)

Tạo tệp mới, dán nguyên văn:

```ts
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
```

## TASK 81 — `src/components/WallPane.tsx` (TỆP MỚI)

Tạo tệp mới, dán nguyên văn:

```tsx
// src/components/WallPane.tsx — ONE audience wall, rendered. Split out of AudienceWall.tsx so the hall
// preview (/wall-mockup) draws each screen through exactly the same code the projector window runs: a
// preview that is a re-implementation is a preview that lies. Lane-neutral, like SubtitleParagraphs.
//
// Everything about SIZE arrives as `fontPx` (absolute CSS px) — the caller decides whether that came from
// physical centimetres (hallScreens.hallFontPx) or from the legacy pixel scale (audienceSubtitles.wallLayout),
// and the miniature simply passes a smaller box in and gets a proportionally smaller wall out.

import React, { useMemo } from 'react'
import type { AudienceLine } from '../lib/audienceChannel'
import { languageThread } from '../lib/audienceSubtitles'
import SubtitleParagraphs from './SubtitleParagraphs'

export type WallPaneView = 'vi2ja' | 'ja2vi' | 'both'

interface Props {
  lines: AudienceLine[]
  view: WallPaneView
  showSource: boolean
  /** Absolute font size for this wall, already in this pane's own pixel space. */
  fontPx: number
  /** Two columns become two rows — a portrait window, or a miniature too narrow for side-by-side. */
  stacked: boolean
  /** The 日本語 / Tiếng Việt corner captions; off in the smallest miniatures where they only add noise. */
  showLabels?: boolean
}

// Optional source view: the same lines with the source text where the renderer reads the translation, and
// the direction flipped so the language label is the SOURCE language.
const asSourceLines = (lines: AudienceLine[]): AudienceLine[] =>
  lines.map((l) => ({ ...l, targetText: l.sourceText, dir: l.dir === 'vi2ja' ? 'ja2vi' : 'vi2ja' }))

const WallPane: React.FC<Props> = ({ lines, view, showSource, fontPx, stacked, showLabels = true }) => {
  const jaLines = useMemo(() => lines.filter((l) => l.dir === 'vi2ja'), [lines]) // translations INTO Japanese
  const viLines = useMemo(() => lines.filter((l) => l.dir === 'ja2vi'), [lines]) // translations INTO Vietnamese
  // With "Gốc" on, each half of the two-way window becomes one LANGUAGE rather than one direction, so a
  // Vietnamese reader sees Vietnamese speech in the Vietnamese half instead of only as small source text
  // over somebody else's translation. Two panels either way — nothing new has to fit on a narrow strip.
  const jaThread = useMemo(() => languageThread(lines, 'ja'), [lines])
  const viThread = useMemo(() => languageThread(lines, 'vi'), [lines])
  const single = view === 'vi2ja' ? jaLines : viLines

  const columnLabel = (text: string, jp: boolean) => (
    showLabels ? (
      <span
        className={`absolute top-2 right-3 z-10 font-label-caps tracking-widest text-secondary/70 ${jp ? 'jp-text' : ''}`}
        style={{ fontSize: `${Math.max(9, Math.round(fontPx * 0.34))}px` }}
      >{text}</span>
    ) : null
  )

  if (view === 'both') {
    // Stacked: 日本語 on top, Tiếng Việt below — the reading order the hall screens already use
    // left-to-right, so an operator who learned one layout has not learned a second one.
    return (
      <div className={`h-full flex ${stacked ? 'flex-col' : ''}`}>
        <div className={`relative flex-1 min-h-0 min-w-0 ${stacked ? 'border-b' : 'border-r'} border-outline-variant`}>
          {columnLabel(showSource ? '日本語 ＋ 原文' : '日本語', true)}
          <SubtitleParagraphs lines={showSource ? jaThread : jaLines} direction="vi2ja" fontSize={18} fontPx={fontPx} />
        </div>
        <div className="relative flex-1 min-h-0 min-w-0">
          {columnLabel(showSource ? 'Tiếng Việt + lời gốc' : 'Tiếng Việt', false)}
          <SubtitleParagraphs lines={showSource ? viThread : viLines} direction="ja2vi" fontSize={18} fontPx={fontPx} />
        </div>
      </div>
    )
  }

  if (showSource) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-[32%] min-h-0 border-b border-outline-variant opacity-60">
          <SubtitleParagraphs lines={asSourceLines(single)} fontSize={18} fontPx={fontPx * 0.7} />
        </div>
        <div className="flex-1 min-h-0">
          <SubtitleParagraphs lines={single} direction={view} fontSize={18} fontPx={fontPx} />
        </div>
      </div>
    )
  }

  return <SubtitleParagraphs lines={single} direction={view} fontSize={18} fontPx={fontPx} />
}

export default WallPane
```

## TASK 82 — `src/pages/WallMockup.tsx` (TỆP MỚI)

Tạo tệp mới, dán nguyên văn:

```tsx
// src/pages/WallMockup.tsx — /wall-mockup : MÀN TƯỢNG TRƯNG. The whole hall drawn on the operator's one
// monitor, at true relative scale: a 6 m main screen really is 1.7× the width of a 3.5 m flank, and the
// subtitles inside each miniature are drawn at the same fraction of their screen as they will be on the
// wall. So if a line is unreadably small here relative to its little box, it will be unreadably small in
// the hall — and that can be found out three days early instead of during the opening speech.
//
// It is a CHECKING screen, not a feed for the video processor: three miniatures sent down one HDMI would
// put three miniatures on every wall. The real output is still one /wall window per screen.
//
// Not a lane page (CLAUDE.md rule 2), so it cannot read the console's stored outputs — the hall arrives on
// the query string, exactly the way /wall already receives its direction and font:
//   /wall-mockup?walls=center|Màn giữa|both|0|6|3,left|…&cm=12       (built by hallMockupUrl())
// Opened bare, it falls back to DEFAULT_HALL_WALLS so the link is still useful typed by hand.

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { subscribeAudience, type AudienceLine } from '../lib/audienceChannel'
import {
  DEFAULT_HALL_WALLS, HALL_CHAR_CM, clampCharCm, decodeHallWalls, hallFontPx, hallOrder,
  mockupLayout, readingDistanceM, type HallWall,
} from '../lib/hallScreens'
import WallPane from '../components/WallPane'

// A person, to scale, standing next to the screens. Nothing explains "3 m tall" faster than a 1,7 m figure
// beside it, and the operator judging letter height is really judging it against people in a room.
const PERSON_M = 1.7

// Enough sample text to fill both columns, so the size can be judged before anybody has spoken. Deliberately
// the kind of sentence the gala actually opens with, not lorem ipsum: real punctuation, real line lengths.
const SAMPLE: AudienceLine[] = [
  { lid: 's1', dir: 'vi2ja', sourceText: 'Kính thưa quý vị đại biểu, quý vị khách quý cùng toàn thể anh chị em Esuhai.', targetText: 'ご来賓の皆様、ご列席の皆様、そしてエスハイの仲間の皆様、本日はお越しいただき誠にありがとうございます。', interim: false, corrected: false, at: 1 },
  { lid: 's2', dir: 'ja2vi', sourceText: '二十年間、変わらぬご支援をいただき、心より御礼申し上げます。', targetText: 'Suốt hai mươi năm qua, chúng tôi xin chân thành cảm ơn sự đồng hành không đổi thay của quý vị.', interim: false, corrected: false, at: 2 },
  { lid: 's3', dir: 'vi2ja', sourceText: 'Xin trân trọng kính mời quý vị hướng lên sân khấu.', targetText: 'それでは、どうぞステージにご注目ください。', interim: true, corrected: false, at: 3 },
]

const WallMockup: React.FC = () => {
  const params = new URLSearchParams(window.location.search)
  const walls: HallWall[] = useMemo(() => {
    const parsed = decodeHallWalls(params.get('walls'))
    return hallOrder(parsed.length > 0 ? parsed : DEFAULT_HALL_WALLS)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the query string cannot change without a reload
  }, [])

  const [charCm, setCharCm] = useState(() => clampCharCm(Number(params.get('cm')) || HALL_CHAR_CM.default))
  const [live, setLines] = useState<AudienceLine[]>([])
  const [sample, setSample] = useState(true)
  const stageRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState({ width: 0, height: 0 })

  useEffect(() => subscribeAudience(setLines), [])

  // Measure the area the hall is drawn into, not the window: the header above it is a real height and
  // laying the screens out against the full window would push the bottom row off the bottom.
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setStage({ width: r.width, height: r.height })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const lines = sample && live.length === 0 ? SAMPLE : live
  // Leave room under the screens for the caption strip and the human figure.
  const layout = useMemo(
    () => mockupLayout(walls, { width: Math.max(0, stage.width - 24), height: Math.max(0, stage.height - 88) }),
    [walls, stage.width, stage.height],
  )
  const personH = Math.round(PERSON_M * layout.pxPerM)

  return (
    <div className="fixed inset-0 bg-background text-on-background flex flex-col overflow-hidden">
      <header className="shrink-0 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 border-b border-outline-variant">
        <div className="flex items-baseline gap-2">
          <span className="material-symbols-outlined text-secondary text-[18px]" aria-hidden="true">aspect_ratio</span>
          <h1 className="font-label-caps text-label-caps text-on-surface">Màn tượng trưng — hội trường</h1>
        </div>
        <label className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="font-label-caps">CHIỀU CAO CHỮ TRÊN TƯỜNG</span>
          <input
            type="range" min={HALL_CHAR_CM.min} max={HALL_CHAR_CM.max} step={HALL_CHAR_CM.step}
            value={charCm} onChange={(e) => setCharCm(clampCharCm(Number(e.target.value)))}
            className="w-40 accent-[var(--secondary)]" aria-label="Chiều cao chữ trên tường"
          />
          <span className="tabular-nums text-sm text-secondary w-28 shrink-0">{charCm} cm</span>
        </label>
        <span className="text-xs text-on-surface-variant">Đọc tốt tới khoảng <b className="text-on-surface tabular-nums">{readingDistanceM(charCm)} m</b> — đo từ hàng ghế cuối lên màn.</span>
        <label className="flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer ml-auto">
          <input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} className="accent-secondary" />
          Chữ mẫu khi chưa có ai nói
        </label>
      </header>

      <div ref={stageRef} className="relative flex-1 min-h-0">
        {layout.boxes.map((box) => {
          const wall = walls.find((w) => w.id === box.id)
          if (!wall) return null
          // The scale model: the miniature's OWN width against the wall's real width gives a font that is
          // the same fraction of the screen as the hall one. Portrait screens stack their two columns, the
          // same rule a real /wall window applies on a hall monitor (where only shape can force it).
          const fontPx = hallFontPx(box.width, wall.widthM, charCm)
          return (
            <div key={box.id} className="absolute" style={{ left: box.left, top: box.top, width: box.width, height: box.height + 30 }}>
              <div className="relative overflow-hidden rounded-[3px] border-2 border-secondary/50 bg-background" style={{ width: box.width, height: box.height }}>
                <WallPane
                  lines={lines} view={wall.view} showSource={wall.showSource}
                  fontPx={fontPx} stacked={wall.heightM > wall.widthM} showLabels={box.width >= 260}
                />
              </div>
              <p className="mt-1 text-center font-label-caps text-[10px] tracking-widest text-on-surface-variant truncate">
                {wall.label} · {wall.widthM} × {wall.heightM} m · chữ ≈ {fontPx} px ở khung này
              </p>
            </div>
          )
        })}

        {/* Human figure, to the same scale as the screens — the fastest sanity check there is. */}
        {personH > 8 && layout.boxes.length > 0 && (
          <div className="absolute flex flex-col items-center" style={{ left: 8, bottom: 8 }}>
            <div className="w-2 rounded-t-full bg-on-surface-variant/45" style={{ height: personH }} />
            <span className="mt-0.5 font-label-caps text-[9px] text-on-surface-variant/70">1,7 m</span>
          </div>
        )}
      </div>

      <footer className="shrink-0 px-4 py-2 border-t border-outline-variant text-[11px] text-on-surface-variant leading-relaxed">
        Đây là màn xem thử để canh cỡ chữ, <b>không phải</b> tín hiệu đưa vào máy chiếu — mỗi màn thật vẫn là một cửa sổ riêng
        (nút “Xuất ra màn hình” bên bảng điều khiển). Chữ trên tường luôn cao đúng {charCm} cm dù máy chiếu nhận 1920 hay 3840 điểm ảnh.
      </footer>
    </div>
  )
}

export default WallMockup
```

## TASK 83 — `tests/hallScreens.test.ts` (TỆP MỚI)

Tạo tệp mới, dán nguyên văn:

```ts
// tests/hallScreens.test.ts — màn khán giả đo bằng MÉT, không đo bằng điểm ảnh.
//
// Lỗi gốc mà bộ này canh: cỡ chữ trước nay tính bằng điểm ảnh (wallLayout → 2,6 × 18px ≈ 47px). Điểm ảnh
// KHÔNG phải kích thước. Cùng một tấm màn 6 m: máy chiếu nhận 1920 điểm ảnh thì 47px là chữ cao ~15 cm,
// hàng ghế cuối đọc được; cũng tấm màn đó nhận 3840 điểm ảnh thì 47px chỉ còn ~7 cm, hàng cuối chịu thua.
// Thứ duy nhất không đổi khi đổi máy chiếu là CHIỀU CAO THẬT của con chữ — nên đó là thứ được chỉnh, còn
// điểm ảnh do máy tự quy ra lúc vẽ.

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_HALL_WALLS, HALL_CHAR_CM, HALL_GAP_M, WALL_GLYPH_RATIO, WALL_M,
  clampCharCm, clampWallM, decodeHallWalls, encodeHallWalls, fitToAspect, hallFontPx, hallMockupUrl,
  hallOrder, hasPhysicalSize, mockupLayout, readingDistanceM, type HallWall,
} from '../src/lib/hallScreens'

const wall = (p: Partial<HallWall> = {}): HallWall => ({
  id: 'center', label: 'Màn giữa', view: 'both', showSource: false, widthM: 6, heightM: 3, ...p,
})

// Chiều cao thật của con chữ, suy ngược từ cỡ chữ px — đúng phép tính mà mắt người xem thực hiện.
const realCharCm = (fontPx: number, viewportPx: number, widthM: number): number =>
  (fontPx / viewportPx) * widthM * WALL_GLYPH_RATIO * 100

describe('DEFAULT_HALL_WALLS', () => {
  it('là đúng hội trường 20 năm: màn chính 6 × 3 m, hai màn hông 3,5 × 2,5 m', () => {
    // Một chỗ duy nhất ghi hội trường — DEFAULT_WALL_OUTPUTS dựng từ đây và /wall-mockup mở trơn cũng
    // rơi về đây, nên bảng điều khiển và màn xem thử không thể mô tả hai hội trường khác nhau.
    expect(DEFAULT_HALL_WALLS.map((w) => `${w.id} ${w.widthM}x${w.heightM}`))
      .toEqual(['center 6x3', 'left 3.5x2.5', 'right 3.5x2.5'])
    // Màn giữa hai chiều, hai màn hông mỗi bên một tiếng.
    expect(DEFAULT_HALL_WALLS.map((w) => w.view)).toEqual(['both', 'vi2ja', 'ja2vi'])
    // Tất cả đều nằm trong khoảng hợp lệ, nếu không thì chính mặc định sẽ bị loại khi đọc lại.
    for (const w of DEFAULT_HALL_WALLS) expect(hasPhysicalSize(w.widthM, w.heightM)).toBe(true)
  })
})

describe('hallFontPx', () => {
  it('chữ cao đúng số centimet đã chọn, dù máy chiếu nhận bao nhiêu điểm ảnh', () => {
    // Đây là toàn bộ lý do file này tồn tại: 1920 hay 3840 cho ra CÙNG một chiều cao thật.
    for (const px of [1280, 1920, 2560, 3840]) {
      expect(realCharCm(hallFontPx(px, 6, 12), px, 6)).toBeCloseTo(12, 0)
    }
    // …và cỡ chữ px thì tăng gấp đôi khi độ phân giải gấp đôi, đúng như phải thế.
    expect(hallFontPx(3840, 6, 12)).toBeCloseTo(hallFontPx(1920, 6, 12) * 2, -1)
  })

  it('màn hông nhỏ hơn lại cần CỠ CHỮ PX TO HƠN, mà người xem vẫn thấy chữ cao bằng nhau', () => {
    // Chỗ dễ nghĩ ngược nhất, và cũng là chỗ đặt cỡ chữ bằng điểm ảnh sai từ gốc: cùng 1920 điểm ảnh mà
    // tấm màn chỉ rộng 3,5 m thì mỗi mét chứa NHIỀU điểm ảnh hơn, nên 12 cm ăn nhiều px hơn. Đặt một cỡ
    // px chung cho cả ba màn là để màn giữa và màn hông ra hai cỡ chữ thật khác nhau.
    const main = hallFontPx(1920, 6, 12)
    const side = hallFontPx(1920, 3.5, 12)
    expect(side).toBeGreaterThan(main)
    expect(realCharCm(side, 1920, 3.5)).toBeCloseTo(12, 0) // nhưng người xem thấy chữ cao y hệt
    expect(realCharCm(main, 1920, 6)).toBeCloseTo(12, 0)
  })

  it('thu nhỏ tấm màn thì chữ nhỏ theo đúng tỉ lệ — nền tảng của màn tượng trưng', () => {
    // Màn tượng trưng chỉ là tấm màn ấy vẽ vào một khung bé hơn: cùng một hàm, khung bé thì chữ bé đúng
    // tỉ lệ, nên nhìn bản thu nhỏ là biết được ngoài hội trường chữ chiếm bao nhiêu phần tấm màn.
    expect(hallFontPx(480, 6, 12) * 4).toBeCloseTo(hallFontPx(1920, 6, 12), -1)
  })

  it('không bao giờ trả về 0 hay số âm, kể cả khi đầu vào vô nghĩa', () => {
    expect(hallFontPx(0, 6, 12)).toBe(0)     // chưa đo được cửa sổ → chưa vẽ chữ
    expect(hallFontPx(1920, 0, 12)).toBe(0)
    expect(hallFontPx(1920, -6, 12)).toBe(0)
    expect(hallFontPx(1, 40, 12)).toBeGreaterThanOrEqual(1) // sàn 1px, không bao giờ ra 0px
  })

  it('cm ngoài khoảng bị kẹp lại trước khi tính, không nhân thẳng', () => {
    expect(hallFontPx(1920, 6, 999)).toBe(hallFontPx(1920, 6, HALL_CHAR_CM.max))
    // 0 và số âm bị nâng lên sàn chứ KHÔNG nhảy về mặc định: chỗ đọc địa chỉ đã biến "thiếu cm" thành
    // mặc định trước khi gọi, nên tới đây 0 là một con số người ta thật sự đưa vào, kẹp là đúng.
    expect(hallFontPx(1920, 6, 0)).toBe(hallFontPx(1920, 6, HALL_CHAR_CM.min))
    expect(hallFontPx(1920, 6, -5)).toBe(hallFontPx(1920, 6, HALL_CHAR_CM.min))
    expect(clampCharCm(0)).toBe(HALL_CHAR_CM.min)
  })
})

describe('clampCharCm · readingDistanceM · clampWallM', () => {
  it('kẹp trong khoảng và làm tròn', () => {
    expect(clampCharCm(12)).toBe(12)
    expect(clampCharCm(12.4)).toBe(12)
    expect(clampCharCm(1)).toBe(HALL_CHAR_CM.min)
    expect(clampCharCm(500)).toBe(HALL_CHAR_CM.max)
    expect(clampCharCm(Number.NaN)).toBe(HALL_CHAR_CM.default)
  })

  it('1 cm chữ đọc được khoảng 2 m — con số người điều khiển thật sự cần', () => {
    expect(readingDistanceM(12)).toBe(24)
    expect(readingDistanceM(15)).toBe(30)
    // Mặc định phải phủ được một hội trường có màn chính 6 m (thường sâu 25-30 m).
    expect(readingDistanceM(HALL_CHAR_CM.default)).toBeGreaterThanOrEqual(24)
  })

  it('cỡ màn bị kẹp vào khoảng vật lý — 600 gõ nhầm cho 6,00 không thành màn 600 m', () => {
    expect(clampWallM(6)).toBe(6)
    expect(clampWallM(600)).toBe(WALL_M.max)
    expect(clampWallM(0)).toBe(WALL_M.min)
    expect(clampWallM(Number.NaN)).toBe(1)
  })

  it('hasPhysicalSize đòi CẢ HAI cạnh hợp lệ', () => {
    expect(hasPhysicalSize(6, 3)).toBe(true)
    expect(hasPhysicalSize(6, undefined)).toBe(false)  // thiếu một cạnh thì không suy ra hình dạng được
    expect(hasPhysicalSize(undefined, 3)).toBe(false)
    expect(hasPhysicalSize(6, 0)).toBe(false)
    expect(hasPhysicalSize(6, 999)).toBe(false)
    expect(hasPhysicalSize(Number.NaN, 3)).toBe(false)
  })
})

describe('fitToAspect', () => {
  it('màn 6 × 3 m nhận lát 640 × 1080 thì mở ra 640 × 320, không phải 640 × 1080', () => {
    // Nếu không nắn hình, người điều khiển tập dượt trên cửa sổ dọc, thấy chữ vừa đủ, rồi tấm màn ngang
    // ngoài hội trường lại nói khác — mọi phán đoán "chừng này chữ là vừa" đều làm trên sai hình dạng.
    expect(fitToAspect({ width: 640, height: 1080 }, 6, 3)).toEqual({ width: 640, height: 320 })
  })

  it('giữ đúng tỉ lệ và không bao giờ tràn khỏi khung', () => {
    for (const avail of [{ width: 1920, height: 1080 }, { width: 500, height: 500 }, { width: 300, height: 900 }]) {
      const fit = fitToAspect(avail, 3.5, 2.5)
      expect(fit.width).toBeLessThanOrEqual(avail.width)
      expect(fit.height).toBeLessThanOrEqual(avail.height)
      expect(fit.width / fit.height).toBeCloseTo(3.5 / 2.5, 1)
    }
  })

  it('đầu vào vô nghĩa thì trả nguyên khung, không trả 0 × 0', () => {
    expect(fitToAspect({ width: 640, height: 480 }, 0, 3)).toEqual({ width: 640, height: 480 })
    expect(fitToAspect({ width: 0, height: 0 }, 6, 3)).toEqual({ width: 0, height: 0 })
  })
})

describe('hallOrder', () => {
  it('xếp theo mắt người ngồi dưới nhìn lên: trái · giữa · phải', () => {
    expect(hallOrder(DEFAULT_HALL_WALLS).map((w) => w.id)).toEqual(['left', 'center', 'right'])
  })

  it('màn lạ vẫn còn, xếp sau các màn đã biết theo đúng thứ tự đưa vào', () => {
    const list = hallOrder([wall({ id: 'balcony' }), wall({ id: 'right' }), wall({ id: 'foyer' }), wall({ id: 'left' })])
    expect(list.map((w) => w.id)).toEqual(['left', 'right', 'balcony', 'foyer'])
  })
})

describe('mockupLayout', () => {
  const AVAIL = { width: 1600, height: 400 }

  it('thu nhỏ theo MỘT tỉ lệ chung, nên to nhỏ trên màn đúng như to nhỏ ngoài hội trường', () => {
    const { boxes, pxPerM, spanM } = mockupLayout(DEFAULT_HALL_WALLS, AVAIL)
    expect(spanM).toBe(3.5 + 6 + 3.5 + HALL_GAP_M * 2) // 16 m kể cả khoảng hở giữa các màn
    expect(pxPerM).toBe(100)
    const [left, center, right] = boxes
    expect(boxes.map((b) => b.id)).toEqual(['left', 'center', 'right'])
    // Màn chính rộng 6/3,5 ≈ 1,71 lần màn hông — đúng tỉ lệ thật, đó là toàn bộ giá trị của bản thu nhỏ.
    expect(center.width / left.width).toBeCloseTo(6 / 3.5, 2)
    expect(left.width).toBe(right.width)
    expect(left.height).toBe(right.height)
    expect(center.height).toBe(300)
  })

  it('các màn treo theo một đường tâm chung và không chồng lên nhau', () => {
    const { boxes } = mockupLayout(DEFAULT_HALL_WALLS, AVAIL)
    const midY = (b: { top: number; height: number }) => b.top + b.height / 2
    expect(midY(boxes[0])).toBeCloseTo(midY(boxes[1]), 0)
    expect(midY(boxes[1])).toBeCloseTo(midY(boxes[2]), 0)
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].left + boxes[i - 1].width)
    }
  })

  it('luôn nằm gọn trong khung và được canh giữa, mọi khổ màn hình', () => {
    for (const avail of [{ width: 1600, height: 400 }, { width: 900, height: 700 }, { width: 1920, height: 1080 }, { width: 640, height: 300 }]) {
      const { boxes } = mockupLayout(DEFAULT_HALL_WALLS, avail)
      const first = boxes[0]
      const last = boxes[boxes.length - 1]
      expect(first.left).toBeGreaterThanOrEqual(0)
      expect(last.left + last.width).toBeLessThanOrEqual(avail.width + 1)
      for (const b of boxes) {
        expect(b.top).toBeGreaterThanOrEqual(0)
        expect(b.top + b.height).toBeLessThanOrEqual(avail.height + 1)
      }
      // Canh giữa: lề trái và lề phải bằng nhau.
      expect(first.left).toBeCloseTo(avail.width - (last.left + last.width), 0)
    }
  })

  it('khung cao thì bị chiều cao màn cao nhất chặn lại, không kéo dãn', () => {
    // 1600 / 16 m = 100 px/m theo chiều ngang, nhưng khung chỉ cao 150px cho tấm màn 3 m → 50 px/m thắng.
    const { pxPerM } = mockupLayout(DEFAULT_HALL_WALLS, { width: 1600, height: 150 })
    expect(pxPerM).toBe(50)
  })

  it('danh sách rỗng hoặc khung chưa đo được thì trả về rỗng, không chia cho 0', () => {
    expect(mockupLayout([], { width: 800, height: 600 })).toEqual({ pxPerM: 0, boxes: [], spanM: 0 })
    expect(mockupLayout(DEFAULT_HALL_WALLS, { width: 0, height: 0 }).boxes).toEqual([])
  })

  it('một màn duy nhất thì không có khoảng hở nào được cộng vào', () => {
    const { spanM } = mockupLayout([wall()], AVAIL)
    expect(spanM).toBe(6)
  })
})

describe('mã hoá hội trường lên địa chỉ', () => {
  it('đi và về nguyên vẹn', () => {
    expect(decodeHallWalls(encodeHallWalls(DEFAULT_HALL_WALLS))).toEqual(DEFAULT_HALL_WALLS)
  })

  it('giữ đúng chiều và cờ "hiện bản gốc" của từng màn', () => {
    const src = [wall({ id: 'left', view: 'ja2vi', showSource: true, widthM: 3.5, heightM: 2.5 })]
    const [back] = decodeHallWalls(encodeHallWalls(src))
    expect(back.view).toBe('ja2vi')
    expect(back.showSource).toBe(true)
    expect(back.widthM).toBe(3.5)
  })

  it('mục hỏng bị bỏ HẲN, không lọt vào một tấm màn nửa vời', () => {
    // Thà thiếu một màn trên bản xem thử (nhìn thấy được) còn hơn vẽ một tấm màn 0 m hoặc sai chiều.
    expect(decodeHallWalls('center|Màn giữa|both|0|6|3,hong|Hỏng|xxx|0|3|2')).toHaveLength(1)
    expect(decodeHallWalls('center|Màn giữa|both|0|abc|3')).toEqual([])
    expect(decodeHallWalls('center|Màn giữa|both|0|6')).toEqual([])      // thiếu trường
    expect(decodeHallWalls('center|Màn giữa|both|0|999|3')).toEqual([])  // ngoài khoảng vật lý
    expect(decodeHallWalls('')).toEqual([])
    expect(decodeHallWalls(null)).toEqual([])
  })

  it('tên màn có dấu phân cách bị làm sạch, không nuốt mất các trường sau nó', () => {
    const [back] = decodeHallWalls(encodeHallWalls([wall({ label: 'Màn giữa, to|rộng' })]))
    expect(back.label).toBe('Màn giữa  to rộng')
    expect(back.widthM).toBe(6) // vẫn đọc được cỡ màn, tức là các trường không bị trôi
  })

  it('hallMockupUrl dựng đúng địa chỉ mà /wall-mockup đọc lại được', () => {
    const url = hallMockupUrl(DEFAULT_HALL_WALLS, 15)
    expect(url.startsWith('/wall-mockup?')).toBe(true)
    const q = new URLSearchParams(url.slice(url.indexOf('?') + 1))
    expect(q.get('cm')).toBe('15')
    expect(decodeHallWalls(q.get('walls'))).toEqual(DEFAULT_HALL_WALLS)
  })

  it('cm ngoài khoảng bị kẹp ngay khi dựng địa chỉ', () => {
    expect(new URLSearchParams(hallMockupUrl(DEFAULT_HALL_WALLS, 999).split('?')[1]).get('cm')).toBe(String(HALL_CHAR_CM.max))
  })
})
```

## TASK 84 — `src/pages/AudienceWall.tsx` (THAY TRỌN TỆP)

Tệp này **không bị PROMPT-12 và PROMPT-13 đụng tới một dòng nào** (đã kiểm: `git diff e22cfd6 dbbf8d6`
cho tệp này ra rỗng), nên thay trọn không xoá mất bản vá tay nào. Xoá hết nội dung cũ, dán nguyên văn:

```tsx
// src/pages/AudienceWall.tsx — /wall : a detachable, full-screen audience subtitle window (TASK 7.2). No
// operator chrome, alongside /stream and /reveal. Reads the console's stream over BroadcastChannel
// (audienceChannel) and renders through the shared WallPane → SubtitleParagraphs, so it can never drift
// from the console monitor or from the hall preview.
//
// Query params: ?dir=vi2ja|ja2vi|both · &src=1 (also show source, default off) · &font=<px>
//   NEW — the physical wall: &wm=<chiều rộng mét> · &hm=<chiều cao mét> · &cm=<chiều cao chữ, cm>.
// With `wm` present the text is sized in CENTIMETRES OF WALL instead of CSS pixels: the letters come out
// the same real size whether the video processor takes 1920 or 3840 px, because the pixels are computed
// from THIS window's real width against the wall's real width (see hallScreens.ts). Without `wm` nothing
// changes — the old pixel scale still runs, so an operator's hand-typed /wall URL behaves exactly as before.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { subscribeAudience, type AudienceLine } from '../lib/audienceChannel'
// M10: the window may be a hall projector OR a phone-shaped strip docked beside the operator's other
// apps, so the stacking maths lives with the other subtitle rules in audienceSubtitles.ts.
import { clampSubtitleFont, wallLayout, wallNeedsTouchControls } from '../lib/audienceSubtitles'
import { HALL_CHAR_CM, clampCharCm, hallFontPx, hasPhysicalSize, readingDistanceM } from '../lib/hallScreens'
import WallPane from '../components/WallPane'

type View = 'vi2ja' | 'ja2vi' | 'both'

const AudienceWall: React.FC = () => {
  const params = new URLSearchParams(window.location.search)
  const viewParam = params.get('dir')
  const view: View = viewParam === 'vi2ja' || viewParam === 'ja2vi' ? viewParam : 'both'

  // The physical wall, when the console sent one. `hm` only affects the SHAPE the console opened the window
  // at; here it is kept so the readout can name the screen the operator is standing in front of.
  const widthM = Number(params.get('wm'))
  const heightM = Number(params.get('hm'))
  const physical = hasPhysicalSize(widthM, heightM)

  const [showSource, setShowSource] = useState(params.get('src') === '1')
  const [font, setFont] = useState(() => clampSubtitleFont(Number(params.get('font')) || 18))
  const [charCm, setCharCm] = useState(() => clampCharCm(Number(params.get('cm')) || HALL_CHAR_CM.default))
  const [lines, setLines] = useState<AudienceLine[]>([])
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimer = useRef<number | null>(null)
  // M10: the layout follows the WINDOW, not the device — the operator shrinks this window into a strip and
  // it must reflow live, with no reload (a reload would lose the lines already on screen).
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))

  useEffect(() => subscribeAudience(setLines), [])

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // On a physical wall +/− change the LETTER HEIGHT, not a pixel count: the operator standing at the back
  // of the hall is judging "can I read that", and centimetres are the thing that answers it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.() }
      else if (e.key === 's' || e.key === 'S') setShowSource((v) => !v)
      else if (e.key === '+' || e.key === '=') { if (physical) setCharCm((c) => clampCharCm(c + 1)); else setFont((f) => clampSubtitleFont(f + 1)) }
      else if (e.key === '-' || e.key === '_') { if (physical) setCharCm((c) => clampCharCm(c - 1)); else setFont((f) => clampSubtitleFont(f - 1)) }
      else if (e.key === '0') { setFont(18); setCharCm(HALL_CHAR_CM.default) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [physical])

  // The control bar fades out after a few seconds of no mouse movement, because it is projected. On a
  // touch screen there is no mouse at all, so a tap has to be able to bring it back — otherwise the bar
  // hides three seconds in and the phone-shaped window has no controls left.
  useEffect(() => {
    const onMove = () => {
      setControlsVisible(true)
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
      hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3000)
    }
    onMove()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('pointerdown', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('pointerdown', onMove)
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }
  }, [])

  const { stacked, scale } = wallLayout(viewport.w, viewport.h, view)
  const compact = wallNeedsTouchControls(viewport.w)
  const fontPx = useMemo(
    () => (physical ? hallFontPx(viewport.w, widthM, charCm) : Math.round(clampSubtitleFont(font) * scale)),
    [physical, viewport.w, widthM, charCm, font, scale],
  )

  const barButton = 'inline-flex items-center justify-center rounded-full border border-outline-variant w-9 h-9 text-on-surface-variant active:text-primary active:border-primary'

  return (
    <div className="fixed inset-0 bg-background text-on-background overflow-hidden">
      <WallPane lines={lines} view={view} showSource={showSource} fontPx={fontPx} stacked={stacked} />

      <div className={`fixed bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-surface-container/90 border border-outline-variant px-3 py-2 text-xs text-on-surface-variant transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {compact ? (
          <>
            <button type="button" onClick={() => (physical ? setCharCm((c) => clampCharCm(c - 1)) : setFont((f) => clampSubtitleFont(f - 1)))} className={barButton} aria-label="Chữ nhỏ hơn">−</button>
            <button type="button" onClick={() => (physical ? setCharCm((c) => clampCharCm(c + 1)) : setFont((f) => clampSubtitleFont(f + 1)))} className={barButton} aria-label="Chữ to hơn">+</button>
            <button type="button" onClick={() => setShowSource((v) => !v)} className={`${barButton} w-auto px-3 ${showSource ? 'text-primary border-primary' : ''}`}>Gốc</button>
            <button
              type="button"
              onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.() }}
              className={`${barButton} w-auto px-3`}
            >Toàn màn</button>
          </>
        ) : (
          <span className="font-label-caps tracking-wide">F toàn màn · S bản gốc · +/− cỡ chữ · 0 mặc định</span>
        )}
        {physical && (
          // The only readout that matters on a wall: how tall the letters are and how far back they read.
          <span className="font-label-caps tracking-wide text-secondary/90 tabular-nums">
            {widthM}×{heightM} m · chữ {charCm} cm · đọc tốt tới ~{readingDistanceM(charCm)} m
          </span>
        )}
      </div>
    </div>
  )
}

export default AudienceWall
```

## TASK 85 — `src/components/SubtitleParagraphs.tsx` (THAY TRỌN TỆP)

Tệp này **không bị PROMPT-12 và PROMPT-13 đụng tới một dòng nào** (đã kiểm: `git diff e22cfd6 dbbf8d6`
cho tệp này ra rỗng), nên thay trọn không xoá mất bản vá tay nào. Xoá hết nội dung cũ, dán nguyên văn:

```tsx
// src/components/SubtitleParagraphs.tsx — the shared subtitle rendering block (TASK 8). Lane-neutral (the
// /wall page imports it, and /wall is not a lane page), so it cannot live under the lane directory. The
// console monitor and the wall windows both render through this, so they can never drift apart. The
// BEHAVIOUR is specified in audienceSubtitles.ts; the LOOK is the existing design system only.
//
// Reads like a page, top-down: the first paragraph sits against the TOP edge, each new paragraph falls
// BELOW the previous one, and the view scrolls only once it is full — `justify-start`, NEVER a
// bottom-anchored `justify-end` + `min-h-full` (that would make subtitles read as if running backwards).
// The OFFLINE lane's own subtitle blocks keep their `justify-end`; those are not this component.

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { AudienceLine } from '../lib/audienceChannel'
import { buildParagraphs, subtitleEmptyState, appendedTail, clampSubtitleFont } from '../lib/audienceSubtitles'

interface Props {
  lines: AudienceLine[]
  /** Force the language of every paragraph (used by the console's fixed-language columns). */
  direction?: 'vi2ja' | 'ja2vi'
  fontSize: number
  scale?: number
  /**
   * Absolute size in CSS px, overriding `fontSize × scale` entirely. The hall walls size their text from
   * PHYSICAL centimetres (hallScreens.ts), which lands far outside the console slider's 12–28 band, so it
   * cannot arrive through `fontSize` — `clampSubtitleFont` would cut a 47px wall down to 28.
   */
  fontPx?: number
  className?: string
}

const SubtitleParagraphs: React.FC<Props> = ({ lines, direction, fontSize, scale = 1, fontPx, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const [showJump, setShowJump] = useState(false)
  // Remember each paragraph's previously-rendered stable text so only the newly-appended chars animate
  // and the text already being read stays perfectly still.
  const prevStableRef = useRef<Map<string, string>>(new Map())

  const paragraphs = buildParagraphs(lines)
  const empty = subtitleEmptyState(lines)
  const px = fontPx && fontPx > 0 ? Math.round(fontPx) : Math.round(clampSubtitleFont(fontSize) * scale)
  const forcedLang = direction ? (direction === 'vi2ja' ? 'ja' : 'vi') : undefined

  // Pin to the bottom BEFORE paint (or new text visibly jumps once before sliding down), unless the
  // viewer scrolled up to read back.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight
  })

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    pinnedRef.current = dist <= 80
    setShowJump(dist > 80)
  }
  const jumpToLatest = () => {
    const el = scrollRef.current
    if (!el) return
    pinnedRef.current = true
    setShowJump(false)
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }

  // Appended-tail per paragraph (drives the opacity-only fade of new characters).
  const tails = new Map<string, string>()
  const nextPrev = new Map<string, string>()
  for (const p of paragraphs) {
    tails.set(p.key, appendedTail(prevStableRef.current.get(p.key) ?? '', p.stable))
    nextPrev.set(p.key, p.stable)
  }
  useEffect(() => { prevStableRef.current = nextPrev })

  if (empty) {
    return (
      <div className={`relative h-full ${className ?? ''}`}>
        <div className="h-full flex flex-col items-center justify-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined listening-pulse" style={{ fontSize: `${Math.round(px * 1.6)}px` }} aria-hidden="true">{empty === 'listening' ? 'hearing' : 'subtitles'}</span>
          <span className="font-label-caps" style={{ fontSize: `${Math.round(px * 0.8)}px` }}>{empty === 'listening' ? 'Đang lắng nghe…' : 'Đang tạo phụ đề…'}</span>
          <span className="jp-text opacity-70" style={{ fontSize: `${Math.round(px * 0.7)}px` }}>{empty === 'listening' ? 'お待ちください' : '通訳中…'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative h-full ${className ?? ''}`}>
      {/* Lề và khoảng cách dòng: theo VIEWPORT như cũ ở màn điều khiển, nhưng theo CỠ CHỮ khi tấm màn đã
          có kích thước thật. Lý do là màn tượng trưng: `4vw` đo theo cửa sổ của người điều khiển, nên một
          khung thu nhỏ 600px vẫn ăn lề của một cửa sổ 1600px — mất ~21 % bề ngang thay vì ~8 %, chữ xuống
          dòng sớm hơn ngoài hội trường, và người điều khiển sẽ chỉnh chữ nhỏ đi vì tin vào bản xem thử.
          Lấy lề theo cỡ chữ thì tỉ lệ lề/bề ngang giống hệt nhau ở mọi cỡ khung. */}
      <div
        ref={scrollRef} onScroll={onScroll}
        className={`h-full overflow-y-auto ${fontPx ? '' : 'px-[4vw] py-[3vh]'}`}
        style={fontPx ? { paddingInline: Math.round(px * 1.1), paddingBlock: Math.round(px * 0.8) } : undefined}
      >
        <div className={`flex flex-col justify-start ${fontPx ? '' : 'gap-[2vh]'}`} style={fontPx ? { gap: Math.round(px * 0.55) } : undefined}>
          {paragraphs.map((p) => {
            const lang = forcedLang ?? p.lang
            const tail = tails.get(p.key) ?? ''
            const head = tail && p.stable.endsWith(tail) ? p.stable.slice(0, p.stable.length - tail.length) : p.stable
            const sep = p.volatile && (head || tail) ? (lang === 'ja' ? '' : ' ') : ''
            return (
              <p key={p.key} lang={lang}
                className={`${lang === 'ja' ? 'jp-text' : ''} sub-para border-l-4 ${fontPx ? '' : 'pl-[2vw]'} ${p.live ? 'sub-para--live border-secondary text-secondary' : 'border-outline-variant text-on-surface/85'}`}
                style={{ fontSize: `${px}px`, lineHeight: 1.32, lineBreak: lang === 'ja' ? 'strict' : undefined, ...(fontPx ? { paddingLeft: Math.round(px * 0.5) } : null) }}>
                {head}
                {tail && <span className="sub-append">{tail}</span>}
                {p.volatile && <span className="italic" style={{ opacity: 0.42 }}>{sep}{p.volatile}</span>}
              </p>
            )
          })}
        </div>
      </div>
      {showJump && (
        <button onClick={jumpToLatest} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 rounded-full bg-secondary text-on-secondary px-4 py-2 text-sm font-semibold shadow-lg">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_downward</span>Về dòng mới nhất
        </button>
      )}
    </div>
  )
}

export default SubtitleParagraphs
```

## TASK 86 — `src/lib/lanes/online/audienceWindows.ts` (THAY TRỌN TỆP)

Tệp này **không bị PROMPT-12 và PROMPT-13 đụng tới một dòng nào** (đã kiểm: `git diff e22cfd6 dbbf8d6`
cho tệp này ra rỗng), nên thay trọn không xoá mất bản vá tay nào. Xoá hết nội dung cũ, dán nguyên văn:

```ts
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

// Reading `.closed` on a lost or cross-origin handle can throw — a handle we cannot inspect counts as closed.
function isClosed(win: Window): boolean {
  try { return win.closed } catch { return true }
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

    const existing = wallWindows.get(o.id)
    if (existing && !isClosed(existing)) {
      // Already open: re-navigate ONLY when the content changed (avoid flicker / a dropped BroadcastChannel
      // mid-ceremony), then always move/resize it back onto its assigned screen.
      if (wallUrls.get(o.id) !== url) {
        try { existing.location.replace(url); wallUrls.set(o.id, url) } catch { /* navigation blocked — leave as-is */ }
      }
      try { existing.moveTo(left, top); existing.resizeTo(width, height) } catch { /* browsers restrict move/resize */ }
      try { existing.focus() } catch { /* ignore */ }
      opened++
      return
    }

    // Not open (or the handle went dead): open a fresh popup with the position hint window.open honours only
    // on first creation.
    let win: Window | null = null
    try { win = window.open(url, `proyaku-wall-${o.id}`, `popup=yes,left=${left},top=${top},width=${width},height=${height}`) } catch { win = null }
    if (!win) {
      wallWindows.delete(o.id); wallUrls.delete(o.id)
      blocked++
      return
    }
    wallWindows.set(o.id, win); wallUrls.set(o.id, url)
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
    if (isClosed(win)) { wallWindows.delete(id); wallUrls.delete(id) }
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
}
```

## TASK 87 — `tests/wallCompactLayout.test.ts` (THAY TRỌN TỆP)

Tệp này **không bị PROMPT-12 và PROMPT-13 đụng tới một dòng nào** (đã kiểm: `git diff e22cfd6 dbbf8d6`
cho tệp này ra rỗng), nên thay trọn không xoá mất bản vá tay nào. Xoá hết nội dung cũ, dán nguyên văn:

```ts
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
```

## TASK 88 — `src/App.tsx` (2 chỗ sửa)

### 1. thêm một dòng nhập trang mới

TÌM:

```
import AudienceWall from './pages/AudienceWall'
```

THAY BẰNG:

```
import AudienceWall from './pages/AudienceWall'
import WallMockup from './pages/WallMockup'
```

### 2. thêm đường dẫn /wall-mockup

TÌM:

```
            <Route path="/wall" element={<AudienceWall />} />
```

THAY BẰNG:

```
            <Route path="/wall" element={<AudienceWall />} />
            {/* Màn tượng trưng — cả hội trường thu nhỏ đúng tỉ lệ trên MỘT màn, để canh cỡ chữ trước buổi lễ. */}
            <Route path="/wall-mockup" element={<WallMockup />} />
```

## TASK 89 — `src/lib/lanes/online/index.ts` (8 chỗ sửa)

### 1. nhập phép tính cỡ chữ theo mét

TÌM:

```
import { SUBTITLE_FONT, clampSubtitleFont } from '../../audienceSubtitles'
```

THAY BẰNG:

```
import { SUBTITLE_FONT, clampSubtitleFont } from '../../audienceSubtitles'
import { HALL_CHAR_CM, clampCharCm } from '../../hallScreens'
```

### 2. cho các thành phần trong làn dùng qua một cửa duy nhất

TÌM:

```
export { SUBTITLE_FONT } from '../../audienceSubtitles'
```

THAY BẰNG:

```
export { SUBTITLE_FONT } from '../../audienceSubtitles'
// The wall's PHYSICAL model (mét → cm chữ → px). Lives outside the lane because /wall and /wall-mockup use
// it too and may not import from this directory; re-exported here so lane components keep one import root.
export { HALL_CHAR_CM, WALL_M, clampCharCm, clampWallM, hasPhysicalSize, hallFontPx, hallMockupUrl, readingDistanceM } from '../../hallScreens'
export type { HallWall } from '../../hallScreens'
```

### 3. khai báo ô nhớ mới

TÌM:

```
  subtitleFont: number
  setSubtitleFont: (n: number) => void
  wallOutputs: WallOutput[]
```

THAY BẰNG:

```
  subtitleFont: number
  setSubtitleFont: (n: number) => void
  /** Chiều cao MỘT chữ trên tường, tính bằng cm — cỡ chữ thật của các màn khán giả (hallScreens.ts). */
  wallCharCm: number
  setWallCharCm: (n: number) => void
  wallOutputs: WallOutput[]
```

### 4. nhớ số cm đã chọn giữa các lần mở

TÌM:

```
  const [subtitleFont, setSubtitleFontState] = useState<number>(() => { try { return clampSubtitleFont(Number(localStorage.getItem('proyaku_online_subtitle_font')) || SUBTITLE_FONT.default) } catch { return SUBTITLE_FONT.default } })
```

THAY BẰNG:

```
  const [subtitleFont, setSubtitleFontState] = useState<number>(() => { try { return clampSubtitleFont(Number(localStorage.getItem('proyaku_online_subtitle_font')) || SUBTITLE_FONT.default) } catch { return SUBTITLE_FONT.default } })
  const [wallCharCm, setWallCharCmState] = useState<number>(() => { try { return clampCharCm(Number(localStorage.getItem('proyaku_online_wall_char_cm')) || HALL_CHAR_CM.default) } catch { return HALL_CHAR_CM.default } })
```

### 5. để lúc bấm Xuất đọc được số mới nhất

TÌM:

```
  const subtitleFontRef = useRef(subtitleFont); subtitleFontRef.current = subtitleFont
```

THAY BẰNG:

```
  const subtitleFontRef = useRef(subtitleFont); subtitleFontRef.current = subtitleFont
  const wallCharCmRef = useRef(wallCharCm); wallCharCmRef.current = wallCharCm
```

### 6. hàm đặt số cm

TÌM:

```
  const setWallOutputs = useCallback((o: WallOutput[]) => { setWallOutputsState(o); saveWallOutputs(o) }, [])
```

THAY BẰNG:

```
  const setWallCharCm = useCallback((n: number) => { const c = clampCharCm(n); setWallCharCmState(c); try { localStorage.setItem('proyaku_online_wall_char_cm', String(c)) } catch { /* private mode */ } }, [])
  const setWallOutputs = useCallback((o: WallOutput[]) => { setWallOutputsState(o); saveWallOutputs(o) }, [])
```

### 7. gửi số cm sang các cửa sổ màn khán giả

TÌM:

```
    const r = openWallWindows(wallOutputsRef.current, wallScreensRef.current, subtitleFontRef.current)
```

THAY BẰNG:

```
    const r = openWallWindows(wallOutputsRef.current, wallScreensRef.current, subtitleFontRef.current, wallCharCmRef.current)
```

### 8. trả hai thứ mới ra cho màn hình dùng

TÌM:

```
    twoWay, setTwoWay, directedLines, subtitleFont, setSubtitleFont,
```

THAY BẰNG:

```
    twoWay, setTwoWay, directedLines, subtitleFont, setSubtitleFont, wallCharCm, setWallCharCm,
```

## TASK 90 — `src/pages/ProgramTimeline.tsx` (1 chỗ sửa)

Đây là việc **dọn dẹp kèm theo**, không dính tới màn hình. Anh đã báo còn 2 cảnh báo `exhaustive-deps`
ở tệp này sau PROMPT-13 — đúng là mã prompt đưa nguyên văn, nhưng nó là một lỗi chậm máy thật: dòng đó
dựng lại một danh sách MỚI mỗi lần vẽ lại màn hình, khiến mọi phép tính bên dưới (kể cả việc dò lại neo
kịch bản cho từng đoạn của cả buổi) chạy lại từ đầu, dù không có gì thay đổi. Sửa một dòng là hết cả hai
cảnh báo lẫn phần tính thừa.

### 1. nhớ danh sách đoạn thay vì dựng lại mỗi lần vẽ

TÌM:

```
    const segments = event?.segments ?? [];
```

THAY BẰNG:

```
    // `useMemo` chứ không phải một dòng gán thẳng: `event?.segments ?? []` dựng một mảng MỚI mỗi lần vẽ khi
    // buổi chưa có Timeline, nên các `useMemo` phía dưới nhận một tham chiếu khác nhau mỗi lần và tính lại
    // toàn bộ — kể cả việc giải neo kịch bản cho từng đoạn của cả buổi. Cùng khuôn với `runSegments` bên
    // `OnlineConsole.tsx`, để hai màn không lệch nhau về cách nhớ danh sách đoạn.
    const segments = useMemo(() => event?.segments ?? [], [event]);
```

## TASK 91 — `src/lib/lanes/online/components/OnlineConsole.tsx` (4 chỗ sửa)

### 1. nhập thêm vài phép tính

TÌM:

```
type WallOutput, type WallDock, MIC_SENSITIVITY_OPTIONS,
```

THAY BẰNG:

```
type WallOutput, type WallDock, HALL_CHAR_CM, WALL_M, clampWallM, hasPhysicalSize, hallMockupUrl, readingDistanceM, type HallWall, MIC_SENSITIVITY_OPTIONS,
```

### 2. dựng địa chỉ cho màn tượng trưng

TÌM:

```
  const wallNoteMsg = wallNote && wallNote.atCount === lane.wallOpenIds.length ? wallNote.msg : ''
```

THAY BẰNG:

```
  const wallNoteMsg = wallNote && wallNote.atCount === lane.wallOpenIds.length ? wallNote.msg : ''
  // Màn tượng trưng: cả hội trường thu nhỏ trên MỘT màn để canh cỡ chữ trước buổi lễ. It is not a lane
  // page and cannot read the stored outputs, so the hall travels on its query string (hallScreens.ts).
  const hallWalls: HallWall[] = lane.wallOutputs
    .filter((o) => o.enabled && hasPhysicalSize(o.widthM, o.heightM))
    .map((o) => ({ id: o.id, label: o.label, view: o.view, showSource: o.showSource, widthM: o.widthM!, heightM: o.heightM! }))
  const openWallMockup = () => { window.open(hallMockupUrl(hallWalls, lane.wallCharCm), 'proyaku-wall-mockup') }
```

### 3. hai ô mét cho từng màn

TÌM:

```
                            <label className="flex items-center gap-1 text-xs text-on-surface-variant cursor-pointer"><input type="checkbox" checked={o.showSource} onChange={(e) => updateWallOutput(o.id, { showSource: e.target.checked })} className="accent-secondary" />Hiện cả bản gốc</label>
                          </div>
                        )}
```

THAY BẰNG:

```
                            <label className="flex items-center gap-1 text-xs text-on-surface-variant cursor-pointer"><input type="checkbox" checked={o.showSource} onChange={(e) => updateWallOutput(o.id, { showSource: e.target.checked })} className="accent-secondary" />Hiện cả bản gốc</label>
                          </div>
                        )}
                        {o.enabled && (
                          // KÍCH THƯỚC THẬT của tấm màn, tính bằng mét (rộng × cao). Đây là thứ quyết định
                          // chữ cao bao nhiêu centimet trên tường và cửa sổ mở ra đúng hình dạng nào — máy
                          // chiếu nhận 1920 hay 3840 điểm ảnh cũng cho ra chữ cao bằng nhau.
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
                            <span className="font-label-caps text-[10px]">CỠ MÀN THẬT</span>
                            <input
                              type="number" min={WALL_M.min} max={WALL_M.max} step={0.1} value={o.widthM ?? ''}
                              onChange={(e) => updateWallOutput(o.id, { widthM: e.target.value === '' ? undefined : clampWallM(Number(e.target.value)) })}
                              className={`${SELECT_CLS} w-16 text-xs py-1`} aria-label={`Chiều rộng ${o.label} (mét)`}
                            />
                            <span>m rộng ×</span>
                            <input
                              type="number" min={WALL_M.min} max={WALL_M.max} step={0.1} value={o.heightM ?? ''}
                              onChange={(e) => updateWallOutput(o.id, { heightM: e.target.value === '' ? undefined : clampWallM(Number(e.target.value)) })}
                              className={`${SELECT_CLS} w-16 text-xs py-1`} aria-label={`Chiều cao ${o.label} (mét)`}
                            />
                            <span>m cao</span>
                          </div>
                        )}
                        {o.enabled && !hasPhysicalSize(o.widthM, o.heightM) && (
                          <p className="text-[10px] text-on-surface-variant/80">Chưa điền cỡ màn thật — màn này vẫn chạy theo cỡ chữ tính bằng điểm ảnh như trước.</p>
                        )}
```

### 4. thanh trượt centimet + nút xem thử

TÌM:

```
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">CỠ CHỮ PHỤ ĐỀ</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={SUBTITLE_FONT.min} max={SUBTITLE_FONT.max} step={SUBTITLE_FONT.step} value={lane.subtitleFont} onChange={(e) => lane.setSubtitleFont(Number(e.target.value))} className="flex-1 accent-[var(--secondary)]" aria-label="Cỡ chữ phụ đề" />
                    <span className="w-10 shrink-0 text-right tabular-nums text-sm text-on-surface">{lane.subtitleFont}px</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
```

THAY BẰNG:

```
                <div>
                  {/* Cỡ chữ THẬT trên tường. Điểm ảnh không nói lên kích thước: 47px trên màn 6 m nhận
                      1920 điểm ảnh là chữ cao 15 cm, cũng 47px trên chính màn đó nhận 3840 điểm ảnh chỉ
                      còn 7 cm. Nên người điều khiển chỉnh centimet, máy tự quy ra điểm ảnh lúc vẽ. */}
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">CHIỀU CAO CHỮ TRÊN TƯỜNG</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={HALL_CHAR_CM.min} max={HALL_CHAR_CM.max} step={HALL_CHAR_CM.step} value={lane.wallCharCm} onChange={(e) => lane.setWallCharCm(Number(e.target.value))} className="flex-1 accent-[var(--secondary)]" aria-label="Chiều cao chữ trên tường" />
                    <span className="w-12 shrink-0 text-right tabular-nums text-sm text-on-surface">{lane.wallCharCm} cm</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1">Đọc tốt tới khoảng <b className="text-on-surface tabular-nums">{readingDistanceM(lane.wallCharCm)} m</b> — đo từ hàng ghế cuối lên màn. Chữ to hơn thì mỗi dòng chứa được ít chữ hơn.</p>
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">CỠ CHỮ TRÊN MÀN ĐIỀU KHIỂN</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={SUBTITLE_FONT.min} max={SUBTITLE_FONT.max} step={SUBTITLE_FONT.step} value={lane.subtitleFont} onChange={(e) => lane.setSubtitleFont(Number(e.target.value))} className="flex-1 accent-[var(--secondary)]" aria-label="Cỡ chữ phụ đề" />
                    <span className="w-10 shrink-0 text-right tabular-nums text-sm text-on-surface">{lane.subtitleFont}px</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1">Chỉ đổi hai cột phụ đề ngay tại đây (và những màn chưa điền cỡ màn thật).</p>
                </div>
                <button onClick={openWallMockup} disabled={hallWalls.length === 0} title="Xem cả hội trường thu nhỏ đúng tỉ lệ trên một màn" className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-secondary/60 text-secondary px-3 py-2 text-sm hover:bg-secondary/10 transition-colors disabled:opacity-40">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">aspect_ratio</span>Xem thử màn tượng trưng
                </button>
                <div className="flex items-center gap-2">
```

## TASK 92 — `docs/ONLINE-LANE-UI-API.md` (nối vào CUỐI tệp)

Nối nguyên văn khối dưới đây vào **cuối** tệp (sau dòng cuối cùng đang có, không xoá gì):

````markdown
## Màn khán giả đo bằng MÉT, không đo bằng điểm ảnh (`src/lib/hallScreens.ts`)

Cỡ chữ trên tường trước nay tính bằng điểm ảnh: `wallLayout` trả `scale = 2.6`, nhân với cỡ nền 18px ra
~47px. **Điểm ảnh không phải kích thước.** Cùng một tấm màn rộng 6 m: máy chiếu nhận 1920 điểm ảnh thì 47px
là chữ cao ~15 cm, hàng ghế cuối đọc được; cũng tấm màn đó nhận 3840 điểm ảnh thì 47px chỉ còn ~7 cm. Cùng
một dòng mã, cùng một tấm màn, hai kết quả trái ngược — và không có cách nào biết trước, vì bộ xử lý LED
mới là thứ quyết định độ phân giải đầu vào.

Thứ duy nhất không đổi khi đổi bộ xử lý là **chiều cao thật của con chữ**, nên đó là thứ người điều khiển
chỉnh (`wallCharCm`, đơn vị cm), còn điểm ảnh do máy quy ra **lúc vẽ**:

```
hallFontPx(viewportPx, widthM, charCm) = (charCm/100) × (viewportPx / widthM) ÷ WALL_GLYPH_RATIO
```

`viewportPx` là bề ngang THẬT của cửa sổ lúc đó, không phải một độ phân giải lưu sẵn — nên phóng to trình
duyệt 150 %, đổi máy chiếu, hay kéo cửa sổ sang màn khác đều tự bù. `WALL_GLYPH_RATIO = 0.72` là tỉ lệ giữa
chữ hoa Latin và hộp em của cỡ chữ CSS; lấy theo Latin (thấp hơn kanji ~0.88) để lệch về phía chữ to hơn,
không bao giờ về phía tường đo hụt. `readingDistanceM(cm) = cm × 2` là quy tắc 1:200 của phụ đề sân khấu.

**Ba con số của hội trường 20 năm** nằm ở đúng MỘT chỗ — `DEFAULT_HALL_WALLS`: màn giữa 6 × 3 m, hai màn
hông 3,5 × 2,5 m (rộng × cao). `DEFAULT_WALL_OUTPUTS` dựng từ danh sách đó và `/wall-mockup` mở trơn cũng
rơi về đó, nên bảng điều khiển và màn xem thử không thể mô tả hai hội trường khác nhau. Sửa từng màn ngay
trong bảng "Xuất màn khán giả" nếu hội trường khác.

Điểm dễ nghĩ ngược: **một cỡ cm chung cho cả ba màn KHÔNG cho ra một cỡ px chung.** Cùng 1920 điểm ảnh, tấm
màn 3,5 m có nhiều điểm ảnh trên mỗi mét hơn tấm 6 m, nên 12 cm ăn 91px ở màn hông và 53px ở màn giữa. Đặt
một cỡ px chung cho cả ba màn — nếp cũ — chính là cách làm cho chữ trên ba tấm màn cao thấp khác nhau.

Đường đi của mét:

- `WallOutput.widthM` / `.heightM` — tuỳ chọn. Vắng cả hai → giữ nguyên nếp cũ tính theo điểm ảnh; thiếu
  một cạnh cũng coi như vắng (nửa cỡ màn không suy ra hình dạng, đoán bừa tệ hơn giữ nguyên).
- `wallWindowGeometry` — màn hình được gán vẫn thắng (màn hình ĐÃ LÀ tấm màn, lấy trọn); dải dọc cũng vẫn
  thắng. Chỉ **lát tạm** mới được nắn theo tỉ lệ tấm màn: 6 × 3 m nhận lát 640 × 1080 thì mở 640 × 320 —
  không nắn thì người điều khiển tập dượt trên cửa sổ DỌC rồi kết luận cho một tấm màn NGANG.
- `openWallWindows(outputs, screens, fontSize, charCm)` — gắn thêm `&wm=&hm=&cm=` vào `/wall` khi biết mét.
  `font` vẫn được gửi để ai xoá mét giữa buổi là quay về nếp cũ ngay, không cần tải lại trang.
- `/wall` — có `wm` thì `+`/`−` đổi **centimet** chứ không đổi điểm ảnh, và thanh dưới đọc thẳng
  "6×3 m · chữ 12 cm · đọc tốt tới ~24 m".

### `/wall-mockup` — màn tượng trưng

Cả hội trường thu nhỏ đúng tỉ lệ trên MỘT màn: `mockupLayout` xếp các màn cạnh nhau theo **một tỉ lệ chung**
(trái · giữa · phải, treo theo một đường tâm, cách nhau `HALL_GAP_M = 1.5` m), kèm một vạch 1,7 m làm người
đứng cạnh. Chữ trong mỗi khung nhỏ vẫn do `hallFontPx` tính từ bề ngang của **chính khung đó** — nên nó là
mô hình thu nhỏ thật: chữ chiếm bao nhiêu phần tấm màn ở đây thì ngoài hội trường đúng bấy nhiêu. Có nút
"Chữ mẫu" để canh cỡ khi chưa ai nói.

Đây là màn **xem thử để canh cỡ chữ, không phải tín hiệu đưa vào máy chiếu** — ba khung nhỏ đẩy qua một
đường HDMI sẽ cho ra ba khung nhỏ trên mọi tấm màn. Đầu ra thật vẫn là một cửa sổ `/wall` cho mỗi màn.

`/wall-mockup` không phải trang của làn (CLAUDE.md luật 2) nên không đọc được kho của bảng điều khiển: hội
trường đi theo địa chỉ, giống hệt cách `/wall` nhận chiều và cỡ chữ. `hallMockupUrl()` dựng địa chỉ đó;
`decodeHallWalls()` **bỏ hẳn** mục hỏng thay vì dựng một tấm màn nửa vời. Mở trơn `/wall-mockup` thì rơi về
`DEFAULT_HALL_WALLS`, nên đường dẫn gõ tay vẫn dùng được.
````

---

## Chạy trước khi báo xong

```
npx tsc -b --noEmit     # phải sạch
npx vitest run          # phải xanh
npm run build           # phải xong
npx oxlint src tests    # không có lỗi mới
```

**Số test phải ra: `919 xanh + 1 bỏ qua (920) / 68 tệp`.**

Tôi đã áp thử nguyên bộ prompt này lên một cây `dbbf8d6` sạch và chạy thật, ra đúng con số đó. Mốc của
anh là 887 + 1 bỏ qua / 67 tệp, cộng **32 ca mới** (27 ca của tệp `tests/hallScreens.test.ts` mới, 5 ca
nối vào `tests/wallCompactLayout.test.ts`) và **không sửa ca cũ nào**.

Cũng đã chạy thử trên cây đó: `tsc` sạch · `npm run build` xong · `oxlint` không lỗi, và **hai cảnh báo**
`exhaustive-deps` ở `ProgramTimeline.tsx` anh báo lần trước **biến mất** nhờ TASK dọn dẹp ở trên.

Nếu ra số khác, xin báo đúng số thật, đừng chỉnh cho khớp.

**`package.json` / `package-lock.json`: không đổi một dòng nào.** Bộ này không thêm thư viện.

---

## Kiểm bằng tay (không cần micro, không cần khoá — làm được ngay)

1. **Bảng cỡ màn hiện ra.** Màn điều khiển ONLINE → bảng **Xuất màn khán giả**. Mỗi màn phải có thêm một
   dòng **CỠ MÀN THẬT** với hai ô số, đã điền sẵn: Màn giữa 6 và 3; Màn trái và Màn phải 3,5 và 2,5.
2. **Thanh centimet.** Bên dưới phải có **CHIỀU CAO CHỮ TRÊN TƯỜNG**, kéo được, và câu "Đọc tốt tới khoảng
   … m" phải đổi theo. Kéo lên 15 cm → phải hiện 30 m.
3. **Màn tượng trưng.** Bấm **Xem thử màn tượng trưng** → mở một cửa sổ mới vẽ ba tấm màn cạnh nhau:
   tấm giữa phải **rộng hơn hẳn** hai tấm bên (6 m so với 3,5 m), và có một vạch nhỏ ghi **1,7 m** làm
   người đứng cạnh để dễ hình dung.
4. **Chữ mẫu.** Trong cửa sổ đó, ô **"Chữ mẫu khi chưa có ai nói"** đang bật thì ba tấm màn phải có sẵn
   vài câu Việt–Nhật để nhìn cỡ chữ. Kéo thanh centimet ở đầu cửa sổ → chữ trong cả ba tấm to nhỏ theo.
5. **Cửa sổ mở đúng hình dạng.** Bấm **Xuất ra màn hình** khi chưa gán màn hình nào → cửa sổ của Màn giữa
   phải mở ra **nằm ngang dẹt** (tỉ lệ 2 trên 1), không còn dựng đứng như trước.
6. **Thước đo trên chính cửa sổ đó.** Rê chuột vào cửa sổ `/wall` vừa mở → thanh nhỏ dưới đáy phải ghi
   `6×3 m · chữ 12 cm · đọc tốt tới ~24 m`. Bấm `+` vài lần → **số cm tăng**, không phải số px.
7. **Xoá mét thì về như cũ.** Xoá trắng hai ô mét của Màn phải → hiện dòng nhắc "Chưa điền cỡ màn thật…",
   và cửa sổ của màn đó quay lại cách chạy cũ. Điền lại 3,5 và 2,5 là xong.

---

## Không được làm

- Không đụng `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, `src/lib/lanes/types.ts`.
- Không thêm thư viện, không sửa `package.json`.
- `src/lib/hallScreens.ts` và `src/components/WallPane.tsx` **phải** nằm ngoài thư mục `src/lib/lanes/online/`:
  hai trang `/wall` và `/wall-mockup` không thuộc làn nào nên không được nhập gì từ trong thư mục đó.
- Trang `/wall-mockup` **không** được đọc thẳng kho của bảng điều khiển; hội trường đi theo địa chỉ, đúng
  như `/wall` xưa nay nhận chiều dịch và cỡ chữ.
