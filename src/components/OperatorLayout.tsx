import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLiveSession, isSessionActive } from '../lib/LiveSessionContext';
import type { LiveStatus } from '../lib/LiveSessionContext';
import { hasUnsaved } from '../lib/guards';
import EventSwitcher from './EventSwitcher';

// Navigation spine: a full-width HEAD BAR (logo · 3 primary menus · status + Emergency Stop ·
// Settings gear on the right, pro-app style) plus a CONTEXTUAL left SIDEBAR whose tools swap with
// the active menu. Reads session context only; owns no session state.

interface Tool { label: string; icon: string; desc: string; to?: string; hash?: string; external?: boolean; soon?: boolean }
interface Menu { key: string; label: string; gear?: boolean; match: string[]; tools: Tool[] }

const MENUS: Menu[] = [
    { key: 'prep', label: 'Chuẩn bị', match: ['/prep', '/script', '/glossary', '/voices', '/schedule', '/speakers', '/documents'], tools: [
        { label: 'Tổng quan', icon: 'dashboard', desc: 'Bảng sẵn sàng GO/NO-GO và đếm ngược.', to: '/prep' },
        { label: 'Đặt lịch', icon: 'calendar_month', desc: 'Lịch hội nghị: ngày, người đặt, diễn giả.', to: '/schedule' },
        { label: 'Tài liệu', icon: 'folder_open', desc: 'Thư viện tài liệu nguồn cho sự kiện.', to: '/documents' },
        { label: 'Kịch bản', icon: 'description', desc: 'Câu kịch bản song ngữ Việt–Nhật đã duyệt.', to: '/script' },
        { label: 'Từ điển', icon: 'menu_book', desc: 'Thuật ngữ và danh từ riêng cần giữ đúng.', to: '/glossary' },
        { label: 'Giọng đọc', icon: 'record_voice_over', desc: 'Giọng đọc và luyện phát âm từng ngôn ngữ.', to: '/voices' },
        { label: 'Bộ nhớ', icon: 'psychology', desc: 'Hồ sơ diễn giả: tên, biệt danh, giọng.', to: '/speakers' },
    ] },
    { key: 'report', label: 'Báo cáo', match: ['/report'], tools: [
        { label: 'Tình trạng', icon: 'monitor_heart', desc: 'Tình trạng hệ thống theo thời gian thực.', to: '/report', hash: 'status' },
        { label: 'Nhật ký', icon: 'history', desc: 'Nhật ký hoạt động các phiên làm việc.', to: '/report', hash: 'log' },
    ] },
    { key: 'ops', label: 'Dịch hội nghị', match: ['/audio'], tools: [
        { label: 'Điều khiển', icon: 'tune', desc: 'Bàn điều khiển dịch trực tiếp hội nghị.', to: '/audio' },
        { label: 'Phụ đề', icon: 'subtitles', desc: 'Màn chiếu phụ đề cho khán giả (tab mới).', to: '/stream', external: true },
        { label: 'Reveal', icon: 'auto_awesome', desc: 'Màn chiếu khoảnh khắc công bố (tab mới).', to: '/reveal', external: true },
    ] },
    { key: 'settings', label: 'Cài đặt', gear: true, match: ['/settings'], tools: [
        { label: 'Kết nối', icon: 'lan', desc: 'Kết nối tới máy chủ xử lý.', to: '/settings', hash: 'kn' },
        { label: 'Sự kiện', icon: 'event', desc: 'Thông tin và cấu hình sự kiện.', to: '/settings', hash: 'sk' },
        { label: 'Phụ đề', icon: 'format_size', desc: 'Cỡ chữ và hiển thị phụ đề.', to: '/settings', hash: 'pd' },
        { label: 'Giọng đọc', icon: 'record_voice_over', desc: 'Giọng đọc mặc định theo ngôn ngữ.', to: '/settings', hash: 'gd' },
        { label: 'Tài khoản', icon: 'account_circle', desc: 'Tài khoản và thông tin đăng nhập.', to: '/settings', hash: 'tk' },
        { label: 'Dữ liệu', icon: 'database', desc: 'Xuất và xóa dữ liệu ứng dụng.', to: '/settings', hash: 'dl' },
    ] },
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
    // "Dịch hội nghị" tách khỏi nhóm tab trái → pill riêng (kiểu tikme) đặt cạnh Sự kiện.
    const opsMenu = MENUS.find((mm) => mm.key === 'ops')!;
    const opsActive = cur.key === 'ops';
    const firstHash = cur.tools.find((t) => t.hash)?.hash;

    // On landing with a hash in the URL (e.g. cross-page nav to /settings#dl), scroll after render.
    useEffect(() => { if (loc.hash) scrollToHash(loc.hash.slice(1)); }, [loc.pathname, loc.hash]);

    // Sidebar rail: expanded (icon + tên + mô tả) ↔ thu gọn (chỉ icon). Persist per operator.
    // Lazy read so the correct width paints on first render (no flash). Default = expanded.
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('proyaku_rail_collapsed') === '1'; } catch { return false; }
    });
    useEffect(() => {
        try { localStorage.setItem('proyaku_rail_collapsed', collapsed ? '1' : '0'); } catch { /* ignore quota/private-mode */ }
    }, [collapsed]);

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

    return (
        <div className="h-screen flex flex-col overflow-clip text-on-background app-aurora">
            {/* ══════════ HEAD BAR ══════════ */}
            <header className="relative !z-20 shrink-0 h-16 flex items-center px-4 pr-2.5 border-b border-outline-variant shell-rail font-jakarta">
                {/* Thương hiệu — chữ Latin, dùng Sora; canh trái 16px thẳng cột với tiêu đề sidebar */}
                <span className="font-sora font-bold text-[20px] tracking-[0.16em] leading-none text-on-surface select-none shrink-0" style={{ textShadow: '0 0 18px rgba(244,208,106,0.20)' }}>PROYAKU</span>
                {/* Menu chính — 3 tab full-height (Chuẩn bị · Báo cáo · Cài đặt), gạch chân vàng khi active (kiểu cũ).
                    "Dịch hội nghị" KHÔNG nằm ở đây — nó là pill riêng (kiểu tikme) đặt cạnh Sự kiện, xem bên dưới. */}
                <nav aria-label="Điều hướng chính" className="h-full flex items-center gap-1 ml-8">
                    {MENUS.filter((mm) => mm.key !== 'ops').map((mm) => {
                        const on = mm.key === cur.key;
                        return (
                            <button key={mm.key} onClick={() => goMenu(mm)} aria-current={on ? 'page' : undefined}
                                className={`relative h-full flex items-center px-4 text-[17px] font-medium leading-none transition-colors focus-visible:[outline-offset:-2px] ${on ? 'text-secondary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                                {mm.label}
                                {on && <span aria-hidden="true" className="absolute inset-x-3 bottom-[-1px] h-[3px] rounded-t-full bg-secondary"></span>}
                            </button>
                        );
                    })}
                </nav>
                {/* Cụm GIỮA — pill "Dịch hội nghị" (kiểu tikme Omni Channel) đứng sát TRÁI, rồi tới Sự kiện */}
                <div className="flex-1 min-w-0 flex items-center justify-center gap-3 px-4">
                    {/* Dịch hội nghị — pill: ĐANG MỞ = gradient cam→vàng + chữ tối + glow; CHƯA VÀO = nền tối, viền mờ */}
                    <button onClick={() => goMenu(opsMenu)} aria-current={opsActive ? 'page' : undefined}
                        title="Dịch hội nghị — bàn điều khiển dịch trực tiếp"
                        style={opsActive ? { background: 'linear-gradient(90deg, #f97316 0%, #f0a93a 52%, #f4d06a 100%)', boxShadow: '0 8px 22px -8px rgba(249,115,22,0.55)' } : undefined}
                        className={`shrink-0 flex items-center gap-2 pl-3.5 pr-3 py-2 rounded-full text-[18px] font-semibold leading-none whitespace-nowrap transition-all focus-visible:[outline-offset:2px] ${opsActive
                            ? 'text-on-secondary ring-1 ring-[#fdba74]/60'
                            : 'text-on-surface-variant border border-outline-variant bg-surface-container/50 hover:text-on-surface hover:border-outline hover:bg-surface-container'}`}>
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">graphic_eq</span>
                        {opsMenu.label}
                        <span className="material-symbols-outlined text-[20px] opacity-80" aria-hidden="true">chevron_right</span>
                    </button>
                    <EventSwitcher />
                </div>
                {/* Đèn trạng thái — chỉ dùng màu, không viền */}
                <div role="status" aria-live="polite" aria-label={`Trạng thái: ${m.text}`} className="flex items-center gap-2 mr-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${m.dot}`} aria-hidden="true"></span>
                    <span className={`text-[11px] font-semibold tracking-[0.1em] leading-none ${m.cls}`}>{m.text}</span>
                </div>
                {/* Dừng khẩn cấp — control duy nhất màu đỏ, luôn sẵn sàng */}
                <button onClick={() => session.stop()} title="Dừng phiên ngay (khẩn cấp)" aria-label="Dừng phiên khẩn cấp"
                    className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-error text-error hover:bg-error hover:text-on-error transition-colors">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">pan_tool</span>
                    <span className="text-[11px] font-semibold tracking-[0.06em] leading-none">DỪNG</span>
                </button>
            </header>

            {/* ══════════ BODY: contextual sidebar + content ══════════ */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
                <aside className={`hidden md:flex flex-col shrink-0 border-r border-outline-variant shell-rail rail-aside font-jakarta overflow-hidden ${collapsed ? 'w-16' : 'w-[248px]'}`}>
                    {collapsed
                        ? <div className="mx-auto my-3 h-px w-6 bg-outline-variant" aria-hidden="true"></div>
                        : <div className="px-4 pt-4 pb-2 font-label-caps text-label-caps text-on-surface-variant/60 truncate">{cur.label}</div>}
                    <nav id="proyaku-rail-nav" aria-label={`Công cụ ${cur.label}`} className="flex-1 overflow-y-auto px-2 pt-1.5 pb-3 space-y-0.5">
                        {cur.tools.map((t) => {
                            const on = toolActive(t);
                            return (
                                <button key={t.label} onClick={() => openTool(t)} disabled={t.soon}
                                    aria-current={on ? 'page' : undefined}
                                    aria-label={t.label + (t.external ? ' (mở tab mới)' : '')}
                                    title={collapsed ? `${t.label} — ${t.desc}` : t.label}
                                    className={`group relative w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${collapsed ? 'gap-0' : 'gap-3'} ${t.soon
                                        ? 'text-on-surface-variant/35 cursor-not-allowed'
                                        : on ? 'bg-secondary/15 text-secondary'
                                            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}>
                                    {on && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-secondary" aria-hidden="true"></span>}
                                    <span className="material-symbols-outlined shrink-0" aria-hidden="true"
                                        style={{ fontSize: collapsed ? '24px' : '20px', fontVariationSettings: on ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400" }}>{t.icon}</span>
                                    <span className={`rail-labels min-w-0 flex flex-col ${collapsed ? 'w-0 opacity-0 -translate-x-1 overflow-hidden' : 'flex-1 opacity-100 translate-x-0'}`} aria-hidden="true">
                                        <span className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-[19px] font-medium leading-snug truncate min-w-0">{t.label}</span>
                                            {t.external && <span className="material-symbols-outlined text-[15px] opacity-50 shrink-0">open_in_new</span>}
                                            {t.soon && <span className="font-label-caps text-[9px] px-1.5 py-0.5 rounded-full border border-outline-variant text-on-surface-variant/50 shrink-0">sắp có</span>}
                                        </span>
                                        <span className="text-xs text-on-surface-variant/90 leading-snug truncate">{t.desc}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </nav>
                    <div className="shrink-0 border-t border-outline-variant p-2">
                        <button onClick={() => setCollapsed((v) => !v)}
                            aria-label={collapsed ? 'Mở rộng thanh công cụ' : 'Thu gọn thanh công cụ'}
                            aria-expanded={!collapsed} aria-controls="proyaku-rail-nav"
                            title={collapsed ? 'Mở rộng thanh công cụ' : 'Thu gọn thanh công cụ'}
                            className={`w-full flex items-center rounded-lg px-3 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors ${collapsed ? 'gap-0' : 'gap-3'}`}>
                            <span className="material-symbols-outlined shrink-0" aria-hidden="true" style={{ fontSize: '22px' }}>{collapsed ? 'left_panel_open' : 'left_panel_close'}</span>
                            <span className={`rail-labels font-label-caps text-label-caps whitespace-nowrap ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'opacity-100'}`}>Thu gọn</span>
                        </button>
                    </div>
                </aside>

                <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default OperatorLayout;
