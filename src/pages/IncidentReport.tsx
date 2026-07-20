import React, { useState } from 'react';
import { useLiveSession } from '../lib/LiveSessionContext';
import { getPrep, addIncident, removeIncident } from '../lib/prep';
import PageHeader from '../components/PageHeader';

// Báo cáo sự cố (req 4): tình trạng hệ thống/thiết bị + hướng khắc phục + nhật ký sự cố.
// Nhật ký chạy OFFLINE (localStorage qua prep.ts); phần tình trạng suy ra từ phiên (phản ánh backend
// offline). Telemetry tự động đầy đủ (device/latency trail) sẽ bổ sung khi backend chạy — Bước 0/1.

type Level = 'ok' | 'warn' | 'error' | 'info';
const LV: Record<Level, { text: string; icon: string; border: string }> = {
    ok: { text: 'text-secondary', icon: 'check_circle', border: 'border-outline-variant' },
    warn: { text: 'text-primary', icon: 'warning', border: 'border-primary/40' },
    error: { text: 'text-error', icon: 'error', border: 'border-error/40' },
    info: { text: 'text-on-surface-variant', icon: 'info', border: 'border-outline-variant' },
};
const fmtMs = (n?: number) => (typeof n === 'number' ? `${Math.round(n)}ms` : '—');

interface Check { level: Level; label: string; detail: string; fix?: string }

const IncidentReport: React.FC = () => {
    const session = useLiveSession();
    const [prep, setPrep] = useState(getPrep());
    const [text, setText] = useState('');

    const e2e = session.timing?.e2e;
    const e2eStr = e2e != null ? `${fmtMs(e2e)}${session.timing?.measured === false ? ' (tổng)' : ''}` : 'chưa đo';

    // Tình trạng suy ra + gợi ý khắc phục (req 4).
    const checks: Check[] = [
        session.backendOnline
            ? { level: 'ok', label: 'Backend (lõi dịch)', detail: 'Online' }
            : { level: 'error', label: 'Backend (lõi dịch)', detail: 'Offline', fix: 'Chạy backend HanDichThuat trên Mac Studio (doc 17), rồi trỏ địa chỉ ở Cài đặt → apiBase.' },
        session.status === 'error'
            ? { level: 'error', label: 'Phiên dịch', detail: 'FAULT — mất kết nối', fix: 'Kiểm tra mạng/backend; Bắt đầu lại ở Điều khiển.' }
            : session.status === 'reconnecting'
                ? { level: 'warn', label: 'Phiên dịch', detail: 'Đang kết nối lại…', fix: 'Chờ tự phục hồi; nếu lâu → kiểm tra backend trên Mac.' }
                : { level: session.status === 'listening' || session.status === 'ready' ? 'ok' : 'info', label: 'Phiên dịch', detail: session.status },
        e2e != null && e2e > 4000
            ? { level: 'warn', label: 'Độ trễ E2E', detail: `${e2eStr} — cao`, fix: 'Hạ tải: model nhỏ hơn / bật fast-mode / tắt giọng, ưu tiên phụ đề.' }
            : { level: e2e != null ? 'ok' : 'info', label: 'Độ trễ E2E', detail: e2eStr },
        { level: session.nameFixCount > 0 ? 'ok' : 'info', label: 'Sửa tên riêng', detail: `${session.nameFixCount} lần (phiên này)` },
    ];
    if (session.error && session.status !== 'error') checks.push({ level: 'warn', label: 'Cảnh báo gần nhất', detail: session.error });

    const openCount = checks.filter((c) => c.level === 'error' || c.level === 'warn').length;
    const add = () => { const t = text.trim(); if (t) { setPrep(addIncident(t)); setText(''); } };

    return (
        <div className="h-full flex flex-col text-on-background overflow-hidden">
            <PageHeader icon="report" title="Báo cáo sự cố" subtitle={openCount > 0 ? `${openCount} mục cần chú ý · hướng khắc phục bên dưới` : 'Hệ thống ổn · nhật ký để rút kinh nghiệm'} />
            <div className="flex-1 overflow-y-auto">
                <main className="max-w-[1100px] mx-auto px-6 md:px-10 py-8 space-y-8">
                    {/* Tình trạng hệ thống + gợi ý khắc phục */}
                    <section id="status" className="scroll-mt-4">
                        <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-3">Tình trạng hệ thống</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {checks.map((c, i) => {
                                const lv = LV[c.level];
                                return (
                                    <div key={i} className={`card-lux rounded-2xl border-2 p-4 bg-surface-container ${lv.border}`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`material-symbols-outlined text-[20px] ${lv.text}`} aria-hidden="true">{lv.icon}</span>
                                            <span className="font-semibold text-on-surface text-[15px] flex-1 min-w-0">{c.label}</span>
                                            <span className={`text-[13px] font-medium shrink-0 ${lv.text}`}>{c.detail}</span>
                                        </div>
                                        {c.fix && (
                                            <div className="mt-2.5 flex items-start gap-1.5 text-[13px] text-on-surface-variant leading-relaxed">
                                                <span className="material-symbols-outlined text-[16px] text-primary shrink-0" aria-hidden="true">lightbulb</span>
                                                <span>{c.fix}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="mt-3 text-[13px] text-on-surface-variant/70">Nhật ký thiết bị/độ trễ TỰ ĐỘNG (đầy đủ) sẽ bổ sung khi backend chạy trên Mac (Bước 0/1).</p>
                    </section>

                    {/* Nhật ký sự cố (tay, offline) */}
                    <section id="log" className="scroll-mt-4">
                        <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-1">Nhật ký sự cố</h2>
                        <p className="text-[13px] text-on-surface-variant/70 mb-3">Ghi để rút kinh nghiệm cho lần sau — lưu tại máy này (không đồng bộ backend).</p>
                        <div className="flex gap-2">
                            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
                                placeholder="vd: 'Kaizen' nghe thành 'kaisen'; loa JA rè phút 12…"
                                className="field-lux transition-shadow flex-1 bg-surface text-on-surface border border-outline-variant rounded-lg px-3.5 py-2.5 text-base focus:border-secondary focus:outline-none" />
                            <button onClick={add} disabled={!text.trim()} className="btn-lux bg-secondary text-on-secondary px-5 rounded-lg font-label-caps text-label-caps hover:opacity-80 disabled:opacity-40">Ghi</button>
                        </div>
                        <ul className="mt-3 space-y-2">
                            {prep.incidents.length === 0 && <li className="text-[13px] text-on-surface-variant/60 italic">Chưa ghi sự cố nào.</li>}
                            {prep.incidents.map((it, i) => (
                                <li key={i} className="flex items-start gap-2 bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5">
                                    <button onClick={() => setPrep(removeIncident(i))} title="Xóa" className="text-on-surface-variant hover:text-error shrink-0 mt-0.5"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span></button>
                                    <span className="text-[15px] text-on-surface flex-1 break-words">{it}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default IncidentReport;
