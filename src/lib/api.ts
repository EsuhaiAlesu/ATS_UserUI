// REST + WebSocket client for the HanDichThuat backend.
// Endpoint contract: docs/API.md (verified against webui/api.py of the backend repo).

// VITE_API_BASE overrides the backend origin (e.g. "http://127.0.0.1:8080").
// When unset, requests go to the same origin and the Vite dev proxy forwards /api.
const configured = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
export const API_BASE = configured.replace(/\/+$/, '');

function apiUrl(path: string): string {
    return `${API_BASE}/api${path}`;
}

export function wsUrl(path: string): string {
    const url = new URL(`/api${path}`, API_BASE || window.location.origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
}

async function getJson<T>(path: string): Promise<T> {
    const res = await fetch(apiUrl(path));
    if (!res.ok) throw new Error(`GET /api${path} → HTTP ${res.status}`);
    return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(apiUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? '{}' : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST /api${path} → HTTP ${res.status}`);
    return res.json() as Promise<T>;
}

// ---------------------------------------------------------------- types

export interface Health {
    ok: boolean;
    blocks: number;
}

export interface AudioInputDevice {
    index: number;
    name: string;
    channels: number;
    sr: number;
}

export interface AudioDevices {
    devices: AudioInputDevice[];
    default: number | null;
    speakers?: { name: string }[];
    default_speaker?: string | null;
    error?: string;
}

export interface AudioOutputDevice {
    index: number;
    name: string;
}

export interface AudioOutputs {
    devices: AudioOutputDevice[];
    default: number | null;
    error?: string;
}

export interface BlockParam {
    name: string;
    type: 'select' | 'number' | 'slider' | 'toggle' | 'text' | 'textarea' | 'file';
    default: unknown;
    label: string;
    advanced: boolean;
    options?: string[];
    tooltip?: string;
}

export interface BlockSpec {
    type: string;
    category: string;
    label: string;
    description: string;
    params: BlockParam[];
    hidden: boolean;
}

export interface WorkflowMeta {
    id: string;
    name: string;
    author?: string;
    version?: number;
    error?: string;
}

// One JSON message sent to open WS /api/ws/live (single multilingual model mode).
export interface LiveConfig {
    device: 'mic' | 'file' | 'loopback';
    device_index?: number;
    loopback_device?: string;
    single_auto?: {
        model: string;
        mt_model: string;
        beam_size?: number;
        targets?: Record<string, string>;
    };
    tts?: Record<string, unknown>;
    outputs?: Record<string, number>;
    record?: boolean;
    post_correct?: boolean;
    hotwords?: boolean;
    glossary?: Record<string, string>;
}

// Events streamed by WS /api/ws/live (subset the UI consumes).
export interface LiveEvent {
    type: string;
    // warming
    detail?: string;
    step?: number;
    steps?: number;
    // listening
    mode?: string;
    // level
    v?: number;
    speech?: boolean;
    // transcript / line / line_update
    lid?: number | string;
    lang?: string;
    text?: string;
    corrected?: boolean;
    // on_script (script-match score for this line)
    score?: number;
    // timing (per-stage latency, ms)
    stt_ms?: number;
    proc_ms?: number;
    mt_ms?: number;
    // speech_lang (detected source language)
    prob?: number;
    // context (rolling summary)
    summary?: string;
    // name_fix (name-restore / script recovery fixes; shape is backend-specific)
    fixes?: unknown;
    // say / speaking / spoken (TTS cues)
    seq?: number;
    lag_ms?: number;
    // error
    error?: string;
}

// ---------------------------------------------------------------- endpoints

export const getHealth = () => getJson<Health>('/health');

export const getBlocks = () => getJson<{ blocks: BlockSpec[] }>('/blocks');

export const getAudioDevices = () => getJson<AudioDevices>('/audio/devices');

export const getAudioOutputs = () => getJson<AudioOutputs>('/audio/outputs');

export const playTestTone = (device?: number) =>
    postJson<{ ok: boolean; error?: string }>('/audio/test_tone', device === undefined ? {} : { device });

export const getWorkflows = () => getJson<{ workflows: WorkflowMeta[] }>('/workflows');

export const getLiveFast = () => getJson<{ fast: boolean }>('/live/fast');

export const setLiveFast = (on: boolean) =>
    postJson<{ ok: boolean; fast: boolean }>('/live/fast', { on });

// ---------------------------------------------------------------- TTS voices & preview

export interface TtsVoice {
    id: string | number;
    label: string;
    jp?: string;
}

export interface TtsVoices {
    engine: string;
    // The LiveConfig param the chosen voice id feeds (e.g. "speaker_id" | "voice" | "speaker_ref").
    key: string;
    voices: TtsVoice[];
    hint?: string;
    error?: string;
    msg?: string;
}

// List selectable voices for a TTS engine (voicevox | gpt-sovits | vieneu | openai …).
export const getTtsVoices = (engine: string) =>
    getJson<TtsVoices>(`/tts/voices?engine=${encodeURIComponent(engine)}`);

/**
 * Synthesize a short sample and return the WAV Blob to play in-app.
 * Preview is wired for `vieneu` (on-box VI) and `voicevox` (JA server on :50021);
 * other engines return 400. Throws Error with a friendly message on failure.
 */
export async function previewTts(engine: string, voice: string | number, text: string): Promise<Blob> {
    const res = await fetch(apiUrl('/tts/preview'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine, voice, text }),
    });
    const ct = res.headers.get('content-type') ?? '';
    if (res.ok && ct.includes('audio')) return res.blob();
    let detail = `HTTP ${res.status}`;
    try { const j = await res.json(); detail = (j.error ?? j.msg ?? detail) as string; } catch { /* non-JSON */ }
    throw new Error(detail);
}

// ---------------------------------------------------------------- Voice / pronunciation training

// The reading script staff read aloud to teach pronunciations (seeds from glossary terms).
export const getVoiceScript = () => getJson<{ script: string }>('/voice/script');

export const saveVoiceScript = (script: string) =>
    postJson<{ ok: boolean }>('/voice/script', { script });

// Record from the SERVER's mic for N seconds and transcribe (capture happens on the backend machine).
export const recordVoice = (seconds: number, model?: string) =>
    postJson<{ heard?: string; peak?: number; error?: string }>(
        '/voice/record', model ? { seconds, model } : { seconds });

// Diff the reference script vs what was heard, adding misheard→correct rules to the glossary (live next run).
export const learnVoice = (reference: string, heard: string) =>
    postJson<{ added: { misheard: string; term: string }[]; count: number }>(
        '/voice/learn', { reference, heard });

// ---------------------------------------------------------------- Project files & glossary

// Read/write a project text file (.json .jsonl .md .txt .srt .csv), sandboxed to the project root.
export const getFile = (path: string) =>
    getJson<{ path: string; content: string }>(`/file?path=${encodeURIComponent(path)}`);

export const saveFile = (path: string, content: string) =>
    postJson<{ ok: boolean; path: string; bytes: number }>('/file', { path, content });

// One glossary term. `ja` blank = keep the source verbatim (do not translate — for names).
export interface GlossaryEntry {
    vi: string;
    ja: string;
    reading?: string;      // katakana/hiragana reading to control pronunciation
    type?: string;         // name | company | keigo | tech | award | term | keep | other
    asr_hotword?: boolean; // bias the recognizer toward this term (protects proper nouns)
    misheard?: string[];   // variants auto-corrected to the canonical form
    note?: string;
}

const GLOSSARY_PATH = 'data/glossary.json';

export async function getGlossary(): Promise<GlossaryEntry[]> {
    const { content } = await getFile(GLOSSARY_PATH);
    const parsed = JSON.parse(content || '[]');
    return Array.isArray(parsed) ? (parsed as GlossaryEntry[]) : [];
}

export const saveGlossary = (entries: GlossaryEntry[]) =>
    saveFile(GLOSSARY_PATH, JSON.stringify(entries, null, 2));
