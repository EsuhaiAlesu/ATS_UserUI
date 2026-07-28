// src/lib/lanes/online/components/OnlineConsole.tsx — the ONLINE lane rendered INSIDE the same operator
// console shell as OFFLINE (left control rail · status strip · centre stage · settings drawer), wired to
// the `useOnlineLane` facade.
//
// This is a deliberate DUPLICATE of the OFFLINE console's layout markup — same class strings, same DOM
// frame, same spacing — per PROMPT-09 §1.3: duplication, NOT extraction, because the OFFLINE console is
// the production gala bench and its code must not change. Do not "fix" the duplication.
//
// Imports: ONLY the facade root (`../index`) + the neutral ConferenceModeContext (for the head-bar DỪNG
// relay + lane-switch lock). It never imports an OFFLINE-lane file. The rich MÀN KHÁN GIẢ group (TASK 7),
// the voice catalog (TASK 5), "Nạp từ Chuẩn bị" (TASK 4), the subtitle mechanism (TASK 8), two-way
// (TASK 6) and the hall-babble switch (TASK 11.13) arrive in later phases — room is left for them.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnlineLane, fetchOnlineConfigStatus, ONLINE_SPEED_RANGE, type LaneStatus, type OnlineVoice } from '../index'
import { useConferenceMode } from '../../../ConferenceModeContext'
import { useActiveEvent } from '../../../ActiveEventContext'
import { collectPrepPack, type PrepPack } from '../../../prepData'

type CfgStatus = Awaited<ReturnType<typeof fetchOnlineConfigStatus>>

const SELECT_CLS =
  'field-lux transition-shadow w-full bg-surface text-on-surface border border-outline-variant rounded-DEFAULT py-2 pl-3 pr-9 ' +
  'focus:ring-0 focus:border-secondary appearance-none cursor-pointer disabled:opacity-50 text-sm'
const TEXTAREA_CLS =
  'w-full bg-surface text-on-surface border border-outline-variant rounded-DEFAULT py-2 px-3 text-sm ' +
  'focus:ring-0 focus:border-secondary field-lux resize-none disabled:opacity-50'

// Map LaneStatus onto the OFFLINE console's annunciator vocabulary + dot colours/animations (§1.1).
const ANN: Record<LaneStatus, { label: string; text: string; dot: string; anim: string }> = {
  idle: { label: 'STANDBY', text: 'text-on-surface-variant', dot: 'bg-outline-variant', anim: '' },
  stopped: { label: 'STANDBY', text: 'text-on-surface-variant', dot: 'bg-outline-variant', anim: '' },
  connecting: { label: 'CONNECTING…', text: 'text-primary', dot: 'bg-primary', anim: 'listening-pulse' },
  ready: { label: 'READY', text: 'text-secondary', dot: 'bg-secondary', anim: '' },
  listening: { label: 'LIVE', text: 'text-secondary', dot: 'bg-secondary', anim: 'listening-pulse' },
  reconnecting: { label: 'MẤT KẾT NỐI · ĐANG KẾT NỐI LẠI', text: 'text-error', dot: 'bg-error', anim: 'listening-pulse' },
  error: { label: 'FAULT · LỖI', text: 'text-error', dot: 'bg-error', anim: '' },
}

// A control row for the LEFT rail — this lane's OWN copy (the OFFLINE RailBtn lives in the offline page
// and must not be shared across lanes). icon + label (+ optional status dot).
const RailBtn: React.FC<{
  icon: string; label: string; title?: string; ariaLabel?: string; onClick?: () => void
  tone?: 'default' | 'active' | 'primary' | 'danger'; disabled?: boolean; dot?: string; big?: boolean
}> = ({ icon, label, title, ariaLabel, onClick, tone = 'default', disabled, dot, big }) => {
  const cls =
    tone === 'primary' ? 'bg-secondary text-on-secondary hover:opacity-90 shadow-lg shadow-secondary/20'
      : tone === 'danger' ? 'bg-error text-on-error hover:opacity-90'
        : tone === 'active' ? 'bg-secondary/15 text-secondary border border-secondary/40'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-transparent'
  return (
    <button type="button" title={title ?? label} aria-label={ariaLabel} onClick={onClick} disabled={disabled}
      className={`relative w-full flex items-center gap-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${big ? 'px-3.5 py-3' : 'px-3 py-2.5'} ${cls}`}>
      <span className="material-symbols-outlined shrink-0" style={{ fontSize: big ? '24px' : '21px' }} aria-hidden="true">{icon}</span>
      <span className={`flex-1 min-w-0 text-left leading-tight truncate font-medium ${big ? 'text-[16px]' : 'text-[14.5px]'}`}>{label}</span>
      {dot && <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${dot}`} aria-hidden="true"></span>}
    </button>
  )
}

// One language column of the live monitor — pins to the newest line (own copy; simple {lid,text} shape).
const MonitorColumn: React.FC<{ label: React.ReactNode; lines: { lid: string; text: string }[]; jp?: boolean }> = ({ label, lines, jp }) => {
  const ref = useRef<HTMLDivElement>(null)
  const dep = `${lines.length}|${lines[lines.length - 1]?.text ?? ''}`
  useEffect(() => { const el = ref.current; if (el) el.scrollTop = el.scrollHeight }, [dep])
  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="shrink-0 flex items-center justify-center py-2.5">{label}</div>
      <div ref={ref} className="flex-1 overflow-y-auto px-6 md:px-10">
        <div className={`min-h-full flex flex-col justify-end gap-4 py-4 ${jp ? 'jp-text' : ''}`}>
          {lines.map((line, i) => {
            const age = lines.length - 1 - i
            const cls = age === 0
              ? 'fade-current text-secondary font-bold text-2xl md:text-[1.9rem] leading-snug'
              : age === 1
                ? 'fade-older text-on-surface font-semibold text-lg md:text-xl leading-snug'
                : 'text-on-surface-variant opacity-70 font-medium text-base md:text-lg leading-snug'
            return (
              <p key={line.lid} lang={jp ? 'ja' : 'vi'} className={cls}
                style={{ lineBreak: jp ? 'strict' : undefined, textShadow: age === 0 ? '0 0 22px rgba(232,184,75,0.28)' : undefined }}>
                {line.text}
              </p>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// The missing-keys gate popup — moved from AudioRouting into the lane (§1.3).
const MissingKeysModal: React.FC<{ onClose: () => void; onGoSettings: () => void }> = ({ onClose, onGoSettings }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Chưa nhập khoá dịch vụ (API Key)">
    <div className="card-lux bg-surface-container border border-outline-variant rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="material-symbols-outlined text-error" aria-hidden="true">key_off</span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Chưa nhập khoá dịch vụ (API Key)</h3>
      </div>
      <p className="text-sm text-on-surface-variant">Luồng ONLINE cần đủ khoá dịch vụ (API Key) — nhận dạng giọng · dịch · đọc giọng. Vui lòng nhập khoá trong Cài đặt trước khi bắt đầu.</p>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-label-caps text-label-caps border border-outline-variant text-on-surface-variant hover:text-on-surface">Đóng</button>
        <button onClick={onGoSettings} className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-label-caps text-label-caps btn-lux bg-secondary text-on-secondary hover:opacity-80">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">settings</span>Mở Cài đặt
        </button>
      </div>
    </div>
  </div>
)

type Panel = 'gate' | 'voice' | 'terms' | 'brief' | null

const OnlineConsole: React.FC = () => {
  const nav = useNavigate()
  const lane = useOnlineLane()
  const { setBusy, registerStop } = useConferenceMode()
  const { event } = useActiveEvent()

  const [panel, setPanel] = useState<Panel>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [cfg, setCfg] = useState<CfgStatus | null>(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [isFs, setIsFs] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [prep, setPrep] = useState<PrepPack | null>(null)
  const prepLoadedRef = useRef('')

  // Report running state + register the stop function to the neutral context, so the head-bar DỪNG can
  // relay to this lane and the lane switch locks while a capture is live. (ConferenceModeContext is
  // lane-neutral — this is not an OFFLINE-lane import.)
  useEffect(() => { setBusy(lane.running) }, [lane.running, setBusy])
  useEffect(() => () => setBusy(false), [setBusy])
  const stopRef = useRef<() => void>(() => {})
  useEffect(() => { stopRef.current = () => { void lane.stop() } }, [lane])
  useEffect(() => {
    registerStop(() => stopRef.current())
    return () => registerStop(null)
  }, [registerStop])

  // config-status drives the KIỂM TRA checklist, the standby sentence, and the Start gate.
  const refreshCfg = useCallback(async () => { try { setCfg(await fetchOnlineConfigStatus()) } catch { setCfg(null) } }, [])
  useEffect(() => { void refreshCfg() }, [refreshCfg])

  // Session timer (mm:ss) — runs while the lane is live.
  useEffect(() => {
    if (!lane.running) { setElapsed(0); return }
    const t0 = Date.now()
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000)
    return () => window.clearInterval(id)
  }, [lane.running])
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  useEffect(() => {
    const on = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.()
  }

  // Start gate: refuse (and open the missing-keys modal) unless the server says the required keys are set.
  const handleStart = useCallback(async () => {
    let ready = false
    try { const s = await fetchOnlineConfigStatus(); setCfg(s); ready = s.ready } catch { ready = false }
    if (!ready) { setShowKeyModal(true); return }
    try { await lane.start() } catch { /* lane surfaces the error via lane.error */ }
  }, [lane])

  // ── TASK 4: fill the Thuật ngữ / Bối cảnh boxes from the Chuẩn bị stores ──
  const loadPrep = async (overwrite: boolean) => {
    const pack = await collectPrepPack(event, lane.direction)
    setPrep(pack)
    if (overwrite) { lane.setTerms(pack.terms); lane.setBrief(pack.brief) }
  }
  // Auto-load once per (event × direction), and only into boxes that are still empty — auto-fill must
  // never overwrite something the technician typed.
  useEffect(() => {
    const key = `${event?.id ?? ''}|${lane.direction}`
    if (prepLoadedRef.current === key) return
    prepLoadedRef.current = key
    let cancelled = false
    void collectPrepPack(event, lane.direction).then((pack) => {
      if (cancelled) return
      setPrep(pack)
      if (!lane.terms.trim()) lane.setTerms(pack.terms)
      if (!lane.brief.trim()) lane.setBrief(pack.brief)
    })
    return () => { cancelled = true }
  }, [event, lane.direction, lane])

  const voiceOptions = (list: OnlineVoice[]) => {
    const personal = list.filter((v) => v.category === 'personal')
    const rest = list.filter((v) => v.category !== 'personal')
    return (
      <>
        {personal.length > 0 && <optgroup label="Giọng của tôi">{personal.map((v) => <option key={v.slug} value={v.slug}>{v.name}</option>)}</optgroup>}
        {rest.length > 0 && <optgroup label="Giọng có sẵn">{rest.map((v) => <option key={v.slug} value={v.slug}>{v.name}</option>)}</optgroup>}
      </>
    )
  }

  const prepCounts = prep ? (
    <div className="text-[11px] text-on-surface-variant leading-relaxed">
      {prep.stats.termLines} thuật ngữ · {prep.stats.glossary} mục từ điển · {prep.stats.speakers} diễn giả
      {prep.stats.dropped > 0 ? ` · còn ${prep.stats.dropped} mục vượt hạn mức 40 dòng` : ''}
      {!prep.glossaryReachable ? ' · chưa với tới Từ điển trên máy chủ nội bộ' : ''}
    </div>
  ) : null

  // ── derived state ──
  const st = lane.status
  const ann = ANN[st] ?? ANN.idle
  const setupPhase = st === 'connecting' || st === 'reconnecting'
  const live = st === 'ready' || st === 'listening'

  // n/m reads the server's `required` list when present (TASK 11.10 adds it), else falls back to "all
  // keys the server reports" — never a hard-coded 6, so this phase works on its own AND after Phase 4.
  const requiredList: string[] = cfg
    ? (Array.isArray((cfg as { required?: string[] }).required) ? (cfg as { required?: string[] }).required as string[] : Object.keys(cfg.keys))
    : []
  const keysHave = cfg ? requiredList.filter((k) => cfg.keys[k]).length : 0
  const keysNeed = requiredList.length
  const keysReady = cfg?.ready ?? false

  const micPresent = lane.inputDevices.length > 0 && (!lane.deviceId || lane.inputDevices.some((d) => d.deviceId === lane.deviceId))
  const outResolvable = !lane.outputDeviceId || lane.outputDevices.some((d) => d.deviceId === lane.outputDeviceId)
  const checks = [
    { label: `Khoá dịch vụ (API Key) · ${keysHave}/${keysNeed || '…'}`, ok: keysReady },
    { label: 'Mic sẵn sàng', ok: micPresent },
    { label: 'Thiết bị ra', ok: outResolvable },
    { label: 'Hướng dịch đã chọn', ok: !!lane.direction },
  ]
  const preflightPass = checks.filter((c) => c.ok).length
  const preflightOk = checks.every((c) => c.ok)

  // Two language columns from the (session-level, for now) direction. TASK 8 replaces this with the shared
  // subtitle mechanism; TASK 6 makes the language per-utterance.
  const viCol = lane.lines.map((l) => ({ lid: l.lid, text: lane.direction === 'vi2ja' ? l.sourceText : l.targetText })).filter((x) => x.text.trim())
  const jaCol = lane.lines.map((l) => ({ lid: l.lid, text: lane.direction === 'vi2ja' ? l.targetText : l.sourceText })).filter((x) => x.text.trim())

  const diag = lane.diagnostics
  const lat = diag?.latency

  return (
    <div className="h-full w-full flex text-on-background overflow-hidden relative">
      {/* ══════════ RAIL ĐIỀU KHIỂN (trái) ══════════ */}
      <aside className="shrink-0 w-[248px] h-full flex flex-col border-r border-outline-variant bg-surface-container-lowest">
        <div className="flex-1 overflow-y-auto p-2.5 pt-3 space-y-3.5">
          {/* A · PHIÊN — bắt đầu / dừng (§1.1a: Dừng dịch = 1 lần bấm, không giữ) */}
          {lane.running ? (
            <RailBtn icon="stop" label="Dừng dịch" big tone="danger" ariaLabel="Dừng phiên dịch" title="Dừng phiên dịch" onClick={() => { void lane.stop() }} />
          ) : (
            <RailBtn icon="play_arrow" label="Bắt đầu dịch" big tone="primary" disabled={setupPhase}
              title={keysReady ? 'Bắt đầu phiên dịch' : 'Chưa nhập khoá dịch vụ (API Key) — mở Cài đặt'}
              onClick={() => { void handleStart() }} />
          )}

          {/* B · MÀN KHÁN GIẢ — nhóm riêng của luồng ONLINE (2 chiều + Xuất) đến ở TASK 7 (Phase 3). */}

          {/* C · ÂM THANH & GIỌNG */}
          <div className="space-y-0.5">
            <div className="px-2 pb-1 font-label-caps text-[10px] text-on-surface-variant/55 tracking-[0.16em]">ÂM THANH & GIỌNG</div>
            <RailBtn icon={lane.speakEnabled ? 'volume_up' : 'subtitles'} label={lane.speakEnabled ? 'Đang đọc tiếng' : 'Chỉ phụ đề'}
              title={lane.speakEnabled ? 'Đang đọc tiếng — bấm để chỉ phụ đề' : 'Chỉ phụ đề — bấm để bật đọc tiếng'}
              tone={lane.speakEnabled ? 'active' : 'default'} onClick={() => lane.setSpeakEnabled(!lane.speakEnabled)} />
            <RailBtn icon="record_voice_over" label="Giọng đọc" title="Chọn giọng đọc theo tên + tốc độ" tone={panel === 'voice' ? 'active' : 'default'} onClick={() => setPanel((p) => (p === 'voice' ? null : 'voice'))} />
            <RailBtn icon="graphic_eq" label="Chống dội (gate)" title="Chế độ chống dội tiếng" tone={panel === 'gate' ? 'active' : 'default'} onClick={() => setPanel((p) => (p === 'gate' ? null : 'gate'))} />
          </div>

          {/* D · NỘI DUNG */}
          <div className="space-y-0.5">
            <div className="px-2 pb-1 font-label-caps text-[10px] text-on-surface-variant/55 tracking-[0.16em]">NỘI DUNG</div>
            <RailBtn icon="menu_book" label="Thuật ngữ" title="Thuật ngữ / corpus cho nhận dạng" tone={panel === 'terms' ? 'active' : 'default'} onClick={() => setPanel((p) => (p === 'terms' ? null : 'terms'))} />
            <RailBtn icon="article" label="Bối cảnh" title="Bối cảnh (brief) cho bản dịch" tone={panel === 'brief' ? 'active' : 'default'} onClick={() => setPanel((p) => (p === 'brief' ? null : 'brief'))} />
            <RailBtn icon="save" label="Lưu transcript" title="Lưu bản ghi phiên dịch" onClick={() => { void lane.saveSession() }} />
            {lane.saveStatus && <div className="px-3 pt-0.5 text-[11px] text-on-surface-variant">{lane.saveStatus}</div>}
          </div>
        </div>

        {/* Chân rail: hệ thống (bỏ "Chế độ nhanh" — offline-only) */}
        <div className="shrink-0 p-2.5 space-y-0.5 border-t border-outline-variant">
          <RailBtn icon="settings" label="Cài đặt & thiết bị"
            dot={preflightOk ? 'bg-secondary' : 'bg-primary animate-pulse'}
            title={preflightOk ? 'Thiết bị sẵn sàng · mở Cài đặt' : `Chưa đủ điều kiện (${preflightPass}/${checks.length}) · mở Cài đặt`}
            onClick={() => { setPanel(null); setSettingsOpen(true) }} />
          <RailBtn icon={isFs ? 'fullscreen_exit' : 'fullscreen'} label={isFs ? 'Thoát toàn màn' : 'Toàn màn hình'} onClick={toggleFullscreen} />
          <RailBtn icon="logout" label="Thoát console" title="Về Bảng chỉ huy" onClick={() => nav('/prep')} />
        </div>
      </aside>

      {/* ══════════ CỘT PHẢI — monitor kết quả ══════════ */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* MONITOR STRIP */}
        <header className="shrink-0 h-14 flex items-center gap-4 px-5 border-b border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`w-3 h-3 rounded-full shrink-0 ${ann.dot} ${ann.anim}`}></span>
            <span className={`font-label-caps text-label-caps tracking-wide truncate ${ann.text}`}>{ann.label}{lane.statusDetail ? ` · ${lane.statusDetail}` : ''}</span>
            {lane.running && <span className="font-label-caps text-label-caps text-on-surface-variant tabular-nums ml-1" style={{ fontFamily: 'ui-monospace, monospace' }}>{mmss}</span>}
          </div>
          <div className="mx-auto flex items-center gap-2 px-3 py-1.5 rounded-full border border-outline-variant bg-surface-container-lowest">
            <span className={`font-label-caps text-label-caps ${lane.direction === 'vi2ja' ? 'text-secondary' : 'text-on-surface-variant'}`}>VI</span>
            <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">swap_horiz</span>
            <span className={`jp-text font-label-caps text-label-caps ${lane.direction === 'ja2vi' ? 'text-secondary' : 'text-on-surface-variant'}`}>JA</span>
          </div>
        </header>

        {/* CENTER STAGE */}
        <main className="flex-1 min-h-0 relative flex flex-col bg-gradient-radial overflow-hidden">
          {lane.error && (
            <div className="shrink-0 mx-4 mt-4 border border-error text-error font-label-caps text-label-caps px-4 py-2.5 rounded-DEFAULT flex items-center gap-2 z-20">
              <span className="material-symbols-outlined text-base" aria-hidden="true">error</span>
              <span className="truncate">{lane.error}</span>
            </div>
          )}

          {live ? (
            /* LIVE result monitor */
            <div className="flex-1 min-h-0 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-surface-container/40 to-transparent pointer-events-none z-0"></div>
              <div className="absolute inset-0 flex z-10">
                <div className="flex-1 min-w-0">
                  <MonitorColumn label={<span className="font-label-caps text-label-caps tracking-widest text-secondary border border-secondary/60 rounded px-2.5 py-0.5">TIẾNG VIỆT</span>} lines={viCol} />
                </div>
                <div className="w-px relative flex flex-col items-center justify-center opacity-50 shrink-0" aria-hidden="true">
                  <div className="w-full h-full bg-gradient-to-b from-transparent via-secondary to-transparent"></div>
                  <div className="absolute w-2 h-2 rotate-45 border border-secondary bg-primary-container"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <MonitorColumn jp label={<span className="jp-text font-label-caps text-label-caps tracking-widest text-secondary border border-secondary/60 rounded px-2.5 py-0.5">日本語</span>} lines={jaCol} />
                </div>
              </div>
              {viCol.length === 0 && jaCol.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 pointer-events-none z-20">
                  <span className="material-symbols-outlined text-secondary opacity-70 listening-pulse" style={{ fontSize: '40px' }} aria-hidden="true">hearing</span>
                  <span className="font-semibold text-xl text-secondary opacity-90">Đang chờ diễn giả…</span>
                  <span className="jp-text text-base text-on-surface-variant opacity-70">お待ちください</span>
                </div>
              )}
            </div>
          ) : setupPhase ? (
            /* Connecting / reconnecting */
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-5 px-6">
              <span className="material-symbols-outlined text-secondary listening-pulse" style={{ fontSize: '52px' }} aria-hidden="true">sync</span>
              <span className={`font-headline-sm text-headline-sm ${ann.text}`}>{ann.label}</span>
            </div>
          ) : (
            /* STANDBY stage — ceremonial */
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-7 px-6 text-center">
              <div className="flex flex-col items-center">
                <div className="flex items-end gap-3">
                  <span className="font-brand text-secondary leading-none" style={{ fontSize: 'clamp(3.5rem, 11vw, 7rem)', textShadow: '0 0 40px rgba(232,184,75,0.30)' }}>20</span>
                  <span className="jp-text text-secondary font-bold pb-2 opacity-90" style={{ fontSize: 'clamp(1.1rem, 3.5vw, 2.2rem)' }}>周年</span>
                </div>
                <div className="mt-2 flex items-center gap-3 font-label-caps text-label-caps text-on-surface-variant tracking-[0.3em]">
                  <span className="h-px w-8 bg-outline-variant"></span>2006 – 2026<span className="h-px w-8 bg-outline-variant"></span>
                </div>
                <span className="mt-2 font-bold tracking-[0.24em] text-on-surface uppercase text-lg">ESUHAI</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className={`font-label-caps text-label-caps tracking-[0.3em] ${keysReady ? 'text-secondary' : 'text-error'}`}>
                  {keysReady ? 'PROYAKU · SẴN SÀNG' : 'PROYAKU · CHỜ KHOÁ DỊCH VỤ'}
                </span>
                <span className="text-sm text-on-surface-variant max-w-md leading-relaxed">
                  {keysReady
                    ? 'Nhấn ▶ Bắt đầu dịch ở thanh bên trái để lên sóng — kết quả song ngữ sẽ hiện ngay tại đây.'
                    : 'Chưa nhập khoá dịch vụ (API Key) — mở ⚙ Cài đặt & thiết bị để nhập.'}
                </span>
              </div>
            </div>
          )}

          {/* Trust-HUD strip (§1.1 — TRỄ · ĐỌC · KẾT NỐI) */}
          {lane.running && (
            <div className="shrink-0 border-t border-outline-variant/60 bg-surface-container-lowest px-5 py-2 overflow-x-auto z-20">
              <div className="flex items-center gap-x-6 gap-y-1 whitespace-nowrap font-label-caps text-label-caps" style={{ fontFamily: 'ui-monospace, monospace' }}>
                <span className="text-on-surface-variant">TRỄ <span className="text-secondary">draft {lat ? lat.draftP50 : '—'}</span> · refine {lat ? lat.refineP50 : '—'} · tts {lat ? lat.ttsP50 : '—'}</span>
                <span className="text-on-surface-variant">ĐỌC <span className="text-secondary">ttsQueue {diag?.ttsQueueLength ?? 0}</span> · gate {diag?.gateActive ? 'on' : 'off'}</span>
                <span className="text-on-surface-variant">KẾT NỐI <span className="text-secondary">reconnects {diag?.reconnectAttempts ?? 0}</span></span>
              </div>
            </div>
          )}

          {/* thin always-on VU line */}
          <div className="shrink-0 h-1 w-full bg-surface-container">
            <div className="h-full transition-all duration-100 bg-gradient-to-r from-primary-fixed via-secondary to-secondary" style={{ width: `${Math.round(Math.min(1, lane.level) * 100)}%` }}></div>
          </div>
        </main>
      </div>

      {/* ══════════ LIVE-CONTROL FLYOUTS (cạnh rail) ══════════ */}
      {panel && (
        <>
          <div className="absolute inset-0 z-30" onClick={() => setPanel(null)}></div>
          <div className="absolute top-1/2 -translate-y-1/2 left-[256px] z-40 w-[min(80vw,400px)] rounded-2xl border border-outline-variant bg-surface-container-high p-4 shadow-2xl">
            {panel === 'gate' && (
              <div className="space-y-3">
                <h3 className="font-label-caps text-label-caps text-on-surface">Chống dội (gate)</h3>
                <select value={lane.gateMode} onChange={(e) => lane.setGateMode(e.target.value as typeof lane.gateMode)} disabled={lane.running} className={SELECT_CLS}>
                  <option value="auto">auto (loa ngoài)</option>
                  <option value="always">always (họp online)</option>
                  <option value="off">off (tai nghe)</option>
                </select>
                <p className="text-[12px] text-on-surface-variant leading-relaxed">Chế độ gate chốt khi Bắt đầu (đổi lúc đang chạy không áp).</p>
              </div>
            )}
            {panel === 'voice' && (
              <div className="space-y-3">
                <h3 className="font-label-caps text-label-caps text-on-surface">Giọng đọc</h3>
                <div>
                  <label htmlFor="online-voice-ja" className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">Giọng tiếng Nhật</label>
                  <select id="online-voice-ja" value={lane.voiceJa} onChange={(e) => lane.setVoiceJa(e.target.value)} className={SELECT_CLS}>
                    <option value="">— Giọng đã cài sẵn —</option>
                    {voiceOptions(lane.voices.ja)}
                  </select>
                </div>
                <div>
                  <label htmlFor="online-voice-vi" className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">Giọng tiếng Việt</label>
                  <select id="online-voice-vi" value={lane.voiceVi} onChange={(e) => lane.setVoiceVi(e.target.value)} className={SELECT_CLS}>
                    <option value="">— Giọng đã cài sẵn —</option>
                    {voiceOptions(lane.voices.vi)}
                  </select>
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">Tốc độ đọc</span>
                  <div className="flex items-center gap-0.5 bg-surface rounded-full p-0.5 w-fit">
                    {([['auto', 'Tự động theo nhịp nói'], ['manual', 'Đặt tay']] as const).map(([m, label]) => (
                      <button key={m} type="button" onClick={() => lane.setSpeedMode(m)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${lane.speedMode === m ? 'bg-secondary text-on-secondary shadow' : 'text-on-surface-variant hover:text-on-surface'}`}>{label}</button>
                    ))}
                  </div>
                  {lane.speedMode === 'manual' && (
                    <div className="flex items-center gap-2 mt-2">
                      <input type="range" min={ONLINE_SPEED_RANGE.min} max={ONLINE_SPEED_RANGE.max} step={ONLINE_SPEED_RANGE.step}
                        value={lane.manualSpeed} onChange={(e) => lane.setManualSpeed(Number(e.target.value))}
                        aria-label="Tốc độ đọc thủ công" className="flex-1 accent-[var(--secondary)]" />
                      <span className="w-12 shrink-0 text-right tabular-nums text-sm text-on-surface">{lane.manualSpeed.toFixed(2)}×</span>
                    </div>
                  )}
                </div>
                <button onClick={() => { void lane.refreshVoices() }} className="inline-flex items-center gap-1.5 text-xs text-secondary hover:underline">
                  <span className={`material-symbols-outlined text-[15px] ${lane.voicesStatus === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true">{lane.voicesStatus === 'loading' ? 'progress_activity' : 'refresh'}</span>Tải lại danh sách giọng
                </button>
                {lane.voicesStatus === 'error' && <p className="text-[11px] text-on-surface-variant">Chưa lấy được danh sách giọng — vẫn dùng giọng đã cài sẵn.</p>}
              </div>
            )}
            {panel === 'terms' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-label-caps text-label-caps text-on-surface">Thuật ngữ / corpus (≤ 2000 ký tự)</h3>
                  <button onClick={() => { void loadPrep(true) }} disabled={lane.running} title="Nạp Từ điển · Bộ nhớ diễn giả · buổi đang chọn"
                    className="inline-flex items-center gap-1 rounded-lg border border-outline-variant text-on-surface-variant px-2.5 py-1 text-xs hover:text-primary hover:border-primary transition-colors disabled:opacity-50">
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">download</span>Nạp từ Chuẩn bị
                  </button>
                </div>
                <textarea value={lane.terms} onChange={(e) => lane.setTerms(e.target.value)} rows={6} maxLength={2000} disabled={lane.running}
                  className={TEXTAREA_CLS} placeholder="Tên riêng, thuật ngữ — mỗi mục một dòng…" />
                <div className="text-right text-[11px] text-on-surface-variant tabular-nums">{lane.terms.length}/2000</div>
                {prepCounts}
              </div>
            )}
            {panel === 'brief' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-label-caps text-label-caps text-on-surface">Bối cảnh (brief)</h3>
                  <button onClick={() => { void loadPrep(true) }} disabled={lane.running} title="Nạp bối cảnh từ buổi đang chọn"
                    className="inline-flex items-center gap-1 rounded-lg border border-outline-variant text-on-surface-variant px-2.5 py-1 text-xs hover:text-primary hover:border-primary transition-colors disabled:opacity-50">
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">download</span>Nạp từ Chuẩn bị
                  </button>
                </div>
                <textarea value={lane.brief} onChange={(e) => lane.setBrief(e.target.value)} rows={6} disabled={lane.running}
                  className={TEXTAREA_CLS} placeholder="Bối cảnh buổi dịch để bản dịch sát nghĩa hơn…" />
                {prepCounts}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════ SETTINGS DRAWER (pre-event) ══════════ */}
      {settingsOpen && (
        <>
          <div className="absolute inset-0 bg-background/60 z-30" onClick={() => setSettingsOpen(false)}></div>
          <aside className="absolute top-0 right-0 h-full w-full max-w-[400px] bg-surface-container-lowest border-l border-outline-variant z-40 flex flex-col shadow-2xl">
            <div className="shrink-0 h-14 flex items-center gap-2 px-5 border-b border-outline-variant">
              <span className="material-symbols-outlined text-secondary" aria-hidden="true">settings</span>
              <span className="font-semibold text-on-surface">Cài đặt phiên (Pre-event)</span>
              <button onClick={() => setSettingsOpen(false)} title="Đóng" className="ml-auto w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* KIỂM TRA */}
              <section>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`material-symbols-outlined ${preflightOk ? 'text-secondary' : 'text-primary'}`} aria-hidden="true">{preflightOk ? 'check_circle' : 'checklist'}</span>
                  <span className={`font-label-caps text-label-caps ${preflightOk ? 'text-secondary' : 'text-on-surface'}`}>{preflightOk ? 'SẴN SÀNG — TẤT CẢ ĐÃ ĐẠT' : `KIỂM TRA · ${preflightPass}/${checks.length} đạt`}</span>
                </div>
                <div className="space-y-1.5">
                  {checks.map((it) => (
                    <div key={it.label} className="flex items-center gap-2 font-label-caps text-label-caps">
                      <span className={`material-symbols-outlined ${it.ok ? 'text-secondary' : 'text-error'}`} style={{ fontSize: '1.05rem' }} aria-hidden="true">{it.ok ? 'check_circle' : 'cancel'}</span>
                      <span className={it.ok ? 'text-on-surface-variant' : 'text-error'}>{it.label}</span>
                    </div>
                  ))}
                </div>
                {!keysReady && (
                  <button onClick={() => nav('/settings#ok')} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-outline-variant text-on-surface-variant px-3 py-1.5 text-xs hover:text-primary hover:border-primary transition-colors">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">key</span>Nhập khoá dịch vụ (API Key)
                  </button>
                )}
              </section>

              <div className="h-px bg-outline-variant"></div>

              {/* Nguồn vào */}
              <section className="space-y-3">
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">mic_external_on</span><h3 className="font-label-caps text-label-caps text-on-surface">Nguồn vào</h3></div>
                <div>
                  <label htmlFor="online-console-mic" className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">Micro</label>
                  <select id="online-console-mic" value={lane.deviceId} onChange={(e) => lane.setDeviceId(e.target.value)} disabled={lane.running} className={SELECT_CLS}>
                    <option value="">Mặc định hệ thống</option>
                    {lane.inputDevices.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Micro ${i + 1}`}</option>)}
                  </select>
                </div>
                <button onClick={() => { void lane.refreshDevices() }} disabled={lane.running}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant text-on-surface-variant px-3 py-1.5 text-xs hover:text-primary hover:border-primary transition-colors disabled:opacity-50">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">refresh</span>Quét lại
                </button>
                <label className="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant cursor-pointer">
                  <input type="checkbox" checked={lane.nearMicGate} onChange={(e) => lane.setNearMicGate(e.target.checked)} disabled={lane.running} className="accent-secondary" />
                  Noise gate (near-mic)
                </label>
                {/* TASK 11.13 (Phase 4) thêm ô "Bỏ qua tiếng xì xào hội trường" ngay dưới đây. */}
              </section>

              <div className="h-px bg-outline-variant"></div>

              {/* Chiều dịch */}
              <section className="space-y-3">
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">swap_horiz</span><h3 className="font-label-caps text-label-caps text-on-surface">Chiều dịch</h3></div>
                <div className="flex items-center gap-0.5 bg-surface rounded-full p-0.5 w-fit">
                  {(['vi2ja', 'ja2vi'] as const).map((d) => (
                    <button key={d} type="button" disabled={lane.running} onClick={() => lane.setDirection(d)}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors ${lane.direction === d ? 'bg-secondary text-on-secondary shadow' : 'text-on-surface-variant hover:text-on-surface'} ${lane.running ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {d === 'vi2ja' ? 'VI → JA' : 'JA → VI'}
                    </button>
                  ))}
                </div>
                {/* TASK 6 (Phase 3) thêm ô "một mic hai chiều" ngay dưới. */}
              </section>

              <div className="h-px bg-outline-variant"></div>

              {/* Ngõ ra */}
              <section className="space-y-3">
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">volume_up</span><h3 className="font-label-caps text-label-caps text-on-surface">Ngõ ra</h3></div>
                <div>
                  <label htmlFor="online-console-out" className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">Thiết bị ra</label>
                  <select id="online-console-out" value={lane.outputDeviceId} onChange={(e) => lane.setOutputDeviceId(e.target.value)} className={SELECT_CLS}>
                    <option value="">Mặc định hệ thống</option>
                    {lane.outputDevices.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Loa ${i + 1}`}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant cursor-pointer">
                  <input type="checkbox" checked={lane.speakEnabled} onChange={(e) => lane.setSpeakEnabled(e.target.checked)} className="accent-secondary" />
                  Đọc bản dịch
                </label>
                <div>
                  <label htmlFor="online-console-gate" className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">Chống dội (gate)</label>
                  <select id="online-console-gate" value={lane.gateMode} onChange={(e) => lane.setGateMode(e.target.value as typeof lane.gateMode)} disabled={lane.running} className={SELECT_CLS}>
                    <option value="auto">auto (loa ngoài)</option>
                    <option value="always">always (họp online)</option>
                    <option value="off">off (tai nghe)</option>
                  </select>
                </div>
                <p className="text-[12px] text-on-surface-variant leading-relaxed">Đổi thiết bị ra áp dụng từ câu kế tiếp. Chế độ gate chốt khi Bắt đầu (đổi lúc đang chạy không áp).</p>
              </section>

              <div className="h-px bg-outline-variant"></div>

              {/* Chẩn đoán */}
              <section className="space-y-2">
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">monitor_heart</span><h3 className="font-label-caps text-label-caps text-on-surface">Chẩn đoán</h3></div>
                {diag ? (
                  <div className="font-label-caps text-label-caps text-on-surface-variant space-y-1" style={{ fontFamily: 'ui-monospace, monospace' }}>
                    <div>reconnects {diag.reconnectAttempts} · silent {diag.silentReconnects} · sinceEvent {diag.secondsSinceLastEvent.toFixed(1)}s</div>
                    <div>voiced {diag.voicedMsRecent}ms · ghosts {diag.droppedGhosts}</div>
                    <div>draft {diag.draftCalls} (dup {diag.draftSkipped.duplicate}·rate {diag.draftSkipped['rate-limit']}·infl {diag.draftSkipped['in-flight']})</div>
                    <div>refine {diag.refineCalls} · retries {diag.refineRetries}</div>
                    <div>ttsQueue {diag.ttsQueueLength} · gate {diag.gateActive ? 'on' : 'off'} · gatedMs {diag.gatedMs}</div>
                    {lat && <div>p50 draft {lat.draftP50}·refine {lat.refineP50}·tts {lat.ttsP50}</div>}
                    {lat && <div>p90 draft {lat.draftP90}·refine {lat.refineP90}·tts {lat.ttsP90}</div>}
                    <div>usage {diag.lastUsageReportAt ? new Date(diag.lastUsageReportAt).toLocaleTimeString() : '—'}</div>
                  </div>
                ) : <div className="text-[12px] text-on-surface-variant">Chưa có dữ liệu (phiên chưa chạy).</div>}
              </section>
            </div>
          </aside>
        </>
      )}

      {showKeyModal && <MissingKeysModal onClose={() => setShowKeyModal(false)} onGoSettings={() => nav('/settings#ok')} />}
    </div>
  )
}

export default OnlineConsole
