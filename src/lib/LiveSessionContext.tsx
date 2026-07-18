import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getHealth, wsUrl } from './api';
import type { LiveConfig, LiveEvent } from './api';

// 'reconnecting' = the live WS dropped unexpectedly mid-session and we are retrying.
// While reconnecting we KEEP the last subtitles frozen and never fall back to the demo.
export type LiveStatus = 'idle' | 'connecting' | 'warming' | 'ready' | 'listening' | 'reconnecting' | 'error';

export interface LiveLine {
    lid: string;
    lang: string;
    text: string;
    kind: 'transcript' | 'line';
    corrected?: boolean;
}

interface Warming {
    step: number;
    steps: number;
    detail: string;
}

interface LiveSessionValue {
    backendOnline: boolean;
    status: LiveStatus;
    warming: Warming | null;
    /** Input level 0–1 from the running session's VU ticks. */
    level: number;
    speech: boolean;
    lines: LiveLine[];
    error: string | null;
    /**
     * True while a session is logically alive (from start() until an explicit stop()),
     * used to keep the last live subtitles frozen during a reconnect.
     */
    hadSession: boolean;
    /**
     * True once ANY session has been started this page-load, and NEVER reset until reload.
     * The audience display uses this so the scripted DEMO loop can only ever appear on a
     * truly fresh, never-started screen — after a STOP/EMERGENCY STOP it shows a neutral
     * STANDBY slate, never the demo (which would put the CEO's name + a canned translation
     * back on the LED wall).
     */
    everStarted: boolean;
    start: (config: LiveConfig) => void;
    stop: () => void;
}

const LiveSessionContext = createContext<LiveSessionValue | null>(null);

// Kept generous so the Stream page can scroll back through session history.
const MAX_LINES = 400;
// Reconnect backoff: 1s, 2s, 4s … capped, then give up into an explicit FAULT state.
const MAX_RECONNECT_ATTEMPTS = 8;
const MAX_RECONNECT_DELAY_MS = 30000;

export const LiveSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [backendOnline, setBackendOnline] = useState(false);
    const [status, setStatus] = useState<LiveStatus>('idle');
    const [warming, setWarming] = useState<Warming | null>(null);
    const [level, setLevel] = useState(0);
    const [speech, setSpeech] = useState(false);
    const [lines, setLines] = useState<LiveLine[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [hadSession, setHadSession] = useState(false);
    const [everStarted, setEverStarted] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const configRef = useRef<LiveConfig | null>(null);   // last config, replayed on reconnect
    const userStoppedRef = useRef(false);                // distinguishes intentional stop from a drop
    const attemptRef = useRef(0);                        // reconnect attempts since last good open
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearReconnect = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    }, []);

    // Backend liveness poll drives the ONLINE/OFFLINE indicators.
    useEffect(() => {
        let cancelled = false;
        const probe = () => {
            getHealth()
                .then((h) => { if (!cancelled) setBackendOnline(!!h.ok); })
                .catch(() => { if (!cancelled) setBackendOnline(false); });
        };
        probe();
        const id = setInterval(probe, 5000);
        return () => { cancelled = true; clearInterval(id); };
    }, []);

    const upsertLine = useCallback((evt: LiveEvent, kind: 'transcript' | 'line') => {
        const lid = String(evt.lid ?? '');
        if (!lid) return;
        setLines((prev) => {
            const next = [...prev];
            const i = next.findIndex((l) => l.lid === lid);
            const patch: LiveLine = {
                lid,
                lang: evt.lang ?? (i >= 0 ? next[i].lang : ''),
                text: evt.text ?? '',
                kind: i >= 0 ? next[i].kind : kind,
                // Preserve a prior corrected=true if a later line_update omits the flag,
                // so the Trust HUD's "corrected" badge isn't silently downgraded.
                corrected: evt.corrected ?? (i >= 0 ? next[i].corrected : undefined),
            };
            if (i >= 0) next[i] = patch;
            else next.push(patch);
            return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
        });
    }, []);

    const handleEvent = useCallback((evt: LiveEvent) => {
        switch (evt.type) {
            case 'warming':
                setStatus('warming');
                setWarming({ step: evt.step ?? 0, steps: evt.steps ?? 0, detail: evt.detail ?? '' });
                break;
            case 'ready':
                setStatus('ready');
                setWarming(null);
                attemptRef.current = 0;   // reset backoff ONLY once the session is proven healthy
                break;
            case 'listening':
                setStatus('listening');
                break;
            case 'level':
                setLevel(evt.v ?? 0);
                setSpeech(!!evt.speech);
                break;
            case 'transcript':
                upsertLine(evt, 'transcript');
                break;
            case 'line':
            case 'line_update':
                upsertLine(evt, 'line');
                break;
            case 'error':
                // Non-fatal: the session keeps running; surface the message.
                setError(evt.error ?? 'Unknown error');
                break;
            default:
                break; // committed / timing / say / spoken … not rendered yet
        }
    }, [upsertLine]);

    // Opens (or re-opens) the live WS using the stored config. Reconnect logic lives in onclose.
    const openSocket = useCallback(() => {
        const config = configRef.current;
        if (!config) return;

        const ws = new WebSocket(wsUrl('/ws/live'));
        wsRef.current = ws;

        ws.onopen = () => {
            // NOTE: do NOT reset attemptRef here. A backend that accepts-then-drops
            // (crash-after-warm, OOM) would otherwise reset the backoff on every reopen and
            // spin an infinite 1s reconnect loop that never reaches the FAULT slate. Backoff
            // is reset only on a proven-healthy 'ready' event (see handleEvent).
            ws.send(JSON.stringify(config));
        };
        ws.onmessage = (e) => {
            try { handleEvent(JSON.parse(e.data) as LiveEvent); } catch { /* ignore malformed frame */ }
        };
        ws.onerror = () => { /* a close event always follows; reconnect is handled there */ };
        ws.onclose = () => {
            if (wsRef.current !== ws) return;   // superseded by a newer socket — ignore
            wsRef.current = null;
            setLevel(0);
            setSpeech(false);

            if (userStoppedRef.current) return; // intentional stop already moved us to 'idle'

            // Unexpected drop mid-session → retry with exponential backoff, keep subtitles frozen.
            if (attemptRef.current < MAX_RECONNECT_ATTEMPTS) {
                const delay = Math.min(MAX_RECONNECT_DELAY_MS, 1000 * 2 ** attemptRef.current);
                attemptRef.current += 1;
                setStatus('reconnecting');
                clearReconnect();
                reconnectTimerRef.current = setTimeout(() => { openSocket(); }, delay);
            } else {
                // Gave up — explicit FAULT. hadSession stays true so the audience screen shows a
                // "signal lost" hold slate, NEVER the scripted demo.
                setError('Mất kết nối tới backend — đã thử kết nối lại nhiều lần không thành công.');
                setStatus('error');
            }
        };
    }, [handleEvent, clearReconnect]);

    const stop = useCallback(() => {
        userStoppedRef.current = true;
        clearReconnect();
        const ws = wsRef.current;
        wsRef.current = null;
        if (ws && ws.readyState === WebSocket.OPEN) {
            try { ws.send(JSON.stringify({ stop: true })); } catch { /* closing anyway */ }
        }
        ws?.close();
        setStatus('idle');
        setWarming(null);
        setLevel(0);
        setSpeech(false);
        setHadSession(false);   // only an explicit stop allows the demo loop to run again
    }, [clearReconnect]);

    const start = useCallback((config: LiveConfig) => {
        clearReconnect();
        if (wsRef.current) {
            const old = wsRef.current;
            wsRef.current = null;               // detach so its onclose can't trigger a reconnect
            try { old.close(); } catch { /* already closing */ }
        }
        userStoppedRef.current = false;
        attemptRef.current = 0;
        configRef.current = config;
        setError(null);
        setLines([]);
        setHadSession(true);
        setEverStarted(true);   // sticky — the demo loop can never return to the wall this run
        setStatus('connecting');
        openSocket();
    }, [openSocket, clearReconnect]);

    useEffect(() => () => {
        clearReconnect();
        wsRef.current?.close();
    }, [clearReconnect]);

    const value: LiveSessionValue = {
        backendOnline, status, warming, level, speech, lines, error, hadSession, everStarted, start, stop,
    };
    return <LiveSessionContext.Provider value={value}>{children}</LiveSessionContext.Provider>;
};

export function useLiveSession(): LiveSessionValue {
    const ctx = useContext(LiveSessionContext);
    if (!ctx) throw new Error('useLiveSession must be used within LiveSessionProvider');
    return ctx;
}

// 'reconnecting' counts as active so the audience view keeps the frozen live subtitles
// (and its "reconnecting" slate) instead of dropping back to the demo loop.
export const isSessionActive = (status: LiveStatus) =>
    status === 'connecting' || status === 'warming' || status === 'ready'
    || status === 'listening' || status === 'reconnecting';
