// prepBrief.ts — M14: ask the server to read the event's imported documents and write the Bối cảnh.
//
// The console's Bối cảnh box is the only context the refine model holds for the whole event. Filling it
// mechanically (conference header + the opening paragraph of each file) describes a 40-page gala script by
// its cover page. This asks the model that is already configured server-side to read the documents and
// write the brief instead.
//
// This is the ONLY network call in the lane that is not on the live path. It is slow ON PURPOSE — a whole
// script goes up — so it is pressed once during Chuẩn bị, never while a session runs, and its result lands
// in an editable box that the operator approves. Nothing here is ever spoken.
//
// Contract: POST /online-api/summarize-prep-docs (docs/ONLINE-LANE-CONTRACT.md §7). Like every other lane
// call it goes through the `/online-api` base path, and it names no vendor, model or key.

const ONLINE_BASE = '/online-api';

/** Client-side ceiling, mirroring the server's. Sending more only pays for tokens the server clips off. */
export const PREP_DOCS_MAX = 12;
export const PREP_DOC_MAX_CHARS = 12_000;
/** The request can be megabytes; give it far more room than a live call would ever get. */
export const PREP_SUMMARY_CLIENT_TIMEOUT_MS = 90_000;

export interface PrepBriefDoc {
  name: string;
  text: string;
}

export interface PrepBriefInput {
  /** The session direction decides which side of a term line the speaker will actually say. */
  sourceLanguage: 'vi' | 'ja';
  targetLanguage: 'vi' | 'ja';
  /** What the operator already knows — the conference header + speaker roster. May be empty. */
  header?: string;
  documents: PrepBriefDoc[];
}

export interface PrepBriefResult {
  brief: string;
  terms: string[];
  /** How much the server actually read, so the console can say so instead of implying it read everything. */
  documents: number;
  usedChars: number;
}

/**
 * Never throws for a caller that awaits it — it rejects, and the console shows the message. The message is
 * Vietnamese and operator-facing: whoever presses this button is standing in a hall, not reading a log.
 */
export async function summarizePrepDocs(input: PrepBriefInput): Promise<PrepBriefResult> {
  const documents = input.documents
    .map((d) => ({ name: (d.name ?? '').trim(), text: (d.text ?? '').trim().slice(0, PREP_DOC_MAX_CHARS) }))
    .filter((d) => d.text.length > 0)
    .slice(0, PREP_DOCS_MAX);
  if (!documents.length) throw new Error('Buổi này chưa có tài liệu nào để tóm tắt.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PREP_SUMMARY_CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch(`${ONLINE_BASE}/summarize-prep-docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
        header: input.header ?? '',
        documents,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(res.status === 502 ? 'Máy chủ tóm tắt không trả lời. Thử lại sau ít phút.' : `Tóm tắt thất bại (${res.status}).`);
    const data = (await res.json()) as Partial<PrepBriefResult>;
    const brief = typeof data.brief === 'string' ? data.brief.trim() : '';
    const terms = Array.isArray(data.terms) ? data.terms.map((t) => String(t).trim()).filter(Boolean) : [];
    if (!brief && !terms.length) throw new Error('Tóm tắt trả về rỗng — kiểm tra lại nội dung tài liệu.');
    return {
      brief,
      terms,
      documents: typeof data.documents === 'number' ? data.documents : documents.length,
      usedChars: typeof data.usedChars === 'number' ? data.usedChars : 0,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Tóm tắt quá lâu (trên 90 giây). Bớt tài liệu rồi thử lại.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
