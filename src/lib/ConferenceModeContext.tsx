// Neutral conference-mode pointer: which interpretation lane (offline / online) the operator console
// shows, plus a tiny stop-relay so the head-bar DỪNG can stop whichever lane is live. Belongs to
// NEITHER lane — it imports nothing from src/lib/lanes/, so both OperatorLayout (the head bar) and
// AudioRouting (the console) may read it. Mounted above the router shell in App.tsx.

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export type ConferenceMode = 'offline' | 'online';

const MODE_KEY = 'proyaku_conference_mode';

// Only an explicit stored 'offline' selects OFFLINE; unset / 'online' → ONLINE (the default lane — the
// self-hosted OFFLINE backend is not wired into this deployment yet). A stored choice wins both ways.
function loadMode(): ConferenceMode {
    try { return localStorage.getItem(MODE_KEY) === 'offline' ? 'offline' : 'online'; }
    catch { return 'online'; }
}

interface ConferenceModeValue {
    mode: ConferenceMode;
    setMode: (m: ConferenceMode) => void;             // no-op while `busy`
    busy: boolean;                                    // a capture is live on the current lane
    setBusy: (v: boolean) => void;                    // each console reports its own running state
    registerStop: (fn: (() => void) | null) => void;  // the ACTIVE console registers its stop function
    requestStop: () => void;                          // head-bar DỪNG calls this
}

const Ctx = createContext<ConferenceModeValue | null>(null);

export const ConferenceModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setModeState] = useState<ConferenceMode>(loadMode);
    const [busy, setBusyState] = useState(false);
    // Latest `busy` for the setMode guard (avoids a stale closure without re-creating setMode).
    const busyRef = useRef(false);
    // The active console's stop function; head-bar DỪNG relays through it for the ONLINE lane.
    const stopRef = useRef<(() => void) | null>(null);

    const setBusy = useCallback((v: boolean) => { busyRef.current = v; setBusyState(v); }, []);

    const setMode = useCallback((m: ConferenceMode) => {
        if (busyRef.current) return; // never switch lanes while a capture is live
        setModeState((prev) => {
            if (m === prev) return prev;
            try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore quota/private-mode */ }
            return m;
        });
    }, []);

    const registerStop = useCallback((fn: (() => void) | null) => { stopRef.current = fn; }, []);
    const requestStop = useCallback(() => { stopRef.current?.(); }, []);

    const value = useMemo<ConferenceModeValue>(
        () => ({ mode, setMode, busy, setBusy, registerStop, requestStop }),
        [mode, setMode, busy, setBusy, registerStop, requestStop],
    );
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useConferenceMode(): ConferenceModeValue {
    const c = useContext(Ctx);
    if (!c) throw new Error('useConferenceMode must be used within ConferenceModeProvider');
    return c;
}
