import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveEvent } from '../lib/ActiveEventContext';
import { computeReadiness } from '../lib/readiness';

// Băng "đang chọn ≠ đang kích hoạt cho matcher" (doc 29 · §4.2). Biến con trỏ kích hoạt (vốn chỉ là
// một chấm không nhãn ở EventSwitcher) thành một dòng CẢNH BÁO CÓ CHỮ, để vận hành viên thấy rõ khi
// matcher đang giữ dữ liệu của BUỔI KHÁC, hoặc đã kích hoạt nhưng dữ liệu CHƯA đồng bộ, hoặc chưa kích
// hoạt gì → dùng dữ liệu chung/cũ. Chỉ báo "xanh" khi độ sẵn sàng đồng thuận (!usingGeneric) để không
// mâu thuẫn với EventDataDossier / cổng tiền-live.
//
// CTA luôn dẫn về /script — nơi "Đồng bộ BE" thực sự đẩy dữ liệu buổi này lên matcher + kích hoạt.
// KHÔNG bao giờ gọi activate() trần (đặt con trỏ mà không đẩy dữ liệu = lời khai sai).

// Class literal theo tông (Tailwind quét được — KHÔNG dùng nội suy `bg-${tone}`).
const TONE = {
    error: { border: 'border-error/40', bg: 'bg-error/10', text: 'text-error', btn: 'bg-error text-on-error hover:opacity-90' },
    primary: { border: 'border-primary/40', bg: 'bg-primary/10', text: 'text-primary', btn: 'bg-primary text-on-primary hover:opacity-90' },
} as const;

const short = (iso?: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const strong = (s: string) => <span className="font-medium text-on-surface">{s}</span>;

const ActivationBanner: React.FC<{ className?: string }> = ({ className }) => {
    const { eventId, event, events, activation } = useActiveEvent();
    const nav = useNavigate();
    if (!eventId) return null;

    const activatedId = activation.activatedId;
    const state: 'matched' | 'mismatched' | 'none' = !activatedId ? 'none' : activatedId === eventId ? 'matched' : 'mismatched';
    const activatedTitle = activatedId ? (events.find((e) => e.id === activatedId)?.title?.trim() || '(buổi đã xoá)') : '';
    const thisTitle = event?.title?.trim() || 'buổi đang chọn';
    // Đã kích hoạt buổi này nhưng dữ liệu chưa đồng bộ/chưa duyệt → KHÔNG báo xanh giả (khớp EventDataDossier).
    const stale = state === 'matched' && computeReadiness(eventId).usingGeneric;

    if (state === 'matched' && !stale) {
        return (
            <div className={`flex items-center gap-2 rounded-lg border border-secondary/30 bg-secondary/[0.07] px-3 py-2 text-secondary ${className ?? ''}`}>
                <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden="true">verified</span>
                <span className="text-sm min-w-0">
                    Matcher đang chạy dữ liệu của <span className="font-semibold">«{thisTitle}»</span>
                    {activation.activatedAt && <span className="text-secondary/70"> · kích hoạt {short(activation.activatedAt)}</span>}
                </span>
            </div>
        );
    }

    const t = state === 'mismatched' ? TONE.error : TONE.primary;
    const title = state === 'mismatched' ? 'Dữ liệu matcher KHÁC buổi đang soạn'
        : stale ? 'Đã kích hoạt buổi này nhưng dữ liệu CHƯA đồng bộ'
            : 'Chưa kích hoạt dữ liệu cho buổi nào';
    const body = state === 'mismatched'
        ? <>Đang soạn {strong(`«${thisTitle}»`)} nhưng matcher đang giữ dữ liệu {strong(`«${activatedTitle}»`)}. Đồng bộ để chạy đúng buổi này.</>
        : stale
            ? <>Con trỏ đã trỏ {strong(`«${thisTitle}»`)} nhưng kịch bản CHƯA được đẩy lên matcher (còn chỉnh sửa / chưa duyệt). Đồng bộ lại để matcher chạy đúng dữ liệu buổi này.</>
            : <>Matcher đang dùng {strong('dữ liệu chung / của buổi trước')} — độ chính xác cho {strong(`«${thisTitle}»`)} sẽ thấp.</>;

    return (
        <div role="status" className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${t.border} ${t.bg} ${className ?? ''}`}>
            <span className={`material-symbols-outlined text-[20px] shrink-0 ${t.text}`} aria-hidden="true">{state === 'mismatched' ? 'warning' : 'error'}</span>
            <div className="min-w-0 flex-1">
                <div className={`text-sm font-semibold ${t.text}`}>{title}</div>
                <div className="text-xs text-on-surface-variant mt-0.5">{body}</div>
            </div>
            <button onClick={() => nav('/script')}
                className={`shrink-0 self-center flex items-center gap-1 rounded-full px-3 py-1.5 font-label-caps text-label-caps transition-opacity ${t.btn}`}>
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">sync</span>
                Mở Kịch bản
            </button>
        </div>
    );
};

export default ActivationBanner;
