import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useLiveSession, isSessionActive } from '../lib/LiveSessionContext';
import type { LiveStatus } from '../lib/LiveSessionContext';
import { hasUnsaved } from '../lib/guards';

// The ONE navigation spine — a compact ICON rail (Zoom/Teams app-rail style). Icon + tiny label,
// grouped by the event lifecycle, with a pinned SAFETY block (status + Emergency Stop) always
// visible. Narrow so the content area stays wide-open. Reads context only; owns no session state.

interface NavItem { to: string; label: string; icon: string; external?: boolean }
const NAV: NavItem[][] = [
    [{ to: '/prep', label: 'Chỉ huy', icon: 'dashboard' }],
    [
        { to: '/script', label: 'Kịch bản', icon: 'theater_comedy' },
        { to: '/glossary', label: 'Từ điển', icon: 'menu_book' },
        { to: '/voices', label: 'Giọng', icon: 'record_voice_over' },
    ],
    [
        { to: '/audio', label: 'Điều khiển', icon: 'tune' },
        { to: '/stream', label: 'Tường', icon: 'subtitles', external: true },
        { to: '/reveal', label: 'Reveal', icon: 'auto_awesome', external: true },
    ],
    [{ to: '/settings', label: 'Cài đặt', icon: 'settings' }],
];

function master(backendOnline: boolean, status: LiveStatus): { text: string; cls: string; dot: string } {
    if (!backendOnline) return { text: 'OFFLINE', cls: 'text-error', dot: 'bg-error' };
    switch (status) {
        case 'listening': return { text: 'LIVE', cls: 'text-secondary', dot: 'bg-secondary listening-pulse' };
        case 'ready': return { text: 'SẴN', cls: 'text-secondary', dot: 'bg-secondary' };
        case 'warming': return { text: 'WARM', cls: 'text-primary', dot: 'bg-primary listening-pulse' };
        case 'connecting': return { text: 'NỐI', cls: 'text-primary', dot: 'bg-primary listening-pulse' };
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
        if (isSessionActive(session.status) && !window.confirm('Phiên đang chạy — rời trang?')) { e.preventDefault(); return; }
        if (hasUnsaved() && !window.confirm('Có thay đổi chưa lưu — vẫn rời trang?')) e.preventDefault();
    };

    const itemClass = (isActive: boolean) =>
        `relative flex flex-col items-center justify-center gap-1 w-full py-2.5 rounded-lg transition-colors ${isActive
            ? 'bg-secondary text-on-secondary'
            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`;

    return (
        <div className="h-screen flex overflow-hidden bg-background text-on-background">
            <aside className="hidden md:flex flex-col w-[84px] shrink-0 bg-surface-container-lowest border-r border-outline-variant">
                <div className="h-14 flex items-center justify-center border-b border-outline-variant shrink-0">
                    <span className="font-bold text-lg text-secondary tracking-tight">P</span>
                    <span className="font-label-caps text-on-surface-variant text-sm">訳</span>
                </div>

                <nav className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-1">
                    {NAV.map((group, gi) => (
                        <React.Fragment key={gi}>
                            {gi > 0 && <div className="h-px bg-outline-variant/50 mx-2 my-1.5"></div>}
                            {group.map((it) => (
                                <NavLink key={it.to} to={it.to} title={it.label} onClick={(e) => guardLeave(e, it.to)} className={({ isActive }) => itemClass(isActive)}>
                                    <span className="material-symbols-outlined text-[22px]">{it.icon}</span>
                                    <span className="text-[10px] leading-none font-medium tracking-tight">{it.label}</span>
                                    {it.external && <span className="material-symbols-outlined absolute top-1 right-1 text-[11px] opacity-60">open_in_new</span>}
                                </NavLink>
                            ))}
                        </React.Fragment>
                    ))}
                </nav>

                <div className="border-t border-outline-variant p-2 flex flex-col items-center gap-2 shrink-0">
                    <div className="flex flex-col items-center gap-1 py-1" title={`Trạng thái: ${m.text}`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${m.dot}`}></span>
                        <span className={`font-label-caps text-[9px] leading-none ${m.cls}`}>{m.text}</span>
                    </div>
                    <button
                        onClick={() => session.stop()}
                        title="Dừng phiên ngay lập tức (khẩn cấp)"
                        className="w-full flex flex-col items-center gap-1 py-2 rounded-lg border border-error text-error hover:bg-error hover:text-on-error transition-colors">
                        <span className="material-symbols-outlined text-[20px]">pan_tool</span>
                        <span className="font-label-caps text-[9px] leading-none">DỪNG</span>
                    </button>
                </div>
            </aside>

            <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
                <Outlet />
            </div>
        </div>
    );
};

export default OperatorLayout;
