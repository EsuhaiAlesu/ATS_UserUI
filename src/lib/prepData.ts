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
import { effectiveDocs, kbScopeId } from './kbscope'
import { getPrepSummary } from './prepSummary'

export type PrepDir = 'vi2ja' | 'ja2vi'

export interface PrepPack {
  terms: string   // ready to paste into the console box, already trimmed to the core's limits
  brief: string
  stats: {
    termLines: number; glossary: number; speakers: number; scriptApproved: number; dropped: number
    documents: number
    /** M14 — an AI summary of the documents was found for this scope+direction and used for the brief. */
    aiBrief: boolean
    /** …and how many of its suggested term lines survived the 40-line budget. */
    aiTerms: number
  }
  glossaryReachable: boolean   // false = /api absent (an ONLINE-only deploy) — not an error
}

// The core accepts at most 40 term lines and the box caps at 2000 characters; the brief caps at 1500.
export const PREP_MAX_TERM_LINES = 40
export const PREP_MAX_TERM_CHARS = 2000
const BRIEF_MAX_CHARS = 1500

const lc = (s: string) => s.toLocaleLowerCase('vi')
const clean = (s: unknown) => (typeof s === 'string' ? s.trim() : '')

// Below this a document extract is a torn phrase rather than context — worse than nothing, because the
// model would try to make sense of the fragment. Skip the document instead.
const DOC_EXTRACT_MIN = 120

// The brief is line-oriented — one fact per line. A document's own newlines would forge extra lines and
// break that, so an extract is collapsed onto a single line before it is measured or added.
const flat = (s: unknown) => clean(s).replace(/\s+/g, ' ')

interface Ranked { rank: 0 | 1 | 2; key: string; line: string; ai?: true }

// A term line: `nguồn = đích`, or bare `nguồn` when there is no distinct target (a proper noun the
// recogniser must protect — push mishearings back onto the canonical form).
function termLine(src: string, tgt: string, bare: boolean): string {
  return bare || !tgt || lc(tgt) === lc(src) ? src : `${src} = ${tgt}`
}

function safeFindSpeaker(name: string) {
  try { return findSpeakerByName(name) } catch { return undefined }
}

// Through kbScopeId, NEVER getDocs(conf.id) directly: a session belonging to a series keeps its documents
// in the series' shared store, and reading the bare event id would find an empty shelf for exactly the
// events that have the most material.
function safeDocs(conf: Conference | undefined) {
  if (!conf) return []
  try { return effectiveDocs(conf) } catch { return [] }
}

function safeSummary(conf: Conference | undefined, dir: PrepDir) {
  if (!conf) return undefined
  try { return getPrepSummary(kbScopeId(conf), dir) } catch { return undefined }
}

/**
 * The documents of the active session, name + text, for whoever wants to SEND them somewhere (M14: the
 * online console's "Tóm tắt bằng AI" button). Same scope resolution as the brief below — never
 * `getDocs(conf.id)`. Read-only, never throws.
 */
export function collectPrepDocuments(conf: Conference | undefined): { name: string; text: string }[] {
  return safeDocs(conf)
    .map((d) => ({ name: clean(d.name) || '(không tên)', text: clean(d.text) }))
    .filter((d) => d.text.length > 0)
}

/**
 * The short, exact part of the brief: what the session IS and who speaks at it, from the schedule entry
 * and the speaker roster. Short, exact and always worth more per character than prose — which is why it
 * leads the mechanical brief, and why M14 hands it to the summariser as `header` (the model must not have
 * to guess the date and the venue from a script that may never state them).
 */
export function collectPrepHeader(conf: Conference | undefined): string {
  if (!conf) return ''
  const parts: string[] = []
  const head = [clean(conf.title), clean(conf.date), clean(conf.venue)].filter(Boolean).join(' · ')
  if (head) parts.push(`Hội nghị: ${head}`)
  const agenda = clean(conf.agenda)
  if (agenda) parts.push(`Nội dung: ${agenda}`)
  const sp = (conf.speakers ?? []).filter((s) => clean(s.name))
  if (sp.length) {
    parts.push('Người phát biểu:')
    for (const s of sp) {
      const name = clean(s.name)
      const prof = safeFindSpeaker(name)
      const roleOrg = [clean(s.role) || clean(prof?.role), clean(prof?.org)].filter(Boolean).join(' · ')
      parts.push(`- ${name}${roleOrg ? ` (${roleOrg})` : ''}`)
    }
  }
  return parts.join('\n')
}

/**
 * TASK 53 — the brief for ONE segment of the running order: the meeting header plus the documents that
 * segment's speaker actually brought, on the WHOLE budget instead of a share of it.
 *
 * The mechanical brief below spreads `BRIEF_MAX_CHARS` across every document of the event. That works
 * for one or two documents and silently collapses beyond that: `share = floor(left / n) - DOC_EXTRACT_MIN`,
 * so a meeting with a ~400-character header and five documents computes a share of about 100 — below
 * DOC_EXTRACT_MIN, and the whole document loop is skipped. Preparing MORE material makes it certain that
 * NONE of it reaches the model. Scoping to the person now at the microphone is what fixes that.
 *
 * Synchronous and never throws: documents are localStorage, and this is called while a ceremony runs.
 * Returns '' when the segment has no documents — the caller then keeps the session-wide brief.
 */
export function collectSegmentBrief(conf: Conference | undefined, docIds: string[] | undefined, speakerName = ''): string {
  if (!conf || !docIds?.length) return ''
  const wanted = new Set(docIds)
  const docList = safeDocs(conf).filter((d) => wanted.has(d.id))
  if (!docList.length) return ''

  const parts: string[] = []
  const header = collectPrepHeader(conf)
  if (header) parts.push(header)
  const who = clean(speakerName)
  if (who) parts.push(`Người đang phát biểu: ${who}`)

  let left = BRIEF_MAX_CHARS - parts.join('\n').length
  const share = Math.floor(left / docList.length) - DOC_EXTRACT_MIN
  if (share < DOC_EXTRACT_MIN) return parts.join('\n').slice(0, BRIEF_MAX_CHARS)
  for (const d of docList) {
    const body = flat(d.text).slice(0, share)
    if (body.length < DOC_EXTRACT_MIN) continue
    const line = `- ${flat(d.name)}: ${body}`
    if (line.length + 1 > left) break
    parts.push(line)
    left -= line.length + 1
  }
  return parts.join('\n').slice(0, BRIEF_MAX_CHARS)
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

  // ── TASK 19: the ONLINE glossary — the one that works on the deployed build ──
  // Appended, not substituted. When both are reachable the office glossary is the curated one and wins a
  // tie, because the de-duplication below keeps the FIRST entry at a given rank. When `/api` is absent —
  // which is the normal state of the deployed build — this is the only glossary there is, and without it
  // the Thuật ngữ box has to be retyped by hand before every session.
  //
  // A plain fetch, deliberately: this file is a neutral bridge and may not import the online lane. It
  // must never throw, so an unreachable store contributes nothing and is not an error.
  try {
    const res = await fetch('/online-api/glossary', { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const data = (await res.json()) as { entries?: unknown }
      if (Array.isArray(data.entries)) glossary = [...glossary, ...(data.entries as GlossaryEntry[])]
    }
  } catch { /* no online store on this deploy — not an error */ }

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

  // ── M14: the terms the AI read out of the documents — strictly last in the queue ──
  // They come from the event's real script, which is precisely why they are TENTATIVE: no human has
  // checked them. Rank 2, pushed after everything else (a stable sort keeps that order), so they can
  // only ever spend budget the curated glossary and the speaker roster did not want. The de-duplication
  // below keys on the SOURCE side, so an AI line that repeats a glossary entry loses to the curated one.
  const summary = safeSummary(conf, dir)
  for (const raw of summary?.terms ?? []) {
    const line = clean(raw)
    const src = clean(line.split(/\s*=\s*/)[0])
    if (!src) continue
    items.push({ rank: 2, key: lc(src), line, ai: true })
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
  let aiTerms = 0
  for (const it of ranked) {
    const cost = it.line.length + (kept.length ? 1 : 0) // +1 for the joining newline
    if (kept.length < PREP_MAX_TERM_LINES && chars + cost <= PREP_MAX_TERM_CHARS) {
      kept.push(it.line)
      chars += cost
      if (it.ai) aiTerms++
    } else {
      dropped++
    }
  }
  const terms = kept.join('\n')

  // ── brief ──
  // M14: when the operator has generated an AI summary for this session and direction, THAT is the brief.
  // It was written from the whole document set, and the conference header and speaker roster were handed
  // to it as input, so everything the mechanical build below produces is already inside it — in prose the
  // model can use rather than a cover page cut at 1500 characters. Everything below therefore runs only
  // when no summary exists: it is the fallback that keeps the box useful without a network call.
  const docList = safeDocs(conf)
  const aiBrief = clean(summary?.brief).slice(0, BRIEF_MAX_CHARS)
  if (aiBrief) {
    return {
      terms,
      brief: aiBrief,
      stats: {
        termLines: kept.length, glossary: glossary.length, speakers: speakers.length,
        scriptApproved, dropped, documents: docList.length, aiBrief: true, aiTerms,
      },
      glossaryReachable,
    }
  }

  const briefParts: string[] = []
  const header = collectPrepHeader(conf)
  if (header) briefParts.push(header)
  // ── Tài liệu nguồn → whatever brief budget is left over ──
  // The imported documents are the only place the event's REAL wording lives: the songs, the ritual
  // names, the job titles, the province names. Handing the refine model a slice of it is what stops
  // "Kagami Biraki" and "Ikusei Shuro" from being translated as if they were ordinary nouns.
  //
  // Strictly last in line. The conference header and the speaker list are short, exact, and always
  // worth more per character than prose, so they are already in `briefParts` and can never be crowded
  // out by a document. A document only spends what is left, and spends it on the OPENING of each file —
  // an event document leads with its subject, and the tail is stage directions the model cannot use.
  if (docList.length) {
    const names = docList.map((d) => flat(d.name)).filter(Boolean)
    const header = `Tài liệu: ${names.join(' · ')}`
    // +1 for the newline that will join it.
    if (briefParts.join('\n').length + header.length + 1 <= BRIEF_MAX_CHARS) {
      briefParts.push(header)
      let left = BRIEF_MAX_CHARS - briefParts.join('\n').length
      // Split what remains evenly, so one long file cannot swallow the budget of the others.
      const share = Math.floor(left / docList.length) - DOC_EXTRACT_MIN
      if (share >= DOC_EXTRACT_MIN) {
        for (const d of docList) {
          const body = flat(d.text).slice(0, share)
          if (body.length < DOC_EXTRACT_MIN) continue
          const line = `- ${flat(d.name)}: ${body}`
          if (line.length + 1 > left) break
          briefParts.push(line)
          left -= line.length + 1
        }
      }
    }
  }
  let brief = briefParts.join('\n')
  if (brief.length > BRIEF_MAX_CHARS) brief = brief.slice(0, BRIEF_MAX_CHARS)

  return {
    terms,
    brief,
    stats: {
      termLines: kept.length, glossary: glossary.length, speakers: speakers.length,
      scriptApproved, dropped, documents: docList.length, aiBrief: false, aiTerms,
    },
    glossaryReachable,
  }
}
