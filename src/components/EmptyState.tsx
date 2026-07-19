import React from 'react';

// A friendly, on-brand empty state (icon + title + hint + optional actions) — shared so the prep
// tool pages read as one system instead of plain grey "Chưa có…" text.
const EmptyState: React.FC<{
    icon: string;
    title: string;
    hint?: string;
    children?: React.ReactNode;
}> = ({ icon, title, hint, children }) => (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
        <div className="w-16 h-16 rounded-2xl bg-surface-container border border-outline-variant flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: '32px' }} aria-hidden="true">{icon}</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">{title}</h3>
        {hint && <p className="text-sm text-on-surface-variant mt-1.5 max-w-sm leading-relaxed">{hint}</p>}
        {children && <div className="flex flex-wrap items-center justify-center gap-2 mt-5">{children}</div>}
    </div>
);

export default EmptyState;
