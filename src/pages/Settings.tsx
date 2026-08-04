import React, { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useLiveSession } from '../lib/LiveSessionContext';
import { API_BASE } from '../lib/api';
import {
    loadSettings, saveSettings, exportLocalData, clearLocalData,
} from '../lib/settings';
import { toast } from '../lib/toast';
import { OnlineKeysSettings, OnlineMicSettings, OnlineRhythmSettings } from '../lib/lanes/online';

// Central Settings page (Giai đoạn 1) — consolidates the scattered per-feature config into one
// professional place: Kết nối · Sự kiện · Hiển thị · Giọng đọc · Tài khoản · Dữ liệu · Giới thiệu.
// Session-contextual device/model pickers stay in the /console drawer on purpose (chosen per session).

const APP_VERSION = '1.0 · 2026-07';
// text-base on mobile (≥16px) so iOS does not zoom on focus; text-sm from sm up keeps the desktop look.
const INPUT = 'w-full bg-surface text-on-surface border border-outline-variant rounded-DEFAULT py-2 px-3 text-base sm:text-sm focus:ring-0 focus:border-secondary field-lux transition-shadow';
const BTN = 'inline-flex items-center gap-2 px-4 py-2 rounded-full font-label-caps text-label-caps transition-colors';

const Section: React.FC<{ id?: string; icon: string; title: string; desc?: string; children: React.ReactNode }> = ({ id, icon, title, desc, children }) => (
    <section id={id} className="card-lux scroll-mt-4 bg-surface-container border border-outline-variant rounded-xl p-5">
        <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-secondary" aria-hidden="true">{icon}</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">{title}</h2>
        </div>
        {desc && <p className="text-sm text-on-surface-variant mt-1">{desc}</p>}
        <div className="mt-4 space-y-3">{children}</div>
    </section>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="font-label-caps text-label-caps text-on-surface-variant block mb-1.5">{label}</label>
        {children}
    </div>
);

const Settings: React.FC = () => {
    const session = useLiveSession();
    const initial = loadSettings();

    // Connection
    const [apiBase, setApiBase] = useState(initial.apiBase ?? '');
    const [testStatus, setTestStatus] = useState('');

    // Who is logged in — ASK the server, never hard-code. FOUR states, and all four are shown:
    // `undefined` = the answer has not come back yet · `null` = the server SAID the gate is off, which is
    // only ever concluded from `gate === false`, never from a failure · `'?'` = the question could not be
    // answered at all · a string = the real username.
    //
    // The `'?'` state is not defensive padding, it is the whole point. A gated server answers /whoami with
    // the login PAGE at status 200 whenever the cookie is missing or expired, so `r.ok` is true and
    // `r.json()` throws. Collapsing that into `null` would print "đăng nhập đang tắt" on a deploy where the
    // gate is emphatically ON — the exact class of lie this task exists to remove, just pointing the other
    // way. Running `vite dev` with no `node server.js` next to it lands in the same state.
    // `alive` guards against setting state after the page has been left.
    const [authUser, setAuthUser] = useState<string | null | undefined>(undefined);
    useEffect(() => {
        let alive = true;
        fetch('/whoami', { credentials: 'same-origin' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (alive) setAuthUser(typeof d?.user === 'string' ? d.user : (d && d.gate === false ? null : '?')); })
            .catch(() => { if (alive) setAuthUser('?'); });
        return () => { alive = false; };
    }, []);

    // Display (caption size — the previously keyboard-only /stream zoom)
    const [capScale, setCapScale] = useState(() => {
        const s = Number(localStorage.getItem('proyaku_capscale'));
        return s >= 0.5 && s <= 3 ? s : 1;
    });

    const testConnection = async () => {
        setTestStatus('Đang thử…');
        try {
            const base = apiBase.replace(/\/+$/, '') || window.location.origin;
            const r = await fetch(`${base}/api/health`, { cache: 'no-store' });
            const j = await r.json().catch(() => ({}));
            setTestStatus(j?.ok ? `✓ Kết nối OK${j.blocks != null ? ` · ${j.blocks} khối` : ''}` : '✗ Máy chủ trả về không hợp lệ');
        } catch {
            setTestStatus('✗ Không kết nối được — kiểm tra URL & backend');
        }
    };

    const saveConnection = () => {
        saveSettings({ apiBase: apiBase.replace(/\/+$/, '') });
        if (window.confirm('Đã lưu địa chỉ backend. Tải lại trang để áp dụng?')) window.location.reload();
    };

    const changeCap = (v: number) => {
        const s = Math.max(0.5, Math.min(3, v));
        setCapScale(s);
        try { localStorage.setItem('proyaku_capscale', String(s)); } catch { /* ignore */ }
    };

    const doExport = () => {
        const blob = new Blob([exportLocalData()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proyaku-caidat-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Đã xuất cấu hình');
    };

    const doClear = () => {
        if (window.confirm('Xoá TOÀN BỘ dữ liệu cục bộ trên máy này? (cấu hình · giọng đọc · xác nhận sẵn sàng · nhật ký sự cố) — KHÔNG thể hoàn tác.')) {
            clearLocalData();
            window.location.reload();
        }
    };

    return (
        <div className="h-full flex flex-col text-on-background overflow-hidden">
            <PageHeader icon="settings" title="Cài đặt" subtitle="Cấu hình chung của Proyaku" />

            <div className="flex-1 overflow-y-auto">
                <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">

                    {/* KẾT NỐI */}
                    <Section id="kn" icon="lan" title="Kết nối" desc="Địa chỉ lõi dịch (backend). Để trống = dùng cùng máy chủ (proxy).">
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${session.backendOnline ? 'bg-secondary' : 'bg-error'}`}></span>
                            <span className={`font-label-caps text-label-caps ${session.backendOnline ? 'text-secondary' : 'text-error'}`}>{session.backendOnline ? 'ĐANG KẾT NỐI' : 'OFFLINE'}</span>
                            <span className="text-sm text-on-surface-variant ml-1 truncate">hiện tại: {API_BASE || 'cùng máy chủ (proxy)'}</span>
                        </div>
                        <Field label="Địa chỉ backend">
                            <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} placeholder="http://127.0.0.1:8080" className={INPUT} />
                        </Field>
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={testConnection} className={`${BTN} border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary`}>
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">wifi_tethering</span>Test kết nối
                            </button>
                            <button onClick={saveConnection} className={`${BTN} btn-lux bg-secondary text-on-secondary hover:opacity-80`}>
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>Lưu &amp; tải lại
                            </button>
                            {testStatus && <span className={`text-sm ${testStatus.startsWith('✓') ? 'text-secondary' : testStatus.startsWith('✗') ? 'text-error' : 'text-on-surface-variant'}`}>{testStatus}</span>}
                        </div>
                    </Section>

                    {/* CHẾ ĐỘ ONLINE — KHOÁ DỊCH VỤ (API Key) (FIX-07 / PROMPT-09 9.1) */}
                    <Section id="ok" icon="vpn_key" title="Chế độ ONLINE — Khoá dịch vụ (API Key)" desc="Khoá dịch vụ (API Key) cho luồng ONLINE (nhận dạng giọng · dịch · đọc giọng). Lưu trên máy chủ, chỉ ghi.">
                        <OnlineKeysSettings />
                    </Section>

                    {/* CHẾ ĐỘ ONLINE — ĐỘ NHẠY MICRO (theo máy / theo hội trường) */}
                    <Section id="ms" icon="mic" title="Chế độ ONLINE — Độ nhạy micro" desc="Máy này đang nghe bằng loại micro nào. Đặt một lần theo phòng, không phải đặt lại mỗi buổi.">
                        <OnlineMicSettings />
                    </Section>

                    {/* CHẾ ĐỘ ONLINE — NHỊP NÓI CỦA BUỔI (theo từng buổi — nút chống vụn câu) */}
                    <Section id="rh" icon="graphic_eq" title="Chế độ ONLINE — Nhịp nói của buổi" desc="Máy chờ im lặng bao lâu mới chốt một câu. Chờ ngắn thì câu bị cắt vụn, chờ lâu thì phụ đề lên chậm.">
                        <OnlineRhythmSettings />
                    </Section>

                    {/* HIỂN THỊ */}
                    <Section id="pd" icon="format_size" title="Hiển thị phụ đề" desc="Cỡ chữ mặc định cho Tường phụ đề (trước đây chỉ chỉnh được bằng phím +/−).">
                        <div className="flex items-center gap-3">
                            <button onClick={() => changeCap(capScale - 0.1)} className="w-9 h-9 rounded-full border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary flex items-center justify-center" title="Nhỏ hơn"><span className="material-symbols-outlined" aria-hidden="true">remove</span></button>
                            <input type="range" min={0.5} max={3} step={0.1} value={capScale} onChange={(e) => changeCap(Number(e.target.value))} className="flex-1 accent-secondary" />
                            <button onClick={() => changeCap(capScale + 0.1)} className="w-9 h-9 rounded-full border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary flex items-center justify-center" title="Lớn hơn"><span className="material-symbols-outlined" aria-hidden="true">add</span></button>
                            <span className="font-label-caps text-label-caps text-secondary tabular-nums w-12 text-right">{Math.round(capScale * 100)}%</span>
                        </div>
                        <div className="border border-outline-variant rounded-DEFAULT bg-surface-container-lowest px-4 py-3 overflow-hidden">
                            <span className="text-on-surface font-semibold" style={{ fontSize: `calc(1rem * ${capScale})` }}>Kính thưa quý vị · ご来賓の皆様</span>
                        </div>
                        <button onClick={() => changeCap(1)} className="text-sm text-on-surface-variant hover:text-primary underline">Đặt lại 100%</button>
                    </Section>

                    {/* TÀI KHOẢN */}
                    <Section id="tk" icon="account_circle" title="Tài khoản & Bảo mật" desc="Đăng nhập được bật/tắt trên máy chủ (Railway · AUTH_PASSWORD).">
                        <div className="text-sm text-on-surface-variant">
                            {authUser === undefined
                                ? 'Đang hỏi máy chủ…'
                                : authUser === null
                                    ? <>Đăng nhập <span className="text-on-surface">đang tắt</span> — ai mở đúng địa chỉ cũng vào được. Đặt AUTH_PASSWORD trên Railway để bật.</>
                                    : authUser === '?'
                                        ? <>Không hỏi được máy chủ — có thể phiên đăng nhập đã hết hạn. Xin tải lại trang.</>
                                        : <>Người dùng: <span className="text-on-surface">{authUser}</span></>}
                        </div>
                        <a href="/logout" className={`${BTN} border border-error text-error hover:bg-error hover:text-on-error`}>
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>Đăng xuất
                        </a>
                    </Section>

                    {/* DỮ LIỆU */}
                    <Section id="dl" icon="database" title="Dữ liệu" desc="Cấu hình & xác nhận được lưu trên chính máy này (localStorage).">
                        <div className="flex flex-wrap gap-2">
                            <button onClick={doExport} className={`${BTN} border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary`}>
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">download</span>Xuất cấu hình (JSON)
                            </button>
                            <button onClick={doClear} className={`${BTN} border border-error text-error hover:bg-error hover:text-on-error`}>
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>Xoá dữ liệu cục bộ
                            </button>
                        </div>
                        <p className="text-xs text-on-surface-variant">Xoá sẽ xoá cả xác nhận sẵn sàng &amp; nhật ký sự cố ở Bảng chỉ huy — hãy Xuất trước khi xoá.</p>
                    </Section>

                    {/* GIỚI THIỆU */}
                    <Section icon="info" title="Giới thiệu">
                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                            <span className="text-on-surface-variant">Ứng dụng</span><span className="text-on-surface">PROYAKU — Phiên dịch VI ⇄ JA</span>
                            <span className="text-on-surface-variant">Phiên bản</span><span className="text-on-surface tabular-nums">{APP_VERSION}</span>
                            <span className="text-on-surface-variant">Backend</span><span className={session.backendOnline ? 'text-secondary' : 'text-error'}>{session.backendOnline ? 'Đang kết nối' : 'Offline'}</span>
                        </div>
                        <p className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant">Esuhai 20 năm · 2006–2026 · Cầu nối Việt–Nhật.</p>
                    </Section>

                </main>
            </div>
        </div>
    );
};

export default Settings;
