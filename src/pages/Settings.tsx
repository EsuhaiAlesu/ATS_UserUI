import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useLiveSession } from '../lib/LiveSessionContext';
import { API_BASE } from '../lib/api';
import { loadTtsPrefs, saveTtsPrefs } from '../lib/ttsPrefs';
import {
    loadSettings, saveSettings, exportLocalData, clearLocalData, DEFAULT_EVENT_NAME,
} from '../lib/settings';

// Central Settings page (Giai đoạn 1) — consolidates the scattered per-feature config into one
// professional place: Kết nối · Sự kiện · Hiển thị · Giọng đọc · Tài khoản · Dữ liệu · Giới thiệu.
// Session-contextual device/model pickers stay in the /audio drawer on purpose (chosen per session).

const APP_VERSION = '1.0 · 2026-07';
const INPUT = 'w-full bg-surface text-on-surface border border-outline-variant rounded-DEFAULT py-2 px-3 text-sm focus:ring-0 focus:border-secondary';
const BTN = 'inline-flex items-center gap-2 px-4 py-2 rounded-full font-label-caps text-label-caps transition-colors';

const Section: React.FC<{ icon: string; title: string; desc?: string; children: React.ReactNode }> = ({ icon, title, desc, children }) => (
    <section className="bg-surface-container border border-outline-variant rounded-xl p-5">
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

    // Event
    const [eventName, setEventName] = useState(initial.eventName ?? DEFAULT_EVENT_NAME);
    const [rehearsalDate, setRehearsalDate] = useState(initial.rehearsalDate ?? '2026-08-07');
    const [galaDate, setGalaDate] = useState(initial.galaDate ?? '2026-08-08');
    const [venue, setVenue] = useState(initial.venue ?? '');
    const [eventSaved, setEventSaved] = useState(false);

    // Display (caption size — the previously keyboard-only /stream zoom)
    const [capScale, setCapScale] = useState(() => {
        const s = Number(localStorage.getItem('proyaku_capscale'));
        return s >= 0.5 && s <= 3 ? s : 1;
    });

    // TTS
    const [ttsEnabled, setTtsEnabled] = useState(() => loadTtsPrefs().enabled);
    const ttsPrefs = loadTtsPrefs();

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

    const saveEvent = () => {
        saveSettings({ eventName: eventName.trim(), rehearsalDate, galaDate, venue: venue.trim() });
        setEventSaved(true);
        setTimeout(() => setEventSaved(false), 2500);
    };

    const changeCap = (v: number) => {
        const s = Math.max(0.5, Math.min(3, v));
        setCapScale(s);
        try { localStorage.setItem('proyaku_capscale', String(s)); } catch { /* ignore */ }
    };

    const toggleTts = () => {
        const next = !ttsEnabled;
        setTtsEnabled(next);
        saveTtsPrefs({ ...loadTtsPrefs(), enabled: next });
    };

    const doExport = () => {
        const blob = new Blob([exportLocalData()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proyaku-caidat-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const doClear = () => {
        if (window.confirm('Xoá TOÀN BỘ dữ liệu cục bộ trên máy này? (cấu hình · giọng đọc · xác nhận sẵn sàng · nhật ký sự cố) — KHÔNG thể hoàn tác.')) {
            clearLocalData();
            window.location.reload();
        }
    };

    return (
        <div className="h-full flex flex-col bg-background text-on-background overflow-hidden">
            <PageHeader icon="settings" title="Cài đặt" subtitle="Cấu hình chung của Proyaku" />

            <div className="flex-1 overflow-y-auto">
                <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">

                    {/* KẾT NỐI */}
                    <Section icon="lan" title="Kết nối" desc="Địa chỉ lõi dịch (backend). Để trống = dùng cùng máy chủ (proxy).">
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
                            <button onClick={saveConnection} className={`${BTN} bg-secondary text-on-secondary hover:opacity-80`}>
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>Lưu &amp; tải lại
                            </button>
                            {testStatus && <span className={`text-sm ${testStatus.startsWith('✓') ? 'text-secondary' : testStatus.startsWith('✗') ? 'text-error' : 'text-on-surface-variant'}`}>{testStatus}</span>}
                        </div>
                    </Section>

                    {/* SỰ KIỆN */}
                    <Section icon="event" title="Sự kiện" desc="Tên & mốc thời gian — dùng cho đếm ngược ở Bảng chỉ huy.">
                        <Field label="Tên sự kiện">
                            <input value={eventName} onChange={(e) => setEventName(e.target.value)} className={INPUT} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Ngày tổng duyệt"><input type="date" value={rehearsalDate} onChange={(e) => setRehearsalDate(e.target.value)} className={INPUT} /></Field>
                            <Field label="Ngày gala"><input type="date" value={galaDate} onChange={(e) => setGalaDate(e.target.value)} className={INPUT} /></Field>
                        </div>
                        <Field label="Địa điểm"><input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Hội trường…" className={INPUT} /></Field>
                        <div className="flex items-center gap-3">
                            <button onClick={saveEvent} className={`${BTN} bg-secondary text-on-secondary hover:opacity-80`}>
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>Lưu sự kiện
                            </button>
                            {eventSaved && <span className="text-sm text-secondary">✓ Đã lưu</span>}
                        </div>
                    </Section>

                    {/* HIỂN THỊ */}
                    <Section icon="format_size" title="Hiển thị phụ đề" desc="Cỡ chữ mặc định cho Tường phụ đề (trước đây chỉ chỉnh được bằng phím +/−).">
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

                    {/* GIỌNG ĐỌC */}
                    <Section icon="record_voice_over" title="Giọng đọc (TTS)" desc="Máy đọc thành tiếng, hay chỉ hiện phụ đề.">
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                            <span className="text-on-surface">{ttsEnabled ? 'BẬT đọc tiếng' : 'CHỈ phụ đề (khuyến nghị cho gala)'}</span>
                            <button onClick={toggleTts} className={`font-label-caps text-label-caps px-3 py-1.5 rounded-full ${ttsEnabled ? 'bg-secondary text-on-secondary' : 'border border-outline-variant text-on-surface-variant'}`}>{ttsEnabled ? 'ON' : 'OFF'}</button>
                        </label>
                        <div className="text-sm text-on-surface-variant">Giọng đang chọn — VI: <span className="text-on-surface">{ttsPrefs.vi?.label ?? '—'}</span> · JA: <span className="text-on-surface">{ttsPrefs.ja?.label ?? '—'}</span></div>
                        <Link to="/voices" className={`${BTN} border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary`}>
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">tune</span>Chọn giọng chi tiết
                        </Link>
                    </Section>

                    {/* TÀI KHOẢN */}
                    <Section icon="account_circle" title="Tài khoản & Bảo mật" desc="Đăng nhập được bật/tắt trên máy chủ (Railway · AUTH_PASSWORD).">
                        <div className="text-sm text-on-surface-variant">Người dùng: <span className="text-on-surface">leson@esuhai.com</span></div>
                        <a href="/logout" className={`${BTN} border border-error text-error hover:bg-error hover:text-on-error`}>
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>Đăng xuất
                        </a>
                    </Section>

                    {/* DỮ LIỆU */}
                    <Section icon="database" title="Dữ liệu" desc="Cấu hình & xác nhận được lưu trên chính máy này (localStorage).">
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
                            <span className="text-on-surface-variant">Sự kiện</span><span className="text-on-surface">{eventName}</span>
                        </div>
                        <p className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant">Esuhai 20 năm · 2006–2026 · Cầu nối Việt–Nhật.</p>
                    </Section>

                </main>
            </div>
        </div>
    );
};

export default Settings;
