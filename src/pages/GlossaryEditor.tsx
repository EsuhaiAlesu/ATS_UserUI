import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getGlossary, saveGlossary } from '../lib/api';
import type { GlossaryEntry } from '../lib/api';

const TYPES = ['name', 'company', 'keigo', 'tech', 'award', 'term', 'keep', 'other'];

// Conservative starter list for the Esuhai 20th-anniversary event. Readings/JA are best-effort —
// verify with native speakers before the ceremony (a wrong name on the LED wall is unforgivable).
const SEED: GlossaryEntry[] = [
    { vi: 'Lê Long Sơn', ja: '', type: 'name', asr_hotword: true, note: 'Tổng Giám Đốc — giữ nguyên tên' },
    { vi: 'Esuhai', ja: 'エスハイ', reading: 'えすはい', type: 'company', asr_hotword: true, note: '' },
    { vi: 'Kaizen Yoshida School', ja: '', type: 'name', asr_hotword: true, note: '' },
    { vi: 'Trung tâm Nhật ngữ Cải Tiến', ja: '', type: 'name', asr_hotword: true, note: '' },
    { vi: 'Kaizen', ja: '改善', reading: 'かいぜん', type: 'term', asr_hotword: true, note: '' },
    { vi: 'Success in Shigoto', ja: '', type: 'term', asr_hotword: true, note: 'Shigoto = 仕事' },
    { vi: 'PROYAKU', ja: '', type: 'name', asr_hotword: true, note: 'Tên sản phẩm' },
    { vi: 'quý công ty', ja: '御社', reading: 'おんしゃ', type: 'keigo', asr_hotword: true, note: 'kính ngữ' },
];

const csvToArr = (s: string) => s.split(/[,;]/).map((x) => x.trim()).filter(Boolean);

const GlossaryEditor: React.FC = () => {
    const [rows, setRows] = useState<GlossaryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);

    const load = () => {
        setLoading(true); setError(null); setStatus('');
        getGlossary()
            .then((r) => { setRows(r); setDirty(false); })
            .catch((e) => setError('Không tải được glossary (backend chạy chưa?): ' + String(e)))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);

    const updateRow = (i: number, patch: Partial<GlossaryEntry>) => {
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
        setDirty(true);
    };
    const addRow = () => { setRows((prev) => [...prev, { vi: '', ja: '', type: 'name', asr_hotword: true }]); setDirty(true); };
    const removeRow = (i: number) => { setRows((prev) => prev.filter((_, idx) => idx !== i)); setDirty(true); };

    const seedCritical = () => {
        setRows((prev) => {
            const have = new Set(prev.map((r) => r.vi.trim().toLowerCase()));
            const add = SEED.filter((s) => !have.has(s.vi.trim().toLowerCase()));
            return [...add, ...prev];
        });
        setDirty(true);
        setStatus('Đã nạp danh sách khởi đầu (chưa lưu) — kiểm tra rồi bấm Lưu.');
    };

    const save = async () => {
        setSaving(true); setStatus('Đang lưu…'); setError(null);
        try {
            const clean = rows.filter((r) => r.vi.trim() || r.ja.trim());
            const r = await saveGlossary(clean);
            setStatus(`✓ Đã lưu ${clean.length} term (${r.bytes} bytes). Hiệu lực phiên kế.`);
            setDirty(false);
        } catch (e) {
            setError('Lưu thất bại: ' + String(e));
            setStatus('');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full bg-surface text-on-surface border-b border-outline-variant py-1 px-1 text-sm focus:border-secondary';

    return (
        <div className="bg-background text-on-background min-h-screen w-full overflow-y-auto">
            <header className="bg-surface border-b border-outline-variant flex items-center gap-6 w-full px-container-padding h-20 sticky top-0 z-20">
                <Link to="/audio" className="text-on-surface-variant font-label-caps text-label-caps hover:text-primary">&lt; BÀN ĐIỀU KHIỂN</Link>
                <span className="font-bold text-xl tracking-tight text-secondary">Glossary &amp; Tên riêng — PROYAKU</span>
                <div className="ml-auto flex items-center gap-3">
                    <button onClick={load} disabled={loading} className="border border-outline-variant text-on-surface-variant px-3 py-2 text-sm hover:text-primary hover:border-primary disabled:opacity-40">Tải lại</button>
                    <button onClick={save} disabled={saving || !dirty} className="bg-secondary text-on-secondary px-4 py-2 text-sm font-label-caps text-label-caps rounded-DEFAULT hover:opacity-80 disabled:opacity-40">{saving ? 'Đang lưu…' : 'LƯU'}</button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-container-padding py-8 space-y-4">
                <div className="border border-outline-variant rounded-DEFAULT bg-surface-container-lowest px-4 py-3 font-label-caps text-label-caps text-on-surface-variant">
                    ⓘ Glossary lái <b className="text-secondary">cách dịch · hotword nhận dạng · post-correct</b> cùng lúc — artefact quan trọng nhất trước sự kiện. Để <b>JA trống</b> = <b>giữ nguyên tên</b> (không dịch). Bật <b>Hotword 🔒</b> cho tên riêng để máy nghe đúng. Lưu về <code>data/glossary.json</code>, hiệu lực phiên kế.
                </div>

                {error && <div className="border border-error text-error font-label-caps text-label-caps px-4 py-3 rounded-DEFAULT">{error}</div>}

                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={addRow} className="border border-outline-variant text-on-surface-variant px-3 py-2 text-sm hover:text-primary hover:border-primary">+ Thêm dòng</button>
                    <button onClick={seedCritical} className="border border-secondary text-secondary px-3 py-2 text-sm hover:opacity-80">★ Nạp tên riêng trọng yếu</button>
                    <span className="font-label-caps text-label-caps text-on-surface-variant">{rows.length} term{dirty ? ' · chưa lưu' : ''}</span>
                    <span className="ml-auto font-label-caps text-label-caps text-secondary">{status}</span>
                </div>

                <div className="overflow-x-auto border border-outline-variant rounded-DEFAULT">
                    <table className="w-full text-sm border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-surface-container text-on-surface-variant font-label-caps text-label-caps text-left">
                                <th className="p-2 w-8"></th>
                                <th className="p-2">VI</th>
                                <th className="p-2">JA (trống = giữ nguyên)</th>
                                <th className="p-2">Reading (かな)</th>
                                <th className="p-2">Loại</th>
                                <th className="p-2 text-center">Hotword</th>
                                <th className="p-2">Nghe-sai → sửa (phẩy)</th>
                                <th className="p-2">Ghi chú</th>
                                <th className="p-2 w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={9} className="p-4 text-center text-on-surface-variant">Đang tải…</td></tr>}
                            {!loading && rows.length === 0 && (
                                <tr><td colSpan={9} className="p-4 text-center text-on-surface-variant">Chưa có term. Bấm "Nạp tên riêng trọng yếu" hoặc "Thêm dòng".</td></tr>
                            )}
                            {rows.map((r, i) => (
                                <tr key={i} className="border-t border-outline-variant align-top">
                                    <td className="p-2 text-center">{r.asr_hotword ? <span title="Đã khoá (hotword)">🔒</span> : ''}</td>
                                    <td className="p-2"><input className={inputCls} value={r.vi ?? ''} onChange={(e) => updateRow(i, { vi: e.target.value })} /></td>
                                    <td className="p-2"><input className={`${inputCls} jp-text`} value={r.ja ?? ''} placeholder="—" onChange={(e) => updateRow(i, { ja: e.target.value })} /></td>
                                    <td className="p-2"><input className={`${inputCls} jp-text`} value={r.reading ?? ''} onChange={(e) => updateRow(i, { reading: e.target.value })} /></td>
                                    <td className="p-2">
                                        <select className={inputCls} value={r.type ?? 'other'} onChange={(e) => updateRow(i, { type: e.target.value })}>
                                            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2 text-center">
                                        <input type="checkbox" checked={!!r.asr_hotword} onChange={(e) => updateRow(i, { asr_hotword: e.target.checked })} />
                                    </td>
                                    <td className="p-2"><input className={`${inputCls} jp-text`} value={(r.misheard ?? []).join(', ')} onChange={(e) => updateRow(i, { misheard: csvToArr(e.target.value) })} /></td>
                                    <td className="p-2"><input className={inputCls} value={r.note ?? ''} onChange={(e) => updateRow(i, { note: e.target.value })} /></td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => removeRow(i)} title="Xoá" className="text-error hover:opacity-70">✕</button>
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

export default GlossaryEditor;
