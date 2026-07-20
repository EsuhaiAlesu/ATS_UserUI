import React, { useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { toast } from '../lib/toast';
import { useActiveEvent } from '../lib/ActiveEventContext';
import { useLiveSession } from '../lib/LiveSessionContext';
import { ingestPdf } from '../lib/api';
import { readImportFile, parseText } from '../lib/scriptImport';
import { getScriptLocal, writeScriptLocal } from '../lib/script';
import { getDocs, upsertDoc, removeDoc, newSourceDoc } from '../lib/docs';
import type { SourceDoc } from '../lib/docs';

// Tài liệu nguồn (Chuẩn bị · spec 1.3) — the imported source documents (.docx/.pdf/.txt) of the
// SELECTED event: a reference archive + provenance for the derived Kịch bản. Same event scope as the
// script tool (via useActiveEvent). Offline for .docx/.txt; .pdf needs the backend.

const KIND: Record<SourceDoc['kind'], { label: string; icon: string; tone: string }> = {
    docx: { label: 'DOCX', icon: 'description', tone: 'text-sky-400 bg-sky-400/15' },
    pdf: { label: 'PDF', icon: 'picture_as_pdf', tone: 'text-error bg-error/15' },
    text: { label: 'TEXT', icon: 'article', tone: 'text-secondary bg-secondary/15' },
};
const fmtBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : n >= 1024 ? `${Math.round(n / 1024)}KB` : `${n}B`);

// ── One document card ──
const DocCard: React.FC<{ d: SourceDoc; onView: () => void; onToScript: () => void; onDownload: () => void; onDelete: () => void }> = ({ d, onView, onToScript, onDownload, onDelete }) => {
    const k = KIND[d.kind];
    return (
        <div className="group bg-surface-container bg-gradient-to-b from-surface-container to-surface border-2 border-outline-variant rounded-2xl p-4 flex gap-4 transition-all duration-200 ease-out hover:border-outline hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${k.tone}`}>
                <span className="material-symbols-outlined" aria-hidden="true">{k.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-on-surface text-base truncate">{d.name}</h3>
                    <span className={`shrink-0 font-label-caps text-[9px] tracking-[0.1em] px-2 py-0.5 rounded-full ${k.tone}`}>{k.label}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[13px] text-on-surface-variant">
                    <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">notes</span>{d.chars.toLocaleString('vi')} ký tự</span>
                    {d.bytes > 0 && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">save</span>{fmtBytes(d.bytes)}</span>}
                    <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span>{d.importedAt.slice(0, 10)}</span>
                </div>
                {d.preview && <p className="text-[13px] text-on-surface-variant/70 mt-2 line-clamp-2">{d.preview}</p>}
                {d.note && <p className="text-[12px] text-secondary/80 mt-1">{d.note}</p>}
            </div>
            <div className="shrink-0 flex flex-col gap-1.5">
                <button onClick={onToScript} title="Tách vào Kịch bản của sự kiện" className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">playlist_add</span></button>
                <button onClick={onView} title="Xem toàn văn" className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">visibility</span></button>
                <button onClick={onDownload} title="Tải xuống .txt" className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">download</span></button>
                <button onClick={onDelete} title="Xoá tài liệu" className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">delete</span></button>
            </div>
        </div>
    );
};

// Keyed by eventId in the outer component so switching events remounts with the right event's docs
// (docs write to localStorage immediately, so a remount loses nothing and also resets the viewer).
const DocumentsLibraryInner: React.FC<{ eventId: string }> = ({ eventId }) => {
    const { event } = useActiveEvent();
    const session = useLiveSession();
    const [docs, setDocs] = useState<SourceDoc[]>(() => getDocs(eventId));
    const [busy, setBusy] = useState(false);
    const [drag, setDrag] = useState(false);
    const [viewing, setViewing] = useState<SourceDoc | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    const handleFile = async (file?: File | null) => {
        if (!file) return;
        setBusy(true);
        try {
            const r = await readImportFile(file);
            let text = r.text;
            if (r.kind === 'pdf') {
                if (!session.backendOnline) throw new Error('Đọc PDF cần backend — bật kết nối, hoặc dùng .docx/.txt/.md.');
                text = (await ingestPdf(file)).text ?? '';
            }
            if (!text.trim()) throw new Error('Không trích được văn bản từ tệp.');
            setDocs(upsertDoc(eventId, newSourceDoc(file.name, r.kind, file.size, text, r.md)));
            toast.success('Đã thêm tài liệu vào sự kiện');
        } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
        finally { setBusy(false); }
    };

    const toScript = (d: SourceDoc) => {
        const parsed = parseText(d.text, 'vi', 'ja', 'auto', d.md ?? false);
        if (!parsed.entries.length) { toast.error('Không có dòng nào để tách'); return; }
        writeScriptLocal(eventId, [...getScriptLocal(eventId), ...parsed.entries]);
        toast.success(`Đã tách ${parsed.entries.length} dòng vào Kịch bản — mở Kịch bản để duyệt`);
    };
    const download = (d: SourceDoc) => {
        try {
            const url = URL.createObjectURL(new Blob([d.text], { type: 'text/plain;charset=utf-8' }));
            const a = document.createElement('a');
            a.href = url; a.download = d.name.replace(/\.[^.]+$/, '') + '.txt';
            a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch { toast.error('Không tải được'); }
    };
    const del = (d: SourceDoc) => {
        if (window.confirm(`Xoá tài liệu "${d.name}"? Không thể hoàn tác.`)) { setDocs(removeDoc(eventId, d.id)); toast.success('Đã xoá tài liệu'); }
    };

    const accept = useMemo(() => `.md,.markdown,.txt,.csv,.srt,.docx,.docm,.dotx,.dotm${session.backendOnline ? ',.pdf' : ''}`, [session.backendOnline]);

    return (
        <div className="h-full flex flex-col bg-background text-on-background overflow-hidden relative">
            <PageHeader icon="folder_open" title="Tài liệu nguồn" subtitle={event ? `Sự kiện: ${event.title || '(chưa đặt tên)'}` : 'Kho tài liệu theo sự kiện (lưu tại máy)'}>
                <input ref={fileInput} type="file" accept={accept} className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                <button onClick={() => fileInput.current?.click()} className="flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>Nhập tài liệu</button>
            </PageHeader>
            <div className="flex-1 overflow-y-auto">
                <main className="max-w-[1000px] mx-auto px-6 md:px-10 py-8 space-y-4">
                    {/* Dropzone */}
                    <div onClick={() => fileInput.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]); }}
                        className={`cursor-pointer rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${drag ? 'border-sky-400 bg-sky-400/10' : 'border-outline-variant hover:border-sky-400/60 hover:bg-sky-400/[0.04]'}`}>
                        <span className={`inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-2 ${drag ? 'bg-sky-400/20' : 'bg-sky-400/10'}`}>
                            <span className={`material-symbols-outlined text-sky-400 ${busy ? 'animate-spin' : ''}`} style={{ fontSize: '30px' }} aria-hidden="true">{busy ? 'progress_activity' : 'cloud_upload'}</span>
                        </span>
                        <p className="text-base text-on-surface font-medium">{busy ? 'Đang đọc…' : 'Kéo‑thả tài liệu vào đây'}</p>
                        <p className="text-sm text-on-surface-variant mt-1">hoặc <span className="text-sky-400">bấm để chọn</span> · .md · .txt · .docx{session.backendOnline ? ' · .pdf' : ' (PDF cần backend)'}</p>
                    </div>

                    {docs.length === 0 ? (
                        <EmptyState icon="folder_open" title="Chưa có tài liệu nào"
                            hint="Nhập tài liệu nguồn (.docx/.pdf/.txt) cho sự kiện này. Có thể tách thẳng vào Kịch bản để dịch & duyệt." />
                    ) : (
                        <div className="space-y-3">
                            {docs.map((d) => (
                                <DocCard key={d.id} d={d} onView={() => setViewing(d)} onToScript={() => toScript(d)} onDownload={() => download(d)} onDelete={() => del(d)} />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* View full text */}
            {viewing && (
                <>
                    <div className="absolute inset-0 bg-background/60 z-30" onClick={() => setViewing(null)}></div>
                    <aside className="absolute top-0 right-0 h-full w-full max-w-[620px] bg-surface-container-lowest border-l border-outline-variant z-40 flex flex-col shadow-2xl">
                        <div className="shrink-0 flex items-center gap-3 px-5 h-16 border-b border-outline-variant">
                            <span className="material-symbols-outlined text-secondary shrink-0" aria-hidden="true">{KIND[viewing.kind].icon}</span>
                            <span className="font-semibold text-on-surface text-lg flex-1 truncate">{viewing.name}</span>
                            <button onClick={() => setViewing(null)} title="Đóng" className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                            <pre className="whitespace-pre-wrap break-words text-sm text-on-surface leading-relaxed jp-text font-sans">{viewing.text}</pre>
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
};

const DocumentsLibrary: React.FC = () => {
    const { eventId } = useActiveEvent();
    return <DocumentsLibraryInner key={eventId} eventId={eventId} />;
};

export default DocumentsLibrary;
