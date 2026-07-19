// Tiny dependency-free toast store (pub/sub) — callable from anywhere via `toast.success(...)`,
// rendered once by <Toaster/>. Replaces the scattered inline "✓ Đã lưu" status strings with
// consistent floating notifications.

export type ToastKind = 'success' | 'error' | 'info';
export interface ToastItem { id: number; kind: ToastKind; msg: string; }

let items: ToastItem[] = [];
let counter = 0;
const listeners = new Set<(items: ToastItem[]) => void>();

function emit() {
    const snapshot = items;
    listeners.forEach((l) => l(snapshot));
}

export function subscribeToasts(l: (items: ToastItem[]) => void): () => void {
    listeners.add(l);
    l(items);
    return () => { listeners.delete(l); };
}

export function dismissToast(id: number): void {
    items = items.filter((t) => t.id !== id);
    emit();
}

function push(kind: ToastKind, msg: string, ms: number): number {
    const id = ++counter;
    items = [...items, { id, kind, msg }];
    emit();
    if (ms > 0) setTimeout(() => dismissToast(id), ms);
    return id;
}

export const toast = {
    success: (msg: string) => push('success', msg, 3000),
    error: (msg: string) => push('error', msg, 5000),
    info: (msg: string) => push('info', msg, 3000),
};
