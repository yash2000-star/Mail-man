"use client";

import { useRef } from "react";
import { api } from "@/lib/api-client";
import type { AnalysisResult, ClientEmail, MailItem } from "@/lib/mail-types";
import type { Mailbox } from "./useMailbox";

const CHUNK_SIZE = 10;
const CHUNK_PAUSE_MS = 2000;

interface AnalysisOptions {
    patchAllEmails: Mailbox["patchAllEmails"];
    /** The AI key is missing or was rejected */
    onNeedsKey: () => void;
    /** This many newly analysed emails need a reply */
    onNewlyFlagged: (count: number) => void;
    /** Task extraction may have added to-dos: reload them */
    onTasksMayHaveChanged: () => void;
}

/** Copies AI results onto the emails they belong to. */
function applyResults(results: AnalysisResult[]) {
    const byId = new Map(results.map((r) => [r.id, r]));
    return (email: ClientEmail): ClientEmail => {
        const match = byId.get(email.id);
        return match ? { ...email, ...match } : email;
    };
}

/**
 * AI analysis of Inbox mail: categories, summaries and suggested replies
 * (/api/classify), then to-dos and Smart Labels (/api/ai/tasks). Results
 * already in the database come back instantly; only new mail costs AI calls.
 */
export function useAnalysis({ patchAllEmails, onNeedsKey, onNewlyFlagged, onTasksMayHaveChanged }: AnalysisOptions) {
    // A ref, so analysis started right after loading the user's settings sees them
    const enabledRef = useRef(false);

    /** Returns false when the AI key is missing or rejected, so callers stop early. */
    const classify = async (list: MailItem[]): Promise<boolean> => {
        for (let i = 0; i < list.length; i += CHUNK_SIZE) {
            const payload = list.slice(i, i + CHUNK_SIZE).map((e) => ({ id: e.id, sender: e.from, snippet: e.snippet }));
            const result = await api<AnalysisResult[]>("/api/classify", { method: "POST", body: { emails: payload } });

            if (!result.ok) {
                const failed = payload.map((e) => ({
                    id: e.id,
                    category: result.status === 429 ? "Limit Reached" : "Error",
                    summary: result.status === 0 ? result.error : `Summary unavailable: ${result.error}`,
                    requires_reply: false,
                    draft_reply: "",
                }));
                patchAllEmails(applyResults(failed));
                // A missing or rejected key fails every chunk the same way: ask once and stop
                if (result.code === "NO_AI_KEY" || result.code === "invalid_key") {
                    onNeedsKey();
                    return false;
                }
                continue;
            }

            const sent = new Set(payload.map((e) => e.id));
            const flagged = result.data.filter((r) => sent.has(r.id) && r.requires_reply).length;
            if (flagged > 0) onNewlyFlagged(flagged);
            patchAllEmails(applyResults(result.data));

            // Space out chunks so free-tier AI keys don't hit their rate limits
            if (i + CHUNK_SIZE < list.length) await new Promise((resolve) => setTimeout(resolve, CHUNK_PAUSE_MS));
        }
        return true;
    };

    /** Extracts to-dos and applies Smart Labels; updates labels on the emails. */
    const extractTasksAndLabels = async (list: MailItem[]) => {
        const result = await api<AnalysisResult[]>("/api/ai/tasks", { method: "POST", body: { ids: list.map((e) => e.id) } });
        if (!result.ok) {
            console.error("Task extraction failed:", result.error);
            return;
        }
        const labels = new Map(result.data.map((r) => [r.id, r.appliedLabels]));
        patchAllEmails((email) => (labels.has(email.id) ? { ...email, appliedLabels: labels.get(email.id) } : email));
        onTasksMayHaveChanged();
    };

    /** Runs both steps on emails that still need them. */
    const analyze = async (list: MailItem[]) => {
        if (!enabledRef.current || list.length === 0) return;
        const unsorted = list.filter((e) => !e.summary);
        if (unsorted.length > 0 && !(await classify(unsorted))) return;
        await extractTasksAndLabels(list);
    };

    return {
        analyze,
        extractTasksAndLabels,
        setEnabled: (enabled: boolean) => {
            enabledRef.current = enabled;
        },
    };
}
