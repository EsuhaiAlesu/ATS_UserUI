import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLiveSession, isSessionActive } from '../lib/LiveSessionContext';
import type { LiveStatus } from '../lib/LiveSessionContext';
import { useConferenceMode } from '../lib/ConferenceModeContext';
import { hasUnsaved } from '../lib/guards';
import EventSwitcher from './EventSwitcher';

// Navigation spine: a full-width HEAD BAR (logo · 3 primary menus · status + Emergency Stop ·
// Settings gear on the right, pro-app style) plus a CONTEXTUAL left SIDEBAR whose tools swap with
// the active menu. Reads session context only; owns no session state.

interface Tool { label: string; icon: string; desc: string; to?: string; hash?: string; external?: boolean; soon?: boolean }
interface Menu { key: string; label: string; gear?: boolean; match: string[]; tools: Tool[] }

// desc = dòng phụ chú ngắn (tối đa 4–5 chữ); hiển thị dưới nhãn, đổi xanh lá non khi active.
const MENUS: Menu[] = [
    { key: 'prep', label: 'Chuẩn bị', match: ['/prep', '/script', '/glossary', '/voices', '/schedule', '/speakers', '/documents', '/program'], tools: [
        { label: 'Tổng quan', icon: 'dashboard', desc: 'Sẵn sàng & đếm ngược', to: '/prep' },
        { label: 'Đặt lịch', icon: 'calendar_month', desc: 'Lịch hội nghị, diễn giả', to: '/schedule' },
        { label: 'Tài liệu', icon: 'folder_open', desc: 'Thư viện tài liệu nguồn', to: '/documents' },
        { label: 'Chương trình', icon: 'event_note', desc: 'Timeline & người nói', to: '/program' },
        { label: 'Kịch bản', icon: 'description', desc: 'Câu song ngữ đã duyệt', to: '/script' },
        { label: 'Từ điển', icon: 'menu_book', desc: 'Thuật ngữ & tên riêng', to: '/glossary' },
        { label: 'Giọng đọc', icon: 'record_voice_over', desc: 'Luyện giọng & phát âm', to: '/voices' },
        { label: 'Bộ nhớ', icon: 'psychology', desc: 'Hồ sơ diễn giả, giọng', to: '/speakers' },
    ] },
    { key: 'report', label: 'Báo cáo', match: ['/report'], tools: [
        { label: 'Tình trạng', icon: 'monitor_heart', desc: 'Hệ thống thời gian thực', to: '/report', hash: 'status' },
        { label: 'Nhật ký', icon: 'history', desc: 'Hoạt động từng phiên', to: '/report', hash: 'log' },
    ] },
    { key: 'ops', label: 'Dịch hội nghị', match: ['/console', '/audio'], tools: [
        { label: 'Điều khiển', icon: 'tune', desc: 'Bàn dịch trực tiếp', to: '/console' },
        { label: 'Phụ đề', icon: 'subtitles', desc: 'Màn chiếu cho khán giả', to: '/stream', external: true },
        { label: 'Reveal', icon: 'auto_awesome', desc: 'Màn công bố khoảnh khắc', to: '/reveal', external: true },
    ] },
    { key: 'settings', label: 'Cài đặt', gear: true, match: ['/settings'], tools: [
        { label: 'Kết nối', icon: 'lan', desc: 'Máy chủ xử lý dịch', to: '/settings', hash: 'kn' },
        { label: 'Phụ đề', icon: 'format_size', desc: 'Cỡ chữ & hiển thị', to: '/settings', hash: 'pd' },
        { label: 'Tài khoản', icon: 'account_circle', desc: 'Thông tin đăng nhập', to: '/settings', hash: 'tk' },
        { label: 'Dữ liệu', icon: 'database', desc: 'Xuất & xóa dữ liệu', to: '/settings', hash: 'dl' },
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
    const { mode, setMode, busy, requestStop } = useConferenceMode();
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

    // Mobile navigation drawer (below xl the desktop rail + top nav are hidden). Unmounted while
    // closed, so nothing inside it is tabbable; while open it traps focus and closes on Escape.
    const [drawerOpen, setDrawerOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    // The control that opened the drawer (the hamburger) — focus returns to it on close (WCAG 2.4.3).
    const openerRef = useRef<HTMLElement | null>(null);
    useEffect(() => { setDrawerOpen(false); }, [loc.pathname, loc.hash]); // any navigation closes it
    useEffect(() => {
        if (!drawerOpen) return;
        const el = drawerRef.current;
        if (!el) return;
        const focusables = () => Array.from(
            el.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'),
        ).filter((f) => !f.hasAttribute('disabled'));
        focusables()[0]?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.preventDefault(); setDrawerOpen(false); return; }
            if (e.key !== 'Tab') return;
            const f = focusables();
            if (f.length === 0) return;
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKey);
        // On close, move focus back to the opener (still mounted in the header) instead of letting the
        // browser drop it to <body> when the drawer subtree unmounts.
        return () => {
            document.removeEventListener('keydown', onKey);
            openerRef.current?.focus?.();
        };
    }, [drawerOpen]);

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
        <>
        <div className="h-[100dvh] flex flex-col overflow-clip text-on-background app-aurora">
            {/* ══════════ HEAD BAR ══════════ */}
            <header className="relative !z-20 shrink-0 h-14 xl:h-20 flex items-center gap-1 px-3 xl:px-4 xl:pr-2.5 border-b border-outline-variant shell-rail font-jakarta">
                {/* Hamburger — dưới xl (điện thoại + tablet): mở ngăn điều hướng thay cho sidebar/nav desktop.
                    Ngưỡng xl (không lg/md) vì header desktop đầy đủ (nav 21px + pill + Sự kiện) chỉ đủ chỗ từ ~1280px. */}
                <button type="button" onClick={(e) => { openerRef.current = e.currentTarget; setDrawerOpen(true); }} aria-label="Mở menu điều hướng"
                    aria-expanded={drawerOpen} aria-controls="proyaku-mobile-drawer"
                    className="xl:hidden shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined" aria-hidden="true">menu</span>
                </button>
                {/* Thương hiệu — logo chính thức (bản CÓ slogan, phối màu cho nền tối, đã vector hoá hoàn
                    toàn nên không gọi phông nào). Ảnh nằm trong public/ nên đi thẳng cùng bản build, không
                    phụ thuộc mạng — hội trường có thể bị cô lập internet.
                    `alt` mang tên thương hiệu để trình đọc màn hình và ảnh-hỏng vẫn đọc ra "PROYAKU". */}
                <img src="/proyaku/svg/proyaku-chinh-nen-trong.svg" alt="PROYAKU — Phiên dịch Việt ⇄ Nhật"
                    className="h-8 xl:h-9 2xl:h-11 w-auto select-none shrink-0" draggable={false}
                    style={{ filter: 'drop-shadow(0 0 18px rgba(244,208,106,0.20))' }} />
                {/* Menu chính — 3 tab full-height (Chuẩn bị · Báo cáo · Cài đặt), gạch chân vàng khi active (kiểu cũ).
                    Ẩn dưới xl → đưa vào ngăn điều hướng (hamburger).
                    "Dịch hội nghị" KHÔNG nằm ở đây — nó là pill riêng (kiểu tikme) đặt cạnh Sự kiện, xem bên dưới. */}
                <nav aria-label="Điều hướng chính" className="hidden xl:flex h-full items-center gap-1 ml-4 2xl:ml-8">
                    {MENUS.filter((mm) => mm.key !== 'ops').map((mm) => {
                        const on = mm.key === cur.key;
                        return (
                            <button key={mm.key} onClick={() => goMenu(mm)} aria-current={on ? 'page' : undefined}
                                className={`relative h-full flex items-center px-3 2xl:px-4 text-[18px] 2xl:text-[21px] font-medium leading-none transition-colors focus-visible:[outline-offset:-2px] ${on ? 'text-secondary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                                {mm.label}
                                {on && <span aria-hidden="true" className="absolute inset-x-3 bottom-[-1px] h-[3px] rounded-t-full bg-secondary"></span>}
                            </button>
                        );
                    })}
                </nav>
                {/* Cụm GIỮA — pill "Dịch hội nghị" (kiểu tikme Omni Channel) đứng sát TRÁI, rồi tới Sự kiện */}
                <div className="flex-1 min-w-0 flex items-center justify-center gap-2 px-2 2xl:gap-3 2xl:px-4">
                    {/* Dịch hội nghị — pill KHỚP 99% "Omni Channel" của Tikme: ĐANG MỞ = gradient cam→hổ phách
                        (#f97316 0/50% → #f59e0b) + viền cam 2px #fdba74 + glow cam + chấm trắng + chữ HOA extrabold
                        11px letter-spacing + chevron mảnh; CHƯA VÀO = pill tối viền mờ + chấm cam (kiểu "My Page"). */}
                    <button onClick={() => goMenu(opsMenu)} aria-current={opsActive ? 'page' : undefined}
                        title="Dịch hội nghị — bàn điều khiển dịch trực tiếp"
                        style={opsActive ? {
                            backgroundImage: 'linear-gradient(to right, #f97316 0%, #f97316 50%, #f59e0b 100%)',
                            borderColor: '#fdba74',
                            boxShadow: '0 8px 24px -6px rgba(251, 146, 60, 0.75)',
                        } : undefined}
                        className={`shrink-0 hidden xl:flex items-center gap-1.5 2xl:gap-2 rounded-full border-2 px-3.5 2xl:px-5 py-2 whitespace-nowrap transition-all focus-visible:[outline-offset:2px] ${opsActive
                            ? 'text-white'
                            : 'text-on-surface-variant border-outline-variant bg-surface-container/50 hover:text-on-surface hover:border-outline hover:bg-surface-container'}`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${opsActive ? 'bg-white' : 'bg-[#fb923c]'}`} aria-hidden="true"></span>
                        <span className="text-[13px] 2xl:text-[15px] font-extrabold uppercase tracking-wide 2xl:tracking-wider leading-none">{opsMenu.label}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={opsActive ? '' : 'opacity-80'} aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                    <div className="hidden xl:block"><EventSwitcher /></div>
                </div>
                {/* ══ Cụm điều khiển phiên (chuyển luồng · đèn trạng thái · DỪNG) ══
                    Chỉ hiện trên bàn điều khiển (ops), HOẶC khi một phiên OFFLINE vẫn đang chạy sau khi
                    rời trang (để DỪNG luôn trong tầm tay). Trên Chuẩn bị/Báo cáo/Cài đặt khi KHÔNG có phiên
                    thì ẩn cả cụm — nếu không người dùng đọc "OFFLINE + DỪNG" là tưởng đang có gì đó lỗi. */}
                {(opsActive || isSessionActive(session.status)) && (
                <>
                    {/* Chuyển luồng OFFLINE|ONLINE — chỉ khi đang ở bàn điều khiển (luồng vô nghĩa ở trang khác).
                        Khoá khi đang chạy: never two captures. Nhãn "LUỒNG" chỉ hiện từ xl. */}
                    {opsActive && (
                        <div className="flex items-center gap-1.5 mr-1 shrink-0">
                            <span className="hidden xl:inline font-label-caps text-[10px] tracking-[0.14em] text-on-surface-variant/60 select-none">LUỒNG</span>
                            <div className="flex items-center gap-0.5 rounded-full border border-outline-variant bg-surface p-0.5" role="group" aria-label="Luồng dịch">
                                {(['offline', 'online'] as const).map((lm) => (
                                    <button key={lm} type="button" disabled={busy} onClick={() => setMode(lm)}
                                        aria-pressed={mode === lm}
                                        title={busy ? 'Đang chạy — hãy Dừng trước khi đổi luồng' : (lm === 'online' ? 'ONLINE — dịch qua dịch vụ đám mây' : 'OFFLINE — dịch qua máy chủ nội bộ')}
                                        className={`h-7 px-2.5 rounded-full text-[11px] font-bold tracking-wide transition-colors ${mode === lm ? (lm === 'online' ? 'bg-secondary text-on-secondary shadow' : 'bg-primary text-on-primary shadow') : 'text-on-surface-variant hover:text-on-surface'} ${busy ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        {lm === 'offline' ? 'OFFLINE' : 'ONLINE'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Đèn trạng thái đọc backend OFFLINE — trên luồng ONLINE bàn điều khiển có annunciator riêng,
                        nên ẩn đèn này trừ khi một phiên OFFLINE thực sự đang chạy (kẻo in "OFFLINE" cạnh "ONLINE"). */}
                    {(mode === 'offline' || isSessionActive(session.status)) && (
                        <div role="status" aria-live="polite" aria-label={`Trạng thái: ${m.text}`} className="flex items-center gap-2 mr-1 md:mr-2 shrink-0">
                            <span className={`w-2.5 h-2.5 rounded-full ${m.dot}`} aria-hidden="true"></span>
                            {/* Chữ trạng thái ẩn dưới sm (chấm màu vẫn là chỉ báo trạng thái) để header không tràn trên điện thoại */}
                            <span className={`hidden sm:inline text-[11px] font-semibold tracking-[0.1em] leading-none ${m.cls}`}>{m.text}</span>
                        </div>
                    )}
                    {/* Dừng khẩn cấp — dừng luồng nào đang sống. ẨN trên luồng ONLINE (bàn điều khiển có nút
                        "Dừng dịch" đỏ to hơn ngay trên rail), NHƯNG giữ lại bất cứ khi nào một phiên OFFLINE
                        còn chạy (đó là cách duy nhất để dừng nó từ đây). Không đổi thành mode==='offline':
                        như vậy sẽ mất nút dừng khẩn khi ai đó gạt luồng lúc phiên OFFLINE đang sống. */}
                    {!(mode === 'online' && !isSessionActive(session.status)) && (
                        <button onClick={() => { session.stop(); requestStop(); }} title="Dừng phiên ngay (khẩn cấp)" aria-label="Dừng phiên khẩn cấp"
                            className="shrink-0 flex items-center gap-1.5 h-9 px-2.5 md:px-3 rounded-lg border border-error text-error hover:bg-error hover:text-on-error transition-colors">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">pan_tool</span>
                            <span className="hidden sm:inline text-[11px] font-semibold tracking-[0.06em] leading-none">DỪNG</span>
                        </button>
                    )}
                </>
                )}
            </header>

            {/* ══════════ BODY: contextual sidebar + content ══════════ */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
                {/* Menu "Dịch hội nghị" (/console) tự có thanh điều khiển riêng làm side menu → KHÔNG hiện
                    sidebar ngữ cảnh của shell ở đây (tránh 2 thanh trùng nhau). Headbar vẫn giữ nguyên. */}
                {cur.key !== 'ops' && (
                <aside className={`hidden xl:flex flex-col shrink-0 border-r border-outline-variant shell-rail rail-aside font-jakarta overflow-hidden ${collapsed ? 'w-16' : 'w-[248px]'}`}>
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
                                        <span className={`text-xs leading-snug truncate ${on ? 'text-[#a3e635]' : 'text-on-surface-variant/90'}`}>{t.desc}</span>
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
                )}

                {/* Dưới xl nội dung CUỘN dọc (không bị cắt ở màn thấp); từ xl giữ nguyên như cũ. */}
                <div className="flex-1 min-w-0 overflow-y-auto xl:overflow-hidden flex flex-col">
                    <Outlet />
                </div>
            </div>
        </div>

            {/* ══════════ NGĂN ĐIỀU HƯỚNG MOBILE (chỉ <xl) — sibling của shell (KHÔNG là con .app-aurora,
                nếu không rule `.app-aurora > * { position:relative; z-index:1 }` sẽ đè `fixed`) ══════════ */}
            {drawerOpen && (
                <div className="xl:hidden fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} aria-hidden="true"></div>
                    <div id="proyaku-mobile-drawer" ref={drawerRef} tabIndex={-1}
                        className="absolute inset-y-0 left-0 w-[86%] max-w-[320px] bg-surface-container-lowest border-r border-outline-variant shadow-2xl flex flex-col font-jakarta focus:outline-none">
                        <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-outline-variant">
                            <img src="/proyaku/svg/proyaku-chinh-nen-trong.svg" alt="PROYAKU — Phiên dịch Việt ⇄ Nhật"
                                className="h-8 w-auto select-none" draggable={false} />
                            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Đóng menu"
                                className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container">
                                <span className="material-symbols-outlined" aria-hidden="true">close</span>
                            </button>
                        </div>
                        <div className="shrink-0 px-3 py-3 border-b border-outline-variant"><EventSwitcher /></div>
                        {/* Scroll ONLY the menu lists — the EventSwitcher above stays in a non-scrolling
                            section so its absolute dropdown is not clipped by overflow-y-auto (10.4). */}
                        <div className="flex-1 min-h-0 overflow-y-auto">
                        {/* Menu chính (kể cả Dịch hội nghị) */}
                        <nav aria-label="Điều hướng chính" className="shrink-0 p-2 space-y-0.5 border-b border-outline-variant">
                            {MENUS.map((mm) => {
                                const on = mm.key === cur.key;
                                const mi = mm.key === 'ops' ? 'graphic_eq' : mm.key === 'prep' ? 'checklist' : mm.key === 'report' ? 'monitor_heart' : 'settings';
                                return (
                                    <button key={mm.key} onClick={() => { setDrawerOpen(false); goMenu(mm); }} aria-current={on ? 'page' : undefined}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-[16px] font-medium transition-colors ${on ? 'bg-secondary/15 text-secondary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}>
                                        <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">{mi}</span>
                                        {mm.label}
                                    </button>
                                );
                            })}
                        </nav>
                        {/* Công cụ của mục hiện tại */}
                        <nav aria-label={`Công cụ ${cur.label}`} className="p-2 space-y-0.5 flex-1">
                            <div className="px-3 pt-2 pb-1 font-label-caps text-label-caps text-on-surface-variant/60">{cur.label}</div>
                            {cur.tools.map((t) => {
                                const on = toolActive(t);
                                return (
                                    <button key={t.label} onClick={() => { setDrawerOpen(false); openTool(t); }} disabled={t.soon}
                                        aria-current={on ? 'page' : undefined}
                                        aria-label={t.label + (t.external ? ' (mở tab mới)' : '')}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${t.soon ? 'text-on-surface-variant/35 cursor-not-allowed' : on ? 'bg-secondary/15 text-secondary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}>
                                        <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">{t.icon}</span>
                                        <span className="flex-1 min-w-0 flex items-center gap-1.5">
                                            <span className="text-[15px] font-medium truncate">{t.label}</span>
                                            {t.external && <span className="material-symbols-outlined text-[15px] opacity-50 shrink-0">open_in_new</span>}
                                            {t.soon && <span className="font-label-caps text-[9px] px-1.5 py-0.5 rounded-full border border-outline-variant text-on-surface-variant/50 shrink-0">sắp có</span>}
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default OperatorLayout;
