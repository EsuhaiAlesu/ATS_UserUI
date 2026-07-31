// src/lib/prepSummary.ts — where the AI-written brief lives between the day it is generated and the day
// it is used. Lane-neutral, localStorage-only, never throws.
//
// The summary is written once during Chuẩn bị, days before the event, and read by a console that has been
// reloaded a hundred times since. Holding it in React state would mean regenerating (and paying for) it on
// every reload, and — worse — a technician arriving on the morning of the event would find the box empty.
//
// Keyed by the SAME scope as the documents it was made from (kbScopeId: a session in a series shares its
// series' shelf), and kept per direction, because the term lines of a vi→ja session are the mirror of a
// ja→vi one and re-using them would bias the recogniser toward the language nobody is speaking.

import type { PrepDir } from './prepData'

export interface PrepSummary {
  brief: string
  terms: string[]
  dir: PrepDir
  /** What it was made from — shown to the operator, and how they notice a document arrived afterwards. */
  docNames: string[]
  usedChars: number
  at: string // ISO
}

const sk = (scope: string) => `proyaku_prep_ai:${scope || '_default'}`

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const strList = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : [])

function normalize(x: unknown, dir: PrepDir): PrepSummary | undefined {
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
  const brief = str(o.brief)
  const terms = strList(o.terms)
  if (!brief && !terms.length) return undefined
  return {
    brief,
    terms,
    dir,
    docNames: strList(o.docNames),
    usedChars: typeof o.usedChars === 'number' && isFinite(o.usedChars) ? o.usedChars : 0,
    at: str(o.at) || new Date().toISOString(),
  }
}

/** All directions currently stored for a scope. Shape on disk: `{ vi2ja?: …, ja2vi?: … }`. */
function readAll(scope: string): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(sk(scope))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function getPrepSummary(scope: string, dir: PrepDir): PrepSummary | undefined {
  return normalize(readAll(scope)[dir], dir)
}

export function savePrepSummary(scope: string, summary: PrepSummary): void {
  try {
    const all = readAll(scope)
    all[summary.dir] = summary
    localStorage.setItem(sk(scope), JSON.stringify(all))
  } catch {
    // A full or unavailable localStorage must not lose the operator the brief that is already on screen —
    // it stays in the box either way. Silence is correct here.
  }
}

export function clearPrepSummary(scope: string, dir: PrepDir): void {
  try {
    const all = readAll(scope)
    delete all[dir]
    localStorage.setItem(sk(scope), JSON.stringify(all))
  } catch {
    /* nothing to undo */
  }
}
