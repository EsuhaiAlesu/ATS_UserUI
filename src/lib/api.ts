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
