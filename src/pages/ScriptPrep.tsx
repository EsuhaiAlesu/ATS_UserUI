import React, { useEffect, useState } from 'react';
import { getScript, saveScript, pretranslate } from '../lib/api';
import type { ScriptEntry } from '../lib/api';

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
        setSaving(true); setStatus('Đang lưu…'); setError(null);
        try {
            const clean = rows.filter((r) => r.src.trim() || r.dst.trim());
            const res = await saveScript(clean);
            const approved = clean.filter((r) => r.status === 'approved').length;
            setStatus(`✓ Đã lưu ${clean.length} dòng (${approved} đã duyệt, ${res.bytes} bytes).`);
            setDirty(false);
        } catch (e) {
            setError('Lưu thất bại: ' + String(e));
            setStatus('');
        } finally {
            setSaving(false);
        }
    };

    const approvedCount = rows.filter((r) => r.status === 'approved').length;
    const ta = 'w-full bg-surface text-on-surface border border-outline-variant rounded-DEFAULT py-1.5 px-2 text-base leading-snug resize-y focus:border-secondary';

    return (
        <div className="bg-background text-on-background min-h-screen w-full overflow-y-auto">
            <header className="bg-surface border-b border-outline-variant flex items-center gap-6 w-full px-container-padding h-20 sticky top-0 z-20">
                <span className="font-bold text-xl tracking-tight text-on-surface">Kịch bản &amp; Bản dịch duyệt sẵn</span>
                <div className="ml-auto flex items-center gap-3">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">{rows.length} dòng · {approvedCount} duyệt{dirty ? ' · chưa lưu' : ''}</span>
                    <button onClick={load} disabled={loading} className="border border-outline-variant text-on-surface-variant px-3 py-2 text-sm hover:text-primary hover:border-primary disabled:opacity-40">Tải lại</button>
                    <button onClick={save} disabled={saving || !dirty} className="bg-secondary text-on-secondary px-4 py-2 text-sm font-label-caps text-label-caps rounded-DEFAULT hover:opacity-80 disabled:opacity-40">{saving ? 'Đang lưu…' : 'LƯU'}</button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-container-padding py-8 space-y-4">
                <div className="border border-outline-variant rounded-DEFAULT bg-surface-container-lowest px-4 py-3 font-label-caps text-label-caps text-on-surface-variant">
                    ⓘ Dòng <b className="text-secondary">ĐÃ DUYỆT</b> được Cascade Matcher <b>tái dùng nguyên văn</b> khi khớp cao — đây là <b>trần chất lượng</b> của lễ. Dịch tự động chỉ là bản nháp; <b className="text-secondary">luôn duyệt tay</b> trước khi khoá. Lưu về <code>data/script.json</code>.
                </div>

                {error && <div className="border border-error text-error font-label-caps text-label-caps px-4 py-3 rounded-DEFAULT">{error}</div>}

                <div className="flex flex-wrap items-center gap-3">
                    <label className="font-label-caps text-label-caps text-on-surface-variant">Chiều dịch:</label>
                    <select value={dir} onChange={(e) => setDir(e.target.value as 'vi-ja' | 'ja-vi')} className="bg-surface text-on-surface border border-outline-variant rounded-DEFAULT px-2 py-1.5 text-sm">
                        <option value="vi-ja">VI → JA (MC nói tiếng Việt)</option>
                        <option value="ja-vi">JA → VI (khách Nhật nói)</option>
                    </select>
                    <button onClick={addRow} className="border border-outline-variant text-on-surface-variant px-3 py-2 text-sm hover:text-primary hover:border-primary">+ Thêm dòng</button>
                    <button onClick={translateEmpty} disabled={bulk || !rows.some((r) => r.src.trim() && !r.dst.trim())} className="border border-primary text-primary px-3 py-2 text-sm hover:opacity-80 disabled:opacity-40">{bulk ? 'Đang dịch…' : '⇄ Dịch tự động dòng trống (thử · cần backend)'}</button>
                    <span className="ml-auto font-label-caps text-label-caps text-secondary">{status}</span>
                </div>

                <div className="flex gap-2">
                    <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={2} placeholder={`Dán nhiều dòng nguồn (${LANGS[srcLang]}), mỗi dòng một câu…`}
                        className="flex-1 bg-surface text-on-surface border border-outline-variant rounded-DEFAULT py-2 px-3 text-sm resize-y" />
                    <button onClick={importPaste} disabled={!paste.trim()} className="border border-outline-variant text-on-surface-variant px-3 py-2 text-sm self-start hover:text-primary hover:border-primary disabled:opacity-40">Nhập dòng nguồn ↧</button>
                </div>

                <div className="overflow-x-auto border border-outline-variant rounded-DEFAULT">
                    <table className="w-full text-sm border-collapse min-w-[820px]">
                        <thead>
                            <tr className="bg-surface-container text-on-surface-variant font-label-caps text-label-caps text-left">
                                <th className="p-2 w-10">#</th>
                                <th className="p-2 w-24">Trạng thái</th>
                                <th className="p-2">Nguồn</th>
                                <th className="p-2 w-8"></th>
                                <th className="p-2">Bản dịch (duyệt tay)</th>
                                <th className="p-2 w-28">Dịch thử</th>
                                <th className="p-2 w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={7} className="p-4 text-center text-on-surface-variant">Đang tải…</td></tr>}
                            {!loading && rows.length === 0 && (
                                <tr><td colSpan={7} className="p-4 text-center text-on-surface-variant">Chưa có dòng. Dán kịch bản ở trên rồi "Nhập dòng nguồn", hoặc "Thêm dòng".</td></tr>
                            )}
                            {rows.map((r, i) => (
                                <tr key={r.id} className="border-t border-outline-variant align-top">
                                    <td className="p-2 text-on-surface-variant">{i + 1}</td>
                                    <td className="p-2">
                                        <button
                                            onClick={() => updateRow(r.id, { status: r.status === 'approved' ? 'draft' : 'approved' })}
                                            className={`w-full px-2 py-1 rounded-DEFAULT font-label-caps text-label-caps ${r.status === 'approved' ? 'bg-secondary text-on-secondary' : 'border border-outline-variant text-on-surface-variant'}`}
                                            title="Bấm để đổi Nháp ⇄ Đã duyệt">
                                            {r.status === 'approved' ? '✓ DUYỆT' : 'nháp'}
                                        </button>
                                    </td>
                                    <td className="p-2">
                                        <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">{LANGS[r.src_lang] ?? r.src_lang}</div>
                                        <textarea rows={2} className={`${ta} ${r.src_lang === 'ja' ? 'jp-text' : ''}`} value={r.src} onChange={(e) => updateRow(r.id, { src: e.target.value })} />
                                    </td>
                                    <td className="p-2 text-center align-middle">
                                        <button onClick={() => swapRow(r.id)} title="Đảo nguồn ⇄ đích" className="text-on-surface-variant hover:text-primary">⇄</button>
                                    </td>
                                    <td className="p-2">
                                        <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">{LANGS[r.dst_lang] ?? r.dst_lang}</div>
                                        <textarea rows={2} className={`${ta} ${r.dst_lang === 'ja' ? 'jp-text' : ''}`} value={r.dst} onChange={(e) => updateRow(r.id, { dst: e.target.value })} />
                                    </td>
                                    <td className="p-2">
                                        <button onClick={() => translateOne(r)} disabled={busyId === r.id || !r.src.trim()} className="border border-primary text-primary px-2 py-1 text-xs rounded-DEFAULT hover:opacity-80 disabled:opacity-40">
                                            {busyId === r.id ? '…' : '⇄ dịch thử'}
                                        </button>
                                    </td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => removeRow(r.id)} title="Xoá" className="text-error hover:opacity-70">✕</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

export default ScriptPrep;
