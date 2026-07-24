// src/lib/lanes/online/index.ts — the ONLINE lane FACADE (the single sanctioned entry point).
//
// Pages/integration points import ONLY from this root: the `useOnlineLane` hook (all orchestration
// + lifecycle), the config-key helpers, and public types. Deeper online-lane modules stay private.
// Per CLAUDE.md there are exactly TWO sanctioned integration points outside src/lib/lanes/online/:
// the live-screen ONLINE/OFFLINE switch and the Settings key section. The /online-lab bench also
// uses this facade.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LaneEvents, LaneLine, LaneStatus } from '../types'
import { createOnlineLane, type OnlineDiagnostics, type OnlineLaneController, type TtsGateMode } from './onlineLane'
import { setTtsSinkId, setTtsWarningHandler } from './ttsPlayback'
import type { SaveOutcome } from './sessionExport'

export type { LaneLine, LaneStatus } from '../types'
export type { OnlineDiagnostics, TtsGateMode } from './onlineLane'
export type { SaveOutcome } from './sessionExport'
export type OnlineDirection = 'vi2ja' | 'ja2vi'

export const ONLINE_ACTIVE_STATUSES: LaneStatus[] = ['connecting', 'ready', 'listening', 'reconnecting']
export const ONLINE_STATUS_COLOR: Record<LaneStatus, string> = {
  idle: '#64748b', connecting: '#f59e0b', ready: '#0ea5e9', listening: '#22c55e',
  reconnecting: '#f59e0b', error: '#ef4444', stopped: '#64748b',
}

// App-wide guard: only ONE online capture session may be live at a time (never two mics at once).
let moduleActiveSession = false

// ---- app-management config endpoints (layered on top of the pipeline contract) ----
export interface OnlineConfigStatus {
  keys: Record<string, boolean>
  ready: boolean
}

export async function fetchOnlineConfigStatus(): Promise<OnlineConfigStatus> {
  const res = await fetch('/online-api/config-status', { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`config-status HTTP ${res.status}`)
  return (await res.json()) as OnlineConfigStatus
}

export async function saveOnlineConfigKeys(partial: Record<string, string>): Promise<OnlineConfigStatus> {
  const res = await fetch('/online-api/config-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  })
  if (!res.ok) {
    let msg = `config-keys HTTP ${res.status}`
    try {
      const e = (await res.json()) as { error?: string }
      if (e?.error) msg = e.error
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return (await res.json()) as OnlineConfigStatus
}

// Metadata for the Settings key section. The `name` is an OPAQUE SLUG (server maps it to the real
// env var) so no vendor env name reaches the client bundle. Vietnamese-first labels; no values.
export const ONLINE_KEY_FIELDS: { name: string; label: string; hint: string }[] = [
  { name: 'asr_endpoint', label: 'Máy chủ nhận dạng giọng nói', hint: 'Địa chỉ wss của workspace nhận dạng giọng (ASR)' },
  { name: 'asr_key', label: 'Khóa nhận dạng giọng nói', hint: 'API key dịch vụ ASR' },
  { name: 'refine_key', label: 'Khóa dịch tinh chỉnh', hint: 'API key mô hình refine bản dịch' },
  { name: 'tts_key', label: 'Khóa đọc giọng (TTS)', hint: 'API key dịch vụ tổng hợp giọng nói' },
  { name: 'tts_voice_ja', label: 'Giọng đọc tiếng Nhật', hint: 'Mã giọng (voice ID) cho tiếng Nhật' },
  { name: 'tts_voice_vi', label: 'Giọng đọc tiếng Việt', hint: 'Mã giọng (voice ID) cho tiếng Việt' },
]

export interface UseOnlineLane {
  // runtime state
  status: LaneStatus
  statusDetail: string
  running: boolean
  level: number
  error: string
  lines: LaneLine[]
  diagnostics: OnlineDiagnostics | null
  saveStatus: string
  // devices
  inputDevices: MediaDeviceInfo[]
  outputDevices: MediaDeviceInfo[]
  refreshDevices: () => Promise<void>
  // config (state + setters)
  deviceId: string
  setDeviceId: (v: string) => void
  outputDeviceId: string
  setOutputDeviceId: (v: string) => void
  nearMicGate: boolean
  setNearMicGate: (v: boolean) => void
  speakEnabled: boolean
  setSpeakEnabled: (v: boolean) => void
  gateMode: TtsGateMode
  setGateMode: (v: TtsGateMode) => void
  direction: OnlineDirection
  setDirection: (v: OnlineDirection) => void
  terms: string
  setTerms: (v: string) => void
  brief: string
  setBrief: (v: string) => void
  // controls
  start: () => Promise<void>
  stop: () => Promise<void>
  saveSession: () => Promise<void>
}

export function useOnlineLane(): UseOnlineLane {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([])
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [outputDeviceId, setOutputDeviceIdState] = useState('')
  const [nearMicGate, setNearMicGate] = useState(true)
  const [speakEnabled, setSpeakEnabled] = useState(true)
  const [gateMode, setGateMode] = useState<TtsGateMode>('auto')
  const [direction, setDirection] = useState<OnlineDirection>('vi2ja')
  const [terms, setTerms] = useState('')
  const [brief, setBrief] = useState('')

  const [status, setStatus] = useState<LaneStatus>('idle')
  const [statusDetail, setStatusDetail] = useState('')
  const [level, setLevel] = useState(0)
  const [error, setError] = useState('')
  const [lines, setLines] = useState<LaneLine[]>([])
  const [diagnostics, setDiagnostics] = useState<OnlineDiagnostics | null>(null)
  const [saveStatus, setSaveStatus] = useState('')

  // Refs mirror the live config so start()/lane getters read fresh values without stale closures.
  const deviceIdRef = useRef('')
  deviceIdRef.current = deviceId
  const nearMicGateRef = useRef(true)
  nearMicGateRef.current = nearMicGate
  const speakEnabledRef = useRef(true)
  speakEnabledRef.current = speakEnabled
  const directionRef = useRef<OnlineDirection>('vi2ja')
  directionRef.current = direction
  const termsRef = useRef('')
  termsRef.current = terms
  const briefRef = useRef('')
  briefRef.current = brief
  const gateModeRef = useRef<TtsGateMode>('auto')
  gateModeRef.current = gateMode
  const laneRef = useRef<OnlineLaneController | null>(null)
  // True while this hook is mounted — guards a start() that resolves its pre-start gate AFTER the
  // component unmounted (e.g. the operator switched modes during the config-status round-trip),
  // which would otherwise create + start a fresh lane with no component to ever stop it.
  const mountedRef = useRef(true)

  const running = ONLINE_ACTIVE_STATUSES.includes(status)

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices()
      setInputDevices(list.filter((d) => d.kind === 'audioinput'))
      setOutputDevices(list.filter((d) => d.kind === 'audiooutput'))
    } catch {
      /* enumerateDevices unsupported / blocked — default devices still work */
    }
  }, [])

  useEffect(() => {
    void refreshDevices()
  }, [refreshDevices])

  useEffect(() => {
    const id = setInterval(() => setDiagnostics(laneRef.current?.getDiagnostics() ?? null), 500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setTtsWarningHandler((m) => setError(m))
    return () => setTtsWarningHandler(() => undefined)
  }, [])

  const upsertLine = useCallback((line: LaneLine) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.lid === line.lid)
      if (idx === -1) return [...prev, line]
      const next = prev.slice()
      next[idx] = line
      return next
    })
  }, [])

  // Stable events object → the lane is created exactly once.
  const events: LaneEvents = useMemo(
    () => ({
      onStatus: (s, detail) => {
        setStatus(s)
        setStatusDetail(detail ?? '')
        moduleActiveSession = ONLINE_ACTIVE_STATUSES.includes(s)
        if (s === 'listening') void refreshDevices() // mic permission granted → labels now visible
      },
      onLine: (line) => upsertLine(line),
      onLevel: (v) => setLevel(v),
      onError: (message) => setError(message),
    }),
    [refreshDevices, upsertLine],
  )

  const setOutputDeviceId = useCallback((v: string) => {
    setOutputDeviceIdState(v)
    setTtsSinkId(v || undefined)
  }, [])

  const start = useCallback(async () => {
    if (!mountedRef.current) return // unmounted during a pre-start gate → never open a leaked lane
    if (moduleActiveSession) {
      setError('Một phiên ONLINE đang chạy nơi khác — hãy Dừng phiên đó trước.')
      return
    }
    setError('')
    setLines([])
    if (!laneRef.current) {
      laneRef.current = createOnlineLane(events, {
        getDeviceId: () => deviceIdRef.current || undefined,
        getNearMicGate: () => nearMicGateRef.current,
        getSpeakEnabled: () => speakEnabledRef.current,
      })
    }
    const [sourceLanguage, targetLanguage] = directionRef.current === 'vi2ja' ? (['vi', 'ja'] as const) : (['ja', 'vi'] as const)
    try {
      await laneRef.current.start({
        sourceLanguage,
        targetLanguage,
        terms: termsRef.current.trim() || undefined,
        brief: briefRef.current.trim() || undefined,
        ttsGate: gateModeRef.current,
      })
    } catch {
      /* the failure is already surfaced via onError/onStatus; keep the page alive */
    }
  }, [events])

  const stop = useCallback(async () => {
    await laneRef.current?.stop()
    moduleActiveSession = false
  }, [])

  const saveSession = useCallback(async () => {
    const lane = laneRef.current
    if (!lane) {
      setSaveStatus('Chưa có phiên nào để lưu')
      return
    }
    setSaveStatus('Đang lưu…')
    const r: SaveOutcome = await lane.saveSession()
    const t = new Date()
    const hh = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`
    setSaveStatus(r.downloaded ? `Lưu server thất bại → đã tải ${r.filename} về máy` : `Đã lưu lúc ${hh} · ${r.filename}`)
  }, [])

  // Fully release the lane on unmount: mic tracks stopped (readyState 'ended', browser mic indicator
  // off), ASR WS closed, TTS stopped, timers/watchdogs cleared — so a mode switch can hand the mic over.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      void laneRef.current?.stop()
      moduleActiveSession = false
    }
  }, [])

  return {
    status, statusDetail, running, level, error, lines, diagnostics, saveStatus,
    inputDevices, outputDevices, refreshDevices,
    deviceId, setDeviceId, outputDeviceId, setOutputDeviceId,
    nearMicGate, setNearMicGate, speakEnabled, setSpeakEnabled, gateMode, setGateMode,
    direction, setDirection, terms, setTerms, brief, setBrief,
    start, stop, saveSession,
  }
}

// Shared UI, re-exported so the sanctioned integration points import ONLY from this facade root:
//   OnlinePanel        — the ONLINE console (used by /online-lab + the live-screen ONLINE mode)
//   OnlineKeysSettings — the Settings key section (TASK 3)
export { default as OnlinePanel } from './components/OnlinePanel'
export { default as OnlineKeysSettings } from './components/OnlineKeysSettings'
