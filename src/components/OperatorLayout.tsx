import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLiveSession, isSessionActive } from '../lib/LiveSessionContext';
import type { LiveStatus } from '../lib/LiveSessionContext';
import { hasUnsaved } from '../lib/guards';

// Navigation spine: a full-width HEAD BAR (logo · 3 primary menus · status + Emergency Stop ·
// Settings gear on the right, pro-app style) plus a CONTEXTUAL left SIDEBAR whose tools swap with
// the active menu. Reads session context only; owns no session state.

interface Tool { label: string; icon: string; to?: string; hash?: string; external?: boolean; soon?: boolean }
interface Menu { key: string; label: string; gear?: boolean; match: string[]; tools: Tool[] }

const MENUS: Menu[] = [
    { key: 'prep', label: 'Chuẩn bị', match: ['/prep', '/script', '/glossary', '/voices'], tools: [
        { label: 'Tổng quan', icon: 'dashboard', to: '/prep' },
        { label: 'Đặt lịch', icon: 'event', soon: true },
        { label: 'Kịch bản', icon: 'description', to: '/script' },
        { label: 'Từ điển', icon: 'menu_book', to: '/glossary' },
        { label: 'Giọng đọc', icon: 'record_voice_over', to: '/voices' },
        { label: 'Bộ nhớ', icon: 'psychology', soon: true },
    ] },
    { key: 'ops', label: 'Dịch hội nghị', match: ['/audio'], tools: [
        { label: 'Điều khiển', icon: 'tune', to: '/audio' },
        { label: 'Phụ đề', icon: 'subtitles', to: '/stream', external: true },
        { label: 'Reveal', icon: 'auto_awesome', to: '/reveal', external: true },
    ] },
    { key: 'report', label: 'Báo cáo', match: ['/report'], tools: [
        { label: 'Tình trạng', icon: 'monitor_heart', to: '/report', hash: 'status' },
        { label: 'Nhật ký', icon: 'history', to: '/report', hash: 'log' },
    ] },
    { key: 'settings', label: 'Cài đặt', gear: true, match: ['/settings'], tools: [
        { label: 'Kết nối', icon: 'lan', to: '/settings', hash: 'kn' },
        { label: 'Sự kiện', icon: 'event', to: '/settings', hash: 'sk' },
        { label: 'Phụ đề', icon: 'format_size', to: '/settings', hash: 'pd' },
        { label: 'Giọng đọc', icon: 'record_voice_over', to: '/settings', hash: 'gd' },
        { label: 'Tài khoản', icon: 'account_circle', to: '/settings', hash: 'tk' },
        { label: 'Dữ liệu', icon: 'database', to: '/settings', hash: 'dl' },
    ] },
];
const GEAR = MENUS.find((mm) => mm.gear) as Menu;

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

const menuOf = (path: string): Menu =>
    MENUS.find((mm) => mm.match.some((p) => path === p || path.startsWith(p + '/'))) ?? MENUS[0];

// Smooth-scroll a section into view (Settings / Báo cáo anchor tools). Small delay lets a freshly
// navigated page render its sections first.
const scrollToHash = (id: string) =>
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);

const OperatorLayout: React.FC = () => {
    const session = useLiveSession();
    const loc = useLocation();
    const nav = useNavigate();
    const m = master(session.backendOnline, session.status);
    const cur = menuOf(loc.pathname);
    const firstHash = cur.tools.find((t) => t.hash)?.hash;

    // On landing with a hash in the URL (e.g. cross-page nav to /settings#dl), scroll after render.
    useEffect(() => { if (loc.hash) scrollToHash(loc.hash.slice(1)); }, [loc.pathname, loc.hash]);

    // Confirm before leaving a live/warming session or with unsaved edits. Emergency Stop is never guarded.
    const confirmLeave = (): boolean => {
        if (isSessionActive(session.status) && !window.confirm('Phiên đang chạy — rời trang?')) return false;
        if (hasUnsaved() && !window.confirm('Có thay đổi chưa lưu — vẫn rời trang?')) return false;
        return true;
    };

    const goMenu = (menu: Menu) => {
        if (menu.key === cur.key) return;                     // already here
        const first = menu.tools.find((t) => t.to && !t.external);
        if (first?.to && confirmLeave()) nav(first.to);
    };

    const openTool = (t: Tool) => {
        if (t.soon || !t.to) return;
        if (t.external) { window.open(t.to, '_blank', 'noopener'); return; }
        const samePage = t.to === loc.pathname;
        if (samePage && !t.hash) return;                      // already on this tool
        if (!samePage && !confirmLeave()) return;
        nav(t.hash ? `${t.to}#${t.hash}` : t.to);
        if (samePage && t.hash) scrollToHash(t.hash);         // re-scroll even if the hash didn't change
    };

    const toolActive = (t: Tool): boolean => {
        if (t.soon || !t.to || t.to !== loc.pathname) return false;
        if (!t.hash) return !loc.hash;
        return loc.hash ? loc.hash === `#${t.hash}` : t.hash === firstHash;
    };

    const tabCls = (on: boolean) =>
        `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-secondary/15 text-secondary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`;

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-background text-on-background">
            {/* ══════════ HEAD BAR ══════════ */}
            <header className="shrink-0 h-14 flex items-center gap-2 px-4 border-b border-outline-variant bg-surface-container-lowest">
                <span className="font-bold text-lg tracking-[0.22em] text-on-surface select-none shrink-0 pr-1">PROYAKU</span>
                <nav className="flex items-center gap-1">
                    {MENUS.filter((mm) => !mm.gear).map((mm) => (
                        <button key={mm.key} onClick={() => goMenu(mm)} className={tabCls(mm.key === cur.key)}>{mm.label}</button>
                    ))}
                </nav>
                <div className="flex-1"></div>
                <div className="flex items-center gap-1.5 mr-1" title={`Trạng thái: ${m.text}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${m.dot}`}></span>
                    <span className={`font-label-caps text-[10px] ${m.cls}`}>{m.text}</span>
                </div>
                <button onClick={() => session.stop()} title="Dừng phiên ngay (khẩn cấp)"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-error text-error hover:bg-error hover:text-on-error transition-colors">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">pan_tool</span>
                    <span className="font-label-caps text-[10px] leading-none">DỪNG</span>
                </button>
                <div className="w-px h-6 bg-outline-variant mx-1"></div>
                <button onClick={() => goMenu(GEAR)} title="Cài đặt" className={`flex items-center gap-1.5 ${tabCls(GEAR.key === cur.key)}`}>
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">settings</span>
                    <span className="hidden sm:inline">Cài đặt</span>
                </button>
            </header>

            {/* ══════════ BODY: contextual sidebar + content ══════════ */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
                <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-outline-variant bg-surface-container-lowest">
                    <div className="px-4 pt-4 pb-2 font-label-caps text-label-caps text-on-surface-variant/60">{cur.label}</div>
                    <nav className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
                        {cur.tools.map((t) => {
                            const on = toolActive(t);
                            return (
                                <button key={t.label} onClick={() => openTool(t)} disabled={t.soon} title={t.soon ? 'Sắp có' : t.label}
                                    className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${t.soon
                                        ? 'text-on-surface-variant/35 cursor-not-allowed'
                                        : on ? 'bg-secondary/15 text-secondary'
                                            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}>
                                    {on && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-secondary" aria-hidden="true"></span>}
                                    <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">{t.icon}</span>
                                    <span className="text-sm font-medium flex-1 min-w-0">{t.label}</span>
                                    {t.external && <span className="material-symbols-outlined text-[15px] opacity-50 shrink-0" aria-hidden="true">open_in_new</span>}
                                    {t.soon && <span className="font-label-caps text-[9px] px-1.5 py-0.5 rounded-full border border-outline-variant text-on-surface-variant/50 shrink-0">sắp có</span>}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default OperatorLayout;
