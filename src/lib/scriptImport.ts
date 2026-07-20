// File import for the script tool (spec 1.3) — DEPENDENCY‑FREE. .md/.txt/.csv/.srt are read via
// file.text(); .docx is unzipped in‑browser (ZIP central directory + DecompressionStream
// 'deflate-raw', no library) to pull word/document.xml. .pdf is delegated to the backend
// (api.ingestPdf). Every parse is defensive: any failure throws a clear Vietnamese message and never
// corrupts the current list. Untrusted file text only ever lands in a textarea `value` (no innerHTML).

import { newScriptEntry } from './script';
import type { ScriptEntry } from './api';

const MAX_FILE_BYTES = 8 * 1024 * 1024;    // rehearsal scripts are tiny; reject anything large
const MAX_PDF_BYTES = 25 * 1024 * 1024;    // scanned PDFs run bigger, but still bound the upload

export const docxSupported = (): boolean => typeof DecompressionStream !== 'undefined';

// ---------------------------------------------------------------- .docx (ZIP → word/document.xml)
const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readDocxXml(buf: ArrayBuffer): Promise<string> {
    const b = new Uint8Array(buf);
    if (!(b[0] === 0x50 && b[1] === 0x4b)) throw new Error('Không phải .docx (thiếu chữ ký ZIP) — hãy lưu lại dạng .docx.');
    // Locate the End Of Central Directory record (scan backward; it may carry a trailing comment).
    let eocd = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
        if (u32(b, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('File .docx hỏng (không thấy EOCD).');
    const cdCount = u16(b, eocd + 10);
    let p = u32(b, eocd + 16);
    // Walk the central directory — compressed size/offset here are authoritative (a data descriptor
    // can leave the local header's size fields zero).
    let localOff = -1, method = 8, compSize = 0;
    for (let n = 0; n < cdCount; n++) {
        if (u32(b, p) !== 0x02014b50) break;
        const m = u16(b, p + 10), cSize = u32(b, p + 20);
        const nameLen = u16(b, p + 28), extraLen = u16(b, p + 30), commentLen = u16(b, p + 32);
        const off = u32(b, p + 42);
        const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nameLen));
        if (name === 'word/document.xml') { localOff = off; method = m; compSize = cSize; break; }
        p += 46 + nameLen + extraLen + commentLen;
    }
    if (localOff < 0) throw new Error('File .docx không có word/document.xml.');
    if (u32(b, localOff) !== 0x04034b50) throw new Error('File .docx hỏng (local header).');
    const dataStart = localOff + 30 + u16(b, localOff + 26) + u16(b, localOff + 28);
    const comp = b.subarray(dataStart, dataStart + compSize);
    const raw = method === 0 ? comp : method === 8 ? await inflateRaw(comp) : null;
    if (!raw) throw new Error('File .docx dùng phương thức nén không hỗ trợ.');
    return new TextDecoder('utf-8').decode(raw);
}

function decodeEntities(s: string): string {
    return s
        .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(+n); } catch { return ''; } })
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => { try { return String.fromCodePoint(parseInt(n, 16)); } catch { return ''; } })
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

// document.xml → plain text: paragraphs become lines; tabs/breaks preserved so tab‑separated
// bilingual columns survive. All visible text lives in <w:t>; stripping the remaining tags simply
// concatenates the runs of a paragraph (spell‑check often splits one word across several runs).
function docxXmlToText(xml: string): string {
    const body = /<w:body\b[^>]*>([\s\S]*?)<\/w:body>/.exec(xml)?.[1] ?? xml;
    const text = body
        .replace(/<w:tab\b[^>]*\/?>/g, '\t')
        .replace(/<w:(?:br|cr)\b[^>]*\/?>/g, '\n')
        .replace(/<\/w:p>/g, '\n')
        .replace(/<[^>]+>/g, '');
    return decodeEntities(text);
}

// ---------------------------------------------------------------- plain text / markdown
function stripMarkdown(line: string): string {
    return line
        .replace(/^#{1,6}\s+/, '').replace(/^>\s?/, '').replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '')
        .replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .trim();
}

function toLines(text: string, md: boolean): string[] {
    return text.replace(/^﻿/, '').split(/\r?\n/)
        .map((l) => (md ? stripMarkdown(l) : l.trim()))
        // drop lines that are ENTIRELY an HR / table separator; keep content like "--- Màn 1 ---"
        .filter((l) => l && !/^\s*\|?[\s:|-]*-{3,}[\s:|-]*$/.test(l));
}

// ---------------------------------------------------------------- bilingual delimiter detection
export type Delim = 'auto' | 'tab' | 'pipe' | 'arrow' | 'none';
type RealDelim = Exclude<Delim, 'auto'>;
// Em‑dash/en‑dash are intentionally NOT delimiters: they occur in ordinary prose, so auto‑detect
// would falsely split monolingual "Người nói — lời thoại" lines. Only unambiguous markers here.
const DELIM_RE: Record<'tab' | 'pipe' | 'arrow', RegExp> = { tab: /\t/, pipe: /\s*\|\s*/, arrow: /\s*(?:=>|->|::)\s*/ };

function splitBy(line: string, d: 'tab' | 'pipe' | 'arrow'): [string, string] | null {
    const m = line.match(DELIM_RE[d]);
    if (!m || m.index === undefined) return null;
    return [line.slice(0, m.index).trim(), line.slice(m.index + m[0].length).trim()];
}

function detectDelim(lines: string[]): RealDelim {
    let best: 'tab' | 'pipe' | 'arrow' | null = null, bestCount = 0;
    for (const d of ['tab', 'pipe', 'arrow'] as const) {
        const count = lines.filter((l) => { const s = splitBy(l, d); return !!(s && s[0] && s[1]); }).length;
        if (count > bestCount) { best = d; bestCount = count; }
    }
    // Require a clear majority so a monolingual script that happens to contain one '|' isn't split.
    return best && bestCount >= Math.max(2, Math.ceil(lines.length * 0.6)) ? best : 'none';
}

export interface ParsedImport { entries: ScriptEntry[]; delim: RealDelim; total: number; paired: number }

/** Turn raw text into staged (not yet saved) script entries, detecting a bilingual delimiter. */
export function parseText(text: string, srcLang: string, dstLang: string, delim: Delim = 'auto', md = false): ParsedImport {
    const lines = toLines(text, md);
    const d: RealDelim = delim === 'auto' ? detectDelim(lines) : delim;
    let paired = 0;
    const entries = lines.map((l) => {
        const e = newScriptEntry(srcLang, dstLang);
        if (d !== 'none') {
            const s = splitBy(l, d);
            if (s && (s[0] || s[1])) { e.src = s[0]; e.dst = s[1]; if (s[1]) paired++; return e; }
        }
        e.src = l;
        return e;
    });
    return { entries, delim: d, total: entries.length, paired };
}

// ---------------------------------------------------------------- file dispatcher
export interface FileText { text: string; kind: 'text' | 'docx' | 'pdf'; md: boolean }

/** Read a file to raw text. `.pdf` returns kind:'pdf' with empty text so the caller routes it to the backend. */
export async function readImportFile(file: File): Promise<FileText> {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) {
        if (file.size > MAX_PDF_BYTES) throw new Error('PDF quá lớn (>25MB) — hãy tách nhỏ.');
        return { text: '', kind: 'pdf', md: false };
    }
    if (file.size > MAX_FILE_BYTES) throw new Error('File quá lớn (>8MB) — hãy tách nhỏ hoặc dán nội dung.');
    if (/\.(docx|docm|dotx|dotm)$/.test(name)) {
        if (!docxSupported()) throw new Error('Trình duyệt này không đọc được .docx — hãy dán nội dung, hoặc dùng .txt/.md.');
        return { text: docxXmlToText(await readDocxXml(await file.arrayBuffer())), kind: 'docx', md: false };
    }
    if (name.endsWith('.doc')) throw new Error('Định dạng .doc cũ không đọc được — hãy lưu lại dạng .docx hoặc .txt.');
    const md = name.endsWith('.md') || name.endsWith('.markdown');
    return { text: await file.text(), kind: 'text', md };
}
