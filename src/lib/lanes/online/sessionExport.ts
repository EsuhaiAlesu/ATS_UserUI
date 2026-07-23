// src/lib/lanes/online/sessionExport.ts
//
// Phase 4 / M8 — session transcript export + save. POST /online-api/save-session with
// pre-serialized json + md strings; on ANY failure, fall back to a browser download so the
// session data is never lost. The filename derives from the session start time, so repeated
// (auto-)saves overwrite the same server file — a continuous checkpoint.

export interface SessionLine {
  lid: string;
  at: number; // finalize time (ms epoch)
  sourceText: string;
  targetText: string;
  sourceLanguage: 'vi' | 'ja';
  targetLanguage: 'vi' | 'ja';
}

export interface SessionMeta {
  startedAt: number; // ms epoch — drives the (stable) filename
  endedAt: number; // ms epoch
  sourceLanguage: 'vi' | 'ja';
  targetLanguage: 'vi' | 'ja';
}

export interface SessionExport {
  json: string;
  md: string;
  filename: string;
}

export interface SaveOutcome {
  saved: boolean; // server confirmed
  filename: string;
  downloaded: boolean; // fell back to a local download
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function hhmmss(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fileStamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function mdCell(s: string): string {
  return s.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

export function buildSessionExport(lines: SessionLine[], meta: SessionMeta): SessionExport {
  const json = JSON.stringify(
    {
      startedAt: new Date(meta.startedAt).toISOString(),
      endedAt: new Date(meta.endedAt).toISOString(),
      sourceLanguage: meta.sourceLanguage,
      targetLanguage: meta.targetLanguage,
      lines,
    },
    null,
    2,
  );
  const header = '| Time | Source | Translation |\n| --- | --- | --- |';
  const rows = lines.map((l) => `| ${hhmmss(l.at)} | ${mdCell(l.sourceText)} | ${mdCell(l.targetText)} |`);
  const md = `${[header, ...rows].join('\n')}\n`;
  const filename = `online_${fileStamp(meta.startedAt)}`;
  return { json, md, filename };
}

function downloadBlob(name: string, content: string, type: string): void {
  try {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    /* download unsupported (headless) — best effort */
  }
}

function downloadFallback(exp: SessionExport): void {
  downloadBlob(`${exp.filename}.json`, exp.json, 'application/json');
  downloadBlob(`${exp.filename}.md`, exp.md, 'text/markdown');
}

// POST to the server; on network/4xx/5xx (including the 413 size limit) → local download of both files.
export async function saveSessionExport(exp: SessionExport): Promise<SaveOutcome> {
  try {
    const res = await fetch('/online-api/save-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: exp.filename, json: exp.json, md: exp.md }),
    });
    if (!res.ok) throw new Error(`save failed (HTTP ${res.status})`);
    const data = (await res.json()) as { saved?: boolean; filename?: string };
    if (!data.saved) throw new Error('save not confirmed');
    return { saved: true, filename: data.filename ?? exp.filename, downloaded: false };
  } catch {
    downloadFallback(exp);
    return { saved: false, filename: exp.filename, downloaded: true };
  }
}
