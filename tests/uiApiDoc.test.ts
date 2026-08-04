// TASK 17 — docs/ONLINE-LANE-UI-API.md is what the next person reads before touching this lane. A doc
// that describes an export it does not list, or lists an export that no longer exists, is worse than no
// doc: it is read as true. These four cases keep it honest against the facade itself.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const DOC = readFileSync(new URL('../docs/ONLINE-LANE-UI-API.md', import.meta.url), 'utf8');
const FACADE = readFileSync(new URL('../src/lib/lanes/online/index.ts', import.meta.url), 'utf8');

const blockStart = DOC.indexOf('import {');
const blockEnd = DOC.indexOf("} from '../lib/lanes/online'");
const BLOCK = DOC.slice(blockStart, blockEnd);

describe('the exports block and the facade agree', () => {
  it('lists everything the doc has its own section for', () => {
    expect(blockStart).toBeGreaterThan(-1);
    expect(blockEnd).toBeGreaterThan(blockStart);
    for (const name of ['summarizePrepDocs', 'PREP_DOCS_MAX', 'PREP_DOC_MAX_CHARS']) {
      expect(BLOCK).toContain(name);
    }
  });

  it('names only things the facade really exports', () => {
    const names = BLOCK.split('\n')
      .map((l) => l.replace(/\/\/.*$/, '').replace(/^\s*import\s*\{/, '')) // drop the trailing notes
      .join(',')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('type '));
    expect(names.length).toBeGreaterThan(5);
    for (const name of names) {
      expect(FACADE, `${name} is documented but not exported by the facade`).toContain(name);
    }
  });
});

describe('the notes that stop somebody "tidying up"', () => {
  it('says the máy nghe read-out is an echo', () => {
    expect(DOC).toContain('is an ECHO, not a setting');
    expect(DOC).toContain('diag.asrLanguages');
    expect(DOC).toContain('diag.asrLanguageDetection');
  });

  it("keeps TASK 4's removal note and the vendor's exact words", () => {
    expect(DOC).toContain('Removed from the UI: the hall-babble switch');
    expect(DOC).toContain('filter_background_audio cannot be combined with');
  });
});
