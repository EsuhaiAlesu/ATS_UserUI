// src/pages/AudienceWall.tsx — /wall : a detachable, full-screen audience subtitle window (TASK 7.2). No
// operator chrome, alongside /stream and /reveal. Reads the console's stream over BroadcastChannel
// (audienceChannel) and renders through the shared SubtitleParagraphs, so it can never drift from the
// console monitor. Query params: ?dir=vi2ja|ja2vi|both · &src=1 (also show source, default off) · &font=<px>.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { subscribeAudience, type AudienceLine } from '../lib/audienceChannel'
import { clampSubtitleFont } from '../lib/audienceSubtitles'
import SubtitleParagraphs from '../components/SubtitleParagraphs'

const WALL_SCALE = 2.6 // the console slider is calibrated for a laptop; the wall is read from thirty metres
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

  useEffect(() => subscribeAudience(setLines), [])

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

  // The control bar fades out after a few seconds of no mouse movement, because it is projected.
  useEffect(() => {
    const onMove = () => {
      setControlsVisible(true)
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
      hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3000)
    }
    onMove()
    window.addEventListener('mousemove', onMove)
    return () => { window.removeEventListener('mousemove', onMove); if (hideTimer.current) window.clearTimeout(hideTimer.current) }
  }, [])

  const jaLines = useMemo(() => lines.filter((l) => l.dir === 'vi2ja'), [lines]) // translations INTO Japanese
  const viLines = useMemo(() => lines.filter((l) => l.dir === 'ja2vi'), [lines]) // translations INTO Vietnamese
  const single = view === 'vi2ja' ? jaLines : viLines

  const columnLabel = (text: string, jp: boolean) => (
    <span className={`absolute top-2 right-3 z-10 font-label-caps text-label-caps tracking-widest text-secondary/70 ${jp ? 'jp-text' : ''}`}>{text}</span>
  )

  return (
    <div className="fixed inset-0 bg-background text-on-background overflow-hidden">
      {view === 'both' ? (
        <div className="h-full flex">
          <div className="relative flex-1 min-w-0 border-r border-outline-variant">
            {columnLabel('日本語', true)}
            <SubtitleParagraphs lines={jaLines} direction="vi2ja" fontSize={font} scale={WALL_SCALE} />
          </div>
          <div className="relative flex-1 min-w-0">
            {columnLabel('Tiếng Việt', false)}
            <SubtitleParagraphs lines={viLines} direction="ja2vi" fontSize={font} scale={WALL_SCALE} />
          </div>
        </div>
      ) : showSource ? (
        <div className="h-full flex flex-col">
          <div className="h-[32%] min-h-0 border-b border-outline-variant opacity-60">
            <SubtitleParagraphs lines={asSourceLines(single)} fontSize={font} scale={WALL_SCALE * 0.7} />
          </div>
          <div className="flex-1 min-h-0">
            <SubtitleParagraphs lines={single} direction={view} fontSize={font} scale={WALL_SCALE} />
          </div>
        </div>
      ) : (
        <SubtitleParagraphs lines={single} direction={view} fontSize={font} scale={WALL_SCALE} />
      )}

      <div className={`fixed bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-surface-container/90 border border-outline-variant px-4 py-2 text-xs text-on-surface-variant transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <span className="font-label-caps tracking-wide">F toàn màn · S bản gốc · +/− cỡ chữ · 0 mặc định</span>
      </div>
    </div>
  )
}

export default AudienceWall
