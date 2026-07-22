import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveEvent } from '../lib/ActiveEventContext';

// Head‑bar control for the "which event am I preparing" pointer. The dot is gold when the selected
// event is the one activated for the live matcher, muted otherwise (selected ≠ live is a real state).
const EventSwitcher: React.FC = () => {
    const { eventId, event, events, activation, setEventId, refresh } = useActiveEvent();
    const nav = useNavigate();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const live = !!eventId && activation.activatedId === eventId;
    const label = event?.title?.trim() || (events.length ? '(chưa chọn)' : 'Chưa có sự kiện');

    return (
        <div ref={ref} className="relative max-w-full">
            <button onClick={() => setOpen((o) => { if (!o) refresh(); return !o; })} title="Sự kiện đang chuẩn bị — bấm để đổi"
                className="group flex items-center gap-2.5 max-w-full rounded-lg px-3 py-1 hover:bg-surface-container/40 transition-colors">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${live ? 'bg-secondary' : 'bg-on-surface-variant/40'}`} title={live ? 'Đang kích hoạt cho matcher' : 'Đang chọn (chưa kích hoạt)'}></span>
                <span className="font-label-caps text-[11px] text-on-surface-variant/60 tracking-[0.18em] shrink-0">SỰ KIỆN</span>
                <span className="text-[21px] font-bold leading-none truncate min-w-0 text-[#a3e635]">{label}</span>
                <span className="material-symbols-outlined text-[24px] text-on-surface-variant/70 shrink-0 group-hover:text-on-surface transition-colors" aria-hidden="true">expand_more</span>
            </button>
            {open && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-72 max-h-[70vh] overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-high z-50 p-1.5" style={{ boxShadow: '0 18px 48px rgba(0,0,0,0.5)' }}>
                    <div className="font-label-caps text-label-caps text-on-surface-variant/60 px-2.5 py-1.5">Chọn sự kiện</div>
                    {events.length === 0 && <div className="px-2.5 py-2 text-sm text-on-surface-variant">Chưa có sự kiện nào.</div>}
                    {events.map((e) => {
                        const on = e.id === eventId;
                        const isLive = activation.activatedId === e.id;
                        return (
                            <button key={e.id} onClick={() => { setEventId(e.id); setOpen(false); }}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${on ? 'bg-secondary/15' : 'hover:bg-surface-container'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLive ? 'bg-secondary' : 'bg-on-surface-variant/30'}`}></span>
                                <span className="min-w-0 flex-1">
                                    <span className={`block text-sm truncate ${on ? 'text-secondary' : 'text-on-surface'}`}>{e.title.trim() || '(chưa đặt tên)'}</span>
                                    {e.date && <span className="block text-[11px] text-on-surface-variant tabular-nums">{e.date}</span>}
                                </span>
                                {on && <span className="material-symbols-outlined text-[18px] text-secondary shrink-0" aria-hidden="true">check</span>}
                            </button>
                        );
                    })}
                    <div className="border-t border-outline-variant mt-1 pt-1">
                        <button onClick={() => { setOpen(false); nav('/schedule'); }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-on-surface-variant hover:text-secondary hover:bg-surface-container transition-colors">
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Quản lý / Đặt lịch mới
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventSwitcher;
