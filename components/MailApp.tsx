"use client";

import Sidebar from "@/components/Sidebar";
import { toast } from "@/lib/toast";
import EmailFeed from "@/components/EmailFeed";
import ReadingPane from "@/components/ReadingPane";
import AiChat from "@/components/AiChat";
import ComposeModal from "@/components/ComposeModal";
import SettingsModal from "@/components/SettingsModal";
import LandingPage from "@/components/LandingPage";
import SmartLabelModal from "@/components/SmartLabelModal";
import ToDoDashboard, { type TaskChanges } from "@/components/ToDoDashboard";

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { AI_PROVIDERS, AiProvider, SavedKeys } from "@/lib/ai-providers";
import type { LabelColor, SmartLabel } from "@/lib/labels";
import type { Task } from "@/lib/tasks";
import { isFolder, type MailAnalysis, type MailItem, type MailMessage, type MailPage, type MailThread } from "@/lib/mail-types";
import {
  Bot, Mail, Menu, ListTodo, Pencil
} from "lucide-react";

const NO_SAVED_KEYS: SavedKeys = {
  gemini: { saved: false, hint: "" },
  openai: { saved: false, hint: "" },
  anthropic: { saved: false, hint: "" },
};

interface ComposeData {
  to: string;
  subject: string;
  body: string;
  replyTo?: { emailId: string; threadId: string; messageId: string; references: string };
  /** Original message shown below the editor and appended on send */
  quotedHtml?: string;
  /** A saved Gmail draft being reopened */
  draft?: { draftId: string; cc: string; bcc: string; attachments: MailMessage["attachments"] };
}

const EMPTY_COMPOSE: ComposeData = { to: "", subject: "", body: "" };

/** Shown across the top of /demo: what it is, and the way out. */
function DemoBanner() {
  return (
    <div className="shrink-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 bg-amber-500 text-black text-xs font-bold">
      <span>Demo mode: a sample inbox. Nothing here touches a real mailbox, and AI answers are canned.</span>
      <span className="flex items-center gap-3">
        <button onClick={() => signIn("google", { callbackUrl: "/" })} className="underline underline-offset-2 hover:no-underline">
          Connect your Gmail
        </button>
        {/* A full page load, so the sample backend is gone */}
        <button onClick={() => window.location.assign("/")} className="underline underline-offset-2 hover:no-underline">
          Exit demo
        </button>
      </span>
    </div>
  );
}

/** AI fields already on an email, so a reload of the message doesn't drop them. */
function pickAnalysis(email: MailAnalysis): MailAnalysis {
  const picked: MailAnalysis = {};
  if (email.category !== undefined) picked.category = email.category;
  if (email.summary !== undefined) picked.summary = email.summary;
  if (email.requires_reply !== undefined) picked.requires_reply = email.requires_reply;
  if (email.draft_reply !== undefined) picked.draft_reply = email.draft_reply;
  if (email.appliedLabels !== undefined) picked.appliedLabels = email.appliedLabels;
  return picked;
}

/**
 * The signed-in mail client. With `demo`, it runs against the sample backend
 * in lib/demo (the /demo page) and shows a banner instead of touching Gmail.
 */
export default function MailApp({ demo = false }: { demo?: boolean }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emails, setEmails] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // The memory for the right-hand reading pane!
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [activeMailbox, setActiveMailbox] = useState("Inbox");
  const [draftData, setDraftData] = useState<ComposeData>(EMPTY_COMPOSE);
  // Remounts Compose for each new message so its fields start fresh
  const [composeKey, setComposeKey] = useState(0);
  // Paging and search for the current mailbox
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentSearch, setCurrentSearch] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Smart Label modal: closed (null), creating ("new"), or editing a label
  const [labelModal, setLabelModal] = useState<"new" | SmartLabel | null>(null);
  const [needsReplyCount, setNeedsReplyCount] = useState(0);
  const [globalTasks, setGlobalTasks] = useState<Task[]>([]);
  const [customLabels, setCustomLabels] = useState<SmartLabel[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Which AI keys the user has saved (the keys themselves stay on the server)
  const [savedKeys, setSavedKeys] = useState<SavedKeys>(NO_SAVED_KEYS);
  const [aiProvider, setAiProvider] = useState<AiProvider | null>(null);
  const hasAiKey = AI_PROVIDERS.some((p) => savedKeys[p].saved);
  const [isScanningTasks, setIsScanningTasks] = useState(false);
  // Prevents flash of dashboard before the API-key check completes
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  // NEW Helper: Premium Badge Colors based on Category
  const getBadgeStyle = (category: string) => {
    switch (category?.toLowerCase()) {
      case "important":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "promotions":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "social":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "spam":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "limit reached":
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
      default:
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    }
  };

  /** Query string for a sidebar entry: a Gmail folder, or one of the user's Smart Labels. */
  const mailboxParams = (mailbox: string, search: string, pageToken?: string | null) => {
    const params = new URLSearchParams(
      mailbox === "Needs Reply" ? { view: "needs-reply" } : isFolder(mailbox) ? { folder: mailbox } : { label: mailbox },
    );
    if (search.trim()) params.set("q", search.trim());
    if (pageToken) params.set("pageToken", pageToken);
    return params;
  };

  /** Fetches a page of emails through our server. Returns null on failure. */
  const requestMailPage = async (params: URLSearchParams): Promise<MailPage | null> => {
    const response = await fetch(`/api/gmail/messages?${params}`);
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && data.code === "GMAIL_AUTH") {
      // Google access was revoked or expired beyond refresh: sign in again
      signIn("google");
      return null;
    }
    if (!response.ok) {
      console.error("Failed to fetch emails:", data.error);
      return null;
    }
    return data as MailPage;
  };

  /** Runs AI sorting on Inbox emails that don't have results yet. */
  const analyzeNewEmails = async (list: MailItem[], aiReady: boolean) => {
    if (!aiReady) return;
    const unsorted = list.filter((e) => !e.summary);
    if (unsorted.length > 0) {
      const keyOk = await classifyEmailsBatch(unsorted);
      if (!keyOk) return;
    }
    await extractTasksAndLabelsBatch(list);
  };

  const fetchEmails = async (
    mailboxToFetch = activeMailbox,
    searchString = "",
    aiReady: boolean = hasAiKey
  ) => {
    if (mailboxToFetch === "To-do") return;
    setIsFetching(true);
    setCurrentSearch(searchString);

    try {
      const page = await requestMailPage(mailboxParams(mailboxToFetch, searchString));
      if (!page) return;

      setEmails(page.emails);
      setNextPageToken(page.nextPageToken);

      const isInbox = mailboxToFetch === "Inbox" && !searchString.trim();
      if (isInbox) {
        if (!demo) {
          try {
            localStorage.setItem("mailman_cache_inbox_v2", JSON.stringify(page.emails));
          } catch {
            // storage full or blocked: the cache is only a speed-up
          }
        }
        setIsFetching(false);
        await analyzeNewEmails(page.emails, aiReady);
      }
    } catch (error) {
      console.error("Error in fetchEmails:", error);
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
      if (activeMailbox === "Inbox" && !currentSearch) await analyzeNewEmails(page.emails, hasAiKey);
    } finally {
      setIsLoadingMore(false);
    }
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

  /** Loads the full message (body, attachments, reply headers) for the reading pane. */
  const loadFullMessage = async (id: string): Promise<MailMessage | null> => {
    const response = await fetch(`/api/gmail/messages/${id}`);
    if (!response.ok) return null;
    return response.json();
  };

  /** Loads a whole conversation, oldest first; null on failure. */
  const loadThread = async (threadId: string): Promise<MailMessage[] | null> => {
    const response = await fetch(`/api/gmail/threads/${threadId}`);
    if (!response.ok) return null;
    const data: MailThread = await response.json();
    return data.messages;
  };

  /** The message that Reply / AI Reply should answer: the newest in the conversation. */
  const latestMessage = (email: any): MailMessage | null =>
    email?.thread?.length ? email.thread[email.thread.length - 1] : email?.body !== undefined ? email : null;

  const handleSelectEmail = async (email: any) => {
    if (activeMailbox === "Draft") {
      openDraft(email.id);
      return;
    }
    setSelectedEmail(email);
    if (email.isUnread) handleEmailAction(email.id, "read");
    if (email.body !== undefined) return;

    // Open the whole conversation; fall back to the single message
    const thread = email.threadId ? await loadThread(email.threadId) : null;
    const focus = thread?.find((m) => m.id === email.id) ?? thread?.[thread.length - 1] ?? await loadFullMessage(email.id);
    if (!focus) return;
    // Keep the list row's AI results and conversation fields
    const merged = {
      ...focus,
      ...pickAnalysis(email),
      id: email.id,
      messageCount: email.messageCount,
      isUnread: false,
      thread: thread ?? undefined,
    };
    setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, isUnread: false } : e)));
    setSelectedEmail((prev: any) => (prev?.id === email.id ? { ...prev, ...merged } : prev));
  };

  // --- ⚡ UPGRADED SAFETY BATCH PROCESSING ---

  /** Returns false when the AI key is missing or rejected, so callers stop early. */
  const classifyEmailsBatch = async (allEmails: any[]): Promise<boolean> => {

    // The backend now intelligently filters out already classified emails!
    // We just pass the entire batch directly to the secure route.
    const chunks = [];
    for (let i = 0; i < allEmails.length; i += 10) {
      chunks.push(allEmails.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      try {
        const payload = chunk.map(e => ({ id: e.id, sender: e.from, snippet: e.snippet }));
        const response = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: payload }),
        });

        const results = await response.json().catch(() => ({ error: "Unexpected server response." }));

        if (!response.ok || results.error) {
          const message: string = results.error || "Summary unavailable.";
          updateEmailStateWithAiData(payload.map((e) => ({
            id: e.id,
            category: response.status === 429 ? "Limit Reached" : "Error",
            summary: `Summary unavailable: ${message}`,
            requires_reply: false,
            draft_reply: "",
          })));
          // A missing or rejected key fails every chunk the same way: ask once and stop
          if (results.code === "NO_AI_KEY" || results.code === "invalid_key") {
            setIsSettingsOpen(true);
            return false;
          }
          continue;
        }

        if (Array.isArray(results)) {
          // Newly analysed emails that need a reply join the Needs Reply count
          const sent = new Set(payload.map((e) => e.id));
          const newlyFlagged = results.filter((r: MailAnalysis & { id: string }) => sent.has(r.id) && r.requires_reply).length;
          if (newlyFlagged > 0) setNeedsReplyCount((c) => c + newlyFlagged);
          // Immediately show the new summaries (and the instantly returned cached DB summaries)
          updateEmailStateWithAiData(results);
        }

        // Wait 2 seconds between chunks to let the API "breathe"
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error("Batch chunk failed:", error);
        // Map over the chunk that failed so we can still shut off the loading indicators
        const catchErrorResults = chunk.map(e => ({
          id: e.id,
          category: "Error",
          summary: "Failed to connect to the analysis server. Please check your connection.",
          requires_reply: false,
          draft_reply: ""
        }));
        updateEmailStateWithAiData(catchErrorResults);
      }
    }
    return true;
  };

  // Helper to keep the code clean
  const updateEmailStateWithAiData = (results: any[]) => {
    setEmails((prev) => {
      return prev.map((email) => {
        const match = results.find((r: any) => r.id === email.id);
        return match ? { ...email, ...match } : email;
      });
    });

    // Refresh reading pane if active (Using updater pattern to prevent stale closures)
    setSelectedEmail((prevSelected: any) => {
      if (!prevSelected) return prevSelected;
      const match = results.find((r: any) => r.id === prevSelected.id);
      return match ? { ...prevSelected, ...match } : prevSelected;
    });
  };

  const extractTasksAndLabelsBatch = async (emailList: any[]) => {
    try {
      const response = await fetch("/api/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: emailList.map((e) => e.id) }),
      });

      if (!response.ok) {
        console.error(`Batch Tasks API failed with status: ${response.status}`);
        return;
      }

      const results = await response.json();

      if (Array.isArray(results)) {
        // 1. Update emails with applied labels
        setEmails((prevEmails) => {
          return prevEmails.map((email) => {
            const result = results.find((r: any) => r.id === email.id);
            return result ? { ...email, appliedLabels: result.appliedLabels } : email;
          });
        });

        // Refresh selectedEmail if it was part of this batch (Prevents stale closures)
        setSelectedEmail((prevSelected: any) => {
          if (!prevSelected) return prevSelected;
          const result = results.find((r: any) => r.id === prevSelected.id);
          return result ? { ...prevSelected, appliedLabels: result.appliedLabels } : prevSelected;
        });

        // 2. Update Global Tasks - Sync directly from MongoDB to capture the real Database IDs and skip duplicates!
        try {
          const userRes = await fetch('/api/user');
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.globalTasks) setGlobalTasks(userData.globalTasks);
          }
        } catch (e) {
          console.error("Failed to sync DB tasks", e);
        }
      }
    } catch (error) {
      console.error("Failed to extract batch tasks:", error);
    }
  };

  const escapeHtml = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /** Opens Compose as a threaded reply, or as a forward that includes the original. */
  const openCompose = (data: ComposeData) => {
    setDraftData(data);
    setComposeKey((k) => k + 1);
    setIsComposeOpen(true);
  };

  /** The original email as HTML, safe to place inside a quote. */
  const originalAsHtml = (original: MailMessage) =>
    original.bodyIsHtml
      ? original.body
      : `<div style="white-space:pre-wrap">${escapeHtml(original.body || original.snippet || "")}</div>`;

  /** Opens Compose as a threaded reply, or as a forward; the original is quoted below. */
  const startReplyOrForward = (original: MailMessage, mode: "reply" | "forward", body = "") => {
    const baseSubject = (original.subject || "").replace(/^((re|fwd?):\s*)+/i, "");
    const sender = `${escapeHtml(original.from)} &lt;${escapeHtml(original.fromEmail)}&gt;`;
    if (mode === "reply") {
      openCompose({
        to: original.fromEmail || original.from,
        subject: `Re: ${baseSubject}`,
        body,
        replyTo: { emailId: original.id, threadId: original.threadId, messageId: original.messageId, references: original.references },
        quotedHtml: `<div class="gmail_quote"><div>On ${escapeHtml(original.date)}, ${sender} wrote:</div>`
          + `<blockquote class="gmail_quote" style="margin:0 0 0 .8ex;border-left:1px solid #ccc;padding-left:1ex">`
          + `${originalAsHtml(original)}</blockquote></div>`,
      });
    } else {
      openCompose({
        to: "",
        subject: `Fwd: ${baseSubject}`,
        body,
        quotedHtml: `<div class="gmail_quote"><div>---------- Forwarded message ----------</div>`
          + `<div>From: ${sender}<br>Date: ${escapeHtml(original.date)}<br>Subject: ${escapeHtml(original.subject)}<br>To: ${escapeHtml(original.to)}</div><br>`
          + `${originalAsHtml(original)}</div>`,
      });
    }
  };

  /** Clicking a message in Drafts reopens it in Compose. */
  const openDraft = async (messageId: string) => {
    const response = await fetch(`/api/drafts?messageId=${encodeURIComponent(messageId)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast(data.error || "Could not open the draft.", "error");
      return;
    }
    const draft: MailMessage = data.message;
    openCompose({
      to: draft.to,
      subject: draft.subject === "(no subject)" ? "" : draft.subject,
      body: draft.bodyIsHtml ? draft.body : `<p>${escapeHtml(draft.body).replace(/\n/g, "<br>")}</p>`,
      draft: { draftId: data.draftId, cc: draft.cc, bcc: draft.bcc, attachments: draft.attachments },
    });
  };

  // Quick action
  const handleEmailAction = async (id: string, action: string) => {
    if (action === "tag") return; // labels are applied from the reading pane
    if (["trash", "untrash", "archive", "unarchive", "spam", "notspam"].includes(action)) {
      setEmails((prev) => prev.filter((email) => email.id !== id));
      if (selectedEmail?.id === id) setSelectedEmail(null);
    } else if (action === "unread") {
      setEmails((prev) =>
        prev.map((email) =>
          email.id === id ? { ...email, isUnread: true } : email,
        ),
      );
    } else if (action === "read") {
      setEmails((prev) =>
        prev.map((email) =>
          email.id === id ? { ...email, isUnread: false } : email,
        ),
      );
    } else if (action === "star") {
      setEmails((prev) =>
        prev.map((email) =>
          email.id === id ? { ...email, isStarred: true } : email,
        ),
      );
      if (selectedEmail?.id === id)
        setSelectedEmail({ ...selectedEmail, isStarred: true });
    } else if (action === "unstar") {
      setEmails((prev) =>
        prev.map((email) =>
          email.id === id ? { ...email, isStarred: false } : email,
        ),
      );
      if (selectedEmail?.id === id)
        setSelectedEmail({ ...selectedEmail, isStarred: false });
    } else if (action === "reply" || action === "forward") {
      if (selectedEmail) {
        // Answer the newest message of the conversation, loading it if needed
        const original = latestMessage(selectedEmail) ?? await loadFullMessage(selectedEmail.id);
        if (original) startReplyOrForward(original, action);
      }
      return; // compose only, nothing to change in Gmail yet
    }

    // Conversation rows change the whole thread (except stars, which are per message)
    const row = emails.find((e) => e.id === id) ?? (selectedEmail?.id === id ? selectedEmail : null);
    const target = row?.messageCount && action !== "star" && action !== "unstar"
      ? { threadId: row.threadId }
      : { id };

    try {
      const response = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, action }),
      });
      if (!response.ok) console.error(`Failed to ${action} email`);
    } catch (error) {
      console.error(`Failed to ${action} email:`, error);
    }
  };

  const handleUpdateEmail = (id: string, updates: any) => {
    setEmails((prev) =>
      prev.map((email) => {
        if (email.id !== id) return email;

        let newLabels = email.appliedLabels || [];
        if (updates.label && !newLabels.includes(updates.label)) {
          newLabels = [...newLabels, updates.label];
        }

        return {
          ...email,
          appliedLabels: newLabels,
          category: updates.category || email.category,
        };
      })
    );

    setSelectedEmail((prevSelected: any) => {
      if (prevSelected?.id !== id) return prevSelected;

      let newLabels = prevSelected.appliedLabels || [];
      if (updates.label && !newLabels.includes(updates.label)) {
        newLabels = [...newLabels, updates.label];
      }

      return {
        ...prevSelected,
        appliedLabels: newLabels,
        category: updates.category || prevSelected.category,
      };
    });
  };
  // THE AI AUTO-REPLY ENGINE
  const handleAiReply = async (email: any) => {
    if (!hasAiKey) {
      setIsSettingsOpen(true);
      return;
    }
    setIsAiThinking(true);

    try {
      const original: MailMessage | null = latestMessage(email) ?? await loadFullMessage(email.id);
      if (!original) throw new Error("Could not load the email.");

      const response = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailBody: original.body || original.snippet, senderName: original.from }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.code === "NO_AI_KEY" || data.code === "invalid_key") setIsSettingsOpen(true);
        toast(data.error || "AI failed to generate a reply. Please try again.", "error");
        return;
      }

      if (data.reply) {
        // The editor takes HTML: keep the AI's paragraphs
        const html = String(data.reply)
          .split(/\n{2,}/)
          .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
          .join("");
        startReplyOrForward(original, "reply", html);
      }
    } catch (error) {
      console.error("AI Reply failed:", error);
      toast("AI failed to generate a reply. Please try again.", "error");
    } finally {
      setIsAiThinking(false);
    }
  };

  // --- TO-DO DASHBOARD ---

  /** Calls the tasks API and syncs the list from its response. Returns an error message or null. */
  const tasksRequest = async (method: string, body?: object, query = ""): Promise<string | null> => {
    try {
      const response = await fetch(`/api/tasks${query}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return data.error || "Something went wrong. Please try again.";
      setGlobalTasks(data.tasks);
      return null;
    } catch {
      return "Could not reach the server. Check your connection.";
    }
  };

  const handleAddTask = (task: { title: string; dueDate: string; isUrgent: boolean; emailId?: string }) => tasksRequest("POST", task);

  /** "Add to To-do" in the reading pane: a task that links back to the email. */
  const handleCreateTaskFromEmail = async (email: MailItem) => {
    const subject = (email.subject || "").replace(/^((re|fwd?):\s*)+/i, "").trim() || "(no subject)";
    const error = await handleAddTask({ title: `Follow up: ${subject}`, dueDate: "", isUrgent: false, emailId: email.id });
    if (error) toast(error, "error");
    else toast("Added to your to-do list.", "success");
  };

  const handleUpdateTask = async (id: string, changes: TaskChanges) => {
    // Show the change immediately; the server's list replaces it when it answers
    setGlobalTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    const error = await tasksRequest("PATCH", { id, ...changes });
    if (error) {
      toast(error, "error");
      tasksRequest("GET");
    }
  };

  const handleDeleteTask = async (id: string) => {
    setGlobalTasks((prev) => prev.filter((t) => t.id !== id));
    const error = await tasksRequest("DELETE", undefined, `?id=${encodeURIComponent(id)}`);
    if (error) {
      toast(error, "error");
      tasksRequest("GET");
    }
  };

  const handleViewEmail = async (emailId: string) => {
    if (activeMailbox === "To-do") openMailbox("Inbox");
    const inList = emails.find((e) => e.id === emailId);
    if (inList) {
      handleSelectEmail(inList);
      return;
    }
    const full = await loadFullMessage(emailId);
    if (!full) {
      toast("That email is no longer in your mailbox.", "error");
      return;
    }
    handleSelectEmail(full.body !== undefined ? { ...full, body: undefined } : full);
  };


  // --- SMART LABELS ---

  /** Calls the labels API; returns the updated list, or an error message. */
  const labelsRequest = async (method: string, body?: object, query = ""): Promise<SmartLabel[] | string> => {
    try {
      const response = await fetch(`/api/labels${query}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return data.error || "Something went wrong. Please try again.";
      return data.customLabels as SmartLabel[];
    } catch {
      return "Could not reach the server. Check your connection.";
    }
  };

  /** Renames or removes a label on emails already in memory. */
  const updateLabelOnEmails = (oldName: string, newName: string | null) => {
    const swap = (labels?: string[]) =>
      labels?.flatMap((l) => (l === oldName ? (newName ? [newName] : []) : [l]));
    setEmails((prev) => prev.map((e) => ({ ...e, appliedLabels: swap(e.appliedLabels) })));
    setSelectedEmail((prev: any) => (prev ? { ...prev, appliedLabels: swap(prev.appliedLabels) } : prev));
  };

  /** Applies a label to recent inbox mail, then reloads the label's view if it's open. */
  const scanLabel = async (name: string) => {
    if (!hasAiKey) return;
    const response = await fetch("/api/labels/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast(data.error || `Could not apply "${name}" to your recent emails.`, "error");
      return;
    }
    const matched = new Set<string>(data.matched ?? []);
    setEmails((prev) => prev.map((e) =>
      matched.has(e.id) && !e.appliedLabels?.includes(name)
        ? { ...e, appliedLabels: [...(e.appliedLabels ?? []), name] }
        : e,
    ));
    toast(`"${name}" was applied to ${matched.size} of your ${data.scanned} most recent inbox emails.`, "success");
  };

  const handleSaveLabel = async (label: SmartLabel, { applyRetroactively }: { applyRetroactively: boolean }) => {
    const editing = labelModal !== "new" && labelModal ? labelModal : null;
    const result = editing
      ? await labelsRequest("PATCH", { ...label, originalName: editing.name })
      : await labelsRequest("POST", label);
    if (typeof result === "string") return result;

    setCustomLabels(result);
    const savedName = label.name.trim().replace(/\s+/g, " ");
    if (editing && editing.name !== savedName) {
      updateLabelOnEmails(editing.name, savedName);
      if (activeMailbox === editing.name) setActiveMailbox(savedName);
    }
    if (applyRetroactively) scanLabel(savedName);
    return null;
  };

  const handleChangeLabelColor = async (label: SmartLabel, color: LabelColor) => {
    const result = await labelsRequest("PATCH", { ...label, color, originalName: label.name });
    if (typeof result === "string") toast(result, "error");
    else setCustomLabels(result);
  };

  const handleDeleteCustomLabel = async (labelName: string) => {
    if (!confirm(`Delete the "${labelName}" label? It will be removed from all emails.`)) return;
    const result = await labelsRequest("DELETE", undefined, `?name=${encodeURIComponent(labelName)}`);
    if (typeof result === "string") {
      toast(result, "error");
      return;
    }
    setCustomLabels(result);
    updateLabelOnEmails(labelName, null);
    if (activeMailbox === labelName) openMailbox("Inbox");
  };

  /** Adds or removes a label on one email by hand (optimistic). */
  const handleToggleLabel = async (emailId: string, name: string, applied: boolean) => {
    const apply = (labels: string[] = []) => (applied ? [...new Set([...labels, name])] : labels.filter((l) => l !== name));
    setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, appliedLabels: apply(e.appliedLabels) } : e)));
    setSelectedEmail((prev: any) => (prev?.id === emailId ? { ...prev, appliedLabels: apply(prev.appliedLabels) } : prev));
    const response = await fetch("/api/labels/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailId, name, applied }),
    }).catch(() => null);
    if (!response?.ok) toast("Could not update the label. Please try again.", "error");
  };

  // --- NEEDS REPLY ---

  /** Takes an email off the Needs Reply list (after replying, or by hand). */
  const handleMarkHandled = async (emailId: string) => {
    const wasFlagged = emails.find((e) => e.id === emailId)?.requires_reply ?? selectedEmail?.requires_reply;
    setEmails((prev) =>
      activeMailbox === "Needs Reply"
        ? prev.filter((e) => e.id !== emailId)
        : prev.map((e) => (e.id === emailId ? { ...e, requires_reply: false } : e)),
    );
    setSelectedEmail((prev: any) => (prev?.id === emailId ? { ...prev, requires_reply: false } : prev));
    if (wasFlagged) setNeedsReplyCount((c) => Math.max(0, c - 1));
    await fetch("/api/analysis/handled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailId }),
    }).catch(() => null);
  };

  const initializationRef = useRef(false);

  useEffect(() => {
    const initializeApp = async () => {
      // Google refused to refresh the token (access revoked): sign in again
      if ((session as { error?: string } | null)?.error === "RefreshAccessTokenError") {
        signIn("google");
        return;
      }
      if (session && !initializationRef.current) {
        initializationRef.current = true;

        // 1. Fetch User Data from MongoDB First!
        let aiReady = false;
        try {
          const res = await fetch('/api/user');
          if (res.ok) {
            const userData = await res.json();
            aiReady = AI_PROVIDERS.some((p) => userData.savedKeys?.[p]?.saved);
            if (!aiReady) {
              // New user with no AI key: send them to onboarding
              router.replace("/setup");
              return; // keep isCheckingKey=true so nothing flashes before redirect
            }
            setSavedKeys(userData.savedKeys);
            setAiProvider(userData.aiProvider);
            if (userData.customLabels) setCustomLabels(userData.customLabels);
            setNeedsReplyCount(userData.needsReplyCount ?? 0);
            if (userData.globalTasks) setGlobalTasks(userData.globalTasks);
          }
        } catch (e) {
          console.error("Error fetching user profile:", e);
        }

        // Key check is done — safe to reveal the dashboard
        setIsCheckingKey(false);

        // 2. Load the super-fast UI cached emails
        const cached = demo ? null : localStorage.getItem("mailman_cache_inbox_v2");
        if (cached) {
          try {
            setEmails(JSON.parse(cached));
          } catch (e) {
            console.error("Failed to parse cached emails", e);
          }
        }

        // 3. Background fetch for new emails (pass aiReady explicitly: state isn't updated yet)
        fetchEmails(undefined, undefined, aiReady);
      }
    };
    initializeApp();
  }, [session]);

  if (session) {
    // Block render until the API-key check is done — prevents flash of dashboard UI before redirect
    if (isCheckingKey) {
      return <div className="h-screen w-screen bg-black" />;
    }

    return (
      //  Locks the screen height
      <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden selection:bg-amber-500/20">
      {demo && <DemoBanner />}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* ─── MOBILE SIDEBAR DRAWER ─── */}
        {/* Backdrop overlay */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
        {/* Drawer wrapper — slides in from the left on mobile */}
        <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:transform-none md:transition-none ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}>

          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onCompose={() => openCompose(EMPTY_COMPOSE)}
            activeMailbox={activeMailbox}
            onSelectMailbox={openMailbox}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenSmartLabelModal={() => setLabelModal("new")}
            customLabels={customLabels}
            onDeleteCustomLabel={handleDeleteCustomLabel}
            onEditCustomLabel={(label) => setLabelModal(label)}
            onChangeLabelColor={handleChangeLabelColor}
            needsReplyCount={needsReplyCount}
            unreadCount={activeMailbox === "Inbox" ? emails.filter((e) => e.isUnread).length : 0}
            onClose={() => setIsMobileSidebarOpen(false)}
          />
        </div>

        <div className="flex-1 flex overflow-hidden">
          {activeMailbox === "To-do" ? (
            <ToDoDashboard
              tasks={globalTasks}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onViewEmail={handleViewEmail}
              isScanning={isScanningTasks}
              onScan={async () => {
                if (!hasAiKey) {
                  setIsSettingsOpen(true);
                  return;
                }
                if (emails.length === 0) {
                  toast("Your inbox is still loading. Try again in a moment.");
                  return;
                }

                setIsScanningTasks(true);
                try {
                  // Pass the currently loaded emails into the batch processor
                  await extractTasksAndLabelsBatch(emails.slice(0, 30));
                } finally {
                  setIsScanningTasks(false);
                }
              }}
            />
          ) : (
            <>
              {/* The Email Feed */}
              <EmailFeed
                emails={emails}
                selectedEmail={selectedEmail}
                onSelect={handleSelectEmail}
                onRefresh={() => fetchEmails(activeMailbox, currentSearch)}
                hasMore={Boolean(nextPageToken)}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadMoreEmails}
                mailboxName={activeMailbox}
                isSyncing={isFetching}
                onOpenAi={() => setIsAiChatOpen(!isAiChatOpen)}
                onAction={handleEmailAction}
                onSearch={(searchWord) => fetchEmails(activeMailbox, searchWord)}
                customLabels={customLabels}
                onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isSidebarCollapsed={isSidebarCollapsed}
              />

              {/* The Reading Pane */}
              <ReadingPane
                selectedEmail={selectedEmail}
                getBadgeStyle={getBadgeStyle}
                onBack={() => setSelectedEmail(null)}
                onOpenAi={() => setIsAiChatOpen(true)}
                onAction={handleEmailAction}
                onUpdateEmail={handleUpdateEmail}
                onAiReply={() => handleAiReply(selectedEmail)}
                isAiThinking={isAiThinking}
                customLabels={customLabels}
                onToggleLabel={handleToggleLabel}
                onCreateLabel={() => setLabelModal("new")}
                onMarkHandled={handleMarkHandled}
                onReplyToMessage={(message, mode) => startReplyOrForward(message, mode)}
                onCreateTask={handleCreateTaskFromEmail}
                summaryPending={hasAiKey && activeMailbox === "Inbox" && !currentSearch}
              />
            </>
          )}

          {/* AI Chat Sidebar Integration */}
          <AiChat
            isOpen={isAiChatOpen}
            onClose={() => setIsAiChatOpen(false)}
            emails={emails}
            availableProviders={AI_PROVIDERS.filter((p) => savedKeys[p].saved)}
            defaultProvider={aiProvider}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>

        {/* The Settings Modal */}
        {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          savedKeys={savedKeys}
          aiProvider={aiProvider}
          onSave={async (update) => {
            try {
              const res = await fetch('/api/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(update),
              });
              const data = await res.json();
              if (!res.ok) return data.error || "Could not save your settings.";
              setSavedKeys(data.savedKeys);
              setAiProvider(data.aiProvider);
              return null;
            } catch {
              return "Could not reach the server. Check your connection.";
            }
          }}
          onDeleteData={async () => {
            try {
              const res = await fetch("/api/user", { method: "DELETE" });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) return data.error || "Could not delete your data.";
              localStorage.removeItem("mailman_cache_inbox_v2");
              await signOut({ callbackUrl: "/" });
              return null;
            } catch {
              return "Could not reach the server. Check your connection.";
            }
          }}
        />
        )}

        {isComposeOpen && (
          <ComposeModal
            key={composeKey}
            isOpen={isComposeOpen}
            onClose={() => {
              setIsComposeOpen(false);
              setDraftData(EMPTY_COMPOSE);
            }}
            defaultTo={draftData.to}
            defaultSubject={draftData.subject}
            defaultBody={draftData.body}
            replyTo={draftData.replyTo}
            quotedHtml={draftData.quotedHtml}
            draft={draftData.draft}
            onReplySent={handleMarkHandled}
            onDraftsChanged={() => {
              if (activeMailbox === "Draft") fetchEmails("Draft");
            }}
          />
        )}

        {labelModal && (
          <SmartLabelModal
            isOpen
            onClose={() => setLabelModal(null)}
            initialLabel={labelModal === "new" ? null : labelModal}
            onSave={handleSaveLabel}
          />
        )}
        {/* ─── MOBILE BOTTOM NAVIGATION BAR ─── */}
        <div className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-zinc-950 border-t border-zinc-800 flex items-center justify-around px-2 h-16">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex flex-col items-center gap-1 text-zinc-500 hover:text-amber-500 transition px-3 py-2"
          >
            <Menu size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-bold">Menu</span>
          </button>
          <button
            onClick={() => openMailbox("Inbox")}
            className={`flex flex-col items-center gap-1 transition px-3 py-2 ${activeMailbox === "Inbox" ? "text-amber-500" : "text-zinc-500"
              }`}
          >
            <Mail size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-bold">Inbox</span>
          </button>
          <button
            onClick={() => openCompose(EMPTY_COMPOSE)}
            className="flex flex-col items-center gap-1 text-zinc-500 hover:text-amber-500 transition px-3 py-2"
          >
            <Pencil size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-bold">Compose</span>
          </button>
          <button
            onClick={() => openMailbox("To-do")}
            className={`flex flex-col items-center gap-1 transition px-3 py-2 ${activeMailbox === "To-do" ? "text-amber-500" : "text-zinc-500"
              }`}
          >
            <ListTodo size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-bold">To-do</span>
          </button>
          <button
            onClick={() => setIsAiChatOpen(!isAiChatOpen)}
            className={`flex flex-col items-center gap-1 transition px-3 py-2 ${isAiChatOpen ? "text-amber-500" : "text-zinc-500"
              }`}
          >
            <Bot size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-bold">AI</span>
          </button>
        </div>

      </div>
      </div>
    );
  }

  if (status === "loading") {
    return <div className="h-screen w-screen bg-black" />;
  }

  if (!session) {
    return <LandingPage />;
  }
}