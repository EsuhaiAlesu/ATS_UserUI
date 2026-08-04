// TASK 18 — the online lane's own small persistent store. Three fixed JSON files, atomic writes, and a
// read that NEVER throws: a corrupt glossary must leave the console usable and empty, not take a session
// down in the middle of a ceremony. Every case here uses a real temp directory, not a mock filesystem.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const { storeDir, readStore, writeStore, STORE_MAX_BYTES } = await import('../server/onlineStore.mjs');

const SRC = fs.readFileSync(new URL('../server/onlineStore.mjs', import.meta.url), 'utf8');

let dir = '';
let prevDataDir: string | undefined;

beforeEach(() => {
  prevDataDir = process.env.DATA_DIR;
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'store-'));
  process.env.DATA_DIR = dir;
});

afterEach(() => {
  // Leaking DATA_DIR would change what every later test in the run sees.
  if (prevDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = prevDataDir;
  fs.rmSync(dir, { recursive: true, force: true });
});

const ls = () => fs.readdirSync(dir);

describe('where it writes', () => {
  it('falls back to ./online-data when DATA_DIR is unset, so a dev clone needs no disk', () => {
    delete process.env.DATA_DIR;
    expect(storeDir()).toBe('./online-data');
  });

  it('uses DATA_DIR when set, trims it, and refuses to write into a whitespace name', () => {
    process.env.DATA_DIR = '/mnt/data';
    expect(storeDir()).toBe('/mnt/data');
    process.env.DATA_DIR = '  /mnt/data  ';
    expect(storeDir()).toBe('/mnt/data');
    process.env.DATA_DIR = '   ';
    expect(storeDir()).toBe('./online-data');
  });

  it('reads DATA_DIR per call, not once at import', () => {
    process.env.DATA_DIR = '/first';
    expect(storeDir()).toBe('/first');
    process.env.DATA_DIR = '/second';
    expect(storeDir()).toBe('/second');
  });

  it('throws on an unknown store name and writes nothing at all', async () => {
    await expect(writeStore('../escape', {})).rejects.toThrow();
    expect(ls()).toEqual([]);
  });
});

describe('reading never takes the session down', () => {
  it('returns the fallback when the file does not exist', async () => {
    await expect(readStore('glossary', ['fallback'])).resolves.toEqual(['fallback']);
  });

  it('returns the fallback for a corrupt file', async () => {
    fs.writeFileSync(path.join(dir, 'online-glossary.json'), '{ broken', 'utf8');
    await expect(readStore('glossary', [])).resolves.toEqual([]);
  });

  it('returns the fallback for an empty file and a whitespace-only file', async () => {
    fs.writeFileSync(path.join(dir, 'online-glossary.json'), '', 'utf8');
    await expect(readStore('glossary', ['x'])).resolves.toEqual(['x']);
    fs.writeFileSync(path.join(dir, 'online-glossary.json'), '   \n\t ', 'utf8');
    await expect(readStore('glossary', ['x'])).resolves.toEqual(['x']);
  });

  it('returns the fallback for a file containing null, never null itself', async () => {
    fs.writeFileSync(path.join(dir, 'online-glossary.json'), 'null', 'utf8');
    // A caller expecting an array must not be handed something it cannot iterate.
    await expect(readStore('glossary', [])).resolves.toEqual([]);
  });
});

describe('writing is atomic', () => {
  it('round-trips an array and an object', async () => {
    await writeStore('glossary', [{ vi: 'a', ja: 'b' }]);
    await expect(readStore('glossary', [])).resolves.toEqual([{ vi: 'a', ja: 'b' }]);
    await writeStore('boxes', { 'e|vi2ja': { terms: 't', brief: 'b', savedAt: 5 } });
    await expect(readStore('boxes', {})).resolves.toEqual({ 'e|vi2ja': { terms: 't', brief: 'b', savedAt: 5 } });
  });

  it('leaves no .tmp file behind', async () => {
    await writeStore('glossary', [{ vi: 'a', ja: 'b' }]);
    expect(ls()).toEqual(['online-glossary.json']);
  });

  it('creates the directory when it does not exist yet', async () => {
    process.env.DATA_DIR = path.join(dir, 'nested', 'deeper');
    await writeStore('glossary', [{ vi: 'a', ja: 'b' }]);
    await expect(readStore('glossary', [])).resolves.toEqual([{ vi: 'a', ja: 'b' }]);
  });

  it('leaves exactly one file with the second value after two writes', async () => {
    await writeStore('glossary', [{ vi: 'one', ja: '' }]);
    await writeStore('glossary', [{ vi: 'two', ja: '' }]);
    expect(ls()).toEqual(['online-glossary.json']);
    await expect(readStore('glossary', [])).resolves.toEqual([{ vi: 'two', ja: '' }]);
  });

  it('rejects an oversize payload and leaves the previous file untouched', async () => {
    await writeStore('glossary', [{ vi: 'keep me', ja: '' }]);
    const huge = [{ vi: 'x'.repeat(STORE_MAX_BYTES + 1000), ja: '' }];
    await expect(writeStore('glossary', huge)).rejects.toThrow();
    await expect(readStore('glossary', [])).resolves.toEqual([{ vi: 'keep me', ja: '' }]);
  });
});

describe('three stores, one directory', () => {
  it('keeps the three keys in three distinct files that do not collide', async () => {
    await writeStore('glossary', [{ vi: 'g', ja: '' }]);
    await writeStore('boxes', { 'e|vi2ja': { terms: 'b', brief: '', savedAt: 1 } });
    await writeStore('mishearings', { text: 'm ~ M', savedAt: 2 });

    await expect(readStore('glossary', null)).resolves.toEqual([{ vi: 'g', ja: '' }]);
    await expect(readStore('boxes', null)).resolves.toEqual({ 'e|vi2ja': { terms: 'b', brief: '', savedAt: 1 } });
    await expect(readStore('mishearings', null)).resolves.toEqual({ text: 'm ~ M', savedAt: 2 });
    expect(ls().sort()).toHaveLength(3);
  });

  it('fixes the file names in the module, never taking them from a request', () => {
    expect(SRC).toContain("mishearings: 'mishearings.json'");
    // The caller passes a KEY; `FILES[name]` is the only thing that ever becomes a path.
    expect(SRC).toContain('const file = FILES[name];');
    expect(SRC).toContain('return path.join(storeDir(), file);');
  });
});

describe('and nothing else', () => {
  it('reads exactly one environment variable and imports nothing beyond node:fs/node:path', () => {
    const envs = new Set([...SRC.matchAll(/process\.env\.(\w+)/g)].map((m) => m[1]));
    expect([...envs]).toEqual(['DATA_DIR']);

    const imports = [...SRC.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    expect(imports.sort()).toEqual(['node:fs/promises', 'node:path']);
  });
});
