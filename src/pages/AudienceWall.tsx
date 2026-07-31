// src/pages/AudienceWall.tsx — /wall : a detachable, full-screen audience subtitle window (TASK 7.2). No
// operator chrome, alongside /stream and /reveal. Reads the console's stream over BroadcastChannel
// (audienceChannel) and renders through the shared SubtitleParagraphs, so it can never drift from the
// console monitor. Query params: ?dir=vi2ja|ja2vi|both · &src=1 (also show source, default off) · &font=<px>.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { subscribeAudience, type AudienceLine } from '../lib/audienceChannel'
// M10: the window may now be a hall projector OR a phone-shaped strip docked beside the operator's other
// apps, so the layout maths lives with the other subtitle rules in audienceSubtitles.ts.
import { clampSubtitleFont, languageThread, wallLayout, wallNeedsTouchControls } from '../lib/audienceSubtitles'
import SubtitleParagraphs from '../components/SubtitleParagraphs'

type View = 'vi2ja' | 'ja2vi' | 'both'

// Optional source view: the same lines with the source text where the renderer reads the translation, and
// the direction flipped so the language label is the SOURCE language.
const asSourceLines = (lines: AudienceLine[]): AudienceLine[] =>
  lines.map((l) => ({ ...l, targetText: l.sourceText, dir: l.dir === 'vi2ja' ? 'ja2vi' : 'vi2ja' }))

const AudienceWall: React.FC = () => {
  const params = new URLSearchParams(window.location.search)
  const viewParam = params.get('dir')
  const view: View = viewParam === 'vi2ja' || viewParam === 'ja2vi' ? viewParam : 'both'

  const [showSource, setShowSource] = useState(params.get('src') === '1')
  const [font, setFont] = useState(() => clampSubtitleFont(Number(params.get('font')) || 18))
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.() }
      else if (e.key === 's' || e.key === 'S') setShowSource((v) => !v)
      else if (e.key === '+' || e.key === '=') setFont((f) => clampSubtitleFont(f + 1))
      else if (e.key === '-' || e.key === '_') setFont((f) => clampSubtitleFont(f - 1))
      else if (e.key === '0') setFont(18)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

  const jaLines = useMemo(() => lines.filter((l) => l.dir === 'vi2ja'), [lines]) // translations INTO Japanese
  const viLines = useMemo(() => lines.filter((l) => l.dir === 'ja2vi'), [lines]) // translations INTO Vietnamese
  // With "Gốc" on, each half of the two-way window becomes one LANGUAGE rather than one direction, so a
  // Vietnamese reader sees Vietnamese speech in the Vietnamese half instead of only as small source text
  // over somebody else's translation. Two panels either way — nothing new has to fit on a narrow strip.
  const jaThread = useMemo(() => languageThread(lines, 'ja'), [lines])
  const viThread = useMemo(() => languageThread(lines, 'vi'), [lines])
  const single = view === 'vi2ja' ? jaLines : viLines
  const { stacked, scale } = wallLayout(viewport.w, viewport.h, view)
  const compact = wallNeedsTouchControls(viewport.w)

  const columnLabel = (text: string, jp: boolean) => (
    <span className={`absolute top-2 right-3 z-10 font-label-caps text-label-caps tracking-widest text-secondary/70 ${jp ? 'jp-text' : ''}`}>{text}</span>
  )
  const barButton = 'inline-flex items-center justify-center rounded-full border border-outline-variant w-9 h-9 text-on-surface-variant active:text-primary active:border-primary'

  return (
    <div className="fixed inset-0 bg-background text-on-background overflow-hidden">
      {view === 'both' ? (
        // Stacked: 日本語 on top, Tiếng Việt below — the reading order the hall screens already use
        // left-to-right, so an operator who learned one layout has not learned a second one.
        <div className={`h-full flex ${stacked ? 'flex-col' : ''}`}>
          <div className={`relative flex-1 min-h-0 min-w-0 ${stacked ? 'border-b' : 'border-r'} border-outline-variant`}>
            {columnLabel(showSource ? '日本語 ＋ 原文' : '日本語', true)}
            <SubtitleParagraphs lines={showSource ? jaThread : jaLines} direction="vi2ja" fontSize={font} scale={scale} />
          </div>
          <div className="relative flex-1 min-h-0 min-w-0">
            {columnLabel(showSource ? 'Tiếng Việt + lời gốc' : 'Tiếng Việt', false)}
            <SubtitleParagraphs lines={showSource ? viThread : viLines} direction="ja2vi" fontSize={font} scale={scale} />
          </div>
        </div>
      ) : showSource ? (
        <div className="h-full flex flex-col">
          <div className="h-[32%] min-h-0 border-b border-outline-variant opacity-60">
            <SubtitleParagraphs lines={asSourceLines(single)} fontSize={font} scale={scale * 0.7} />
          </div>
          <div className="flex-1 min-h-0">
            <SubtitleParagraphs lines={single} direction={view} fontSize={font} scale={scale} />
          </div>
        </div>
      ) : (
        <SubtitleParagraphs lines={single} direction={view} fontSize={font} scale={scale} />
      )}

      <div className={`fixed bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-surface-container/90 border border-outline-variant px-3 py-2 text-xs text-on-surface-variant transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {compact ? (
          <>
            <button type="button" onClick={() => setFont((f) => clampSubtitleFont(f - 1))} className={barButton} aria-label="Chữ nhỏ hơn">−</button>
            <button type="button" onClick={() => setFont((f) => clampSubtitleFont(f + 1))} className={barButton} aria-label="Chữ to hơn">+</button>
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
      </div>
    </div>
  )
}

export default AudienceWall
