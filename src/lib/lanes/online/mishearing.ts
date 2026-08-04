// src/lib/lanes/online/mishearing.ts — the misheard-substitution layer.
//
// Keyterms bias the recogniser BEFORE it decides; they cannot correct what it has already decided. On
// 01/08/2026 the company's own name came back as "suhai", "S-Hi Group" and "SI" with the glossary loaded,
// and every one of those mistakes was translated and spoken aloud. This module is the layer that fixes a
// decision after the fact: a list of surfaces the recogniser is known to produce, and the one form each
// of them means.
//
// Grammar — one rule per line:
//
//     nghe nhầm 1, nghe nhầm 2 ~ Dạng đúng
//
// The line is split at the FIRST mark. Three marks are accepted, because a Japanese IME produces a
// different character from a US keyboard and the operator must not have to know which one they typed:
// `~` (U+007E), `〜` (U+301C) and `～` (U+FF5E). The left side is split on `,` `、` `/` `|`. A line that
// starts with `#` is a comment. A line with no mark is an ordinary term and is left completely alone —
// which is what lets the same parser run over the Thuật ngữ box as well.
//
// Pure functions only: no React, no storage, no timers. `applyMishearings` runs on every partial, so it
// stays allocation-cheap and never uses a regular expression built from operator input.

export interface MishearingRule {
  /** surfaces the recogniser actually produces */
  heard: string[];
  /** the one correct form all of them mean */
  correct: string;
}

export const MISHEARING_MAX_RULES = 40;
export const MISHEARING_MAX_HEARD_PER_RULE = 8;
export const MISHEARING_MAX_CHARS = 2000;

const MARKS = ['~', '〜', '～'];
const HEARD_SEPARATORS = /[,、/|]/;

// ASCII + Latin-1 Supplement/Extended-A + Latin Extended Additional: enough to cover Vietnamese with
// every diacritic. Used only to decide whether a match sits inside a longer word.
const LATIN = /[0-9A-Za-zÀ-ɏḀ-ỿ]/;

function firstMarkIndex(line: string): number {
  let at = -1;
  for (const mark of MARKS) {
    const found = line.indexOf(mark);
    if (found >= 0 && (at < 0 || found < at)) at = found;
  }
  return at;
}

/**
 * Split a corpus into the ordinary terms and the mishearing rules it contains.
 *
 * `terms` comes back as text, with the rule lines removed and every other line — comments, blanks,
 * spacing — exactly as the operator typed it. That is what makes it safe to run this over the Thuật ngữ
 * box: an operator who types a `~` line there by habit gets the rule honoured AND keeps the misheard
 * surface out of the keyterm list, instead of silently priming the recogniser toward the mistake.
 *
 * `invalid` holds the lines that look like a rule but cannot be used (one side empty, or both sides the
 * same). They are reported on screen rather than dropped in silence.
 */
export function splitMishearingLines(raw: string): { terms: string; rules: MishearingRule[]; invalid: string[] } {
  const terms: string[] = [];
  const rules: MishearingRule[] = [];
  const invalid: string[] = [];
  const byCorrect = new Map<string, MishearingRule>();

  for (const line of String(raw ?? '').slice(0, MISHEARING_MAX_CHARS).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) { terms.push(line); continue; }

    const cut = firstMarkIndex(trimmed);
    if (cut < 0) { terms.push(line); continue; }

    const correct = trimmed.slice(cut + 1).trim();
    const heard = trimmed.slice(0, cut)
      .split(HEARD_SEPARATORS)
      .map((part) => part.trim())
      .filter(Boolean)
      // "Esuhai ~ Esuhai" is a no-op, not a rule; it would also make the replacement loop pointless work.
      .filter((part) => part.toLowerCase() !== correct.toLowerCase())
      .slice(0, MISHEARING_MAX_HEARD_PER_RULE);

    if (!correct || !heard.length) { invalid.push(trimmed); continue; }

    // Two lines aiming at the same correct form are one rule with more surfaces, not two rules.
    const existing = byCorrect.get(correct.toLowerCase());
    if (existing) {
      for (const surface of heard) {
        if (existing.heard.length >= MISHEARING_MAX_HEARD_PER_RULE) break;
        if (!existing.heard.some((known) => known.toLowerCase() === surface.toLowerCase())) existing.heard.push(surface);
      }
      continue;
    }
    if (rules.length >= MISHEARING_MAX_RULES) { invalid.push(trimmed); continue; }

    const rule: MishearingRule = { heard: [...new Set(heard)], correct };
    rules.push(rule);
    byCorrect.set(correct.toLowerCase(), rule);
  }

  return { terms: terms.join('\n'), rules, invalid };
}

/** The rules only. Same parser — there is deliberately no second implementation to drift. */
export function parseMishearingRules(raw: string): MishearingRule[] {
  return splitMishearingLines(raw).rules;
}

/** Canonical one-line-per-rule text. This is the shape that travels to the server. */
export function formatMishearingRules(rules: readonly MishearingRule[]): string {
  return rules.map((rule) => `${rule.heard.join(', ')} ~ ${rule.correct}`).join('\n');
}

/**
 * Replace every known misheard surface in `text` with its correct form.
 *
 * Scanned left to right, longest surface first, and the replacement is never re-scanned — so a rule whose
 * correct form contains one of its own misheard surfaces cannot loop. Matching is case-insensitive. A
 * surface that starts or ends with a Latin letter must not match inside a longer Latin word, or the rule
 * `SI ~ Esuhai` would rewrite the middle of "SIM" and of "SINH"; Japanese has no such boundary and needs
 * none, since a kana/kanji run is matched whole.
 */
export function applyMishearings(text: string, rules: readonly MishearingRule[]): { text: string; hits: number } {
  if (!text || !rules.length) return { text, hits: 0 };

  const surfaces: { heard: string; lower: string; correct: string }[] = [];
  for (const rule of rules) {
    for (const heard of rule.heard) {
      if (heard) surfaces.push({ heard, lower: heard.toLowerCase(), correct: rule.correct });
    }
  }
  if (!surfaces.length) return { text, hits: 0 };
  surfaces.sort((a, b) => b.lower.length - a.lower.length);

  const lower = text.toLowerCase();
  let out = '';
  let hits = 0;
  let i = 0;

  scan: while (i < text.length) {
    for (const surface of surfaces) {
      if (!lower.startsWith(surface.lower, i)) continue;
      if (LATIN.test(surface.lower[0]) && i > 0 && LATIN.test(text[i - 1])) continue;
      const end = i + surface.lower.length;
      if (LATIN.test(surface.lower[surface.lower.length - 1]) && end < text.length && LATIN.test(text[end])) continue;
      out += surface.correct;
      hits += 1;
      i = end;
      continue scan;
    }
    out += text[i];
    i += 1;
  }

  return { text: out, hits };
}
