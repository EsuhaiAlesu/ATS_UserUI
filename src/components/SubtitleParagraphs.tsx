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
  className?: string
}

const SubtitleParagraphs: React.FC<Props> = ({ lines, direction, fontSize, scale = 1, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const [showJump, setShowJump] = useState(false)
  // Remember each paragraph's previously-rendered stable text so only the newly-appended chars animate
  // and the text already being read stays perfectly still.
  const prevStableRef = useRef<Map<string, string>>(new Map())

  const paragraphs = buildParagraphs(lines)
  const empty = subtitleEmptyState(lines)
  const px = Math.round(clampSubtitleFont(fontSize) * scale)
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
      <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto px-[4vw] py-[3vh]">
        <div className="flex flex-col justify-start gap-[2vh]">
          {paragraphs.map((p) => {
            const lang = forcedLang ?? p.lang
            const tail = tails.get(p.key) ?? ''
            const head = tail && p.stable.endsWith(tail) ? p.stable.slice(0, p.stable.length - tail.length) : p.stable
            const sep = p.volatile && (head || tail) ? (lang === 'ja' ? '' : ' ') : ''
            return (
              <p key={p.key} lang={lang}
                className={`${lang === 'ja' ? 'jp-text' : ''} sub-para border-l-4 pl-[2vw] ${p.live ? 'sub-para--live border-secondary text-secondary' : 'border-outline-variant text-on-surface/85'}`}
                style={{ fontSize: `${px}px`, lineHeight: 1.32, lineBreak: lang === 'ja' ? 'strict' : undefined }}>
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
