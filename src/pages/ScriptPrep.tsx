import React, { useEffect, useState } from 'react';
import { getScript, saveScript, pretranslate } from '../lib/api';
import type { ScriptEntry } from '../lib/api';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonRows } from '../components/Skeleton';
import { toast } from '../lib/toast';
import { useSaveHotkey, useUnsavedGuard } from '../lib/guards';

const BTN_PRI = 'inline-flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80 transition-opacity disabled:opacity-40';
const BTN_OUT = 'inline-flex items-center gap-1.5 border border-outline-variant text-on-surface-variant px-3.5 py-2 rounded-full text-sm hover:text-primary hover:border-primary transition-colors disabled:opacity-40';
const BTN_ACC = 'inline-flex items-center gap-1.5 border border-primary text-primary px-3.5 py-2 rounded-full text-sm hover:opacity-80 transition-opacity disabled:opacity-40';

const LANGS: Record<string, string> = { vi: 'VI', ja: 'JA' };
const genId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const ScriptPrep: React.FC = () => {
    const [rows, setRows] = useState<ScriptEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [dir, setDir] = useState<'vi-ja' | 'ja-vi'>('vi-ja');
    const [paste, setPaste] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [bulk, setBulk] = useState(false);

    const load = () => {
        setLoading(true); setError(null); setStatus('');
        getScript()
            .then((r) => { setRows(r); setDirty(false); })
            .catch((e) => setError('Không tải được kịch bản (backend chạy chưa?): ' + String(e)))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);

    const [srcLang, dstLang] = dir === 'vi-ja' ? ['vi', 'ja'] : ['ja', 'vi'];

    const updateRow = (id: string, patch: Partial<ScriptEntry>) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
        setDirty(true);
    };
    const removeRow = (id: string) => { setRows((prev) => prev.filter((r) => r.id !== id)); setDirty(true); };
    const addRow = () => {
        setRows((prev) => [...prev, { id: genId(), src_lang: srcLang, src: '', dst_lang: dstLang, dst: '', status: 'draft' }]);
        setDirty(true);
    };
    const swapRow = (id: string) => setRows((prev) => prev.map((r) => r.id === id
        ? { ...r, src_lang: r.dst_lang, src: r.dst, dst_lang: r.src_lang, dst: r.src } : r));

    const importPaste = () => {
        const lines = paste.split('\n').map((s) => s.trim()).filter(Boolean);
        if (!lines.length) return;
        setRows((prev) => [...prev, ...lines.map((src) => ({ id: genId(), src_lang: srcLang, src, dst_lang: dstLang, dst: '', status: 'draft' as const }))]);
        setPaste(''); setDirty(true);
        setStatus(`Đã thêm ${lines.length} dòng nguồn (${LANGS[srcLang]}→${LANGS[dstLang]}). Dịch & duyệt rồi Lưu.`);
    };

    const translateOne = async (r: ScriptEntry) => {
        if (!r.src.trim()) return;
        setBusyId(r.id); setError(null);
        try {
            const dst = await pretranslate(r.src, r.src_lang, r.dst_lang);
            updateRow(r.id, { dst });
            setStatus('Đã dịch thử 1 dòng — hãy DUYỆT tay trước khi dùng.');
        } catch (e) {
            setError('Dịch tự động lỗi: ' + String(e instanceof Error ? e.message : e));
        } finally {
            setBusyId(null);
        }
    };

    const translateEmpty = async () => {
        const todo = rows.filter((r) => r.src.trim() && !r.dst.trim());
        if (!todo.length) { setStatus('Không có dòng trống để dịch.'); return; }
        setBulk(true); setError(null);
        let done = 0;
        for (const r of todo) {
            setBusyId(r.id);
            try {
                const dst = await pretranslate(r.src, r.src_lang, r.dst_lang);
                updateRow(r.id, { dst });
                done++;
                setStatus(`Đang dịch… ${done}/${todo.length}`);
            } catch (e) {
                // A structural failure (no backend / missing block) will hit every line — stop early.
                setError(`Dừng ở dòng ${done + 1}/${todo.length}: ${String(e instanceof Error ? e.message : e)}`);
                break;
            }
        }
        setBusyId(null); setBulk(false);
        if (done) setStatus(`Đã dịch thử ${done} dòng — DUYỆT tay từng dòng trước khi khoá.`);
    };

    const save = async () => {
        setSaving(true); setError(null);
        try {
            const clean = rows.filter((r) => r.src.trim() || r.dst.trim());
            await saveScript(clean);
            const approved = clean.filter((r) => r.status === 'approved').length;
            toast.success(`Đã lưu ${clean.length} dòng · ${approved} đã duyệt`);
            setDirty(false);
        } catch (e) {
            toast.error('Lưu thất bại: ' + String(e));
        } finally {
            setSaving(false);
        }
    };

    const approvedCount = rows.filter((r) => r.status === 'approved').length;
    useSaveHotkey(save, dirty && !saving);
    useUnsavedGuard(dirty);
    const ta ='w-full bg-surface text-on-surface border border-outline-variant rounded-lg py-2 px-2.5 text-base leading-snug resize-y focus:border-secondary focus:outline-none';

    return (
        <div className="h-full flex flex-col bg-background text-on-background overflow-hidden">
            <PageHeader icon="theater_comedy" title="Kịch bản & Bản dịch duyệt sẵn">
                <span className="hidden md:inline font-label-caps text-label-caps text-on-surface-variant">{rows.length} dòng · {approvedCount} duyệt{dirty ? ' · chưa lưu' : ''}</span>
                <button onClick={load} disabled={loading} className="border border-outline-variant text-on-surface-variant px-3 py-1.5 text-sm rounded-full hover:text-primary hover:border-primary disabled:opacity-40">Tải lại</button>
                <button onClick={save} disabled={saving || !dirty} title="Lưu (Ctrl+S)" className="inline-flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-1.5 text-sm font-label-caps text-label-caps rounded-full hover:opacity-80 disabled:opacity-40"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>{saving ? 'Đang lưu…' : 'Lưu'}</button>
            </PageHeader>

            <div className="flex-1 overflow-y-auto">
                <main className="max-w-6xl mx-auto px-6 py-8 space-y-4">
                    <div className="flex items-start gap-2 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0" aria-hidden="true">info</span>
                        <p>Dòng <b className="text-secondary">ĐÃ DUYỆT</b> được tái dùng nguyên văn khi khớp cao — <b className="text-on-surface">luôn duyệt tay</b> trước khi khoá. Dịch tự động chỉ là bản nháp.</p>
                    </div>

                    {error && <div className="border border-error text-error font-label-caps text-label-caps px-4 py-3 rounded-DEFAULT flex items-center gap-2"><span className="material-symbols-outlined text-base" aria-hidden="true">error</span>{error}</div>}

                    {/* Import card */}
                    <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="font-label-caps text-label-caps text-on-surface-variant">Chiều dịch</label>
                            <select value={dir} onChange={(e) => setDir(e.target.value as 'vi-ja' | 'ja-vi')} className="bg-surface text-on-surface border border-outline-variant rounded-full px-3 py-1.5 text-sm focus:border-secondary focus:outline-none">
                                <option value="vi-ja">VI → JA (MC nói tiếng Việt)</option>
                                <option value="ja-vi">JA → VI (khách Nhật nói)</option>
                            </select>
                            <button onClick={addRow} className={BTN_OUT}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Thêm dòng</button>
                            <button onClick={translateEmpty} disabled={bulk || !rows.some((r) => r.src.trim() && !r.dst.trim())} className={BTN_ACC}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">translate</span>{bulk ? 'Đang dịch…' : 'Dịch tự động dòng trống'}</button>
                            {status && <span className="ml-auto font-label-caps text-label-caps text-secondary">{status}</span>}
                        </div>
                        <div className="flex gap-2">
                            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={2} placeholder={`Dán nhiều dòng nguồn (${LANGS[srcLang]}), mỗi dòng một câu…`}
                                className="flex-1 bg-surface text-on-surface border border-outline-variant rounded-lg py-2 px-3 text-sm resize-y focus:border-secondary focus:outline-none" />
                            <button onClick={importPaste} disabled={!paste.trim()} className={`${BTN_OUT} self-start`}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">south</span>Nhập</button>
                        </div>
                    </div>

                    {loading ? (
                        <SkeletonRows rows={5} />
                    ) : rows.length === 0 ? (
                        <EmptyState icon="theater_comedy" title="Chưa có dòng kịch bản"
                            hint="Dán kịch bản song ngữ ở ô trên rồi bấm Nhập, hoặc thêm từng dòng. Dòng đã duyệt sẽ được tái dùng nguyên văn khi lễ diễn ra.">
                            <button onClick={addRow} className={BTN_PRI}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Thêm dòng</button>
                        </EmptyState>
                    ) : (
                        <div className="overflow-x-auto border border-outline-variant rounded-xl">
                            <table className="w-full text-sm border-collapse min-w-[820px]">
                                <thead>
                                    <tr className="bg-surface-container-lowest text-on-surface-variant font-label-caps text-label-caps text-left">
                                        <th className="px-3 py-3 w-10">#</th>
                                        <th className="px-3 py-3 w-24">Trạng thái</th>
                                        <th className="px-3 py-3">Nguồn</th>
                                        <th className="px-3 py-3 w-8"></th>
                                        <th className="px-3 py-3">Bản dịch (duyệt tay)</th>
                                        <th className="px-3 py-3 w-24">Dịch thử</th>
                                        <th className="px-3 py-3 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={r.id} className="border-t border-outline-variant/60 align-top hover:bg-surface-container/30 transition-colors">
                                            <td className="px-3 py-3 text-on-surface-variant tabular-nums">{i + 1}</td>
                                            <td className="px-3 py-3">
                                                <button
                                                    onClick={() => updateRow(r.id, { status: r.status === 'approved' ? 'draft' : 'approved' })}
                                                    className={`w-full px-2 py-1 rounded-full font-label-caps text-label-caps ${r.status === 'approved' ? 'bg-secondary text-on-secondary' : 'border border-outline-variant text-on-surface-variant hover:border-primary'}`}
                                                    title="Bấm để đổi Nháp ⇄ Đã duyệt">
                                                    {r.status === 'approved' ? '✓ Duyệt' : 'Nháp'}
                                                </button>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">{LANGS[r.src_lang] ?? r.src_lang}</div>
                                                <textarea rows={2} className={`${ta} ${r.src_lang === 'ja' ? 'jp-text' : ''}`} value={r.src} onChange={(e) => updateRow(r.id, { src: e.target.value })} />
                                            </td>
                                            <td className="px-2 py-3 text-center align-middle">
                                                <button onClick={() => swapRow(r.id)} title="Đảo nguồn ⇄ đích" className="text-on-surface-variant hover:text-primary transition-colors"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">swap_horiz</span></button>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">{LANGS[r.dst_lang] ?? r.dst_lang}</div>
                                                <textarea rows={2} className={`${ta} ${r.dst_lang === 'ja' ? 'jp-text' : ''}`} value={r.dst} onChange={(e) => updateRow(r.id, { dst: e.target.value })} />
                                            </td>
                                            <td className="px-3 py-3">
                                                <button onClick={() => translateOne(r)} disabled={busyId === r.id || !r.src.trim()} className="inline-flex items-center gap-1 border border-primary text-primary px-2.5 py-1 text-xs rounded-full hover:opacity-80 disabled:opacity-40"><span className="material-symbols-outlined text-[15px]" aria-hidden="true">translate</span>{busyId === r.id ? '…' : 'thử'}</button>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <button onClick={() => removeRow(r.id)} title="Xoá" className="text-on-surface-variant hover:text-error transition-colors"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ScriptPrep;
