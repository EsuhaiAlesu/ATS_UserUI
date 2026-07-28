// src/lib/audienceSubtitles.ts — the subtitle mechanism, split out as PURE computation so the console
// monitor and the wall windows can never drift apart (TASK 8). The look lives in SubtitleParagraphs.tsx
// and the design system; this file only decides WHAT the paragraphs are. Lane-neutral (the wall page
// imports it), so it may not live under src/lib/lanes/online/.

import type { AudienceLine } from './audienceChannel'

export const SUBTITLE_FONT = { min: 12, max: 28, default: 18, step: 1 } as const
export const clampSubtitleFont = (n: number): number =>
  Math.max(SUBTITLE_FONT.min, Math.min(SUBTITLE_FONT.max, Math.round(Number.isFinite(n) ? n : SUBTITLE_FONT.default)))

// Rule 4 thresholds.
const MERGE_GAP_MS = 7_000
const MERGE_MAX_CHARS = 200

export interface SubtitleParagraph {
  key: string
  dir: 'vi2ja' | 'ja2vi'
  lang: 'vi' | 'ja'   // the TARGET language → drives jp-text / lineBreak in the renderer
  stable: string      // finalised text (rule 2)
  volatile: string    // text still being spoken (rule 2) — appended after `stable`, italic/faded
  live: boolean       // the last paragraph is the live one (rule 7)
}

// The audience reads the TRANSLATION only (rule 3); the target language is decided by the direction.
const targetLangOf = (dir: 'vi2ja' | 'ja2vi'): 'vi' | 'ja' => (dir === 'vi2ja' ? 'ja' : 'vi')
const joinerOf = (lang: 'vi' | 'ja') => (lang === 'ja' ? '' : ' ') // '' for Japanese, ' ' for Vietnamese (rule 6)

/**
 * Merge consecutive utterances into paragraphs (rule 4): join when the gap is ≤ 7 s, the direction is the
 * same, the merged translation is under 200 chars, and the current paragraph has no unfinished tail;
 * otherwise start a new paragraph. Lines whose translation is empty are dropped entirely (rule 1);
 * length is counted on the translation only (rule 5).
 */
export function buildParagraphs(lines: AudienceLine[]): SubtitleParagraph[] {
  const translated = lines.filter((l) => l.targetText.trim() !== '')
  const groups: AudienceLine[][] = []
  for (const line of translated) {
    const cur = groups[groups.length - 1]
    if (cur) {
      const prev = cur[cur.length - 1]
      const joiner = joinerOf(targetLangOf(line.dir))
      const curLen = cur.reduce((n, l, i) => n + l.targetText.trim().length + (i ? joiner.length : 0), 0)
      const mergedLen = curLen + joiner.length + line.targetText.trim().length
      const canMerge =
        line.at - prev.at <= MERGE_GAP_MS &&
        line.dir === prev.dir &&
        mergedLen < MERGE_MAX_CHARS &&
        !prev.interim // no unfinished tail
      if (canMerge) { cur.push(line); continue }
    }
    groups.push([line])
  }
  return groups.map((group, gi) => {
    const dir = group[0].dir
    const lang = targetLangOf(dir)
    const joiner = joinerOf(lang)
    const last = group[group.length - 1]
    const stableLines = last.interim ? group.slice(0, -1) : group
    return {
      key: group[0].lid,
      dir,
      lang,
      stable: stableLines.map((l) => l.targetText.trim()).join(joiner),
      volatile: last.interim ? last.targetText.trim() : '',
      live: gi === groups.length - 1,
    }
  })
}

/**
 * The newly appended characters between two renders, so the animation runs only on those and the text
 * already being read stays still. If the text was REWRITTEN rather than extended, treat it all as new
 * (rule 8).
 */
export function appendedTail(previous: string, next: string): string {
  return next.startsWith(previous) ? next.slice(previous.length) : next
}

/**
 * `listening` when nothing has arrived at all; `translating` when utterances exist but none is translated
 * yet; `null` once there is something to show — so the operator can tell "nobody spoke" from "someone
 * spoke and the translation has not landed".
 */
export function subtitleEmptyState(lines: AudienceLine[]): 'listening' | 'translating' | null {
  if (lines.length === 0) return 'listening'
  return lines.some((l) => l.targetText.trim() !== '') ? null : 'translating'
}
