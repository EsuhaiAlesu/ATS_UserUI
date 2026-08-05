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
