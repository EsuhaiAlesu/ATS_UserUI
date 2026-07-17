import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getHealth, wsUrl } from './api';
import type { LiveConfig, LiveEvent } from './api';

export type LiveStatus = 'idle' | 'connecting' | 'warming' | 'ready' | 'listening' | 'error';

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
    start: (config: LiveConfig) => void;
    stop: () => void;
}

const LiveSessionContext = createContext<LiveSessionValue | null>(null);

// Kept generous so the Stream page can scroll back through session history.
const MAX_LINES = 400;

export const LiveSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [backendOnline, setBackendOnline] = useState(false);
    const [status, setStatus] = useState<LiveStatus>('idle');
    const [warming, setWarming] = useState<Warming | null>(null);
    const [level, setLevel] = useState(0);
    const [speech, setSpeech] = useState(false);
    const [lines, setLines] = useState<LiveLine[]>([]);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

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
                corrected: evt.corrected,
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

    const stop = useCallback(() => {
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
    }, []);

    const start = useCallback((config: LiveConfig) => {
        if (wsRef.current) stop();
        setError(null);
        setLines([]);
        setStatus('connecting');

        const ws = new WebSocket(wsUrl('/ws/live'));
        wsRef.current = ws;
        ws.onopen = () => ws.send(JSON.stringify(config));
        ws.onmessage = (e) => {
            try { handleEvent(JSON.parse(e.data) as LiveEvent); } catch { /* ignore malformed frame */ }
        };
        ws.onerror = () => {
            if (wsRef.current === ws) {
                setError('WebSocket connection failed — is the backend running?');
                setStatus('error');
            }
        };
        ws.onclose = () => {
            if (wsRef.current === ws) {
                wsRef.current = null;
                setStatus((s) => (s === 'error' ? s : 'idle'));
                setLevel(0);
                setSpeech(false);
            }
        };
    }, [handleEvent, stop]);

    useEffect(() => () => wsRef.current?.close(), []);

    const value: LiveSessionValue = {
        backendOnline, status, warming, level, speech, lines, error, start, stop,
    };
    return <LiveSessionContext.Provider value={value}>{children}</LiveSessionContext.Provider>;
};

export function useLiveSession(): LiveSessionValue {
    const ctx = useContext(LiveSessionContext);
    if (!ctx) throw new Error('useLiveSession must be used within LiveSessionProvider');
    return ctx;
}

export const isSessionActive = (status: LiveStatus) =>
    status === 'connecting' || status === 'warming' || status === 'ready' || status === 'listening';
