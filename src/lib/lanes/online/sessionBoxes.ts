// src/lib/lanes/online/sessionBoxes.ts — the console's Thuật ngữ and Bối cảnh boxes, remembered.
//
// They were plain component state: a reload emptied them and a second machine in the same hall saw
// nothing, so everything the operator learned during a rehearsal had to be retyped before the event.
//
// Keyed on the meeting's knowledge scope × the direction — the same scope the documents and the AI brief
// already use, so a meeting inside a series shares the series' shelf. Nothing here is on the live path:
// it is read once when a meeting is opened and written a second or so after the operator stops typing.

const ONLINE_BASE = '/online-api';

export interface SessionBoxes {
  terms: string;
  brief: string;
  /** 0 when nothing was ever saved for this meeting — the console uses that to decide about auto-fill. */
  savedAt: number;
}

export const EMPTY_SESSION_BOXES: SessionBoxes = { terms: '', brief: '', savedAt: 0 };

/** Never throws: an unreachable store means "nothing saved", which is the state the console started in. */
export async function fetchSessionBoxes(scope: string, dir: 'vi2ja' | 'ja2vi'): Promise<SessionBoxes> {
  const key = (scope ?? '').trim();
  if (!key) return EMPTY_SESSION_BOXES;
  try {
    const res = await fetch(`${ONLINE_BASE}/session-boxes?scope=${encodeURIComponent(key)}&dir=${dir}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return EMPTY_SESSION_BOXES;
    const data = (await res.json()) as Partial<SessionBoxes>;
    return {
      terms: typeof data.terms === 'string' ? data.terms : '',
      brief: typeof data.brief === 'string' ? data.brief : '',
      savedAt: typeof data.savedAt === 'number' ? data.savedAt : 0,
    };
  } catch {
    return EMPTY_SESSION_BOXES;
  }
}

/**
 * Never throws either — and that is the right call HERE, unlike the glossary: this fires while the
 * operator is typing, and a red line appearing under the box because the network blinked would be noise
 * during a ceremony. It reports success so the caller can show a quiet mark.
 */
export async function saveSessionBoxes(scope: string, dir: 'vi2ja' | 'ja2vi', terms: string, brief: string): Promise<boolean> {
  const key = (scope ?? '').trim();
  if (!key) return false;
  try {
    const res = await fetch(`${ONLINE_BASE}/session-boxes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ scope: key, dir, terms, brief }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------------
// The mishearing box — the same idea, but GLOBAL.
//
// The other two boxes are about one meeting. This one is about the recogniser: the forms it mangles are
// a property of the words, not of the event, so a correction learned at the rehearsal should already be
// in place at the next meeting and on every machine. It is also the box whose contents were most
// expensive to obtain — every line was earned by hearing the machine get a name wrong out loud.
//
// It keeps its localStorage copy as well. The store is the shared truth; localStorage is what makes the
// box usable when the deploy cannot be reached at all.
// ---------------------------------------------------------------------------------------------------

export interface StoredMishearings {
  text: string;
  /** 0 when the store has never held anything — the console uses that to leave its local copy alone. */
  savedAt: number;
}

export const EMPTY_MISHEARINGS: StoredMishearings = { text: '', savedAt: 0 };

/** Never throws: an unreachable store just means the console keeps whatever localStorage gave it. */
export async function fetchMishearings(): Promise<StoredMishearings> {
  try {
    const res = await fetch(`${ONLINE_BASE}/mishearings`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return EMPTY_MISHEARINGS;
    const data = (await res.json()) as Partial<StoredMishearings>;
    return {
      text: typeof data.text === 'string' ? data.text : '',
      savedAt: typeof data.savedAt === 'number' ? data.savedAt : 0,
    };
  } catch {
    return EMPTY_MISHEARINGS;
  }
}

/** Never throws, for the same reason `saveSessionBoxes` does not: this fires while somebody is typing. */
export async function saveMishearings(text: string): Promise<boolean> {
  try {
    const res = await fetch(`${ONLINE_BASE}/mishearings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
