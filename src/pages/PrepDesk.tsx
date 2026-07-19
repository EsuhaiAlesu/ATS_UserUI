import React, { useEffect, useMemo, useState } from 'react';
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

// Module-scope so its identity is STABLE across PrepDesk re-renders — otherwise typing in the
// "Tên người ký" input would remount the row and drop focus after each keystroke.
const SignalRow: React.FC<{
    s: Signal; attest?: Attest; signValue: string;
    onSignChange: (v: string) => void; onSign: () => void; onClear: () => void;
}> = ({ s, attest, signValue, onSignChange, onSign, onClear }) => {
    const warn = signedBeforeRehearsal(attest);
    const st = STATE_ICON[s.state];
    return (
        <div className="flex items-start gap-3 py-3 border-t border-outline-variant/50 first:border-t-0">
            <span className={`material-symbols-outlined shrink-0 ${st.cls}`} title={st.title} aria-hidden="true">{st.icon}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {s.weight === 'blocker' && <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0" title="Bắt buộc"></span>}
                    <span className="font-medium text-on-surface">{s.label}</span>
                    <span className="material-symbols-outlined text-[15px] text-on-surface-variant/60 shrink-0" title={s.kind === 'attest' ? 'Người xác nhận' : 'Máy tự đo'} aria-hidden="true">{s.kind === 'attest' ? 'stylus_note' : 'speed'}</span>
                </div>
                {s.state !== 'ok' && <div className="text-sm text-on-surface-variant mt-0.5">{s.detail}</div>}
                {s.kind === 'attest' && (
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                        {attest ? (
                            <>
                                <span className="text-xs text-secondary">✓ {attest.by} · {fmtTs(attest.ts)}</span>
                                {warn && <span className="text-xs text-error">⚠ ký trước tổng duyệt</span>}
                                <button onClick={onClear} className="text-xs text-on-surface-variant hover:text-error underline">Rút</button>
                            </>
                        ) : (
                            <>
                                <input value={signValue} onChange={(e) => onSignChange(e.target.value)}
                                    placeholder="Tên người ký" className="bg-surface text-on-surface border border-outline-variant rounded-DEFAULT px-2.5 py-1 text-sm w-40" />
                                <button onClick={onSign} className="border border-secondary text-secondary px-3 py-1 text-sm rounded-DEFAULT hover:opacity-80">Ký</button>
                            </>
                        )}
                    </div>
                )}
            </div>
            {s.to && <Link to={s.to} title={s.toLabel ?? 'Mở'} className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-primary hover:bg-surface-container"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span></Link>}
        </div>
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

    const doSign = (id: string) => setPrepState(signAttest(id, signName[id] ?? ''));
    const doClear = (id: string) => setPrepState(clearAttest(id));

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
    const openPre = preSignals.filter((s) => s.state !== 'ok').length;
    const v = VERDICT_UI[verdict];
    const blockPct = blockers.length ? Math.round((blockersOk / blockers.length) * 100) : 0;

    return (
        <div className="h-full flex flex-col bg-background text-on-background overflow-hidden">
            <PageHeader
                icon="dashboard"
                title="Bảng chỉ huy"
                subtitle={`Tổng duyệt ${dRehearsal >= 0 ? `còn ${dRehearsal}n` : 'đã qua'} · Gala ${dGala >= 0 ? `còn ${dGala}n` : 'đã qua'}`}
            >
                <button onClick={() => setTick((t) => t + 1)} disabled={data.loading} className="border border-outline-variant text-on-surface-variant px-3 py-1.5 text-sm rounded-DEFAULT hover:text-primary hover:border-primary disabled:opacity-40">{data.loading ? 'Đang đo…' : 'Đo lại'}</button>
            </PageHeader>

            <div className="flex-1 overflow-y-auto">
                <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
                    {/* VERDICT — friendly hero */}
                    <div className={`rounded-xl px-6 py-5 flex items-center gap-5 ${v.box}`}>
                        <Ring pct={blockPct} size={68} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined" aria-hidden="true">{v.icon}</span>
                                <span className="text-xl md:text-2xl font-bold tracking-tight">{v.word}</span>
                            </div>
                            <div className="text-sm mt-1 opacity-90">
                                {verdict === 'GO'
                                    ? 'Mọi hạng mục bắt buộc đã hoàn tất.'
                                    : `Còn ${openPre} việc cần hoàn tất${nextBlocker ? ` — kế tiếp: ${nextBlocker.label}` : ''}.`}
                            </div>
                        </div>
                        {nextBlocker?.to
                            ? <Link to={nextBlocker.to} className="shrink-0 flex items-center gap-1.5 bg-background/20 border border-current px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80">{nextBlocker.toLabel ?? 'Xử lý'}<span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span></Link>
                            : verdict === 'GO'
                                ? <Link to="/audio" className="shrink-0 flex items-center gap-1.5 bg-background/20 border border-current px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80">Vào điều khiển<span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span></Link>
                                : null}
                    </div>

                    {/* PHASE CARDS */}
                    <div className="grid grid-cols-3 gap-3">
                        {PHASES.map((ph) => {
                            const c = phaseCount(ph.key);
                            const activeP = selPhase === ph.key;
                            return (
                                <button key={ph.key} onClick={() => setSelPhase(ph.key)}
                                    className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl border transition-colors ${activeP ? 'border-secondary bg-surface-container' : 'border-outline-variant hover:border-primary'}`}>
                                    <div className="relative flex items-center justify-center">
                                        <Ring pct={c.pct} size={48} />
                                        <span className={`material-symbols-outlined absolute text-[18px] ${activeP ? 'text-secondary' : 'text-on-surface-variant'}`} aria-hidden="true">{ph.icon}</span>
                                    </div>
                                    <div className={`font-label-caps text-label-caps ${activeP ? 'text-secondary' : 'text-on-surface'}`}>{ph.name}</div>
                                    <div className="text-xs text-on-surface-variant tabular-nums">{c.ok}/{c.total}{c.openBlockers > 0 ? ` · ${c.openBlockers}✗` : ''}</div>
                                </button>
                            );
                        })}
                    </div>

                    {/* In-event quick actions */}
                    {selPhase === 'in' && (
                        <div className="grid sm:grid-cols-3 gap-3">
                            <Link to="/audio" className="flex items-center justify-center gap-2 bg-primary text-on-primary rounded-xl px-4 py-3.5 font-label-caps text-label-caps hover:opacity-90"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">tune</span>Điều khiển</Link>
                            <Link to="/stream" className="flex items-center justify-center gap-2 bg-secondary text-on-secondary rounded-xl px-4 py-3.5 font-label-caps text-label-caps hover:opacity-90"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">subtitles</span>Tường phụ đề</Link>
                            <Link to="/reveal" className="flex items-center justify-center gap-2 border border-outline-variant text-on-surface-variant rounded-xl px-4 py-3.5 font-label-caps text-label-caps hover:border-primary"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">auto_awesome</span>Reveal</Link>
                        </div>
                    )}

                    {/* CHECKLIST */}
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-1">
                        {shownSignals.map((s) => (
                            <SignalRow key={s.id} s={s} attest={prep.attest[s.id]}
                                signValue={signName[s.id] ?? ''}
                                onSignChange={(val) => setSignName((m) => ({ ...m, [s.id]: val }))}
                                onSign={() => doSign(s.id)} onClear={() => doClear(s.id)} />
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
                </main>
            </div>
        </div>
    );
};

export default PrepDesk;
