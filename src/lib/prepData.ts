// src/lib/prepData.ts — lane-neutral bridge: Chuẩn bị → the ONLINE console's NỘI DUNG boxes.
//
// Reads the four Chuẩn bị stores (glossary via /api · the speaker roster · the approved script · the
// conference schedule) and produces a ready-to-paste keyterm corpus + a context brief. READ-ONLY — it
// never writes back to any store. It lives OUTSIDE src/lib/lanes/online/ (CLAUDE.md rule 2) because it
// reads offline-side stores AND is imported by a non-lane consumer; it is a neutral bridge, not a lane
// file, and imports only shared prep utilities (never the online lane). It must NEVER throw: every
// source is read inside a guard, and a missing source contributes nothing.

import { getGlossary } from './api'
import type { GlossaryEntry } from './api'
import { getSpeakers, findSpeakerByName } from './speakers'
import { getScriptLocal, readiness } from './script'
import type { Conference } from './schedule'

export type PrepDir = 'vi2ja' | 'ja2vi'

export interface PrepPack {
  terms: string   // ready to paste into the console box, already trimmed to the core's limits
  brief: string
  stats: { termLines: number; glossary: number; speakers: number; scriptApproved: number; dropped: number }
  glossaryReachable: boolean   // false = /api absent (an ONLINE-only deploy) — not an error
}

// The core accepts at most 40 term lines and the box caps at 2000 characters; the brief caps at 1500.
export const PREP_MAX_TERM_LINES = 40
export const PREP_MAX_TERM_CHARS = 2000
const BRIEF_MAX_CHARS = 1500

const lc = (s: string) => s.toLocaleLowerCase('vi')
const clean = (s: unknown) => (typeof s === 'string' ? s.trim() : '')

interface Ranked { rank: 0 | 1 | 2; key: string; line: string }

// A term line: `nguồn = đích`, or bare `nguồn` when there is no distinct target (a proper noun the
// recogniser must protect — push mishearings back onto the canonical form).
function termLine(src: string, tgt: string, bare: boolean): string {
  return bare || !tgt || lc(tgt) === lc(src) ? src : `${src} = ${tgt}`
}

function safeFindSpeaker(name: string) {
  try { return findSpeakerByName(name) } catch { return undefined }
}

/**
 * Collect a paste-ready pack for the given session direction. The SOURCE side of the session decides
 * the left-hand side of each term line (vi2ja → `tiếng Việt = 日本語`; ja2vi → the reverse), so the
 * recogniser is biased toward words the speaker is actually about to say. Re-collect when the direction
 * changes. Never throws.
 */
export async function collectPrepPack(conf: Conference | undefined, dir: PrepDir): Promise<PrepPack> {
  // ── glossary (behind /api — absent on an ONLINE-only deploy → not an error) ──
  let glossary: GlossaryEntry[] = []
  let glossaryReachable = true
  try {
    glossary = await getGlossary()
  } catch {
    glossaryReachable = false
  }

  // ── roster + approved-script count (localStorage-backed, always reachable) ──
  let speakers: ReturnType<typeof getSpeakers> = []
  try { speakers = getSpeakers() } catch { speakers = [] }
  let scriptApproved = 0
  try { scriptApproved = readiness(getScriptLocal(conf?.id ?? '')).approved } catch { scriptApproved = 0 }

  // ── ranked term candidates: rank 0 = speaker names + glossary asr_hotword; 1 = aliases +
  //    name/company entries; 2 = everything else ──
  const items: Ranked[] = []

  for (const e of glossary) {
    const src = clean(dir === 'vi2ja' ? e.vi : e.ja)
    const tgt = clean(dir === 'vi2ja' ? e.ja : e.vi)
    if (!src) continue
    const isName = e.type === 'name' || e.type === 'company'
    if (e.asr_hotword) items.push({ rank: 0, key: lc(src), line: termLine(src, tgt, true) })
    else if (isName) items.push({ rank: 1, key: lc(src), line: termLine(src, tgt, e.type === 'name') })
    else items.push({ rank: 2, key: lc(src), line: termLine(src, tgt, false) })
  }

  for (const s of speakers) {
    const name = clean(s.name)
    if (!name) continue
    items.push({ rank: 0, key: lc(name), line: name })
    for (const a of s.aliases ?? []) {
      const alias = clean(a)
      if (alias && lc(alias) !== lc(name)) items.push({ rank: 1, key: lc(alias), line: `${alias} = ${name}` })
    }
  }

  // ── de-duplicate case-insensitively, keeping the lowest (most important) rank ──
  const byKey = new Map<string, Ranked>()
  for (const it of items) {
    const prev = byKey.get(it.key)
    if (!prev || it.rank < prev.rank) byKey.set(it.key, it)
  }

  // ── priority ordering (stable within a rank), then truncate to 40 lines / 2000 chars ──
  const ranked = [...byKey.values()].sort((a, b) => a.rank - b.rank)
  const kept: string[] = []
  let chars = 0
  let dropped = 0
  for (const it of ranked) {
    const cost = it.line.length + (kept.length ? 1 : 0) // +1 for the joining newline
    if (kept.length < PREP_MAX_TERM_LINES && chars + cost <= PREP_MAX_TERM_CHARS) {
      kept.push(it.line)
      chars += cost
    } else {
      dropped++
    }
  }
  const terms = kept.join('\n')

  // ── brief from the active conference ──
  const briefParts: string[] = []
  if (conf) {
    const head = [clean(conf.title), clean(conf.date), clean(conf.venue)].filter(Boolean).join(' · ')
    if (head) briefParts.push(`Hội nghị: ${head}`)
    const agenda = clean(conf.agenda)
    if (agenda) briefParts.push(`Nội dung: ${agenda}`)
    const sp = (conf.speakers ?? []).filter((s) => clean(s.name))
    if (sp.length) {
      briefParts.push('Người phát biểu:')
      for (const s of sp) {
        const name = clean(s.name)
        const prof = safeFindSpeaker(name)
        const roleOrg = [clean(s.role) || clean(prof?.role), clean(prof?.org)].filter(Boolean).join(' · ')
        briefParts.push(`- ${name}${roleOrg ? ` (${roleOrg})` : ''}`)
      }
    }
  }
  let brief = briefParts.join('\n')
  if (brief.length > BRIEF_MAX_CHARS) brief = brief.slice(0, BRIEF_MAX_CHARS)

  return {
    terms,
    brief,
    stats: { termLines: kept.length, glossary: glossary.length, speakers: speakers.length, scriptApproved, dropped },
    glossaryReachable,
  }
}
