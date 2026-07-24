// src/lib/lanes/online/components/OnlinePanel.tsx — shared ONLINE-lane console UI.
//
// Driven entirely by the `useOnlineLane` facade; used by BOTH the hidden /online-lab bench and the
// real live-screen ONLINE mode. Rendering only — no orchestration lives here.
// `onBeforeStart` (optional): a gate run before Start; return false to abort (e.g. the missing-key
// popup on the real screen). The lab passes nothing → Start proceeds directly.

import React, { useEffect } from 'react'
import { ONLINE_STATUS_COLOR, useOnlineLane, type TtsGateMode } from '../index'

const box: React.CSSProperties = { border: '1px solid #334155', borderRadius: 8, padding: 12 }

const OnlinePanel: React.FC<{
  onBeforeStart?: () => Promise<boolean> | boolean
  onRunningChange?: (running: boolean) => void
}> = ({ onBeforeStart, onRunningChange }) => {
  const lane = useOnlineLane()
  const { running, status, statusDetail, level, error, lines, diagnostics: diag, saveStatus } = lane

  // Report the live-session state up (the live-screen mode switch disables mode changes while live).
  useEffect(() => {
    onRunningChange?.(running)
  }, [running, onRunningChange])

  const handleStart = async () => {
    if (onBeforeStart) {
      const ok = await onBeforeStart()
      if (!ok) return
    }
    await lane.start()
  }

  return (
    <div style={{ color: '#e2e8f0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Controls */}
        <div style={box}>
          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Micro</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select
              value={lane.deviceId}
              onChange={(e) => lane.setDeviceId(e.target.value)}
              style={{ flex: 1, padding: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6 }}
            >
              <option value="">Mặc định hệ thống</option>
              {lane.inputDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Micro ${i + 1}`}</option>
              ))}
            </select>
            <button type="button" onClick={() => void lane.refreshDevices()} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0' }}>
              Quét lại
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e2e8f0', marginBottom: 12, cursor: running ? 'not-allowed' : 'pointer' }}>
            <input type="checkbox" checked={lane.nearMicGate} disabled={running} onChange={(e) => lane.setNearMicGate(e.target.checked)} />
            Noise gate (near-mic) — {lane.nearMicGate ? 'BẬT' : 'TẮT'}
          </label>

          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Chiều dịch</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['vi2ja', 'ja2vi'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => lane.setDirection(d)}
                disabled={running}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: lane.direction === d ? '#2563eb' : '#1e293b', color: '#e2e8f0', fontWeight: 600, opacity: running ? 0.6 : 1 }}
              >
                {d === 'vi2ja' ? 'VI → JA' : 'JA → VI'}
              </button>
            ))}
          </div>
        </div>

        {/* Status + VU + diagnostics */}
        <div style={box}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: ONLINE_STATUS_COLOR[status], display: 'inline-block' }} />
            <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{status}</span>
            {statusDetail && <span style={{ fontSize: 12, color: '#94a3b8' }}>· {statusDetail}</span>}
          </div>

          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Mức tín hiệu (VU)</label>
          <div style={{ height: 12, background: '#0f172a', borderRadius: 6, overflow: 'hidden', border: '1px solid #334155' }}>
            <div style={{ height: '100%', width: `${Math.round(level * 100)}%`, background: '#22c55e', transition: 'width 80ms linear' }} />
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8', fontFamily: 'ui-monospace, monospace', lineHeight: 1.6 }}>
            reconnectAttempts: {diag?.reconnectAttempts ?? 0}
            {'  ·  '}silentReconnects: {diag?.silentReconnects ?? 0}
            {'  ·  '}sinceEvent: {diag ? diag.secondsSinceLastEvent.toFixed(1) : '0.0'}s
            <br />
            voicedMsRecent: {diag?.voicedMsRecent ?? 0}ms
            {'  ·  '}droppedGhosts: {diag?.droppedGhosts ?? 0}
            <br />
            draftCalls: {diag?.draftCalls ?? 0}
            {'  ·  '}skip dup/rate/inflight: {diag?.draftSkipped.duplicate ?? 0}/{diag?.draftSkipped['rate-limit'] ?? 0}/{diag?.draftSkipped['in-flight'] ?? 0}
            <br />
            refineCalls: {diag?.refineCalls ?? 0}
            {'  ·  '}refineRetries: {diag?.refineRetries ?? 0}
            <br />
            ttsQueue: {diag?.ttsQueueLength ?? 0}
            {'  ·  '}gateActive: {diag?.gateActive ? 'YES' : 'no'}
            {'  ·  '}gatedMs: {diag?.gatedMs ?? 0}
            <br />
            draft p50/p90: {diag?.latency.draftP50 ?? '–'}/{diag?.latency.draftP90 ?? '–'}ms
            {'  ·  '}refine p50/p90: {diag?.latency.refineP50 ?? '–'}/{diag?.latency.refineP90 ?? '–'}ms
            <br />
            tts p50/p90: {diag?.latency.ttsP50 ?? '–'}/{diag?.latency.ttsP90 ?? '–'}ms
            {'  ·  '}usageReport: {diag?.lastUsageReportAt ? new Date(diag.lastUsageReportAt).toLocaleTimeString() : '–'}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" onClick={() => void handleStart()} disabled={running} style={{ flex: 1, padding: '10px', borderRadius: 6, border: 'none', background: running ? '#334155' : '#16a34a', color: '#fff', fontWeight: 700 }}>
              Bắt đầu
            </button>
            <button type="button" onClick={() => void lane.stop()} disabled={!running} style={{ flex: 1, padding: '10px', borderRadius: 6, border: 'none', background: !running ? '#334155' : '#dc2626', color: '#fff', fontWeight: 700 }}>
              Dừng
            </button>
          </div>
        </div>
      </div>

      {/* Voice output (TTS) */}
      <div style={{ ...box, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e2e8f0', cursor: 'pointer' }}>
            <input type="checkbox" checked={lane.speakEnabled} onChange={(e) => lane.setSpeakEnabled(e.target.checked)} />
            🔊 Đọc bản dịch — {lane.speakEnabled ? 'BẬT' : 'TẮT'}
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Thiết bị ra</span>
            <select
              value={lane.outputDeviceId}
              onChange={(e) => lane.setOutputDeviceId(e.target.value)}
              style={{ padding: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, minWidth: 180 }}
            >
              <option value="">Mặc định hệ thống</option>
              {lane.outputDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Loa ${i + 1}`}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Chống dội (gate)</span>
            <select
              value={lane.gateMode}
              onChange={(e) => lane.setGateMode(e.target.value as TtsGateMode)}
              disabled={running}
              style={{ padding: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, opacity: running ? 0.6 : 1 }}
            >
              <option value="auto">auto (loa ngoài)</option>
              <option value="always">always (họp online)</option>
              <option value="off">off (tai nghe)</option>
            </select>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
          Đổi thiết bị ra áp dụng từ câu kế tiếp. Chế độ gate chốt khi Bắt đầu (đổi lúc đang chạy không áp).
        </div>
      </div>

      {/* Terms + brief */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={box}>
          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Thuật ngữ / corpus (≤ 2000 ký tự)</label>
          <textarea value={lane.terms} onChange={(e) => lane.setTerms(e.target.value)} disabled={running} rows={4} style={{ width: '100%', padding: 8, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, resize: 'vertical' }} />
        </div>
        <div style={box}>
          <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Bối cảnh (brief)</label>
          <textarea value={lane.brief} onChange={(e) => lane.setBrief(e.target.value)} disabled={running} rows={4} style={{ width: '100%', padding: 8, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, resize: 'vertical' }} />
        </div>
      </div>

      {error && (
        <div style={{ ...box, borderColor: '#ef4444', color: '#fca5a5', marginBottom: 16, fontSize: 13 }}>⚠ {error}</div>
      )}

      {/* Line list */}
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Phụ đề ({lines.length})</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveStatus && <span style={{ fontSize: 12, color: '#94a3b8' }}>{saveStatus}</span>}
            <button type="button" onClick={() => void lane.saveSession()} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontWeight: 600 }}>
              Lưu transcript
            </button>
          </div>
        </div>
        {lines.length === 0 && <div style={{ fontSize: 13, color: '#64748b' }}>Chưa có dòng nào. Nhấn "Bắt đầu" và nói vào micro.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lines.map((l) => (
            <div key={l.lid} style={{ borderLeft: `3px solid ${l.interim ? '#475569' : l.corrected ? '#22c55e' : '#0ea5e9'}`, paddingLeft: 10 }}>
              <div style={{ fontSize: 15, fontStyle: l.interim ? 'italic' : 'normal', color: l.interim ? '#94a3b8' : '#e2e8f0' }}>{l.sourceText || '…'}</div>
              {/* draft = dim italic; refine = bright + bold, replacing the draft in place */}
              <div style={{ fontSize: 15, fontStyle: l.corrected ? 'normal' : 'italic', fontWeight: l.corrected ? 600 : 400, color: l.corrected ? '#7dd3fc' : '#64748b' }}>
                {l.targetText || (l.interim ? '' : '(đang tinh chỉnh…)')}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {l.lid}{l.interim ? ' · interim' : ''}{l.corrected ? ' · ✓ refined' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default OnlinePanel
