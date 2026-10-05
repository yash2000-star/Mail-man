"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import EmailFeed from "@/components/EmailFeed";
import ReadingPane from "@/components/ReadingPane";
import AiChat from "@/components/AiChat";
import ComposeModal from "@/components/ComposeModal";
import SettingsModal, { type SettingsUpdate } from "@/components/SettingsModal";
import LandingPage from "@/components/LandingPage";
import SmartLabelModal from "@/components/SmartLabelModal";
import ToDoDashboard from "@/components/ToDoDashboard";
import DemoBanner from "@/components/DemoBanner";
import MobileNav from "@/components/MobileNav";
import { useMailbox, latestMessage, loadFullMessage, mailboxParams, requestMailPage, INBOX_CACHE_KEY } from "@/hooks/useMailbox";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useTasks } from "@/hooks/useTasks";
import { useSmartLabels } from "@/hooks/useSmartLabels";
import { useNewMail } from "@/hooks/useNewMail";
import { api } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { draftCompose, EMPTY_COMPOSE, forwardCompose, replyCompose, textToHtml, type ComposeData } from "@/lib/compose";
import { AI_PROVIDERS, type AiProvider, type SavedKeys } from "@/lib/ai-providers";
import type { SmartLabel } from "@/lib/labels";
import type { Task } from "@/lib/tasks";
import type { ClientEmail, EmailAction, MailMessage } from "@/lib/mail-types";

const NO_SAVED_KEYS: SavedKeys = {
  gemini: { saved: false, hint: "" },
  openai: { saved: false, hint: "" },
  anthropic: { saved: false, hint: "" },
};

/** GET/POST /api/user */
interface UserSettings {
  savedKeys: SavedKeys;
  aiProvider: AiProvider | null;
  customLabels?: SmartLabel[];
  globalTasks?: Task[];
  needsReplyCount?: number;
}

/** Actions that move an email out of the current list. */
const MOVES: EmailAction[] = ["trash", "untrash", "archive", "unarchive", "spam", "notspam"];

/**
 * The signed-in mail client. With `demo`, it runs against the sample backend
 * in lib/demo (the /demo page) and shows a banner instead of touching Gmail.
 */
export default function MailApp({ demo = false }: { demo?: boolean }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Panels and dialogs
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Smart Label dialog: closed (null), creating ("new"), or editing a label
  const [labelModal, setLabelModal] = useState<"new" | SmartLabel | null>(null);
  // Compose: its starting content, and a key that remounts it for each new message
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState<ComposeData>(EMPTY_COMPOSE);
  const [composeKey, setComposeKey] = useState(0);

  // Account
  const [savedKeys, setSavedKeys] = useState<SavedKeys>(NO_SAVED_KEYS);
  const [aiProvider, setAiProvider] = useState<AiProvider | null>(null);
  const hasAiKey = AI_PROVIDERS.some((p) => savedKeys[p].saved);
  // Nothing renders until the AI-key check is done, so new users go straight to /setup
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  const [needsReplyCount, setNeedsReplyCount] = useState(0);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isScanningTasks, setIsScanningTasks] = useState(false);

  const tasks = useTasks();
  const mailbox = useMailbox({ demo, onInboxPage: (list) => analysis.analyze(list) });
  const analysis = useAnalysis({
    patchAllEmails: mailbox.patchAllEmails,
    onNeedsKey: () => setIsSettingsOpen(true),
    onNewlyFlagged: (count) => setNeedsReplyCount((c) => c + count),
    onTasksMayHaveChanged: () => tasks.refresh(),
  });
  const labels = useSmartLabels(mailbox, () => hasAiKey);
  const { emails, selectedEmail, activeMailbox } = mailbox;

  // --- COMPOSE ---

  const openCompose = (data: ComposeData) => {
    setComposeData(data);
    setComposeKey((k) => k + 1);
    setIsComposeOpen(true);
  };

  const startReplyOrForward = (original: MailMessage, mode: "reply" | "forward", body = "") =>
    openCompose(mode === "reply" ? replyCompose(original, body) : forwardCompose(original, body));

  /** Clicking a message in Drafts reopens it in Compose. */
  const openDraft = async (messageId: string) => {
    const result = await api<{ draftId: string; message: MailMessage }>(`/api/drafts?messageId=${encodeURIComponent(messageId)}`);
    if (!result.ok) {
      toast(result.error || "Could not open the draft.", "error");
      return;
    }
    openCompose(draftCompose(result.data.draftId, result.data.message));
  };

  // --- EMAIL ACTIONS ---

  const handleEmailAction = async (id: string, action: EmailAction) => {
    if (action === "reply" || action === "forward") {
      // Answer the newest message of the conversation, loading it if needed
      if (!selectedEmail) return;
      const original = latestMessage(selectedEmail) ?? await loadFullMessage(selectedEmail.id);
      if (original) startReplyOrForward(original, action);
      return;
    }

    const row = emails.find((e) => e.id === id) ?? (selectedEmail?.id === id ? selectedEmail : null);
    if (MOVES.includes(action)) mailbox.removeEmail(id);
    else if (action === "read" || action === "unread") mailbox.patchEmail(id, (e) => ({ ...e, isUnread: action === "unread" }));
    else if (action === "star" || action === "unstar") mailbox.patchEmail(id, (e) => ({ ...e, isStarred: action === "star" }));

    // Conversation rows change the whole thread (except stars, which are per message)
    const target = row?.messageCount && action !== "star" && action !== "unstar" ? { threadId: row.threadId } : { id };
    const result = await api("/api/action", { method: "POST", body: { ...target, action } });
    if (!result.ok) toast(result.error, "error");
  };

  const handleSelectEmail = (email: ClientEmail) => {
    if (activeMailbox === "Draft") {
      openDraft(email.id);
      return;
    }
    if (email.isUnread) handleEmailAction(email.id, "read");
    mailbox.openEmail(email);
  };

  /** Opens an email from a to-do, even if it isn't in the loaded list. */
  const handleViewEmail = async (emailId: string) => {
    if (activeMailbox === "To-do") mailbox.openMailbox("Inbox");
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
    // Drop the body so the whole conversation loads
    handleSelectEmail({ ...full, body: undefined });
  };

  const handleAiReply = async (email: ClientEmail | null) => {
    if (!email) return;
    if (!hasAiKey) {
      setIsSettingsOpen(true);
      return;
    }
    setIsAiThinking(true);
    try {
      const original = latestMessage(email) ?? await loadFullMessage(email.id);
      if (!original) {
        toast("Could not load the email.", "error");
        return;
      }
      const result = await api<{ reply: string }>("/api/ai/reply", {
        method: "POST",
        body: { emailBody: original.body || original.snippet, senderName: original.from },
      });
      if (!result.ok) {
        if (result.code === "NO_AI_KEY" || result.code === "invalid_key") setIsSettingsOpen(true);
        toast(result.error || "AI failed to generate a reply. Please try again.", "error");
        return;
      }
      if (result.data.reply) startReplyOrForward(original, "reply", textToHtml(result.data.reply));
    } finally {
      setIsAiThinking(false);
    }
  };

  /** Takes an email off the Needs Reply list (after replying, or by hand). */
  const handleMarkHandled = async (emailId: string) => {
    const wasFlagged = emails.find((e) => e.id === emailId)?.requires_reply ?? selectedEmail?.requires_reply;
    if (activeMailbox === "Needs Reply") mailbox.removeEmail(emailId);
    mailbox.patchEmail(emailId, (e) => ({ ...e, requires_reply: false }));
    if (wasFlagged) setNeedsReplyCount((c) => Math.max(0, c - 1));
    await api("/api/analysis/handled", { method: "POST", body: { emailId } });
  };

  const handleScanTasks = async () => {
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
      await analysis.extractTasksAndLabels(emails.slice(0, 30));
    } finally {
      setIsScanningTasks(false);
    }
  };

  // --- SETTINGS ---

  const handleSaveSettings = async (update: SettingsUpdate) => {
    const result = await api<UserSettings>("/api/user", { method: "POST", body: update });
    if (!result.ok) return result.error || "Could not save your settings.";
    setSavedKeys(result.data.savedKeys);
    setAiProvider(result.data.aiProvider);
    analysis.setEnabled(AI_PROVIDERS.some((p) => result.data.savedKeys[p]?.saved));
    return null;
  };

  const handleDeleteData = async () => {
    const result = await api("/api/user", { method: "DELETE" });
    if (!result.ok) return result.error || "Could not delete your data.";
    localStorage.removeItem(INBOX_CACHE_KEY);
    await signOut({ callbackUrl: "/" });
    return null;
  };

  // --- LIVE NEW MAIL ---

  const handleNewMail = async (newMessageIds: string[], reset: boolean) => {
    const viewingInbox = activeMailbox === "Inbox" && !mailbox.currentSearch;
    if (!viewingInbox) {
      if (newMessageIds.length > 0) {
        toast(newMessageIds.length === 1 ? "1 new email in your Inbox." : `${newMessageIds.length} new emails in your Inbox.`);
      }
      return;
    }
    const page = await requestMailPage(mailboxParams("Inbox", ""));
    if (!page) return;
    const added = mailbox.mergeInboxPage(page.emails);
    if (added.length > 0 && !reset) {
      toast(added.length === 1 ? `New email from ${added[0].from}` : `${added.length} new emails`);
    }
    analysis.analyze(added);
  };

  const isReady = Boolean(session) && !isCheckingKey;
  useNewMail(isReady, handleNewMail);

  // Unread count in the browser tab while the Inbox is open
  const unreadCount = activeMailbox === "Inbox" ? emails.filter((e) => e.isUnread).length : 0;
  useEffect(() => {
    if (!isReady) return;
    document.title = unreadCount > 0 ? `(${unreadCount}) Inbox · Mail-man` : `${activeMailbox} · Mail-man`;
  }, [isReady, unreadCount, activeMailbox]);

  // --- START-UP ---

  const initialized = useRef(false);
  useEffect(() => {
    if ((session as { error?: string } | null)?.error === "RefreshAccessTokenError") {
      // Google refused to refresh the token (access revoked): sign in again
      signIn("google");
      return;
    }
    if (!session || initialized.current) return;
    initialized.current = true;

    (async () => {
      const result = await api<UserSettings>("/api/user");
      if (result.ok) {
        const user = result.data;
        if (!AI_PROVIDERS.some((p) => user.savedKeys?.[p]?.saved)) {
          // New user with no AI key: onboarding first (keep the screen blank until the redirect)
          router.replace("/setup");
          return;
        }
        setSavedKeys(user.savedKeys);
        setAiProvider(user.aiProvider);
        labels.setLabels(user.customLabels ?? []);
        tasks.setTasks(user.globalTasks ?? []);
        setNeedsReplyCount(user.needsReplyCount ?? 0);
        analysis.setEnabled(true);
      } else {
        console.error("Error fetching user profile:", result.error);
      }
      setIsCheckingKey(false);
      mailbox.restoreCachedInbox();
      mailbox.fetchEmails("Inbox");
    })();
    // Runs once per sign-in; the hooks' functions are recreated each render on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (!session) {
    return status === "loading" ? <div className="h-screen w-screen bg-black" /> : <LandingPage />;
  }
  if (isCheckingKey) return <div className="h-screen w-screen bg-black" />;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden selection:bg-amber-500/20">
      {demo && <DemoBanner />}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* Mobile: the sidebar is a drawer over a backdrop */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
        )}
        <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:transform-none md:transition-none ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onCompose={() => openCompose(EMPTY_COMPOSE)}
            activeMailbox={activeMailbox}
            onSelectMailbox={mailbox.openMailbox}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenSmartLabelModal={() => setLabelModal("new")}
            customLabels={labels.labels}
            onDeleteCustomLabel={labels.remove}
            onEditCustomLabel={(label) => setLabelModal(label)}
            onChangeLabelColor={labels.changeColor}
            needsReplyCount={needsReplyCount}
            unreadCount={unreadCount}
            onClose={() => setIsMobileSidebarOpen(false)}
          />
        </div>

        <div className="flex-1 flex overflow-hidden">
          {activeMailbox === "To-do" ? (
            <ToDoDashboard
              tasks={tasks.tasks}
              onAddTask={tasks.add}
              onUpdateTask={tasks.update}
              onDeleteTask={tasks.remove}
              onViewEmail={handleViewEmail}
              isScanning={isScanningTasks}
              onScan={handleScanTasks}
            />
          ) : (
            <>
              <EmailFeed
                emails={emails}
                selectedEmail={selectedEmail}
                onSelect={handleSelectEmail}
                onRefresh={() => mailbox.fetchEmails(activeMailbox, mailbox.currentSearch)}
                hasMore={mailbox.hasMore}
                isLoadingMore={mailbox.isLoadingMore}
                onLoadMore={mailbox.loadMoreEmails}
                mailboxName={activeMailbox}
                isSyncing={mailbox.isFetching}
                onOpenAi={() => setIsAiChatOpen(!isAiChatOpen)}
                onAction={handleEmailAction}
                onSearch={(query) => mailbox.fetchEmails(activeMailbox, query)}
                customLabels={labels.labels}
                onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isSidebarCollapsed={isSidebarCollapsed}
              />
              <ReadingPane
                selectedEmail={selectedEmail}
                onBack={() => mailbox.setSelectedEmail(null)}
                onAction={handleEmailAction}
                onAiReply={() => handleAiReply(selectedEmail)}
                isAiThinking={isAiThinking}
                customLabels={labels.labels}
                onToggleLabel={labels.toggle}
                onCreateLabel={() => setLabelModal("new")}
                onMarkHandled={handleMarkHandled}
                onReplyToMessage={startReplyOrForward}
                onCreateTask={tasks.addFromEmail}
                summaryPending={hasAiKey && activeMailbox === "Inbox" && !mailbox.currentSearch}
              />
            </>
          )}

          <AiChat
            isOpen={isAiChatOpen}
            onClose={() => setIsAiChatOpen(false)}
            emails={emails}
            availableProviders={AI_PROVIDERS.filter((p) => savedKeys[p].saved)}
            defaultProvider={aiProvider}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>

        {isSettingsOpen && (
          <SettingsModal
            isOpen
            onClose={() => setIsSettingsOpen(false)}
            savedKeys={savedKeys}
            aiProvider={aiProvider}
            onSave={handleSaveSettings}
            onDeleteData={handleDeleteData}
          />
        )}

        {isComposeOpen && (
          <ComposeModal
            key={composeKey}
            isOpen
            onClose={() => {
              setIsComposeOpen(false);
              setComposeData(EMPTY_COMPOSE);
            }}
            defaultTo={composeData.to}
            defaultSubject={composeData.subject}
            defaultBody={composeData.body}
            replyTo={composeData.replyTo}
            quotedHtml={composeData.quotedHtml}
            draft={composeData.draft}
            onReplySent={handleMarkHandled}
            onDraftsChanged={() => {
              if (activeMailbox === "Draft") mailbox.fetchEmails("Draft");
            }}
          />
        )}

        {labelModal && (
          <SmartLabelModal
            isOpen
            onClose={() => setLabelModal(null)}
            initialLabel={labelModal === "new" ? null : labelModal}
            onSave={(label, { applyRetroactively }) => labels.save(label, labelModal === "new" ? null : labelModal, applyRetroactively)}
          />
        )}

        <MobileNav
          activeMailbox={activeMailbox}
          isAiChatOpen={isAiChatOpen}
          onOpenMenu={() => setIsMobileSidebarOpen(true)}
          onOpenMailbox={mailbox.openMailbox}
          onCompose={() => openCompose(EMPTY_COMPOSE)}
          onToggleAi={() => setIsAiChatOpen(!isAiChatOpen)}
        />
      </div>
    </div>
  );
}
