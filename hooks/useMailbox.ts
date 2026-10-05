"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { api } from "@/lib/api-client";
import { isFolder, type ClientEmail, type MailAnalysis, type MailItem, type MailMessage, type MailPage, type MailThread } from "@/lib/mail-types";

export const INBOX_CACHE_KEY = "mailman_cache_inbox_v2";

/** Query string for a sidebar entry: a Gmail folder, Needs Reply, or one of the user's Smart Labels. */
export function mailboxParams(mailbox: string, search: string, pageToken?: string | null): URLSearchParams {
    const params = new URLSearchParams(
        mailbox === "Needs Reply" ? { view: "needs-reply" } : isFolder(mailbox) ? { folder: mailbox } : { label: mailbox },
    );
    if (search.trim()) params.set("q", search.trim());
    if (pageToken) params.set("pageToken", pageToken);
    return params;
}

/** AI fields already on an email, so reloading the message doesn't drop them. */
function pickAnalysis(email: MailAnalysis): MailAnalysis {
    const picked: MailAnalysis = {};
    if (email.category !== undefined) picked.category = email.category;
    if (email.summary !== undefined) picked.summary = email.summary;
    if (email.requires_reply !== undefined) picked.requires_reply = email.requires_reply;
    if (email.draft_reply !== undefined) picked.draft_reply = email.draft_reply;
    if (email.appliedLabels !== undefined) picked.appliedLabels = email.appliedLabels;
    return picked;
}

/** Fetches one page of a mailbox. Returns null on failure (and re-signs in if Google access was lost). */
export async function requestMailPage(params: URLSearchParams): Promise<MailPage | null> {
    const result = await api<MailPage>(`/api/gmail/messages?${params}`);
    if (result.ok) return result.data;
    if (result.status === 401 && result.code === "GMAIL_AUTH") signIn("google");
    else console.error("Failed to fetch emails:", result.error);
    return null;
}

/** Full message (body, attachments, reply headers); null on failure. */
export async function loadFullMessage(id: string): Promise<MailMessage | null> {
    const result = await api<MailMessage>(`/api/gmail/messages/${encodeURIComponent(id)}`);
    return result.ok ? result.data : null;
}

/** A whole conversation, oldest first; null on failure. */
async function loadThread(threadId: string): Promise<MailMessage[] | null> {
    const result = await api<MailThread>(`/api/gmail/threads/${encodeURIComponent(threadId)}`);
    return result.ok ? result.data.messages : null;
}

/** The message Reply and AI Reply should answer: the newest in the conversation. */
export function latestMessage(email: ClientEmail | null): MailMessage | null {
    if (email?.thread?.length) return email.thread[email.thread.length - 1];
    return email?.body !== undefined ? (email as MailMessage) : null;
}

interface MailboxOptions {
    /** Demo mode: no local inbox cache */
    demo: boolean;
    /** Called with each freshly loaded Inbox page (first page or "load more") */
    onInboxPage: (emails: MailItem[]) => Promise<void> | void;
}

/**
 * The open mailbox: which one, its emails, paging, search and the selected
 * email. Edits go through patch helpers that keep the list and the reading
 * pane in step.
 */
export function useMailbox({ demo, onInboxPage }: MailboxOptions) {
    const [activeMailbox, setActiveMailbox] = useState("Inbox");
    const [emails, setEmails] = useState<ClientEmail[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<ClientEmail | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [currentSearch, setCurrentSearch] = useState("");

    /** Applies `change` to the matching email in the list and in the reading pane. */
    const patchEmail = (id: string, change: (email: ClientEmail) => ClientEmail) => {
        setEmails((prev) => prev.map((e) => (e.id === id ? change(e) : e)));
        setSelectedEmail((prev) => (prev?.id === id ? change(prev) : prev));
    };

    /** Applies `change` to every email in memory. */
    const patchAllEmails = (change: (email: ClientEmail) => ClientEmail) => {
        setEmails((prev) => prev.map(change));
        setSelectedEmail((prev) => (prev ? change(prev) : prev));
    };

    /** Takes an email out of the list (archived, trashed...). */
    const removeEmail = (id: string) => {
        setEmails((prev) => prev.filter((e) => e.id !== id));
        setSelectedEmail((prev) => (prev?.id === id ? null : prev));
    };

    const cacheInbox = (list: ClientEmail[]) => {
        if (demo) return;
        try {
            localStorage.setItem(INBOX_CACHE_KEY, JSON.stringify(list));
        } catch {
            // storage full or blocked: the cache is only a speed-up
        }
    };

    /** Shows the cached Inbox instantly while the real one loads. */
    const restoreCachedInbox = () => {
        if (demo) return;
        try {
            const cached = localStorage.getItem(INBOX_CACHE_KEY);
            if (cached) setEmails(JSON.parse(cached));
        } catch {
            // unreadable cache: just wait for the network
        }
    };

    const fetchEmails = async (mailbox = activeMailbox, search = "") => {
        if (mailbox === "To-do") return;
        setIsFetching(true);
        setCurrentSearch(search);
        try {
            const page = await requestMailPage(mailboxParams(mailbox, search));
            if (!page) return;
            setEmails(page.emails);
            setNextPageToken(page.nextPageToken);
            if (mailbox === "Inbox" && !search.trim()) {
                cacheInbox(page.emails);
                setIsFetching(false);
                await onInboxPage(page.emails);
            }
        } finally {
            setIsFetching(false);
        }
    };

    const loadMoreEmails = async () => {
        if (!nextPageToken || isLoadingMore) return;
        setIsLoadingMore(true);
        try {
            const page = await requestMailPage(mailboxParams(activeMailbox, currentSearch, nextPageToken));
            if (!page) return;
            setEmails((prev) => {
                const seen = new Set(prev.map((e) => e.id));
                return [...prev, ...page.emails.filter((e) => !seen.has(e.id))];
            });
            setNextPageToken(page.nextPageToken);
            if (activeMailbox === "Inbox" && !currentSearch) await onInboxPage(page.emails);
        } finally {
            setIsLoadingMore(false);
        }
    };

    /**
     * Puts new Inbox mail at the top without losing what's loaded below it.
     * Conversations that got a new message move up (their row id changes).
     * Returns the rows that weren't in the list before.
     */
    const mergeInboxPage = (page: MailItem[]): MailItem[] => {
        const known = new Set(emails.map((e) => e.id));
        const added = page.filter((e) => !known.has(e.id));
        setEmails((prev) => {
            const pageThreads = new Set(page.map((e) => e.threadId));
            const merged = [...page, ...prev.filter((e) => !pageThreads.has(e.threadId))];
            cacheInbox(merged);
            return merged;
        });
        return added;
    };

    /** Switches the sidebar view and loads it. */
    const openMailbox = (mailbox: string) => {
        setActiveMailbox(mailbox);
        setSelectedEmail(null);
        if (mailbox === "To-do") return;
        setEmails([]);
        setNextPageToken(null);
        fetchEmails(mailbox);
    };

    /** Shows an email in the reading pane, loading its whole conversation. */
    const openEmail = async (email: ClientEmail) => {
        setSelectedEmail(email);
        if (email.body !== undefined) return;

        const thread = email.threadId ? await loadThread(email.threadId) : null;
        const focus = thread?.find((m) => m.id === email.id) ?? thread?.[thread.length - 1] ?? await loadFullMessage(email.id);
        if (!focus) return;
        // Keep the list row's AI results and conversation fields
        const loaded: ClientEmail = {
            ...focus,
            ...pickAnalysis(email),
            id: email.id,
            messageCount: email.messageCount,
            isUnread: false,
            thread: thread ?? undefined,
        };
        setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, isUnread: false } : e)));
        setSelectedEmail((prev) => (prev?.id === email.id ? { ...prev, ...loaded } : prev));
    };

    return {
        activeMailbox,
        setActiveMailbox,
        emails,
        selectedEmail,
        setSelectedEmail,
        isFetching,
        isLoadingMore,
        currentSearch,
        hasMore: Boolean(nextPageToken),
        patchEmail,
        patchAllEmails,
        removeEmail,
        restoreCachedInbox,
        fetchEmails,
        loadMoreEmails,
        mergeInboxPage,
        openMailbox,
        openEmail,
    };
}

export type Mailbox = ReturnType<typeof useMailbox>;
