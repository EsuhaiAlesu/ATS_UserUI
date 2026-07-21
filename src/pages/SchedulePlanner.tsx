import React, { useEffect, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { toast } from '../lib/toast';
import { getSchedules, upsertConference, newConference, newSpeaker } from '../lib/schedule';
import type { Conference, Speaker } from '../lib/schedule';
import {
    getSeriesList, upsertSeries, removeSeries, newSeries, spawnOccurrence,
    SERIES_KINDS, SERIES_COLORS, SERIES_HEX,
} from '../lib/series';
import type { ConferenceSeries, SeriesKind } from '../lib/series';
import { seriesScopeId, scopeDocCount } from '../lib/kbscope';
import { useActiveEvent } from '../lib/ActiveEventContext';
import { removeEvent } from '../lib/events';

// Đặt lịch hội nghị (Chuẩn bị · spec 1.2 + doc 30 phân lớp). Sự kiện MỘT LẦN (không seriesId) vs CHUỖI
// hội nghị lặp lại (One-team, BOD…) gộp các BUỔI dưới một thẻ nhóm — tài liệu/từ điển của chuỗi tích lũy
// vào cây scope `series:<id>` (kbscope.ts). Offline (localStorage). Design: navy + gold, chuỗi = sọc màu dịu.

const LANGS: { v: string; l: string }[] = [
    { v: '', l: '— ngôn ngữ —' }, { v: 'vi', l: 'Tiếng Việt' }, { v: 'ja', l: '日本語' },
    { v: 'en', l: 'English' }, { v: 'th', l: 'ไทย' }, { v: 'ko', l: '한국어' }, { v: 'zh', l: '中文' },
];
const INPUT = 'w-full bg-surface text-on-surface border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-secondary focus:outline-none field-lux transition-shadow';
const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const parse = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; };
const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
const kindLabel = (k: SeriesKind) => SERIES_KINDS.find((x) => x.v === k)?.label ?? 'Khác';

// ── kind pill (dùng màu chuỗi) ──
const KindPill: React.FC<{ kind: SeriesKind; hex: string }> = ({ kind, hex }) => (
    <span className="shrink-0 uppercase font-label-caps text-[9px] tracking-[0.12em] px-2 py-0.5 rounded-full border"
        style={{ color: hex, borderColor: `${hex}66`, background: `${hex}14` }}>{kindLabel(kind)}</span>
);

// ── One conference card (buổi). badge='oneoff' → pill vàng MỘT LẦN; occurrence → gọn hơn ──
const ConferenceCard: React.FC<{ c: Conference; upcoming: boolean; badge?: 'oneoff'; onEdit: () => void; onDelete: () => void }> = ({ c, upcoming, badge, onEdit, onDelete }) => {
    const d = parse(c.date);
    return (
        <div className="card-lux group bg-surface-container bg-gradient-to-b from-surface-container to-surface border-2 border-outline-variant rounded-2xl p-4 flex gap-4">
            <div className="shrink-0 w-16 rounded-xl bg-surface-container-high flex flex-col items-center justify-center py-2">
                <span className="text-2xl font-bold text-secondary tabular-nums leading-none">{d ? String(d.getDate()).padStart(2, '0') : '—'}</span>
                <span className="text-[11px] text-on-surface-variant mt-1 tabular-nums">{d ? `Th${d.getMonth() + 1}·${d.getFullYear()}` : ''}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-on-surface text-base truncate">{c.title || '(chưa đặt tên)'}</h3>
                    {badge === 'oneoff' && <span className="shrink-0 uppercase font-label-caps text-[9px] tracking-[0.12em] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">Một lần</span>}
                    {upcoming && <span className="shrink-0 uppercase font-label-caps text-[9px] tracking-[0.1em] px-2 py-0.5 rounded-full border border-secondary/40 text-secondary">Sắp tới</span>}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[13px] text-on-surface-variant">
                    <span className="inline-flex items-center gap-1">{d ? WD[d.getDay()] : ''} <span className="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span>{c.startTime || '--:--'}{c.endTime ? `–${c.endTime}` : ''}</span>
                    {c.booker && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">person</span>{c.booker}</span>}
                    <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">groups</span>{c.speakers.length} người phát biểu</span>
                </div>
                {c.speakers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {c.speakers.slice(0, 6).map((s) => (
                            <span key={s.id} className="inline-flex items-center gap-1.5 bg-surface-container-high border border-outline-variant rounded-full pl-1 pr-2.5 py-0.5">
                                <span className="w-5 h-5 rounded-full bg-secondary/15 text-secondary text-[10px] font-bold flex items-center justify-center">{initials(s.name)}</span>
                                <span className="text-[12px] text-on-surface">{s.name || '(chưa tên)'}</span>
                            </span>
                        ))}
                        {c.speakers.length > 6 && <span className="text-[12px] text-on-surface-variant self-center">+{c.speakers.length - 6}</span>}
                    </div>
                )}
            </div>
            <div className="shrink-0 flex flex-col gap-1.5">
                <button onClick={onEdit} title="Sửa buổi" className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">edit</span></button>
                <button onClick={onDelete} title="Xóa buổi" className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">delete</span></button>
            </div>
        </div>
    );
};

// ── Series group: header (sọc màu · loại · N buổi · đếm kho) + các buổi con, thu gọn được ──
const SeriesGroupCard: React.FC<{
    series: ConferenceSeries; occs: Conference[]; upcomingId?: string; collapsed: boolean;
    onToggle: () => void; onNewSession: () => void; onManage: () => void;
    onEditOcc: (c: Conference) => void; onDeleteOcc: (c: Conference) => void;
}> = ({ series, occs, upcomingId, collapsed, onToggle, onNewSession, onManage, onEditOcc, onDeleteOcc }) => {
    const hex = SERIES_HEX[series.color];
    const docN = scopeDocCount(seriesScopeId(series.id));
    const speakerN = new Set(occs.flatMap((o) => o.speakers.map((s) => s.name.trim().toLowerCase()).filter(Boolean))).size;
    return (
        <div className="rounded-2xl border-2 border-outline-variant bg-surface-container/40 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-l-4" style={{ borderLeftColor: hex }}>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${hex}22` }}>
                    <span className="material-symbols-outlined text-[22px]" style={{ color: hex }} aria-hidden="true">{series.icon}</span>
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-on-surface text-base truncate">{series.name || '(chuỗi chưa tên)'}</h3>
                        <KindPill kind={series.kind} hex={hex} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[12px] text-on-surface-variant">
                        <span className="uppercase font-label-caps tracking-[0.1em] text-on-surface-variant/70">Chuỗi · {occs.length} buổi</span>
                        {series.owner && <span>· {series.owner}</span>}
                        {series.cadenceHint && <span className="inline-flex items-center gap-1">· <span className="material-symbols-outlined text-[14px]" aria-hidden="true">repeat</span>{series.cadenceHint}</span>}
                        <span className="inline-flex items-center gap-1">· <span className="material-symbols-outlined text-[14px]" aria-hidden="true">folder_open</span>Tài liệu {docN}</span>
                        <span className="inline-flex items-center gap-1">· <span className="material-symbols-outlined text-[14px]" aria-hidden="true">record_voice_over</span>Diễn giả {speakerN}</span>
                    </div>
                </div>
                <button onClick={onNewSession} className="shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium text-on-surface hover:opacity-90 transition-opacity" style={{ background: `${hex}22`, color: hex }}>
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>Tạo buổi
                </button>
                <button onClick={onManage} title="Quản lý chuỗi" className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">tune</span></button>
                <button onClick={onToggle} title={collapsed ? 'Mở rộng' : 'Thu gọn'} className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-[22px]" aria-hidden="true">{collapsed ? 'expand_more' : 'expand_less'}</span></button>
            </div>
            {!collapsed && (
                <div className="px-3 pb-3 space-y-2">
                    {occs.length === 0
                        ? <p className="text-[13px] text-on-surface-variant/60 italic px-1 py-2">Chưa có buổi nào — bấm "Tạo buổi" để phát sinh buổi đầu tiên của chuỗi.</p>
                        : occs.map((o) => <ConferenceCard key={o.id} c={o} upcoming={o.id === upcomingId} onEdit={() => onEditOcc(o)} onDelete={() => onDeleteOcc(o)} />)}
                </div>
            )}
        </div>
    );
};

// ── Create / edit conference (buổi) drawer — thêm chọn LOẠI (một lần / thuộc chuỗi) ──
const FormDrawer: React.FC<{
    conf: Conference; shown: boolean; isNew: boolean; seriesList: ConferenceSeries[];
    onChange: (patch: Partial<Conference>) => void;
    onSpeaker: (id: string, patch: Partial<Speaker>) => void;
    onAddSpeaker: () => void; onRemoveSpeaker: (id: string) => void;
    onCreateSeries: (name: string, kind: SeriesKind) => string;   // returns new series id
    onSave: () => void; onClose: () => void;
}> = ({ conf, shown, isNew, seriesList, onChange, onSpeaker, onAddSpeaker, onRemoveSpeaker, onCreateSeries, onSave, onClose }) => {
    const [wantSeries, setWantSeries] = useState(!!conf.seriesId);
    const [creating, setCreating] = useState(false);
    const [draftName, setDraftName] = useState('');
    const [draftKind, setDraftKind] = useState<SeriesKind>('department');

    const pickOneOff = () => { setWantSeries(false); setCreating(false); onChange({ seriesId: undefined }); };
    const pickSeries = () => { setWantSeries(true); if (!conf.seriesId && seriesList.length === 0) setCreating(true); };
    const doCreate = () => {
        const name = draftName.trim();
        if (!name) return;
        const id = onCreateSeries(name, draftKind);
        onChange({ seriesId: id });
        setCreating(false); setDraftName('');
    };
    // Chọn "Thuộc chuỗi" thì BẮT BUỘC có chuỗi — không âm thầm lưu thành một lần (review P0).
    const handleSave = () => {
        if (wantSeries && !conf.seriesId) { toast.error('Hãy chọn hoặc tạo chuỗi cho buổi này (hoặc chuyển sang "Một lần")'); return; }
        onSave();
    };

    return (
        <>
            <div className={`absolute inset-0 bg-background/50 backdrop-blur-[1px] z-30 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>
            <aside style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
                className={`absolute top-0 right-0 h-full w-full max-w-[520px] bg-surface-container-lowest border-l border-outline-variant z-40 flex flex-col shadow-2xl transition-transform duration-300 will-change-transform ${shown ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="shrink-0 flex items-center gap-3 px-5 h-16 border-b border-outline-variant">
                    <span className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-secondary" aria-hidden="true">event</span></span>
                    <span className="font-semibold text-on-surface text-lg flex-1">{isNew ? 'Đặt lịch mới' : 'Sửa buổi hội nghị'}</span>
                    <button onClick={onClose} title="Đóng" className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* Loại lịch: một lần vs thuộc chuỗi */}
                    <section className="space-y-2">
                        <h4 className="uppercase font-label-caps text-label-caps text-on-surface-variant">Loại lịch</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={pickOneOff} className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${!wantSeries ? 'border-secondary text-secondary bg-secondary/10' : 'border-outline-variant text-on-surface-variant hover:text-on-surface'}`}>
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">event</span>Một lần
                            </button>
                            <button onClick={pickSeries} className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${wantSeries ? 'border-secondary text-secondary bg-secondary/10' : 'border-outline-variant text-on-surface-variant hover:text-on-surface'}`}>
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">event_repeat</span>Thuộc chuỗi
                            </button>
                        </div>
                        {wantSeries && (
                            <div className="space-y-2 pt-1">
                                {!creating ? (
                                    <div className="flex gap-2">
                                        <select value={conf.seriesId ?? ''} onChange={(e) => onChange({ seriesId: e.target.value || undefined })} className={`${INPUT} cursor-pointer flex-1`}>
                                            <option value="">— chọn chuỗi —</option>
                                            {seriesList.map((s) => <option key={s.id} value={s.id}>{s.name || '(chưa tên)'} · {kindLabel(s.kind)}</option>)}
                                        </select>
                                        <button onClick={() => setCreating(true)} className="shrink-0 flex items-center gap-1 rounded-lg border border-outline-variant px-3 text-[13px] font-medium text-on-surface-variant hover:text-secondary hover:border-secondary transition-colors"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>Chuỗi mới</button>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-outline-variant bg-surface-container p-3 space-y-2">
                                        <div className="text-[13px] text-on-surface-variant">Tạo chuỗi mới</div>
                                        <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Tên chuỗi (vd: Họp One-team)" className={INPUT} />
                                        <div className="flex gap-2">
                                            <select value={draftKind} onChange={(e) => setDraftKind(e.target.value as SeriesKind)} className={`${INPUT} cursor-pointer flex-1`}>
                                                {SERIES_KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
                                            </select>
                                            <button onClick={doCreate} disabled={!draftName.trim()} className="shrink-0 bg-secondary text-on-secondary px-4 rounded-lg font-label-caps text-label-caps hover:opacity-80 disabled:opacity-40">Tạo</button>
                                            <button onClick={() => setCreating(false)} className="shrink-0 px-3 rounded-lg text-on-surface-variant hover:text-on-surface text-sm">Hủy</button>
                                        </div>
                                    </div>
                                )}
                                <p className="text-[12px] text-on-surface-variant/60">Tài liệu & từ điển của buổi này sẽ tích lũy vào kho chung của chuỗi.</p>
                            </div>
                        )}
                    </section>

                    <section className="space-y-3">
                        <h4 className="uppercase font-label-caps text-label-caps text-on-surface-variant">Thông tin buổi</h4>
                        <div>
                            <label className="text-[13px] text-on-surface-variant block mb-1">Chủ đề buổi *</label>
                            <input value={conf.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="vd: Lễ kỷ niệm 20 năm Esuhai" className={INPUT} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="text-[13px] text-on-surface-variant block mb-1">Ngày *</label><input type="date" value={conf.date} onChange={(e) => onChange({ date: e.target.value })} className={INPUT} /></div>
                            <div><label className="text-[13px] text-on-surface-variant block mb-1">Bắt đầu</label><input type="time" value={conf.startTime} onChange={(e) => onChange({ startTime: e.target.value })} className={INPUT} /></div>
                            <div><label className="text-[13px] text-on-surface-variant block mb-1">Kết thúc (dự kiến)</label><input type="time" value={conf.endTime} onChange={(e) => onChange({ endTime: e.target.value })} className={INPUT} /></div>
                        </div>
                        <div>
                            <label className="text-[13px] text-on-surface-variant block mb-1">Người book lịch</label>
                            <input value={conf.booker} onChange={(e) => onChange({ booker: e.target.value })} placeholder="Tên người phụ trách" className={INPUT} />
                        </div>
                        <div>
                            <label className="text-[13px] text-on-surface-variant block mb-1">Nội dung / chương trình</label>
                            <textarea value={conf.agenda} onChange={(e) => onChange({ agenda: e.target.value })} rows={3} placeholder="Tóm tắt nội dung, chương trình hội nghị…" className={`${INPUT} resize-none`} />
                        </div>
                    </section>
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="uppercase font-label-caps text-label-caps text-on-surface-variant">Người phát biểu dự kiến ({conf.speakers.length})</h4>
                            <button onClick={onAddSpeaker} className="flex items-center gap-1 text-secondary text-[13px] font-medium hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Thêm</button>
                        </div>
                        {conf.speakers.length === 0 && <p className="text-[13px] text-on-surface-variant/60 italic">Chưa có ai. Thêm để cấu hình trước tên &amp; ngôn ngữ phát biểu.</p>}
                        <div className="space-y-2.5">
                            {conf.speakers.map((s, i) => (
                                <div key={s.id} className="bg-surface-container border border-outline-variant rounded-xl p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-secondary/15 text-secondary text-[11px] font-bold flex items-center justify-center shrink-0 tabular-nums">{i + 1}</span>
                                        <input value={s.name} onChange={(e) => onSpeaker(s.id, { name: e.target.value })} placeholder="Tên người phát biểu" className={`${INPUT} flex-1`} />
                                        <button onClick={() => onRemoveSpeaker(s.id)} title="Xóa" className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error shrink-0"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pl-8">
                                        <input value={s.role} onChange={(e) => onSpeaker(s.id, { role: e.target.value })} placeholder="Chức danh" className={INPUT} />
                                        <select value={s.lang} onChange={(e) => onSpeaker(s.id, { lang: e.target.value })} className={`${INPUT} cursor-pointer`}>
                                            {LANGS.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
                <div className="shrink-0 flex items-center justify-end gap-2 px-5 h-16 border-t border-outline-variant">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-sm">Hủy</button>
                    <button onClick={handleSave} className="btn-lux flex items-center gap-1.5 bg-secondary text-on-secondary px-5 py-2 rounded-lg font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>Lưu buổi</button>
                </div>
            </aside>
        </>
    );
};

// ── Series manage drawer (sửa/xóa chuỗi) ──
const SeriesDrawer: React.FC<{
    series: ConferenceSeries; occCount: number; shown: boolean;
    onChange: (patch: Partial<ConferenceSeries>) => void; onSave: () => void; onDelete: () => void; onClose: () => void;
}> = ({ series, occCount, shown, onChange, onSave, onDelete, onClose }) => (
    <>
        <div className={`absolute inset-0 bg-background/50 backdrop-blur-[1px] z-30 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>
        <aside style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
            className={`absolute top-0 right-0 h-full w-full max-w-[460px] bg-surface-container-lowest border-l border-outline-variant z-40 flex flex-col shadow-2xl transition-transform duration-300 will-change-transform ${shown ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="shrink-0 flex items-center gap-3 px-5 h-16 border-b border-outline-variant">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${SERIES_HEX[series.color]}22` }}><span className="material-symbols-outlined" style={{ color: SERIES_HEX[series.color] }} aria-hidden="true">{series.icon}</span></span>
                <span className="font-semibold text-on-surface text-lg flex-1">Quản lý chuỗi</span>
                <button onClick={onClose} title="Đóng" className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                    <label className="text-[13px] text-on-surface-variant block mb-1">Tên chuỗi *</label>
                    <input value={series.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="vd: Họp One-team" className={INPUT} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[13px] text-on-surface-variant block mb-1">Loại</label>
                        <select value={series.kind} onChange={(e) => onChange({ kind: e.target.value as SeriesKind })} className={`${INPUT} cursor-pointer`}>
                            {SERIES_KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
                        </select>
                    </div>
                    <div><label className="text-[13px] text-on-surface-variant block mb-1">Đơn vị phụ trách</label>
                        <input value={series.owner ?? ''} onChange={(e) => onChange({ owner: e.target.value })} placeholder="Phòng / đội" className={INPUT} />
                    </div>
                </div>
                <div>
                    <label className="text-[13px] text-on-surface-variant block mb-1">Định kỳ (ghi chú)</label>
                    <input value={series.cadenceHint ?? ''} onChange={(e) => onChange({ cadenceHint: e.target.value })} placeholder="vd: Hằng tuần thứ Hai" className={INPUT} />
                </div>
                <div>
                    <label className="text-[13px] text-on-surface-variant block mb-1">Màu nhận diện</label>
                    <div className="flex gap-2">
                        {SERIES_COLORS.map((c) => (
                            <button key={c} onClick={() => onChange({ color: c })} title={c} className={`w-8 h-8 rounded-full border-2 transition-transform ${series.color === c ? 'scale-110 border-on-surface' : 'border-transparent hover:scale-105'}`} style={{ background: SERIES_HEX[c] }}></button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="shrink-0 flex items-center justify-between gap-2 px-5 h-16 border-t border-outline-variant">
                <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-error hover:bg-error/10 transition-colors text-sm"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>Xóa chuỗi{occCount > 0 ? ` (${occCount} buổi)` : ''}</button>
                <button onClick={onSave} className="btn-lux flex items-center gap-1.5 bg-secondary text-on-secondary px-5 py-2 rounded-lg font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>Lưu chuỗi</button>
            </div>
        </aside>
    </>
);

const SchedulePlanner: React.FC = () => {
    const { refresh } = useActiveEvent();
    const [list, setList] = useState<Conference[]>(() => getSchedules());
    const [seriesList, setSeriesList] = useState<ConferenceSeries[]>(() => getSeriesList());
    const [editing, setEditing] = useState<Conference | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [shown, setShown] = useState(false);
    const [editSeries, setEditSeries] = useState<ConferenceSeries | null>(null);
    const [seriesShown, setSeriesShown] = useState(false);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const provisional = useRef<string[]>([]);   // chuỗi tạo trong drawer buổi — dọn nếu buổi bị hủy

    const openDrawer = (conf: Conference, fresh: boolean) => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
        provisional.current = [];
        setEditing(conf); setIsNew(fresh); setShown(false);
        setTimeout(() => setShown(true), 20);
    };
    const closeDrawer = () => {
        // Dọn chuỗi được tạo trong drawer này mà KHÔNG buổi nào tham chiếu (buổi bị hủy / chuyển một-lần).
        const backed = new Set(getSchedules().map((c) => c.seriesId).filter(Boolean));
        let removed = false;
        provisional.current.forEach((id) => { if (!backed.has(id)) { removeSeries(id); removed = true; } });
        provisional.current = [];
        if (removed) setSeriesList(getSeriesList());
        setShown(false);
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setEditing(null), 300);
    };
    const openSeriesDrawer = (s: ConferenceSeries) => {
        if (sCloseTimer.current) { clearTimeout(sCloseTimer.current); sCloseTimer.current = null; }
        setEditSeries(s); setSeriesShown(false);
        setTimeout(() => setSeriesShown(true), 20);
    };
    const closeSeriesDrawer = () => {
        setSeriesShown(false);
        if (sCloseTimer.current) clearTimeout(sCloseTimer.current);
        sCloseTimer.current = setTimeout(() => setEditSeries(null), 300);
    };
    useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); if (sCloseTimer.current) clearTimeout(sCloseTimer.current); }, []);

    const openNew = () => openDrawer(newConference(), true);
    const openEdit = (c: Conference) => openDrawer({ ...c, speakers: c.speakers.map((s) => ({ ...s })) }, false);
    const openNewInSeries = (seriesId: string) => openDrawer(spawnOccurrence(seriesId), true);

    const change = (patch: Partial<Conference>) => setEditing((e) => (e ? { ...e, ...patch } : e));
    const setSpeaker = (id: string, patch: Partial<Speaker>) => setEditing((e) => (e ? { ...e, speakers: e.speakers.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : e));
    const addSpeaker = () => setEditing((e) => (e ? { ...e, speakers: [...e.speakers, newSpeaker()] } : e));
    const removeSpeaker = (id: string) => setEditing((e) => (e ? { ...e, speakers: e.speakers.filter((s) => s.id !== id) } : e));

    // Tạo chuỗi mới ngay trong drawer buổi → trả về id để chọn.
    const createSeries = (name: string, kind: SeriesKind): string => {
        const s: ConferenceSeries = { ...newSeries(), name: name.trim(), kind };
        upsertSeries(s);
        provisional.current.push(s.id);   // dọn nếu buổi bị hủy mà không lưu
        setSeriesList(getSeriesList());
        return s.id;
    };

    const save = () => {
        if (!editing) return;
        if (!editing.title.trim() || !editing.date) { toast.error('Cần ít nhất Chủ đề và Ngày'); return; }
        setList(upsertConference({ ...editing, title: editing.title.trim() }));
        refresh();
        toast.success(isNew ? 'Đã đặt lịch' : 'Đã lưu thay đổi');
        closeDrawer();
    };
    const del = (c: Conference) => {
        if (window.confirm(`Xóa buổi "${c.title || '(chưa đặt tên)'}"? Không thể hoàn tác.`)) {
            removeEvent(c.id);
            setList(getSchedules());
            refresh();
            toast.success('Đã xóa buổi');
        }
    };

    // Sửa/xóa chuỗi
    const changeSeries = (patch: Partial<ConferenceSeries>) => setEditSeries((s) => (s ? { ...s, ...patch } : s));
    const saveSeries = () => {
        if (!editSeries) return;
        if (!editSeries.name.trim()) { toast.error('Cần tên chuỗi'); return; }
        upsertSeries({ ...editSeries, name: editSeries.name.trim() });
        setSeriesList(getSeriesList());
        toast.success('Đã lưu chuỗi');
        closeSeriesDrawer();
    };
    const deleteSeries = () => {
        if (!editSeries) return;
        const occ = list.filter((c) => c.seriesId === editSeries.id);
        if (occ.length > 0) {
            const ok = window.confirm(
                `Chuỗi "${editSeries.name}" còn ${occ.length} buổi.\n\n` +
                `Bấm OK để GỠ các buổi này về "Sự kiện một lần" rồi xóa chuỗi (không mất buổi nào).\n` +
                `Bấm Cancel để giữ nguyên.`,
            );
            if (!ok) return;
            occ.forEach((c) => upsertConference({ ...c, seriesId: undefined }));   // detach → one-off
            setList(getSchedules());
            refresh();
        } else if (!window.confirm(`Xóa chuỗi "${editSeries.name}"?`)) {
            return;
        }
        removeSeries(editSeries.id);
        setSeriesList(getSeriesList());
        toast.success('Đã xóa chuỗi');
        closeSeriesDrawer();
    };

    const today = todayISO();
    const upcomingId = list.find((c) => c.date >= today)?.id;

    // Gộp nhóm: mỗi chuỗi → buổi con (sắp theo ngày); buổi có seriesId treo (chuỗi đã xóa) → về "một lần".
    const seriesIds = new Set(seriesList.map((s) => s.id));
    const oneOffs = list.filter((c) => !c.seriesId || !seriesIds.has(c.seriesId));
    const empty = list.length === 0 && seriesList.length === 0;

    return (
        <div className="h-full flex flex-col text-on-background overflow-hidden relative">
            <PageHeader icon="event" title="Đặt lịch hội nghị" subtitle="Sự kiện một lần & chuỗi hội nghị lặp lại · tài liệu tích lũy theo chuỗi (lưu tại máy)">
                <button onClick={openNew} className="btn-lux flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Đặt lịch mới</button>
            </PageHeader>
            <div className="flex-1 overflow-y-auto">
                <main className="max-w-[1000px] mx-auto px-6 md:px-10 py-8">
                    {empty ? (
                        <EmptyState icon="event_available" title="Chưa có lịch hội nghị nào"
                            hint="Đặt lịch để chuẩn bị trước: sự kiện một lần, hoặc một buổi thuộc chuỗi hội nghị lặp lại (One-team, BOD…) để tài liệu/từ điển tích lũy theo chuỗi.">
                            <button onClick={openNew} className="btn-lux flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Đặt lịch mới</button>
                        </EmptyState>
                    ) : (
                        <div className="space-y-5">
                            {seriesList.length > 0 && (
                                <div className="space-y-3">
                                    <h2 className="font-label-caps text-label-caps text-on-surface-variant/70">Chuỗi hội nghị lặp lại</h2>
                                    {seriesList.map((s) => (
                                        <SeriesGroupCard key={s.id} series={s}
                                            occs={list.filter((c) => c.seriesId === s.id).sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))}
                                            upcomingId={upcomingId} collapsed={!!collapsed[s.id]}
                                            onToggle={() => setCollapsed((m) => ({ ...m, [s.id]: !m[s.id] }))}
                                            onNewSession={() => openNewInSeries(s.id)} onManage={() => openSeriesDrawer(s)}
                                            onEditOcc={openEdit} onDeleteOcc={del} />
                                    ))}
                                </div>
                            )}
                            <div className="space-y-3">
                                <h2 className="font-label-caps text-label-caps text-on-surface-variant/70">Sự kiện một lần</h2>
                                {oneOffs.length === 0
                                    ? <p className="text-[13px] text-on-surface-variant/50 italic">Chưa có sự kiện một lần nào.</p>
                                    : oneOffs.map((c) => <ConferenceCard key={c.id} c={c} badge="oneoff" upcoming={c.id === upcomingId} onEdit={() => openEdit(c)} onDelete={() => del(c)} />)}
                            </div>
                        </div>
                    )}
                </main>
            </div>
            {editing && (
                <FormDrawer key={editing.id} conf={editing} shown={shown} isNew={isNew} seriesList={seriesList}
                    onChange={change} onSpeaker={setSpeaker} onAddSpeaker={addSpeaker} onRemoveSpeaker={removeSpeaker}
                    onCreateSeries={createSeries} onSave={save} onClose={closeDrawer} />
            )}
            {editSeries && (
                <SeriesDrawer key={editSeries.id} series={editSeries} occCount={list.filter((c) => c.seriesId === editSeries.id).length} shown={seriesShown}
                    onChange={changeSeries} onSave={saveSeries} onDelete={deleteSeries} onClose={closeSeriesDrawer} />
            )}
        </div>
    );
};

export default SchedulePlanner;
