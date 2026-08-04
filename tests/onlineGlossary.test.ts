// TASK 19 — the ONLINE lane's own glossary. Separate store from the offline /glossary page ON PURPOSE:
// that page talks to `/api`, which the deployed build cannot reach. These cases pin the line-oriented
// editor, the server's normalisation, and the direction of the wiring — a lane file must never be
// reachable from the offline side.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  parseGlossaryLines,
  formatGlossaryLines,
  ONLINE_GLOSSARY_MAX,
  type OnlineGlossaryEntry,
} from '../src/lib/lanes/online/onlineGlossary';

const { normalizeGlossaryEntries } = await import('../server/online-api.mjs');

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SERVER = read('server/online-api.mjs');
const FACADE = read('src/lib/lanes/online/index.ts');
const PREP = read('src/lib/prepData.ts');
const API = read('src/lib/api.ts');
const GLOSSARY = read('src/lib/lanes/online/onlineGlossary.ts');

describe('the editor text', () => {
  it('reads a plain pair, with no asr_hotword key at all', () => {
    const { entries, invalid } = parseGlossaryLines('Esuhai = エスハイ');
    expect(entries).toEqual([{ vi: 'Esuhai', ja: 'エスハイ' }]);
    expect('asr_hotword' in entries[0]).toBe(false);
    expect(invalid).toEqual([]);
  });

  it('takes a trailing * as the priming mark and leaves it in neither side', () => {
    expect(parseGlossaryLines('Esuhai = エスハイ *').entries).toEqual([{ vi: 'Esuhai', ja: 'エスハイ', asr_hotword: true }]);
    expect(parseGlossaryLines('GEM Center *').entries).toEqual([{ vi: 'GEM Center', ja: '', asr_hotword: true }]);
  });

  it('skips blank lines and # comments in silence, without calling them invalid', () => {
    const { entries, invalid } = parseGlossaryLines('\n   \n# một ghi chú\nEsuhai = エスハイ\n\t\n');
    expect(entries).toHaveLength(1);
    expect(invalid).toEqual([]);
  });

  it('does not care about spacing around the =', () => {
    const want = [{ vi: 'a', ja: 'b' }];
    expect(parseGlossaryLines('a=b').entries).toEqual(want);
    expect(parseGlossaryLines('a = b').entries).toEqual(want);
    expect(parseGlossaryLines('  a  =  b  ').entries).toEqual(want);
  });

  it('reports a line with an = but nothing either side, verbatim, instead of dropping it', () => {
    const { entries, invalid } = parseGlossaryLines('  =  ');
    expect(entries).toEqual([]);
    expect(invalid).toEqual(['=']);
  });

  it('splits on the FIRST = only', () => {
    expect(parseGlossaryLines('a = b = c').entries).toEqual([{ vi: 'a', ja: 'b = c' }]);
  });

  it('never throws on empty or undefined input', () => {
    expect(parseGlossaryLines('')).toEqual({ entries: [], invalid: [] });
    expect(() => parseGlossaryLines(undefined as unknown as string)).not.toThrow();
    expect(parseGlossaryLines(undefined as unknown as string)).toEqual({ entries: [], invalid: [] });
  });

  it('stops at the ceiling instead of growing without bound', () => {
    const text = Array.from({ length: ONLINE_GLOSSARY_MAX + 50 }, (_, i) => `t${i} = j${i}`).join('\n');
    expect(parseGlossaryLines(text).entries).toHaveLength(ONLINE_GLOSSARY_MAX);
  });
});

describe('and back again', () => {
  it('is stable through a second round trip', () => {
    const text = 'Esuhai = エスハイ *\nGEM Center *\nkỹ sư = エンジニア\n# ghi chú\n';
    const once = formatGlossaryLines(parseGlossaryLines(text).entries);
    const twice = formatGlossaryLines(parseGlossaryLines(once).entries);
    expect(twice).toBe(once);
  });

  it('formats a one-sided entry with no stray = and a hotword with a single trailing *', () => {
    const oneSided: OnlineGlossaryEntry[] = [{ vi: 'GEM Center', ja: '' }];
    const hotword: OnlineGlossaryEntry[] = [{ vi: 'Esuhai', ja: 'エスハイ', asr_hotword: true }];
    expect(formatGlossaryLines(oneSided)).toBe('GEM Center');
    expect(formatGlossaryLines([{ vi: '', ja: 'エスハイ' }])).toBe('エスハイ');
    expect(formatGlossaryLines(hotword)).toBe('Esuhai = エスハイ *');
  });

  it('formats an entry with neither side to nothing, not to an empty line', () => {
    expect(formatGlossaryLines([{ vi: '', ja: '' }])).toBe('');
    expect(formatGlossaryLines([{ vi: '', ja: '' }, { vi: 'a', ja: 'b' }])).toBe('a = b');
  });
});

describe('the server keeps the store boring', () => {
  it('drops what is not a term', () => {
    expect(normalizeGlossaryEntries([{ vi: '', ja: '   ' }, null, 'a string', 42, { note: 'chỉ có ghi chú' }])).toEqual([]);
    expect(normalizeGlossaryEntries('not an array')).toEqual([]);
    expect(normalizeGlossaryEntries(undefined)).toEqual([]);
  });

  it('strips unknown fields', () => {
    expect(normalizeGlossaryEntries([{ vi: 'a', ja: 'b', evil: 1 }])).toEqual([{ vi: 'a', ja: 'b' }]);
  });

  it('clips long fields to 200 chars and takes asr_hotword only when it is exactly true', () => {
    const long = 'x'.repeat(400);
    expect(normalizeGlossaryEntries([{ vi: long, ja: 'b' }])[0].vi).toHaveLength(200);
    expect(normalizeGlossaryEntries([{ vi: 'a', ja: 'b', asr_hotword: true }])[0].asr_hotword).toBe(true);
    expect(normalizeGlossaryEntries([{ vi: 'a', ja: 'b', asr_hotword: 'true' }])[0].asr_hotword).toBeUndefined();
    expect(normalizeGlossaryEntries([{ vi: 'a', ja: 'b', asr_hotword: 1 }])[0].asr_hotword).toBeUndefined();
  });

  it('keeps misheard as trimmed non-empty strings, capped at 12, and survives a non-array', () => {
    const many = Array.from({ length: 20 }, (_, i) => ` sai${i} `);
    expect(normalizeGlossaryEntries([{ vi: 'a', ja: 'b', misheard: many }])[0].misheard).toHaveLength(12);
    expect(normalizeGlossaryEntries([{ vi: 'a', ja: 'b', misheard: [' x ', '', '  ', 'y'] }])[0].misheard).toEqual(['x', 'y']);
    expect(() => normalizeGlossaryEntries([{ vi: 'a', ja: 'b', misheard: 'not an array' }])).not.toThrow();
    expect(normalizeGlossaryEntries([{ vi: 'a', ja: 'b', misheard: 'not an array' }])[0].misheard).toBeUndefined();
  });

  it('enforces the entry ceiling', () => {
    const many = Array.from({ length: 3_000 }, (_, i) => ({ vi: `t${i}`, ja: `j${i}` }));
    expect(normalizeGlossaryEntries(many)).toHaveLength(2_000);
  });
});

describe('wired up, and wired up in the allowed direction', () => {
  it('serves both routes under /online-api/ and adds no auth of its own', () => {
    expect(SERVER).toContain("pathname === '/online-api/glossary' && req.method === 'GET'");
    expect(SERVER).toContain("pathname === '/online-api/glossary' && req.method === 'PUT'");
    // The gate is inherited: server.js passes requireAuth into installOnlineApi and the handler answers
    // 401 before any route matches. A second implementation here would be a second thing to get wrong.
    expect(SERVER).not.toContain('AUTH_');
    expect(SERVER).not.toMatch(/function requireAuth|const requireAuth\s*=/);
  });

  it('is exported by the facade', () => {
    expect(FACADE).toContain("from './onlineGlossary'");
  });

  it('is read by prepData over HTTP, with no lane import', () => {
    expect(PREP).toContain("fetch('/online-api/glossary'");
    // The bridge may not import a lane file — search for the IMPORT, not the bare words: the file's own
    // header comment mentions `src/lib/lanes/online/` and would read like a violation when there is none.
    expect(PREP).not.toMatch(/from '\.\/lanes\/online/);
    expect(PREP).not.toMatch(/from '\.\.\/lanes\/online/);
  });

  it('leaves the offline side alone, and copies the shape rather than importing it', () => {
    expect(API).not.toContain('online-api');
    expect(GLOSSARY).not.toContain("from '../../api'");
  });
});
