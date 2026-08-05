import React, { useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { toast } from '../lib/toast';
import { useActiveEvent } from '../lib/ActiveEventContext';
import { upsertConference, newSpeaker } from '../lib/schedule';
import type { Conference, Segment, SegmentListen, SegmentMode } from '../lib/schedule';
import {
    importTimelineHtml, newSegment, segmentListens, timelineStats, autoListen, autoMode,
    resolveScriptAnchor, healSegmentAnchors, type ScriptAnchor,
} from '../lib/segments';
import { getScriptLocal } from '../lib/script';
import { loadScriptForSession } from '../lib/scriptLoad';
import { effectiveDocs } from '../lib/kbscope';

// Chương trình (Chuẩn bị) — Timeline của buổi lễ, đứng giữa Tài liệu và Kịch bản vì đó đúng là thứ tự
// công việc thật: Đặt lịch tạo buổi + người → Tài liệu nạp nguyên liệu → CHƯƠNG TRÌNH dựng khung và
// gán người/kiểu/tài liệu cho từng đoạn → Kịch bản viết lời cho các đoạn cần lời.
//
// Màn này KHÔNG viết một chữ nào vào Kịch bản. Nó chỉ trỏ: đoạn giữ `startScriptId` của dòng kịch bản
// đầu tiên thuộc về nó. Dòng kịch bản không bao giờ mang `segmentId` — hợp đồng `ScriptEntry` với
// Cascade Matcher là byte-đối-byte và mọi trường lạ sẽ bị nuốt ở lần đọc kế tiếp.

const MODES: { value: SegmentMode; label: string; hint: string }[] = [
    { value: 'script', label: 'Bám kịch bản', hint: 'Đọc gần đúng từng dòng — bật dẫn được' },
    { value: 'partial', label: 'Lệch một nửa', hint: 'Có bài nhưng nói thêm — dùng tài liệu của người này làm bối cảnh' },
    { value: 'none', label: 'Nói tự do', hint: 'Máy dịch hoàn toàn tự động' },
];

const LISTENS: { value: SegmentListen; label: string }[] = [
    { value: 'auto', label: 'Tự động' },
    { value: 'on', label: 'Nghe' },
    { value: 'off', label: 'Câm' },
];

const FIELD =
    'w-full bg-surface text-on-surface border border-outline-variant rounded-lg py-1.5 px-2 text-[13px] ' +
    'focus:ring-0 focus:border-secondary field-lux';

// ── Một dòng Timeline ────────────────────────────────────────────────────────────────────────────
const Row: React.FC<{
    seg: Segment;
    n: number;
    conf: Conference;
    scriptRows: { id: string; src: string }[];
    docs: { id: string; name: string }[];
    onPatch: (p: Partial<Segment>) => void;
    onRemove: () => void;
    onAddSpeaker: () => void;
    anchor: ScriptAnchor;
}> = ({ seg, n, conf, scriptRows, docs, onPatch, onRemove, onAddSpeaker, anchor }) => {
    const [open, setOpen] = useState(false);
    const listens = segmentListens(seg);

    if (seg.divider) {
        return (
            <div className="flex items-center gap-3 pt-5 pb-1">
                <span className="material-symbols-outlined text-secondary text-[18px]" aria-hidden="true">bookmark</span>
                <input value={seg.title} onChange={(e) => onPatch({ title: e.target.value })}
                    className="flex-1 bg-transparent border-0 focus:ring-0 p-0 font-label-caps text-label-caps tracking-[0.14em] text-secondary" />
                <button onClick={onRemove} title="Xoá dòng tiêu đề"
                    className="w-7 h-7 rounded-lg grid place-items-center text-on-surface-variant hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-[17px]" aria-hidden="true">close</span>
                </button>
            </div>
        );
    }

    const speakerName = conf.speakers.find((s) => s.id === seg.speakerId)?.name;
    const nDocs = seg.docIds?.length ?? 0;

    return (
        <div className={`rounded-xl border transition-colors ${listens ? 'border-outline-variant bg-surface-container' : 'border-outline-variant/50 bg-surface-container-lowest'}`}>
            <div className="flex items-start gap-2.5 p-2.5">
                <span className="shrink-0 w-6 pt-1.5 text-right tabular-nums font-label-caps text-[11px] text-on-surface-variant/60">{n}</span>

                {/* giờ + thời lượng — chỉ để người điều khiển dò theo bản giấy */}
                <div className="shrink-0 w-[74px] space-y-1">
                    <input value={seg.time ?? ''} onChange={(e) => onPatch({ time: e.target.value })} placeholder="18:29"
                        className={`${FIELD} tabular-nums text-center`} aria-label="Giờ" />
                    <input value={seg.dur ?? ''} onChange={(e) => onPatch({ dur: e.target.value })} placeholder="3'"
                        className={`${FIELD} tabular-nums text-center opacity-70`} aria-label="Thời lượng" />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex gap-1.5">
                        <input value={seg.kind ?? ''} onChange={(e) => onPatch({ kind: e.target.value })} placeholder="LOẠI (MC · PHÁT BIỂU · VIDEO…)"
                            className={`${FIELD} w-[190px] shrink-0 font-label-caps text-[11px] tracking-[0.08em]`} aria-label="Loại dòng" />
                        <input value={seg.title} onChange={(e) => onPatch({ title: e.target.value })} placeholder="Nội dung đoạn"
                            className={`${FIELD} flex-1 min-w-0`} aria-label="Nội dung" />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* nghe / câm — cái quan trọng nhất của cả bảng này */}
                        <div className="flex items-center gap-0.5 bg-surface rounded-lg p-0.5">
                            {LISTENS.map((l) => (
                                <button key={l.value} type="button" onClick={() => onPatch({ listen: l.value })}
                                    title={l.value === 'auto' ? `Tự động theo loại dòng — hiện là ${autoListen(seg.kind) ? 'NGHE' : 'CÂM'}` : undefined}
                                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${seg.listen === l.value ? (l.value === 'off' ? 'bg-error/80 text-white' : 'bg-secondary text-on-secondary') : 'text-on-surface-variant hover:text-on-surface'}`}>
                                    {l.label}
                                </button>
                            ))}
                        </div>
                        <span className={`font-label-caps text-[10px] px-2 py-1 rounded-md ${listens ? 'text-secondary bg-secondary/10' : 'text-error bg-error/10'}`}>
                            {listens ? 'MÁY NGHE' : 'MÁY CÂM'}
                        </span>

                        {listens && (
                            <>
                                <select value={seg.speakerId ?? ''} onChange={(e) => { if (e.target.value === '::them::') onAddSpeaker(); else onPatch({ speakerId: e.target.value || undefined }); }}
                                    className={`${FIELD} w-auto max-w-[190px] cursor-pointer`} aria-label="Người nói">
                                    <option value="">— chưa gán người —</option>
                                    {conf.speakers.filter((s) => s.name.trim()).map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}{s.role?.trim() ? ` · ${s.role.trim()}` : ''}</option>
                                    ))}
                                    <option value="::them::">+ Thêm người vào buổi…</option>
                                </select>

                                <select value={seg.lang ?? ''} onChange={(e) => onPatch({ lang: e.target.value })}
                                    className={`${FIELD} w-[112px] cursor-pointer`} aria-label="Tiếng người này nói" title="Máy được mách trước để khỏi đoán sai câu đầu tiên">
                                    <option value="">Tiếng: tự nhận</option>
                                    <option value="vi">Tiếng Việt</option>
                                    <option value="ja">Tiếng Nhật</option>
                                </select>

                                <select value={seg.mode ?? 'none'} onChange={(e) => onPatch({ mode: e.target.value as SegmentMode })}
                                    className={`${FIELD} w-[142px] cursor-pointer`} aria-label="Kiểu nói"
                                    title={MODES.find((m) => m.value === (seg.mode ?? 'none'))?.hint}>
                                    {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>

                                <button type="button" onClick={() => setOpen((v) => !v)}
                                    className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${open ? 'border-secondary text-secondary' : 'border-outline-variant text-on-surface-variant hover:text-on-surface'}`}>
                                    {seg.mode === 'script'
                                        ? (anchor.kind === 'ok' ? 'Đã gắn dòng kịch bản' : anchor.kind === 'none' ? 'Gắn dòng kịch bản' : 'Gắn LẠI dòng kịch bản')
                                        : (nDocs ? `${nDocs} tài liệu` : 'Gắn tài liệu')}
                                </button>
                                {seg.mode === 'script' && anchor.kind !== 'ok' && anchor.kind !== 'none' && (
                                    <span className="font-label-caps text-[10px] px-2 py-1 rounded-md text-error bg-error/10">
                                        {anchor.kind === 'lost' ? 'MẤT DẤU' : 'CHƯA DUYỆT'}
                                    </span>
                                )}
                            </>
                        )}
                    </div>

                    {seg.owner && <p className="text-[11px] leading-snug text-on-surface-variant/60 line-clamp-2" title={seg.owner}>Bản gốc: {seg.owner}</p>}
                    {listens && !seg.speakerId && <p className="text-[11px] text-error/80">Chưa gán người nói — máy vẫn dịch được, nhưng không lấy được tài liệu riêng.</p>}
                    {speakerName && seg.mode === 'partial' && nDocs === 0 && (
                        <p className="text-[11px] text-on-surface-variant/70">Kiểu “lệch một nửa” mà chưa gắn tài liệu của {speakerName} — bối cảnh sẽ lấy chung của cả buổi.</p>
                    )}
                </div>

                <button onClick={onRemove} title="Xoá đoạn"
                    className="shrink-0 w-7 h-7 rounded-lg grid place-items-center text-on-surface-variant hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-[17px]" aria-hidden="true">delete</span>
                </button>
            </div>

            {open && (
                <div className="border-t border-outline-variant px-3 py-2.5 space-y-2">
                    {seg.mode === 'script' ? (
                        <>
                            <div className="font-label-caps text-[10px] tracking-[0.14em] text-on-surface-variant/60">DÒNG KỊCH BẢN ĐẦU TIÊN CỦA ĐOẠN</div>
                            <select value={seg.startScriptId ?? ''}
                                onChange={(e) => {
                                    const id = e.target.value;
                                    // Lưu kèm NỘI DUNG làm neo dự phòng: id sẽ đổi ở lần nhập lại kịch bản kế tiếp.
                                    const row = scriptRows.find((r) => r.id === id);
                                    onPatch({ startScriptId: id || undefined, startScriptText: row ? row.src : undefined });
                                }}
                                className={`${FIELD} cursor-pointer`}>
                                <option value="">— chưa gắn —</option>
                                {scriptRows.map((r, i) => <option key={r.id} value={r.id}>{i + 1}. {r.src.slice(0, 90)}</option>)}
                            </select>
                            <p className="text-[11px] text-on-surface-variant/70">Đoạn sở hữu mọi dòng từ đây tới dòng đầu của đoạn sau. Bấm sang đoạn này ở màn điều khiển là con trỏ nhảy đúng dòng.</p>
                            {anchor.kind === 'lost' && seg.startScriptText && (
                                <p className="text-[11px] text-error">Neo cũ: “{seg.startScriptText.slice(0, 70)}…” — không còn dòng nào khớp.</p>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="font-label-caps text-[10px] tracking-[0.14em] text-on-surface-variant/60">TÀI LIỆU RIÊNG CỦA ĐOẠN NÀY</div>
                            {docs.length === 0
                                ? <p className="text-[12px] text-on-surface-variant">Buổi này chưa có tài liệu nào — nạp ở màn Tài liệu.</p>
                                : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {docs.map((d) => {
                                            const on = seg.docIds?.includes(d.id) ?? false;
                                            return (
                                                <button key={d.id} type="button"
                                                    onClick={() => onPatch({ docIds: on ? (seg.docIds ?? []).filter((x) => x !== d.id) : [...(seg.docIds ?? []), d.id] })}
                                                    className={`px-2.5 py-1 rounded-full text-[12px] border transition-colors ${on ? 'border-secondary bg-secondary/15 text-on-surface' : 'border-outline-variant text-on-surface-variant hover:text-on-surface'}`}>
                                                    {on ? '✓ ' : ''}{d.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            <p className="text-[11px] text-on-surface-variant/70">Khi tới đoạn này, máy lấy đúng những tài liệu đã chọn làm bối cảnh — thay vì chia đều ngân sách cho cả kho rồi rơi hết.</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Trang ────────────────────────────────────────────────────────────────────────────────────────
const ProgramTimeline: React.FC = () => {
    const { event, refresh } = useActiveEvent();
    const fileRef = useRef<HTMLInputElement>(null);

    const segments = event?.segments ?? [];
    const stats = useMemo(() => timelineStats(segments), [segments]);
    const scriptRows = useMemo(() => (event ? getScriptLocal(event.id).map((r) => ({ id: r.id, src: r.src })) : []), [event]);
    // Kịch bản LANE sẽ giữ (chỉ dòng đã duyệt) — con trỏ đếm theo danh sách này, không theo danh sách đầy đủ.
    const approvedRows = useMemo(() => (event ? loadScriptForSession(event.id).rows.map((r) => ({ id: r.id, src: r.src })) : []), [event]);
    const anchors = useMemo(() => segments.map((s) => resolveScriptAnchor(s, approvedRows, scriptRows)), [segments, approvedRows, scriptRows]);
    // Chỉ đếm những đoạn THẬT SỰ cần dòng kịch bản: đoạn nói tự do không gắn gì là chuyện bình thường.
    const broken = segments.filter((s, i) => s.mode === 'script' && (anchors[i].kind === 'lost' || anchors[i].kind === 'unapproved')).length;
    const healable = anchors.some((a) => a.kind === 'ok' && a.healed);
    const docs = useMemo(() => { try { return event ? effectiveDocs(event).map((d) => ({ id: d.id, name: d.name })) : []; } catch { return []; } }, [event]);

    const save = (next: Segment[]): void => {
        if (!event) return;
        upsertConference({ ...event, segments: next });
        refresh();
    };
    const patch = (id: string, p: Partial<Segment>): void => save(segments.map((s) => (s.id === id ? { ...s, ...p } : s)));

    const addSpeakerTo = (segId: string): void => {
        if (!event) return;
        const name = window.prompt('Tên người nói (sẽ được thêm vào danh sách người phát biểu của buổi):', '');
        if (!name?.trim()) return;
        const sp = { ...newSpeaker(), name: name.trim() };
        upsertConference({
            ...event,
            speakers: [...event.speakers, sp],
            segments: segments.map((s) => (s.id === segId ? { ...s, speakerId: sp.id } : s)),
        });
        refresh();
        toast.success(`Đã thêm ${sp.name} vào buổi`);
    };

    const onImport = async (file: File): Promise<void> => {
        if (!event) return;
        const text = await file.text();
        const res = importTimelineHtml(text);
        if (res.rows === 0) { toast.error('Không đọc được dòng nào trong tệp — kiểm tra lại file Timeline.'); return; }
        if (segments.length && !window.confirm(`Timeline hiện có ${segments.length} dòng sẽ bị THAY bằng ${res.rows} dòng vừa đọc. Tiếp tục?`)) return;
        save(res.segments);
        toast.success(`Đã nhập ${res.rows} dòng · ${res.sections} phần. Người nói để trống — gán tay từng dòng.`);
    };

    if (!event) {
        return (
            <div className="flex flex-col h-full">
                <PageHeader icon="event_note" title="Chương trình" subtitle="Timeline & người nói" />
                <div className="flex-1 overflow-y-auto">
                    <EmptyState icon="calendar_month" title="Chưa chọn buổi nào"
                        hint="Timeline thuộc về một buổi cụ thể. Mở Đặt lịch, chọn buổi rồi quay lại đây." />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <PageHeader icon="event_note" title="Chương trình" subtitle={event.title.trim() || 'Buổi chưa đặt tên'}>
                <div className="ml-auto flex items-center gap-2">
                    <input ref={fileRef} type="file" accept=".html,.htm" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ''; }} />
                    <button onClick={() => fileRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant text-on-surface-variant px-3 py-1.5 text-[13px] hover:text-primary hover:border-primary transition-colors">
                        <span className="material-symbols-outlined text-[17px]" aria-hidden="true">upload_file</span>Nhập từ file HTML
                    </button>
                    <button onClick={() => save([...segments, newSegment()])}
                        className="inline-flex items-center gap-1.5 rounded-lg btn-lux bg-secondary text-on-secondary px-3 py-1.5 text-[13px] font-semibold hover:opacity-90">
                        <span className="material-symbols-outlined text-[17px]" aria-hidden="true">add</span>Thêm đoạn
                    </button>
                </div>
            </PageHeader>

            <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                {segments.length === 0 ? (
                    <EmptyState icon="event_note" title="Chưa dựng Timeline cho buổi này"
                        hint="Nhập từ file HTML của chương trình (đọc được giờ · thời lượng · loại · nội dung), hoặc thêm từng đoạn bằng tay. Người nói luôn phải gán tay — ô người phụ trách trong file gốc là văn xuôi, máy tách không đúng được.">
                        <button onClick={() => fileRef.current?.click()}
                            className="inline-flex items-center gap-1.5 rounded-lg btn-lux bg-secondary text-on-secondary px-4 py-2 text-sm font-semibold hover:opacity-90">
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>Nhập từ file HTML
                        </button>
                        <button onClick={() => save([newSegment()])}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant text-on-surface px-4 py-2 text-sm hover:border-primary hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Thêm đoạn đầu tiên
                        </button>
                    </EmptyState>
                ) : (
                    <>
                        {/* Bảng tổng — trả lời đúng câu hỏi mà không màn nào hôm nay trả lời được:
                            buổi này máy phải câm bao nhiêu lần. */}
                        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-outline-variant bg-surface-container px-4 py-3">
                            <div><div className="font-label-caps text-[10px] tracking-[0.14em] text-on-surface-variant/60">TỔNG</div><div className="text-[15px] font-semibold text-on-surface tabular-nums">{stats.rows} đoạn</div></div>
                            <div><div className="font-label-caps text-[10px] tracking-[0.14em] text-on-surface-variant/60">MÁY NGHE</div><div className="text-[15px] font-semibold text-secondary tabular-nums">{stats.listen}</div></div>
                            <div><div className="font-label-caps text-[10px] tracking-[0.14em] text-on-surface-variant/60">MÁY CÂM</div><div className="text-[15px] font-semibold text-on-surface-variant tabular-nums">{stats.mute}</div></div>
                            {stats.noSpeaker > 0 && (
                                <div className="ml-auto text-[12px] text-error/90 max-w-md leading-snug">
                                    Còn <b>{stats.noSpeaker}</b> đoạn có tiếng nói nhưng chưa gán người — vẫn dịch được, chỉ là không lấy được tài liệu riêng của người đó.
                                </div>
                            )}
                        </div>

                        {/* Nhập lại kịch bản là mọi `startScriptId` mồ côi cùng lúc. Neo chữ tìm lại được dòng
                            cũ; chỗ nào không tìm được thì nói thẳng chứ không để con trỏ đứng im giữa buổi lễ. */}
                        {(healable || broken > 0) && (
                            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-error/50 bg-error/[0.07] px-4 py-3">
                                <span className="material-symbols-outlined text-error text-[19px]" aria-hidden="true">link_off</span>
                                <div className="flex-1 min-w-[240px] text-[12.5px] leading-snug text-on-surface">
                                    {healable
                                        ? <>Kịch bản đã được nhập lại — có đoạn đang bám theo <b>nội dung dòng</b> chứ không còn bám theo mã. Bấm gắn lại để chốt.</>
                                        : <>Có <b>{broken}</b> đoạn “Bám kịch bản” không dùng được con trỏ: dòng đã mất dấu hoặc chưa được duyệt.</>}
                                </div>
                                {healable && (
                                    <button onClick={() => {
                                        const r = healSegmentAnchors(segments, approvedRows, scriptRows);
                                        save(r.segments);
                                        toast.success(`Đã gắn lại ${r.healed} đoạn${r.lost ? ` · còn ${r.lost} đoạn mất dấu, gắn tay` : ''}`);
                                    }}
                                        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg btn-lux bg-secondary text-on-secondary px-3 py-1.5 text-[13px] font-semibold hover:opacity-90">
                                        <span className="material-symbols-outlined text-[17px]" aria-hidden="true">link</span>Gắn lại tự động
                                    </button>
                                )}
                            </div>
                        )}

                        {segments.map((seg, i) => (
                            <Row key={seg.id} seg={seg} conf={event} scriptRows={scriptRows} docs={docs} anchor={anchors[i]}
                                n={segments.slice(0, i).filter((s) => !s.divider).length + 1}
                                onPatch={(p) => patch(seg.id, p)}
                                onRemove={() => save(segments.filter((s) => s.id !== seg.id))}
                                onAddSpeaker={() => addSpeakerTo(seg.id)} />
                        ))}

                        <p className="pt-2 text-[12px] text-on-surface-variant/70 leading-relaxed">
                            “Tự động” đọc LOẠI dòng để quyết máy nghe hay câm — {autoMode('MC') === 'script' ? 'MC ⇒ bám kịch bản' : ''}, video / bài hát / Yosakoi / chụp ảnh ⇒ câm.
                            Đặt tay “Nghe” hoặc “Câm” thì lệnh tay luôn thắng.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProgramTimeline;
