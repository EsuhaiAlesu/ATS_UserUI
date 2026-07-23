// src/pages/OnlineLab.tsx
//
// Dev bench for the ONLINE lane (docs/ONLINE-LANE-CONTRACT.md). Purely functional — the
// production UX is designed elsewhere. Standalone route /online-lab, NOT linked in any navbar.
// This page is the ONLY page allowed to import the online lane.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LaneEvents, LaneLine, LaneStatus } from '../lib/lanes/types'
import { createOnlineLane, type OnlineDiagnostics, type OnlineLaneController } from '../lib/lanes/online/onlineLane'

type Direction = 'vi2ja' | 'ja2vi'

const ACTIVE_STATUSES: LaneStatus[] = ['connecting', 'ready', 'listening', 'reconnecting']

const STATUS_COLOR: Record<LaneStatus, string> = {
  idle: '#64748b',
  connecting: '#f59e0b',
  ready: '#0ea5e9',
  listening: '#22c55e',
  reconnecting: '#f59e0b',
  error: '#ef4444',
  stopped: '#64748b',
}

const OnlineLab: React.FC = () => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState<string>('')
  const [nearMicGate, setNearMicGate] = useState<boolean>(true)
  const [direction, setDirection] = useState<Direction>('vi2ja')
  const [terms, setTerms] = useState('')
  const [brief, setBrief] = useState('')

  const [status, setStatus] = useState<LaneStatus>('idle')
  const [statusDetail, setStatusDetail] = useState('')
  const [level, setLevel] = useState(0)
  const [error, setError] = useState('')
  const [lines, setLines] = useState<LaneLine[]>([])
  const [diag, setDiag] = useState<OnlineDiagnostics | null>(null)

  const deviceIdRef = useRef<string>('')
  deviceIdRef.current = deviceId
  const nearMicGateRef = useRef<boolean>(true)
  nearMicGateRef.current = nearMicGate
  const laneRef = useRef<OnlineLaneController | null>(null)

  const running = ACTIVE_STATUSES.includes(status)

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices()
      setDevices(list.filter((d) => d.kind === 'audioinput'))
    } catch {
      /* enumerateDevices unsupported / blocked — leave list empty (default mic still works) */
    }
  }, [])

  useEffect(() => {
    void refreshDevices()
  }, [refreshDevices])

  // Poll the online lane's diagnostics (reconnectAttempts / lastEvent age / voiced / ghosts).
  useEffect(() => {
    const id = setInterval(() => {
      setDiag(laneRef.current?.getDiagnostics() ?? null)
    }, 500)
    return () => clearInterval(id)
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

  // Stable across renders (deps are stable), so the lane is created exactly once.
  const events: LaneEvents = useMemo(
    () => ({
      onStatus: (s, detail) => {
        setStatus(s)
        setStatusDetail(detail ?? '')
        if (s === 'listening') void refreshDevices() // mic permission granted → labels now visible
      },
      onLine: (line) => upsertLine(line),
      onLevel: (v) => setLevel(v),
      onError: (message) => setError(message),
    }),
    [refreshDevices, upsertLine],
  )

  const handleStart = useCallback(async () => {
    setError('')
    setLines([])
    if (!laneRef.current) {
      laneRef.current = createOnlineLane(events, {
        getDeviceId: () => deviceIdRef.current || undefined,
        getNearMicGate: () => nearMicGateRef.current,
      })
    }
    const [sourceLanguage, targetLanguage] = direction === 'vi2ja' ? (['vi', 'ja'] as const) : (['ja', 'vi'] as const)
    try {
      await laneRef.current.start({
        sourceLanguage,
        targetLanguage,
        terms: terms.trim() || undefined,
        brief: brief.trim() || undefined,
      })
    } catch {
      /* the failure is already surfaced via onError/onStatus; keep the page alive */
    }
  }, [events, direction, terms, brief])

  const handleStop = useCallback(async () => {
    await laneRef.current?.stop()
  }, [])

  // Stop the lane if the page unmounts while a session is live.
  useEffect(() => {
    return () => {
      void laneRef.current?.stop()
    }
  }, [])

  const box: React.CSSProperties = { border: '1px solid #334155', borderRadius: 8, padding: 12 }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#e2e8f0' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Online Lane — Dev Bench</h1>
      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
        Bàn thử nghiệm luồng ONLINE (Esuhai Realtime Translation). Mọi lệnh gọi qua <code>/online-api</code>. Trang nội bộ, không có trên menu.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Controls */}
        <div style={box}>
          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Micro</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              style={{ flex: 1, padding: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6 }}
            >
              <option value="">Mặc định hệ thống</option>
              {devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Micro ${i + 1}`}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void refreshDevices()} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0' }}>
              Quét lại
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e2e8f0', marginBottom: 12, cursor: running ? 'not-allowed' : 'pointer' }}>
            <input type="checkbox" checked={nearMicGate} disabled={running} onChange={(e) => setNearMicGate(e.target.checked)} />
            Noise gate (near-mic) — {nearMicGate ? 'BẬT' : 'TẮT'}
          </label>

          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Chiều dịch</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['vi2ja', 'ja2vi'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                disabled={running}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #334155',
                  background: direction === d ? '#2563eb' : '#1e293b',
                  color: '#e2e8f0',
                  fontWeight: 600,
                  opacity: running ? 0.6 : 1,
                }}
              >
                {d === 'vi2ja' ? 'VI → JA' : 'JA → VI'}
              </button>
            ))}
          </div>
        </div>

        {/* Status + VU + diagnostics */}
        <div style={box}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[status], display: 'inline-block' }} />
            <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{status}</span>
            {statusDetail && <span style={{ fontSize: 12, color: '#94a3b8' }}>· {statusDetail}</span>}
          </div>

          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Mức tín hiệu (VU)</label>
          <div style={{ height: 12, background: '#0f172a', borderRadius: 6, overflow: 'hidden', border: '1px solid #334155' }}>
            <div style={{ height: '100%', width: `${Math.round(level * 100)}%`, background: '#22c55e', transition: 'width 80ms linear' }} />
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8', fontFamily: 'ui-monospace, monospace', lineHeight: 1.6 }}>
            reconnectAttempts: {diag?.reconnectAttempts ?? 0}
            {'  ·  '}sinceEvent: {diag ? diag.secondsSinceLastEvent.toFixed(1) : '0.0'}s
            <br />
            voicedMsRecent: {diag?.voicedMsRecent ?? 0}ms
            {'  ·  '}droppedGhosts: {diag?.droppedGhosts ?? 0}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={running}
              style={{ flex: 1, padding: '10px', borderRadius: 6, border: 'none', background: running ? '#334155' : '#16a34a', color: '#fff', fontWeight: 700 }}
            >
              Bắt đầu
            </button>
            <button
              type="button"
              onClick={() => void handleStop()}
              disabled={!running}
              style={{ flex: 1, padding: '10px', borderRadius: 6, border: 'none', background: !running ? '#334155' : '#dc2626', color: '#fff', fontWeight: 700 }}
            >
              Dừng
            </button>
          </div>
        </div>
      </div>

      {/* Terms + brief */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={box}>
          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Thuật ngữ / corpus (≤ 2000 ký tự)</label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            disabled={running}
            rows={4}
            style={{ width: '100%', padding: 8, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, resize: 'vertical' }}
          />
        </div>
        <div style={box}>
          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Bối cảnh (brief)</label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            disabled={running}
            rows={4}
            style={{ width: '100%', padding: 8, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, resize: 'vertical' }}
          />
        </div>
      </div>

      {error && (
        <div style={{ ...box, borderColor: '#ef4444', color: '#fca5a5', marginBottom: 16, fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Line list */}
      <div style={box}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Phụ đề ({lines.length})</div>
        {lines.length === 0 && <div style={{ fontSize: 13, color: '#64748b' }}>Chưa có dòng nào. Nhấn "Bắt đầu" và nói vào micro.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lines.map((l) => (
            <div key={l.lid} style={{ borderLeft: `3px solid ${l.interim ? '#475569' : l.corrected ? '#22c55e' : '#0ea5e9'}`, paddingLeft: 10 }}>
              <div style={{ fontSize: 15, fontStyle: l.interim ? 'italic' : 'normal', color: l.interim ? '#94a3b8' : '#e2e8f0' }}>
                {l.sourceText || '…'}
              </div>
              <div style={{ fontSize: 15, color: l.targetText ? '#7dd3fc' : '#475569' }}>
                {l.targetText || (l.interim ? '' : '(đang dịch…)')}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {l.lid}
                {l.interim ? ' · interim' : ''}
                {l.corrected ? ' · ✓ refined' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default OnlineLab
