import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Auto-scroll a container to its bottom whenever `deps` change, but release the
 * pin while the user has scrolled up to read history. `sticky` turns back on
 * once they return close to the bottom (or via jumpToBottom).
 */
export function useStickyScroll(deps: unknown[]) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [sticky, setSticky] = useState(true);

    const onScroll = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        setSticky(el.scrollHeight - el.scrollTop - el.clientHeight < 48);
    }, []);

    const jumpToBottom = useCallback(() => {
        const el = ref.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        setSticky(true);
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (el && sticky) el.scrollTop = el.scrollHeight;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, sticky]);

    return { ref, sticky, onScroll, jumpToBottom };
}
