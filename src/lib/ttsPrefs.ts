// Persisted TTS voice selection (per language) + helper to build the LiveConfig.tts block.
//
// HONESTY NOTE (see docs/ux-roadmap/15): API.md documents a SINGLE tts block per session
// ({engine, <key>: id}), so a two-engine VI+JA setup is not clearly expressible and the exact
// multi-language shape is UNVERIFIED against the backend. We persist both picks and emit a
// best-effort block; the live wiring is opt-in (default OFF — the audit recommends the gala run
// subtitles-only) and must be confirmed against the running backend before relying on it.

export interface VoicePick {
    engine: string;
    key: string;                 // LiveConfig param the id feeds (speaker_id | voice | speaker_ref)
    id: string | number;
    label?: string;
}

export interface TtsPrefs {
    enabled: boolean;            // opt-in: send a tts block at all (default false = subtitles-only)
    vi?: VoicePick;
    ja?: VoicePick;
}

const KEY = 'proyaku_tts';

export function loadTtsPrefs(): TtsPrefs {
    try {
        const s = localStorage.getItem(KEY);
        if (s) return JSON.parse(s) as TtsPrefs;
    } catch { /* corrupt/absent → default */ }
    return { enabled: false };
}

export function saveTtsPrefs(p: TtsPrefs): void {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore quota/private-mode */ }
}

/**
 * Build a best-effort LiveConfig.tts block from saved prefs, or undefined for subtitles-only.
 * Returns the documented single-engine shape from the first available pick, and also carries the
 * full per-language selection under `voices` so a backend that supports per-language TTS can use it.
 */
export function buildTtsConfig(p: TtsPrefs): Record<string, unknown> | undefined {
    if (!p.enabled) return undefined;
    const primary = p.ja ?? p.vi;        // ceremony honors JA guests; fall back to VI
    if (!primary) return undefined;
    const block: Record<string, unknown> = { engine: primary.engine, [primary.key]: primary.id };
    // Extra, non-breaking hint for a per-language-capable backend (ignored otherwise).
    const voices: Record<string, unknown> = {};
    if (p.vi) voices.vi = { engine: p.vi.engine, [p.vi.key]: p.vi.id };
    if (p.ja) voices.ja = { engine: p.ja.engine, [p.ja.key]: p.ja.id };
    if (Object.keys(voices).length) block.voices = voices;
    return block;
}
