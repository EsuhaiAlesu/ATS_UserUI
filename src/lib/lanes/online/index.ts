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
import { setTtsSinkId, setTtsWarningHandler, setTtsVoice, setTtsManualSpeed } from './ttsPlayback'
import type { SaveOutcome } from './sessionExport'
import { createAudiencePublisher, type AudienceLine } from '../../audienceChannel'
import type { ScriptMatcherEntry } from './scriptMatcher'
import { SUBTITLE_FONT, clampSubtitleFont } from '../../audienceSubtitles'
import {
  loadWallOutputs, saveWallOutputs, detectWallScreens, scanWallScreens, openWallWindows, getOpenWallIds, closeWallWindows,
  type WallOutput, type ScreenSupport, type WallScreen,
} from './audienceWindows'

export type { LaneLine, LaneStatus } from '../types'
export type { OnlineDiagnostics, TtsGateMode } from './onlineLane'
export type { SaveOutcome } from './sessionExport'
export type { AudienceLine } from '../../audienceChannel'
export type { ScriptMatcherEntry } from './scriptMatcher'
export type { WallOutput, WallView, WallDock, ScreenSupport, WallScreen } from './audienceWindows'
export { SUBTITLE_FONT } from '../../audienceSubtitles'
// M14 — the pre-session document summariser. A plain async function, not part of the hook: it belongs to
// Chuẩn bị, runs at most once per session, and must never be reachable from anything a live session does.
export { summarizePrepDocs, PREP_DOCS_MAX, PREP_DOC_MAX_CHARS } from './prepBrief'
export type { PrepBriefInput, PrepBriefResult, PrepBriefDoc } from './prepBrief'
export type OnlineDirection = 'vi2ja' | 'ja2vi'
export type SpeedMode = 'auto' | 'manual'
export interface OnlineVoice { slug: string; name: string; language: string; category: string; labels: Record<string, string> }
export const ONLINE_SPEED_RANGE = { min: 0.85, max: 1.2, step: 0.01 } as const

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
  required?: string[] // TASK 11.10 — the subset that matters for the current config (absent on old servers)
  ready: boolean
}

// The slugs the server actually requires, falling back to "all six" when the field is absent so a server
// that predates TASK 11.10 keeps gating as it does today. One helper so the console + Settings never drift.
export function onlineRequiredKeySlugs(status: OnlineConfigStatus | null): string[] {
  if (status && Array.isArray(status.required) && status.required.length) return status.required
  return status ? Object.keys(status.keys) : []
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
// TASK 9.1a: each field is named after the PROVIDER it belongs to (the person filling the form holds an
// account at a named company and is looking at that company's website — what they cannot guess is WHOSE
// key goes in the box). A brand name in a label is NOT an env name / model id / API host / key value, so
// rule 6 permits it here; the hints point at the LOGIN pages (never the API hosts we call).
export const ONLINE_KEY_FIELDS: { name: string; label: string; hint: string }[] = [
  { name: 'asr_endpoint', label: 'Endpoint của Qwen', hint: 'Địa chỉ wss workspace Qwen — chỉ dùng khi quay về cách nhận dạng cũ' },
  { name: 'asr_key', label: 'API Key của Qwen', hint: 'Lấy ở trang Alibaba Cloud Model Studio (DashScope) → API Keys' },
  { name: 'refine_key', label: 'API Key của GPT (OpenAI)', hint: 'Lấy ở platform.openai.com → API keys → Create new secret key' },
  { name: 'tts_key', label: 'API Key của ElevenLabs', hint: 'Lấy ở elevenlabs.io → ảnh đại diện góc phải → API Keys' },
  { name: 'tts_voice_ja', label: 'Voice ID tiếng Nhật (ElevenLabs)', hint: 'Ở elevenlabs.io → Voices → chọn giọng → nút Copy Voice ID' },
  { name: 'tts_voice_vi', label: 'Voice ID tiếng Việt (ElevenLabs)', hint: 'Ở elevenlabs.io → Voices → chọn giọng → nút Copy Voice ID' },
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
  // M13 "Ngưng nghe" — the one control meant to be used WHILE a session runs: held during a performance,
  // a video or a musical number so the recogniser is fed silence instead of music. Always released by
  // start(), because a session that begins deaf looks exactly like a session that is broken.
  listenPaused: boolean
  setListenPaused: (v: boolean) => void
  direction: OnlineDirection
  setDirection: (v: OnlineDirection) => void
  terms: string
  setTerms: (v: string) => void
  brief: string
  setBrief: (v: string) => void
  // Kịch bản (M9). The console hands over the approved rows from Chuẩn bị; the lane reads them once at
  // Bắt đầu, exactly like terms/brief.
  script: ScriptMatcherEntry[]
  setScript: (rows: ScriptMatcherEntry[]) => void
  // voices + speed (TASK 5)
  voices: Record<'ja' | 'vi', OnlineVoice[]>
  voicesStatus: 'idle' | 'loading' | 'ready' | 'error'
  refreshVoices: () => Promise<void>
  voiceJa: string
  setVoiceJa: (slug: string) => void
  voiceVi: string
  setVoiceVi: (slug: string) => void
  speedMode: SpeedMode
  setSpeedMode: (m: SpeedMode) => void
  manualSpeed: number
  setManualSpeed: (s: number) => void
  // two-way + audience wall + subtitles (TASK 6·7·8) + hall-babble switch (TASK 11.13)
  twoWay: boolean
  setTwoWay: (v: boolean) => void
  roomFilter: boolean
  setRoomFilter: (v: boolean) => void
  directedLines: AudienceLine[]
  subtitleFont: number
  setSubtitleFont: (n: number) => void
  wallOutputs: WallOutput[]
  setWallOutputs: (o: WallOutput[]) => void
  wallSupport: ScreenSupport
  wallScreens: WallScreen[]
  wallOpenIds: string[]
  scanWall: () => Promise<void>
  openWall: () => { opened: number; total: number; blocked: number }
  closeWall: () => void
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
  // TASK 9.2: default OFF (full duplex). Esuhai runs "khách mời đeo tai nghe" — the MC/presenters speak
  // into the hall mic + out the hall speakers, while the translated voice goes ONLY to the guests'
  // headphones, so the mic never hears it; gating would only throw away words spoken while the voice
  // plays. 'auto'/'always' stay in the flyout + drawer for a speaker-output setup.
  const [gateMode, setGateMode] = useState<TtsGateMode>('off')
  const [direction, setDirection] = useState<OnlineDirection>('vi2ja')
  const [terms, setTerms] = useState('')
  const [brief, setBrief] = useState('')
  const [listenPaused, setListenPaused] = useState(false)
  const [script, setScript] = useState<ScriptMatcherEntry[]>([])

  // voices + speed (TASK 5) — persisted so the operator's choice survives a reload.
  const [voices, setVoices] = useState<Record<'ja' | 'vi', OnlineVoice[]>>({ ja: [], vi: [] })
  const [voicesStatus, setVoicesStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [voiceJa, setVoiceJaState] = useState<string>(() => { try { return localStorage.getItem('proyaku_online_voice_ja') ?? '' } catch { return '' } })
  const [voiceVi, setVoiceViState] = useState<string>(() => { try { return localStorage.getItem('proyaku_online_voice_vi') ?? '' } catch { return '' } })
  const [speedMode, setSpeedModeState] = useState<SpeedMode>(() => { try { return localStorage.getItem('proyaku_online_speed_mode') === 'manual' ? 'manual' : 'auto' } catch { return 'auto' } })
  const [manualSpeed, setManualSpeedState] = useState<number>(() => {
    try { const n = Number(localStorage.getItem('proyaku_online_manual_speed')); return Number.isFinite(n) && n >= ONLINE_SPEED_RANGE.min && n <= ONLINE_SPEED_RANGE.max ? n : 1 } catch { return 1 }
  })

  // two-way + audience wall + subtitles (TASK 6·7·8)
  const [twoWay, setTwoWayState] = useState<boolean>(() => { try { return localStorage.getItem('proyaku_online_two_way') === '1' } catch { return false } })
  const [roomFilter, setRoomFilterState] = useState<boolean>(() => { try { return localStorage.getItem('proyaku_online_room_filter') === '1' } catch { return false } })
  const [subtitleFont, setSubtitleFontState] = useState<number>(() => { try { return clampSubtitleFont(Number(localStorage.getItem('proyaku_online_subtitle_font')) || SUBTITLE_FONT.default) } catch { return SUBTITLE_FONT.default } })
  const [wallOutputs, setWallOutputsState] = useState<WallOutput[]>(() => loadWallOutputs())
  const [wallSupport, setWallSupport] = useState<ScreenSupport>('idle')
  const [wallScreens, setWallScreens] = useState<WallScreen[]>([])
  const [wallOpenIds, setWallOpenIds] = useState<string[]>([])

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
  const scriptRef = useRef<ScriptMatcherEntry[]>([])
  scriptRef.current = script
  const listenPausedRef = useRef(false)
  listenPausedRef.current = listenPaused
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

  // ── TASK 5: voices + speed. Setters only persist + set state; two effects push the current values to
  // the playback module (single source of truth), so a reload restores the operator's choice. ──
  const setVoiceJa = useCallback((slug: string) => { setVoiceJaState(slug); try { localStorage.setItem('proyaku_online_voice_ja', slug) } catch { /* private mode */ } }, [])
  const setVoiceVi = useCallback((slug: string) => { setVoiceViState(slug); try { localStorage.setItem('proyaku_online_voice_vi', slug) } catch { /* private mode */ } }, [])
  const setSpeedMode = useCallback((m: SpeedMode) => { setSpeedModeState(m); try { localStorage.setItem('proyaku_online_speed_mode', m) } catch { /* private mode */ } }, [])
  const setManualSpeed = useCallback((s: number) => { setManualSpeedState(s); try { localStorage.setItem('proyaku_online_manual_speed', String(s)) } catch { /* private mode */ } }, [])

  const refreshVoices = useCallback(async () => {
    setVoicesStatus('loading')
    try {
      const one = async (lang: 'ja' | 'vi') => {
        const r = await fetch(`/online-api/voices?language=${lang}`, { headers: { Accept: 'application/json' } })
        if (!r.ok) throw new Error(String(r.status))
        const body = (await r.json()) as { voices?: OnlineVoice[] }
        return Array.isArray(body.voices) ? body.voices : []
      }
      const [ja, vi] = await Promise.all([one('ja'), one('vi')])
      setVoices({ ja, vi })
      setVoicesStatus('ready')
    } catch {
      setVoicesStatus('error') // normal when no TTS key yet — the UI keeps the configured voice
    }
  }, [])

  // Apply persisted voices + the speed policy to the playback module (before the first sentence), and
  // load the catalog once when the console mounts so the panel is populated before it is opened.
  useEffect(() => { setTtsVoice('ja', voiceJa || undefined); setTtsVoice('vi', voiceVi || undefined) }, [voiceJa, voiceVi])
  useEffect(() => { setTtsManualSpeed(speedMode === 'manual' ? manualSpeed : undefined) }, [speedMode, manualSpeed])
  useEffect(() => { void refreshVoices() }, [refreshVoices])

  // ── TASK 6·7·8: two-way direction map + audience publisher + subtitle font + wall placement ──
  const twoWayRef = useRef(twoWay); twoWayRef.current = twoWay
  const roomFilterRef = useRef(roomFilter); roomFilterRef.current = roomFilter
  const subtitleFontRef = useRef(subtitleFont); subtitleFontRef.current = subtitleFont
  const wallOutputsRef = useRef(wallOutputs); wallOutputsRef.current = wallOutputs
  const wallScreensRef = useRef(wallScreens); wallScreensRef.current = wallScreens
  const dirByLid = useRef<Map<string, 'vi2ja' | 'ja2vi'>>(new Map())
  const publisherRef = useRef<ReturnType<typeof createAudiencePublisher> | null>(null)

  const setTwoWay = useCallback((v: boolean) => { setTwoWayState(v); try { localStorage.setItem('proyaku_online_two_way', v ? '1' : '0') } catch { /* private mode */ } }, [])
  const setRoomFilter = useCallback((v: boolean) => { setRoomFilterState(v); try { localStorage.setItem('proyaku_online_room_filter', v ? '1' : '0') } catch { /* private mode */ } }, [])
  const setSubtitleFont = useCallback((n: number) => { const c = clampSubtitleFont(n); setSubtitleFontState(c); try { localStorage.setItem('proyaku_online_subtitle_font', String(c)) } catch { /* private mode */ } }, [])
  const setWallOutputs = useCallback((o: WallOutput[]) => { setWallOutputsState(o); saveWallOutputs(o) }, [])

  const scanWall = useCallback(async () => {
    const { support, screens } = await detectWallScreens()
    setWallSupport(support)
    setWallScreens(screens)
    setWallOutputsState((prev) => { const next = scanWallScreens(prev, screens.length); saveWallOutputs(next); return next })
  }, [])
  const openWall = useCallback(() => {
    const r = openWallWindows(wallOutputsRef.current, wallScreensRef.current, subtitleFontRef.current)
    setWallOpenIds(getOpenWallIds())
    return r
  }, [])
  const closeWall = useCallback(() => { closeWallWindows(); setWallOpenIds(getOpenWallIds()) }, [])

  // The publisher lives for the console's lifetime (windows opened before the ceremony are already
  // connected). A browser never tells the parent a child window closed, so poll getOpenWallIds every 1s.
  useEffect(() => {
    publisherRef.current = createAudiencePublisher()
    return () => { publisherRef.current?.close(); publisherRef.current = null }
  }, [])
  useEffect(() => {
    const id = window.setInterval(() => {
      const ids = getOpenWallIds()
      setWallOpenIds((prev) => (prev.length === ids.length && prev.every((x, i) => x === ids[i]) ? prev : ids))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  // directedLines = the transcript joined with the per-utterance direction map onDirectedLine maintains.
  const directedLines = useMemo<AudienceLine[]>(
    () => lines.map((l) => ({ lid: l.lid, sourceText: l.sourceText, targetText: l.targetText, interim: l.interim, corrected: l.corrected, at: l.at, dir: dirByLid.current.get(l.lid) ?? (direction as 'vi2ja' | 'ja2vi') })),
    [lines, direction],
  )

  const start = useCallback(async () => {
    if (!mountedRef.current) return // unmounted during a pre-start gate → never open a leaked lane
    if (moduleActiveSession) {
      setError('Một phiên ONLINE đang chạy nơi khác — hãy Dừng phiên đó trước.')
      return
    }
    setError('')
    setLines([])
    // Never begin a session deaf: whatever the technician left "Ngưng nghe" on for is over.
    setListenPaused(false)
    listenPausedRef.current = false
    dirByLid.current.clear()
    publisherRef.current?.reset() // a new session never begins with the previous one's lines on the wall
    if (!laneRef.current) {
      laneRef.current = createOnlineLane(events, {
        getDeviceId: () => deviceIdRef.current || undefined,
        getNearMicGate: () => nearMicGateRef.current,
        getSpeakEnabled: () => speakEnabledRef.current,
        getListenPaused: () => listenPausedRef.current,
        getTwoWay: () => twoWayRef.current,
        getRoomFilter: () => roomFilterRef.current,
        // M9: the approved script rides on the lane config, not on start() — start()'s shape is the
        // two-lane treaty (src/lib/lanes/types.ts) and the offline lane has no script. The lane calls
        // this once at Bắt đầu and latches the rows for the whole session.
        getScript: () => scriptRef.current,
        onDirectedLine: (line) => {
          dirByLid.current.set(line.lid, line.dir)
          publisherRef.current?.publish({ lid: line.lid, sourceText: line.sourceText, targetText: line.targetText, interim: line.interim, corrected: line.corrected, at: line.at, dir: line.dir })
        },
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
    // TASK 12.7: the transcript lives on the container's EPHEMERAL disk (wiped on every redeploy). After
    // Dừng, tell whoever is at the desk that downloading a copy is the safe move — this fires only on an
    // explicit operator stop (the unmount/mode-switch teardown calls the lane's stop() directly).
    setSaveStatus('Đã dừng · bản ghi đã lưu trên máy chủ (ổ đĩa tạm — hãy bấm “Lưu transcript” để tải một bản về máy cho chắc).')
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
    listenPaused, setListenPaused,
    direction, setDirection, terms, setTerms, brief, setBrief, script, setScript,
    voices, voicesStatus, refreshVoices, voiceJa, setVoiceJa, voiceVi, setVoiceVi,
    speedMode, setSpeedMode, manualSpeed, setManualSpeed,
    twoWay, setTwoWay, roomFilter, setRoomFilter, directedLines, subtitleFont, setSubtitleFont,
    wallOutputs, setWallOutputs, wallSupport, wallScreens, wallOpenIds, scanWall, openWall, closeWall,
    start, stop, saveSession,
  }
}

// Shared UI, re-exported so the sanctioned integration points import ONLY from this facade root:
//   OnlineConsole      — the ONLINE lane inside the full operator console shell (live-screen ONLINE mode)
//   OnlinePanel        — the compact ONLINE panel (the /online-lab bench)
//   OnlineKeysSettings — the Settings key section (TASK 3)
export { default as OnlineConsole } from './components/OnlineConsole'
export { default as OnlinePanel } from './components/OnlinePanel'
export { default as OnlineKeysSettings } from './components/OnlineKeysSettings'
