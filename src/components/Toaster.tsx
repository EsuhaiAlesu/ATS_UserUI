import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { subscribeToasts, dismissToast, type ToastItem } from '../lib/toast';

const STYLE: Record<ToastItem['kind'], { icon: string; ring: string; text: string }> = {
    success: { icon: 'check_circle', ring: 'border-secondary/50', text: 'text-secondary' },
    error: { icon: 'error', ring: 'border-error/50', text: 'text-error' },
    info: { icon: 'info', ring: 'border-outline-variant', text: 'text-primary' },
};

// Mounted once (in App). Renders the toast stack top-right, above all chrome, via a portal so it
// never gets clipped by a page's overflow-hidden shell.
const Toaster: React.FC = () => {
    const [items, setItems] = useState<ToastItem[]>([]);
    useEffect(() => subscribeToasts(setItems), []);
    if (typeof document === 'undefined') return null;
    return createPortal(
        <div className="fixed top-20 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
            {items.map((t) => {
                const s = STYLE[t.kind];
                return (
                    <div key={t.id} role="status"
                        className={`toast-in pointer-events-auto flex items-center gap-2.5 max-w-sm bg-surface-container border ${s.ring} rounded-xl px-4 py-3 shadow-xl`}>
                        <span className={`material-symbols-outlined shrink-0 ${s.text}`} aria-hidden="true">{s.icon}</span>
                        <span className="text-sm text-on-surface flex-1 leading-snug">{t.msg}</span>
                        <button onClick={() => dismissToast(t.id)} className="shrink-0 text-on-surface-variant hover:text-on-surface transition-colors" aria-label="Đóng">
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
                        </button>
                    </div>
                );
            })}
        </div>,
        document.body,
    );
};

export default Toaster;
