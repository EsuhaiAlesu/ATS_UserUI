import { useEffect, useRef } from 'react';

// A module-level "has unsaved changes" flag so the shared nav (OperatorLayout) can warn before
// switching pages, without threading each page's `dirty` state through the router.
let dirtyFlag = false;
export function hasUnsaved(): boolean { return dirtyFlag; }

// Guard a page's unsaved changes: warns the browser on reload/close (beforeunload) AND publishes
// the dirty state to the in-app nav guard. Call with the page's `dirty` boolean.
export function useUnsavedGuard(dirty: boolean): void {
    useEffect(() => {
        dirtyFlag = dirty;
        if (!dirty) return;
        const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', h);
        return () => { window.removeEventListener('beforeunload', h); dirtyFlag = false; };
    }, [dirty]);
}

// Bind ⌘/Ctrl+S to save (and suppress the browser's own Save dialog). `enabled` gates the action.
export function useSaveHotkey(onSave: () => void, enabled = true): void {
    const ref = useRef(onSave);
    ref.current = onSave;
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (enabled) ref.current();
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [enabled]);
}
