import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    getAudioDevices, getAudioOutputs, getBlocks, getLiveFast, playTestTone, setLiveFast,
} from '../lib/api';
import type { AudioInputDevice, AudioOutputDevice, LiveConfig } from '../lib/api';
import type { LiveLine, AudienceCut } from '../lib/LiveSessionContext';
import { isSessionActive, useLiveSession } from '../lib/LiveSessionContext';
import { useMeter } from '../lib/useMeter';
import { buildTtsConfig, loadTtsPrefs } from '../lib/ttsPrefs';

// ─────────────────────────────────────────────────────────────────────────────
// Operator console, laid out like a video-meeting cockpit (Zoom/Teams pattern):
//   • a slim TOP bar  = state + session identity (annunciator · direction · timer)
//   • a big  STAGE    = the live bilingual RESULT (or the pre-flight setup when idle)
//   • a  BOTTOM bar   = the operation controls (mic · START/STOP · take-to-safe)
// The center is the content; the chrome recedes. All the safety behaviour (A3.2
// annunciator, A3.1 trust HUD, A3.4 hold-STOP + no-signal, A3.5 pre-flight) is kept
// verbatim — only the presentation changed.
// ─────────────────────────────────────────────────────────────────────────────

const SELECT_CLS =
    'w-full bg-surface text-on-surface border-b border-outline-variant rounded-none py-2 px-0 ' +
    'focus:ring-0 focus:border-secondary appearance-none cursor-pointer disabled:opacity-50 text-sm';

const langLines = (lines: LiveLine[], lang: string) =>
    lines.filter((l) => l.lang.toLowerCase().startsWith(lang) && l.text.trim());

// Monitor sizing: readable on the operator's screen (NOT the 10m wall — that's /stream).
// Newest line is brightest gold; the just-spoken line stays legible; older lines recede.
const monitorLineClass = (age: number) =>
    age === 0
        ? 'fade-current text-secondary font-bold text-2xl md:text-[1.75rem] leading-snug'
        : age === 1
            ? 'fade-older text-on-surface font-semibold text-lg md:text-xl leading-snug'
            : 'text-on-surface-variant opacity-70 font-medium text-base md:text-lg leading-snug';

/** One language column of the operator result monitor — pins to the newest line. */
const MonitorColumn: React.FC<{ label: React.ReactNode; lines: LiveLine[]; jp?: boolean }> = ({ label, lines, jp }) => {
    const ref = useRef<HTMLDivElement>(null);
    const dep = `${lines.length}|${lines[lines.length - 1]?.text ?? ''}`;
    useEffect(() => {
        const el = ref.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [dep]);
    return (
        <div className="flex flex-col min-h-0 h-full">
            <div className="shrink-0 flex items-center justify-center py-2.5 border-b border-outline-variant/60">
                {label}
            </div>
            <div ref={ref} className="flex-1 overflow-y-auto px-6 md:px-8">
                <div className={`min-h-full flex flex-col justify-end gap-4 py-4 ${jp ? 'jp-text' : ''}`}>
                    {lines.map((line, i) => {
                        const age = lines.length - 1 - i;
                        return (
                            <p
                                key={line.lid}
                                lang={jp ? 'ja' : 'vi'}
                                className={monitorLineClass(age)}
                                style={{ lineBreak: jp ? 'strict' : undefined, textShadow: age === 0 ? '0 0 22px rgba(232,184,75,0.28)' : undefined }}
                            >
                                {line.text}
                            </p>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const AudioRouting: React.FC = () => {
    const session = useLiveSession();
    const active = isSessionActive(session.status);

    // --- Backend catalog state ---
    const [inputs, setInputs] = useState<AudioInputDevice[]>([]);
    const [outputs, setOutputs] = useState<AudioOutputDevice[]>([]);
    const [deviceError, setDeviceError] = useState<string | null>(null);
    const [sttModels, setSttModels] = useState<string[]>([]);
    const [mtModels, setMtModels] = useState<string[]>([]);

    // --- Operator selections ---
    const [inputDevice, setInputDevice] = useState<number | null>(null);
    const [outVi, setOutVi] = useState<number | null>(null);
    const [outJa, setOutJa] = useState<number | null>(null);
    const [sttModel, setSttModel] = useState('');
    const [mtModel, setMtModel] = useState('');
    const [fastMode, setFastMode] = useState(false);
    const [toneStatus, setToneStatus] = useState<Record<string, string>>({});

    useEffect(() => {
        getAudioDevices()
            .then((d) => {
                setInputs(d.devices);
                setDeviceError(d.error ?? null);
                setInputDevice((cur) => cur ?? d.default ?? d.devices[0]?.index ?? null);
            })
            .catch((e) => setDeviceError(String(e)));
        getAudioOutputs()
            .then((d) => {
                setOutputs(d.devices);
                setOutVi((cur) => cur ?? d.default ?? d.devices[0]?.index ?? null);
                setOutJa((cur) => cur ?? d.default ?? d.devices[0]?.index ?? null);
            })
            .catch(() => { /* surfaced via deviceError / offline badge */ });
        getBlocks()
            .then(({ blocks }) => {
                const opts = (type: string) =>
                    blocks.find((b) => b.type === type)?.params.find((p) => p.name === 'model');
                const stt = opts('stt');
                const mt = opts('mt');
                setSttModels(stt?.options ?? []);
                setMtModels(mt?.options ?? []);
                setSttModel((cur) => cur || String(stt?.default ?? stt?.options?.[0] ?? ''));
                setMtModel((cur) => cur || String(mt?.default ?? mt?.options?.[0] ?? ''));
            })
            .catch(() => { /* model pickers stay empty until backend is up */ });
        getLiveFast().then((r) => setFastMode(r.fast)).catch(() => { /* default off */ });
    }, []);

    // VU meter: the live session owns the mic while running (its `level` events feed
    // the bar); otherwise open a dedicated /ws/meter stream on the selected input.
    const meter = useMeter(active ? null : inputDevice);
    const vuLevel = active ? session.level : meter.level;
    const vuDb = useMemo(() => {
        const rms = active ? vuLevel : meter.rms;
        return rms > 0 ? Math.max(-60, Math.round(20 * Math.log10(rms))) : -60;
    }, [active, vuLevel, meter.rms]);

    // Trust HUD signals (A3.1) — the backend streams these; the UI previously dropped them.
    const lastLine = session.lines[session.lines.length - 1];
    const lastOnScript = lastLine?.onScript;
    const srcLang = session.sourceLang?.lang?.toLowerCase() ?? '';
    const dir = srcLang.startsWith('ja') ? 'JA → VI' : srcLang.startsWith('vi') ? 'VI → JA' : '';
    const e2e = session.timing?.e2e;
    const fmtMs = (n?: number) => (typeof n === 'number' ? `${Math.round(n)}ms` : '—');
    const pct = (n?: number) => (typeof n === 'number' ? `${Math.round(n * 100)}%` : '—');

    const handleTestTone = async (channel: 'vi' | 'ja') => {
        const device = channel === 'vi' ? outVi : outJa;
        setToneStatus((s) => ({ ...s, [channel]: '…' }));
        try {
            const r = await playTestTone(device ?? undefined);
            setToneStatus((s) => ({ ...s, [channel]: r.ok ? '♪ OK' : (r.error ?? 'FAILED') }));
        } catch (e) {
            setToneStatus((s) => ({ ...s, [channel]: String(e) }));
        }
        setTimeout(() => setToneStatus((s) => ({ ...s, [channel]: '' })), 2500);
    };

    const handleToggleFast = async () => {
        try {
            const r = await setLiveFast(!fastMode);
            setFastMode(r.fast);
        } catch { /* keep current state */ }
    };

    const handleStartStop = () => {
        if (active) {
            session.stop();
            return;
        }
        // Include a TTS block only if the operator opted in on the Voice Studio page (default:
        // subtitles-only, per the audit). The multi-language shape is best-effort — see doc 15.
        const ttsBlock = buildTtsConfig(loadTtsPrefs());
        const config: LiveConfig = {
            device: 'mic',
            ...(inputDevice !== null ? { device_index: inputDevice } : {}),
            single_auto: {
                model: sttModel,
                mt_model: mtModel,
                beam_size: 1,
                targets: { vi: 'ja', ja: 'vi', en: 'ja' },
            },
            post_correct: true,
            hotwords: true,
            ...(ttsBlock ? { tts: ttsBlock } : {}),
            ...(outVi !== null && outJa !== null ? { outputs: { vi: outVi, ja: outJa } } : {}),
        };
        session.start(config);
    };

    // --- A3.4: NO-SIGNAL alarm — level stuck near the floor while a session is live ---
    const [noSignal, setNoSignal] = useState(false);
    const lastAboveRef = useRef(Date.now());
    useEffect(() => { if (vuLevel > 0.02) lastAboveRef.current = Date.now(); }, [vuLevel]);
    useEffect(() => {
        if (!active) { setNoSignal(false); lastAboveRef.current = Date.now(); return; }
        const id = setInterval(() => setNoSignal(Date.now() - lastAboveRef.current > 2000), 500);
        return () => clearInterval(id);
    }, [active]);

    // --- A3.4: hold-to-confirm STOP — guards the primary transport against a fat-finger click ---
    const [holdPct, setHoldPct] = useState(0);
    const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const cancelHold = () => { if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null; } setHoldPct(0); };
    const startHold = () => {
        if (holdRef.current) return;
        const t0 = Date.now();
        holdRef.current = setInterval(() => {
            const p = Math.min(1, (Date.now() - t0) / 800);
            setHoldPct(p);
            if (p >= 1) { cancelHold(); session.stop(); }
        }, 30);
    };
    useEffect(() => () => cancelHold(), []);

    // --- Session timer (mm:ss since start) — shown in the top bar while a session is live ---
    const [elapsed, setElapsed] = useState(0);
    const startAtRef = useRef<number | null>(null);
    useEffect(() => {
        if (!active) { startAtRef.current = null; setElapsed(0); return; }
        if (startAtRef.current === null) startAtRef.current = Date.now();
        const id = setInterval(() => setElapsed(Math.floor((Date.now() - (startAtRef.current ?? Date.now())) / 1000)), 1000);
        return () => clearInterval(id);
    }, [active]);
    const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

    // --- A3.5: pre-flight readiness — START is gated until every check passes (or explicit override) ---
    const preflight = [
        { ok: session.backendOnline, label: 'Backend online' },
        { ok: inputDevice !== null, label: 'Đã chọn mic' },
        { ok: !!sttModel, label: 'Model nhận dạng (ASR)' },
        { ok: !!mtModel, label: 'Model dịch (MT)' },
        { ok: outVi !== null, label: 'Ngõ ra VI' },
        { ok: outJa !== null, label: 'Ngõ ra JA' },
        { ok: outVi === null || outJa === null || outVi !== outJa, label: 'VI ≠ JA (khác loa)' },
    ];
    const preflightOk = preflight.every((i) => i.ok);
    const [override, setOverride] = useState(false);
    const canStart = preflightOk || override;

    // --- A3.2: Master Annunciator — one dominant, room-readable state ---
    const master = (() => {
        if (!session.backendOnline && !active) return { label: 'BACKEND OFFLINE', dot: 'bg-error', text: 'text-error', anim: '' };
        switch (session.status) {
            case 'connecting': return { label: 'CONNECTING…', dot: 'bg-primary', text: 'text-primary', anim: 'animate-pulse' };
            case 'warming': return { label: `WARMING ${session.warming?.step ?? 0}/${session.warming?.steps ?? 0}`, dot: 'bg-primary', text: 'text-primary', anim: 'animate-pulse' };
            case 'ready': return { label: 'READY', dot: 'bg-secondary', text: 'text-secondary', anim: 'listening-pulse' };
            case 'listening':
                return noSignal
                    ? { label: 'LIVE · KHÔNG CÓ TÍN HIỆU', dot: 'bg-error', text: 'text-error', anim: 'animate-pulse' }
                    : (e2e != null && e2e >= 2500)
                        ? { label: 'DEGRADED · TRỄ CAO', dot: 'bg-error', text: 'text-error', anim: 'animate-pulse' }
                        : { label: 'LIVE', dot: 'bg-secondary', text: 'text-secondary', anim: 'listening-pulse' };
            case 'reconnecting': return { label: 'MẤT KẾT NỐI · ĐANG KẾT NỐI LẠI', dot: 'bg-error', text: 'text-error', anim: 'animate-pulse' };
            case 'error': return { label: 'FAULT · LỖI', dot: 'bg-error', text: 'text-error', anim: '' };
            default: return { label: 'STANDBY', dot: 'bg-outline-variant', text: 'text-on-surface-variant', anim: '' };
        }
    })();

    // Only surface the raw device-catalog error when the backend is actually reachable; while
    // OFFLINE the annunciator already says so (no noisy "Unexpected token '<'" parse error on stage).
    const shownError = session.error ?? (session.backendOnline ? deviceError : null);

    const viLive = langLines(session.lines, 'vi');
    const jaLive = langLines(session.lines, 'ja');
    const setupPhase = session.status === 'connecting' || session.status === 'warming';

    const openWall = () => window.open('/stream', 'proyaku-wall');

    // Small building blocks kept local so the file reads top-to-bottom.
    const DirPill = (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-outline-variant bg-surface-container-lowest">
            <span className={`font-label-caps text-label-caps ${dir.startsWith('VI') || !dir ? 'text-secondary' : 'text-on-surface-variant'}`}>VI</span>
            <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">swap_horiz</span>
            <span className={`jp-text font-label-caps text-label-caps ${dir.startsWith('JA') ? 'text-secondary' : 'text-on-surface-variant'}`}>JA</span>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-background text-on-background overflow-hidden">
            {/* ══════════ TOP BAR ══════════ */}
            <header className="shrink-0 h-14 flex items-center gap-4 px-5 border-b border-outline-variant bg-surface-container-lowest">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${master.dot} ${master.anim}`}></span>
                    <span className={`font-label-caps text-label-caps tracking-wide truncate ${master.text}`}>{master.label}</span>
                </div>

                <div className="mx-auto flex items-center gap-4">
                    {DirPill}
                    {active && (
                        <span className="font-label-caps text-label-caps text-on-surface-variant tabular-nums" style={{ fontFamily: 'ui-monospace, monospace' }}>
                            {mmss}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={handleToggleFast}
                        title="Chế độ nhanh — giảm độ trễ, có thể giảm độ chính xác"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-caps text-label-caps transition-colors ${fastMode ? 'text-on-secondary bg-secondary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
                    >
                        <span className="material-symbols-outlined text-base" aria-hidden="true">bolt</span>
                        <span className="hidden sm:inline">Fast</span>
                    </button>
                    <button
                        onClick={openWall}
                        title="Mở Tường phụ đề (màn hình khán giả) trong cửa sổ mới"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-caps text-label-caps text-on-surface-variant hover:text-secondary hover:bg-surface-container transition-colors"
                    >
                        <span className="material-symbols-outlined text-base" aria-hidden="true">subtitles</span>
                        <span className="hidden sm:inline">Tường</span>
                    </button>
                </div>
            </header>

            {/* ══════════ CENTER STAGE ══════════ */}
            <main className="flex-1 min-h-0 relative flex flex-col bg-gradient-radial">
                {shownError && (
                    <div className="shrink-0 mx-4 mt-4 border border-error text-error font-label-caps text-label-caps px-4 py-2.5 rounded-DEFAULT flex items-center gap-2">
                        <span className="material-symbols-outlined text-base" aria-hidden="true">error</span>
                        <span className="truncate">{shownError}</span>
                    </div>
                )}

                {!active ? (
                    /* ── SETUP: pre-flight + device/model configuration (progressive disclosure) ── */
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        <div className="max-w-4xl mx-auto w-full px-6 py-9">
                            <div className="text-center mb-8">
                                <h2 className="font-headline-sm text-headline-sm text-on-surface">Chuẩn bị phiên dịch</h2>
                                <p className="mt-1.5 text-sm text-on-surface-variant">
                                    Kiểm tra thiết bị &amp; mô hình. Khi mọi mục đạt, nhấn <span className="text-secondary font-semibold">Bắt đầu dịch</span> ở thanh dưới.
                                </p>
                            </div>

                            {/* Pre-flight go/no-go (A3.5) */}
                            <div className="mb-6 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`material-symbols-outlined ${preflightOk ? 'text-secondary' : 'text-primary'}`} aria-hidden="true">
                                        {preflightOk ? 'check_circle' : 'checklist'}
                                    </span>
                                    <span className={`font-label-caps text-label-caps ${preflightOk ? 'text-secondary' : 'text-on-surface'}`}>
                                        {preflightOk ? 'SẴN SÀNG — TẤT CẢ ĐÃ ĐẠT' : `KIỂM TRA TRƯỚC KHI CHẠY · ${preflight.filter((i) => i.ok).length}/${preflight.length} đạt`}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                                    {preflight.map((it) => (
                                        <div key={it.label} className="flex items-center gap-1.5 font-label-caps text-label-caps">
                                            <span className={`material-symbols-outlined ${it.ok ? 'text-secondary' : 'text-error'}`} style={{ fontSize: '1.05rem' }} aria-hidden="true">
                                                {it.ok ? 'check_circle' : 'cancel'}
                                            </span>
                                            <span className={it.ok ? 'text-on-surface-variant' : 'text-error'}>{it.label}</span>
                                        </div>
                                    ))}
                                </div>
                                {!preflightOk && (
                                    <label className="flex items-center gap-2 mt-3 pt-3 border-t border-outline-variant/60 font-label-caps text-label-caps text-on-surface-variant cursor-pointer">
                                        <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="accent-secondary" />
                                        Bỏ qua kiểm tra (override) — chỉ dùng khi diễn tập
                                    </label>
                                )}
                            </div>

                            {/* Config groups */}
                            <div className="grid md:grid-cols-3 gap-4">
                                {/* Source */}
                                <div className="bg-surface-container border border-outline-variant rounded-DEFAULT p-5 transition-colors hover:border-outline">
                                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant">
                                        <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">mic_external_on</span>
                                        <h3 className="font-label-caps text-label-caps text-on-surface">Nguồn vào</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">Micro</label>
                                            <select value={inputDevice ?? ''} onChange={(e) => setInputDevice(Number(e.target.value))} disabled={active} className={SELECT_CLS}>
                                                {inputs.length === 0 && <option value="">Chưa thấy thiết bị vào</option>}
                                                {inputs.map((d) => <option key={d.index} value={d.index}>{d.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">Model nhận dạng</label>
                                            <select value={sttModel} onChange={(e) => setSttModel(e.target.value)} disabled={active} className={SELECT_CLS}>
                                                {sttModels.length === 0 && <option value="">— backend offline —</option>}
                                                {sttModels.map((m) => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="font-label-caps text-label-caps text-on-surface-variant">Mức tín hiệu</label>
                                                <span className="font-label-caps text-label-caps text-primary tabular-nums">{vuDb}dB</span>
                                            </div>
                                            <div className="vu-meter-bar">
                                                <div className="vu-meter-fill" style={{ width: `${Math.round(Math.min(1, vuLevel) * 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Core engine */}
                                <div className="bg-surface-container border border-outline-variant rounded-DEFAULT p-5 transition-colors hover:border-outline">
                                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant">
                                        <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">bolt</span>
                                        <h3 className="font-label-caps text-label-caps text-on-surface">Lõi dịch</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">Model dịch</label>
                                            <select value={mtModel} onChange={(e) => setMtModel(e.target.value)} disabled={active} className={SELECT_CLS}>
                                                {mtModels.length === 0 && <option value="">— backend offline —</option>}
                                                {mtModels.map((m) => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div className={`flex items-center gap-2 rounded-DEFAULT px-3 py-2.5 border ${session.backendOnline ? 'border-secondary/50 text-secondary' : 'border-error/50 text-error'}`}>
                                            <span className={`w-2 h-2 rounded-full ${session.backendOnline ? 'bg-secondary' : 'bg-error'}`}></span>
                                            <span className="font-label-caps text-label-caps">{session.backendOnline ? 'Lõi dịch PROYAKU sẵn sàng' : 'BACKEND OFFLINE'}</span>
                                        </div>
                                        <p className="text-xs text-on-surface-variant leading-relaxed">
                                            Hậu-kiểm &amp; hotword bật sẵn. TTS đọc tiếng bật/tắt ở trang <span className="text-on-surface">Giọng đọc</span>.
                                        </p>
                                    </div>
                                </div>

                                {/* Outputs */}
                                <div className="bg-surface-container border border-outline-variant rounded-DEFAULT p-5 transition-colors hover:border-outline">
                                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant">
                                        <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">speaker</span>
                                        <h3 className="font-label-caps text-label-caps text-on-surface">Ngõ ra</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="font-label-caps text-label-caps text-on-surface-variant">Loa VI</label>
                                                <span className="font-label-caps text-label-caps text-on-surface-variant">JA → VI</span>
                                            </div>
                                            <select value={outVi ?? ''} onChange={(e) => setOutVi(Number(e.target.value))} disabled={active} className={SELECT_CLS}>
                                                {outputs.length === 0 && <option value="">Chưa thấy loa</option>}
                                                {outputs.map((d) => <option key={d.index} value={d.index}>{d.name}</option>)}
                                            </select>
                                            <button onClick={() => handleTestTone('vi')} className="mt-2 w-full border border-outline-variant text-on-surface-variant py-1.5 rounded-DEFAULT text-xs hover:text-primary hover:border-primary transition-colors">
                                                {toneStatus.vi || 'Test loa VI'}
                                            </button>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="font-label-caps text-label-caps text-on-surface-variant">Loa JA</label>
                                                <span className="font-label-caps text-label-caps text-on-surface-variant">VI → JA</span>
                                            </div>
                                            <select value={outJa ?? ''} onChange={(e) => setOutJa(Number(e.target.value))} disabled={active} className={SELECT_CLS}>
                                                {outputs.length === 0 && <option value="">Chưa thấy loa</option>}
                                                {outputs.map((d) => <option key={d.index} value={d.index}>{d.name}</option>)}
                                            </select>
                                            <button onClick={() => handleTestTone('ja')} className="mt-2 w-full border border-outline-variant text-on-surface-variant py-1.5 rounded-DEFAULT text-xs hover:text-primary hover:border-primary transition-colors">
                                                {toneStatus.ja || 'Test loa JA'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : setupPhase ? (
                    /* ── CONNECTING / WARMING: progress, centered ── */
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-5 px-6">
                        <span className="material-symbols-outlined text-secondary listening-pulse" style={{ fontSize: '52px' }} aria-hidden="true">
                            {session.status === 'warming' ? 'model_training' : 'sync'}
                        </span>
                        <span className={`font-headline-sm text-headline-sm ${master.text}`}>{master.label}</span>
                        {session.status === 'warming' && session.warming && (
                            <div className="w-full max-w-md">
                                <div className="vu-meter-bar">
                                    <div className="vu-meter-fill" style={{ width: `${session.warming.steps ? Math.round((session.warming.step / session.warming.steps) * 100) : 10}%` }}></div>
                                </div>
                                <p className="mt-2 text-center font-label-caps text-label-caps text-on-surface-variant">{session.warming.detail || 'Đang nạp mô hình…'}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── LIVE MONITOR: the bilingual result (this is the "screen in the middle") ── */
                    <div className="flex-1 min-h-0 relative overflow-hidden">
                        {/* Ambient top glow — depth, matches the audience wall */}
                        <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-surface-container/40 to-transparent pointer-events-none z-0"></div>
                        <div className="absolute inset-0 flex z-10">
                            <div className="flex-1 min-w-0">
                                <MonitorColumn
                                    label={<span className="font-label-caps text-label-caps tracking-widest text-secondary border border-secondary/60 rounded px-2.5 py-0.5">TIẾNG VIỆT</span>}
                                    lines={viLive}
                                />
                            </div>
                            {/* Ceremonial gold divider (gradient + diamond) — same language as /stream */}
                            <div className="w-px relative flex flex-col items-center justify-center opacity-50 shrink-0" aria-hidden="true">
                                <div className="w-full h-full bg-gradient-to-b from-transparent via-secondary to-transparent"></div>
                                <div className="absolute w-2 h-2 rotate-45 border border-secondary bg-primary-container"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <MonitorColumn
                                    jp
                                    label={<span className="jp-text font-label-caps text-label-caps tracking-widest text-secondary border border-secondary/60 rounded px-2.5 py-0.5">日本語</span>}
                                    lines={jaLive}
                                />
                            </div>
                        </div>
                        {/* Subtle brand mark, top-center over the divider */}
                        <span className="material-symbols-outlined text-secondary opacity-40 absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none" style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }} aria-hidden="true">all_inclusive</span>
                        {/* Live but nothing spoken yet — a calm waiting state, never a blank panel. */}
                        {viLive.length === 0 && jaLive.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 pointer-events-none z-20">
                                <span className="material-symbols-outlined text-secondary opacity-70 listening-pulse" style={{ fontSize: '40px' }} aria-hidden="true">hearing</span>
                                <span className="font-semibold text-xl text-secondary opacity-90">Đang chờ diễn giả…</span>
                                <span className="jp-text text-base text-on-surface-variant opacity-70">お待ちください</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Trust HUD (A3.1) — slim operator telemetry strip, above the control bar. */}
                {active && (
                    <div className="shrink-0 border-t border-outline-variant/60 bg-surface-container-lowest px-5 py-2 overflow-x-auto">
                        <div className="flex items-center gap-x-6 gap-y-1 whitespace-nowrap font-label-caps text-label-caps" style={{ fontFamily: 'ui-monospace, monospace' }}>
                            <span className="text-on-surface-variant">HƯỚNG <span className="text-primary">{dir || '—'}</span>{session.sourceLang ? ` ${pct(session.sourceLang.prob)}` : ''}</span>
                            <span className="text-on-surface-variant">TRỄ E2E <span className={e2e == null ? 'text-on-surface-variant' : e2e < 2000 ? 'text-secondary' : 'text-error'}>{fmtMs(e2e)}</span>{session.timing ? ` · STT ${fmtMs(session.timing.stt)} MT ${fmtMs(session.timing.mt)}` : ''}</span>
                            <span className="text-on-surface-variant">KHỚP KỊCH BẢN <span className="text-secondary">{pct(lastOnScript)}</span></span>
                            <span className="text-on-surface-variant">SỬA TÊN <span className="text-secondary">{session.nameFixCount}</span></span>
                            {session.speakingLang && <span className="text-secondary inline-flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">volume_up</span>ĐANG ĐỌC {session.speakingLang.toUpperCase()}</span>}
                            {session.contextSummary && <span className="text-on-surface-variant">NGỮ CẢNH: {session.contextSummary}</span>}
                        </div>
                    </div>
                )}
            </main>

            {/* ══════════ BOTTOM CONTROL BAR ══════════ */}
            <footer className="shrink-0 border-t border-outline-variant bg-surface-container-lowest px-5 py-3">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    {/* LEFT — mic status + VU */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-DEFAULT border ${noSignal ? 'border-error' : 'border-outline-variant'} bg-surface-container`}>
                            <span className={`material-symbols-outlined ${noSignal ? 'text-error animate-pulse' : active ? 'text-secondary' : 'text-on-surface-variant'}`} aria-hidden="true">
                                {noSignal ? 'mic_off' : 'mic'}
                            </span>
                            <div className="min-w-0">
                                <div className="font-label-caps text-label-caps tabular-nums leading-none mb-1">
                                    {noSignal ? <span className="text-error">KHÔNG TÍN HIỆU</span> : <span className="text-on-surface-variant">{vuDb}dB</span>}
                                </div>
                                <div className={`vu-meter-bar w-24 md:w-32 ${noSignal ? 'ring-1 ring-error' : ''}`}>
                                    <div className="vu-meter-fill" style={{ width: `${Math.round(Math.min(1, vuLevel) * 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CENTER — primary transport (START gated by pre-flight / STOP hold-to-confirm) */}
                    <div className="flex items-center justify-center">
                        {active ? (
                            <button
                                onPointerDown={startHold}
                                onPointerUp={cancelHold}
                                onPointerLeave={cancelHold}
                                title="Giữ để dừng phiên"
                                className="relative overflow-hidden select-none flex items-center gap-2.5 min-w-[15rem] justify-center font-label-caps text-label-caps py-3.5 px-8 rounded-full bg-error text-on-error"
                            >
                                <span className="absolute inset-y-0 left-0 bg-on-error/30" style={{ width: `${Math.round(holdPct * 100)}%` }}></span>
                                <span className="material-symbols-outlined relative" aria-hidden="true">stop_circle</span>
                                <span className="relative">{holdPct > 0 ? `GIỮ ĐỂ DỪNG… ${Math.round(holdPct * 100)}%` : 'DỪNG DỊCH (giữ)'}</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => { if (canStart) handleStartStop(); }}
                                disabled={!canStart}
                                title={canStart ? 'Bắt đầu phiên dịch' : 'Chưa đạt kiểm tra trước — xem danh sách ở giữa màn hình'}
                                className="flex items-center gap-2.5 min-w-[15rem] justify-center font-label-caps text-label-caps py-3.5 px-8 rounded-full bg-secondary text-on-secondary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-secondary/20 enabled:hover:shadow-secondary/40"
                            >
                                <span className="material-symbols-outlined" aria-hidden="true">play_circle</span>
                                BẮT ĐẦU DỊCH
                            </button>
                        )}
                    </div>

                    {/* RIGHT — take-to-safe (live) + wall */}
                    <div className="flex items-center justify-end gap-1.5">
                        {active && (
                            <div className="flex items-center gap-1 mr-1 pr-2 border-r border-outline-variant">
                                {([
                                    ['live', 'play_arrow', 'Phát trực tiếp (L)'],
                                    ['freeze', 'ac_unit', 'Giữ hình (G)'],
                                    ['slate', 'block', 'Màn an toàn (B)'],
                                ] as [AudienceCut, string, string][]).map(([c, icon, title]) => (
                                    <button
                                        key={c}
                                        title={title}
                                        onClick={() => session.setAudienceCut(c)}
                                        className={`material-symbols-outlined text-xl w-9 h-9 flex items-center justify-center rounded-full transition-colors ${session.audienceCut === c ? 'text-on-secondary bg-secondary' : 'text-on-surface-variant hover:text-secondary hover:bg-surface-container'}`}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        )}
                        <button
                            onClick={openWall}
                            title="Mở Tường phụ đề trong cửa sổ mới"
                            className="flex items-center gap-2 px-3 h-9 rounded-full font-label-caps text-label-caps text-on-surface-variant hover:text-secondary hover:bg-surface-container transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl" aria-hidden="true">open_in_new</span>
                            <span className="hidden lg:inline">Tường</span>
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default AudioRouting;
