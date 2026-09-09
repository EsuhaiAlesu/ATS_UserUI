// src/lib/lanes/online/components/OnlinePanel.tsx — shared ONLINE-lane console UI.
//
// Driven entirely by the `useOnlineLane` facade. Rendering only — no orchestration lives here.
//
// WHERE THIS IS ACTUALLY MOUNTED (it changed, and the old sentence here was wrong): only the hidden
// /online-lab bench. The real live screen mounts `OnlineConsole` — the facade root's own console
// shell, with its own MissingKeysModal and its own running/stop self-reporting. This file stays as
// the SHAPE of the contract; do not wire it into a new live screen.
// `onBeforeStart` (optional): a gate run before Start; return false to abort (e.g. the missing-key
// popup on the real screen). The lab passes nothing → Start proceeds directly.
//
// Styling: the app's design system (surface/on-surface tokens, card-lux, field-lux, btn-lux,
// font-label-caps, material-symbols-outlined) — same look as the rest of PROYAKU. Responsive:
// control cards stack to one column below md; the subtitle feed scrolls inside its own container
// and long unbroken text wraps. This is a reskin only — no change to props, state or behaviour.

import React, { useEffect } from 'react'
import { ONLINE_STATUS_COLOR, useOnlineLane, SHOW_ONLINE_TUNING, type TtsGateMode } from '../index'

const CARD = 'card-lux bg-surface-container border border-outline-variant rounded-xl p-4'
const LABEL = 'font-label-caps text-label-caps text-on-surface-variant block mb-1.5'
// text-base on mobile (≥16px) so iOS does not zoom on focus; text-sm from sm up keeps the desktop look.
const FIELD = 'w-full bg-surface text-on-surface border border-outline-variant rounded-DEFAULT py-2 px-3 text-base sm:text-sm focus:ring-0 focus:border-secondary field-lux transition-shadow'
// pr-9 reserves room for the @tailwindcss/forms chevron (px-3 would otherwise shrink the plugin's
// padding-right and let long device labels run under the arrow).
const SELECT = `${FIELD} appearance-none cursor-pointer disabled:opacity-50 pr-9`
// py-2 gives the natural desktop height (min-h-[44px] only floors the touch target on mobile; sm:min-h-0
// hands height back to py-2 on desktop) — matches the app button convention (px-4 py-2 rounded-full).
const BTN = 'inline-flex items-center justify-center gap-2 rounded-full font-label-caps text-label-caps transition-colors disabled:opacity-50 disabled:cursor-not-allowed py-2 min-h-[44px] sm:min-h-0'

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
    <div className="space-y-4 text-on-surface">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Controls ── */}
        <div className={CARD}>
          <label htmlFor="online-mic" className={LABEL}>Micro</label>
          <div className="flex gap-2 mb-3">
            <select id="online-mic" value={lane.deviceId} onChange={(e) => lane.setDeviceId(e.target.value)} className={`${SELECT} flex-1 min-w-0`}>
              <option value="">Mặc định hệ thống</option>
              {lane.inputDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Micro ${i + 1}`}</option>
              ))}
            </select>
            <button type="button" onClick={() => void lane.refreshDevices()}
              className={`${BTN} shrink-0 border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary px-3`}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>Quét lại
            </button>
          </div>

          {/* BÀN GIAO 26/08/2026 — nút tinh chỉnh, ẨN chứ không xoá. Mặc định near-mic đã TẮT.
              Bật lại: đổi MỘT dòng trong lanes/online/tuningVisibility.ts. */}
          {SHOW_ONLINE_TUNING && (
            <label className={`flex items-center gap-2 text-sm mb-3 ${running ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
              <input type="checkbox" className="accent-secondary w-4 h-4" checked={lane.nearMicGate} disabled={running} onChange={(e) => lane.setNearMicGate(e.target.checked)} />
              Noise gate (near-mic) — {lane.nearMicGate ? 'BẬT' : 'TẮT'}
            </label>
          )}

          <span className={LABEL}>Chiều dịch</span>
          <div className="flex gap-2">
            {(['vi2ja', 'ja2vi'] as const).map((d) => (
              <button key={d} type="button" onClick={() => lane.setDirection(d)} disabled={running}
                className={`${BTN} flex-1 border ${lane.direction === d ? 'bg-secondary text-on-secondary border-secondary' : 'bg-surface text-on-surface-variant border-outline-variant hover:text-on-surface'}`}>
                {d === 'vi2ja' ? 'VI → JA' : 'JA → VI'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Status + VU + diagnostics ── */}
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: ONLINE_STATUS_COLOR[status] }} aria-hidden="true" />
            <span className="font-label-caps text-label-caps text-on-surface">{status}</span>
            {statusDetail && <span className="text-xs text-on-surface-variant min-w-0 truncate">· {statusDetail}</span>}
          </div>

          <span className={LABEL}>Mức tín hiệu (VU)</span>
          <div className="h-3 rounded-DEFAULT overflow-hidden border border-outline-variant bg-surface-container-lowest">
            <div className="h-full bg-secondary" style={{ width: `${Math.round(level * 100)}%`, transition: 'width 80ms linear' }} />
          </div>

          <div className="mt-3 text-xs text-on-surface-variant font-mono leading-relaxed break-words">
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

          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => void handleStart()} disabled={running}
              className={`${BTN} flex-1 btn-lux bg-secondary text-on-secondary hover:opacity-80`}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">play_arrow</span>Bắt đầu
            </button>
            <button type="button" onClick={() => void lane.stop()} disabled={!running}
              className={`${BTN} flex-1 bg-error text-on-error hover:opacity-80`}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">stop</span>Dừng
            </button>
          </div>
        </div>
      </div>

      {/* ── Voice output (TTS) ── */}
      <div className={CARD}>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="accent-secondary w-4 h-4" checked={lane.speakEnabled} onChange={(e) => lane.setSpeakEnabled(e.target.checked)} />
            <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">volume_up</span>
            Đọc bản dịch — {lane.speakEnabled ? 'BẬT' : 'TẮT'}
          </label>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-label-caps text-label-caps text-on-surface-variant shrink-0">Thiết bị ra</span>
            <select value={lane.outputDeviceId} onChange={(e) => lane.setOutputDeviceId(e.target.value)} className={`${SELECT} w-full sm:w-auto sm:min-w-[180px]`}>
              <option value="">Mặc định hệ thống</option>
              {lane.outputDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Loa ${i + 1}`}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-label-caps text-label-caps text-on-surface-variant shrink-0">Chống dội (gate)</span>
            <select value={lane.gateMode} onChange={(e) => lane.setGateMode(e.target.value as TtsGateMode)} disabled={running} className={`${SELECT} w-full sm:w-auto`}>
              <option value="auto">auto (loa ngoài)</option>
              <option value="always">always (họp online)</option>
              <option value="off">off (tai nghe)</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-on-surface-variant/80 mt-2">
          Đổi thiết bị ra áp dụng từ câu kế tiếp. Chế độ gate chốt khi Bắt đầu (đổi lúc đang chạy không áp).
        </p>
      </div>

      {/* ── Terms + brief ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={CARD}>
          <label htmlFor="online-terms" className={LABEL}>Thuật ngữ / corpus (≤ 2000 ký tự)</label>
          <textarea id="online-terms" value={lane.terms} onChange={(e) => lane.setTerms(e.target.value)} disabled={running} rows={4} className={`${FIELD} resize-y`} />
        </div>
        <div className={CARD}>
          <label htmlFor="online-brief" className={LABEL}>Bối cảnh (brief)</label>
          <textarea id="online-brief" value={lane.brief} onChange={(e) => lane.setBrief(e.target.value)} disabled={running} rows={4} className={`${FIELD} resize-y`} />
        </div>
      </div>

      {error && (
        <div className={`${CARD} border-error text-error text-sm flex items-start gap-2`}>
          <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden="true">warning</span>
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      {/* ── Line list ── */}
      <div className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="font-label-caps text-label-caps text-on-surface-variant">Phụ đề ({lines.length})</span>
          <div className="flex items-center gap-2 flex-wrap">
            {saveStatus && <span className="text-xs text-on-surface-variant">{saveStatus}</span>}
            <button type="button" onClick={() => void lane.saveSession()}
              className={`${BTN} border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary px-3`}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>Lưu transcript
            </button>
          </div>
        </div>
        {lines.length === 0 && <p className="text-sm text-on-surface-variant/80">Chưa có dòng nào. Nhấn "Bắt đầu" và nói vào micro.</p>}
        {lines.length > 0 && (
          <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {lines.map((l) => (
              <div key={l.lid} className={`pl-2.5 border-l-[3px] ${l.interim ? 'border-outline' : l.corrected ? 'border-secondary' : 'border-primary'}`}>
                <div className={`text-[15px] break-words ${l.interim ? 'italic text-on-surface-variant' : 'text-on-surface'}`}>{l.sourceText || '…'}</div>
                {/* draft = dim italic; refine = bright + bold, replacing the draft in place */}
                <div className={`text-[15px] break-words ${l.corrected ? 'font-semibold text-secondary' : 'italic text-on-surface-variant/70'}`}>
                  {l.targetText || (l.interim ? '' : '(đang tinh chỉnh…)')}
                </div>
                <div className="text-[11px] text-on-surface-variant/60 mt-0.5">
                  {l.lid}{l.interim ? ' · interim' : ''}{l.corrected ? ' · ✓ refined' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default OnlinePanel
