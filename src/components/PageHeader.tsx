import React from 'react';
import { useLiveSession, isSessionActive } from '../lib/LiveSessionContext';

// One shared top bar for every operator surface (the Zoom/Teams "family" chrome): identical
// height, background, border, typography and a compact session StatusPill on the right — so the
// whole app reads as one system. Each page passes its own icon + title and its own action
// controls as children (they render just left of the status pill). Pages that need a richer bar
// (e.g. /audio's live cockpit) keep their bespoke bar in the same visual language.

/** Compact global session/backend indicator, mirroring the rail's safety state. */
const StatusPill: React.FC = () => {
    const session = useLiveSession();
    const active = isSessionActive(session.status);
    let dot = 'bg-error', text = 'text-error', label = 'OFFLINE', anim = '';
    if (active) {
        switch (session.status) {
            case 'listening': dot = 'bg-secondary'; text = 'text-secondary'; label = 'LIVE'; anim = 'listening-pulse'; break;
            case 'ready': dot = 'bg-secondary'; text = 'text-secondary'; label = 'SẴN SÀNG'; break;
            case 'warming': dot = 'bg-primary'; text = 'text-primary'; label = 'ĐANG WARM'; anim = 'animate-pulse'; break;
            case 'connecting': dot = 'bg-primary'; text = 'text-primary'; label = 'ĐANG NỐI'; anim = 'animate-pulse'; break;
            case 'reconnecting': dot = 'bg-error'; text = 'text-error'; label = 'NỐI LẠI'; anim = 'animate-pulse'; break;
            default: dot = 'bg-secondary'; text = 'text-secondary'; label = 'LIVE'; anim = 'listening-pulse';
        }
    } else if (session.backendOnline) {
        dot = 'bg-secondary'; text = 'text-secondary'; label = 'ONLINE';
    }
    return (
        <span className={`flex items-center gap-1.5 font-label-caps text-label-caps px-2.5 py-1 rounded-full border border-outline-variant ${text}`}>
            <span className={`w-2 h-2 rounded-full ${dot} ${anim}`}></span>
            {label}
        </span>
    );
};

const PageHeader: React.FC<{
    icon: string;
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
}> = ({ icon, title, subtitle, children }) => (
    <header className="shrink-0 h-14 flex items-center gap-4 px-5 border-b border-outline-variant bg-surface-container-lowest">
        <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-secondary text-xl shrink-0" aria-hidden="true">{icon}</span>
            <div className="min-w-0">
                <div className="font-semibold text-[15px] leading-tight text-on-surface truncate">{title}</div>
                {subtitle && <div className="font-label-caps text-label-caps text-on-surface-variant truncate leading-tight">{subtitle}</div>}
            </div>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
            {children}
            <StatusPill />
        </div>
    </header>
);

export default PageHeader;
