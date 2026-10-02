/** Small app-wide notifications, shown by <Toaster /> (mounted in app/Providers). */

export type ToastKind = "info" | "success" | "error";

export interface ToastItem {
    id: number;
    message: string;
    kind: ToastKind;
}

type Listener = (toast: ToastItem) => void;

const listeners = new Set<Listener>();
let nextId = 1;

export function toast(message: string, kind: ToastKind = "info"): void {
    const item = { id: nextId++, message, kind };
    listeners.forEach((listener) => listener(item));
}

export function subscribeToToasts(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
