import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveSession } from '../lib/LiveSessionContext';
import { API_BASE, getHealth, getGlossary, getScript, getAudioDevices, getAudioOutputs } from '../lib/api';
import type { GlossaryEntry, ScriptEntry } from '../lib/api';
import { loadTtsPrefs } from '../lib/ttsPrefs';
import {
    getPrep, signAttest, clearAttest, markReachedReady, setDebrief, addIncident, removeIncident,
    signedBeforeRehearsal, daysUntil, REHEARSAL_DATE, GALA_DATE,
} from '../lib/prep';
import type { Attest } from '../lib/prep';

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

const WEIGHT_LABEL: Record<Weight, string> = { blocker: 'CHẶN', important: 'QUAN TRỌNG', nice: 'NÊN CÓ' };
const fmtTs = (ts: string) => ts.replace('T', ' ').slice(0, 16);

const CHIP_MAP: Record<SigState, { cls: string; txt: string }> = {
    ok: { cls: 'bg-secondary text-on-secondary', txt: '✓ ĐẠT' },
    fail: { cls: 'border border-error text-error', txt: '✗ CHƯA' },
    unknown: { cls: 'border border-outline-variant text-on-surface-variant', txt: '— ?' },
};

// Module-scope so their function identity is STABLE across PrepDesk re-renders. If SignalRow were
// declared inside PrepDesk, typing in the "Tên người ký" input would setState → re-render → a new
// SignalRow type → React remounts the subtree → the input loses focus after every keystroke.
const Chip: React.FC<{ state: SigState }> = ({ state }) => (
    <span className={`px-2 py-0.5 rounded-DEFAULT font-label-caps text-label-caps ${CHIP_MAP[state].cls}`}>{CHIP_MAP[state].txt}</span>
);

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

const SignalRow: React.FC<{
    s: Signal; attest?: Attest; signValue: string;
    onSignChange: (v: string) => void; onSign: () => void; onClear: () => void;
}> = ({ s, attest, signValue, onSignChange, onSign, onClear }) => {
    const warn = signedBeforeRehearsal(attest);
    return (
        <div className="border-t border-outline-variant py-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-3 flex-wrap">
                <Chip state={s.state} />
                <span className="font-medium text-on-surface">{s.label}</span>
                <span className={`font-label-caps text-label-caps px-1.5 py-0.5 rounded-DEFAULT ${s.weight === 'blocker' ? 'text-error' : 'text-on-surface-variant'}`}>{WEIGHT_LABEL[s.weight]}</span>
                <span className="font-label-caps text-label-caps px-1.5 py-0.5 rounded-DEFAULT border border-outline-variant text-on-surface-variant">{s.kind === 'attest' ? 'KÝ TAY' : 'ĐO ĐƯỢC'}</span>
                {s.to && <Link to={s.to} className="ml-auto font-label-caps text-label-caps text-primary hover:opacity-70">{s.toLabel ?? 'Mở'} ↗</Link>}
            </div>
            <div className="text-sm text-on-surface-variant pl-1">{s.detail}</div>
            {s.kind === 'attest' && (
                <div className="flex items-center gap-2 flex-wrap pl-1">
                    {attest ? (
                        <>
                            <span className="text-sm text-secondary">✓ Đã ký: <b>{attest.by}</b> · {fmtTs(attest.ts)}</span>
                            {warn && <span className="text-sm text-error">⚠ ký TRƯỚC ngày tổng duyệt {REHEARSAL_DATE}</span>}
                            <button onClick={onClear} className="text-sm text-on-surface-variant hover:text-error underline">Rút</button>
                        </>
                    ) : (
                        <>
                            <input value={signValue} onChange={(e) => onSignChange(e.target.value)}
                                placeholder="Tên người ký" className="bg-surface text-on-surface border border-outline-variant rounded-DEFAULT px-2 py-1 text-sm w-44" />
                            <button onClick={onSign} className="border border-secondary text-secondary px-3 py-1 text-sm rounded-DEFAULT hover:opacity-80">Ký xác nhận</button>
                        </>
                    )}
                </div>
            )}
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
    // Scope the "chưa ký" counter to PRE attests — the verdict strip is the pre-event go/no-go.
    const unsigned = preSignals.filter((s) => s.kind === 'attest' && s.state !== 'ok').length;

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

    const verdictBox: Record<typeof verdict, string> = {
        'GO': 'bg-secondary text-on-secondary', 'NO-GO': 'border-2 border-error text-error', 'DEGRADED': 'border-2 border-primary text-primary',
    };
    const dRehearsal = daysUntil(REHEARSAL_DATE), dGala = daysUntil(GALA_DATE);
    const shownSignals = signals.filter((s) => s.phase === selPhase);

    return (
        <div className="bg-background text-on-background min-h-screen w-full overflow-y-auto">
            <header className="bg-surface border-b border-outline-variant flex items-center gap-6 w-full px-container-padding h-20 sticky top-0 z-20">
                <Link to="/" className="text-on-surface-variant font-label-caps text-label-caps hover:text-primary">&lt; TRANG CHỦ</Link>
                <span className="font-bold text-xl tracking-tight text-secondary">TRUNG TÂM ĐIỀU PHỐI — PROYAKU</span>
                <div className="ml-auto flex items-center gap-4">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">
                        Tổng duyệt {dRehearsal >= 0 ? `còn ${dRehearsal}n` : 'đã qua'} · Gala {dGala >= 0 ? `còn ${dGala}n` : 'đã qua'}
                    </span>
                    <span className={`flex items-center gap-2 font-label-caps text-label-caps px-3 py-1.5 rounded-DEFAULT border ${session.backendOnline ? 'border-secondary text-secondary' : 'border-error text-error'}`}>
                        <span className={`w-2 h-2 rounded-full ${session.backendOnline ? 'bg-secondary' : 'bg-error'}`}></span>
                        {session.backendOnline ? `ONLINE${data.health ? ` · ${data.health.blocks} khối` : ''}` : 'OFFLINE'}
                    </span>
                    <button onClick={() => setTick((t) => t + 1)} disabled={data.loading} className="border border-outline-variant text-on-surface-variant px-3 py-2 text-sm hover:text-primary hover:border-primary disabled:opacity-40">{data.loading ? 'Đang đo…' : 'Đo lại'}</button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-container-padding py-8 space-y-6">
                {/* VERDICT STRIP */}
                <div className={`rounded-DEFAULT px-6 py-5 flex items-center gap-6 ${verdictBox[verdict]}`}>
                    <Ring pct={blockers.length ? Math.round((blockersOk / blockers.length) * 100) : 0} size={64} />
                    <div className="flex-1">
                        <div className="text-3xl font-bold tracking-tight">{verdict === 'GO' ? 'ĐƯỢC PHÉP LIVE — GO' : verdict === 'DEGRADED' ? 'GO HẠN CHẾ (DEGRADED)' : 'CHƯA ĐƯỢC — NO-GO'}</div>
                        <div className="text-sm mt-1 opacity-90">
                            {blockersOk}/{blockers.length} mục CHẶN đạt · {importantsOk}/{importants.length} quan trọng đạt · {unsigned} mục ký-tay chưa ký
                        </div>
                        {nextBlocker && <div className="text-sm mt-1 opacity-90">Việc chặn kế tiếp: <b>{nextBlocker.label}</b></div>}
                    </div>
                    {nextBlocker?.to
                        ? <Link to={nextBlocker.to} className="bg-background/20 border border-current px-4 py-2 rounded-DEFAULT font-label-caps text-label-caps hover:opacity-80">{nextBlocker.toLabel ?? 'Xử lý'} →</Link>
                        : verdict === 'GO'
                            ? <Link to="/audio" className="bg-background/20 border border-current px-4 py-2 rounded-DEFAULT font-label-caps text-label-caps hover:opacity-80">VÀO BÀN ĐIỀU KHIỂN →</Link>
                            : null}
                </div>

                <p className="text-sm text-on-surface-variant border border-outline-variant rounded-DEFAULT px-4 py-3">
                    ⓘ PROYAKU là lớp <b className="text-secondary">PHỤ ĐỀ-LÀ-CHÍNH</b>, có <b className="text-secondary">phiên dịch viên NGƯỜI</b> đứng cạnh — không phải hệ tự động hoàn toàn. Mỗi tín hiệu ghi rõ <b>ĐO ĐƯỢC</b> (máy tự tính) hay <b>KÝ TAY</b> (người xác nhận, lưu cục bộ máy này). Mục ký-tay <b>không bao giờ</b> tự xanh.
                </p>

                {/* STEPPER */}
                <div className="flex items-stretch gap-3">
                    {(['pre', 'in', 'post'] as Phase[]).map((p) => {
                        const c = phaseCount(p);
                        const label = p === 'pre' ? 'CHUẨN BỊ' : p === 'in' ? 'VẬN HÀNH' : 'SAU SỰ KIỆN';
                        const active = selPhase === p;
                        return (
                            <button key={p} onClick={() => setSelPhase(p)}
                                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-DEFAULT border ${active ? 'border-secondary bg-surface-container' : 'border-outline-variant hover:border-primary'}`}>
                                <Ring pct={c.pct} />
                                <div className="text-left">
                                    <div className={`font-label-caps text-label-caps ${active ? 'text-secondary' : 'text-on-surface'}`}>{label}</div>
                                    <div className="text-sm text-on-surface-variant">{c.ok}/{c.total} đạt{c.openBlockers > 0 ? ` · ${c.openBlockers} chặn` : ''}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* PHASE DETAIL */}
                {selPhase === 'in' && (
                    <div className="flex flex-wrap gap-3">
                        <Link to="/audio" className="flex-1 min-w-[220px] bg-primary text-on-primary rounded-DEFAULT px-5 py-4 font-label-caps text-label-caps text-center hover:opacity-90">CONSOLE VẬN HÀNH — START/STOP</Link>
                        <Link to="/stream" className="flex-1 min-w-[220px] bg-secondary text-on-secondary rounded-DEFAULT px-5 py-4 font-label-caps text-label-caps text-center hover:opacity-90">TƯỜNG PHỤ ĐỀ KHÁN GIẢ</Link>
                        <Link to="/reveal" className="flex-1 min-w-[160px] border border-outline-variant text-on-surface-variant rounded-DEFAULT px-5 py-4 font-label-caps text-label-caps text-center hover:border-primary">KHOẢNH KHẮC REVEAL</Link>
                    </div>
                )}

                <div>
                    {shownSignals.map((s) => (
                        <SignalRow key={s.id} s={s} attest={prep.attest[s.id]}
                            signValue={signName[s.id] ?? ''}
                            onSignChange={(v) => setSignName((m) => ({ ...m, [s.id]: v }))}
                            onSign={() => doSign(s.id)} onClear={() => doClear(s.id)} />
                    ))}
                </div>

                {selPhase === 'pre' && (
                    <div className="border border-outline-variant rounded-DEFAULT bg-surface-container-lowest px-4 py-3 text-sm text-on-surface-variant space-y-1">
                        <div className="font-label-caps text-label-caps text-secondary">LƯỚI AN TOÀN — nếu GÃY thì LÀM GÌ</div>
                        <div>• Mac chính OOM/quá nhiệt → gạt <b>A/B feed LED</b> sang <b>Mac #2</b> đã ấm.</div>
                        <div>• Chưa kịp chuyển máy → <b>PDV người cầm mic</b>, phụ đề <b>đóng băng dòng cuối</b> (freeze), <b>KHÔNG chiếu demo</b>.</div>
                        <div>• Mất tín hiệu mic → cảnh báo NO-SIGNAL ở /audio; kiểm mic sân khấu, sẵn sàng cắt sang người.</div>
                    </div>
                )}

                {selPhase === 'post' && (
                    <div className="space-y-4">
                        <div className="border border-outline-variant rounded-DEFAULT px-4 py-3 text-sm text-on-surface-variant">
                            ⓘ <b>Không</b> có phát lại / transcript / thống kê phiên tự động (API không có endpoint log). Muốn có bản ghi âm phải bật <b>record</b> trên /audio <b>trước</b> khi START. Dưới đây là những gì làm THẬT được:
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button onClick={exportKb} disabled={!data.glossary || !data.script}
                                className="bg-secondary text-on-secondary px-4 py-2 rounded-DEFAULT font-label-caps text-label-caps hover:opacity-80 disabled:opacity-40">⤓ Export gói tri thức (as-run JSON)</button>
                            {(!data.glossary || !data.script) && <span className="text-sm text-on-surface-variant">cần backend để đọc glossary+script</span>}
                            <Link to="/glossary" className="border border-outline-variant text-on-surface-variant px-3 py-2 text-sm rounded-DEFAULT hover:border-primary">Cập nhật từ điển ↗</Link>
                            <Link to="/script" className="border border-outline-variant text-on-surface-variant px-3 py-2 text-sm rounded-DEFAULT hover:border-primary">Cập nhật kịch bản ↗</Link>
                        </div>
                        <div>
                            <div className="font-label-caps text-label-caps text-on-surface-variant mb-2">Nhật ký "sự cố đã thấy" (nền cho lần sau)</div>
                            <div className="flex gap-2">
                                <input value={incident} onChange={(e) => setIncident(e.target.value)} placeholder="vd: 'Kaizen' bị nghe thành 'kaisen' lúc vinh danh…"
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
                            <input type="checkbox" checked={!!prep.debrief['done']} onChange={(e) => setPrepState(setDebrief('done', e.target.checked))} />
                            Đã họp rút kinh nghiệm & đưa thay đổi vào glossary/script cho sự kiện kế
                        </label>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PrepDesk;
