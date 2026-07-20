// Kho Tài liệu nguồn theo Sự kiện (spec 1.3). Each event keeps the raw documents imported for it
// (.docx/.pdf/.txt → extracted text) as provenance + a reference archive, separate from the derived
// Kịch bản. Local‑first (localStorage 'proyaku_docs:<eventId>'). The extracted text is capped so a
// few large documents across several events can't silently blow the ~5MB localStorage quota.

import { uid } from './schedule';

export interface SourceDoc {
    id: string;
    name: string;
    kind: 'text' | 'docx' | 'pdf';
    bytes: number;       // original file size
    chars: number;       // extracted text length (before capping)
    preview: string;     // first line(s) for the card
    text: string;        // extracted text, capped at MAX_TEXT
    md?: boolean;        // text still carries markdown syntax → strip it when parsing into the script
    importedAt: string;  // ISO
    note?: string;
}

const MAX_TEXT = 256 * 1024;   // cap stored text per doc (chars) to protect the localStorage quota
const dk = (eventId: string): string => `proyaku_docs:${eventId || '_default'}`;

const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const num = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);
const clampKind = (v: unknown): SourceDoc['kind'] => (v === 'docx' || v === 'pdf' ? v : 'text');

function normDoc(x: unknown): SourceDoc {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    const text = str(o.text);
    return {
        id: str(o.id) || uid(),
        name: str(o.name) || '(không tên)',
        kind: clampKind(o.kind),
        bytes: num(o.bytes),
        chars: num(o.chars) || text.length,
        preview: str(o.preview) || text.slice(0, 200),
        text,
        md: o.md === true ? true : undefined,
        importedAt: str(o.importedAt) || new Date().toISOString(),
        note: str(o.note) || undefined,
    };
}

function read(eventId: string): SourceDoc[] {
    try {
        const s = localStorage.getItem(dk(eventId));
        if (s) { const p: unknown = JSON.parse(s); if (Array.isArray(p)) return p.map(normDoc); }
    } catch { /* corrupt/absent → empty */ }
    return [];
}
function write(eventId: string, list: SourceDoc[]): void {
    try { localStorage.setItem(dk(eventId), JSON.stringify(list)); } catch { /* ignore quota/private-mode */ }
}

/** All docs for an event, newest first. */
export const getDocs = (eventId: string): SourceDoc[] =>
    read(eventId).sort((a, b) => b.importedAt.localeCompare(a.importedAt));

export const getDoc = (eventId: string, id: string): SourceDoc | undefined => read(eventId).find((d) => d.id === id);

export function upsertDoc(eventId: string, doc: SourceDoc): SourceDoc[] {
    const list = read(eventId);
    const i = list.findIndex((d) => d.id === doc.id);
    if (i >= 0) list[i] = doc; else list.push(doc);
    write(eventId, list);
    return getDocs(eventId);
}

export function removeDoc(eventId: string, id: string): SourceDoc[] {
    write(eventId, read(eventId).filter((d) => d.id !== id));
    return getDocs(eventId);
}

/** Build a SourceDoc from extracted text, capping the stored text and flagging if it was truncated. */
export function newSourceDoc(name: string, kind: SourceDoc['kind'], bytes: number, text: string, md = false): SourceDoc {
    const truncated = text.length > MAX_TEXT;
    return {
        id: uid(), name, kind, bytes,
        chars: text.length,
        preview: text.replace(/\s+/g, ' ').trim().slice(0, 160),
        text: truncated ? text.slice(0, MAX_TEXT) : text,
        md: md || undefined,
        importedAt: new Date().toISOString(),
        note: truncated ? 'Văn bản dài — đã lưu 256KB đầu' : undefined,
    };
}
