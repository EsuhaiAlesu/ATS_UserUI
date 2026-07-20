import React, { useEffect, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { toast } from '../lib/toast';
import { getSchedules, upsertConference, newConference, newSpeaker } from '../lib/schedule';
import type { Conference, Speaker } from '../lib/schedule';
import { useActiveEvent } from '../lib/ActiveEventContext';
import { removeEvent } from '../lib/events';

// Đặt lịch hội nghị (Chuẩn bị · spec 1.2) — list of scheduled conferences + a slide-over form to
// create/edit one (date/time window · booker · topic · pre-settable expected speakers). Offline
// (localStorage via lib/schedule). Design system: navy + gold, card list + Raycast-style drawer.

const LANGS: { v: string; l: string }[] = [
    { v: '', l: '— ngôn ngữ —' }, { v: 'vi', l: 'Tiếng Việt' }, { v: 'ja', l: '日本語' },
    { v: 'en', l: 'English' }, { v: 'th', l: 'ไทย' }, { v: 'ko', l: '한국어' }, { v: 'zh', l: '中文' },
];
const INPUT = 'w-full bg-surface text-on-surface border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-secondary focus:outline-none field-lux transition-shadow';
const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const parse = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; };
const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

// ── One conference card ──
const ConferenceCard: React.FC<{ c: Conference; upcoming: boolean; onEdit: () => void; onDelete: () => void }> = ({ c, upcoming, onEdit, onDelete }) => {
    const d = parse(c.date);
    return (
        <div className="card-lux group bg-surface-container bg-gradient-to-b from-surface-container to-surface border-2 border-outline-variant rounded-2xl p-4 flex gap-4">
            <div className="shrink-0 w-16 rounded-xl bg-surface-container-high flex flex-col items-center justify-center py-2">
                <span className="text-2xl font-bold text-secondary tabular-nums leading-none">{d ? String(d.getDate()).padStart(2, '0') : '—'}</span>
                <span className="text-[11px] text-on-surface-variant mt-1 tabular-nums">{d ? `Th${d.getMonth() + 1}·${d.getFullYear()}` : ''}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-on-surface text-base truncate">{c.title || '(chưa đặt tên)'}</h3>
                    {upcoming && <span className="shrink-0 uppercase font-label-caps text-[9px] tracking-[0.1em] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">Sắp tới</span>}
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
                <button onClick={onEdit} title="Sửa lịch" className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">edit</span></button>
                <button onClick={onDelete} title="Xóa lịch" className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">delete</span></button>
            </div>
        </div>
    );
};

// ── Create / edit drawer ──
const FormDrawer: React.FC<{
    conf: Conference; shown: boolean; isNew: boolean;
    onChange: (patch: Partial<Conference>) => void;
    onSpeaker: (id: string, patch: Partial<Speaker>) => void;
    onAddSpeaker: () => void; onRemoveSpeaker: (id: string) => void;
    onSave: () => void; onClose: () => void;
}> = ({ conf, shown, isNew, onChange, onSpeaker, onAddSpeaker, onRemoveSpeaker, onSave, onClose }) => (
    <>
        <div className={`absolute inset-0 bg-background/50 backdrop-blur-[1px] z-30 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>
        <aside style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
            className={`absolute top-0 right-0 h-full w-full max-w-[520px] bg-surface-container-lowest border-l border-outline-variant z-40 flex flex-col shadow-2xl transition-transform duration-300 will-change-transform ${shown ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="shrink-0 flex items-center gap-3 px-5 h-16 border-b border-outline-variant">
                <span className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-secondary" aria-hidden="true">event</span></span>
                <span className="font-semibold text-on-surface text-lg flex-1">{isNew ? 'Đặt lịch mới' : 'Sửa lịch hội nghị'}</span>
                <button onClick={onClose} title="Đóng" className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <section className="space-y-3">
                    <h4 className="uppercase font-label-caps text-label-caps text-on-surface-variant">Thông tin hội nghị</h4>
                    <div>
                        <label className="text-[13px] text-on-surface-variant block mb-1">Chủ đề hội nghị *</label>
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
                <button onClick={onSave} className="btn-lux flex items-center gap-1.5 bg-secondary text-on-secondary px-5 py-2 rounded-lg font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">save</span>Lưu lịch</button>
            </div>
        </aside>
    </>
);

const SchedulePlanner: React.FC = () => {
    const { refresh } = useActiveEvent();
    const [list, setList] = useState<Conference[]>(() => getSchedules());
    const [editing, setEditing] = useState<Conference | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [shown, setShown] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const openDrawer = (conf: Conference, fresh: boolean) => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
        setEditing(conf); setIsNew(fresh); setShown(false);
        setTimeout(() => setShown(true), 20);
    };
    const closeDrawer = () => {
        setShown(false);
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setEditing(null), 300);
    };
    useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

    const openNew = () => openDrawer(newConference(), true);
    const openEdit = (c: Conference) => openDrawer({ ...c, speakers: c.speakers.map((s) => ({ ...s })) }, false);

    const change = (patch: Partial<Conference>) => setEditing((e) => (e ? { ...e, ...patch } : e));
    const setSpeaker = (id: string, patch: Partial<Speaker>) => setEditing((e) => (e ? { ...e, speakers: e.speakers.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : e));
    const addSpeaker = () => setEditing((e) => (e ? { ...e, speakers: [...e.speakers, newSpeaker()] } : e));
    const removeSpeaker = (id: string) => setEditing((e) => (e ? { ...e, speakers: e.speakers.filter((s) => s.id !== id) } : e));

    const save = () => {
        if (!editing) return;
        if (!editing.title.trim() || !editing.date) { toast.error('Cần ít nhất Chủ đề và Ngày'); return; }
        setList(upsertConference({ ...editing, title: editing.title.trim() }));
        refresh();   // propagate the new/edited event to the EventSwitcher + all prep surfaces
        toast.success(isNew ? 'Đã đặt lịch' : 'Đã lưu thay đổi');
        closeDrawer();
    };
    const del = (c: Conference) => {
        if (window.confirm(`Xóa lịch "${c.title || '(chưa đặt tên)'}"? Không thể hoàn tác.`)) {
            removeEvent(c.id);          // deletes + reconciles the active/activation pointers
            setList(getSchedules());
            refresh();
            toast.success('Đã xóa lịch');
        }
    };

    const today = todayISO();
    const upcomingId = list.find((c) => c.date >= today)?.id;

    return (
        <div className="h-full flex flex-col text-on-background overflow-hidden relative">
            <PageHeader icon="event" title="Đặt lịch hội nghị" subtitle="Lịch · người book · chủ đề · người phát biểu (lưu tại máy)">
                <button onClick={openNew} className="btn-lux flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Đặt lịch mới</button>
            </PageHeader>
            <div className="flex-1 overflow-y-auto">
                <main className="max-w-[1000px] mx-auto px-6 md:px-10 py-8">
                    {list.length === 0 ? (
                        <EmptyState icon="event_available" title="Chưa có lịch hội nghị nào"
                            hint="Đặt lịch để chuẩn bị trước: ngày giờ, người book, chủ đề, và danh sách người phát biểu dự kiến.">
                            <button onClick={openNew} className="btn-lux flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Đặt lịch mới</button>
                        </EmptyState>
                    ) : (
                        <div className="space-y-3">
                            {list.map((c) => (
                                <ConferenceCard key={c.id} c={c} upcoming={c.id === upcomingId} onEdit={() => openEdit(c)} onDelete={() => del(c)} />
                            ))}
                        </div>
                    )}
                </main>
            </div>
            {editing && (
                <FormDrawer conf={editing} shown={shown} isNew={isNew}
                    onChange={change} onSpeaker={setSpeaker} onAddSpeaker={addSpeaker} onRemoveSpeaker={removeSpeaker}
                    onSave={save} onClose={closeDrawer} />
            )}
        </div>
    );
};

export default SchedulePlanner;
