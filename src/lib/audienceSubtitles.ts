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
// The length cap is PER TARGET LANGUAGE, because a character is not a unit of meaning. One shared cap of
// 200 let Japanese merge about four utterances into a flowing paragraph while Vietnamese broke after one and
// a half — on the wall that reads as every Vietnamese sentence being shoved into a paragraph of its own
// while the Japanese side flows. Two independent measurements of the same asymmetry: the 60 aligned rows of
// the real gala script put the Vietnamese side at 2.24× the characters of the Japanese one (median 129 vs
// 49), and a Japanese glyph is about one em wide against a Latin half, so ~2× the characters occupy the
// same width of wall.
//
// The number used here is deliberately NOT a third measurement: `SEGMENT_VI_CHAR_FACTOR` (1.85, in the
// lane's transcriptSegmentation.ts) already scales the CUTTING ceiling for exactly this reason, measured on
// live recogniser output. Cutting and paragraphing must not drift apart, so the same factor rules both. It
// is duplicated rather than imported because this file is lane-neutral and may not reach into
// src/lib/lanes/online/ (CLAUDE.md rule 2) — if one moves, move the other.
const VI_CHAR_FACTOR = 1.85
export const MERGE_MAX_CHARS = { ja: 200, vi: Math.round(200 * VI_CHAR_FACTOR) } as const

// ── M10: how the wall window lays itself out at the size it actually IS ──
// The same page serves a hall projector and a phone-shaped strip docked beside the operator's other apps.
// Pure maths, kept next to the other subtitle rules so the wall page stays presentation-only.
export const WALL_SCALE = 2.6      // read from thirty metres — the console slider is laptop-calibrated
const HALL_COLUMN_MIN = 760        // a column at least this wide keeps hall size, unchanged, forever
const COMPACT_BASE = 400           // narrower than that: the column width at which text is 1× console size
const STACK_MAX_WIDTH = 720        // two columns stop being readable well before they stop fitting

export function wallLayout(vw: number, vh: number, view: 'vi2ja' | 'ja2vi' | 'both'): { stacked: boolean; scale: number } {
  const stacked = view === 'both' && (vw < STACK_MAX_WIDTH || vh > vw)
  const columnWidth = view === 'both' && !stacked ? vw / 2 : vw
  const scale = columnWidth >= HALL_COLUMN_MIN
    ? WALL_SCALE
    : Math.max(1, Math.min(WALL_SCALE, columnWidth / COMPACT_BASE))
  return { stacked, scale }
}

/** Below this the wall's keyboard hint is both too wide and useless (no keyboard) — show buttons. */
export const wallNeedsTouchControls = (vw: number): boolean => vw < STACK_MAX_WIDTH

/**
 * Everything the audience should read IN one language, in the order it was said: the translations INTO
 * that language, plus the utterances originally SPOKEN in it.
 *
 * The two-way window normally splits by DIRECTION — one half is "translated into Japanese", the other
 * "translated into Vietnamese" — and each half shows only translations. That leaves a Vietnamese reader
 * seeing nothing when a Vietnamese person speaks: their words exist only as the source of the Japanese
 * half. Splitting by LANGUAGE instead fixes it without adding a third panel: the Vietnamese half becomes
 * the whole conversation in Vietnamese, the Japanese half the whole conversation in Japanese, and every
 * sentence appears exactly once in each.
 *
 * Order is the caller's array order, deliberately not re-sorted: the lines already arrive interleaved
 * from one lane over one channel, and sorting on `at` would let a live line that keeps re-stamping
 * itself jump over a sentence that has just finalised.
 */
export function languageThread(lines: AudienceLine[], lang: 'vi' | 'ja'): AudienceLine[] {
  const want: 'vi2ja' | 'ja2vi' = lang === 'ja' ? 'vi2ja' : 'ja2vi'
  return lines
    // A line already going INTO this language keeps its translation; the others contribute their source,
    // which IS this language — and the direction is rewritten so the renderer treats it as such.
    .map((l) => (l.dir === want ? l : { ...l, targetText: l.sourceText, dir: want }))
    .filter((l) => l.targetText.trim() !== '')
}

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
      const lang = targetLangOf(line.dir)
      const joiner = joinerOf(lang)
      const curLen = cur.reduce((n, l, i) => n + l.targetText.trim().length + (i ? joiner.length : 0), 0)
      const mergedLen = curLen + joiner.length + line.targetText.trim().length
      const canMerge =
        line.at - prev.at <= MERGE_GAP_MS &&
        line.dir === prev.dir &&
        mergedLen < MERGE_MAX_CHARS[lang] &&
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
