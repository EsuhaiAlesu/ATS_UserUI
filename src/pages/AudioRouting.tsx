import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    getAudioDevices, getAudioOutputs, getBlocks, getLiveFast, playTestTone, setLiveFast,
} from '../lib/api';
import type { AudioInputDevice, AudioOutputDevice, LiveConfig } from '../lib/api';
import type { LiveLine } from '../lib/LiveSessionContext';
import { isSessionActive, useLiveSession } from '../lib/LiveSessionContext';
import { useMeter } from '../lib/useMeter';
import { buildTtsConfig, loadTtsPrefs, saveTtsPrefs } from '../lib/ttsPrefs';
import { getSchedules } from '../lib/schedule';
import { getSpeakers, findSpeakerByName } from '../lib/speakers';
import { useActiveEvent } from '../lib/ActiveEventContext';
import { computeReadiness, TIER_LABEL } from '../lib/readiness';

// ─────────────────────────────────────────────────────────────────────────────
// Operator console as a clean video-meeting cockpit (Zoom/Teams pattern):
//   • the CENTER is ALWAYS "the screen" — a live bilingual result stage, or a calm
//     standby stage before the event (never a wall of config);
//   • operation controls are a centered row of ICON buttons at the bottom (in-event);
//   • all device/model setup lives behind a ⚙ Settings drawer (pre-event), off the stage.
// Every safety behaviour (A3.2 annunciator, A3.1 trust HUD, A3.4 hold-STOP + no-signal,
// A3.5 pre-flight) is preserved — only the presentation was reorganised.
// ─────────────────────────────────────────────────────────────────────────────

const SELECT_CLS =
    'field-lux transition-shadow w-full bg-surface text-on-surface border border-outline-variant rounded py-2 px-3 ' +
    'focus:ring-0 focus:border-secondary appearance-none cursor-pointer disabled:opacity-50 text-sm';

const langLines = (lines: LiveLine[], lang: string) =>
    lines.filter((l) => l.lang.toLowerCase().startsWith(lang) && l.text.trim());

const monitorLineClass = (age: number) =>
    age === 0
        ? 'fade-current text-secondary font-bold text-2xl md:text-[1.9rem] leading-snug'
        : age === 1
            ? 'fade-older text-on-surface font-semibold text-lg md:text-xl leading-snug'
            : 'text-on-surface-variant opacity-70 font-medium text-base md:text-lg leading-snug';

/** One language column of the live result monitor — pins to the newest line. */
const MonitorColumn: React.FC<{ label: React.ReactNode; lines: LiveLine[]; jp?: boolean }> = ({ label, lines, jp }) => {
    const ref = useRef<HTMLDivElement>(null);
    const dep = `${lines.length}|${lines[lines.length - 1]?.text ?? ''}`;
    useEffect(() => {
        const el = ref.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [dep]);
    return (
        <div className="flex flex-col min-h-0 h-full">
            <div className="shrink-0 flex items-center justify-center py-2.5">{label}</div>
            <div ref={ref} className="flex-1 overflow-y-auto px-6 md:px-10">
                <div className={`min-h-full flex flex-col justify-end gap-4 py-4 ${jp ? 'jp-text' : ''}`}>
                    {lines.map((line, i) => {
                        const age = lines.length - 1 - i;
                        return (
                            <p key={line.lid} lang={jp ? 'ja' : 'vi'} className={monitorLineClass(age)}
                                style={{ lineBreak: jp ? 'strict' : undefined, textShadow: age === 0 ? '0 0 22px rgba(232,184,75,0.28)' : undefined }}>
                                {line.text}
                            </p>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/** A round icon control button (bottom cluster). Kept module-scope for stable identity. */
const RoundBtn: React.FC<{
    icon: string; label: string; title?: string; onClick?: () => void;
    tone?: 'default' | 'active' | 'primary' | 'danger'; disabled?: boolean;
}> = ({ icon, label, title, onClick, tone = 'default', disabled }) => {
    const big = tone === 'primary' || tone === 'danger';
    const ring =
        tone === 'primary' ? 'w-16 h-16 bg-secondary text-on-secondary shadow-lg shadow-secondary/25 hover:opacity-90'
            : tone === 'danger' ? 'w-16 h-16 bg-error text-on-error hover:opacity-90'
                : tone === 'active' ? 'w-14 h-14 bg-secondary/15 text-secondary border border-secondary/50'
                    : 'w-14 h-14 bg-surface-container text-on-surface-variant border border-outline-variant hover:text-on-surface hover:border-outline';
    return (
        <button type="button" title={title ?? label} onClick={onClick} disabled={disabled}
            className="flex flex-col items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            <span className={`rounded-full flex items-center justify-center transition-all ${ring}`}>
                <span className="material-symbols-outlined" style={{ fontSize: big ? '30px' : '25px' }} aria-hidden="true">{icon}</span>
            </span>
            <span className="text-[10px] font-label-caps text-on-surface-variant leading-none">{label}</span>
        </button>
    );
};

const AudioRouting: React.FC = () => {
    const session = useLiveSession();
    const { eventId, event } = useActiveEvent();
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

    // --- UI chrome ---
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [isFs, setIsFs] = useState(false);

    // --- Live operation controls (spec 2.1–2.6) ---
    const [ttsOn, setTtsOn] = useState(() => loadTtsPrefs().enabled);
    const [ttsRate, setTtsRate] = useState(() => { const r = loadTtsPrefs().rate; return typeof r === 'number' && r > 0 ? r : 1; });
    const [ttsHasVoice] = useState(() => { const p = loadTtsPrefs(); return !!(p.vi || p.ja); }); // whether a voice was picked at Chuẩn bị · Giọng đọc
    const [speaker, setSpeaker] = useState(() => { try { return String(JSON.parse(localStorage.getItem('proyaku_speaker') || '{}').name || ''); } catch { return ''; } });
    const [panel, setPanel] = useState<null | 'speed' | 'speaker'>(null);
    // Người nói roster for the dispatch popover: the reusable Bộ nhớ library (spec 1.7) FIRST, then any
    // speakers from today's/last scheduled conference not already in the library (dedupe by name).
    // Frozen at mount (like the rest of the console) — set the library up pre‑event.
    const roster = useMemo(() => {
        const lib = getSpeakers().filter((p) => p.name.trim()).map((p) => ({ id: p.id, name: p.name, role: p.role, lang: p.lang }));
        const now = new Date();
        const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const list = getSchedules();
        const sched = (list.find((c) => c.date >= iso) ?? list[list.length - 1])?.speakers ?? [];
        const seen = new Set(lib.map((p) => p.name.trim().toLowerCase()));
        const extra = sched
            .filter((s) => s.name.trim() && !seen.has(s.name.trim().toLowerCase()))
            .map((s) => ({ id: s.id, name: s.name, role: s.role, lang: s.lang }));
        return [...lib, ...extra];
    }, []);

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

    // VU meter: the live session owns the mic while running; otherwise open a dedicated meter stream.
    const meter = useMeter(active ? null : inputDevice);
    const vuLevel = active ? session.level : meter.level;
    const vuDb = useMemo(() => {
        const rms = active ? vuLevel : meter.rms;
        return rms > 0 ? Math.max(-60, Math.round(20 * Math.log10(rms))) : -60;
    }, [active, vuLevel, meter.rms]);

    // Trust HUD signals (A3.1).
    const lastLine = session.lines[session.lines.length - 1];
    const lastOnScript = lastLine?.onScript;
    const srcLang = session.sourceLang?.lang?.toLowerCase() ?? '';
    const dir = srcLang.startsWith('ja') ? 'JA → VI' : srcLang.startsWith('vi') ? 'VI → JA' : '';
    const e2e = session.timing?.e2e;
    const e2eEstimated = e2e != null && session.timing?.measured === false;   // e2e mới là TỔNG chặng, chưa đo thực (Bước 0 §3.1)
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
        if (active) { session.stop(); return; }
        if (!session.backendOnline) return;   // B0-3a: cổng cứng — không tạo phiên "giả" khi chưa có backend
        // Cổng tiền-live (doc 29 · §4.3c): CẢNH BÁO khi buổi này chưa có dữ liệu riêng (vẫn cho tiếp tục).
        if (eventId) {
            const r = computeReadiness(eventId);
            if (r.usingGeneric) {
                const title = event?.title?.trim() || 'buổi này';
                const ok = window.confirm(
                    `⚠ «${title}» CHƯA có dữ liệu riêng đã kích hoạt (độ chính xác dự kiến: ${TIER_LABEL[r.tier]}).\n\n` +
                    'Matcher sẽ dùng dữ liệu chung / đã lưu → độ chính xác thấp, có thể sai tên riêng và thuật ngữ.\n\n' +
                    'Vẫn bắt đầu?',
                );
                if (!ok) return;
            }
        }
        const ttsBlock = buildTtsConfig(loadTtsPrefs());
        const config: LiveConfig = {
            device: 'mic',
            ...(inputDevice !== null ? { device_index: inputDevice } : {}),
            single_auto: { model: sttModel, mt_model: mtModel, beam_size: 1, targets: { vi: 'ja', ja: 'vi', en: 'ja' } },
            post_correct: true,
            hotwords: true,
            ...(ttsBlock ? { tts: ttsBlock } : {}),
            ...(outVi !== null && outJa !== null ? { outputs: { vi: outVi, ja: outJa } } : {}),
        };
        session.start(config);
    };

    // --- Live control appliers: persist locally (used at next START) + hot-apply via sendCommand ---
    const applyTtsOn = (on: boolean) => { setTtsOn(on); saveTtsPrefs({ ...loadTtsPrefs(), enabled: on }); session.sendCommand({ tts: { on } }); };
    const applyRate = (raw: number) => {
        const v = Math.max(0.5, Math.min(2, Math.round(raw * 10) / 10));
        setTtsRate(v); saveTtsPrefs({ ...loadTtsPrefs(), rate: v }); session.sendCommand({ tts: { rate: v } });
    };
    const saveSpeakerLocal = (name: string) => {
        setSpeaker(name);
        try { const cur = JSON.parse(localStorage.getItem('proyaku_speaker') || '{}'); localStorage.setItem('proyaku_speaker', JSON.stringify({ ...cur, name })); } catch { /* ignore */ }
    };
    // Dispatch a speaker to the live session. If they have a pre‑assigned voice in Bộ nhớ (spec 1.7)
    // and TTS is on, carry the voice id too (best‑effort — the backend applies it if supported).
    const dispatchSpeaker = (name: string) => {
        saveSpeakerLocal(name);
        const prof = findSpeakerByName(name);
        session.sendCommand({ speaker: { name, ...(ttsOn && prof?.voice ? { voice: prof.voice.id } : {}) } });
    };

    // --- A3.4: NO-SIGNAL alarm ---
    const [noSignal, setNoSignal] = useState(false);
    const lastAboveRef = useRef(Date.now());
    useEffect(() => { if (vuLevel > 0.02) lastAboveRef.current = Date.now(); }, [vuLevel]);
    useEffect(() => {
        if (!active) { setNoSignal(false); lastAboveRef.current = Date.now(); return; }
        const id = setInterval(() => setNoSignal(Date.now() - lastAboveRef.current > 2000), 500);
        return () => clearInterval(id);
    }, [active]);

    // --- A3.4: hold-to-confirm STOP ---
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

    // --- Session timer (mm:ss) ---
    const [elapsed, setElapsed] = useState(0);
    const startAtRef = useRef<number | null>(null);
    useEffect(() => {
        if (!active) { startAtRef.current = null; setElapsed(0); return; }
        if (startAtRef.current === null) startAtRef.current = Date.now();
        const id = setInterval(() => setElapsed(Math.floor((Date.now() - (startAtRef.current ?? Date.now())) / 1000)), 1000);
        return () => clearInterval(id);
    }, [active]);
    const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

    // --- Fullscreen (wide-open stage) ---
    useEffect(() => {
        const h = () => setIsFs(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', h);
        return () => document.removeEventListener('fullscreenchange', h);
    }, []);
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => { /* ignore */ });
        else document.exitFullscreen?.().catch(() => { /* ignore */ });
    };

    // --- A3.5: pre-flight readiness ---
    const preflight = [
        { ok: session.backendOnline, label: 'Backend online' },
        { ok: inputDevice !== null, label: 'Đã chọn mic' },
        { ok: !!sttModel, label: 'Model nhận dạng (ASR)' },
        { ok: !!mtModel, label: 'Model dịch (MT)' },
        { ok: outVi !== null, label: 'Ngõ ra VI' },
        { ok: outJa !== null, label: 'Ngõ ra JA' },
        { ok: outVi === null || outJa === null || outVi !== outJa, label: 'VI ≠ JA (khác loa)' },
    ];
    const preflightPass = preflight.filter((i) => i.ok).length;
    const preflightOk = preflight.every((i) => i.ok);
    const [override, setOverride] = useState(false);
    // B0-3a (nghiệm thu T6): "Backend online" là CỔNG CỨNG — override chỉ được bỏ qua cảnh báo
    // thiết bị/mô hình, KHÔNG bao giờ bỏ qua việc thiếu backend (start khi offline chỉ tạo phiên
    // "giả" rồi rơi vào FAULT). Vì thế backendOnline luôn được AND vào điều kiện bắt đầu.
    const canStart = session.backendOnline && (preflightOk || override);

    // --- A3.2: Master Annunciator ---
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

    // Hide the raw offline parse error (annunciator already says OFFLINE); surface real errors.
    const shownError = session.error ?? (session.backendOnline ? deviceError : null);

    const viLive = langLines(session.lines, 'vi');
    const jaLive = langLines(session.lines, 'ja');
    const setupPhase = session.status === 'connecting' || session.status === 'warming';
    const openWall = () => window.open('/stream', 'proyaku-wall');

    return (
        <div className="h-full flex flex-col text-on-background overflow-hidden relative">
            {/* ══════════ TOP BAR (minimal) ══════════ */}
            <header className="shrink-0 h-14 flex items-center gap-4 px-5 border-b border-outline-variant bg-surface-container-lowest">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${master.dot} ${master.anim}`}></span>
                    <span className={`font-label-caps text-label-caps tracking-wide truncate ${master.text}`}>{master.label}</span>
                    {active && <span className="font-label-caps text-label-caps text-on-surface-variant tabular-nums ml-1" style={{ fontFamily: 'ui-monospace, monospace' }}>{mmss}</span>}
                </div>

                {/* Hướng dịch (tự nhận) — cặp icon‑chip tròn đồng bộ dock: bên đang nói SÁNG (vàng),
                    bên chờ TỐI (mờ); mũi tên chỉ đúng chiều nguồn → đích. */}
                <div className="mx-auto flex items-center gap-2" role="status"
                    aria-label={dir ? `Hướng dịch ${dir}` : 'Chưa nhận hướng dịch'}
                    title={dir ? `Đang dịch: ${dir}` : 'Chưa nhận hướng dịch'}>
                    <span aria-hidden="true"
                        className={`w-8 h-8 flex items-center justify-center rounded-full border font-label-caps text-label-caps transition-colors ${dir.startsWith('VI') || !dir ? 'bg-secondary/15 border-secondary text-secondary' : 'border-outline-variant text-on-surface-variant'}`}>VI</span>
                    <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">{dir.startsWith('JA') ? 'arrow_back' : dir.startsWith('VI') ? 'arrow_forward' : 'swap_horiz'}</span>
                    <span aria-hidden="true"
                        className={`w-8 h-8 flex items-center justify-center rounded-full border jp-text font-label-caps text-label-caps transition-colors ${dir.startsWith('JA') ? 'bg-secondary/15 border-secondary text-secondary' : 'border-outline-variant text-on-surface-variant'}`}>JA</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {/* readiness chip → opens settings */}
                    <button onClick={() => setSettingsOpen(true)} title="Kiểm tra sẵn sàng & cài đặt"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-caps text-label-caps border transition-colors ${preflightOk ? 'border-secondary/50 text-secondary' : 'border-outline-variant text-on-surface-variant hover:text-on-surface'}`}>
                        <span className="material-symbols-outlined text-base" aria-hidden="true">{preflightOk ? 'check_circle' : 'checklist'}</span>
                        <span className="hidden sm:inline">{preflightOk ? 'Sẵn sàng' : `${preflightPass}/${preflight.length}`}</span>
                    </button>
                    <button onClick={handleToggleFast} title="Chế độ nhanh — giảm độ trễ"
                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${fastMode ? 'text-on-secondary bg-secondary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}>
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">bolt</span>
                    </button>
                    <button onClick={toggleFullscreen} title={isFs ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                        className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{isFs ? 'fullscreen_exit' : 'fullscreen'}</span>
                    </button>
                </div>
            </header>

            {/* ══════════ CENTER STAGE — always "the screen" ══════════ */}
            <main className="flex-1 min-h-0 relative flex flex-col bg-gradient-radial overflow-hidden">
                {shownError && (
                    <div className="shrink-0 mx-4 mt-4 border border-error text-error font-label-caps text-label-caps px-4 py-2.5 rounded flex items-center gap-2 z-20">
                        <span className="material-symbols-outlined text-base" aria-hidden="true">error</span>
                        <span className="truncate">{shownError}</span>
                    </div>
                )}

                {active && !setupPhase ? (
                    /* LIVE result monitor */
                    <div className="flex-1 min-h-0 relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-surface-container/40 to-transparent pointer-events-none z-0"></div>
                        <div className="absolute inset-0 flex z-10">
                            <div className="flex-1 min-w-0">
                                <MonitorColumn label={<span className="font-label-caps text-label-caps tracking-widest text-secondary border border-secondary/60 rounded px-2.5 py-0.5">Vietnamese</span>} lines={viLive} />
                            </div>
                            <div className="w-px relative flex flex-col items-center justify-center opacity-50 shrink-0" aria-hidden="true">
                                <div className="w-full h-full bg-gradient-to-b from-transparent via-secondary to-transparent"></div>
                                <div className="absolute w-2 h-2 rotate-45 border border-secondary bg-primary-container"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <MonitorColumn jp label={<span className="jp-text font-label-caps text-label-caps tracking-widest text-secondary border border-secondary/60 rounded px-2.5 py-0.5">日本語</span>} lines={jaLive} />
                            </div>
                        </div>
                        {viLive.length === 0 && jaLive.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 pointer-events-none z-20">
                                <span className="material-symbols-outlined text-secondary opacity-70 listening-pulse" style={{ fontSize: '40px' }} aria-hidden="true">hearing</span>
                                <span className="font-semibold text-xl text-secondary opacity-90">Đang chờ diễn giả…</span>
                                <span className="jp-text text-base text-on-surface-variant opacity-70">お待ちください</span>
                            </div>
                        )}
                    </div>
                ) : setupPhase ? (
                    /* Connecting / warming */
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-5 px-6">
                        <span className="material-symbols-outlined text-secondary listening-pulse" style={{ fontSize: '52px' }} aria-hidden="true">
                            {session.status === 'warming' ? 'model_training' : 'sync'}
                        </span>
                        <span className={`font-headline-sm text-headline-sm ${master.text}`}>{master.label}</span>
                        {session.status === 'warming' && session.warming && (
                            <div className="w-full max-w-md">
                                <div className="vu-meter-bar"><div className="vu-meter-fill" style={{ width: `${session.warming.steps ? Math.round((session.warming.step / session.warming.steps) * 100) : 10}%` }}></div></div>
                                <p className="mt-2 text-center font-label-caps text-label-caps text-on-surface-variant">{session.warming.detail || 'Đang nạp mô hình…'}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* STANDBY stage — clean, ceremonial; the center is still "a screen" */
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
                            <span className={`font-label-caps text-label-caps tracking-[0.3em] ${session.backendOnline ? 'text-secondary' : 'text-error'}`}>
                                {session.backendOnline ? 'PROYAKU · SẴN SÀNG' : 'PROYAKU · CHỜ LÕI DỊCH'}
                            </span>
                            <span className="text-sm text-on-surface-variant max-w-md leading-relaxed">
                                {!session.backendOnline
                                    ? 'Backend (lõi dịch) chưa online — chạy backend trên Mac Studio rồi mới bắt đầu được.'
                                    : canStart
                                        ? 'Nhấn ● Bắt đầu ở thanh dưới để lên sóng — kết quả song ngữ sẽ hiện ngay tại đây.'
                                        : 'Mở ⚙ Cài đặt để chọn mic & mô hình, rồi Bắt đầu.'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Trust HUD strip (A3.1) */}
                {active && (
                    <div className="shrink-0 border-t border-outline-variant/60 bg-surface-container-lowest px-5 py-2 overflow-x-auto z-20">
                        <div className="flex items-center gap-x-6 gap-y-1 whitespace-nowrap font-label-caps text-label-caps" style={{ fontFamily: 'ui-monospace, monospace' }}>
                            <span className="text-on-surface-variant">HƯỚNG <span className="text-primary">{dir || '—'}</span>{session.sourceLang ? ` ${pct(session.sourceLang.prob)}` : ''}</span>
                            <span className="text-on-surface-variant">TRỄ E2E <span className={e2e == null ? 'text-on-surface-variant' : e2e < 2000 ? 'text-secondary' : 'text-error'}>{e2eEstimated ? '~' : ''}{fmtMs(e2e)}</span>{e2eEstimated ? ' (tổng)' : ''}{session.timing ? ` · STT ${fmtMs(session.timing.stt)} MT ${fmtMs(session.timing.mt)}` : ''}</span>
                            <span className="text-on-surface-variant">KHỚP KỊCH BẢN <span className="text-secondary">{pct(lastOnScript)}</span></span>
                            <span className="text-on-surface-variant">SỬA TÊN <span className="text-secondary">{session.nameFixCount}</span></span>
                            {session.speakingLang && <span className="text-secondary inline-flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">volume_up</span>ĐANG ĐỌC {session.speakingLang.toUpperCase()}</span>}
                            {session.contextSummary && <span className="text-on-surface-variant">NGỮ CẢNH: {session.contextSummary}</span>}
                        </div>
                    </div>
                )}

                {/* thin always-on VU line at the very bottom of the stage */}
                <div className={`shrink-0 h-1 w-full ${noSignal ? 'bg-error/20' : 'bg-surface-container'}`}>
                    <div className={`h-full transition-all duration-100 ${noSignal ? 'bg-error' : 'bg-gradient-to-r from-primary-fixed via-secondary to-secondary'}`} style={{ width: `${Math.round(Math.min(1, vuLevel) * 100)}%` }}></div>
                </div>
            </main>

            {/* ══════════ BOTTOM CONTROL CLUSTER (icon buttons) ══════════ */}
            <footer className={`relative shrink-0 h-24 flex items-center justify-center gap-5 px-5 border-t border-outline-variant bg-surface-container-lowest ${panel ? 'z-40' : ''}`}>
                <RoundBtn icon={noSignal ? 'mic_off' : 'mic'} label={noSignal ? 'KHÔNG TÍN HIỆU' : `MIC ${vuDb}dB`}
                    title="Nguồn thu — mở Cài đặt để đổi mic" onClick={() => { setPanel(null); setSettingsOpen(true); }} tone={noSignal ? 'danger' : active ? 'active' : 'default'} />

                {active ? (
                    <button type="button" onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold} title="Giữ để dừng phiên"
                        className="flex flex-col items-center gap-1.5 select-none">
                        <span className="relative w-16 h-16 rounded-full overflow-hidden bg-error text-on-error flex items-center justify-center">
                            <span className="absolute inset-x-0 bottom-0 bg-on-error/30" style={{ height: `${Math.round(holdPct * 100)}%` }}></span>
                            <span className="material-symbols-outlined relative" style={{ fontSize: '30px' }} aria-hidden="true">stop</span>
                        </span>
                        <span className="text-[10px] font-label-caps text-error leading-none">{holdPct > 0 ? `GIỮ… ${Math.round(holdPct * 100)}%` : 'DỪNG (giữ)'}</span>
                    </button>
                ) : (
                    <RoundBtn icon="play_arrow" label="BẮT ĐẦU" title={canStart ? 'Bắt đầu phiên dịch' : !session.backendOnline ? 'Backend (lõi dịch) offline — không thể bắt đầu' : 'Chưa đạt kiểm tra thiết bị — mở Cài đặt'} tone="primary" disabled={!canStart} onClick={handleStartStop} />
                )}

                {active && (
                    <>
                        <RoundBtn icon="play_arrow" label="Live" title="Phát trực tiếp" tone={session.audienceCut === 'live' ? 'active' : 'default'} onClick={() => session.setAudienceCut('live')} />
                        <RoundBtn icon="ac_unit" label="Giữ hình" title="Đóng băng dòng cuối (freeze)" tone={session.audienceCut === 'freeze' ? 'active' : 'default'} onClick={() => session.setAudienceCut('freeze')} />
                        <RoundBtn icon="block" label="An toàn" title="Màn an toàn (slate)" tone={session.audienceCut === 'slate' ? 'active' : 'default'} onClick={() => session.setAudienceCut('slate')} />
                    </>
                )}

                <div className="w-px h-12 bg-outline-variant mx-1"></div>
                {/* live operation controls (spec 2.1–2.6) — hot-applied via sendCommand */}
                <RoundBtn icon={ttsOn && ttsHasVoice ? 'volume_up' : 'subtitles'} label={ttsOn && ttsHasVoice ? 'Giọng' : 'Phụ đề'}
                    title={!ttsHasVoice ? 'Chưa chọn giọng đọc — vào Chuẩn bị · Giọng đọc để chọn; hiện chỉ phụ đề' : ttsOn ? 'Đang đọc tiếng — bấm để chỉ phụ đề' : 'Chỉ phụ đề — bấm để bật đọc tiếng'}
                    tone={ttsOn && ttsHasVoice ? 'active' : 'default'} disabled={!ttsHasVoice} onClick={() => applyTtsOn(!ttsOn)} />
                <RoundBtn icon="speed" label={`${ttsRate.toFixed(1)}×`} title="Tốc độ giọng đọc" tone={panel === 'speed' ? 'active' : 'default'} onClick={() => setPanel((p) => (p === 'speed' ? null : 'speed'))} />
                <RoundBtn icon="record_voice_over" label="Người nói" title="Điều phối người phát biểu" tone={panel === 'speaker' ? 'active' : 'default'} onClick={() => setPanel((p) => (p === 'speaker' ? null : 'speaker'))} />
                <RoundBtn icon="menu_book" label="Từ điển" title="Mở Từ điển (cửa sổ mới)" onClick={() => window.open('/glossary', 'proyaku-glossary')} />

                <div className="w-px h-12 bg-outline-variant mx-1"></div>
                <RoundBtn icon="settings" label="Cài đặt" title="Cấu hình thiết bị & mô hình (pre-event)" onClick={() => { setPanel(null); setSettingsOpen(true); }} />
                <RoundBtn icon="open_in_new" label="Tường" title="Mở Tường phụ đề" onClick={openWall} />
            </footer>

            {/* ══════════ LIVE-CONTROL POPOVERS (anchored above the footer) ══════════ */}
            {panel && (
                <>
                    <div className="absolute inset-0 z-30" onClick={() => setPanel(null)}></div>
                    <div className="absolute bottom-[104px] left-1/2 -translate-x-1/2 z-40 w-[min(92vw,380px)] rounded-2xl border border-outline-variant bg-surface-container-high p-4 shadow-2xl"
                        style={{ boxShadow: '0 18px 48px rgba(0,0,0,0.55)' }}>
                        {panel === 'speed' && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-label-caps text-label-caps text-on-surface-variant">TỐC ĐỘ GIỌNG ĐỌC</span>
                                    <span className="text-title-md font-bold text-secondary tabular-nums">{ttsRate.toFixed(1)}×</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => applyRate(ttsRate - 0.1)} disabled={ttsRate <= 0.5}
                                        className="w-9 h-9 shrink-0 rounded-full border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-40 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-lg" aria-hidden="true">remove</span>
                                    </button>
                                    <input type="range" min={0.5} max={2} step={0.1} value={ttsRate}
                                        onChange={(e) => applyRate(Number(e.target.value))} className="flex-1 accent-[var(--secondary)]" />
                                    <button onClick={() => applyRate(ttsRate + 0.1)} disabled={ttsRate >= 2}
                                        className="w-9 h-9 shrink-0 rounded-full border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-40 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-lg" aria-hidden="true">add</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[0.8, 1, 1.2, 1.5].map((v) => (
                                        <button key={v} onClick={() => applyRate(v)}
                                            className={`h-9 rounded-lg text-label-md font-medium border transition-colors ${Math.abs(ttsRate - v) < 0.05 ? 'border-secondary bg-secondary/15 text-secondary' : 'border-outline-variant text-on-surface-variant hover:text-on-surface'}`}>
                                            {v}×
                                        </button>
                                    ))}
                                </div>
                                <p className="text-body-sm text-on-surface-variant">Áp ngay khi đang chạy; nếu chưa có phiên sẽ dùng ở lần Bắt đầu.</p>
                            </div>
                        )}
                        {panel === 'speaker' && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-label-caps text-label-caps text-on-surface-variant">NGƯỜI PHÁT BIỂU</span>
                                    {speaker && (
                                        <button onClick={() => { saveSpeakerLocal(''); session.sendCommand({ speaker: { name: '' } }); }}
                                            className="text-label-md text-on-surface-variant hover:text-error">Xoá</button>
                                    )}
                                </div>
                                {roster.length > 0 ? (
                                    <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
                                        {roster.map((s) => (
                                            <button key={s.id} onClick={() => { dispatchSpeaker(s.name); setPanel(null); }}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${speaker === s.name ? 'border-secondary bg-secondary/12' : 'border-outline-variant hover:bg-surface-container'}`}>
                                                <span className="material-symbols-outlined text-xl text-on-surface-variant shrink-0" aria-hidden="true">person</span>
                                                <span className="min-w-0">
                                                    <span className="block text-body-md text-on-surface truncate">{s.name || '(chưa đặt tên)'}</span>
                                                    {(s.role || s.lang) && <span className="block text-body-sm text-on-surface-variant truncate">{[s.role, s.lang ? s.lang.toUpperCase() : ''].filter(Boolean).join(' · ')}</span>}
                                                </span>
                                                {speaker === s.name && <span className="material-symbols-outlined text-lg text-secondary ml-auto shrink-0" aria-hidden="true">check</span>}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-body-sm text-on-surface-variant">Chưa có người nói nào. Nhập tay bên dưới, hoặc thêm ở <span className="text-secondary">Chuẩn bị · Bộ nhớ</span> / <span className="text-secondary">Đặt lịch</span>.</p>
                                )}
                                <div className="flex items-center gap-2 pt-1 border-t border-outline-variant">
                                    <input value={speaker} onChange={(e) => saveSpeakerLocal(e.target.value)}
                                        onBlur={(e) => session.sendCommand({ speaker: { name: e.target.value } })}
                                        placeholder="Nhập tên người nói…"
                                        className="field-lux transition-shadow flex-1 min-w-0 bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-secondary" />
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ══════════ SETTINGS DRAWER (pre-event config) ══════════ */}
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
                            {/* Pre-flight readiness */}
                            <section>
                                <div className="flex items-center gap-2 mb-2.5">
                                    <span className={`material-symbols-outlined ${preflightOk ? 'text-secondary' : 'text-primary'}`} aria-hidden="true">{preflightOk ? 'check_circle' : 'checklist'}</span>
                                    <span className={`font-label-caps text-label-caps ${preflightOk ? 'text-secondary' : 'text-on-surface'}`}>{preflightOk ? 'SẴN SÀNG — TẤT CẢ ĐÃ ĐẠT' : `KIỂM TRA · ${preflightPass}/${preflight.length} đạt`}</span>
                                </div>
                                <div className="space-y-1.5">
                                    {preflight.map((it) => (
                                        <div key={it.label} className="flex items-center gap-2 font-label-caps text-label-caps">
                                            <span className={`material-symbols-outlined ${it.ok ? 'text-secondary' : 'text-error'}`} style={{ fontSize: '1.05rem' }} aria-hidden="true">{it.ok ? 'check_circle' : 'cancel'}</span>
                                            <span className={it.ok ? 'text-on-surface-variant' : 'text-error'}>{it.label}</span>
                                        </div>
                                    ))}
                                </div>
                                {!preflightOk && (
                                    <div className="mt-3 space-y-1.5">
                                        <label className="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant cursor-pointer">
                                            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="accent-secondary" />
                                            Bỏ qua kiểm tra thiết bị (override) — chỉ khi diễn tập
                                        </label>
                                        {!session.backendOnline && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-error">
                                                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">lock</span>
                                                Không bỏ qua được "Backend online" — cần chạy backend mới bắt đầu.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>

                            <div className="h-px bg-outline-variant"></div>

                            {/* Source */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">mic_external_on</span><h3 className="font-label-caps text-label-caps text-on-surface">Nguồn vào</h3></div>
                                <div>
                                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">Micro</label>
                                    <select value={inputDevice ?? ''} onChange={(e) => setInputDevice(Number(e.target.value))} disabled={active} className={SELECT_CLS}>
                                        {inputs.length === 0 && <option value="">Chưa thấy thiết bị vào</option>}
                                        {inputs.map((d) => <option key={d.index} value={d.index}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">Model nhận dạng (ASR)</label>
                                    <select value={sttModel} onChange={(e) => setSttModel(e.target.value)} disabled={active} className={SELECT_CLS}>
                                        {sttModels.length === 0 && <option value="">— backend offline —</option>}
                                        {sttModels.map((m) => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </section>

                            {/* Engine */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">bolt</span><h3 className="font-label-caps text-label-caps text-on-surface">Lõi dịch</h3></div>
                                <div>
                                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">Model dịch (MT)</label>
                                    <select value={mtModel} onChange={(e) => setMtModel(e.target.value)} disabled={active} className={SELECT_CLS}>
                                        {mtModels.length === 0 && <option value="">— backend offline —</option>}
                                        {mtModels.map((m) => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <label className="flex items-center justify-between gap-2 cursor-pointer py-1">
                                    <span className="font-label-caps text-label-caps text-on-surface-variant">Chế độ nhanh (Fast)</span>
                                    <button onClick={handleToggleFast} className={`font-label-caps text-label-caps px-2.5 py-1 rounded-full ${fastMode ? 'bg-secondary text-on-secondary' : 'border border-outline-variant text-on-surface-variant'}`}>{fastMode ? 'ON' : 'OFF'}</button>
                                </label>
                                <p className="text-xs text-on-surface-variant leading-relaxed">TTS đọc tiếng bật/tắt ở trang <span className="text-on-surface">Giọng đọc</span>. Hậu-kiểm &amp; hotword luôn bật.</p>
                            </section>

                            {/* Outputs */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">speaker</span><h3 className="font-label-caps text-label-caps text-on-surface">Ngõ ra</h3></div>
                                <div>
                                    <div className="flex justify-between items-center mb-1.5"><label className="font-label-caps text-label-caps text-on-surface-variant">Loa VI</label><span className="font-label-caps text-label-caps text-on-surface-variant">JA → VI</span></div>
                                    <select value={outVi ?? ''} onChange={(e) => setOutVi(Number(e.target.value))} disabled={active} className={SELECT_CLS}>
                                        {outputs.length === 0 && <option value="">Chưa thấy loa</option>}
                                        {outputs.map((d) => <option key={d.index} value={d.index}>{d.name}</option>)}
                                    </select>
                                    <button onClick={() => handleTestTone('vi')} className="mt-2 w-full border border-outline-variant text-on-surface-variant py-1.5 rounded text-xs hover:text-primary hover:border-primary transition-colors">{toneStatus.vi || 'Test loa VI'}</button>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1.5"><label className="font-label-caps text-label-caps text-on-surface-variant">Loa JA</label><span className="font-label-caps text-label-caps text-on-surface-variant">VI → JA</span></div>
                                    <select value={outJa ?? ''} onChange={(e) => setOutJa(Number(e.target.value))} disabled={active} className={SELECT_CLS}>
                                        {outputs.length === 0 && <option value="">Chưa thấy loa</option>}
                                        {outputs.map((d) => <option key={d.index} value={d.index}>{d.name}</option>)}
                                    </select>
                                    <button onClick={() => handleTestTone('ja')} className="mt-2 w-full border border-outline-variant text-on-surface-variant py-1.5 rounded text-xs hover:text-primary hover:border-primary transition-colors">{toneStatus.ja || 'Test loa JA'}</button>
                                </div>
                            </section>
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
};

export default AudioRouting;
