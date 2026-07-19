import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useLiveSession, isSessionActive } from '../lib/LiveSessionContext';
import type { LiveStatus } from '../lib/LiveSessionContext';

// The ONE navigation spine (IA Phase 1 — docs 19/22). Grouped by the event lifecycle,
// with a pinned SAFETY block (status + Emergency Stop) always visible from every operator page.
// Reads existing context only; does NOT own any session state.

interface NavItem { to: string; label: string; icon: string; external?: boolean }
const NAV: { group: string; items: NavItem[] }[] = [
    { group: 'Nhà', items: [{ to: '/prep', label: 'Bảng chỉ huy', icon: 'dashboard' }] },
    {
        group: 'Chuẩn bị', items: [
            { to: '/script', label: 'Kịch bản', icon: 'theater_comedy' },
            { to: '/glossary', label: 'Từ điển & Tên riêng', icon: 'menu_book' },
            { to: '/voices', label: 'Giọng đọc', icon: 'record_voice_over' },
        ],
    },
    {
        group: 'Vận hành', items: [
            { to: '/audio', label: 'Bàn điều khiển', icon: 'tune' },
            { to: '/stream', label: 'Tường phụ đề', icon: 'subtitles', external: true },
            { to: '/reveal', label: 'Reveal', icon: 'auto_awesome', external: true },
        ],
    },
];

function master(backendOnline: boolean, status: LiveStatus): { text: string; cls: string; dot: string } {
    if (!backendOnline) return { text: 'OFFLINE', cls: 'text-error', dot: 'bg-error' };
    switch (status) {
        case 'listening': return { text: 'ĐANG LIVE', cls: 'text-secondary', dot: 'bg-secondary listening-pulse' };
        case 'ready': return { text: 'SẴN SÀNG', cls: 'text-secondary', dot: 'bg-secondary' };
        case 'warming': return { text: 'ĐANG WARM', cls: 'text-primary', dot: 'bg-primary listening-pulse' };
        case 'connecting': return { text: 'ĐANG NỐI', cls: 'text-primary', dot: 'bg-primary listening-pulse' };
        case 'reconnecting': return { text: 'NỐI LẠI', cls: 'text-error', dot: 'bg-error listening-pulse' };
        case 'error': return { text: 'LỖI', cls: 'text-error', dot: 'bg-error' };
        default: return { text: 'CHỜ', cls: 'text-on-surface-variant', dot: 'bg-on-surface-variant' };
    }
}

const OperatorLayout: React.FC = () => {
    const session = useLiveSession();
    const loc = useLocation();
    const m = master(session.backendOnline, session.status);

    // Confirm before leaving a live/warming session so the console isn't unmounted by accident.
    // Emergency Stop is NEVER guarded.
    const guardLeave = (e: React.MouseEvent, to: string) => {
        if (to === loc.pathname) return;
        if (isSessionActive(session.status) && !window.confirm('Phiên đang chạy — rời trang?')) e.preventDefault();
    };

    const itemClass = (isActive: boolean) =>
        `flex items-center gap-3 px-3 py-2 rounded-DEFAULT font-medium text-sm transition-colors ${isActive
            ? 'bg-secondary text-on-secondary'
            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`;

    return (
        <div className="h-screen flex overflow-hidden bg-background text-on-background">
            <aside className="hidden md:flex flex-col w-60 shrink-0 bg-surface-container-lowest border-r border-outline-variant">
                <div className="px-5 h-16 flex items-center border-b border-outline-variant shrink-0">
                    <span className="font-bold text-lg text-secondary tracking-tight">PROYAKU</span>
                    <span className="ml-2 font-label-caps text-label-caps text-on-surface-variant">訳</span>
                </div>

                <nav className="flex-1 overflow-y-auto py-3">
                    {NAV.map((g) => (
                        <div key={g.group} className="px-3 mb-3">
                            <div className="px-3 py-1.5 font-label-caps text-label-caps text-on-surface-variant">{g.group}</div>
                            {g.items.map((it) => (
                                <NavLink key={it.to} to={it.to} onClick={(e) => guardLeave(e, it.to)} className={({ isActive }) => itemClass(isActive)}>
                                    <span className="material-symbols-outlined text-xl">{it.icon}</span>
                                    <span className="truncate">{it.label}</span>
                                    {it.external && <span className="material-symbols-outlined text-sm ml-auto opacity-70">open_in_new</span>}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="border-t border-outline-variant p-3">
                    <div className="px-1 pb-1.5 font-label-caps text-label-caps text-on-surface-variant">An toàn</div>
                    <div className="flex items-center gap-2 px-1 pb-2.5 text-sm">
                        <span className={`w-2 h-2 rounded-full ${m.dot}`}></span>
                        <span className={m.cls}>{m.text}</span>
                    </div>
                    <button
                        onClick={() => session.stop()}
                        title="Dừng phiên ngay lập tức"
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-DEFAULT border border-error text-error font-label-caps text-label-caps hover:bg-error hover:text-on-error transition-colors">
                        <span className="material-symbols-outlined text-lg">pan_tool</span> Dừng khẩn cấp
                    </button>
                </div>
            </aside>

            <div className="flex-1 min-w-0 overflow-y-auto">
                <Outlet />
            </div>
        </div>
    );
};

export default OperatorLayout;
