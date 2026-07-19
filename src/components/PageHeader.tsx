import React from 'react';

// One shared page toolbar for every operator surface — identical height/background/border/typography
// so the whole app reads as one system. It sits UNDER the global head bar (which owns the session
// status + Emergency Stop), and carries the page's own icon + title + action controls (children).

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
        {children && <div className="ml-auto flex items-center gap-2.5">{children}</div>}
    </header>
);

export default PageHeader;
