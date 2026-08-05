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
