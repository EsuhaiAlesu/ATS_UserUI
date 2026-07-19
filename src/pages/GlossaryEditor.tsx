import React, { useEffect, useState } from 'react';
import { getGlossary, saveGlossary } from '../lib/api';
import type { GlossaryEntry } from '../lib/api';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonRows } from '../components/Skeleton';
import { toast } from '../lib/toast';

const BTN_PRI = 'inline-flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80 transition-opacity disabled:opacity-40';
const BTN_OUT = 'inline-flex items-center gap-1.5 border border-outline-variant text-on-surface-variant px-3.5 py-2 rounded-full text-sm hover:text-primary hover:border-primary transition-colors disabled:opacity-40';

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
    // A4.3 — GHIM CỨNG con số 20: bias hotword + auto-sửa các biến thể nghe nhầm.
    // ASR-confidence gating cho con số là việc của backend (Bước 0) — đây là lớp bảo vệ FE.
    { vi: 'kỷ niệm 20 năm', ja: '20周年', reading: 'にじゅうしゅうねん', type: 'term', asr_hotword: true, misheard: ['kỷ niệm 12 năm', 'kỉ niệm 20 năm', 'kỷ niệm hai mươi năm'], note: 'GHIM số 20 — tuyệt đối không nghe nhầm 12/22' },
    { vi: '20 năm', ja: '20年', type: 'term', asr_hotword: true, misheard: ['12 năm', 'hai mươi năm', '22 năm'], note: 'số cốt lõi của lễ' },
];

const csvToArr = (s: string) => s.split(/[,;]/).map((x) => x.trim()).filter(Boolean);

const GlossaryEditor: React.FC = () => {
    const [rows, setRows] = useState<GlossaryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);

    const load = () => {
        setLoading(true); setError(null);
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
        toast.info('Đã nạp mẫu — kiểm tra rồi bấm Lưu.');
    };

    const save = async () => {
        setSaving(true); setError(null);
        try {
            const clean = rows.filter((r) => r.vi.trim() || r.ja.trim());
            await saveGlossary(clean);
            toast.success(`Đã lưu ${clean.length} thuật ngữ`);
            setDirty(false);
        } catch (e) {
            toast.error('Lưu thất bại: ' + String(e));
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full bg-transparent text-on-surface border-b border-outline-variant/60 py-1.5 px-1 text-sm focus:border-secondary focus:outline-none placeholder:text-on-surface-variant/50';

    return (
        <div className="h-full flex flex-col bg-background text-on-background overflow-hidden">
            <PageHeader icon="menu_book" title="Từ điển & Tên riêng">
                <span className="hidden md:inline font-label-caps text-label-caps text-on-surface-variant">{rows.length} thuật ngữ{dirty ? ' · chưa lưu' : ''}</span>
                <button onClick={load} disabled={loading} className="border border-outline-variant text-on-surface-variant px-3 py-1.5 text-sm rounded-full hover:text-primary hover:border-primary disabled:opacity-40">Tải lại</button>
                <button onClick={save} disabled={saving || !dirty} className="inline-flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-1.5 text-sm font-label-caps text-label-caps rounded-full hover:opacity-80 disabled:opacity-40"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>{saving ? 'Đang lưu…' : 'Lưu'}</button>
            </PageHeader>

            <div className="flex-1 overflow-y-auto">
                <main className="max-w-6xl mx-auto px-6 py-8 space-y-4">
                    <div className="flex items-start gap-2 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0" aria-hidden="true">info</span>
                        <p>Để <b className="text-on-surface">JA trống</b> = giữ nguyên tên (không dịch). Bật <span className="material-symbols-outlined text-secondary text-[15px] align-middle" aria-hidden="true">lock</span> (hotword) cho tên riêng để máy nghe đúng.</p>
                    </div>

                    {error && <div className="border border-error text-error font-label-caps text-label-caps px-4 py-3 rounded-DEFAULT flex items-center gap-2"><span className="material-symbols-outlined text-base" aria-hidden="true">error</span>{error}</div>}

                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={addRow} className={BTN_OUT}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Thêm dòng</button>
                        <button onClick={seedCritical} className={BTN_OUT}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">star</span>Nạp mẫu trọng yếu</button>
                    </div>

                    {loading ? (
                        <SkeletonRows rows={6} />
                    ) : rows.length === 0 ? (
                        <EmptyState icon="menu_book" title="Chưa có thuật ngữ nào"
                            hint="Từ điển bảo vệ tên riêng & thuật ngữ để máy nghe và dịch đúng. Nạp danh sách trọng yếu cho lễ, hoặc thêm thủ công.">
                            <button onClick={seedCritical} className={BTN_PRI}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">star</span>Nạp mẫu trọng yếu</button>
                            <button onClick={addRow} className={BTN_OUT}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Thêm dòng</button>
                        </EmptyState>
                    ) : (
                        <div className="overflow-x-auto border border-outline-variant rounded-xl">
                            <table className="w-full text-sm border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="bg-surface-container-lowest text-on-surface-variant font-label-caps text-label-caps text-left">
                                        <th className="px-3 py-3 w-8"></th>
                                        <th className="px-3 py-3">VI</th>
                                        <th className="px-3 py-3">JA <span className="opacity-60">(trống = giữ nguyên)</span></th>
                                        <th className="px-3 py-3">Reading (かな)</th>
                                        <th className="px-3 py-3">Loại</th>
                                        <th className="px-3 py-3 text-center">🔒</th>
                                        <th className="px-3 py-3">Nghe-sai → sửa</th>
                                        <th className="px-3 py-3">Ghi chú</th>
                                        <th className="px-3 py-3 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={i} className="border-t border-outline-variant/60 align-top hover:bg-surface-container/30 transition-colors">
                                            <td className="px-3 py-2 text-center">{r.asr_hotword ? <span className="material-symbols-outlined text-secondary align-middle" style={{ fontSize: '1.1rem' }} title="Đã khoá (hotword)" aria-label="Đã khoá hotword">lock</span> : ''}</td>
                                            <td className="px-3 py-2"><input className={inputCls} value={r.vi ?? ''} onChange={(e) => updateRow(i, { vi: e.target.value })} /></td>
                                            <td className="px-3 py-2"><input className={`${inputCls} jp-text`} value={r.ja ?? ''} placeholder="—" onChange={(e) => updateRow(i, { ja: e.target.value })} /></td>
                                            <td className="px-3 py-2"><input className={`${inputCls} jp-text`} value={r.reading ?? ''} onChange={(e) => updateRow(i, { reading: e.target.value })} /></td>
                                            <td className="px-3 py-2">
                                                <select className={inputCls} value={r.type ?? 'other'} onChange={(e) => updateRow(i, { type: e.target.value })}>
                                                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <input type="checkbox" checked={!!r.asr_hotword} onChange={(e) => updateRow(i, { asr_hotword: e.target.checked })} className="accent-secondary" />
                                            </td>
                                            <td className="px-3 py-2"><input className={`${inputCls} jp-text`} value={(r.misheard ?? []).join(', ')} onChange={(e) => updateRow(i, { misheard: csvToArr(e.target.value) })} /></td>
                                            <td className="px-3 py-2"><input className={inputCls} value={r.note ?? ''} onChange={(e) => updateRow(i, { note: e.target.value })} /></td>
                                            <td className="px-3 py-2 text-center">
                                                <button onClick={() => removeRow(i)} title="Xoá" className="text-on-surface-variant hover:text-error transition-colors"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span></button>
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

export default GlossaryEditor;
