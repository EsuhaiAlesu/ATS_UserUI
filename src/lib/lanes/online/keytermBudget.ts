// src/lib/lanes/online/keytermBudget.ts — what the operator's glossary will actually become, shown before
// the session starts instead of discovered afterwards.
//
// This is a deliberate MIRROR of `pickScribeKeyterms` in server/online-api.mjs, kept honest by
// tests/keytermBudget.test.ts, which runs the same corpora through both and compares. It differs from the
// server in exactly one way: the server returns a single `dropped` count, and this returns the dropped
// entries split by reason, because "too long, shorten it" and "the list is full" are different problems
// with different fixes and the screen has to say which one it is.
//
// If you change the rule, change it on the server FIRST and let the parity test tell you what to do here.

export const KEYTERM_MAX_LEN = 20;
export const KEYTERM_MAX = 30;

export interface KeytermPreview {
  /** what the recogniser will be primed with, in order */
  kept: string[];
  /** dropped for being longer than KEYTERM_MAX_LEN — the operator can shorten these */
  tooLong: string[];
  /** dropped because the 30 slots ran out — these still reach the translation stage */
  overflow: string[];
}

export function previewKeyterms(corpus: string): KeytermPreview {
  // A `nghe nhầm ~ dạng đúng` line contributes only its correct side; the misheard surfaces must never be
  // primed. Stripped line by line, BEFORE the separator split, because the left side is itself
  // comma-separated. Same order as the server.
  const cleaned = String(corpus || '')
    .split(/\r?\n/)
    .map((line) => { const m = line.match(/^[^~〜～]*[~〜～](.*)$/); return m ? m[1] : line; })
    .join('\n');

  const lines = cleaned.split(/[,\n;·]/).map((t) => t.trim()).filter(Boolean);
  const all: string[] = [];
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq < 0) { all.push(line); continue; }
    for (const side of [line.slice(0, eq), line.slice(eq + 1)]) {
      const s = side.trim();
      if (s) all.push(s);
    }
  }

  const kept: string[] = [];
  const tooLong: string[] = [];
  const overflow: string[] = [];
  const seen = new Set<string>();
  for (const term of all) {
    if (seen.has(term)) continue;
    if (term.length > KEYTERM_MAX_LEN) { tooLong.push(term); continue; }
    if (kept.length >= KEYTERM_MAX) { overflow.push(term); continue; }
    seen.add(term);
    kept.push(term);
  }
  return { kept, tooLong, overflow };
}
