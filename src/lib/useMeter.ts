import { useEffect, useState } from 'react';
import { wsUrl } from './api';

/**
 * Live input level via WS /api/ws/meter.
 * `device`: input index, "loopback", or "loopback::<name>". Pass null to disable
 * (e.g. while a live session owns the mic — the session emits its own level events).
 */
export function useMeter(device: number | string | null): { level: number; rms: number } {
    const [level, setLevel] = useState(0);
    const [rms, setRms] = useState(0);

    useEffect(() => {
        if (device === null || device === undefined) {
            setLevel(0);
            setRms(0);
            return;
        }
        let closed = false;
        const ws = new WebSocket(wsUrl('/ws/meter'));
        ws.onopen = () => ws.send(JSON.stringify({ device }));
        ws.onmessage = (e) => {
            try {
                const m = JSON.parse(e.data);
                if (typeof m.level === 'number') setLevel(m.level);
                if (typeof m.rms === 'number') setRms(m.rms);
            } catch { /* ignore malformed frame */ }
        };
        ws.onclose = () => { if (!closed) { setLevel(0); setRms(0); } };
        return () => {
            closed = true;
            if (ws.readyState === WebSocket.OPEN) {
                try { ws.send(JSON.stringify({ stop: true })); } catch { /* closing anyway */ }
            }
            ws.close();
        };
    }, [device]);

    return { level, rms };
}
