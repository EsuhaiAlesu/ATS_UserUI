// Shared "which event am I working on" pointer for every prep surface — mirrors LiveSessionContext.
// Holds the selected (workspace) event and the activated (matcher) pointer as a snapshot in state,
// recomputed on demand so switching an event re-renders all consumers. Owns no heavy state.

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getEvents, getActiveEventId, setActiveEventId, getActivation, setActivation } from './events';
import type { Conference } from './schedule';
import type { Activation } from './events';

interface Snap { eventId: string; event?: Conference; events: Conference[]; activation: Activation }

function readSnap(): Snap {
    const events = getEvents();
    const eventId = getActiveEventId();
    return { events, eventId, event: events.find((e) => e.id === eventId), activation: getActivation() };
}

interface ActiveEventValue extends Snap {
    setEventId: (id: string) => void;
    activate: (id: string) => void;
    refresh: () => void;
}

const Ctx = createContext<ActiveEventValue | null>(null);

export const ActiveEventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [snap, setSnap] = useState<Snap>(readSnap);

    const refresh = useCallback(() => setSnap(readSnap()), []);
    const setEventId = useCallback((id: string) => { setActiveEventId(id); setSnap(readSnap()); }, []);
    const activate = useCallback((id: string) => { setActivation(id); setSnap(readSnap()); }, []);

    const value = useMemo<ActiveEventValue>(() => ({ ...snap, setEventId, activate, refresh }), [snap, setEventId, activate, refresh]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useActiveEvent(): ActiveEventValue {
    const c = useContext(Ctx);
    if (!c) throw new Error('useActiveEvent must be used within ActiveEventProvider');
    return c;
}
