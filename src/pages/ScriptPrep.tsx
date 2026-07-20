import React, { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { toast } from '../lib/toast';
import { useLiveSession } from '../lib/LiveSessionContext';
import { useActiveEvent } from '../lib/ActiveEventContext';
import { pretranslate, ingestPdf } from '../lib/api';
import type { ScriptEntry } from '../lib/api';
import {
    getScriptLocal, writeScriptLocal, markPulledLocal, newScriptEntry, readiness, getSyncState, pushToBackend, pullFromBackend,
} from '../lib/script';
import { readImportFile, parseText } from '../lib/scriptImport';
import type { Delim } from '../lib/scriptImport';
import { upsertDoc, newSourceDoc } from '../lib/docs';

// Kịch bản & Bản dịch duyệt sẵn (Chuẩn bị · spec 1.3). LOCAL‑FIRST (lib/script.ts) so it works fully
// OFFLINE; the backend is only a SYNC channel (push data/script.json for the Cascade Matcher) plus
// PDF ingest + auto‑translate — all gated on backendOnline. Same design system as Đặt lịch / Bộ nhớ.

const LANGS: Record<string, string> = { vi: 'VI', ja: 'JA', en: 'EN', th: 'TH', ko: 'KO', zh: 'ZH' };
const DIRS: { v: string; l: string }[] = [
    { v: 'vi-ja', l: 'VI → JA (MC nói tiếng Việt)' }, { v: 'ja-vi', l: 'JA → VI (khách Nhật nói)' },
];
const DELIMS: { v: Delim; l: string }[] = [
    { v: 'auto', l: 'Tự nhận (khuyến nghị)' },
    { v: 'none', l: '1 cột — chỉ lời gốc' },
    { v: 'tab', l: '2 cột — ngăn bằng Tab' },
    { v: 'pipe', l: '2 cột — ngăn bằng |' },
    { v: 'arrow', l: '2 cột — ngăn bằng => hoặc ->' },
];
const INPUT = 'field-lux w-full bg-surface text-on-surface border border-outline-variant rounded-lg px-3 py-2 text-[15px] focus:border-secondary focus:outline-none transition-shadow';
const TA = 'field-lux w-full bg-surface text-on-surface border border-outline-variant rounded-lg py-2.5 px-3 text-base leading-relaxed resize-y focus:border-secondary focus:outline-none transition-shadow';
const LONG = 70;   // rough per‑line length past which a subtitle reads long (hint only, not a limit)

// Accent palette (used sparingly on the navy ground): gold = quality/approved, sky = progress/translated.
type Tone = 'gold' | 'sky';
const TONE: Record<Tone, { text: string; bar: string; soft: string }> = {
    gold: { text: 'text-secondary', bar: 'bg-secondary', soft: 'bg-secondary/15' },
    sky: { text: 'text-sky-400', bar: 'bg-sky-400', soft: 'bg-sky-400/15' },
};

// ── Circular progress ring — the readiness "illustration" ──
const Ring: React.FC<{ pct: number }> = ({ pct }) => {
    const r = 34, circ = 2 * Math.PI * r, off = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return (
        <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 80 80" className="w-24 h-24 -rotate-90">
                <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-surface-container" />
                <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" strokeLinecap="round"
                    className="stroke-secondary transition-all duration-700" strokeDasharray={circ} strokeDashoffset={off} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-secondary tabular-nums leading-none">{pct}%</span>
                <span className="text-[10px] font-label-caps text-on-surface-variant mt-1">sẵn sàng</span>
            </div>
        </div>
    );
};

// ── Colored section header with an icon tile ──
const SectionHead: React.FC<{ icon: string; title: string; sub?: string; tone?: Tone; children?: React.ReactNode }> = ({ icon, title, sub, tone = 'gold', children }) => (
    <div className="flex items-center gap-3 mb-4">
        <span className={`w-11 h-11 rounded-xl ${TONE[tone].soft} flex items-center justify-center shrink-0`}>
            <span className={`material-symbols-outlined ${TONE[tone].text}`} style={{ fontSize: '24px' }} aria-hidden="true">{icon}</span>
        </span>
        <div className="min-w-0 flex-1">
            <div className="font-semibold text-on-surface text-lg leading-tight">{title}</div>
            {sub && <div className="text-[13px] text-on-surface-variant mt-0.5">{sub}</div>}
        </div>
        {children}
    </div>
);

// ── Readiness meter ──
const Meter: React.FC<{ label: string; value: number; a: number; b: number; tone: Tone }> = ({ label, value, a, b, tone }) => (
    <div>
        <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-on-surface-variant">{label}</span>
            <span className="text-sm text-on-surface tabular-nums">{a}/{b} · <span className={`${TONE[tone].text} font-bold text-base`}>{value}%</span></span>
        </div>
        <div className="h-2.5 rounded-full bg-surface-container overflow-hidden">
            <div className={`h-full rounded-full ${TONE[tone].bar} transition-all duration-500`} style={{ width: `${value}%` }}></div>
        </div>
    </div>
);

// ── One script line ──
const LineCard: React.FC<{
    r: ScriptEntry; n: number; busy: boolean; canReorder: boolean; canTranslate: boolean;
    onEdit: (patch: Partial<ScriptEntry>) => void; onToggle: () => void; onSwap: () => void;
    onMove: (dir: -1 | 1) => void; onTranslate: () => void; onRemove: () => void;
}> = ({ r, n, busy, canReorder, canTranslate, onEdit, onToggle, onSwap, onMove, onTranslate, onRemove }) => {
    const approved = r.status === 'approved';
    const untranslated = !!r.src.trim() && !r.dst.trim();
    const field = (which: 'src' | 'dst') => {
        const lang = which === 'src' ? r.src_lang : r.dst_lang;
        const val = which === 'src' ? r.src : r.dst;
        const long = val.length > LONG;
        return (
            <div className="min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 font-label-caps text-label-caps text-on-surface-variant">
                        {which === 'src' ? 'Nguồn' : 'Bản dịch'}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${lang === 'ja' ? 'bg-secondary/15 text-secondary' : 'bg-sky-400/15 text-sky-400'}`}>{LANGS[lang] ?? lang}</span>
                    </span>
                    <span className={`text-[12px] tabular-nums ${long ? 'text-error' : 'text-on-surface-variant/50'}`}>{val.length}{long && ' · dài'}</span>
                </div>
                <textarea rows={2} value={val} onChange={(e) => onEdit({ [which]: e.target.value })}
                    placeholder={which === 'src' ? 'Câu người nói…' : 'Bản dịch duyệt tay…'}
                    className={`${TA} ${lang === 'ja' ? 'jp-text' : ''}`} />
            </div>
        );
    };
    return (
        <div className={`rounded-xl border p-3.5 card-lux ${approved ? 'border-l-4 border-secondary/70 bg-secondary/[0.06]' : untranslated ? 'border-l-4 border-amber-400/50 bg-surface-container' : 'border-outline-variant bg-surface-container'}`}>
            <div className="flex items-center gap-2 mb-2.5">
                <span className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant text-[12px] font-bold flex items-center justify-center shrink-0 tabular-nums">{n}</span>
                <button onClick={onToggle} title="Nháp ⇄ Đã duyệt"
                    className={`px-3 py-1.5 rounded-full font-label-caps text-label-caps transition-colors ${approved ? 'bg-secondary text-on-secondary' : untranslated ? 'border border-amber-400/50 text-amber-400 hover:border-amber-400' : 'border border-outline-variant text-on-surface-variant hover:border-secondary'}`}>
                    {approved ? '✓ Duyệt' : untranslated ? 'Chưa dịch' : 'Nháp'}
                </button>
                <div className="flex-1"></div>
                {canReorder && (
                    <>
                        <button onClick={() => onMove(-1)} title="Lên" className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-surface-container-high"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_upward</span></button>
                        <button onClick={() => onMove(1)} title="Xuống" className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-surface-container-high"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_downward</span></button>
                    </>
                )}
                <button onClick={onSwap} title="Đảo Nguồn ⇄ Bản dịch" className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-surface-container-high"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">swap_horiz</span></button>
                <button onClick={onTranslate} disabled={!canTranslate || busy || !r.src.trim()} title={canTranslate ? 'Dịch thử (bản nháp — duyệt tay)' : 'Cần backend để dịch thử'} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">{busy ? 'progress_activity' : 'translate'}</span></button>
                <button onClick={onRemove} title="Xoá dòng" className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span></button>
            </div>
            <div className="grid md:grid-cols-2 gap-2">{field('src')}{field('dst')}</div>
        </div>
    );
};

// ── Import drawer (dropzone + paste + preview) ──
const ImportDrawer: React.FC<{
    shown: boolean; eventId: string; srcLang: string; dstLang: string; backendOnline: boolean;
    onCommit: (entries: ScriptEntry[]) => void; onClose: () => void;
}> = ({ shown, eventId, srcLang, dstLang, backendOnline, onCommit, onClose }) => {
    const [text, setText] = useState('');
    const [md, setMd] = useState(false);
    const [delim, setDelim] = useState<Delim>('auto');
    const [fileName, setFileName] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [drag, setDrag] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    const parsed = useMemo(() => (text.trim() ? parseText(text, srcLang, dstLang, delim, md) : null), [text, srcLang, dstLang, delim, md]);

    const handleFile = async (file?: File | null) => {
        if (!file) return;
        setErr(null); setBusy(true); setFileName(file.name);
        try {
            const r = await readImportFile(file);
            let text = r.text;
            if (r.kind === 'pdf') {
                if (!backendOnline) throw new Error('Đọc PDF cần backend — bật kết nối, hoặc dùng .docx/.md/.txt.');
                text = (await ingestPdf(file)).text ?? '';
                setText(text); setMd(false);
                if (!text.trim()) setErr('Không trích được văn bản từ PDF.');
            } else {
                setText(text); setMd(r.md);
                if (!text.trim()) setErr('Không tìm thấy văn bản trong tệp.');
            }
            // Archive the imported file as a source document of this event (provenance).
            if (text.trim()) upsertDoc(eventId, newSourceDoc(file.name, r.kind, file.size, text, r.md));
        } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setText(''); }
        finally { setBusy(false); }
    };

    const commit = () => { if (parsed && parsed.entries.length) onCommit(parsed.entries); };
    const accept = `.md,.markdown,.txt,.csv,.srt,.docx,.docm,.dotx,.dotm${backendOnline ? ',.pdf' : ''}`;
    const delimLabel = parsed ? (parsed.delim === 'none' ? 'chỉ câu nguồn' : parsed.delim === 'tab' ? 'Tab' : parsed.delim === 'pipe' ? '|' : '=> / -> / ::') : '';

    return (
        <>
            <div className={`absolute inset-0 bg-background/50 backdrop-blur-[1px] z-30 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>
            <aside style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
                className={`absolute top-0 right-0 h-full w-full max-w-[560px] bg-surface-container-lowest border-l border-outline-variant z-40 flex flex-col shadow-2xl transition-transform duration-300 will-change-transform ${shown ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="shrink-0 flex items-center gap-3 px-5 h-16 border-b border-outline-variant">
                    <span className="w-10 h-10 rounded-xl bg-sky-400/15 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-sky-400" aria-hidden="true">upload_file</span></span>
                    <span className="font-semibold text-on-surface text-xl flex-1">Nhập kịch bản</span>
                    <button onClick={onClose} title="Đóng" className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <input ref={fileInput} type="file" accept={accept} className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                    <div onClick={() => fileInput.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]); }}
                        className={`cursor-pointer rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors ${drag ? 'border-sky-400 bg-sky-400/10' : 'border-outline-variant hover:border-sky-400/60 hover:bg-sky-400/[0.04]'}`}>
                        <span className={`inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-3 ${drag ? 'bg-sky-400/20' : 'bg-sky-400/10'}`}>
                            <span className={`material-symbols-outlined text-sky-400 ${busy ? 'animate-spin' : ''}`} style={{ fontSize: '34px' }} aria-hidden="true">{busy ? 'progress_activity' : 'cloud_upload'}</span>
                        </span>
                        <p className="text-base text-on-surface font-medium">{busy ? 'Đang đọc…' : fileName || 'Kéo‑thả tệp vào đây'}</p>
                        <p className="text-sm text-on-surface-variant mt-1">hoặc <span className="text-sky-400">bấm để chọn</span> · .md · .txt · .docx{backendOnline ? ' · .pdf' : ' (PDF cần backend)'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-px flex-1 bg-outline-variant"></span>
                        <span className="font-label-caps text-label-caps text-on-surface-variant/60">hoặc dán</span>
                        <span className="h-px flex-1 bg-outline-variant"></span>
                    </div>
                    <textarea value={text} onChange={(e) => { setText(e.target.value); setMd(false); setFileName(''); }} rows={4}
                        placeholder={'Dán kịch bản, mỗi dòng một câu.\nNếu có sẵn bản dịch: đặt cùng dòng, ngăn bằng | (vd: Kính chào quý vị | ご来賓の皆様)'} className={`${TA} font-normal`} />
                    {err && <div className="border border-error text-error text-[13px] px-3 py-2 rounded-lg flex items-center gap-2"><span className="material-symbols-outlined text-base" aria-hidden="true">error</span>{err}</div>}
                    {/* Bilingual splitting — explained in plain language */}
                    <div className="rounded-xl border border-outline-variant bg-surface-container/40 p-3.5 space-y-2.5">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px] text-sky-400 shrink-0" aria-hidden="true">view_column</span>
                            <label className="text-[15px] text-on-surface font-medium flex-1">Mỗi dòng tài liệu có gì?</label>
                            <select value={delim} onChange={(e) => setDelim(e.target.value as Delim)} className={`${INPUT} w-auto`}>
                                {DELIMS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
                            </select>
                        </div>
                        <p className="text-[13px] text-on-surface-variant/90 leading-relaxed">
                            Tài liệu <span className="text-on-surface font-medium">đã có sẵn bản dịch</span> bên cạnh lời gốc (ngăn bằng Tab, dấu <span className="text-on-surface">|</span> hoặc <span className="text-on-surface">=&gt;</span>) → máy tự tách thành 2 cột <span className="text-sky-400 font-medium">Nguồn</span> · <span className="text-secondary font-medium">Bản dịch</span>. Nếu <span className="text-on-surface font-medium">chỉ có lời gốc</span> → mỗi dòng thành một câu để dịch &amp; duyệt sau.
                        </p>
                        <div className="flex items-center gap-2 text-[12px] text-on-surface-variant/70 bg-surface-container-lowest rounded-lg px-2.5 py-1.5">
                            <span className="font-label-caps text-[10px] shrink-0">VÍ DỤ 2 CỘT</span>
                            <span className="text-on-surface truncate">Kính chào quý vị</span>
                            <span className="text-sky-400 shrink-0">|</span>
                            <span className="text-on-surface jp-text truncate">ご来賓の皆様</span>
                        </div>
                    </div>
                    {parsed && (
                        <div className="border border-outline-variant rounded-xl overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-container-lowest text-[13px] text-on-surface border-b border-outline-variant">
                                <span className="material-symbols-outlined text-[18px] text-secondary" aria-hidden="true">preview</span>
                                {parsed.delim === 'none'
                                    ? <span>Xem trước — <span className="text-secondary font-medium">{parsed.total} câu</span>, mỗi dòng là lời gốc (chưa có bản dịch)</span>
                                    : <span>Đã tách <span className="text-sky-400 font-medium">2 cột</span> (ngăn bằng {delimLabel}) — <span className="text-secondary font-medium">{parsed.paired}/{parsed.total}</span> dòng có bản dịch</span>}
                            </div>
                            {parsed.delim !== 'none' && (
                                <div className="grid grid-cols-2 gap-2 px-3 py-1.5 bg-surface-container-lowest/60 border-b border-outline-variant/50 font-label-caps text-[10px]">
                                    <span className="text-sky-400">Nguồn</span><span className="text-secondary">Bản dịch</span>
                                </div>
                            )}
                            <div className="max-h-60 overflow-y-auto divide-y divide-outline-variant/50">
                                {parsed.entries.slice(0, 30).map((e, i) => (
                                    <div key={i} className="grid grid-cols-2 gap-2 px-3 py-1.5 text-[13px]">
                                        <span className={`text-on-surface truncate ${e.src_lang === 'ja' ? 'jp-text' : ''}`}>{e.src || '—'}</span>
                                        <span className={`text-on-surface-variant truncate ${e.dst_lang === 'ja' ? 'jp-text' : ''}`}>{e.dst || '—'}</span>
                                    </div>
                                ))}
                                {parsed.entries.length > 30 && <div className="px-3 py-1.5 text-[12px] text-on-surface-variant/60">… và {parsed.entries.length - 30} dòng nữa</div>}
                            </div>
                        </div>
                    )}
                </div>
                <div className="shrink-0 flex items-center justify-end gap-2 px-5 h-16 border-t border-outline-variant">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-sm">Huỷ</button>
                    <button onClick={commit} disabled={!parsed || !parsed.entries.length} className="flex items-center gap-1.5 bg-secondary text-on-secondary px-5 py-2 rounded-lg font-label-caps text-label-caps hover:opacity-80 disabled:opacity-40"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Thêm {parsed?.entries.length ?? 0} dòng</button>
                </div>
            </aside>
        </>
    );
};

// The editor is keyed by eventId in the outer component, so switching events remounts it with a
// fresh state for that event's script — the unmounting instance flushes its rows to its own event.
const ScriptEditor: React.FC<{ eventId: string; onActivated: () => void }> = ({ eventId, onActivated }) => {
    const session = useLiveSession();
    const [rows, setRows] = useState<ScriptEntry[]>(() => getScriptLocal(eventId));
    const [dir, setDir] = useState('vi-ja');
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'untranslated' | 'draft' | 'approved'>('all');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [bulk, setBulk] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [beDirty, setBeDirty] = useState(() => getSyncState(eventId).dirty);
    const [importOpen, setImportOpen] = useState(false);
    const [importShown, setImportShown] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mounted = useRef(false);
    const rowsRef = useRef(rows); rowsRef.current = rows;

    const [srcLang, dstLang] = dir === 'vi-ja' ? ['vi', 'ja'] : ['ja', 'vi'];

    // Autosave to localStorage (debounced) — skip the first run (already persisted) so we don't
    // spuriously mark the script "chưa đồng bộ" on mount.
    useEffect(() => {
        if (!mounted.current) { mounted.current = true; return; }
        const t = setTimeout(() => writeScriptLocal(eventId, rowsRef.current), 400);
        return () => clearTimeout(t);
    }, [rows, eventId]);
    // Flush the last edits if the tab is hidden/closed within the debounce window.
    useEffect(() => {
        const flush = () => writeScriptLocal(eventId, rowsRef.current);
        const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
        window.addEventListener('pagehide', flush);
        document.addEventListener('visibilitychange', onHide);
        return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onHide); flush(); };
    }, [eventId]);
    useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

    const mutate = (updater: (prev: ScriptEntry[]) => ScriptEntry[]) => { setRows(updater); setBeDirty(true); };
    const updateRow = (id: string, patch: Partial<ScriptEntry>) => mutate((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const removeRow = (id: string) => mutate((prev) => prev.filter((r) => r.id !== id));
    const addRow = () => mutate((prev) => [...prev, newScriptEntry(srcLang, dstLang)]);
    const swapRow = (id: string) => mutate((prev) => prev.map((r) => (r.id === id ? { ...r, src_lang: r.dst_lang, src: r.dst, dst_lang: r.src_lang, dst: r.src } : r)));
    const moveRow = (id: string, d: -1 | 1) => mutate((prev) => {
        const i = prev.findIndex((r) => r.id === id); const j = i + d;
        if (i < 0 || j < 0 || j >= prev.length) return prev;
        const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next;
    });
    const toggleApprove = (r: ScriptEntry) => {
        if (r.status !== 'approved' && !r.dst.trim()) { toast.error('Cần bản dịch trước khi duyệt'); return; }
        updateRow(r.id, { status: r.status === 'approved' ? 'draft' : 'approved' });
    };
    const approveAllTranslated = () => {
        const n = rows.filter((r) => r.status !== 'approved' && r.src.trim() && r.dst.trim()).length;
        if (!n) { toast.error('Không có dòng đã dịch nào để duyệt'); return; }
        mutate((prev) => prev.map((r) => (r.src.trim() && r.dst.trim() ? { ...r, status: 'approved' } : r)));
        toast.success(`Đã duyệt ${n} dòng`);
    };
    const commitImport = (entries: ScriptEntry[]) => {
        mutate((prev) => [...prev, ...entries]);
        toast.success(`Đã thêm ${entries.length} dòng`);
        closeImport();
    };

    const openImport = () => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
        setImportOpen(true); setImportShown(false);
        setTimeout(() => setImportShown(true), 20);
    };
    const closeImport = () => {
        setImportShown(false);
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setImportOpen(false), 300);
    };

    const translateOne = async (r: ScriptEntry) => {
        if (!session.backendOnline || !r.src.trim()) return;
        setBusyId(r.id);
        try { updateRow(r.id, { dst: await pretranslate(r.src, r.src_lang, r.dst_lang) }); }
        catch (e) { toast.error('Dịch thử lỗi: ' + (e instanceof Error ? e.message : String(e))); }
        finally { setBusyId(null); }
    };
    const translateEmpty = async () => {
        if (!session.backendOnline) return;
        const todo = rows.filter((r) => r.src.trim() && !r.dst.trim());
        if (!todo.length) { toast.error('Không có dòng trống để dịch'); return; }
        setBulk(true);
        let done = 0;
        for (const r of todo) {
            setBusyId(r.id);
            try { updateRow(r.id, { dst: await pretranslate(r.src, r.src_lang, r.dst_lang) }); done++; }
            catch (e) { toast.error(`Dừng ở ${done + 1}/${todo.length}: ${e instanceof Error ? e.message : String(e)}`); break; }
        }
        setBusyId(null); setBulk(false);
        if (done) toast.success(`Đã dịch thử ${done} dòng — DUYỆT tay trước khi khoá`);
    };

    const syncBackend = async () => {
        if (!session.backendOnline) { toast.error('Cần backend để đồng bộ cho matcher'); return; }
        setSyncing(true);
        const snap = rows;
        try { const n = await pushToBackend(eventId, snap); setBeDirty(rowsRef.current !== snap); onActivated(); toast.success(`Đã đồng bộ ${n} dòng — sự kiện này đang chạy cho matcher`); }
        catch (e) { toast.error('Đồng bộ lỗi: ' + (e instanceof Error ? e.message : String(e))); }
        finally { setSyncing(false); }
    };
    const pullBackend = async () => {
        if (!session.backendOnline) { toast.error('Cần backend để tải về'); return; }
        if (rows.length > 0 && !window.confirm('Tải kịch bản từ backend sẽ THAY THẾ bản đang có tại máy. Tiếp tục?')) return;
        setSyncing(true);
        try {
            const be = await pullFromBackend();
            markPulledLocal(eventId, be);   // persist + mark synced BEFORE setRows so the trailing autosave is a no‑op
            setRows(be); setBeDirty(false);
            toast.success(`Đã tải ${be.length} dòng từ backend`);
        } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
        finally { setSyncing(false); }
    };

    const rd = useMemo(() => readiness(rows), [rows]);
    const canReorder = filter === 'all' && !query.trim();
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rows.filter((r) => {
            const okF = filter === 'all' ? true : filter === 'untranslated' ? (!!r.src.trim() && !r.dst.trim()) : r.status === filter;
            if (!okF) return false;
            if (q && !`${r.src} ${r.dst} ${r.note ?? ''}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [rows, query, filter]);
    const indexOf = useMemo(() => { const m = new Map<string, number>(); rows.forEach((r, i) => m.set(r.id, i)); return m; }, [rows]);

    const FILTERS: { v: typeof filter; l: string }[] = [
        { v: 'all', l: 'Tất cả' }, { v: 'untranslated', l: 'Chưa dịch' }, { v: 'draft', l: 'Nháp' }, { v: 'approved', l: 'Đã duyệt' },
    ];

    return (
        <div className="h-full flex flex-col text-on-background overflow-hidden relative">
            <PageHeader icon="description" title="Kịch bản & Bản dịch duyệt sẵn" subtitle="Lưu tại máy · đồng bộ backend cho matcher">
                <span className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-caps text-label-caps ${beDirty ? 'text-secondary border border-secondary/40' : 'text-on-surface-variant border border-outline-variant'}`}>
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{beDirty ? 'cloud_off' : 'cloud_done'}</span>{beDirty ? 'Chưa đồng bộ' : 'Đã đồng bộ'}
                </span>
                <button onClick={syncBackend} disabled={syncing || !session.backendOnline}
                    title={session.backendOnline ? 'Đẩy kịch bản lên backend cho matcher (data/script.json)' : 'Cần backend để đồng bộ'}
                    className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant px-3 py-2 rounded-full font-label-caps text-label-caps hover:border-secondary hover:text-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-outline-variant disabled:hover:text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{syncing ? 'progress_activity' : 'sync'}</span>Đồng bộ BE
                </button>
                <button onClick={openImport} className="btn-lux flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>Nhập tệp</button>
            </PageHeader>

            <div className="flex-1 overflow-y-auto">
                <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
                    {/* Readiness / % tiếp thu — hero */}
                    <div className="relative overflow-hidden glass-high hero-lux rounded-2xl p-5 md:p-6">
                        <div className="relative flex flex-col sm:flex-row items-center gap-5">
                            <Ring pct={rd.approvedPct} />
                            <div className="flex-1 min-w-0 w-full">
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div>
                                        <div className="font-bold text-on-surface text-xl leading-tight">Độ sẵn sàng kịch bản</div>
                                        <div className="text-sm text-on-surface-variant mt-1">{rd.total} dòng · {rd.withSrc} có nội dung</div>
                                    </div>
                                    {session.backendOnline && (
                                        <button onClick={pullBackend} disabled={syncing} className="shrink-0 flex items-center gap-1 text-[13px] text-on-surface-variant hover:text-secondary transition-colors disabled:opacity-40"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span>Tải về</button>
                                    )}
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <Meter label="Đã dịch" value={rd.translatedPct} a={rd.translated} b={rd.withSrc} tone="sky" />
                                    <Meter label="Đã duyệt (tái dùng nguyên văn)" value={rd.approvedPct} a={rd.approved} b={rd.withSrc} tone="gold" />
                                </div>
                            </div>
                        </div>
                        <p className="relative text-[13px] text-on-surface-variant/80 mt-4 leading-relaxed flex items-start gap-2">
                            <span className="material-symbols-outlined text-secondary text-[18px] shrink-0" aria-hidden="true">verified</span>
                            <span>Dòng <span className="text-secondary font-medium">ĐÃ DUYỆT</span> được matcher tái dùng nguyên văn khi khớp cao — luôn <span className="text-on-surface">duyệt tay</span>. Coverage sâu (so transcript diễn tập) là của backend.</span>
                        </p>
                    </div>

                    {/* Toolbar */}
                    {rows.length > 0 && (
                        <div className="pt-2">
                            <SectionHead icon="subtitles" title="Các dòng kịch bản" sub={`${rd.total} dòng · ${rd.approved} đã duyệt · ${rd.withSrc - rd.translated} chưa dịch`} />
                        </div>
                    )}
                    {rows.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <select value={dir} onChange={(e) => setDir(e.target.value)} className={`${INPUT} w-auto`}>
                                {DIRS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
                            </select>
                            <button onClick={addRow} className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant px-3 py-2 rounded-full text-sm hover:border-secondary hover:text-secondary transition-colors"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Thêm dòng</button>
                            <button onClick={translateEmpty} disabled={bulk || !session.backendOnline || !rows.some((r) => r.src.trim() && !r.dst.trim())} title={session.backendOnline ? 'Dịch tự động các dòng chưa có bản dịch' : 'Cần backend để dịch tự động'} className="flex items-center gap-1.5 border border-primary/60 text-primary px-3 py-2 rounded-full text-sm hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">{bulk ? 'progress_activity' : 'translate'}</span>Dịch dòng trống</button>
                            <button onClick={approveAllTranslated} className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant px-3 py-2 rounded-full text-sm hover:border-secondary hover:text-secondary transition-colors"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">done_all</span>Duyệt hết đã dịch</button>
                            <div className="flex-1"></div>
                            <div className="relative">
                                <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true">search</span>
                                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm câu…" className={`${INPUT} pl-9 w-44`} />
                            </div>
                        </div>
                    )}
                    {rows.length > 0 && (
                        <div className="flex items-center gap-1">
                            {FILTERS.map((f) => (
                                <button key={f.v} onClick={() => setFilter(f.v)} className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${filter === f.v ? 'bg-secondary/15 text-secondary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}>{f.l}</button>
                            ))}
                        </div>
                    )}

                    {/* List */}
                    {rows.length === 0 ? (
                        <EmptyState icon="description" title="Chưa có dòng kịch bản"
                            hint="Nhập tệp .docx/.md/.txt hoặc dán kịch bản song ngữ. Dòng đã duyệt sẽ được tái dùng nguyên văn khi lễ diễn ra.">
                            <button onClick={openImport} className="btn-lux flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>Nhập tệp</button>
                            <button onClick={addRow} className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant px-4 py-2 rounded-full font-label-caps text-label-caps hover:border-secondary hover:text-secondary transition-colors"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Thêm dòng</button>
                        </EmptyState>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-on-surface-variant text-center py-10">Không có dòng nào khớp bộ lọc.</p>
                    ) : (
                        <div className="space-y-2.5">
                            {filtered.map((r) => (
                                <LineCard key={r.id} r={r} n={(indexOf.get(r.id) ?? 0) + 1} busy={busyId === r.id}
                                    canReorder={canReorder} canTranslate={session.backendOnline}
                                    onEdit={(patch) => updateRow(r.id, patch)} onToggle={() => toggleApprove(r)} onSwap={() => swapRow(r.id)}
                                    onMove={(d) => moveRow(r.id, d)} onTranslate={() => translateOne(r)} onRemove={() => removeRow(r.id)} />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {importOpen && (
                <ImportDrawer shown={importShown} eventId={eventId} srcLang={srcLang} dstLang={dstLang} backendOnline={session.backendOnline}
                    onCommit={commitImport} onClose={closeImport} />
            )}
        </div>
    );
};

// The script is scoped to the selected Sự kiện. Keying the editor by eventId gives each event its
// own fresh editor state, and the unmounting instance flushes its rows to its own event's key.
const ScriptPrep: React.FC = () => {
    const { eventId, activate } = useActiveEvent();
    return <ScriptEditor key={eventId} eventId={eventId} onActivated={() => activate(eventId)} />;
};

export default ScriptPrep;
