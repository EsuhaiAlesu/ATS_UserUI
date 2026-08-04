// TASK 14 — the saved transcript has to answer three questions a week later: which meeting, which
// direction each sentence travelled, and which sentences the approved script answered. React behaviour is
// asserted by reading the source, never by rendering (node environment, no DOM).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildSessionExport, type SessionLine } from '../src/lib/lanes/online/sessionExport';

const LANE = readFileSync(new URL('../src/lib/lanes/online/onlineLane.ts', import.meta.url), 'utf8');
const INDEX = readFileSync(new URL('../src/lib/lanes/online/index.ts', import.meta.url), 'utf8');
const CONSOLE = readFileSync(new URL('../src/lib/lanes/online/components/OnlineConsole.tsx', import.meta.url), 'utf8');
const EXPORT_SRC = readFileSync(new URL('../src/lib/lanes/online/sessionExport.ts', import.meta.url), 'utf8');

const T0 = Date.UTC(2026, 7, 8, 2, 0, 0);

function line(over: Partial<SessionLine> = {}): SessionLine {
  return {
    lid: 'a', at: T0, sourceText: 'xin chào', targetText: 'こんにちは',
    sourceLanguage: 'vi', targetLanguage: 'ja', dir: 'vi2ja',
    ...over,
  };
}

const META = { startedAt: T0, endedAt: T0 + 60_000, sourceLanguage: 'vi' as const, targetLanguage: 'ja' as const };

/** Markdown cells are separated by UNESCAPED pipes — a `\|` inside a cell is content, not a boundary. */
function cellsOf(row: string): string[] {
  return row.split(/(?<!\\)\|/).slice(1, -1);
}

describe('what the file now says', () => {
  it('writes eventId when present and omits the key entirely when it is empty', () => {
    const withId = JSON.parse(buildSessionExport([line()], { ...META, eventId: 'gala-20' }).json);
    expect(withId.eventId).toBe('gala-20');

    for (const empty of [undefined, '']) {
      const parsed = JSON.parse(buildSessionExport([line()], { ...META, eventId: empty }).json);
      expect('eventId' in parsed).toBe(false);
    }
  });

  it('gives the markdown five columns and a five-cell separator row', () => {
    const { md } = buildSessionExport([line()], META);
    const [header, sep] = md.split('\n');
    expect(cellsOf(header)).toHaveLength(5);
    expect(cellsOf(sep)).toHaveLength(5);
    expect(header).toContain('Dir');
    expect(header).toContain('Script');
  });

  it('shows both directions in a two-way transcript', () => {
    const { md } = buildSessionExport(
      [line({ lid: 'a', dir: 'vi2ja' }), line({ lid: 'b', at: T0 + 1000, dir: 'ja2vi', sourceLanguage: 'ja', targetLanguage: 'vi' })],
      META,
    );
    const rows = md.trim().split('\n').slice(2);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('vi2ja');
    expect(rows[1]).toContain('ja2vi');
  });

  it('marks a script-answered line and leaves the cell empty for an ordinary one', () => {
    const { md } = buildSessionExport(
      [line({ lid: 'a', fromScript: true }), line({ lid: 'b', at: T0 + 1000 })],
      META,
    );
    const rows = md.trim().split('\n').slice(2);
    expect(rows[0]).toContain('kịch bản');
    expect(rows[1]).not.toContain('kịch bản');
    // the last cell of an ordinary row is blank, not the word "false"
    expect(cellsOf(rows[1])[4].trim()).toBe('');
  });

  it('still escapes a pipe in the source text, and never emits a raw pipe in the two new cells', () => {
    const { md } = buildSessionExport([line({ sourceText: 'a | b', fromScript: true })], META);
    const row = md.trim().split('\n')[2];
    expect(row).toContain('a \\| b');
    const cells = cellsOf(row);
    expect(cells).toHaveLength(5); // a raw pipe in Dir or Script would have split this into more
    expect(cells[1]).not.toContain('|');
    expect(cells[4]).not.toContain('|');
  });

  it('carries dir and fromScript through the JSON unchanged', () => {
    const parsed = JSON.parse(buildSessionExport([line({ dir: 'ja2vi', fromScript: true })], META).json);
    expect(parsed.lines[0].dir).toBe('ja2vi');
    expect(parsed.lines[0].fromScript).toBe(true);
  });

  it('moves nothing that was in the file before', () => {
    const exp = buildSessionExport([line()], { ...META, eventId: 'gala-20' });
    const parsed = JSON.parse(exp.json);
    for (const key of ['startedAt', 'endedAt', 'sourceLanguage', 'targetLanguage', 'lines']) {
      expect(Object.keys(parsed)).toContain(key);
    }
    // the filename still derives from startedAt alone — repeated saves keep overwriting the same file
    expect(exp.filename).toBe(buildSessionExport([], META).filename);
  });
});

describe('where the values come from', () => {
  it('computes the direction per utterance inside recordSessionLine', () => {
    expect(LANE).toContain('const dl = dirLangs(lid, sourceText, false);');
    expect(LANE).not.toContain('sourceLanguage: o.sourceLanguage, targetLanguage: o.targetLanguage');
  });

  // PART 6 TASK 34 added a SECOND path that answers from an approved script line: the operator-guided
  // release (`recordSessionLine(lid, finalizedAt, head, verdict.target, true)`). The rule this case was
  // written to protect is unchanged and is what is still asserted — `fromScript: true` is reserved for
  // lines a human approved, and every ORDINARY path passes four arguments. Only the counts moved: 4 → 5
  // call sites, 1 → 2 flagged, still 3 unflagged.
  it('passes the script flag ONLY from the approved-line paths; every ordinary path passes four arguments', () => {
    const calls = LANE.split('\n').filter((l) => /(?<!function )recordSessionLine\(/.test(l) && !l.startsWith('  function '));
    expect(calls).toHaveLength(5);
    const flagged = calls.filter((l) => /, true\)/.test(l));
    expect(flagged).toHaveLength(2);
    // and they are exactly the two approved-line paths, not some third thing that crept in
    expect(flagged.some((l) => l.includes('recordSessionLine(lid, finalizedAt, head, target, true)'))).toBe(true);
    expect(flagged.some((l) => l.includes('recordSessionLine(lid, finalizedAt, head, verdict.target, true)'))).toBe(true);
    const ordinary = calls.filter((l) => !flagged.includes(l));
    expect(ordinary).toHaveLength(3);
    for (const other of ordinary) {
      const args = /recordSessionLine\(([^)]*)\)/.exec(other)?.[1] ?? '';
      expect(args.split(',')).toHaveLength(4);
    }
  });

  it('latches the event at start and writes it into every save', () => {
    expect(LANE).toContain("sessionEventId = (config.getEventId?.() ?? '').trim();");
    expect(LANE).toContain('eventId: sessionEventId || undefined,');
  });

  it('is wired through the facade and set by the console', () => {
    expect(INDEX).toContain('getEventId: () => eventIdRef.current,');
    expect(INDEX).toContain('eventId, setEventId');
    expect(CONSOLE).toContain('setLaneEventId(eventId)');
  });
});

describe('and no more than that', () => {
  it('smuggles in no history page', () => {
    const fetches = EXPORT_SRC.match(/fetch\(/g) ?? [];
    expect(fetches).toHaveLength(1);
    expect(EXPORT_SRC).toContain("fetch('/online-api/save-session'");
    expect(INDEX).not.toMatch(/export[^\n]*\bHistory\b/);
  });
});
