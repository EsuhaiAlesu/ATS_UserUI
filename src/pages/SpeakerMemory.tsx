import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { toast } from '../lib/toast';
import { useLiveSession } from '../lib/LiveSessionContext';
import { getTtsVoices, getGlossary, saveGlossary } from '../lib/api';
import type { TtsVoice } from '../lib/api';
import type { VoicePick } from '../lib/ttsPrefs';
import {
    getSpeakers, upsertSpeaker, removeSpeaker, newSpeakerProfile, mergeIntoGlossary,
} from '../lib/speakers';
import type { SpeakerProfile, Gender } from '../lib/speakers';

// Bộ nhớ người nói (Chuẩn bị · spec 1.7) — a reusable library of speaker profiles (name · reading ·
// role/org · assigned TTS voice · ASR‑misheard aliases). Offline (localStorage via lib/speakers);
// only the voice catalog and the "sync to glossary" bridge need the backend. Same design system as
// Đặt lịch: navy + gold, card list + Raycast‑style slide‑over drawer.

const LANGS: { v: string; l: string }[] = [
    { v: '', l: '— ngôn ngữ —' }, { v: 'vi', l: 'Tiếng Việt' }, { v: 'ja', l: '日本語' },
    { v: 'en', l: 'English' }, { v: 'th', l: 'ไทย' }, { v: 'ko', l: '한국어' }, { v: 'zh', l: '中文' },
];
const GENDERS: { v: Gender; l: string }[] = [{ v: '', l: '— giới tính —' }, { v: 'male', l: 'Nam' }, { v: 'female', l: 'Nữ' }];
const ENGINES = ['voicevox', 'vieneu', 'gpt-sovits'];
const INPUT = 'w-full bg-surface text-on-surface border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-secondary focus:outline-none';
const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
const genderLabel = (g?: Gender) => (g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : '');
const voiceLabel = (v?: VoicePick) => (v ? (v.label || String(v.id)) : '');

// ── One speaker profile card ──
const SpeakerCard: React.FC<{ p: SpeakerProfile; onEdit: () => void; onDelete: () => void }> = ({ p, onEdit, onDelete }) => (
    <div className="group bg-surface-container bg-gradient-to-b from-surface-container to-surface border-2 border-outline-variant rounded-2xl p-4 flex gap-4 transition-all duration-200 ease-out hover:border-outline hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        <div className="shrink-0 w-12 h-12 rounded-full bg-secondary/15 text-secondary text-base font-bold flex items-center justify-center">{initials(p.name)}</div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-on-surface text-base truncate">{p.name || '(chưa tên)'}</h3>
                {p.reading && <span className="jp-text text-[13px] text-on-surface-variant">{p.reading}</span>}
                {p.lang && <span className="shrink-0 uppercase font-label-caps text-[9px] tracking-[0.1em] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">{p.lang}</span>}
                {p.gender && <span className="shrink-0 font-label-caps text-[9px] tracking-[0.1em] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">{genderLabel(p.gender)}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[13px] text-on-surface-variant">
                {(p.role || p.org) && <span className="inline-flex items-center gap-1 min-w-0"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">badge</span><span className="truncate">{[p.role, p.org].filter(Boolean).join(' · ')}</span></span>}
                <span className={`inline-flex items-center gap-1 ${p.voice ? 'text-secondary' : ''}`}><span className="material-symbols-outlined text-[16px]" aria-hidden="true">graphic_eq</span>{p.voice ? voiceLabel(p.voice) : 'chưa gán giọng'}</span>
                {p.aliases.length > 0 && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">spellcheck</span>{p.aliases.length} biến thể</span>}
            </div>
        </div>
        <div className="shrink-0 flex flex-col gap-1.5">
            <button onClick={onEdit} title="Sửa hồ sơ" className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">edit</span></button>
            <button onClick={onDelete} title="Xóa hồ sơ" className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">delete</span></button>
        </div>
    </div>
);

// ── Alias chip‑input (ASR‑misheard variants) ──
// Exposes flush() so save() can capture text still in the buffer — onBlur alone is unreliable
// (macOS Safari/Firefox don't blur the input when a <button> is clicked, so typed text would be lost).
export type AliasHandle = { flush: () => string[] };
const parseAliases = (text: string) => text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
const AliasInput = forwardRef<AliasHandle, { aliases: string[]; onChange: (next: string[]) => void }>(({ aliases, onChange }, ref) => {
    const [text, setText] = useState('');
    const commit = () => {
        const parts = parseAliases(text);
        if (parts.length) onChange([...aliases, ...parts]);
        setText('');
    };
    useImperativeHandle(ref, () => ({ flush: () => { const parts = parseAliases(text); setText(''); return parts; } }), [text]);
    return (
        <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
                {aliases.length === 0 && <span className="text-[13px] text-on-surface-variant/60 italic">Chưa có biến thể nghe‑nhầm</span>}
                {aliases.map((a, i) => (
                    <span key={`${a}-${i}`} className="inline-flex items-center gap-1 bg-surface-container-high border border-outline-variant rounded-full pl-2.5 pr-1 py-0.5 text-[13px] text-on-surface">
                        {a}
                        <button type="button" onClick={() => onChange(aliases.filter((_, j) => j !== i))} title="Xóa" className="w-4 h-4 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error"><span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span></button>
                    </span>
                ))}
            </div>
            <input value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); } }}
                onBlur={commit} placeholder="Gõ biến thể rồi Enter (vd: Sơn, Shon, ソン)" className={INPUT} />
        </div>
    );
});
AliasInput.displayName = 'AliasInput';

// ── Compact voice picker. NEVER auto‑clears an assigned voice (esp. offline): the voice <select> is
// an action menu that only ADDS a pick; clearing is the explicit "Bỏ giọng" button. ──
const VoicePicker: React.FC<{ value?: VoicePick; backendOnline: boolean; onPick: (v: VoicePick) => void; onClear: () => void }> = ({ value, backendOnline, onPick, onClear }) => {
    const [engine, setEngine] = useState(value?.engine ?? 'voicevox');
    const [voices, setVoices] = useState<TtsVoice[]>([]);
    const [paramKey, setParamKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [hint, setHint] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true); setErr(null); setHint(null);
        getTtsVoices(engine)
            .then((r) => {
                if (cancelled) return;
                if (r.error || r.msg) setErr(r.error ?? r.msg ?? null);
                setVoices(r.voices ?? []); setParamKey(r.key ?? ''); setHint(r.hint ?? null);
            })
            .catch((e) => { if (!cancelled) { setErr(String(e)); setVoices([]); setParamKey(''); setHint(null); } })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [engine]);

    const pick = (id: string) => {
        if (!id || !paramKey) return;
        onPick({ engine, key: paramKey, id, label: voices.find((v) => String(v.id) === id)?.label });
    };

    return (
        <div className="space-y-2.5">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0" aria-hidden="true">graphic_eq</span>
                {value
                    ? <span className="flex-1 min-w-0 text-sm truncate">Đã gán: <span className="text-secondary">{voiceLabel(value)}</span> <span className="text-on-surface-variant">· {value.engine}</span></span>
                    : <span className="flex-1 text-sm text-on-surface-variant/70 italic">Chưa gán giọng</span>}
                {value && <button type="button" onClick={onClear} className="text-[12px] text-on-surface-variant hover:text-error shrink-0">Bỏ giọng</button>}
            </div>
            <div className="grid grid-cols-2 gap-2">
                <select value={engine} onChange={(e) => setEngine(e.target.value)} className={`${INPUT} cursor-pointer`}>
                    {ENGINES.map((en) => <option key={en} value={en}>{en}</option>)}
                </select>
                <select value="" onChange={(e) => pick(e.target.value)} disabled={loading || voices.length === 0} className={`${INPUT} cursor-pointer disabled:opacity-50`}>
                    <option value="">{loading ? 'Đang tải…' : voices.length === 0 ? (backendOnline ? '— engine này chưa có giọng —' : '— backend offline —') : '— chọn giọng —'}</option>
                    {voices.map((v) => <option key={String(v.id)} value={String(v.id)}>{v.label}{v.jp ? ` · ${v.jp}` : ''}</option>)}
                </select>
            </div>
            {!backendOnline
                ? <p className="text-[12px] text-on-surface-variant/70">Backend offline — giữ nguyên giọng đã gán; kết nối để chọn giọng mới.</p>
                : err ? <p className="text-[12px] text-error">{err}</p>
                    : hint ? <p className="text-[12px] text-on-surface-variant/70">{hint}</p> : null}
        </div>
    );
};

// ── Create / edit drawer ──
const FormDrawer: React.FC<{
    p: SpeakerProfile; shown: boolean; isNew: boolean; backendOnline: boolean; aliasRef: React.Ref<AliasHandle>;
    onChange: (patch: Partial<SpeakerProfile>) => void;
    onSave: () => void; onClose: () => void;
}> = ({ p, shown, isNew, backendOnline, aliasRef, onChange, onSave, onClose }) => (
    <>
        <div className={`absolute inset-0 bg-background/50 backdrop-blur-[1px] z-30 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>
        <aside style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
            className={`absolute top-0 right-0 h-full w-full max-w-[520px] bg-surface-container-lowest border-l border-outline-variant z-40 flex flex-col shadow-2xl transition-transform duration-300 will-change-transform ${shown ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="shrink-0 flex items-center gap-3 px-5 h-16 border-b border-outline-variant">
                <span className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-secondary" aria-hidden="true">psychology</span></span>
                <span className="font-semibold text-on-surface text-lg flex-1">{isNew ? 'Người nói mới' : 'Sửa hồ sơ người nói'}</span>
                <button onClick={onClose} title="Đóng" className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <section className="space-y-3">
                    <h4 className="uppercase font-label-caps text-label-caps text-on-surface-variant">Danh tính</h4>
                    <div>
                        <label className="text-[13px] text-on-surface-variant block mb-1">Tên chuẩn *</label>
                        <input value={p.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="vd: Lê Long Sơn" className={INPUT} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[13px] text-on-surface-variant block mb-1">Cách đọc (kana/phiên âm)</label><input value={p.reading ?? ''} onChange={(e) => onChange({ reading: e.target.value })} placeholder="vd: ソン" className={`${INPUT} jp-text`} /></div>
                        <div><label className="text-[13px] text-on-surface-variant block mb-1">Chức danh</label><input value={p.role ?? ''} onChange={(e) => onChange({ role: e.target.value })} placeholder="vd: Tổng Giám Đốc" className={INPUT} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1"><label className="text-[13px] text-on-surface-variant block mb-1">Đơn vị</label><input value={p.org ?? ''} onChange={(e) => onChange({ org: e.target.value })} placeholder="vd: Esuhai" className={INPUT} /></div>
                        <div><label className="text-[13px] text-on-surface-variant block mb-1">Ngôn ngữ</label><select value={p.lang ?? ''} onChange={(e) => onChange({ lang: e.target.value })} className={`${INPUT} cursor-pointer`}>{LANGS.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}</select></div>
                        <div><label className="text-[13px] text-on-surface-variant block mb-1">Giới tính</label><select value={p.gender ?? ''} onChange={(e) => onChange({ gender: e.target.value as Gender })} className={`${INPUT} cursor-pointer`}>{GENDERS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}</select></div>
                    </div>
                </section>
                <section className="space-y-2">
                    <h4 className="uppercase font-label-caps text-label-caps text-on-surface-variant">Sửa tên (ASR)</h4>
                    <AliasInput ref={aliasRef} aliases={p.aliases} onChange={(aliases) => onChange({ aliases })} />
                    <p className="text-[12px] text-on-surface-variant/70 leading-relaxed">Các biến thể máy hay nghe‑nhầm → tự sửa về tên chuẩn. Bấm <span className="text-on-surface">Đồng bộ Từ điển</span> để nạp vào bộ nhận dạng (hiệu lực phiên kế). Đồng bộ chỉ <span className="text-on-surface">thêm/gộp</span>; xoá biến thể ở đây không tự gỡ khỏi Từ điển.</p>
                </section>
                <section className="space-y-2">
                    <h4 className="uppercase font-label-caps text-label-caps text-on-surface-variant">Giọng gán (TTS)</h4>
                    <VoicePicker value={p.voice} backendOnline={backendOnline} onPick={(voice) => onChange({ voice })} onClear={() => onChange({ voice: undefined })} />
                    <p className="text-[12px] text-on-surface-variant/70 leading-relaxed">Giọng đọc <span className="text-on-surface">bản dịch</span> của người này. Đổi‑nóng khi đang chạy cần backend; nếu không sẽ áp ở lần Bắt đầu.</p>
                </section>
                <section className="space-y-2">
                    <h4 className="uppercase font-label-caps text-label-caps text-on-surface-variant">Ghi chú</h4>
                    <textarea value={p.note ?? ''} onChange={(e) => onChange({ note: e.target.value })} rows={2} placeholder="vd: xưng hô 'Sơn‑san'…" className={`${INPUT} resize-none`} />
                </section>
            </div>
            <div className="shrink-0 flex items-center justify-end gap-2 px-5 h-16 border-t border-outline-variant">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-sm">Hủy</button>
                <button onClick={onSave} className="flex items-center gap-1.5 bg-secondary text-on-secondary px-5 py-2 rounded-lg font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>Lưu hồ sơ</button>
            </div>
        </aside>
    </>
);

const SpeakerMemory: React.FC = () => {
    const session = useLiveSession();
    const [list, setList] = useState<SpeakerProfile[]>(() => getSpeakers());
    const [editing, setEditing] = useState<SpeakerProfile | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [shown, setShown] = useState(false);
    const [query, setQuery] = useState('');
    const [syncing, setSyncing] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const aliasRef = useRef<AliasHandle>(null);

    const openDrawer = (p: SpeakerProfile, fresh: boolean) => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
        setEditing(p); setIsNew(fresh); setShown(false);
        setTimeout(() => setShown(true), 20);
    };
    const closeDrawer = () => {
        setShown(false);
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setEditing(null), 300);
    };
    useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

    const openNew = () => openDrawer(newSpeakerProfile(), true);
    const openEdit = (p: SpeakerProfile) => openDrawer({ ...p, aliases: [...p.aliases] }, false);
    const change = (patch: Partial<SpeakerProfile>) => setEditing((e) => (e ? { ...e, ...patch } : e));

    const save = () => {
        if (!editing) return;
        const pending = aliasRef.current?.flush() ?? [];   // capture alias text still in the buffer (unblurred)
        const merged = pending.length ? { ...editing, aliases: [...editing.aliases, ...pending] } : editing;
        if (!merged.name.trim()) { toast.error('Cần tên người nói'); return; }
        setList(upsertSpeaker(merged));
        toast.success(isNew ? 'Đã thêm người nói' : 'Đã lưu hồ sơ');
        closeDrawer();
    };
    const del = (p: SpeakerProfile) => {
        if (window.confirm(`Xóa hồ sơ "${p.name || '(chưa tên)'}"? Không thể hoàn tác.`)) {
            setList(removeSpeaker(p.id));
            toast.success('Đã xóa hồ sơ');
        }
    };

    // Push protected names + misheard rules into the shared glossary (name‑fix). Backend‑gated + manual.
    const syncGlossary = async () => {
        if (!session.backendOnline) { toast.error('Cần backend để ghi Từ điển'); return; }
        const named = list.filter((p) => p.name.trim());
        if (named.length === 0) { toast.error('Chưa có hồ sơ nào có tên'); return; }
        setSyncing(true);
        try {
            const existing = await getGlossary();
            const { next, added, updated } = mergeIntoGlossary(existing, named);
            await saveGlossary(next);
            toast.success(`Đã đồng bộ Từ điển: +${added} mới · ${updated} cập nhật`);
        } catch (e) {
            toast.error('Đồng bộ Từ điển lỗi: ' + (e as Error).message);
        } finally {
            setSyncing(false);
        }
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return list;
        return list.filter((p) => [p.name, p.reading, p.role, p.org, ...p.aliases].filter(Boolean).join(' ').toLowerCase().includes(q));
    }, [list, query]);

    return (
        <div className="h-full flex flex-col bg-background text-on-background overflow-hidden relative">
            <PageHeader icon="psychology" title="Bộ nhớ người nói" subtitle="Thư viện hồ sơ · tên · giọng · sửa tên (lưu tại máy)">
                <button onClick={syncGlossary} disabled={syncing || !session.backendOnline}
                    title={session.backendOnline ? 'Nạp tên + luật nghe‑nhầm vào Từ điển (hiệu lực phiên kế)' : 'Cần backend để ghi Từ điển'}
                    className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant px-3 py-2 rounded-full font-label-caps text-label-caps hover:border-secondary hover:text-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-outline-variant disabled:hover:text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{syncing ? 'progress_activity' : 'sync'}</span>Đồng bộ Từ điển
                </button>
                <button onClick={openNew} className="flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Thêm người nói</button>
            </PageHeader>
            <div className="flex-1 overflow-y-auto">
                <main className="max-w-[1000px] mx-auto px-6 md:px-10 py-8">
                    {list.length === 0 ? (
                        <EmptyState icon="psychology" title="Chưa có hồ sơ người nói"
                            hint="Tạo thư viện dùng lại giữa các hội nghị: tên chuẩn, cách đọc, biến thể nghe‑nhầm, và giọng đọc gán sẵn.">
                            <button onClick={openNew} className="flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Thêm người nói</button>
                        </EmptyState>
                    ) : (
                        <>
                            <div className="relative mb-4">
                                <span className="material-symbols-outlined text-[20px] text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true">search</span>
                                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên · chức danh · đơn vị · biến thể…"
                                    className="w-full bg-surface text-on-surface border border-outline-variant rounded-lg pl-10 pr-3 py-2 text-sm focus:border-secondary focus:outline-none" />
                            </div>
                            {filtered.length === 0 ? (
                                <p className="text-sm text-on-surface-variant text-center py-10">Không có hồ sơ khớp “{query}”.</p>
                            ) : (
                                <div className="space-y-3">
                                    {filtered.map((p) => <SpeakerCard key={p.id} p={p} onEdit={() => openEdit(p)} onDelete={() => del(p)} />)}
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
            {editing && (
                <FormDrawer p={editing} shown={shown} isNew={isNew} backendOnline={session.backendOnline} aliasRef={aliasRef}
                    onChange={change} onSave={save} onClose={closeDrawer} />
            )}
        </div>
    );
};

export default SpeakerMemory;
