import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getAudioDevices, getAudioOutputs, getBlocks, getLiveFast, playTestTone, setLiveFast,
} from '../lib/api';
import { getAudioProfiles, upsertAudioProfile, removeAudioProfile, newAudioProfileId } from '../lib/audioProfiles';
import type { AudioProfile } from '../lib/audioProfiles';
import type { AudioInputDevice, AudioOutputDevice, LiveConfig } from '../lib/api';
import type { LiveLine } from '../lib/LiveSessionContext';
import { isSessionActive, useLiveSession } from '../lib/LiveSessionContext';
import { useMeter } from '../lib/useMeter';
import { buildTtsConfig, loadTtsPrefs, saveTtsPrefs } from '../lib/ttsPrefs';
import { getSchedules } from '../lib/schedule';
import { getSpeakers, findSpeakerByName } from '../lib/speakers';
import { useActiveEvent } from '../lib/ActiveEventContext';
import { computeReadiness, TIER_LABEL } from '../lib/readiness';
// FIX-07: ONLINE mode integration — a sanctioned facade-root import (live-screen mode switch).
import { OnlinePanel, fetchOnlineConfigStatus } from '../lib/lanes/online';

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
    'field-lux transition-shadow w-full bg-surface text-on-surface border border-outline-variant rounded-DEFAULT py-2 px-3 ' +
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

/** A control row for the LEFT control rail: icon + nhãn (+ chấm trạng thái). Module-scope cho identity ổn định. */
const RailBtn: React.FC<{
    icon: string; label: string; title?: string; onClick?: () => void;
    tone?: 'default' | 'active' | 'primary' | 'danger'; disabled?: boolean; dot?: string; big?: boolean;
}> = ({ icon, label, title, onClick, tone = 'default', disabled, dot, big }) => {
    const cls =
        tone === 'primary' ? 'bg-secondary text-on-secondary hover:opacity-90 shadow-lg shadow-secondary/20'
            : tone === 'danger' ? 'bg-error text-on-error hover:opacity-90'
                : tone === 'active' ? 'bg-secondary/15 text-secondary border border-secondary/40'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-transparent';
    return (
        <button type="button" title={title ?? label} onClick={onClick} disabled={disabled}
            className={`relative w-full flex items-center gap-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${big ? 'px-3.5 py-3' : 'px-3 py-2.5'} ${cls}`}>
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: big ? '24px' : '21px' }} aria-hidden="true">{icon}</span>
            <span className={`flex-1 min-w-0 text-left leading-tight truncate font-medium ${big ? 'text-[16px]' : 'text-[14.5px]'}`}>{label}</span>
            {dot && <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${dot}`} aria-hidden="true"></span>}
        </button>
    );
};

// ── Âm lượng ngõ ra (doc 31 · B1) ────────────────────────────────────────────
// Lật thành `true` khi đội backend XÁC NHẬN đã áp `gains` (config) + `audio.gain` (set) — xem doc 32.
// Khi false: fader vẫn hoạt động (lưu + gửi lệnh), chỉ hiện chú thích "chờ backend" để không gây hiểu nhầm.
const AUDIO_GAIN_BACKEND_READY = false;

type VolSet = { vi: number; ja: number; master: number };
const clampVol = (n: unknown, d: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : d);
const loadVols = (): VolSet => {
    try {
        const v = JSON.parse(localStorage.getItem('proyaku_audio_vol') || '{}');
        return { vi: clampVol(v.vi, 100), ja: clampVol(v.ja, 100), master: clampVol(v.master, 100) };
    } catch { return { vi: 100, ja: 100, master: 100 }; }
};
// UI 0–100% → gain 0.0–1.0 (unity = 1.0). Chỉ suy giảm, không khuếch đại (an toàn, tránh méo/clip).
const gainsFrom = (v: VolSet) => ({ vi: v.vi / 100, ja: v.ja / 100, master: v.master / 100 });

// Một fader âm lượng 0–100% có nhãn — dùng chung cho panel dưới thanh điều khiển + ngăn Cài đặt.
const VolRow: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => (
    <div className="flex items-center gap-3">
        <span className="w-14 shrink-0 font-label-caps text-label-caps text-on-surface-variant">{label}</span>
        <input type="range" min={0} max={100} step={1} value={value}
            aria-label={`Âm lượng ${label}`}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 accent-[var(--secondary)]" />
        <span className="w-11 shrink-0 text-right tabular-nums text-sm text-on-surface">{value}%</span>
    </div>
);

// ── Nhận diện loại thiết bị từ tên (doc 31 · A2/A6) — icon + nhãn + cờ Bluetooth (để cảnh báo trễ) ──
type DeviceKind = { icon: string; label: string; bt: boolean };
const deviceKind = (name?: string): DeviceKind => {
    const n = (name ?? '').toLowerCase();
    if (/blue\s?tooth|airpod|handsfree|a2dp|\bbt\b/.test(n)) return { icon: 'bluetooth', label: 'Bluetooth', bt: true };
    if (/dante|loopback|aggregate|blackhole|soundflower|virtual|ảo/.test(n)) return { icon: 'lan', label: 'Ảo / mạng', bt: false };
    if (/usb/.test(n)) return { icon: 'usb', label: 'USB', bt: false };
    if (/hdmi|display|monitor/.test(n)) return { icon: 'tv', label: 'HDMI', bt: false };
    if (/built[\s-]?in|macbook|internal|imac|mac\s?studio|mac\s?mini|tích hợp/.test(n)) return { icon: 'laptop_mac', label: 'Tích hợp', bt: false };
    return { icon: 'speaker', label: 'Loa', bt: false };
};

// Trạng thái trợ lý kiểm tra loa (A3).
type CheckStatus = 'idle' | 'playing' | 'ok' | 'fail';

// Nhãn vùng loa (A5) — lưu tại máy.
const loadLabels = (): { vi: string; ja: string } => {
    try { const v = JSON.parse(localStorage.getItem('proyaku_audio_labels') || '{}'); return { vi: String(v.vi ?? ''), ja: String(v.ja ?? '') }; }
    catch { return { vi: '', ja: '' }; }
};

const hhmmNow = (): string => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// ── Định tuyến phụ đề đa màn (doc 34 · Bước 1) — mỗi "màn" chọn ngôn ngữ, mở cửa sổ /stream tương ứng ──
type SubMode = 'both' | 'stacked' | 'vi' | 'ja';
type SubOutput = { id: string; label: string; enabled: boolean; mode: SubMode; screenIdx?: number };
// Window Management API (Chrome/Edge 100+) — khai báo tối thiểu để không lệ thuộc phiên bản TS lib; LUÔN có fallback.
interface WmScreen { availLeft: number; availTop: number; availWidth: number; availHeight: number; isPrimary: boolean; label: string }
interface WmScreenDetails { screens: WmScreen[]; addEventListener?: (t: string, cb: () => void) => void }
type ScreenSupport = 'idle' | 'unsupported' | 'single' | 'multi' | 'denied';
const SUB_MODES: { v: SubMode; l: string }[] = [
    { v: 'both', l: 'Cả 2 (2 cột)' }, { v: 'stacked', l: 'Xếp dọc' }, { v: 'vi', l: 'Chỉ VI' }, { v: 'ja', l: 'Chỉ 日本語' },
];
// Mặc định gala: Màn giữa = cả 2 ngôn ngữ · Màn trái = VI · Màn phải = 日本語.
const DEFAULT_SUB_OUTPUTS: SubOutput[] = [
    { id: 'center', label: 'Màn giữa', enabled: true, mode: 'both' },
    { id: 'left', label: 'Màn trái', enabled: true, mode: 'vi' },
    { id: 'right', label: 'Màn phải', enabled: true, mode: 'ja' },
];
const loadSubOutputs = (): SubOutput[] => {
    try {
        const a = JSON.parse(localStorage.getItem('proyaku_subtitle_outputs') || 'null');
        if (Array.isArray(a) && a.length) return a.filter((o) => o && typeof o.id === 'string');
    } catch { /* ignore */ }
    return DEFAULT_SUB_OUTPUTS;
};

// The existing OFFLINE conference console — unchanged. The default export below wraps it with the
// ONLINE/OFFLINE mode switch (FIX-07). When OFFLINE is selected this renders exactly as before.
const OfflineConsole: React.FC = () => {
    const session = useLiveSession();
    const { eventId, event } = useActiveEvent();
    const nav = useNavigate();
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
    const [panel, setPanel] = useState<null | 'speed' | 'speaker' | 'volume' | 'wall'>(null);
    // Định tuyến phụ đề đa màn (doc 34) — mặc định 3 màn (giữa cả 2 · trái VI · phải JA).
    const [subOutputs, setSubOutputs] = useState<SubOutput[]>(loadSubOutputs);
    // Bước 2: Window Management API — danh sách màn thật + trạng thái hỗ trợ.
    const [screens, setScreens] = useState<WmScreen[]>([]);
    const [screenSupport, setScreenSupport] = useState<ScreenSupport>('idle');
    // Âm lượng ngõ ra (0–100% mỗi kênh + tổng). Lưu tại máy; hot-apply giữa phiên; gửi trong config lúc BẮT ĐẦU.
    const [vols, setVols] = useState<VolSet>(loadVols);
    // Nhãn vùng loa (A5) · trạng thái trợ lý kiểm tra loa (A3) · hồ sơ âm thanh (A4) · quét thiết bị (A1).
    const [labels, setLabels] = useState<{ vi: string; ja: string }>(loadLabels);
    const [checkState, setCheckState] = useState<{ vi: CheckStatus; ja: CheckStatus }>({ vi: 'idle', ja: 'idle' });
    const [profiles, setProfiles] = useState<AudioProfile[]>(getAudioProfiles);
    const [scanning, setScanning] = useState(false);
    const [lastScan, setLastScan] = useState('');
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

    // A1: quét/nạp lại danh sách thiết bị (nhặt loa BT/USB vừa ghép ở macOS). GIỮ nguyên lựa chọn hiện tại.
    const rescanDevices = useCallback(async () => {
        setScanning(true);
        try {
            const [d, o] = await Promise.all([getAudioDevices(), getAudioOutputs()]);
            setInputs(d.devices);
            setDeviceError(d.error ?? null);
            setInputDevice((cur) => cur ?? d.default ?? d.devices[0]?.index ?? null);
            setOutputs(o.devices);
            setOutVi((cur) => cur ?? o.default ?? o.devices[0]?.index ?? null);
            setOutJa((cur) => cur ?? o.default ?? o.devices[0]?.index ?? null);
            // Topo thiết bị có thể đã đổi (index trỏ sang loa khác) → xoá "đã nghe rõ" cũ, phải kiểm lại.
            setCheckState({ vi: 'idle', ja: 'idle' });
        } catch (e) {
            setDeviceError(String(e));
        } finally {
            setScanning(false);
            setLastScan(hhmmNow());
        }
    }, []);

    useEffect(() => {
        rescanDevices();
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
    }, [rescanDevices]);

    // VU meter: the live session owns the mic while running; otherwise open a dedicated meter stream.
    // Mức âm vào hiển thị bằng thanh VU mảnh ở đáy sân khấu (dưới) + đèn trạng thái (mất tín hiệu).
    const meter = useMeter(active ? null : inputDevice);
    const vuLevel = active ? session.level : meter.level;

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

    // A3 — Trợ lý kiểm tra loa: phát thử rồi để người vận hành xác nhận nghe rõ / không.
    const startCheck = (ch: 'vi' | 'ja') => { setCheckState((s) => ({ ...s, [ch]: 'playing' })); handleTestTone(ch); };
    const confirmCheck = (ch: 'vi' | 'ja', ok: boolean) => setCheckState((s) => ({ ...s, [ch]: ok ? 'ok' : 'fail' }));
    // Đổi loa → hủy kết quả kiểm tra cũ (loa khác phải nghe lại).
    const pickOut = (ch: 'vi' | 'ja', index: number) => {
        (ch === 'vi' ? setOutVi : setOutJa)(index);
        setCheckState((s) => ({ ...s, [ch]: 'idle' }));
    };

    // A5 — Nhãn vùng loa (lưu tại máy).
    const saveLabel = (ch: 'vi' | 'ja', text: string) => {
        setLabels((prev) => {
            const next = { ...prev, [ch]: text };
            try { localStorage.setItem('proyaku_audio_labels', JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    };

    // A4 — Hồ sơ âm thanh theo hội trường.
    const saveCurrentProfile = () => {
        const name = window.prompt('Tên hồ sơ âm thanh (vd: "Hội trường A")')?.trim();
        if (!name) return;
        const existing = profiles.find((p) => p.name.toLowerCase() === name.toLowerCase());
        const prof: AudioProfile = {
            id: existing?.id ?? newAudioProfileId(),
            name, inputDevice, outVi, outJa, vols, labelVi: labels.vi, labelJa: labels.ja, updatedAt: Date.now(),
        };
        setProfiles(upsertAudioProfile(prof));
    };
    const applyProfile = (p: AudioProfile) => {
        setInputDevice(p.inputDevice);
        setOutVi(p.outVi); setOutJa(p.outJa);
        setVols(p.vols);
        try { localStorage.setItem('proyaku_audio_vol', JSON.stringify(p.vols)); } catch { /* ignore */ }
        const nextLabels = { vi: p.labelVi, ja: p.labelJa };
        setLabels(nextLabels);
        try { localStorage.setItem('proyaku_audio_labels', JSON.stringify(nextLabels)); } catch { /* ignore */ }
        setCheckState({ vi: 'idle', ja: 'idle' });
        session.sendCommand({ audio: { gain: gainsFrom(p.vols) } });
    };
    const deleteProfile = (id: string) => { if (window.confirm('Xoá hồ sơ âm thanh này?')) setProfiles(removeAudioProfile(id)); };

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
            gains: gainsFrom(vols),
        };
        session.start(config);
    };

    // --- Live control appliers: persist locally (used at next START) + hot-apply via sendCommand ---
    const applyTtsOn = (on: boolean) => { setTtsOn(on); saveTtsPrefs({ ...loadTtsPrefs(), enabled: on }); session.sendCommand({ tts: { on } }); };
    const applyRate = (raw: number) => {
        const v = Math.max(0.5, Math.min(2, Math.round(raw * 10) / 10));
        setTtsRate(v); saveTtsPrefs({ ...loadTtsPrefs(), rate: v }); session.sendCommand({ tts: { rate: v } });
    };
    // Âm lượng: lưu tại máy (dùng ở lần BẮT ĐẦU kế) + hot-apply ngay qua sendCommand nếu đang chạy.
    const applyVol = (patch: Partial<VolSet>) => {
        const next = { ...vols, ...patch };
        setVols(next);
        try { localStorage.setItem('proyaku_audio_vol', JSON.stringify(next)); } catch { /* ignore */ }
        session.sendCommand({ audio: { gain: gainsFrom(next) } });
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
    // A7: kiểm cả việc thiết bị đã chọn CÒN trong danh sách (rút dây / mất BT sau khi quét sẽ rớt kiểm tra).
    const micReady = inputDevice !== null && inputs.some((d) => d.index === inputDevice);
    const viReady = outVi !== null && outputs.some((d) => d.index === outVi);
    const jaReady = outJa !== null && outputs.some((d) => d.index === outJa);
    const preflight = [
        { ok: session.backendOnline, label: 'Backend online' },
        { ok: micReady, label: 'Mic sẵn sàng' },
        { ok: !!sttModel, label: 'Model nhận dạng (ASR)' },
        { ok: !!mtModel, label: 'Model dịch (MT)' },
        { ok: viReady, label: 'Loa VI sẵn sàng' },
        { ok: jaReady, label: 'Loa JA sẵn sàng' },
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
    // Định tuyến phụ đề (doc 34 · Bước 1): cập nhật + lưu tại máy.
    const patchSubOutputs = (next: SubOutput[]) => {
        setSubOutputs(next);
        try { localStorage.setItem('proyaku_subtitle_outputs', JSON.stringify(next)); } catch { /* ignore */ }
    };
    // Bước 2: liệt kê MÀN THẬT qua Window Management API (Chrome/Edge). Có fallback đầy đủ.
    const detectScreens = useCallback(async () => {
        const wm = (window as unknown as { getScreenDetails?: () => Promise<WmScreenDetails> }).getScreenDetails;
        const isExt = (window.screen as unknown as { isExtended?: boolean }).isExtended;
        // Sau khi quét: bỏ gán màn nào trỏ RA NGOÀI số màn còn nhận diện được (đã rút màn → index cũ vô hiệu),
        // tránh dropdown "blank mà vẫn giữ index" và tránh trỏ nhầm màn. n = số màn được phép gán (0 nếu chỉ 1 màn).
        const reconcile = (n: number) => setSubOutputs((prev) => {
            const next = prev.map((o) => (o.screenIdx != null && o.screenIdx >= n ? { ...o, screenIdx: undefined } : o));
            if (!next.some((o, i) => o !== prev[i])) return prev;
            try { localStorage.setItem('proyaku_subtitle_outputs', JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
        if (typeof wm !== 'function') { setScreens([]); setScreenSupport('unsupported'); return; }
        if (isExt === false) { setScreens([]); setScreenSupport('single'); reconcile(0); return; }
        try {
            const d = await wm();
            const list = Array.isArray(d.screens) ? d.screens : [];
            const multi = list.length > 1;
            setScreens(list);
            setScreenSupport(multi ? 'multi' : 'single');
            reconcile(multi ? list.length : 0);
        } catch { setScreens([]); setScreenSupport('denied'); }
    }, []);

    // TỰ ĐỘNG quét màn hình khi MỞ panel "Xuất phụ đề" (mở panel = thao tác người dùng → được phép xin quyền
    // window-management). detectScreens đã có fallback: 1 màn → không xin quyền; đã cấp quyền → tự điền im lặng.
    useEffect(() => { if (panel === 'wall') detectScreens(); }, [panel, detectScreens]);

    // Nhớ cửa sổ đã mở theo từng "màn" (id) — để lần bấm sau ĐƯA ĐÚNG VỊ TRÍ, vì window.open tái dùng cửa sổ
    // cùng tên và BỎ QUA chuỗi toạ độ (chỉ áp lúc TẠO MỚI). Không nhớ handle thì đổi màn gán rồi bấm lại sẽ vô hiệu.
    const wallWinsRef = useRef<Record<string, { win: Window; url: string }>>({});
    // Mở một cửa sổ /stream cho MỖI màn đang bật — đặt vào ĐÚNG màn nếu đã gán (Bước 2), nếu không thì chia đều màn hiện tại (Bước 1).
    const openSubOutputs = () => {
        const on = subOutputs.filter((o) => o.enabled);
        if (!on.length) return;
        // Cảnh báo nếu hai màn cùng gán vào MỘT màn hình (sẽ chồng lên nhau, một ngôn ngữ bị che).
        const assigned = on.map((o) => o.screenIdx).filter((v): v is number => v != null);
        if (new Set(assigned).size < assigned.length &&
            !window.confirm('Có hai màn phụ đề đang gán vào CÙNG một màn hình — chúng sẽ chồng lên nhau. Vẫn mở?')) return;
        const sw = window.screen.availWidth || window.innerWidth;
        const sh = window.screen.availHeight || window.innerHeight;
        const colW = Math.max(320, Math.round(sw / on.length));
        let opened = 0;
        on.forEach((o, i) => {
            const single = o.mode === 'vi' || o.mode === 'ja';
            const q = single ? `lang=${o.mode}` : `mode=${o.mode}`;
            // Màn đơn-ngữ (VI/JA) phủ kín; màn "cả 2"/"xếp dọc" giữ 16:9 (fill=0) đúng thiết kế /stream.
            const fill = single ? '1' : '0';
            const scr = (o.screenIdx != null && screens[o.screenIdx]) ? screens[o.screenIdx] : null;
            const left = scr ? scr.availLeft : i * colW;
            const top = scr ? scr.availTop : 0;
            const width = scr ? scr.availWidth : colW;
            const height = scr ? scr.availHeight : sh;
            const url = `/stream?${q}&display=1&fill=${fill}`;
            const prev = wallWinsRef.current[o.id];
            if (prev && !prev.win.closed) {
                // Cửa sổ đang mở: chỉ điều hướng lại khi ĐỔI nội dung (tránh nháy/ngắt WS), luôn đưa về đúng màn + kích thước.
                if (prev.url !== url) { try { prev.win.location.replace(url); prev.url = url; } catch { /* điều hướng bị chặn — bỏ qua */ } }
                try { prev.win.moveTo(left, top); prev.win.resizeTo(width, height); } catch { /* trình duyệt hạn chế move/resize */ }
                prev.win.focus?.();
                opened++;
            } else {
                const win = window.open(url, `proyaku-wall-${o.id}`, `popup=yes,left=${left},top=${top},width=${width},height=${height}`);
                if (win) {
                    wallWinsRef.current[o.id] = { win, url };
                    try { win.moveTo(left, top); win.resizeTo(width, height); } catch { /* ignore */ }
                    win.focus?.();
                    opened++;
                }
            }
        });
        // An toàn gala: đừng để mở hụt màn mà im lặng — báo rõ nếu pop-up bị chặn.
        if (opened < on.length) window.alert('Một số màn phụ đề không mở được — trình duyệt có thể đang chặn pop-up. Hãy cho phép pop-up cho trang này rồi bấm lại.');
    };

    // Một kênh loa trong ngăn Cài đặt: chọn thiết bị + loại/Bluetooth (A2/A6) + nhãn vùng (A5)
    // + âm lượng (B1) + trợ lý kiểm tra loa (A3).
    const renderOutput = (ch: 'vi' | 'ja') => {
        const dir = ch === 'vi' ? 'JA → VI' : 'VI → JA';
        const val = ch === 'vi' ? outVi : outJa;
        const present = val !== null && outputs.some((d) => d.index === val);
        const kind = deviceKind(outputs.find((d) => d.index === val)?.name);
        const st = checkState[ch];
        return (
            <div className="space-y-2">
                <div className="flex justify-between items-center"><label className="font-label-caps text-label-caps text-on-surface-variant">Loa {ch.toUpperCase()}</label><span className="font-label-caps text-label-caps text-on-surface-variant">{dir}</span></div>
                <select value={present ? String(val) : ''} onChange={(e) => pickOut(ch, Number(e.target.value))} disabled={active} className={SELECT_CLS}>
                    {!present && <option value="" disabled>{outputs.length === 0 ? 'Chưa thấy loa' : '— Chọn lại loa —'}</option>}
                    {outputs.map((d) => <option key={d.index} value={d.index}>{d.name}</option>)}
                </select>
                {present && (
                    <div className={`flex items-start gap-1.5 text-[11px] ${kind.bt ? 'text-primary' : 'text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined text-[14px] shrink-0" aria-hidden="true">{kind.icon}</span>
                        <span>{kind.label}{kind.bt && ' — độ trễ cao, không nên dùng cho dịch trực tiếp gala'}</span>
                    </div>
                )}
                <input value={ch === 'vi' ? labels.vi : labels.ja} onChange={(e) => saveLabel(ch, e.target.value)}
                    placeholder="Nhãn vùng (vd: Sân khấu)"
                    className="field-lux transition-shadow w-full bg-surface text-on-surface border border-outline-variant rounded px-3 py-1.5 text-xs focus:border-secondary focus:outline-none placeholder:text-on-surface-variant/60" />
                <VolRow label="Âm lượng" value={ch === 'vi' ? vols.vi : vols.ja} onChange={(v) => applyVol(ch === 'vi' ? { vi: v } : { ja: v })} />
                {st === 'playing' ? (
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-on-surface-variant flex-1">Đang phát — anh/chị nghe rõ?</span>
                        <button onClick={() => confirmCheck(ch, true)} className="rounded-lg border border-secondary text-secondary px-2.5 py-1 text-xs hover:bg-secondary/10 transition-colors">Nghe rõ</button>
                        <button onClick={() => confirmCheck(ch, false)} className="rounded-lg border border-error text-error px-2.5 py-1 text-xs hover:bg-error/10 transition-colors">Không nghe</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => startCheck(ch)} disabled={val === null || !session.backendOnline}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant text-on-surface-variant px-3 py-1.5 text-xs hover:text-primary hover:border-primary transition-colors disabled:opacity-40">
                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">volume_up</span>
                            {st === 'idle' ? 'Kiểm tra loa' : 'Kiểm tra lại'}
                        </button>
                        {st === 'ok' && <span className="inline-flex items-center gap-1 text-[11px] text-secondary"><span className="material-symbols-outlined text-[14px]" aria-hidden="true">check_circle</span>Đã nghe rõ</span>}
                        {st === 'fail' && <span className="inline-flex items-center gap-1 text-[11px] text-error"><span className="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>Chưa nghe được</span>}
                        {toneStatus[ch] && <span className="text-[11px] text-on-surface-variant">{toneStatus[ch]}</span>}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full w-full flex text-on-background overflow-hidden relative">
            {/* ══════════ RAIL ĐIỀU KHIỂN (trái) — mọi chức năng, không phải rời màn ══════════ */}
            <aside className="shrink-0 w-[248px] h-full flex flex-col border-r border-outline-variant bg-surface-container-lowest">
                {/* Thương hiệu + sự kiện đã nằm ở headbar shell → rail vào thẳng các nhóm chức năng (không lặp). */}
                {/* Cuộn: các nhóm chức năng */}
                <div className="flex-1 overflow-y-auto p-2.5 pt-3 space-y-3.5">
                    {/* A · PHIÊN — bắt đầu / dừng (giữ) */}
                    {active ? (
                        <button type="button" onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold} title="Giữ để dừng phiên"
                            className="relative z-50 w-full flex items-center gap-3 rounded-xl overflow-hidden bg-error text-on-error px-3.5 py-3 select-none">
                            <span className="absolute inset-y-0 left-0 bg-on-error/25" style={{ width: `${Math.round(holdPct * 100)}%` }}></span>
                            <span className="material-symbols-outlined shrink-0 relative" style={{ fontSize: '24px' }} aria-hidden="true">stop</span>
                            <span className="relative flex-1 text-left text-[16px] font-semibold">{holdPct > 0 ? `GIỮ… ${Math.round(holdPct * 100)}%` : 'Dừng (giữ)'}</span>
                        </button>
                    ) : (
                        <RailBtn icon="play_arrow" label="Bắt đầu dịch" big tone="primary" disabled={!canStart}
                            title={canStart ? 'Bắt đầu phiên dịch' : !session.backendOnline ? 'Backend (lõi dịch) offline — không thể bắt đầu' : 'Chưa đạt kiểm tra thiết bị — mở Cài đặt'}
                            onClick={handleStartStop} />
                    )}

                    {/* B · MÀN KHÁN GIẢ */}
                    <div className="space-y-0.5">
                        <div className="px-2 pb-1 font-label-caps text-[10px] text-on-surface-variant/55 tracking-[0.16em]">MÀN KHÁN GIẢ</div>
                        <RailBtn icon="cast" label="Xuất phụ đề" title="Định tuyến phụ đề ra các màn khán giả" tone={panel === 'wall' ? 'active' : 'default'} onClick={() => setPanel((p) => (p === 'wall' ? null : 'wall'))} />
                        {active && (
                            <>
                                <RailBtn icon="play_arrow" label="Live" title="Phát trực tiếp" tone={session.audienceCut === 'live' ? 'active' : 'default'} onClick={() => session.setAudienceCut('live')} />
                                <RailBtn icon="ac_unit" label="Giữ hình" title="Đóng băng dòng cuối (freeze)" tone={session.audienceCut === 'freeze' ? 'active' : 'default'} onClick={() => session.setAudienceCut('freeze')} />
                                <RailBtn icon="block" label="Màn an toàn" title="Màn an toàn (slate)" tone={session.audienceCut === 'slate' ? 'active' : 'default'} onClick={() => session.setAudienceCut('slate')} />
                            </>
                        )}
                        <RailBtn icon="auto_awesome" label="Reveal" title="Mở màn công bố (tab mới)" onClick={() => window.open('/reveal', 'proyaku-reveal')} />
                    </div>

                    {/* C · ÂM THANH & GIỌNG */}
                    <div className="space-y-0.5">
                        <div className="px-2 pb-1 font-label-caps text-[10px] text-on-surface-variant/55 tracking-[0.16em]">ÂM THANH & GIỌNG</div>
                        <RailBtn icon={ttsOn && ttsHasVoice ? 'volume_up' : 'subtitles'} label={ttsOn && ttsHasVoice ? 'Đang đọc tiếng' : 'Chỉ phụ đề'}
                            title={!ttsHasVoice ? 'Chưa chọn giọng đọc — vào Chuẩn bị · Giọng đọc' : ttsOn ? 'Đang đọc tiếng — bấm để chỉ phụ đề' : 'Chỉ phụ đề — bấm để bật đọc tiếng'}
                            tone={ttsOn && ttsHasVoice ? 'active' : 'default'} disabled={!ttsHasVoice} onClick={() => applyTtsOn(!ttsOn)} />
                        <RailBtn icon="speed" label={`Tốc độ ${ttsRate.toFixed(1)}×`} title="Tốc độ giọng đọc" tone={panel === 'speed' ? 'active' : 'default'} onClick={() => setPanel((p) => (p === 'speed' ? null : 'speed'))} />
                        <RailBtn icon="tune" label="Âm lượng" title="Âm lượng loa VI / JA / Tổng" tone={panel === 'volume' ? 'active' : 'default'} onClick={() => setPanel((p) => (p === 'volume' ? null : 'volume'))} />
                    </div>

                    {/* D · NỘI DUNG */}
                    <div className="space-y-0.5">
                        <div className="px-2 pb-1 font-label-caps text-[10px] text-on-surface-variant/55 tracking-[0.16em]">NỘI DUNG</div>
                        <RailBtn icon="record_voice_over" label={speaker || 'Người nói'} title="Điều phối người phát biểu" tone={panel === 'speaker' ? 'active' : 'default'} onClick={() => setPanel((p) => (p === 'speaker' ? null : 'speaker'))} />
                        <RailBtn icon="menu_book" label="Từ điển" title="Mở Từ điển (cửa sổ mới)" onClick={() => window.open('/glossary', 'proyaku-glossary')} />
                    </div>
                </div>

                {/* Chân rail: hệ thống */}
                <div className="shrink-0 p-2.5 space-y-0.5 border-t border-outline-variant">
                    <RailBtn icon="settings" label="Cài đặt & thiết bị"
                        dot={preflightOk ? 'bg-secondary' : 'bg-primary animate-pulse'}
                        title={preflightOk ? 'Thiết bị sẵn sàng · mở Cài đặt & kiểm tra' : `Chưa đủ điều kiện (${preflightPass}/${preflight.length}) · mở Cài đặt`}
                        onClick={() => { setPanel(null); setSettingsOpen(true); }} />
                    <RailBtn icon="bolt" label="Chế độ nhanh" title="Giảm độ trễ" tone={fastMode ? 'active' : 'default'} onClick={handleToggleFast} />
                    <RailBtn icon={isFs ? 'fullscreen_exit' : 'fullscreen'} label={isFs ? 'Thoát toàn màn' : 'Toàn màn hình'} onClick={toggleFullscreen} />
                    <RailBtn icon="logout" label="Thoát console" title="Về Bảng chỉ huy" onClick={() => nav('/prep')} />
                </div>
            </aside>

            {/* ══════════ CỘT PHẢI — monitor kết quả (đúng cái khán giả thấy) ══════════ */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* ══════════ MONITOR STRIP ══════════ */}
            <header className="shrink-0 h-14 flex items-center gap-4 px-5 border-b border-outline-variant bg-surface-container-lowest">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${master.dot} ${master.anim}`}></span>
                    <span className={`font-label-caps text-label-caps tracking-wide truncate ${master.text}`}>{master.label}</span>
                    {active && <span className="font-label-caps text-label-caps text-on-surface-variant tabular-nums ml-1" style={{ fontFamily: 'ui-monospace, monospace' }}>{mmss}</span>}
                </div>

                <div className="mx-auto flex items-center gap-2 px-3 py-1.5 rounded-full border border-outline-variant bg-surface-container-lowest">
                    <span className={`font-label-caps text-label-caps ${dir.startsWith('VI') || !dir ? 'text-secondary' : 'text-on-surface-variant'}`}>VI</span>
                    <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">swap_horiz</span>
                    <span className={`jp-text font-label-caps text-label-caps ${dir.startsWith('JA') ? 'text-secondary' : 'text-on-surface-variant'}`}>JA</span>
                </div>

                {/* fast-mode + toàn màn hình đã dời vào rail điều khiển (nhóm Hệ thống). */}
            </header>

            {/* ══════════ CENTER STAGE — always "the screen" ══════════ */}
            <main className="flex-1 min-h-0 relative flex flex-col bg-gradient-radial overflow-hidden">
                {shownError && (
                    <div className="shrink-0 mx-4 mt-4 border border-error text-error font-label-caps text-label-caps px-4 py-2.5 rounded-DEFAULT flex items-center gap-2 z-20">
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
                                <MonitorColumn label={<span className="font-label-caps text-label-caps tracking-widest text-secondary border border-secondary/60 rounded px-2.5 py-0.5">TIẾNG VIỆT</span>} lines={viLive} />
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
                                        ? 'Nhấn ▶ Bắt đầu dịch ở thanh bên trái để lên sóng — kết quả song ngữ sẽ hiện ngay tại đây.'
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
            </div>

            {/* ══════════ LIVE-CONTROL POPOVERS (flyout cạnh rail) ══════════ */}
            {panel && (
                <>
                    <div className="absolute inset-0 z-30" onClick={() => setPanel(null)}></div>
                    <div className="absolute top-1/2 -translate-y-1/2 left-[256px] z-40 w-[min(80vw,400px)] rounded-2xl border border-outline-variant bg-surface-container-high p-4 shadow-2xl"
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
                        {panel === 'wall' && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-label-caps text-label-caps text-on-surface-variant">XUẤT PHỤ ĐỀ — ĐỊNH TUYẾN MÀN</span>
                                    <button onClick={() => patchSubOutputs(DEFAULT_SUB_OUTPUTS)} className="text-label-md text-on-surface-variant hover:text-secondary">Mặc định</button>
                                </div>
                                {/* Bước 2: quét MÀN THẬT (Window Management API) + trạng thái */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] text-on-surface-variant flex items-center gap-1.5 min-w-0">
                                        <span className={`material-symbols-outlined text-[15px] shrink-0 ${screenSupport === 'multi' ? 'text-secondary' : (screenSupport === 'denied' || screenSupport === 'unsupported') ? 'text-primary' : 'text-on-surface-variant'}`} aria-hidden="true">{screenSupport === 'multi' ? 'check_circle' : screenSupport === 'idle' ? 'devices' : 'info'}</span>
                                        <span className="truncate">{screenSupport === 'multi' ? `Thấy ${screens.length} màn — chọn màn cho từng dòng`
                                            : screenSupport === 'single' ? 'Chỉ thấy 1 màn — dùng chia đôi + kéo tay'
                                            : screenSupport === 'denied' ? 'Chưa cấp quyền — dùng chia đôi + kéo tay'
                                            : screenSupport === 'unsupported' ? 'Trình duyệt không hỗ trợ tự đặt màn'
                                            : 'Bấm "Quét màn hình" để tự đặt đúng màn'}</span>
                                    </span>
                                    <button onClick={detectScreens} className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-outline-variant text-on-surface-variant px-2.5 py-1 text-[11px] hover:text-primary hover:border-primary transition-colors">
                                        <span className="material-symbols-outlined text-[15px]" aria-hidden="true">refresh</span>Quét màn hình
                                    </button>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {subOutputs.map((o, i) => (
                                        <div key={o.id} className={`flex flex-col gap-1.5 rounded-lg border px-2.5 py-2 ${o.enabled ? 'border-outline-variant' : 'border-outline-variant/40 opacity-60'}`}>
                                            {/* Dòng 1 — bật/tắt · vùng · ngôn ngữ hiển thị */}
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => patchSubOutputs(subOutputs.map((x, j) => (j === i ? { ...x, enabled: !x.enabled } : x)))}
                                                    title={o.enabled ? 'Đang bật — bấm để tắt' : 'Đang tắt — bấm để bật'}
                                                    className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors ${o.enabled ? 'bg-secondary text-on-secondary' : 'border border-outline-variant text-on-surface-variant'}`}>
                                                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{o.enabled ? 'check' : 'remove'}</span>
                                                </button>
                                                <span className="w-16 shrink-0 text-sm font-medium text-on-surface truncate">{o.label}</span>
                                                <select value={o.mode} onChange={(e) => patchSubOutputs(subOutputs.map((x, j) => (j === i ? { ...x, mode: e.target.value as SubMode } : x)))}
                                                    className="flex-1 min-w-0 bg-surface border border-outline-variant rounded-lg px-2 py-1.5 text-sm text-on-surface focus:outline-none focus:border-secondary">
                                                    {SUB_MODES.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                                                </select>
                                            </div>
                                            {/* Dòng 2 — MÀN HÌNH đích: trọn chiều rộng để hiện ĐỦ tên thiết bị màn hình (tên + độ phân giải)
                                                mà trình duyệt quét được. LUÔN hiện; ≤1 màn → "Tự chia" (disabled); >1 màn → chọn màn thật. */}
                                            <div className="flex items-center gap-2 pl-8">
                                                <span className="material-symbols-outlined text-[17px] text-on-surface-variant/70 shrink-0" aria-hidden="true">desktop_windows</span>
                                                <select value={o.screenIdx ?? ''} disabled={screens.length <= 1}
                                                    title={screens.length > 1 ? 'Chọn màn hình xuất vùng này' : 'Cắm thêm màn + bấm "Quét màn hình" để chọn — hiện đang tự chia'}
                                                    onChange={(e) => patchSubOutputs(subOutputs.map((x, j) => (j === i ? { ...x, screenIdx: e.target.value === '' ? undefined : Number(e.target.value) } : x)))}
                                                    className="flex-1 min-w-0 bg-surface border border-outline-variant rounded-lg px-2 py-1.5 text-sm text-on-surface focus:outline-none focus:border-secondary disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <option value="">{screens.length > 1 ? 'Tự chia (chưa gán màn)' : 'Tự chia — chỉ thấy 1 màn'}</option>
                                                    {screens.map((s, si) => <option key={si} value={si}>{`${s.label || `Màn ${si + 1}`}${s.isPrimary ? ' ★' : ''} · ${s.availWidth}×${s.availHeight}`}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={openSubOutputs} disabled={!subOutputs.some((o) => o.enabled)}
                                    className="btn-lux inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary text-on-secondary px-4 py-2.5 text-sm font-label-caps text-label-caps hover:opacity-80 disabled:opacity-40">
                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">cast</span>Mở {subOutputs.filter((o) => o.enabled).length} màn phụ đề
                                </button>
                                <p className="text-body-sm text-on-surface-variant flex items-start gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0" aria-hidden="true">info</span>
                                    {screenSupport === 'multi'
                                        ? 'Mỗi màn mở vào ĐÚNG màn đã gán. Bấm phím F trong cửa sổ để bỏ viền (toàn màn hình).'
                                        : 'Mỗi màn mở một cửa sổ — kéo sang đúng màn ngoài rồi bấm F (hoặc F11) để toàn màn hình.'}
                                </p>
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
                        {panel === 'volume' && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-label-caps text-label-caps text-on-surface-variant">ÂM LƯỢNG LOA</span>
                                    <button onClick={() => applyVol({ vi: 100, ja: 100, master: 100 })}
                                        className="text-label-md text-on-surface-variant hover:text-secondary">Đặt lại 100%</button>
                                </div>
                                <VolRow label="Tổng" value={vols.master} onChange={(v) => applyVol({ master: v })} />
                                <div className="h-px bg-outline-variant"></div>
                                <VolRow label="VI" value={vols.vi} onChange={(v) => applyVol({ vi: v })} />
                                <VolRow label="JA" value={vols.ja} onChange={(v) => applyVol({ ja: v })} />
                                {AUDIO_GAIN_BACKEND_READY ? (
                                    <p className="text-body-sm text-on-surface-variant">Áp ngay khi đang chạy; nếu chưa có phiên sẽ dùng ở lần Bắt đầu.</p>
                                ) : (
                                    <p className="text-body-sm text-on-surface-variant flex items-start gap-1.5">
                                        <span className="material-symbols-outlined text-[16px] text-primary shrink-0" aria-hidden="true">info</span>
                                        Đã lưu &amp; gửi lệnh sẵn; âm lượng sẽ có tác dụng khi backend áp dụng (doc 32 · B1).
                                    </p>
                                )}
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

                            {/* A1 — Quét lại thiết bị (nhặt loa BT/USB vừa ghép ở macOS) */}
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-label-caps text-label-caps text-on-surface-variant">{lastScan ? `Đã quét lúc ${lastScan}` : 'Thiết bị'}</span>
                                <button onClick={rescanDevices} disabled={scanning}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant text-on-surface-variant px-3 py-1.5 text-xs hover:text-primary hover:border-primary transition-colors disabled:opacity-50">
                                    <span className={`material-symbols-outlined text-[16px] ${scanning ? 'animate-spin' : ''}`} aria-hidden="true">{scanning ? 'progress_activity' : 'refresh'}</span>
                                    {scanning ? 'Đang quét…' : 'Quét lại thiết bị'}
                                </button>
                            </div>

                            {/* Source */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">mic_external_on</span><h3 className="font-label-caps text-label-caps text-on-surface">Nguồn vào</h3></div>
                                <div>
                                    <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">Micro</label>
                                    <select value={micReady ? String(inputDevice) : ''} onChange={(e) => setInputDevice(Number(e.target.value))} disabled={active} className={SELECT_CLS}>
                                        {!micReady && <option value="" disabled>{inputs.length === 0 ? 'Chưa thấy thiết bị vào' : '— Chọn lại micro —'}</option>}
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

                            {/* Outputs — loại loa/BT (A2/A6) · nhãn vùng (A5) · âm lượng (B1) · kiểm tra loa (A3) */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">speaker</span><h3 className="font-label-caps text-label-caps text-on-surface">Ngõ ra</h3></div>
                                {renderOutput('vi')}
                                <div className="h-px bg-outline-variant/60"></div>
                                {renderOutput('ja')}
                            </section>

                            {/* A4 — Hồ sơ âm thanh theo hội trường */}
                            <section className="space-y-2.5">
                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">bookmarks</span><h3 className="font-label-caps text-label-caps text-on-surface">Hồ sơ âm thanh</h3></div>
                                {profiles.length === 0 ? (
                                    <p className="text-xs text-on-surface-variant leading-relaxed">Chưa có hồ sơ. Lưu bộ thiết bị + âm lượng + nhãn hiện tại để gọi lại nhanh cho từng hội trường.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {profiles.map((p) => (
                                            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2">
                                                <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0" aria-hidden="true">tune</span>
                                                <span className="flex-1 min-w-0 text-sm text-on-surface truncate">{p.name}</span>
                                                <button onClick={() => applyProfile(p)} disabled={active} title={active ? 'Đang chạy — dừng phiên để đổi thiết bị' : 'Áp dụng hồ sơ'} className="rounded-lg border border-secondary text-secondary px-2.5 py-1 text-xs hover:bg-secondary/10 transition-colors disabled:opacity-40">Áp dụng</button>
                                                <button onClick={() => deleteProfile(p.id)} title="Xoá hồ sơ" className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-error transition-colors"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button onClick={saveCurrentProfile} className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant text-on-surface-variant px-3 py-1.5 text-xs hover:text-primary hover:border-primary transition-colors">
                                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">save</span>Lưu hồ sơ hiện tại
                                </button>
                            </section>
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
};

// ══════════ FIX-07: ONLINE / OFFLINE mode switch on the live conference screen ══════════

const ONLINE_MODE_KEY = 'proyaku_conference_mode';

// Prominent floating segmented control (top-right, labelled). Disabled while a session is live
// (never two captures). Visible in BOTH modes so the operator can always switch lanes.
const ModePill: React.FC<{ mode: 'offline' | 'online'; disabled: boolean; onChange: (m: 'offline' | 'online') => void }> = ({ mode, disabled, onChange }) => (
    <div
        className="absolute top-3 right-4 z-50 flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest shadow-xl pl-3 pr-1.5 py-1.5"
        title={disabled ? 'Dừng phiên hiện tại để đổi chế độ' : 'Chọn luồng dịch: OFFLINE (máy chủ nội bộ) hoặc ONLINE (đám mây)'}
    >
        <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">hub</span>
        <span className="font-label-caps text-label-caps text-on-surface-variant select-none">Luồng dịch</span>
        <div className="flex items-center gap-0.5 bg-surface rounded-full p-0.5">
            {(['offline', 'online'] as const).map((m) => (
                <button
                    key={m}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(m)}
                    title={m === 'online' ? 'ONLINE — dịch qua dịch vụ đám mây (cần nhập khóa trong Cài đặt)' : 'OFFLINE — dịch qua máy chủ nội bộ (mặc định)'}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors ${
                        mode === m ? (m === 'online' ? 'bg-secondary text-on-secondary shadow' : 'bg-primary text-on-primary shadow') : 'text-on-surface-variant hover:text-on-surface'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {m === 'offline' ? 'OFFLINE' : 'ONLINE'}
                </button>
            ))}
        </div>
    </div>
);

const MissingKeysModal: React.FC<{ onClose: () => void; onGoSettings: () => void }> = ({ onClose, onGoSettings }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
        <div className="card-lux bg-surface-container border border-outline-variant rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined text-error" aria-hidden="true">key_off</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Chưa cấu hình khóa ONLINE</h3>
            </div>
            <p className="text-sm text-on-surface-variant">Luồng ONLINE cần đủ 6 khóa dịch vụ (nhận dạng giọng · dịch · đọc giọng). Vui lòng nhập khóa trong Cài đặt trước khi bắt đầu.</p>
            <div className="flex justify-end gap-2 mt-5">
                <button onClick={onClose} className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-label-caps text-label-caps border border-outline-variant text-on-surface-variant hover:text-on-surface">Đóng</button>
                <button onClick={onGoSettings} className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-label-caps text-label-caps btn-lux bg-secondary text-on-secondary hover:opacity-80">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">settings</span>Mở Cài đặt
                </button>
            </div>
        </div>
    </div>
);

// The ONLINE branch: the shared OnlinePanel + a missing-key gate on Start (popup → Settings).
const OnlineConferenceMode: React.FC<{ onRunningChange: (running: boolean) => void }> = ({ onRunningChange }) => {
    const navigate = useNavigate();
    const [showKeyModal, setShowKeyModal] = useState(false);
    const gateStart = async (): Promise<boolean> => {
        try {
            const s = await fetchOnlineConfigStatus();
            if (!s.ready) { setShowKeyModal(true); return false; }
            return true;
        } catch {
            setShowKeyModal(true);
            return false;
        }
    };
    return (
        <div className="h-full overflow-y-auto text-on-background">
            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-4">
                    <h1 className="font-headline text-headline text-on-surface">Dịch hội nghị — Chế độ ONLINE</h1>
                    <p className="text-sm text-on-surface-variant mt-1">Dịch thời gian thực qua dịch vụ đám mây (nhận dạng · dịch 2 tầng · đọc giọng). Cấu hình khóa trong Cài đặt.</p>
                </div>
                <OnlinePanel onBeforeStart={gateStart} onRunningChange={onRunningChange} />
            </div>
            {showKeyModal && <MissingKeysModal onClose={() => setShowKeyModal(false)} onGoSettings={() => navigate('/settings#ok')} />}
        </div>
    );
};

// Default export: mode switch over the (unchanged) OFFLINE console. Default = OFFLINE (zero regression).
const AudioRouting: React.FC = () => {
    const session = useLiveSession();
    const offlineLive = isSessionActive(session.status);
    const [mode, setMode] = useState<'offline' | 'online'>(() => (localStorage.getItem(ONLINE_MODE_KEY) === 'online' ? 'online' : 'offline'));
    const [onlineRunning, setOnlineRunning] = useState(false);
    // Never two captures: block a mode change while EITHER lane is live (user must Stop first).
    const selectorDisabled = mode === 'online' ? onlineRunning : offlineLive;
    const changeMode = (m: 'offline' | 'online') => {
        if (selectorDisabled || m === mode) return;
        setMode(m);
        try { localStorage.setItem(ONLINE_MODE_KEY, m); } catch { /* ignore */ }
    };
    return (
        <div className="h-full w-full relative">
            {/* Switching to OFFLINE unmounts the online panel → its useOnlineLane cleanup releases the mic
                fully before the offline lane can claim it (and vice-versa). */}
            {mode === 'offline' ? <OfflineConsole /> : <OnlineConferenceMode onRunningChange={setOnlineRunning} />}
            <ModePill mode={mode} disabled={selectorDisabled} onChange={changeMode} />
        </div>
    );
};

export default AudioRouting;
