import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    getAudioDevices, getAudioOutputs, getBlocks, getLiveFast, playTestTone, setLiveFast,
} from '../lib/api';
import type { AudioInputDevice, AudioOutputDevice, LiveConfig } from '../lib/api';
import { isSessionActive, useLiveSession } from '../lib/LiveSessionContext';
import { useMeter } from '../lib/useMeter';
import { buildTtsConfig, loadTtsPrefs } from '../lib/ttsPrefs';

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
                        : { label: '● LIVE', dot: 'bg-secondary', text: 'text-secondary', anim: 'listening-pulse' };
            case 'reconnecting': return { label: 'MẤT KẾT NỐI · ĐANG KẾT NỐI LẠI', dot: 'bg-error', text: 'text-error', anim: 'animate-pulse' };
            case 'error': return { label: 'FAULT · LỖI', dot: 'bg-error', text: 'text-error', anim: '' };
            default: return { label: 'STANDBY', dot: 'bg-outline-variant', text: 'text-on-surface-variant', anim: '' };
        }
    })();

    const statusLabel =
        session.status === 'connecting' ? 'CONNECTING…'
        : session.status === 'reconnecting' ? 'RECONNECTING…'
        : session.status === 'warming' ? `WARMING ${session.warming?.step ?? 0}/${session.warming?.steps ?? 0}`
        : session.status === 'ready' ? 'READY'
        : session.status === 'listening' ? 'LISTENING'
        : session.status === 'error' ? 'ERROR'
        : 'STANDBY';

    return (
        <div className="flex flex-1 w-full relative overflow-y-auto">
                {/* SideNavBar (Desktop) */}
                <aside className="hidden md:flex sticky top-0 h-full flex-col z-40 bg-surface-container dark:bg-surface-container w-64 border-r border-outline-variant dark:border-outline-variant shrink-0">
                    <div className="p-6 border-b border-outline-variant">
                        <h2 className="font-headline-sm text-headline-sm text-secondary">TECHNICAL CONTROL</h2>
                        <p className="font-label-caps text-label-caps text-on-surface-variant mt-2">V2.0 ANNIVERSARY</p>
                    </div>
                    <nav className="flex-1 overflow-y-auto py-4">
                        <div className="flex items-center gap-4 text-on-surface-variant p-4 font-label-caps text-label-caps">
                            <span className="material-symbols-outlined">dns</span>
                            Backend
                            <span className={`ml-auto w-2.5 h-2.5 rounded-full ${session.backendOnline ? 'bg-secondary listening-pulse' : 'bg-error'}`}></span>
                        </div>
                        <div className="flex items-center gap-4 text-on-surface-variant p-4 font-label-caps text-label-caps">
                            <span className="material-symbols-outlined">graphic_eq</span>
                            Session
                            <span className="ml-auto text-primary">{statusLabel}</span>
                        </div>
                        <button
                            onClick={handleToggleFast}
                            className="w-full flex items-center gap-4 text-on-surface-variant p-4 font-label-caps text-label-caps hover:bg-surface-container-high"
                        >
                            <span className="material-symbols-outlined">bolt</span>
                            Fast Mode
                            <span className={`ml-auto ${fastMode ? 'text-secondary' : 'text-outline-variant'}`}>{fastMode ? 'ON' : 'OFF'}</span>
                        </button>
                    </nav>
                    <div className="p-4 border-t border-outline-variant">
                        <button
                            onClick={() => session.stop()}
                            className="w-full bg-error text-on-error font-label-caps text-label-caps py-3 mb-4 rounded-DEFAULT hover:opacity-80"
                        >
                            EMERGENCY STOP
                        </button>
                        <Link to="/prep" className="flex items-center gap-4 text-secondary dark:text-secondary p-3 font-label-caps text-label-caps hover:bg-surface-container-high">
                            <span className="material-symbols-outlined">dashboard</span> Trung tâm điều phối
                        </Link>
                        <Link to="/voices" className="flex items-center gap-4 text-on-surface-variant dark:text-on-surface-variant p-3 font-label-caps text-label-caps hover:bg-surface-container-high">
                            <span className="material-symbols-outlined">record_voice_over</span> Giọng nói / Voices
                        </Link>
                        <Link to="/glossary" className="flex items-center gap-4 text-on-surface-variant dark:text-on-surface-variant p-3 font-label-caps text-label-caps hover:bg-surface-container-high">
                            <span className="material-symbols-outlined">menu_book</span> Glossary / Tên riêng
                        </Link>
                        <Link to="/script" className="flex items-center gap-4 text-on-surface-variant dark:text-on-surface-variant p-3 font-label-caps text-label-caps hover:bg-surface-container-high">
                            <span className="material-symbols-outlined">theater_comedy</span> Kịch bản / Duyệt dịch
                        </Link>
                    </div>
                </aside>

                {/* Main Content Canvas */}
                <div className="flex-1 flex flex-col min-w-0 relative">
                    <main className="flex-1 flex flex-col items-center justify-start py-10 px-container-padding relative w-full overflow-x-hidden">
                        {/* Background SVG Connections (Decorative) */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden lg:block" style={{ opacity: 0.1 }}>
                            <path className="connecting-line" d="M 250 400 C 400 400, 500 200, 700 200" fill="none"></path>
                            <path className="connecting-line" d="M 250 400 C 400 400, 500 600, 700 600" fill="none"></path>
                        </svg>
                        <div className="w-full max-w-6xl z-10">
                            {/* A3.2 Master Annunciator — one dominant state, readable across the room */}
                            <div className="mb-6 flex items-center gap-4 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest px-5 py-4">
                                <span className={`w-4 h-4 rounded-full ${master.dot} ${master.anim}`}></span>
                                <span className={`font-headline-sm text-headline-sm tracking-wide ${master.text}`}>{master.label}</span>
                                {fastMode && <span className="ml-auto font-label-caps text-label-caps text-secondary">⚡ FAST MODE</span>}
                            </div>
                            {(session.error || deviceError) && (
                                <div className="mb-6 border border-error text-error font-label-caps text-label-caps px-4 py-3">
                                    {session.error ?? deviceError}
                                </div>
                            )}
                            {/* Trust HUD (A3.1): latency · detected direction · script-match · name fixes · TTS */}
                            {active && (
                                <div className="mb-6 border border-outline-variant bg-surface-container-lowest rounded-DEFAULT px-4 py-3">
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-label-caps text-label-caps" style={{ fontFamily: 'ui-monospace, monospace' }}>
                                        <span className="text-secondary">TRUST HUD</span>
                                        <span className="text-on-surface-variant">
                                            HƯỚNG <span className="text-primary">{dir || '—'}</span>
                                            {session.sourceLang ? ` ${pct(session.sourceLang.prob)}` : ''}
                                        </span>
                                        <span className="text-on-surface-variant">
                                            TRỄ E2E <span className={e2e == null ? 'text-on-surface-variant' : e2e < 2000 ? 'text-secondary' : 'text-error'}>{fmtMs(e2e)}</span>
                                            {session.timing ? ` · STT ${fmtMs(session.timing.stt)} MT ${fmtMs(session.timing.mt)} PROC ${fmtMs(session.timing.proc)}` : ''}
                                        </span>
                                        <span className="text-on-surface-variant">KHỚP KỊCH BẢN <span className="text-secondary">{pct(lastOnScript)}</span></span>
                                        <span className="text-on-surface-variant">SỬA TÊN <span className="text-secondary">{session.nameFixCount}</span></span>
                                        {session.speakingLang && <span className="text-secondary">🔊 ĐANG ĐỌC {session.speakingLang.toUpperCase()}</span>}
                                    </div>
                                    {session.contextSummary && (
                                        <div className="mt-2 font-label-caps text-label-caps text-on-surface-variant truncate">NGỮ CẢNH: {session.contextSummary}</div>
                                    )}
                                </div>
                            )}

                            {/* Flow Layout */}
                            <div className="flex flex-col lg:flex-row items-center justify-between gap-gutter lg:gap-16">

                                {/* 1. Input Section */}
                                <div className="bg-surface-container border border-outline-variant p-6 rounded-DEFAULT w-full lg:w-1/3 relative shadow-lg">
                                    <div className="absolute -top-3 -right-3 flex items-center justify-center w-6 h-6 bg-surface-container-lowest border border-secondary rounded-full">
                                        <div className="pulse-dot"></div>
                                    </div>
                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant">
                                        <span className="material-symbols-outlined text-secondary">mic_external_on</span>
                                        <h3 className="font-headline-sm text-headline-sm text-secondary">Source</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="font-label-caps text-label-caps text-on-surface-variant block mb-2">Input Device</label>
                                            <select
                                                value={inputDevice ?? ''}
                                                onChange={(e) => setInputDevice(Number(e.target.value))}
                                                disabled={active}
                                                className="w-full bg-surface text-on-surface border-b border-outline-variant rounded-none py-2 px-0 focus:ring-0 focus:border-secondary appearance-none cursor-pointer disabled:opacity-50"
                                            >
                                                {inputs.length === 0 && <option value="">No input devices found</option>}
                                                {inputs.map((d) => (
                                                    <option key={d.index} value={d.index}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="font-label-caps text-label-caps text-on-surface-variant block mb-2">Recognition Model</label>
                                            <select
                                                value={sttModel}
                                                onChange={(e) => setSttModel(e.target.value)}
                                                disabled={active}
                                                className="w-full bg-surface text-on-surface border-b border-outline-variant rounded-none py-2 px-0 focus:ring-0 focus:border-secondary appearance-none cursor-pointer disabled:opacity-50"
                                            >
                                                {sttModels.length === 0 && <option value="">— backend offline —</option>}
                                                {sttModels.map((m) => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div className="pt-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="font-label-caps text-label-caps text-on-surface-variant">Signal Level</label>
                                                <span className={`font-label-caps text-label-caps ${noSignal ? 'text-error animate-pulse' : 'text-primary'}`}>
                                                    {noSignal ? '⚠ KHÔNG CÓ TÍN HIỆU' : `${vuDb}dB`}
                                                </span>
                                            </div>
                                            <div className={`vu-meter-bar ${noSignal ? 'ring-1 ring-error' : ''}`}>
                                                <div className="vu-meter-fill" style={{ width: `${Math.round(Math.min(1, vuLevel) * 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Central Mixer (Process) */}
                                <div className="flex flex-col items-center w-full lg:w-1/4 my-8 lg:my-0">
                                    <div className="h-16 w-px bg-outline-variant lg:hidden"></div>
                                    <div className={`bg-surface-container-lowest border p-4 rounded-DEFAULT text-center w-full relative ${session.backendOnline ? 'border-secondary' : 'border-error'}`}>
                                        <span className="font-label-caps text-label-caps text-secondary block mb-1">CORE ENGINE</span>
                                        <span className="font-body-md text-body-md text-on-surface block">
                                            {session.backendOnline ? 'HanDichThuat Studio' : 'BACKEND OFFLINE'}
                                        </span>
                                        <div className="mt-3">
                                            <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Translation Model</label>
                                            <select
                                                value={mtModel}
                                                onChange={(e) => setMtModel(e.target.value)}
                                                disabled={active}
                                                className="w-full bg-surface text-on-surface border-b border-outline-variant rounded-none py-1 px-0 text-sm focus:ring-0 focus:border-secondary appearance-none cursor-pointer disabled:opacity-50"
                                            >
                                                {mtModels.length === 0 && <option value="">— backend offline —</option>}
                                                {mtModels.map((m) => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                        {session.status === 'warming' && session.warming && (
                                            <div className="mt-4">
                                                <div className="vu-meter-bar">
                                                    <div
                                                        className="vu-meter-fill"
                                                        style={{ width: `${session.warming.steps ? Math.round((session.warming.step / session.warming.steps) * 100) : 10}%` }}
                                                    ></div>
                                                </div>
                                                <span className="font-label-caps text-label-caps text-on-surface-variant block mt-2">
                                                    {session.warming.detail || 'Loading models…'}
                                                </span>
                                            </div>
                                        )}
                                        {/* A3.5 Pre-flight checklist (shown before START) */}
                                        {!active && (
                                            <div className="mt-4 text-left space-y-1">
                                                {preflight.map((it) => (
                                                    <div key={it.label} className="flex items-center gap-2 font-label-caps text-label-caps">
                                                        <span className={it.ok ? 'text-secondary' : 'text-error'}>{it.ok ? '✓' : '✕'}</span>
                                                        <span className={it.ok ? 'text-on-surface-variant' : 'text-error'}>{it.label}</span>
                                                    </div>
                                                ))}
                                                {!preflightOk && (
                                                    <label className="flex items-center gap-2 mt-1 font-label-caps text-label-caps text-on-surface-variant cursor-pointer">
                                                        <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
                                                        Bỏ qua kiểm tra (override)
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                        {/* A3.4 START (gated by pre-flight) / STOP (hold-to-confirm) */}
                                        {active ? (
                                            <button
                                                onPointerDown={startHold}
                                                onPointerUp={cancelHold}
                                                onPointerLeave={cancelHold}
                                                title="Giữ để dừng"
                                                className="mt-4 w-full relative overflow-hidden font-label-caps text-label-caps py-3 rounded-DEFAULT bg-error text-on-error select-none"
                                            >
                                                <span className="absolute inset-y-0 left-0 bg-on-error/30" style={{ width: `${Math.round(holdPct * 100)}%` }}></span>
                                                <span className="relative">{holdPct > 0 ? `GIỮ ĐỂ DỪNG… ${Math.round(holdPct * 100)}%` : 'STOP INTERPRETER (giữ)'}</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => { if (canStart) handleStartStop(); }}
                                                disabled={!canStart}
                                                className="mt-4 w-full font-label-caps text-label-caps py-3 rounded-DEFAULT bg-secondary text-on-secondary hover:opacity-80 disabled:opacity-40"
                                            >
                                                START INTERPRETER
                                            </button>
                                        )}
                                        <div className="mt-4 flex justify-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${session.backendOnline ? 'bg-secondary' : 'bg-outline-variant'}`}></div>
                                            <div className={`w-2 h-2 rounded-full ${active ? 'bg-secondary' : 'bg-outline-variant'}`}></div>
                                            <div className={`w-2 h-2 rounded-full ${session.status === 'listening' ? 'bg-secondary' : 'bg-outline-variant'}`}></div>
                                        </div>
                                    </div>
                                    <div className="h-16 w-px bg-outline-variant lg:hidden"></div>
                                </div>

                                {/* 3. Output Sections (Split) */}
                                <div className="flex flex-col gap-8 w-full lg:w-1/3">
                                    {/* VI Channel */}
                                    <div className="bg-surface-container border border-outline-variant p-6 rounded-DEFAULT relative">
                                        <div className="flex justify-between items-center mb-4 border-b border-outline-variant pb-2">
                                            <span className="font-label-caps text-label-caps text-primary">VIETNAMESE CH</span>
                                            <span className="font-label-caps text-label-caps text-on-surface-variant">JA → VI</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Output Target</label>
                                                <select
                                                    value={outVi ?? ''}
                                                    onChange={(e) => setOutVi(Number(e.target.value))}
                                                    disabled={active}
                                                    className="w-full bg-surface text-on-surface border-b border-outline-variant rounded-none py-1 px-0 focus:ring-0 focus:border-secondary text-sm disabled:opacity-50"
                                                >
                                                    {outputs.length === 0 && <option value="">No output devices found</option>}
                                                    {outputs.map((d) => <option key={d.index} value={d.index}>{d.name}</option>)}
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => handleTestTone('vi')}
                                                className="w-full border border-outline-variant text-on-surface-variant py-2 text-sm hover:text-primary hover:border-primary transition-colors"
                                            >
                                                {toneStatus.vi || 'Test Tone'}
                                            </button>
                                        </div>
                                    </div>
                                    {/* JA Channel */}
                                    <div className="bg-surface-container border border-outline-variant p-6 rounded-DEFAULT relative">
                                        <div className="flex justify-between items-center mb-4 border-b border-outline-variant pb-2">
                                            <span className="font-label-caps text-label-caps text-primary">JAPANESE CH</span>
                                            <span className="font-label-caps text-label-caps text-on-surface-variant">VI → JA</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1">Output Target</label>
                                                <select
                                                    value={outJa ?? ''}
                                                    onChange={(e) => setOutJa(Number(e.target.value))}
                                                    disabled={active}
                                                    className="w-full bg-surface text-on-surface border-b border-outline-variant rounded-none py-1 px-0 focus:ring-0 focus:border-secondary text-sm disabled:opacity-50"
                                                >
                                                    {outputs.length === 0 && <option value="">No output devices found</option>}
                                                    {outputs.map((d) => <option key={d.index} value={d.index}>{d.name}</option>)}
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => handleTestTone('ja')}
                                                className="w-full border border-outline-variant text-on-surface-variant py-2 text-sm hover:text-primary hover:border-primary transition-colors"
                                            >
                                                {toneStatus.ja || 'Test Tone'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* Footer */}
                    <footer className="bg-surface-container-lowest dark:bg-surface-container-lowest border-t border-outline-variant dark:border-outline-variant flex justify-between items-center w-full px-container-padding py-4 z-10 relative">
                        <p className="font-label-caps text-label-caps text-on-surface-variant dark:text-on-surface-variant">© 2026 PROYAKU · ESUHAI. TWENTIETH ANNIVERSARY EDITION.</p>
                        <div className="flex gap-6">
                            <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy Protocol</a>
                            <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors" href="#">Service Terms</a>
                            <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors" href="#">API Documentation</a>
                        </div>
                    </footer>
                </div>
        </div>
    );
};

export default AudioRouting;
