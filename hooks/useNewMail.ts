"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/api-client";
import type { MailChanges } from "@/lib/mail-types";

export const NEW_MAIL_POLL_MS = 30_000;

/**
 * Watches for new Inbox mail by asking /api/gmail/changes every 30 seconds
 * while the tab is visible, and right away when the user comes back to it.
 * `onNewMail` gets the ids that arrived (or an empty list on `reset`, which
 * means "reload the inbox").
 */
export function useNewMail(enabled: boolean, onNewMail: (newMessageIds: string[], reset: boolean) => void) {
    const historyId = useRef<string | null>(null);
    const checking = useRef(false);
    // Always call the latest callback without restarting the timer
    const callback = useRef(onNewMail);
    useEffect(() => {
        callback.current = onNewMail;
    });

    useEffect(() => {
        if (!enabled) return;

        const check = async () => {
            if (checking.current || document.visibilityState !== "visible") return;
            checking.current = true;
            try {
                const since = historyId.current ? `?since=${historyId.current}` : "";
                const result = await api<MailChanges>(`/api/gmail/changes${since}`);
                if (!result.ok) return;
                const isFirstCheck = historyId.current === null;
                historyId.current = result.data.historyId;
                if (isFirstCheck) return;
                if (result.data.reset || result.data.newMessageIds.length > 0) {
                    callback.current(result.data.newMessageIds, Boolean(result.data.reset));
                }
            } finally {
                checking.current = false;
            }
        };

        check();
        const timer = setInterval(check, NEW_MAIL_POLL_MS);
        const onVisible = () => {
            if (document.visibilityState === "visible") check();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [enabled]);
}
