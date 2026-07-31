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
import { useOnlineLane, fetchOnlineConfigStatus, summarizePrepDocs, ONLINE_SPEED_RANGE, SUBTITLE_FONT, type LaneStatus, type OnlineVoice, type AudienceLine, type WallOutput, type WallDock, type ScriptMatcherEntry } from '../index'
import { useConferenceMode } from '../../../ConferenceModeContext'
import { useActiveEvent } from '../../../ActiveEventContext'
import { collectPrepPack, collectPrepDocuments, collectPrepHeader, type PrepPack } from '../../../prepData'
import { savePrepSummary, clearPrepSummary, getPrepSummary, type PrepSummary } from '../../../prepSummary'
import { kbScopeId } from '../../../kbscope'
import { getScriptLocal } from '../../../script'
import SubtitleParagraphs from '../../../../components/SubtitleParagraphs'

type CfgStatus = Awaited<ReturnType<typeof fetchOnlineConfigStatus>>

const SELECT_CLS =
  'field-lux transition-shadow w-full bg-surface text-on-surface border border-outline-variant rounded-DEFAULT py-2 pl-3 pr-9 ' +
  'focus:ring-0 focus:border-secondary appearance-none cursor-pointer disabled:opacity-50 text-sm'
const TEXTAREA_CLS =
  'w-full bg-surface text-on-surface border border-outline-variant rounded-DEFAULT py-2 px-3 text-sm ' +
  'focus:ring-0 focus:border-secondary field-lux resize-none disabled:opacity-50'

// M9 — the approved script the live matcher is allowed to speak from. Only rows a human APPROVED and
// that carry BOTH sides qualify: a draft row is somebody's unchecked guess, and a row with an empty
// translation would put a blank line on the audience wall. Read-only use of the Chuẩn bị store, the
// same arrangement as collectPrepPack above.
function scriptCountLine(c: { approved: number; total: number }): string {
  if (c.approved > 0) return `Kịch bản: ${c.approved}/${c.total} dòng đã duyệt — câu nào trùng kịch bản sẽ đọc đúng câu đã duyệt.`
  if (c.total > 0) return `Kịch bản: có ${c.total} dòng nhưng chưa dòng nào được duyệt — máy vẫn tự dịch toàn bộ.`
  return 'Kịch bản: chưa có dòng nào — máy tự dịch toàn bộ.'
}

function loadScriptForLane(eventId: string): { rows: ScriptMatcherEntry[]; total: number } {
  try {
    const all = getScriptLocal(eventId)
    return { rows: all.filter((r) => r.status === 'approved' && r.src.trim() !== '' && r.dst.trim() !== ''), total: all.length }
  } catch {
    return { rows: [], total: 0 } // corrupt/absent local script → translate everything, never crash the console
  }
}

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

type Panel = 'gate' | 'voice' | 'terms' | 'brief' | 'wall' | null

function wallSupportLine(support: string, count: number): string {
  if (support === 'multi') return `Thấy ${count} màn hình — chọn màn cho từng cửa sổ rồi bấm Xuất.`
  if (support === 'single') return 'Chỉ thấy 1 màn — mở cửa sổ xong kéo sang màn hội trường rồi bấm F.'
  if (support === 'unsupported') return 'Trình duyệt này chưa tự nhận diện màn hình. Vẫn xuất được — mở xong kéo cửa sổ sang màn hội trường rồi bấm F.'
  if (support === 'denied') return 'Chưa được phép sắp cửa sổ. Bấm Quét màn hình rồi chọn "Cho phép", hoặc kéo tay cũng được.'
  return 'Bấm Quét màn hình để nhận diện màn hội trường (hoặc kéo tay sau khi xuất).'
}
function wallStatusLine(enabled: number, open: number): string {
  if (enabled === 0) return 'Chưa bật màn nào.'
  if (open === 0) return `Chưa mở cửa sổ nào (đã bật ${enabled} màn). Bấm Xuất ra màn hình.`
  if (open < enabled) return `Đang mở ${open}/${enabled} cửa sổ — có màn đã bị đóng. Bấm Xuất lại để mở lại.`
  return `Đang mở ${open} cửa sổ. Kéo sang màn hội trường rồi bấm F để phóng toàn màn hình.`
}

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
  const [scriptCount, setScriptCount] = useState({ approved: 0, total: 0 })
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

  // M9: the script rides along. There is no box for it to overwrite — it is data, not typing — so it is
  // reloaded on every Nạp, which is also how a script edited in Chuẩn bị reaches a console already open.
  // Stable identity (useCallback) so the auto-load effect below can depend on it honestly instead of
  // hiding it from the dependency array — the effect's own `prepLoadedRef` guard is what keeps it to one
  // run per (event × direction), not a short dependency list.
  const applyScript = useCallback(() => {
    const { rows, total } = loadScriptForLane(event?.id ?? '')
    lane.setScript(rows)
    setScriptCount({ approved: rows.length, total })
  }, [event, lane])

  // ── TASK 4: fill the Thuật ngữ / Bối cảnh boxes from the Chuẩn bị stores ──
  const loadPrep = async (overwrite: boolean) => {
    const pack = await collectPrepPack(event, lane.direction)
    setPrep(pack)
    if (overwrite) { lane.setTerms(pack.terms); lane.setBrief(pack.brief) }
    applyScript()
  }

  // ── M14: let the model read the imported documents and WRITE the Bối cảnh ──
  // The mechanical brief above can only paste the opening of each file, so a 40-page gala script arrives
  // as its cover page. This sends the documents to the server (the same model that refines every line
  // already lives there) and gets back a real brief plus a list of proper nouns.
  //
  // Off the live path on purpose: the button is disabled while a session runs, the answer takes tens of
  // seconds, and it lands in a box the operator reads, edits and approves before pressing Bắt đầu. The
  // result is saved per event+direction so it survives a reload and is not paid for twice.
  const [ai, setAi] = useState<{ busy: boolean; error: string; note: string }>({ busy: false, error: '', note: '' })
  // Held in state, not read during render: this component re-renders on every subtitle line, and a
  // localStorage read per line during a live session is a cost for nothing. It is refreshed when the
  // session or its direction changes, and after a generate or a drop — the only moments it can change.
  const [savedSummary, setSavedSummary] = useState<PrepSummary | undefined>(undefined)
  const refreshSummary = useCallback(() => {
    setSavedSummary(event ? getPrepSummary(kbScopeId(event), lane.direction) : undefined)
  }, [event, lane.direction])
  useEffect(() => { refreshSummary() }, [refreshSummary])
  const runAiSummary = async () => {
    if (!event) { setAi({ busy: false, error: 'Chưa chọn buổi nào.', note: '' }); return }
    const documents = collectPrepDocuments(event)
    if (!documents.length) { setAi({ busy: false, error: 'Buổi này chưa có tài liệu nào trong phần Chuẩn bị.', note: '' }); return }
    setAi({ busy: true, error: '', note: `Đang đọc ${documents.length} tài liệu…` })
    try {
      const result = await summarizePrepDocs({
        sourceLanguage: lane.direction === 'vi2ja' ? 'vi' : 'ja',
        targetLanguage: lane.direction === 'vi2ja' ? 'ja' : 'vi',
        header: collectPrepHeader(event),
        documents,
      })
      savePrepSummary(kbScopeId(event), {
        brief: result.brief, terms: result.terms, dir: lane.direction,
        docNames: documents.map((d) => d.name), usedChars: result.usedChars, at: new Date().toISOString(),
      })
      refreshSummary()
      // Reload through the ONE existing path, so the AI terms are merged with the glossary and the
      // speaker roster under the same 40-line budget instead of replacing them.
      await loadPrep(true)
      setAi({ busy: false, error: '', note: `Xong — đã đọc ${result.documents} tài liệu (${result.usedChars.toLocaleString('vi-VN')} ký tự). Đọc lại và sửa nếu cần.` })
    } catch (error) {
      setAi({ busy: false, error: String((error as Error)?.message ?? error), note: '' })
    }
  }
  const dropAiSummary = async () => {
    if (!event) return
    clearPrepSummary(kbScopeId(event), lane.direction)
    refreshSummary()
    setAi({ busy: false, error: '', note: 'Đã bỏ bản tóm tắt AI — quay lại bối cảnh ghép sẵn.' })
    await loadPrep(true)
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
      applyScript()
    })
    return () => { cancelled = true }
  }, [event, lane.direction, lane, applyScript])

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

  const prepCounts = (
    <div className="text-[11px] text-on-surface-variant leading-relaxed">
      {prep && (
        <div>
          {prep.stats.termLines} thuật ngữ · {prep.stats.glossary} mục từ điển · {prep.stats.speakers} diễn giả
          {prep.stats.documents > 0 ? ` · ${prep.stats.documents} tài liệu` : ' · chưa có tài liệu nào'}
          {prep.stats.dropped > 0 ? ` · còn ${prep.stats.dropped} mục vượt hạn mức 40 dòng` : ''}
          {!prep.glossaryReachable ? ' · chưa với tới Từ điển trên máy chủ nội bộ' : ''}
          {/* M14 — say which brief is in the box. An operator who cannot tell the AI summary from the
              pasted-together one cannot judge whether it is worth generating again. */}
          {prep.stats.aiBrief ? ' · bối cảnh do AI tóm tắt từ tài liệu' : ''}
          {prep.stats.aiTerms > 0 ? ` · ${prep.stats.aiTerms} thuật ngữ AI gợi ý từ tài liệu` : ''}
        </div>
      )}
      {/* M9 — an empty or unapproved script behaves exactly like a script that never matches, so it must
          be said out loud here; nothing else on this screen would tell the operator before going live. */}
      <div>{scriptCountLine(scriptCount)}</div>
    </div>
  )

  // ── TASK 7.4: audience wall placement ──
  const [wallNote, setWallNote] = useState<{ msg: string; atCount: number } | null>(null)
  const updateWallOutput = (id: string, patch: Partial<WallOutput>) => lane.setWallOutputs(lane.wallOutputs.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  const handleExportWall = () => {
    const r = lane.openWall()
    const msg = r.blocked > 0
      ? `Trình duyệt đang chặn cửa sổ bật lên (mở được ${r.opened}/${r.total}) — cho phép rồi bấm Xuất lại.`
      : r.total === 0 ? 'Chưa bật màn nào — chọn ít nhất một màn rồi bấm Xuất.' : ''
    setWallNote(msg ? { msg, atCount: r.opened } : null)
  }
  // Scan the screens the first time the flyout opens — the permission prompt must be tied to the action.
  useEffect(() => { if (panel === 'wall' && lane.wallSupport === 'idle') void lane.scanWall() }, [panel, lane.wallSupport, lane])
  const enabledWallCount = lane.wallOutputs.filter((o) => o.enabled).length
  const wallNoteMsg = wallNote && wallNote.atCount === lane.wallOpenIds.length ? wallNote.msg : ''

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

  // Two LANGUAGE columns fed from directedLines (TASK 6.3): the Vietnamese side of each line goes to the
  // VI column, the Japanese side to the JA column — each column forces its own language into the shared
  // subtitle block (TASK 8), so jp-text / lineBreak key off the column, not the utterance.
  const viColLines: AudienceLine[] = lane.directedLines.map((l) => ({ ...l, targetText: l.dir === 'vi2ja' ? l.sourceText : l.targetText, dir: 'ja2vi' }))
  const jaColLines: AudienceLine[] = lane.directedLines.map((l) => ({ ...l, targetText: l.dir === 'vi2ja' ? l.targetText : l.sourceText, dir: 'vi2ja' }))

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
          {/* M13 · NGƯNG NGHE — for the parts of a gala nobody is speaking at: a performance, a musical
              number, a video. The microphone keeps its socket but puts silence on the wire, so the
              recogniser cannot invent lyrics out of the music. Only while running, right under Dừng, so
              the technician never has to hunt for it mid-show. */}
          {lane.running && (
            <RailBtn icon={lane.listenPaused ? 'hearing_disabled' : 'hearing'}
              label={lane.listenPaused ? 'ĐANG NGƯNG NGHE' : 'Ngưng nghe'}
              tone={lane.listenPaused ? 'danger' : 'default'}
              ariaLabel={lane.listenPaused ? 'Đang ngưng nghe — bấm để nghe lại' : 'Ngưng nghe'}
              title="Bấm khi có tiết mục / nhạc / chiếu video — máy ngưng nghe, không ghi chữ nào. Bấm lại để nghe tiếp."
              onClick={() => lane.setListenPaused(!lane.listenPaused)} />
          )}

          {/* B · MÀN KHÁN GIẢ */}
          <div className="space-y-0.5">
            <div className="px-2 pb-1 font-label-caps text-[10px] text-on-surface-variant/55 tracking-[0.16em]">MÀN KHÁN GIẢ</div>
            <RailBtn icon={lane.twoWay ? 'sync_alt' : 'east'} label="Một mic hai chiều" title="Một micro cho cả VI và JA — máy tự nhận mỗi câu"
              tone={lane.twoWay ? 'active' : 'default'} disabled={lane.running} onClick={() => lane.setTwoWay(!lane.twoWay)} />
            <RailBtn icon="cast" label="Xuất màn khán giả" title="Định tuyến phụ đề ra các màn khán giả"
              tone={panel === 'wall' ? 'active' : 'default'} dot={lane.wallOpenIds.length > 0 ? 'bg-secondary' : undefined}
              onClick={() => setPanel((p) => (p === 'wall' ? null : 'wall'))} />
          </div>

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
            {/* TASK 12.3 — a failing auto-save is silent (no download storm) but must not be invisible. */}
            {diag?.lastSaveOk === false && (
              <div className="px-3 pt-0.5 text-[11px] text-error">⚠ Lưu tự động đang lỗi — bấm “Lưu transcript” để tải bản ghi về máy.</div>
            )}
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
          {/* M13: a microphone that was told to stop listening looks EXACTLY like a broken one. The one
              way this feature can cost the ceremony a speech is a technician who forgets to release it,
              so while it is held the state is unmissable in the monitor strip, not only on the rail. */}
          {lane.running && lane.listenPaused && (
            <button type="button" onClick={() => lane.setListenPaused(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-error text-on-error font-label-caps text-label-caps animate-pulse shrink-0"
              title="Bấm để nghe lại">
              <span className="material-symbols-outlined text-base" aria-hidden="true">hearing_disabled</span>
              ĐANG NGƯNG NGHE — bấm để nghe lại
            </button>
          )}
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
            /* LIVE result monitor — two language columns through the shared subtitle block (top-anchored). */
            <div className="flex-1 min-h-0 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-surface-container/40 to-transparent pointer-events-none z-0"></div>
              <div className="absolute inset-0 flex z-10">
                <div className="relative flex-1 min-w-0">
                  <span className="absolute top-2 left-1/2 -translate-x-1/2 z-10 font-label-caps text-label-caps tracking-widest text-secondary border border-secondary/60 rounded px-2.5 py-0.5 bg-surface-container-lowest/80">TIẾNG VIỆT</span>
                  <SubtitleParagraphs lines={viColLines} direction="ja2vi" fontSize={lane.subtitleFont} />
                </div>
                <div className="w-px relative flex flex-col items-center justify-center opacity-50 shrink-0" aria-hidden="true">
                  <div className="w-full h-full bg-gradient-to-b from-transparent via-secondary to-transparent"></div>
                  <div className="absolute w-2 h-2 rotate-45 border border-secondary bg-primary-container"></div>
                </div>
                <div className="relative flex-1 min-w-0">
                  <span className="absolute top-2 left-1/2 -translate-x-1/2 z-10 jp-text font-label-caps text-label-caps tracking-widest text-secondary border border-secondary/60 rounded px-2.5 py-0.5 bg-surface-container-lowest/80">日本語</span>
                  <SubtitleParagraphs lines={jaColLines} direction="vi2ja" fontSize={lane.subtitleFont} />
                </div>
              </div>
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
                {/* M14 — the AI summariser. Disabled while a session runs, like every other box on this
                    panel: the brief is latched by start() and the model must never be asked to re-read a
                    40-page script in the middle of a ceremony. */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => { void runAiSummary() }} disabled={lane.running || ai.busy}
                    title="Đọc toàn bộ tài liệu đã nhập ở Chuẩn bị rồi tự viết bối cảnh"
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/60 text-primary px-2.5 py-1 text-xs hover:bg-primary/10 transition-colors disabled:opacity-50">
                    <span className={`material-symbols-outlined text-[15px] ${ai.busy ? 'animate-spin' : ''}`} aria-hidden="true">{ai.busy ? 'progress_activity' : 'auto_awesome'}</span>
                    {ai.busy ? 'Đang tóm tắt…' : 'Tóm tắt tài liệu bằng AI'}
                  </button>
                  {savedSummary && !ai.busy && (
                    <button onClick={() => { void dropAiSummary() }} disabled={lane.running} title="Quay lại bối cảnh ghép sẵn từ Chuẩn bị"
                      className="inline-flex items-center gap-1 rounded-lg border border-outline-variant text-on-surface-variant px-2.5 py-1 text-xs hover:text-error hover:border-error transition-colors disabled:opacity-50">
                      <span className="material-symbols-outlined text-[15px]" aria-hidden="true">undo</span>Bỏ bản AI
                    </button>
                  )}
                </div>
                {ai.busy && <p className="text-[11px] text-primary leading-relaxed">{ai.note} Việc này mất vài chục giây — đừng đóng cửa sổ.</p>}
                {!ai.busy && ai.note && <p className="text-[11px] text-secondary leading-relaxed">{ai.note}</p>}
                {ai.error && <p className="text-[11px] text-error leading-relaxed">{ai.error}</p>}
                {savedSummary && !ai.busy && (
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Bản AI lưu lúc {new Date(savedSummary.at).toLocaleString('vi-VN')} · {savedSummary.docNames.length} tài liệu: {savedSummary.docNames.join(' · ')}
                  </p>
                )}
                {prepCounts}
              </div>
            )}
            {panel === 'wall' && (
              <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 96px)' }}>
                <h3 className="font-label-caps text-label-caps text-on-surface">Xuất màn khán giả</h3>
                <button onClick={() => { void lane.scanWall() }} className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant text-on-surface-variant px-3 py-1.5 text-xs hover:text-primary hover:border-primary transition-colors">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">devices</span>Quét màn hình
                </button>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">{wallSupportLine(lane.wallSupport, lane.wallScreens.length)}</p>
                <div className="space-y-2">
                  {lane.wallOutputs.map((o) => {
                    const open = lane.wallOpenIds.includes(o.id)
                    return (
                      <div key={o.id} className="rounded-lg border border-outline-variant p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                            <input type="checkbox" checked={o.enabled} onChange={(e) => updateWallOutput(o.id, { enabled: e.target.checked })} className="accent-secondary" />{o.label}
                          </label>
                          {o.enabled && <span className={`font-label-caps text-[10px] inline-flex items-center gap-1 ${open ? 'text-secondary' : 'text-on-surface-variant/70'}`}>{open ? <><span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>Đang mở</> : 'Chưa mở'}</span>}
                        </div>
                        {o.enabled && (
                          <div className="flex flex-wrap items-center gap-2">
                            <select value={o.view} onChange={(e) => updateWallOutput(o.id, { view: e.target.value as WallOutput['view'] })} className={`${SELECT_CLS} w-auto text-xs py-1`}>
                              <option value="both">Cả 2 (2 cột)</option>
                              <option value="vi2ja">Chỉ 日本語</option>
                              <option value="ja2vi">Chỉ Tiếng Việt</option>
                            </select>
                            {/* M10: chỗ đặt cửa sổ. "Góc phải/trái" là dải dọc hẹp trên chính màn hình
                                đang ngồi — dùng khi cần vừa dịch vừa mở ứng dụng khác. */}
                            <select value={o.dock ?? 'full'} onChange={(e) => updateWallOutput(o.id, { dock: e.target.value as WallDock })} className={`${SELECT_CLS} w-auto text-xs py-1`}>
                              <option value="full">Cả màn hình</option>
                              <option value="right">Dải dọc góc phải</option>
                              <option value="left">Dải dọc góc trái</option>
                            </select>
                            {lane.wallScreens.length > 1 && (o.dock ?? 'full') === 'full' && (
                              <select value={o.screenIdx ?? ''} onChange={(e) => updateWallOutput(o.id, { screenIdx: e.target.value === '' ? undefined : Number(e.target.value) })} className={`${SELECT_CLS} w-auto text-xs py-1`}>
                                <option value="">— màn —</option>
                                {lane.wallScreens.map((s, i) => <option key={i} value={i}>{s.label || `Màn ${i + 1}`}</option>)}
                              </select>
                            )}
                            <label className="flex items-center gap-1 text-xs text-on-surface-variant cursor-pointer"><input type="checkbox" checked={o.showSource} onChange={(e) => updateWallOutput(o.id, { showSource: e.target.checked })} className="accent-secondary" />Hiện cả bản gốc</label>
                          </div>
                        )}
                        {o.enabled && o.view === 'both' && !lane.twoWay && <p className="text-[10px] text-error/80">Phiên một-chiều: một cột của "cả 2" sẽ trống.</p>}
                        {o.enabled && (o.dock ?? 'full') !== 'full' && <p className="text-[10px] text-on-surface-variant/80">Cửa sổ hẹp: "cả 2" sẽ tự xếp trên–dưới thay vì 2 cột.</p>}
                      </div>
                    )
                  })}
                </div>
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">CỠ CHỮ PHỤ ĐỀ</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={SUBTITLE_FONT.min} max={SUBTITLE_FONT.max} step={SUBTITLE_FONT.step} value={lane.subtitleFont} onChange={(e) => lane.setSubtitleFont(Number(e.target.value))} className="flex-1 accent-[var(--secondary)]" aria-label="Cỡ chữ phụ đề" />
                    <span className="w-10 shrink-0 text-right tabular-nums text-sm text-on-surface">{lane.subtitleFont}px</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleExportWall} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg btn-lux bg-secondary text-on-secondary px-3 py-2 text-sm font-semibold hover:opacity-90">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">cast</span>{lane.wallOpenIds.length > 0 ? 'Xuất lại' : 'Xuất ra màn hình'}
                  </button>
                  {lane.wallOpenIds.length > 0 && (
                    <button onClick={() => lane.closeWall()} className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant text-on-surface-variant px-3 py-2 text-sm hover:text-error hover:border-error transition-colors">
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>Đóng hết
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant">{wallStatusLine(enabledWallCount, lane.wallOpenIds.length)}</p>
                {wallNoteMsg && <p className="text-[11px] text-primary">{wallNoteMsg}</p>}
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
                <label className="flex items-start gap-2 font-label-caps text-label-caps text-on-surface-variant cursor-pointer">
                  <input type="checkbox" checked={lane.roomFilter} onChange={(e) => lane.setRoomFilter(e.target.checked)} disabled={lane.running} className="accent-secondary mt-0.5" />
                  <span>Bỏ qua tiếng xì xào hội trường<br />
                    <span className="font-normal normal-case text-[11px] leading-relaxed">
                      {lane.roomFilter
                        ? 'Máy nghe sẽ bỏ qua tiếng trò chuyện và tiếng ồn xung quanh, chỉ bám giọng chính. Bật khi trên màn hiện ra câu mà không ai phát biểu. Đây KHÔNG phải bộ lọc tiếng ồn: nó không tẩy nhạc ra khỏi giọng nói, chỉ bớt việc máy tưởng nhầm tiếng ồn là lời nói. '
                        : 'Máy nghe bắt mọi thứ lọt vào micro. Mic đi qua bàn trộn thì thu cả phòng — nếu thấy phụ đề hiện câu chẳng ai nói, bật ô này rồi thử lại. '}
                      Chốt khi Bắt đầu — đổi lúc đang chạy thì áp dụng từ lần bắt đầu sau.
                    </span>
                  </span>
                </label>
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
                <label className="flex items-start gap-2 font-label-caps text-label-caps text-on-surface-variant cursor-pointer">
                  <input type="checkbox" checked={lane.twoWay} onChange={(e) => lane.setTwoWay(e.target.checked)} disabled={lane.running} className="accent-secondary mt-0.5" />
                  <span>Một mic hai chiều<br /><span className="font-normal normal-case text-[11px] leading-relaxed">Máy tự nhận ra câu vừa nói là tiếng Việt hay tiếng Nhật rồi dịch sang tiếng còn lại. Chiều đã chọn ở trên chỉ dùng cho câu đầu tiên.</span></span>
                </label>
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
                    {/* M13 — hai chốt chống "có tiếng to nhưng không phải giọng người". `ngưng nghe` là
                        do kỹ thuật viên tự bấm (tổng thời gian đã ngưng trong buổi); `bỏ tiếng không
                        phải giọng` là máy tự bỏ, kèm lý do của chính nó. Cả hai bằng 0 suốt buổi nghĩa
                        là chưa lần nào cần đến — không phải là hỏng. */}
                    <div>ngưng nghe {diag.listenPaused ? 'ĐANG BẬT' : 'tắt'} · tổng {Math.round(diag.pausedMs / 1000)}s</div>
                    {diag.nonSpeechDrops > 0 && (
                      <div>bỏ tiếng không phải giọng {diag.nonSpeechDrops} · {diag.lastNonSpeechReason}</div>
                    )}
                    {/* M11 — turn handling. `cắt` near zero during a busy hall means the client-side
                        commit is not firing and the long stalls are back; `bỏ lạ` and `đổi tiếng` are
                        the two-way guards, and both being zero in a bilingual session is also a signal. */}
                    <div>cắt {diag.manualCommits} · bỏ tiếng lạ {diag.foreignDrops} · đổi tiếng {diag.languageTurns}</div>
                    {/* M13 — ngưỡng cắt đang dùng cho người đang nói. "mặc định" là con số cố định
                        600/800ms; "theo người nói" nghĩa là máy đã đo đủ (từ 8 nhịp ngắt trở lên) và
                        đang dùng nhịp của chính người đó. Số nhịp đứng yên suốt buổi = người nói
                        không ngắt giữa câu, và ngưỡng mặc định vẫn đang giữ việc. */}
                    <div>ngưỡng cắt {diag.pauseWindowMs || '—'}{diag.pauseWindowMs ? 'ms' : ''} · {diag.pauseAdaptive ? 'theo người nói' : 'mặc định'} · {diag.pauseSamples} nhịp</div>
                    {/* M12 — chờ trọn ý. `ghép ý` là số mảnh câu đã được nối lại trước khi dịch (trước
                        đây mỗi mảnh này là một câu dịch nửa vời đọc lên loa); `mảnh` là số câu vẫn phải
                        gửi đi khi chưa có dấu kết — cao bất thường nghĩa là đang chạm trần chờ; `nối tiếp`
                        là số câu được dịch như phần nối của nửa câu ngay trước nó. */}
                    <div>ghép ý {diag.continuationMerges} · mảnh {diag.fragmentRefines} · nối tiếp {diag.fragmentLinks}</div>
                    {/* What the recogniser AGREED to listen for, in its own handshake reply. "tự do" means
                        it accepted no restriction and any language on earth can still come back. */}
                    <div>máy nghe: {diag.asrLanguages ?? 'tự do (mọi thứ tiếng)'} · nhãn {diag.vendorTags}</div>
                    <div>draft {diag.draftCalls} (dup {diag.draftSkipped.duplicate}·rate {diag.draftSkipped['rate-limit']}·infl {diag.draftSkipped['in-flight']})</div>
                    <div>refine {diag.refineCalls} · retries {diag.refineRetries}</div>
                    {/* M9 — snaps vs gần-khớp, and where the script thinks it is. `lastScriptReason` is the
                        matcher's own words for why the last sentence did not snap. */}
                    {diag.scriptLines > 0 && (
                      <div>kịch bản {diag.scriptSnaps} khớp · {diag.scriptSuggests} gần khớp · dòng {diag.scriptPosition}/{diag.scriptLines}{diag.lastScriptReason ? ` · ${diag.lastScriptReason}` : ''}</div>
                    )}
                    <div>ttsQueue {diag.ttsQueueLength} · gate {diag.gateActive ? 'on' : 'off'} · gatedMs {diag.gatedMs}</div>
                    {/* M13 — câu ĐÃ hiện phụ đề nhưng KHÔNG đọc lên loa, vì chữ không đúng thứ tiếng của
                        giọng đọc (thường là một câu tiếng Anh). Hiện ra để người vận hành biết vì sao có
                        câu im lặng, thay vì tưởng loa hỏng. */}
                    {diag.ttsLanguageSkips > 0 && (
                      <div>không đọc {diag.ttsLanguageSkips} câu · {diag.lastTtsSkipReason}</div>
                    )}
                    {/* TASK 12.5 — the lane reports a backlog only once it is worth acting on (≈8s of audio). */}
                    {diag.sendBacklogBytes > 0 && (
                      <div className="text-error">⇡ backlog gửi {(diag.sendBacklogBytes / 1024).toFixed(0)} KB · mạng chậm, phụ đề đang trễ</div>
                    )}
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
