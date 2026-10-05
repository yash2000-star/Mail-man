"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import type { LabelColor, SmartLabel } from "@/lib/labels";
import type { ClientEmail } from "@/lib/mail-types";
import type { Mailbox } from "./useMailbox";

/** Renames (or with null, removes) a label on one email. */
function swapLabel(oldName: string, newName: string | null) {
    return (email: ClientEmail): ClientEmail => ({
        ...email,
        appliedLabels: email.appliedLabels?.flatMap((l) => (l === oldName ? (newName ? [newName] : []) : [l])),
    });
}

/** The user's Smart Labels, and applying them to emails. */
export function useSmartLabels(mailbox: Mailbox, aiEnabled: () => boolean) {
    const [labels, setLabels] = useState<SmartLabel[]>([]);

    /** Calls the labels API; returns the updated list, or an error message. */
    const request = async (method: string, body?: object, query = ""): Promise<SmartLabel[] | string> => {
        const result = await api<{ customLabels: SmartLabel[] }>(`/api/labels${query}`, { method, body });
        return result.ok ? result.data.customLabels : result.error;
    };

    /** Applies a label to recent Inbox mail. */
    const scan = async (name: string) => {
        if (!aiEnabled()) return;
        const result = await api<{ matched: string[]; scanned: number }>("/api/labels/scan", { method: "POST", body: { name } });
        if (!result.ok) {
            toast(result.error || `Could not apply "${name}" to your recent emails.`, "error");
            return;
        }
        const matched = new Set(result.data.matched);
        mailbox.patchAllEmails((e) =>
            matched.has(e.id) && !e.appliedLabels?.includes(name) ? { ...e, appliedLabels: [...(e.appliedLabels ?? []), name] } : e,
        );
        toast(`"${name}" was applied to ${matched.size} of your ${result.data.scanned} most recent inbox emails.`, "success");
    };

    /** Creates a label, or updates `editing`. Resolves to an error message, or null. */
    const save = async (label: SmartLabel, editing: SmartLabel | null, applyRetroactively: boolean): Promise<string | null> => {
        const result = editing
            ? await request("PATCH", { ...label, originalName: editing.name })
            : await request("POST", label);
        if (typeof result === "string") return result;

        setLabels(result);
        const savedName = label.name.trim().replace(/\s+/g, " ");
        if (editing && editing.name !== savedName) {
            mailbox.patchAllEmails(swapLabel(editing.name, savedName));
            if (mailbox.activeMailbox === editing.name) mailbox.setActiveMailbox(savedName);
        }
        if (applyRetroactively) scan(savedName);
        return null;
    };

    const changeColor = async (label: SmartLabel, color: LabelColor) => {
        const result = await request("PATCH", { ...label, color, originalName: label.name });
        if (typeof result === "string") toast(result, "error");
        else setLabels(result);
    };

    const remove = async (name: string) => {
        if (!confirm(`Delete the "${name}" label? It will be removed from all emails.`)) return;
        const result = await request("DELETE", undefined, `?name=${encodeURIComponent(name)}`);
        if (typeof result === "string") {
            toast(result, "error");
            return;
        }
        setLabels(result);
        mailbox.patchAllEmails(swapLabel(name, null));
        if (mailbox.activeMailbox === name) mailbox.openMailbox("Inbox");
    };

    /** Adds or removes a label on one email by hand (shown at once). */
    const toggle = async (emailId: string, name: string, applied: boolean) => {
        mailbox.patchEmail(emailId, (e) => {
            const current = e.appliedLabels ?? [];
            return { ...e, appliedLabels: applied ? [...new Set([...current, name])] : current.filter((l) => l !== name) };
        });
        const result = await api("/api/labels/assign", { method: "POST", body: { emailId, name, applied } });
        if (!result.ok) toast("Could not update the label. Please try again.", "error");
    };

    return { labels, setLabels, save, changeColor, remove, toggle };
}
