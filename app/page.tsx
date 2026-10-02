"use client";

import Sidebar from "@/components/Sidebar";
import EmailFeed from "@/components/EmailFeed";
import ReadingPane from "@/components/ReadingPane";
import AiChat from "@/components/AiChat";
import ComposeModal from "@/components/ComposeModal";
import SettingsModal from "@/components/SettingsModal";
import LandingPage from "@/components/LandingPage";
import SmartLabelModal from "@/components/SmartLabelModal";
import ToDoDashboard from "@/components/ToDoDashboard";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { AI_PROVIDERS, AiProvider, SavedKeys } from "@/lib/ai-providers";
import { isFolder, type MailAnalysis, type MailItem, type MailMessage, type MailPage } from "@/lib/mail-types";
import {
  Bot, Mail, Menu, ListTodo, Pencil
} from "lucide-react";

const NO_SAVED_KEYS: SavedKeys = {
  gemini: { saved: false, hint: "" },
  openai: { saved: false, hint: "" },
  anthropic: { saved: false, hint: "" },
};

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

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emails, setEmails] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // The memory for the right-hand reading pane!
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [activeMailbox, setActiveMailbox] = useState("Inbox");
  const [draftData, setDraftData] = useState<{
    to: string;
    subject: string;
    body: string;
    replyTo?: { threadId: string; messageId: string; references: string };
  }>({ to: "", subject: "", body: "" });
  // Paging and search for the current mailbox
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentSearch, setCurrentSearch] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSmartLabelModalOpen, setIsSmartLabelModalOpen] = useState(false);
  const [globalTasks, setGlobalTasks] = useState<any[]>([]);
  const [customLabels, setCustomLabels] = useState<any[]>([]);
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
    const params = new URLSearchParams(isFolder(mailbox) ? { folder: mailbox } : { label: mailbox });
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
        try {
          localStorage.setItem("mailman_cache_inbox_v2", JSON.stringify(page.emails));
        } catch {
          // storage full or blocked: the cache is only a speed-up
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

  const handleSelectEmail = async (email: any) => {
    setSelectedEmail(email);
    if (email.isUnread) handleEmailAction(email.id, "read");
    if (email.body !== undefined) return;

    const full = await loadFullMessage(email.id);
    if (!full) return;
    // Keep AI results we already have in memory
    const merged = { ...full, ...pickAnalysis(email), isUnread: false };
    setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, ...merged } : e)));
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
  const startReplyOrForward = (original: MailMessage, mode: "reply" | "forward", body = "") => {
    const baseSubject = (original.subject || "").replace(/^((re|fwd?):\s*)+/i, "");
    if (mode === "reply") {
      setDraftData({
        to: original.fromEmail || original.from,
        subject: `Re: ${baseSubject}`,
        body,
        replyTo: { threadId: original.threadId, messageId: original.messageId, references: original.references },
      });
    } else {
      const originalBody = original.bodyIsHtml
        ? original.body
        : `<div style="white-space:pre-wrap">${escapeHtml(original.body || "")}</div>`;
      setDraftData({
        to: "",
        subject: `Fwd: ${baseSubject}`,
        body: `<p><br></p><p>---------- Forwarded message ----------</p>`
          + `<p>From: ${escapeHtml(original.from)} &lt;${escapeHtml(original.fromEmail)}&gt;<br>`
          + `Date: ${escapeHtml(original.date)}<br>Subject: ${escapeHtml(original.subject)}<br>To: ${escapeHtml(original.to)}</p>`
          + originalBody,
      });
    }
    setIsComposeOpen(true);
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
        // Make sure we have the body and reply headers before composing
        const original = selectedEmail.body !== undefined ? selectedEmail : await loadFullMessage(selectedEmail.id);
        if (original) startReplyOrForward(original, action);
      }
      return; // compose only, nothing to change in Gmail yet
    }

    try {
      const response = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
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
      const original: MailMessage | null = email.body !== undefined ? email : await loadFullMessage(email.id);
      if (!original) throw new Error("Could not load the email.");

      const response = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailBody: original.body || original.snippet, senderName: original.from }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.code === "NO_AI_KEY" || data.code === "invalid_key") setIsSettingsOpen(true);
        alert(data.error || "AI failed to generate a reply. Please try again.");
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
      alert("AI failed to generate a reply. Please try again.");
    } finally {
      setIsAiThinking(false);
    }
  };

  // --- TO-DO DASHBOARD HANDLERS ---
  const handleToggleTask = async (taskId: string) => {
    const updatedTasks = globalTasks.map((task) =>
      task.id === taskId
        ? { ...task, status: task.status === "active" ? "done" : "active" }
        : task
    );
    setGlobalTasks(updatedTasks);

    try {
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalTasks: updatedTasks }),
      });
    } catch (e) {
      console.error("Failed to sync task toggle", e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const updatedTasks = globalTasks.filter((task) => task.id !== taskId);
    setGlobalTasks(updatedTasks);

    try {
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalTasks: updatedTasks }),
      });
    } catch (e) {
      console.error("Failed to sync task deletion", e);
    }
  };

  /** Opens the email a task came from, even if it isn't in the current list. */
  const handleViewEmail = async (emailId: string) => {
    if (activeMailbox === "To-do") openMailbox("Inbox");
    const inList = emails.find((e) => e.id === emailId);
    if (inList) {
      handleSelectEmail(inList);
      return;
    }
    const full = await loadFullMessage(emailId);
    if (full) setSelectedEmail(full);
    else alert("That email is no longer in your mailbox.");
  };


  // --- NEW: SMART LABEL HANDLERS ---
  const handleDeleteCustomLabel = async (labelName: string) => {
    // 1. Remove the label from our array
    const updatedLabels = customLabels.filter((label) => label.name !== labelName);
    setCustomLabels(updatedLabels);

    // 2. Sync deletion to MongoDB
    try {
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customLabels: updatedLabels }),
      });
    } catch (e) { console.error("Could not sync label deletion", e); }

    // 3. Kick to Inbox if looking at the deleted label
    if (activeMailbox === labelName) {
      setActiveMailbox("Inbox");
      fetchEmails("Inbox");
    }
  };
  // -------------------------------------

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
            if (userData.globalTasks) setGlobalTasks(userData.globalTasks);
          }
        } catch (e) {
          console.error("Error fetching user profile:", e);
        }

        // Key check is done — safe to reveal the dashboard
        setIsCheckingKey(false);

        // 2. Load the super-fast UI cached emails
        const cached = localStorage.getItem("mailman_cache_inbox_v2");
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
      <div className={`flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden selection:bg-amber-500/20 relative`}>

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
            onCompose={() => setIsComposeOpen(true)}
            activeMailbox={activeMailbox}
            onSelectMailbox={openMailbox}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenSmartLabelModal={() => setIsSmartLabelModalOpen(true)}
            customLabels={customLabels}
            onDeleteCustomLabel={handleDeleteCustomLabel}
            unreadCount={activeMailbox === "Inbox" ? emails.filter((e) => e.isUnread).length : 0}
            onClose={() => setIsMobileSidebarOpen(false)}
          />
        </div>

        <div className="flex-1 flex overflow-hidden">
          {activeMailbox === "To-do" ? (
            <ToDoDashboard
              tasks={globalTasks}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onViewEmail={handleViewEmail}
              isScanning={isScanningTasks}
              onScan={async () => {
                if (!hasAiKey) {
                  setIsSettingsOpen(true);
                  return;
                }
                if (emails.length === 0) {
                  alert("Inbox is currently empty. Fetching emails might still be in progress.");
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
        />
        )}

        {isComposeOpen && (
          <ComposeModal
            isOpen={isComposeOpen}
            onClose={() => {
              setIsComposeOpen(false);
              setDraftData({ to: "", subject: "", body: "" });
            }}
            defaultTo={draftData.to}
            defaultSubject={draftData.subject}
            defaultBody={draftData.body}
            replyTo={draftData.replyTo}
          />
        )}

        <SmartLabelModal
          isOpen={isSmartLabelModalOpen}
          onClose={() => setIsSmartLabelModalOpen(false)}
          onAddLabel={async (newLabel) => {
            const updatedLabels = [...customLabels, newLabel];
            setCustomLabels(updatedLabels);

            try {
              await fetch('/api/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customLabels: updatedLabels }),
              });

              if (newLabel.applyRetroactively && hasAiKey && emails.length > 0) {
                const emailsToProcess = emails.slice(0, 50);
                alert(`Success! "${newLabel.name}" saved. Mail-man is now retroactively scanning your last 50 emails...`);
                // Use the existing batch processor to scan the slice
                extractTasksAndLabelsBatch(emailsToProcess);
              } else {
                alert(`Success! "${newLabel.name}" safely stored. Mail-man will now automatically scan new incoming emails.`);
              }
            } catch (e) {
              console.error("Failed to sync new label", e);
            }
          }}
        />
        {/* ─── MOBILE BOTTOM NAVIGATION BAR ─── */}
        <div className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex items-center justify-around px-2 h-16 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex flex-col items-center gap-1 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition px-3 py-2"
          >
            <Menu size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-bold">Menu</span>
          </button>
          <button
            onClick={() => openMailbox("Inbox")}
            className={`flex flex-col items-center gap-1 transition px-3 py-2 ${activeMailbox === "Inbox" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-400"
              }`}
          >
            <Mail size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-bold">Inbox</span>
          </button>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex flex-col items-center gap-1 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition px-3 py-2"
          >
            <Pencil size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-bold">Compose</span>
          </button>
          <button
            onClick={() => openMailbox("To-do")}
            className={`flex flex-col items-center gap-1 transition px-3 py-2 ${activeMailbox === "To-do" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-400"
              }`}
          >
            <ListTodo size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-bold">To-do</span>
          </button>
          <button
            onClick={() => setIsAiChatOpen(!isAiChatOpen)}
            className={`flex flex-col items-center gap-1 transition px-3 py-2 ${isAiChatOpen ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-400"
              }`}
          >
            <Bot size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-bold">AI</span>
          </button>
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