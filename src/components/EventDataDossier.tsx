import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveEvent } from '../lib/ActiveEventContext';
import { computeReadiness, TIER_LABEL } from '../lib/readiness';
import type { BackendCounts, PillarState, AccuracyTier } from '../lib/readiness';

// Thẻ "Hồ sơ dữ liệu sự kiện" (doc 29 · §4.3a). Hiển thị 4 trụ dữ liệu (Kịch bản · Từ điển · Người nói
// · Tài liệu) cho buổi đang chọn + nhãn "Độ chính xác dự kiến", và cảnh báo rõ khi app đang dùng dữ
// liệu chung. Dùng ở Tổng quan (Chuẩn bị) và Báo cáo. Chỉ đọc localStorage (+ số liệu backend nếu có).

// Class literal theo trạng thái trụ (Tailwind quét được — KHÔNG nội suy).
const PST: Record<PillarState, { icon: string; text: string; ring: string }> = {
    full: { icon: 'check_circle', text: 'text-secondary', ring: 'bg-secondary/15' },
    generic: { icon: 'warning', text: 'text-primary', ring: 'bg-primary/15' },
    missing: { icon: 'cancel', text: 'text-error', ring: 'bg-error/15' },
};
const TST: Record<AccuracyTier, { text: string; bg: string; border: string; icon: string }> = {
    high: { text: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/40', icon: 'verified_user' },
    medium: { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/40', icon: 'shield' },
    low: { text: 'text-error', bg: 'bg-error/10', border: 'border-error/40', icon: 'gpp_maybe' },
};

const EventDataDossier: React.FC<{ be?: BackendCounts; className?: string }> = ({ be, className }) => {
    const { eventId, event } = useActiveEvent();
    const nav = useNavigate();

    if (!eventId) {
        return (
            <div className={`glass-high rounded-2xl p-5 ${className ?? ''}`}>
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[22px] text-on-surface-variant" aria-hidden="true">event_busy</span>
                    <div className="flex-1 text-sm text-on-surface-variant">Chưa chọn sự kiện — hãy đặt lịch hoặc chọn một buổi để chuẩn bị dữ liệu.</div>
                    <button onClick={() => nav('/schedule')} className="btn-lux shrink-0 flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80">Đặt lịch</button>
                </div>
            </div>
        );
    }

    const r = computeReadiness(eventId, be);
    const tier = TST[r.tier];
    const title = event?.title?.trim() || 'buổi đang chọn';

    return (
        <div className={`glass-high rounded-2xl p-4 sm:p-5 ${className ?? ''}`}>
            {/* Header: tên buổi · nhãn độ chính xác dự kiến */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[20px] text-secondary" aria-hidden="true">inventory_2</span>
                    <div className="min-w-0">
                        <div className="font-label-caps text-label-caps text-on-surface-variant/60 leading-none">Hồ sơ dữ liệu sự kiện</div>
                        <div className="text-base font-semibold text-on-surface truncate leading-snug">«{title}»</div>
                    </div>
                </div>
                <div className={`flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 ${tier.bg} ${tier.border} ${tier.text}`}>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{tier.icon}</span>
                    <span className="font-label-caps text-[10px] leading-none">Độ chính xác dự kiến</span>
                    <span className="text-sm font-bold leading-none">{TIER_LABEL[r.tier]}</span>
                </div>
            </div>

            {/* 4 trụ dữ liệu */}
            <div className="mt-3 space-y-1.5">
                {r.pillars.map((p) => {
                    const s = PST[p.state];
                    return (
                        <div key={p.key} className="flex items-center gap-3 rounded-xl bg-surface-container/60 px-3 py-2.5">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.ring}`}>
                                <span className={`material-symbols-outlined text-[20px] ${s.text}`} aria-hidden="true">{p.icon}</span>
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-on-surface">{p.label}</span>
                                    <span className={`material-symbols-outlined text-[15px] ${s.text}`} aria-hidden="true">{s.icon}</span>
                                </div>
                                <div className="text-xs text-on-surface-variant leading-snug">{p.detail}</div>
                            </div>
                            <button onClick={() => nav(p.to)}
                                className="shrink-0 flex items-center gap-1 rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:border-outline transition-colors">
                                {p.cta}
                                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">chevron_right</span>
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Cảnh báo tổng khi đang dùng dữ liệu chung */}
            {r.usingGeneric && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-error/30 bg-error/[0.07] px-3 py-2">
                    <span className="material-symbols-outlined text-[18px] text-error shrink-0" aria-hidden="true">priority_high</span>
                    <div className="text-xs text-on-surface-variant">
                        Chưa nạp/kích hoạt dữ liệu riêng cho buổi này → app sẽ dùng <span className="font-medium text-on-surface">dữ liệu chung/đã lưu</span>, <span className="font-medium text-error">độ chính xác thấp</span>. Hãy hoàn tất kịch bản riêng và đồng bộ trước buổi hội nghị.
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventDataDossier;
