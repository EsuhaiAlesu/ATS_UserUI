// src/lib/audienceChannel.ts — lane-neutral bridge between the operator console and the detached
// audience-wall windows. Audience windows are separate browser windows (so they can be dragged onto
// another monitor) and share no memory with the console; BroadcastChannel is the shortest path between
// two windows of the same origin: no network, no added latency, works with the venue's internet down.
// Lives OUTSIDE src/lib/lanes/online/ (CLAUDE.md rule 2) because src/pages/AudienceWall.tsx — not a lane
// page — imports it. TASK 7.1.

export type AudienceLine = {
  lid: string
  sourceText: string
  targetText: string
  interim: boolean
  corrected: boolean
  at: number
  dir: 'vi2ja' | 'ja2vi'
}

const CHANNEL = 'proyaku-audience'
const BACKLOG = 80

type Msg =
  | { type: 'line'; session: number; line: AudienceLine }
  | { type: 'snapshot'; session: number; lines: AudienceLine[] }
  | { type: 'reset'; session: number }
  | { type: 'hello' }

function makeChannel(): BroadcastChannel | null {
  try { return typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null }
  catch { return null } // very old browser → every function becomes a safe no-op; the console still runs
}

export interface AudiencePublisher {
  publish(line: AudienceLine): void
  reset(): void
  close(): void
}

/**
 * Created when the console mounts (not when the session starts), so windows opened before the opening
 * ceremony are already connected. Keeps a backlog of the last 80 lines and answers a new window's
 * `hello` with a `snapshot` so it never sits blank.
 */
export function createAudiencePublisher(): AudiencePublisher {
  const ch = makeChannel()
  let session = 1
  let backlog: AudienceLine[] = []
  const upsert = (line: AudienceLine) => {
    const idx = backlog.findIndex((l) => l.lid === line.lid)
    if (idx === -1) backlog.push(line)
    else backlog[idx] = line
    if (backlog.length > BACKLOG) backlog = backlog.slice(-BACKLOG)
  }
  if (ch) {
    ch.onmessage = (ev: MessageEvent<Msg>) => {
      if (ev.data?.type === 'hello') ch.postMessage({ type: 'snapshot', session, lines: backlog } satisfies Msg)
    }
  }
  return {
    publish(line) { upsert(line); ch?.postMessage({ type: 'line', session, line } satisfies Msg) },
    reset() { session += 1; backlog = []; ch?.postMessage({ type: 'reset', session } satisfies Msg) },
    close() { try { ch?.close() } catch { /* already closed */ } },
  }
}

/**
 * Subscribe an audience window to the console's stream. Posts `hello` on mount to pull a backfill, and
 * accepts a snapshot only while it still has nothing (a late snapshot cannot overwrite live lines).
 * Returns an unsubscribe that closes the channel.
 */
export function subscribeAudience(onLines: (lines: AudienceLine[]) => void): () => void {
  const ch = makeChannel()
  let session = 0
  let lines: AudienceLine[] = []
  const emit = () => onLines(lines.slice())
  const upsert = (line: AudienceLine) => {
    const idx = lines.findIndex((l) => l.lid === line.lid)
    if (idx === -1) lines.push(line)
    else lines[idx] = line
    if (lines.length > BACKLOG) lines = lines.slice(-BACKLOG)
  }
  if (ch) {
    ch.onmessage = (ev: MessageEvent<Msg>) => {
      const m = ev.data
      if (!m) return
      if (m.type === 'line') { session = Math.max(session, m.session); upsert(m.line); emit() }
      else if (m.type === 'snapshot') { if (lines.length === 0) { session = m.session; lines = m.lines.slice(-BACKLOG); emit() } }
      else if (m.type === 'reset') { session = m.session; lines = []; emit() }
    }
    ch.postMessage({ type: 'hello' } satisfies Msg)
  }
  return () => { try { ch?.close() } catch { /* already closed */ } }
}
