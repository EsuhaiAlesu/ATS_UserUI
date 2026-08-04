// src/lib/scriptTransfer.ts — move an approved script between machines.
//
// The `.json` written here is the app's own record, not a document: it carries the approvals, the
// per-row languages and the order — everything that took the work to produce, and everything that a
// re-import of the original .docx would throw away.
//
// Pure functions, no DOM: the page owns the download and the file picker, this owns the shape and the
// refusals. `parseScriptImport` NEVER throws and never returns an empty success — an import that produced
// nothing is an error with a sentence the operator can act on.

import type { ScriptEntry } from './api';

export const SCRIPT_EXPORT_FORMAT = 'proyaku-script';
export const SCRIPT_EXPORT_VERSION = 1;

export interface ScriptExportFile {
  format: typeof SCRIPT_EXPORT_FORMAT;
  version: number;
  eventId: string;
  dir: string;
  exportedAt: string;
  rows: ScriptEntry[];
}

/** Filename-safe: anything that is not a letter, digit, dash or underscore becomes a dash. */
function safe(part: string): string {
  return part.replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export function buildScriptExport(eventId: string, dir: string, rows: readonly ScriptEntry[], exportedAtISO: string): { filename: string; json: string } {
  const file: ScriptExportFile = {
    format: SCRIPT_EXPORT_FORMAT,
    version: SCRIPT_EXPORT_VERSION,
    eventId,
    dir,
    exportedAt: exportedAtISO,
    rows: rows.map((r) => ({ ...r })),
  };
  const stamp = exportedAtISO.replace(/[:.]/g, '').replace(/[TZ]/g, '-').replace(/-+$/, '');
  return { filename: `kichban_${safe(eventId) || 'buoi'}_${safe(stamp)}.json`, json: JSON.stringify(file, null, 2) };
}

/**
 * Read a `.json` script back.
 *
 * `idPrefix` regenerates every row id, so importing the same file twice — or importing a file exported
 * from a machine that happened to use the same ids — can never collide with rows already on screen.
 */
export function parseScriptImport(text: string, idPrefix: string): { rows: ScriptEntry[]; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { rows: [], error: 'Tệp này không phải tệp kịch bản .json đọc được — kịch bản hiện tại giữ nguyên.' };
  }

  const raw: unknown = Array.isArray(parsed) ? parsed : (parsed as { rows?: unknown })?.rows;
  if (!Array.isArray(raw)) {
    return { rows: [], error: 'Tệp này không phải tệp kịch bản .json đọc được — kịch bản hiện tại giữ nguyên.' };
  }

  const fileDir = typeof (parsed as { dir?: unknown })?.dir === 'string' ? (parsed as { dir: string }).dir : '';
  const [fileSrc, fileDst] = fileDir === 'ja-vi' ? ['ja', 'vi'] : ['vi', 'ja'];

  const rows: ScriptEntry[] = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== 'object') return;
    const r = item as Record<string, unknown>;
    const src = typeof r.src === 'string' ? r.src : '';
    if (!src.trim()) return; // a row with no source line is not a script line
    rows.push({
      ...(r as unknown as ScriptEntry),
      id: `${idPrefix}-${i}`,
      src,
      dst: typeof r.dst === 'string' ? r.dst : '',
      src_lang: typeof r.src_lang === 'string' ? r.src_lang : fileSrc,
      dst_lang: typeof r.dst_lang === 'string' ? r.dst_lang : fileDst,
      // Approvals travel — that is the point of moving the file. Anything that is not exactly 'approved'
      // is a draft, so a hand-edited file cannot invent a third state.
      status: r.status === 'approved' ? 'approved' : 'draft',
    } as ScriptEntry);
  });

  if (!rows.length) {
    return { rows: [], error: 'Tệp không có dòng kịch bản nào — kịch bản hiện tại giữ nguyên.' };
  }
  return { rows };
}
