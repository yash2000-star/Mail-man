"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { subscribeToToasts, type ToastItem } from "@/lib/toast";

const MAX_VISIBLE = 3;

const STYLES = {
  info: { icon: Info, color: "text-amber-500" },
  success: { icon: CheckCircle2, color: "text-emerald-400" },
  error: { icon: AlertCircle, color: "text-rose-400" },
};

/** Renders toasts from lib/toast in the bottom corner; each closes itself after a few seconds. */
export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToToasts((item) => {
    setToasts((prev) => [...prev, item].slice(-MAX_VISIBLE));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== item.id)), item.kind === "error" ? 7000 : 4000);
  }), []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div
      aria-live="polite"
      className="fixed z-[100] bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 flex flex-col items-stretch md:items-end gap-2 pointer-events-none"
    >
      {toasts.map((t) => {
        const { icon: Icon, color } = STYLES[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className="pointer-events-auto flex items-start gap-3 md:max-w-sm px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl text-sm text-zinc-200 animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <Icon size={18} className={`${color} shrink-0 mt-0.5`} />
            <p className="flex-1 leading-snug">{t.message}</p>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-zinc-500 hover:text-zinc-200 transition shrink-0">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
