// src/lib/lanes/online/paragraphStream.ts — bold on PUNCTUATION, break the line on a PARAGRAPH.
//
// Why this file exists. Until now a line only went bold when the recogniser CLOSED a turn, which chained
// together two things that have nothing to do with each other:
//   • "is the sentence finished" — a question of grammar, answered by looking for a full stop;
//   • "should the listening turn be closed" — a question of audio, and every close makes the recogniser
//     open the next turn with a blank memory, losing the thread and mishearing the first few syllables.
// Chained, they meant that bolding sooner required committing more often, and committing more often meant
// hearing worse. The operator described exactly that loop: "every time it goes bold the ASR breaks, like
// it pauses for a second and restarts".
//
// This file cuts the chain: bolding is decided from TEXT alone and never touches the recogniser, so the
// recogniser can run continuously the way the transcription demo does.
//
// WHAT IS WIRED, AND WHAT IS NOT — read this before assuming a call site exists. PART 5 wires exactly one
// export, `planParagraphCut`, and it wires it on the FINAL path (`onlineLane.ts` §28.1): it is what stops a
// single finished sentence from breaking the line on its own, and what stops the 3s ceiling cutting
// mid-word. The other four exports — `advanceParagraph`, `startUtterance`, `closeParagraph`,
// `EMPTY_PARAGRAPH_STATE` — are the same two rules applied to the RUNNING PARTIAL, so that bolding can one
// day be driven off the partial instead of off a turn close. That path is NOT wired in PART 5 and must not
// be wired here on a whim: `handlePartial` is the hottest function in the lane and the gala is four days
// out. They are written, exported and tested now because the rules belong in one file, and because the
// final path proves the rules are right before the partial path adopts them.
//
// Two rules, in the operator's own words:
//   1. Bold whenever a sentence-ending mark appears (. ! ? 。！？) — but only once that mark is no longer
//      at the GROWING EDGE, i.e. the recogniser has already written past it. At the edge the partial can
//      still be revised backwards.
//   2. Group 2–3 sentences into one paragraph before breaking the line, so the hall stops reading a column
//      of one-sentence stubs — which are also what strips a translation of its neighbouring context.
//
// A paragraph does NOT end when a listening turn ends. People take a breath in the middle of a sentence
// all the time, so "new turn ⇒ new paragraph" would reproduce the exact disease. A paragraph closes when
// it has enough sentences, or when the caller closes it (a long silence, a change of language, session end).

import { findSentenceEnds, segmentCharLimit } from './transcriptSegmentation';

/** This many sentences closes a paragraph regardless of length. */
export const PARAGRAPH_MAX_SENTENCES = 3;
/** From this many sentences a paragraph MAY close early, if it is already long enough. */
export const PARAGRAPH_MIN_SENTENCES = 2;
/**
 * The "already long enough" threshold, in characters. This is the Japanese-tuned number; `segmentCharLimit`
 * scales it by 1.85 for Vietnamese, because a Vietnamese character carries less meaning than a Japanese one.
 */
export const PARAGRAPH_SOFT_CHARS = 90;

export type ParagraphState = {
  /**
   * The prefix of the CURRENT utterance that has already been printed, kept verbatim so the fresh tail can
   * be sliced off exactly. Returns to empty on every new utterance.
   */
  printed: string;
  /** Sentences already in the paragraph being built. */
  sentences: number;
  /** Characters already in the paragraph being built. */
  chars: number;
  /** The text of the paragraph being built — used only to detect its language for the character rule. */
  sample: string;
  /**
   * How much of the two numbers above came from the CURRENT utterance. Needed only so that a backwards
   * revision can subtract it: those sentences get redrawn, and counting them twice would break the line
   * early for no reason.
   */
  utteranceSentences: number;
  utteranceChars: number;
};

export const EMPTY_PARAGRAPH_STATE: ParagraphState = {
  printed: '',
  sentences: 0,
  chars: 0,
  sample: '',
  utteranceSentences: 0,
  utteranceChars: 0,
};

export type ParagraphStep = {
  /** Text ready to print now — one or more whole sentences. Empty means nothing is ready. */
  text: string;
  /** How many sentences `text` contains. */
  sentenceCount: number;
  /** Printing this closes the paragraph; the next line starts a new one. */
  closesParagraph: boolean;
  /**
   * The recogniser rewrote what it had already said — the caller must REDRAW the utterance rather than
   * append. Rare, but real: a partial does not only ever grow.
   */
  rewound: boolean;
  next: ParagraphState;
};

export type ParagraphCut = {
  /** How many whole sentences the candidate paragraph (from the start of `text`) contains. */
  sentences: number;
  /** How many leading characters of `text` belong to the candidate paragraph. 0 when none is whole. */
  cut: number;
  /** Whether it has reached 2–3 sentences (or enough length) to break the line. */
  ready: boolean;
};

export type AdvanceOptions = {
  /**
   * The recogniser has just returned this utterance's real FINAL. Nothing can grow any more, so the "the
   * mark must not be at the edge" rule lapses and the trailing fragment is printed too.
   */
  utteranceEnded?: boolean;
};

/**
 * Move the running partial forward one step and say what can be printed.
 *
 * Returns AT MOST one paragraph per call, so the caller loops until `text` is empty:
 *
 * ```ts
 * let st = state;
 * for (;;) {
 *   const step = advanceParagraph(st, partial);
 *   st = step.next;
 *   if (!step.text) break;
 *   print(step.text, step.closesParagraph);
 * }
 * ```
 */
export function advanceParagraph(
  state: ParagraphState,
  utterance: string,
  options: AdvanceOptions = {},
): ParagraphStep {
  let printed = state.printed;
  let rewound = false;
  let count = state.sentences;
  let chars = state.chars;
  let sample = state.sample;
  let mine = state.utteranceSentences;
  let mineChars = state.utteranceChars;

  if (printed && !utterance.startsWith(printed)) {
    rewound = true;
    printed = '';
    count -= mine;
    chars -= mineChars;
    sample = '';
    mine = 0;
    mineChars = 0;
  }

  const tail = utterance.slice(printed.length);
  const trimmedLength = tail.trimEnd().length;
  const idle = (): ParagraphStep => ({
    text: '',
    sentenceCount: 0,
    closesParagraph: false,
    rewound,
    next: { printed, sentences: count, chars, sample, utteranceSentences: mine, utteranceChars: mineChars },
  });

  if (!trimmedLength) return idle();

  const ends = findSentenceEnds(tail);
  const usable = options.utteranceEnded ? ends : ends.filter((end) => end < trimmedLength);
  if (!usable.length && !options.utteranceEnded) return idle();

  let cut = 0;
  let taken = 0;
  let closes = false;

  /** Take one more sentence into the paragraph; true when the paragraph is now enough to close. */
  const take = (end: number): boolean => {
    const sentence = tail.slice(cut, end);
    const weight = sentence.trim().length;
    count += 1;
    mine += 1;
    taken += 1;
    chars += weight;
    mineChars += weight;
    sample += sentence;
    cut = end;
    if (count >= PARAGRAPH_MAX_SENTENCES) return true;
    return count >= PARAGRAPH_MIN_SENTENCES && chars >= segmentCharLimit(PARAGRAPH_SOFT_CHARS, sample);
  };

  for (const end of usable) {
    if (take(end)) {
      closes = true;
      break;
    }
  }

  // The turn is closed and an unpunctuated tail is left: it still has to be printed or the words are lost.
  // Swallow it into THIS line rather than leaving it to become a stray line of its own next time.
  if (options.utteranceEnded && !closes && cut < trimmedLength) {
    closes = take(trimmedLength);
  }

  const slice = tail.slice(0, cut);
  const text = slice.trim();
  if (!text) return idle();

  const next: ParagraphState = {
    printed: printed + slice,
    sentences: count,
    chars,
    sample,
    utteranceSentences: mine,
    utteranceChars: mineChars,
  };
  return {
    text,
    sentenceCount: taken,
    closesParagraph: closes,
    rewound,
    next: closes ? closeParagraph(next) : next,
  };
}

/**
 * Look at ONE finalised piece of text and answer the exact question the lane asks: "is this a paragraph
 * yet?"
 *
 * Different from `advanceParagraph` in that it remembers nothing — it is for the path where the whole
 * buffer leaves at once, so there is no printed prefix to track. Same counting rule, so the two paths can
 * never disagree.
 */
export function planParagraphCut(text: string): ParagraphCut {
  const ends = findSentenceEnds(text);
  let sentences = 0;
  let chars = 0;
  let cut = 0;
  for (const end of ends) {
    sentences += 1;
    chars += text.slice(cut, end).trim().length;
    cut = end;
    if (sentences >= PARAGRAPH_MAX_SENTENCES) return { sentences, cut, ready: true };
    if (sentences >= PARAGRAPH_MIN_SENTENCES && chars >= segmentCharLimit(PARAGRAPH_SOFT_CHARS, text.slice(0, cut))) {
      return { sentences, cut, ready: true };
    }
  }
  return { sentences, cut, ready: false };
}

/**
 * Close the paragraph being built without printing anything. For a long silence, a change of language, or
 * the end of a session — the moments when the next sentence certainly does not belong to the same thought.
 */
export function closeParagraph(state: ParagraphState): ParagraphState {
  return { ...state, sentences: 0, chars: 0, sample: '', utteranceSentences: 0, utteranceChars: 0 };
}

/**
 * A new utterance begins: forget the printed prefix, because the previous utterance's verbatim string can
 * no longer be used to slice. DELIBERATELY keeps the paragraph counters — one paragraph is allowed to span
 * several utterances, and that is the whole point: people pause for breath mid-sentence, not at the places
 * a paragraph should break.
 */
export function startUtterance(state: ParagraphState): ParagraphState {
  return { ...state, printed: '', utteranceSentences: 0, utteranceChars: 0 };
}
