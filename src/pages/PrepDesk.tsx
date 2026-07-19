import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveSession } from '../lib/LiveSessionContext';
import { API_BASE, getHealth, getGlossary, getScript, getAudioDevices, getAudioOutputs } from '../lib/api';
import type { GlossaryEntry, ScriptEntry } from '../lib/api';
import { loadTtsPrefs } from '../lib/ttsPrefs';
import {
    getPrep, signAttest, clearAttest, markReachedReady, setDebrief, addIncident, removeIncident,
    signedBeforeRehearsal, daysUntil,
} from '../lib/prep';
import type { Attest } from '../lib/prep';
import PageHeader from '../components/PageHeader';
import { eventDates } from '../lib/settings';
import { toast } from '../lib/toast';

type SigState = 'ok' | 'fail' | 'unknown';
type Weight = 'blocker' | 'important' | 'nice';
type Phase = 'pre' | 'in' | 'post';

interface Signal {
    id: string;
    label: string;
    phase: Phase;
    weight: Weight;
    kind: 'measured' | 'attest';
    state: SigState;
    detail: string;
    to?: string;
    toLabel?: string;
}

interface Fetched {
    health: { ok: boolean; blocks: number } | null; healthErr: boolean;
    glossary: GlossaryEntry[] | null; glossaryErr: boolean;
    script: ScriptEntry[] | null; scriptErr: boolean;
    inputs: number | null; inputsErr: boolean;
    outputs: number | null; outputsErr: boolean;
    loading: boolean;
}

const INITIAL: Fetched = {
    health: null, healthErr: false, glossary: null, glossaryErr: false,
    script: null, scriptErr: false, inputs: null, inputsErr: false, outputs: null, outputsErr: false, loading: true,
};

const fmtTs = (ts: string) => ts.replace('T', ' ').slice(0, 16);

// Status → one clean icon (no jargon text) — friendly & scannable.
const STATE_ICON: Record<SigState, { icon: string; cls: string; title: string }> = {
    ok: { icon: 'check_circle', cls: 'text-secondary', title: 'Đã xong' },
    fail: { icon: 'cancel', cls: 'text-error', title: 'Chưa xong' },
    unknown: { icon: 'do_not_disturb_on', cls: 'text-on-surface-variant', title: 'Chưa đo được' },
};

// Friendly verdict wording (lead with plain Vietnamese, not GO/NO-GO jargon).
const VERDICT_UI: Record<'GO' | 'DEGRADED' | 'NO-GO', { word: string; icon: string; box: string }> = {
    'GO': { word: 'SẴN SÀNG LÊN SÓNG', icon: 'verified', box: 'bg-secondary text-on-secondary' },
    'DEGRADED': { word: 'SẴN SÀNG HẠN CHẾ', icon: 'warning', box: 'border-2 border-primary text-primary' },
    'NO-GO': { word: 'CHƯA SẴN SÀNG', icon: 'block', box: 'border-2 border-error text-error' },
};

const PHASES: { key: 'pre' | 'in' | 'post'; name: string; icon: string }[] = [
    { key: 'pre', name: 'Chuẩn bị', icon: 'fact_check' },
    { key: 'in', name: 'Vận hành', icon: 'sensors' },
    { key: 'post', name: 'Sau sự kiện', icon: 'history' },
];

const Ring: React.FC<{ pct: number; size?: number }> = ({ pct, size = 44 }) => {
    const r = (size - 6) / 2, c = 2 * Math.PI * r;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-outline-variant)" strokeWidth="4" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-secondary)" strokeWidth="4"
                strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" className="fill-on-surface" style={{ fontSize: size * 0.28 }}>{pct}</text>
        </svg>
    );
};

const WEIGHT_LABEL: Record<Weight, string> = { blocker: 'Bắt buộc', important: 'Quan trọng', nice: 'Nên có' };
// Ưu tiên (weight) → eyebrow ĐƠN SẮC: việc quan trọng đọc đậm hơn, KHÔNG thêm hue mới nên không đụng màu trạng thái.
const WEIGHT_EYEBROW: Record<Weight, string> = {
    blocker: 'text-on-surface-variant',
    important: 'text-on-surface-variant/70',
    nice: 'text-on-surface-variant/40',
};

// Thẻ con (readiness card) — hệ thống thị giác chặt chẽ:
//   • ĐỘ CAO NỀN = cấp bậc + đang-chọn: thường nằm trên surface-container; khi drawer của nó mở thì
//     NÂNG lên surface-container-high + viền vàng (đúng ngôn ngữ "bạn đang ở đây" như menu cha),
//     nên luôn phân biệt được cha↔con và active↔thường.
//   • MÀU = CHỈ trạng thái: thanh trái + khối icon + dòng phụ dùng chung một dải
//     (vàng = xong · đỏ = cần xử lý · trung tính = chưa đo). Ưu tiên là eyebrow đơn sắc.
//   • CHUYỂN ĐỘNG = một ease mượt khi rê/chọn (đã chặn cho prefers-reduced-motion).
// Module-scope để input giữ được focus.
const SignalCard: React.FC<{ s: Signal; attest?: Attest; onOpen: () => void; index: number; active: boolean }> = ({ s, attest, onOpen, index, active }) => {
    const st = STATE_ICON[s.state];
    const iconBg = s.state === 'ok' ? 'bg-secondary/15' : s.state === 'fail' ? 'bg-error/15' : 'bg-surface-container-high';
    const subCls = s.state === 'ok' ? 'text-secondary' : s.state === 'fail' ? 'text-error' : 'text-on-surface-variant';
    const rail = active ? 'bg-secondary' : s.state === 'ok' ? 'bg-secondary/60' : s.state === 'fail' ? 'bg-error/70' : 'bg-outline-variant';
    return (
        <button type="button" onClick={onOpen} aria-pressed={active}
            className={`card-in group relative overflow-hidden text-left w-full rounded-2xl p-5 pl-6 flex flex-col gap-3.5 border transition-all duration-200 ease-out motion-reduce:transition-none ${active
                ? 'bg-surface-container-high border-secondary shadow-lg shadow-secondary/10'
                : 'bg-surface-container border-outline-variant hover:border-secondary/40 hover:bg-surface-container-high hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/25 motion-reduce:hover:translate-y-0'}`}
            style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
            {/* Thanh trái = trạng thái (hoặc vàng khi đang mở) */}
            <span className={`absolute left-0 top-0 bottom-0 w-[3px] transition-colors ${rail}`} aria-hidden="true"></span>
            <div className="flex items-start justify-between gap-2">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${iconBg}`}>
                    <span className={`material-symbols-outlined ${st.cls}`} style={{ fontSize: '22px' }} aria-hidden="true">{st.icon}</span>
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                    {s.kind === 'attest' && <span className="material-symbols-outlined text-[15px] text-on-surface-variant/45" title="Người ký" aria-hidden="true">stylus_note</span>}
                    <span className={`uppercase font-label-caps text-[9px] tracking-[0.14em] ${WEIGHT_EYEBROW[s.weight]}`}>{WEIGHT_LABEL[s.weight]}</span>
                </div>
            </div>
            <div className="flex-1">
                <div className="font-semibold text-on-surface text-[15px] leading-snug">{s.label}</div>
                <div className={`text-[13px] mt-1.5 font-medium ${subCls}`}>{st.title}{s.kind === 'attest' && attest ? ` · ${attest.by}` : ''}</div>
            </div>
            <div className={`flex items-center gap-1 text-xs transition-colors ${active ? 'text-secondary font-medium' : 'text-on-surface-variant/70 group-hover:text-secondary'}`}>
                {active ? 'Đang mở' : 'Chi tiết'}<span className={`material-symbols-outlined text-[15px] transition-transform ${active ? '' : 'group-hover:translate-x-0.5'}`} aria-hidden="true">arrow_forward</span>
            </div>
        </button>
    );
};

// The detail drawer (Raycast aesthetic): tap a card → a slide-over shows the full context + the
// available actions (đi tới trang, hoặc ký/rút xác nhận). Module-scope so the sign input keeps focus.
const SignalDrawer: React.FC<{
    s: Signal; attest?: Attest; signValue: string; shown: boolean;
    onSignChange: (v: string) => void; onSign: () => void; onClear: () => void; onClose: () => void;
}> = ({ s, attest, signValue, shown, onSignChange, onSign, onClear, onClose }) => {
    const st = STATE_ICON[s.state];
    const iconBg = s.state === 'ok' ? 'bg-secondary/15' : s.state === 'fail' ? 'bg-error/15' : 'bg-surface-container-high';
    const warn = signedBeforeRehearsal(attest);
    const chip = 'px-2.5 py-1 rounded-full font-label-caps text-label-caps';
    return (
        <>
            <div className={`absolute inset-0 bg-background/50 backdrop-blur-[1px] z-30 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>
            <aside style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
                className={`absolute top-0 right-0 h-full w-full max-w-[460px] bg-surface-container-lowest border-l border-outline-variant z-40 flex flex-col shadow-2xl transition-transform duration-300 will-change-transform ${shown ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Thanh trạng thái mép trái drawer — cùng ngôn ngữ với thẻ */}
                <span className={`absolute left-0 top-0 bottom-0 w-[3px] z-10 ${s.state === 'ok' ? 'bg-secondary' : s.state === 'fail' ? 'bg-error/80' : 'bg-outline-variant'}`} aria-hidden="true"></span>
                <div className="shrink-0 flex items-center gap-3 px-5 h-16 border-b border-outline-variant">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                        <span className={`material-symbols-outlined ${st.cls}`} style={{ fontSize: '22px' }} aria-hidden="true">{st.icon}</span>
                    </span>
                    <span className="font-semibold text-on-surface text-[15px] flex-1 leading-snug">{s.label}</span>
                    <button onClick={onClose} title="Đóng" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`${chip} ${s.state === 'ok' ? 'bg-secondary text-on-secondary' : s.state === 'fail' ? 'bg-error/15 text-error' : 'border border-outline-variant text-on-surface-variant'}`}>{st.title}</span>
                        <span className={`${chip} border ${s.weight === 'blocker' ? 'border-error/50 text-error' : 'border-outline-variant text-on-surface-variant'}`}>{WEIGHT_LABEL[s.weight]}</span>
                        <span className={`${chip} border border-outline-variant text-on-surface-variant inline-flex items-center gap-1`}><span className="material-symbols-outlined text-[14px]" aria-hidden="true">{s.kind === 'attest' ? 'stylus_note' : 'speed'}</span>{s.kind === 'attest' ? 'Người ký' : 'Máy đo'}</span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{s.detail}</p>
                    <div className="space-y-3">
                        {s.to && (
                            <Link to={s.to} onClick={onClose} className="flex items-center justify-between gap-2 bg-surface-container border border-outline-variant rounded-xl px-4 py-3 hover:border-secondary/40 transition-colors">
                                <span className="text-on-surface font-medium">{s.toLabel ?? 'Mở trang'}</span>
                                <span className="material-symbols-outlined text-primary" aria-hidden="true">arrow_forward</span>
                            </Link>
                        )}
                        {s.kind === 'attest' && (
                            <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
                                {attest ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-secondary text-sm"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">verified</span>Đã ký: <b>{attest.by}</b></div>
                                        <div className="text-xs text-on-surface-variant">{fmtTs(attest.ts)}</div>
                                        {warn && <div className="text-xs text-error">⚠ ký trước ngày tổng duyệt</div>}
                                        <button onClick={onClear} className="text-sm text-on-surface-variant hover:text-error underline">Rút xác nhận</button>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        <label className="font-label-caps text-label-caps text-on-surface-variant block">Ký xác nhận (người chịu trách nhiệm)</label>
                                        <div className="flex gap-2">
                                            <input value={signValue} onChange={(e) => onSignChange(e.target.value)} placeholder="Tên người ký"
                                                className="flex-1 bg-surface text-on-surface border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-secondary focus:outline-none" />
                                            <button onClick={onSign} disabled={!signValue.trim()} className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-label-caps text-label-caps hover:opacity-80 disabled:opacity-40">Ký</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
};

const PrepDesk: React.FC = () => {
    const session = useLiveSession();
    const [data, setData] = useState<Fetched>(INITIAL);
    const [tick, setTick] = useState(0);
    const [prep, setPrepState] = useState(getPrep());
    const [signName, setSignName] = useState<Record<string, string>>({});
    const [selPhase, setSelPhase] = useState<Phase>('pre');
    const [incident, setIncident] = useState('');
    const [openId, setOpenId] = useState<string | null>(null);
    const [drawerShown, setDrawerShown] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch every backend-dependent artefact independently — one failure must not sink the rest.
    useEffect(() => {
        let cancelled = false;
        setData((d) => ({ ...d, loading: true }));
        Promise.allSettled([getHealth(), getGlossary(), getScript(), getAudioDevices(), getAudioOutputs()])
            .then(([h, g, s, ind, outd]) => {
                if (cancelled) return;
                setData({
                    health: h.status === 'fulfilled' ? h.value : null, healthErr: h.status === 'rejected',
                    glossary: g.status === 'fulfilled' ? g.value : null, glossaryErr: g.status === 'rejected',
                    script: s.status === 'fulfilled' ? s.value : null, scriptErr: s.status === 'rejected',
                    // A 200-but-error-shaped body (has `error`, no `devices[]`) is fulfilled — treat it as a failed read, not a crash.
                    inputs: ind.status === 'fulfilled' ? (ind.value?.devices?.length ?? null) : null,
                    inputsErr: ind.status === 'rejected' || (ind.status === 'fulfilled' && !Array.isArray(ind.value?.devices)),
                    outputs: outd.status === 'fulfilled' ? (outd.value?.devices?.length ?? null) : null,
                    outputsErr: outd.status === 'rejected' || (outd.status === 'fulfilled' && !Array.isArray(outd.value?.devices)),
                    loading: false,
                });
            });
        return () => { cancelled = true; };
    }, [tick]);

    // Latch proof that models actually warmed to READY in this browser (the Metal≠CUDA risk).
    // Refresh component state after latching so the models-warm signal stays green once the session
    // leaves ready/listening — otherwise the memo re-reads stale prep and the blocker reverts to NO-GO.
    useEffect(() => {
        if (session.status === 'ready' || session.status === 'listening') {
            markReachedReady();
            setPrepState((p) => (p.reachedReadyTs ? p : getPrep()));
        }
    }, [session.status]);

    const doSign = (id: string) => { setPrepState(signAttest(id, signName[id] ?? '')); toast.success('Đã ký xác nhận'); };
    const doClear = (id: string) => { setPrepState(clearAttest(id)); toast.info('Đã rút xác nhận'); };

    // Detail-drawer open/close: enter via a CSS keyframe (reliable), exit via a transform transition
    // then unmount after it finishes (300ms).
    const openCard = (id: string) => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
        setOpenId(id);
        if (!drawerShown) {
            setDrawerShown(false);                          // mount off-screen…
            setTimeout(() => setDrawerShown(true), 20);     // …then slide in via the transform transition
        }
    };
    const closeDrawer = () => {
        setDrawerShown(false);
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setOpenId(null), 300);
    };

    const signals: Signal[] = useMemo(() => {
        const tts = loadTtsPrefs();   // localStorage; re-read whenever this memo recomputes
        const g = data.glossary;
        let gCount = 0, gHot = 0, gKeigo = 0, gNoReading = 0;
        const gBareNames: string[] = [];
        if (g) {
            gCount = g.length;
            for (const e of g) {
                if (e.asr_hotword) gHot++;
                if (e.type === 'keigo') gKeigo++;
                const isName = e.type === 'name' || e.type === 'company' || e.type === 'award';
                if (isName && !e.asr_hotword) gBareNames.push(e.vi);
                if (isName && !e.reading) gNoReading++;
            }
        }
        const s = data.script;
        const sTotal = s ? s.length : 0;
        const sApproved = s ? s.filter((r) => r.status === 'approved').length : 0;

        const host = window.location.hostname;
        const loopback = (API_BASE === '' || /(127\.0\.0\.1|localhost)/.test(API_BASE)) && /^(127\.0\.0\.1|localhost)$/.test(host);

        const warm = !!prep.reachedReadyTs || !!prep.attest['models-warm'] || session.status === 'ready' || session.status === 'listening';
        const at = (id: string) => prep.attest[id];
        const attState = (id: string): SigState => (at(id) ? 'ok' : 'fail');

        const list: Signal[] = [
            {
                id: 'backend-reachable', label: 'Lõi dịch phản hồi (backend health.ok)', phase: 'pre', weight: 'blocker', kind: 'measured',
                state: session.backendOnline ? 'ok' : 'fail',
                detail: session.backendOnline ? `Online tại ${API_BASE || '127.0.0.1:8080'}` : `Không phản hồi — ${API_BASE || '127.0.0.1:8080'}`,
                to: '/audio', toLabel: 'Mở console',
            },
            {
                id: 'pipeline-registered', label: 'Đồ hình xử lý đã đăng ký (STT·MT·TTS)', phase: 'pre', weight: 'important', kind: 'measured',
                state: data.healthErr || !data.health ? 'unknown' : (data.health.blocks > 0 ? 'ok' : 'fail'),
                detail: data.healthErr || !data.health ? 'chưa đo được (cần backend)' : `${data.health.blocks} khối · CHƯA chứng minh model đã nạp GPU`,
            },
            {
                id: 'models-warm', label: 'Model đã WARM thật (không chỉ online)', phase: 'pre', weight: 'blocker', kind: 'attest',
                state: warm ? 'ok' : 'fail',
                detail: prep.reachedReadyTs ? `Đã quan sát READY (${fmtTs(prep.reachedReadyTs)}) trong phiên trình duyệt này`
                    : (session.status === 'ready' || session.status === 'listening') ? 'Đang READY/LIVE ngay bây giờ'
                        : 'Chưa quan sát WARMING→READY — chạy dry-run START ở /audio (rủi ro Metal≠CUDA lớn nhất)',
                to: '/audio', toLabel: 'Dry-run START→READY',
            },
            {
                id: 'script-approved', label: 'Kịch bản song ngữ có dòng ĐÃ DUYỆT', phase: 'pre', weight: 'important', kind: 'measured',
                state: data.scriptErr ? 'unknown' : (sApproved >= 1 ? 'ok' : 'fail'),
                detail: data.scriptErr ? 'chưa đọc được data/script.json' : `${sApproved}/${sTotal} dòng đã duyệt`,
                to: '/script', toLabel: 'Duyệt kịch bản',
            },
            {
                id: 'glossary-protected', label: 'Từ điển nạp được & tên riêng đã bảo vệ', phase: 'pre', weight: 'important', kind: 'measured',
                state: data.glossaryErr ? 'unknown' : (gCount > 0 && gBareNames.length === 0 && gKeigo > 0 ? 'ok' : 'fail'),
                detail: data.glossaryErr ? 'chưa đọc được data/glossary.json'
                    : `${gCount} mục · ${gHot} hotword · ${gKeigo} keigo · ${gBareNames.length ? `tên chưa khoá: ${gBareNames.slice(0, 4).join(', ')}${gBareNames.length > 4 ? '…' : ''}` : '0 tên trần'}${gNoReading ? ` · ${gNoReading} tên chưa có reading` : ''}`,
                to: '/glossary', toLabel: 'Sửa từ điển',
            },
            {
                id: 'tts-decided', label: 'Đã chốt giọng đọc / hoặc chỉ-phụ-đề', phase: 'pre', weight: 'important', kind: 'measured',
                state: !tts.enabled ? 'ok' : (tts.vi && tts.ja ? 'ok' : 'fail'),
                detail: !tts.enabled ? 'CHỈ PHỤ ĐỀ (khuyến nghị audit cho gala)' : `Đọc tiếng: VI ${tts.vi ? '✓' : '✗'} · JA ${tts.ja ? '✓' : '✗'}`,
                to: '/voices', toLabel: 'Chọn giọng',
            },
            {
                id: 'mic-present', label: 'Backend thấy thiết bị mic', phase: 'pre', weight: 'important', kind: 'measured',
                state: data.inputsErr ? 'unknown' : ((data.inputs ?? 0) >= 1 ? 'ok' : 'fail'),
                detail: data.inputsErr ? 'chưa đo được' : `${data.inputs ?? 0} mic — còn phải CHỌN & khoá mic sân khấu ở /audio`,
                to: '/audio', toLabel: 'Chọn mic',
            },
            {
                id: 'outputs-split', label: 'Đủ ≥2 ngõ loa để tách VI ≠ JA', phase: 'pre', weight: 'important', kind: 'measured',
                state: data.outputsErr ? 'unknown' : ((data.outputs ?? 0) >= 2 ? 'ok' : 'fail'),
                detail: data.outputsErr ? 'chưa đo được' : `${data.outputs ?? 0} ngõ ra`,
                to: '/audio', toLabel: 'Gán ngõ ra',
            },
            {
                id: 'network-loopback', label: 'Chạy loopback — KHÔNG trỏ cloud', phase: 'pre', weight: 'important', kind: 'measured',
                state: loopback ? 'ok' : 'fail',
                detail: `API_BASE='${API_BASE || '(same-origin)'}' · host='${host}' — chỉ chứng minh app không trỏ cloud, KHÔNG chứng minh LAN đã cách ly`,
            },
            {
                id: 'script-rehearsed', label: 'Kịch bản đã diễn tập với MIC SÂN KHẤU thật', phase: 'pre', weight: 'blocker', kind: 'attest',
                state: attState('script-rehearsed'),
                detail: 'approved ≠ đã chạy qua ASR/VAD với mic thật ở Green Room 07/08 — cần ký tay',
            },
            {
                id: 'names-verified', label: 'Tên riêng ★ đã NGHE ĐÚNG ở Clinic', phase: 'pre', weight: 'blocker', kind: 'attest',
                state: (!data.glossaryErr && g && gBareNames.length === 0 && at('names-verified')) ? 'ok' : 'fail',
                detail: data.glossaryErr ? 'chưa đọc được glossary (phần đếm) — vẫn cần ký tay'
                    : `${gBareNames.length === 0 ? '0 tên trần' : `còn ${gBareNames.length} tên chưa khoá`} + cần ký 'đã nghe đúng ở Pronunciation Clinic'`,
                to: '/voices', toLabel: 'Pronunciation Clinic',
            },
            {
                id: 'human-interpreter', label: 'Phiên dịch viên NGƯỜI trực (primary/standby)', phase: 'pre', weight: 'blocker', kind: 'attest',
                state: attState('human-interpreter'),
                detail: 'PROYAKU là lớp PHỤ ĐỀ — audit yêu cầu LUÔN có PDV người đứng cạnh, đã brief Q&A/lời chúc + thống nhất tín hiệu cắt sang mic người',
            },
            {
                id: 'second-mac', label: 'Mac dự phòng #2 đã ấm + công tắc A/B feed LED', phase: 'pre', weight: 'important', kind: 'attest',
                state: attState('second-mac'),
                detail: 'Mac #2 warm cùng glossary+script, có A/B trên feed LED, đã tập cutover',
            },
            // ---- IN-EVENT (live mirrors — không tính vào phán quyết pre) ----
            {
                id: 'live-console-active', label: 'Console đang trực (gương Annunciator)', phase: 'in', weight: 'important', kind: 'measured',
                state: session.status === 'ready' || session.status === 'listening' ? 'ok' : 'unknown',
                detail: session.backendOnline ? `trạng thái: ${session.status}` : 'chưa gắn với phiên live nào (OFFLINE)',
            },
            {
                id: 'e2e-latency', label: 'Độ trễ E2E đo được < ~1800ms', phase: 'in', weight: 'important', kind: 'measured',
                state: session.timing?.e2e == null ? 'unknown' : (session.timing.e2e < 1800 ? 'ok' : 'fail'),
                detail: session.timing?.e2e == null ? 'chưa đo (cần live/dry-run cùng trình duyệt)' : `${Math.round(session.timing.e2e)}ms`,
            },
            {
                id: 'no-signal-clean', label: 'Không kẹt NO-SIGNAL khi LIVE', phase: 'in', weight: 'important', kind: 'measured',
                state: session.status !== 'listening' ? 'unknown' : (session.speech || session.level > 0.02 ? 'ok' : 'fail'),
                detail: session.status !== 'listening' ? 'chờ live' : (session.speech || session.level > 0.02 ? 'có tín hiệu' : 'IM LẶNG — kiểm mic'),
            },
            {
                id: 'cut-to-safe', label: 'Nút CUT-TO-SAFE (freeze/slate) đã tập', phase: 'in', weight: 'important', kind: 'attest',
                state: attState('cut-to-safe'),
                detail: `cắt hiện tại: ${session.audienceCut} — ký 'đã tập freeze/slate từ /audio xuống /stream + ≥1 cửa sổ LED đang mở'`,
            },
            {
                id: 'recording-armed', label: 'Đã bật GHI phiên (record) trên /audio', phase: 'in', weight: 'nice', kind: 'attest',
                state: attState('recording-armed'),
                detail: 'record là cầu nối DUY NHẤT sang Post-Event — bật TRƯỚC khi START',
            },
            // ---- POST-EVENT ----
            {
                id: 'learnings-captured', label: 'Đã ghi bài học (misheard→đúng, tên mới)', phase: 'post', weight: 'nice', kind: 'attest',
                state: attState('learnings-captured'),
                detail: 'đưa từ nghe nhầm & tên mới vào /glossary và nâng draft→approved ở /script cho lần sau',
            },
            {
                id: 'kb-snapshot', label: 'Đã sao lưu gói tri thức (glossary+script)', phase: 'post', weight: 'nice', kind: 'attest',
                state: attState('kb-snapshot'),
                detail: 'export client-side là bản ghi bền DUY NHẤT (không có endpoint log phiên)',
            },
        ];
        return list;
    }, [data, prep, session.backendOnline, session.status, session.timing, session.speech, session.level, session.audienceCut]);

    const preSignals = signals.filter((s) => s.phase === 'pre');
    const blockers = preSignals.filter((s) => s.weight === 'blocker');
    const importants = preSignals.filter((s) => s.weight === 'important');
    const blockersOk = blockers.filter((s) => s.state === 'ok').length;
    const importantsOk = importants.filter((s) => s.state === 'ok').length;

    const verdict: 'GO' | 'NO-GO' | 'DEGRADED' =
        blockersOk < blockers.length ? 'NO-GO' : (importantsOk < importants.length ? 'DEGRADED' : 'GO');

    const nextBlocker = blockers.find((s) => s.state !== 'ok');
    const phaseCount = (p: Phase) => {
        const sig = signals.filter((s) => s.phase === p);
        const ok = sig.filter((s) => s.state === 'ok').length;
        const openBlockers = sig.filter((s) => s.weight === 'blocker' && s.state !== 'ok').length;
        return { ok, total: sig.length, openBlockers, pct: sig.length ? Math.round((ok / sig.length) * 100) : 0 };
    };

    const exportKb = () => {
        if (!data.glossary || !data.script) return;
        const payload = { exportedAt: new Date().toISOString(), event: 'Esuhai 20th — PROYAKU', glossary: data.glossary, script: data.script };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `proyaku-as-run-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const _ev = eventDates();
    const dRehearsal = daysUntil(_ev.rehearsal), dGala = daysUntil(_ev.gala);
    const shownSignals = signals.filter((s) => s.phase === selPhase);
    const openSignal = openId ? signals.find((s) => s.id === openId) ?? null : null;
    const openPre = preSignals.filter((s) => s.state !== 'ok').length;
    const v = VERDICT_UI[verdict];
    const blockPct = blockers.length ? Math.round((blockersOk / blockers.length) * 100) : 0;
    const tone = verdict === 'GO' ? { wrap: 'bg-secondary/10 border-secondary/40', text: 'text-secondary' }
        : verdict === 'DEGRADED' ? { wrap: 'bg-primary/10 border-primary/40', text: 'text-primary' }
            : { wrap: 'bg-error/10 border-error/30', text: 'text-error' };

    return (
        <div className="h-full flex flex-col bg-background text-on-background overflow-hidden relative">
            <PageHeader
                icon="dashboard"
                title="Bảng chỉ huy"
                subtitle={`Tổng duyệt ${dRehearsal >= 0 ? `còn ${dRehearsal}n` : 'đã qua'} · Gala ${dGala >= 0 ? `còn ${dGala}n` : 'đã qua'}`}
            >
                <button onClick={() => setTick((t) => t + 1)} disabled={data.loading} className="border border-outline-variant text-on-surface-variant px-3 py-1.5 text-sm rounded-DEFAULT hover:text-primary hover:border-primary disabled:opacity-40">{data.loading ? 'Đang đo…' : 'Đo lại'}</button>
            </PageHeader>

            <div className="flex-1 flex min-h-0 gap-5 p-5 md:p-8 overflow-hidden">
                {/* CỘT 1 — menu pha: 3 ô chia đều chiều cao; active = viền + màu + icon + font to hơn */}
                <aside className="w-60 xl:w-72 shrink-0 flex flex-col gap-3">
                    {PHASES.map((ph, pi) => {
                        const c = phaseCount(ph.key);
                        const activeP = selPhase === ph.key;
                        return (
                            <button key={ph.key} onClick={() => setSelPhase(ph.key)} aria-pressed={activeP}
                                className={`group relative overflow-hidden flex-1 flex flex-col justify-center gap-3 rounded-2xl border p-5 pl-6 text-left transition-all duration-200 ease-out motion-reduce:transition-none ${activeP ? 'bg-surface-container-high border-secondary/70 shadow-lg shadow-secondary/10' : 'bg-transparent border-outline-variant hover:bg-surface-container hover:border-outline'}`}>
                                {/* Thanh vàng trái = "bạn đang ở đây" (cùng ngôn ngữ với thẻ con đang mở) */}
                                <span className={`absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-200 ${activeP ? 'bg-secondary' : 'bg-transparent'}`} aria-hidden="true"></span>
                                {/* Số thứ tự — các pha là một chuỗi thật (trước → trong → sau sự kiện) */}
                                <span className={`absolute top-4 right-5 font-label-caps text-[11px] tracking-[0.2em] tabular-nums transition-colors ${activeP ? 'text-secondary/70' : 'text-on-surface-variant/30'}`} aria-hidden="true">{`0${pi + 1}`}</span>
                                <div className="flex items-center gap-3">
                                    <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${activeP ? 'bg-secondary text-on-secondary shadow-md shadow-secondary/25' : 'bg-surface-container-high text-on-surface-variant group-hover:text-on-surface'}`}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }} aria-hidden="true">{ph.icon}</span>
                                    </span>
                                    <div className="min-w-0">
                                        <div className={`transition-all leading-tight ${activeP ? 'text-secondary font-bold text-lg' : 'text-on-surface font-semibold text-[15px]'}`}>{ph.name}</div>
                                        <div className="text-xs text-on-surface-variant mt-0.5 tabular-nums">{c.ok}/{c.total} đạt{c.openBlockers > 0 ? ` · ${c.openBlockers} chặn` : ''}</div>
                                    </div>
                                </div>
                                <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${activeP ? 'bg-secondary' : 'bg-outline/40 group-hover:bg-outline/60'}`} style={{ width: `${c.pct}%` }}></div>
                                </div>
                            </button>
                        );
                    })}
                </aside>

                {/* CỘT 2–3 — verdict + thẻ nội dung của pha đang chọn */}
                <div className="flex-1 flex flex-col min-h-0 gap-5">
                    <div className={`shrink-0 rounded-2xl border p-5 flex items-center gap-5 ${tone.wrap}`}>
                        <Ring pct={blockPct} size={64} />
                        <div className="flex-1 min-w-0">
                            <div className={`flex items-center gap-2 ${tone.text}`}>
                                <span className="material-symbols-outlined" aria-hidden="true">{v.icon}</span>
                                <span className="text-xl md:text-2xl font-bold tracking-tight">{v.word}</span>
                            </div>
                            <div className="text-sm mt-1 text-on-surface-variant">
                                {verdict === 'GO'
                                    ? 'Mọi hạng mục bắt buộc đã hoàn tất.'
                                    : `Còn ${openPre} việc cần hoàn tất${nextBlocker ? ` — kế tiếp: ${nextBlocker.label}` : ''}.`}
                            </div>
                        </div>
                        {nextBlocker?.to
                            ? <Link to={nextBlocker.to} className={`shrink-0 flex items-center gap-1.5 border border-outline-variant px-4 py-2 rounded-full font-label-caps text-label-caps hover:bg-surface-container transition-colors ${tone.text}`}>{nextBlocker.toLabel ?? 'Xử lý'}<span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span></Link>
                            : verdict === 'GO'
                                ? <Link to="/audio" className={`shrink-0 flex items-center gap-1.5 border border-outline-variant px-4 py-2 rounded-full font-label-caps text-label-caps hover:bg-surface-container transition-colors ${tone.text}`}>Vào điều khiển<span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span></Link>
                                : null}
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 -mr-2 pr-2 space-y-4">
                        {/* In-event quick actions */}
                    {selPhase === 'in' && (
                        <div className="grid sm:grid-cols-3 gap-3">
                            <Link to="/audio" className="flex items-center justify-center gap-2 bg-primary text-on-primary rounded-xl px-4 py-3.5 font-label-caps text-label-caps hover:opacity-90"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">tune</span>Điều khiển</Link>
                            <Link to="/stream" className="flex items-center justify-center gap-2 bg-secondary text-on-secondary rounded-xl px-4 py-3.5 font-label-caps text-label-caps hover:opacity-90"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">subtitles</span>Tường phụ đề</Link>
                            <Link to="/reveal" className="flex items-center justify-center gap-2 border border-outline-variant text-on-surface-variant rounded-xl px-4 py-3.5 font-label-caps text-label-caps hover:border-primary"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">auto_awesome</span>Reveal</Link>
                        </div>
                    )}

                        {/* READINESS CARDS (Mercury) — bấm thẻ mở panel chi tiết (Raycast) */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                            {shownSignals.map((s, i) => (
                                <SignalCard key={s.id} s={s} attest={prep.attest[s.id]} index={i} active={openId === s.id} onOpen={() => openCard(s.id)} />
                            ))}
                        </div>

                    {/* POST-EVENT actions */}
                    {selPhase === 'post' && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <button onClick={exportKb} disabled={!data.glossary || !data.script}
                                    className="flex items-center gap-2 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80 disabled:opacity-40"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">download</span>Xuất gói tri thức</button>
                                <Link to="/glossary" className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant px-3 py-2 text-sm rounded-full hover:border-primary"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">menu_book</span>Từ điển</Link>
                                <Link to="/script" className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant px-3 py-2 text-sm rounded-full hover:border-primary"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">theater_comedy</span>Kịch bản</Link>
                            </div>
                            <div>
                                <div className="font-label-caps text-label-caps text-on-surface-variant mb-2">Ghi sự cố (nền cho lần sau)</div>
                                <div className="flex gap-2">
                                    <input value={incident} onChange={(e) => setIncident(e.target.value)} placeholder="vd: 'Kaizen' nghe thành 'kaisen'…"
                                        className="flex-1 bg-surface text-on-surface border border-outline-variant rounded-DEFAULT px-3 py-2 text-sm" />
                                    <button onClick={() => { setPrepState(addIncident(incident)); setIncident(''); }} disabled={!incident.trim()}
                                        className="border border-outline-variant text-on-surface-variant px-3 py-2 text-sm rounded-DEFAULT hover:border-primary disabled:opacity-40">Ghi</button>
                                </div>
                                <ul className="mt-2 space-y-1">
                                    {prep.incidents.map((it, i) => (
                                        <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                                            <button onClick={() => setPrepState(removeIncident(i))} className="text-error hover:opacity-70">✕</button>
                                            <span>{it}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-on-surface-variant">
                                <input type="checkbox" checked={!!prep.debrief['done']} onChange={(e) => setPrepState(setDebrief('done', e.target.checked))} className="accent-secondary" />
                                Đã họp rút kinh nghiệm cho sự kiện kế
                            </label>
                        </div>
                        )}
                    </div>
                </div>
            </div>

            {openSignal && (
                <SignalDrawer s={openSignal} attest={prep.attest[openSignal.id]} shown={drawerShown}
                    signValue={signName[openSignal.id] ?? ''}
                    onSignChange={(val) => setSignName((m) => ({ ...m, [openSignal.id]: val }))}
                    onSign={() => doSign(openSignal.id)} onClear={() => doClear(openSignal.id)}
                    onClose={closeDrawer} />
            )}
        </div>
    );
};

export default PrepDesk;
