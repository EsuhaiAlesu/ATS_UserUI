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
