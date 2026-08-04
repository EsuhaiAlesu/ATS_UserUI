// TASK 15 — a script that took hours to approve must be movable to another machine, and an import that
// produced nothing must never be reported in green. Both halves are asserted here: the pure functions
// directly, the page by reading its source (node environment, no DOM).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildScriptExport,
  parseScriptImport,
  SCRIPT_EXPORT_FORMAT,
  SCRIPT_EXPORT_VERSION,
} from '../src/lib/scriptTransfer';
import type { ScriptEntry } from '../src/lib/api';

const PAGE = readFileSync(new URL('../src/pages/ScriptPrep.tsx', import.meta.url), 'utf8');

const AT = '2026-08-08T02:00:00.000Z';

function row(over: Partial<ScriptEntry> = {}): ScriptEntry {
  return {
    id: 'r1', src: 'Kính thưa quý vị', dst: '皆様',
    src_lang: 'vi', dst_lang: 'ja', status: 'draft',
    ...over,
  } as ScriptEntry;
}

describe('export', () => {
  it('names itself, and carries the meeting, the direction and the time verbatim', () => {
    const { json } = buildScriptExport('gala-20', 'vi-ja', [row()], AT);
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe(SCRIPT_EXPORT_FORMAT);
    expect(parsed.version).toBe(SCRIPT_EXPORT_VERSION);
    expect(parsed.eventId).toBe('gala-20');
    expect(parsed.dir).toBe('vi-ja');
    expect(parsed.exportedAt).toBe(AT);
  });

  it('produces a filename that is safe and stable', () => {
    const { filename } = buildScriptExport('Lễ kỷ niệm 20 năm / Hội trường A', 'vi-ja', [row()], AT);
    expect(filename.startsWith('kichban_')).toBe(true);
    expect(filename.endsWith('.json')).toBe(true);
    expect(filename).toMatch(/^[\w.-]+$/);
  });

  it('copies the rows instead of referencing them', () => {
    const rows = [row({ src: 'nguyên bản' })];
    const { json } = buildScriptExport('e', 'vi-ja', rows, AT);
    rows[0].src = 'đã sửa sau khi xuất';
    expect(JSON.parse(json).rows[0].src).toBe('nguyên bản');
  });
});

describe('import', () => {
  it('round-trips three rows with their text, languages and approvals intact', () => {
    const rows = [
      row({ id: 'a', src: 'một', dst: 'いち', status: 'approved' }),
      row({ id: 'b', src: 'hai', dst: 'に' }),
      row({ id: 'c', src: 'ba', dst: 'さん', status: 'approved' }),
    ];
    const { json } = buildScriptExport('e', 'vi-ja', rows, AT);
    const res = parseScriptImport(json, 'p');
    expect(res.error).toBeUndefined();
    expect(res.rows).toHaveLength(3);
    res.rows.forEach((got, i) => {
      expect(got.src).toBe(rows[i].src);
      expect(got.dst).toBe(rows[i].dst);
      expect(got.src_lang).toBe(rows[i].src_lang);
      expect(got.dst_lang).toBe(rows[i].dst_lang);
      expect(got.status).toBe(rows[i].status);
    });
  });

  it('accepts a bare array with no wrapper', () => {
    const res = parseScriptImport(JSON.stringify([row({ src: 'một' }), row({ src: 'hai' })]), 'p');
    expect(res.error).toBeUndefined();
    expect(res.rows).toHaveLength(2);
  });

  it('refuses invalid JSON without throwing', () => {
    let res: ReturnType<typeof parseScriptImport> | undefined;
    expect(() => { res = parseScriptImport('{ not json at all', 'p'); }).not.toThrow();
    expect(res!.rows).toEqual([]);
    expect(res!.error).toBe('Tệp này không phải tệp kịch bản .json đọc được — kịch bản hiện tại giữ nguyên.');
  });

  it('refuses an object with no rows array the same way', () => {
    const res = parseScriptImport(JSON.stringify({ format: SCRIPT_EXPORT_FORMAT, eventId: 'e' }), 'p');
    expect(res.rows).toEqual([]);
    expect(res.error).toBe('Tệp này không phải tệp kịch bản .json đọc được — kịch bản hiện tại giữ nguyên.');
  });

  it('never returns an empty success for an empty array', () => {
    const res = parseScriptImport(JSON.stringify({ rows: [] }), 'p');
    expect(res.rows).toEqual([]);
    expect(res.error).toBe('Tệp không có dòng kịch bản nào — kịch bản hiện tại giữ nguyên.');
  });

  it('drops rows with no source line, and refuses when that leaves none', () => {
    const mixed = parseScriptImport(JSON.stringify({ rows: [row({ src: '   ' }), row({ src: 'thật' }), { dst: 'chỉ có đích' }] }), 'p');
    expect(mixed.error).toBeUndefined();
    expect(mixed.rows).toHaveLength(1);
    expect(mixed.rows[0].src).toBe('thật');

    const none = parseScriptImport(JSON.stringify({ rows: [row({ src: '' }), { dst: 'x' }] }), 'p');
    expect(none.rows).toEqual([]);
    expect(none.error).toBe('Tệp không có dòng kịch bản nào — kịch bản hiện tại giữ nguyên.');
  });

  it('regenerates ids from the prefix, so two imports of one file never collide', () => {
    const json = buildScriptExport('e', 'vi-ja', [row({ id: 'same' }), row({ id: 'same' , src: 'hai' })], AT).json;
    const a = parseScriptImport(json, 'json1');
    const b = parseScriptImport(json, 'json2');
    const idsA = a.rows.map((r) => r.id);
    const idsB = b.rows.map((r) => r.id);
    expect(new Set(idsA).size).toBe(idsA.length);
    expect(idsA.some((id) => idsB.includes(id))).toBe(false);
  });

  it('lets approvals travel but not invented states', () => {
    const res = parseScriptImport(JSON.stringify({ rows: [
      row({ src: 'một', status: 'approved' }),
      row({ src: 'hai', status: 'weird' as ScriptEntry['status'] }),
    ] }), 'p');
    expect(res.rows[0].status).toBe('approved');
    expect(res.rows[1].status).toBe('draft');
  });

  it("falls back to the file's dir when a row has no languages of its own", () => {
    const res = parseScriptImport(JSON.stringify({ dir: 'ja-vi', rows: [{ src: 'ありがとう', dst: 'cảm ơn' }] }), 'p');
    expect(res.rows[0].src_lang).toBe('ja');
    expect(res.rows[0].dst_lang).toBe('vi');
  });
});

describe('the page uses it', () => {
  it('refuses an empty import before it can report a success', () => {
    const refusal = PAGE.indexOf("toast.error('Tệp không có dòng kịch bản nào — kịch bản hiện tại giữ nguyên')");
    const success = PAGE.indexOf('toast.success(`Đã thêm');
    expect(refusal).toBeGreaterThan(-1);
    expect(success).toBeGreaterThan(-1);
    expect(refusal).toBeLessThan(success);
  });

  it('accepts .json and branches on it before the text reader runs', () => {
    expect(PAGE).toContain('`.json,.md,.markdown');
    const branch = PAGE.indexOf('/\\.json$/i.test(file.name)');
    const reader = PAGE.indexOf('await readImportFile(file)');
    expect(branch).toBeGreaterThan(-1);
    expect(reader).toBeGreaterThan(-1);
    expect(branch).toBeLessThan(reader);
  });
});
