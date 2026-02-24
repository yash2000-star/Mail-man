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
import { useState, useEffect } from "react";
import {
  Sparkles,
  Search,
  Shield,
  Bot,
  Check,
  Key,
  Settings,
  Mail,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // The memory for the right-hand reading pane!
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [activeMailbox, setActiveMailbox] = useState("Inbox");
  const [draftData, setDraftData] = useState({ to: "", subject: "", body: "" });
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSmartLabelModalOpen, setIsSmartLabelModalOpen] = useState(false);
  const [globalTasks, setGlobalTasks] = useState<any[]>([]);
  const [customLabels, setCustomLabels] = useState<any[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  //Find a specific header from the list
  const getHeader = (headers: any[], name: string) => {
    if (!headers) return "";
    const header = headers.find(
      (h) => h.name.toLowerCase() === name.toLowerCase(),
    );
    return header ? header.value : "";
  };

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

  const decodeBase64 = (data: string) => {
    if (!data) return "";
    try {
      // Clean Google Url safe characters
      const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
      // gibberish into text
      return decodeURIComponent(escape(window.atob(base64)));
    } catch (e) {
      return "Error decoding email.";
    }
  };

  // find Actual message
  const getEmailBody = (payload: any): string => {
    if (!payload) return "";

    // Simple email
    if (payload.body && payload.body.data) {
      return decodeBase64(payload.body.data);
    }

    // Complex email
    if (payload.parts && payload.parts.length > 0) {
      let htmlPart = payload.parts.find(
        (part: any) => part.mimeType === "text/html",
      );
      if (htmlPart?.body?.data) return decodeBase64(htmlPart.body.data);

      // No html
      let textPart = payload.parts.find(
        (parts: any) => parts.mimeType === "text/plain",
      );
      if (textPart?.body?.data) return decodeBase64(textPart.body.data);

      // Recursion inside another folder
      for (const part of payload.parts) {
        if (part.mimeType.startsWith("multipart/")) {
          const nestedBody = getEmailBody(part);
          if (nestedBody) return nestedBody;
        }
      }
    }
    return "No readable content found.";
  };

  const fetchEmails = async (
    mailboxToFetch = activeMailbox,
    searchString = "",
  ) => {
    // Safety Check
    if (!(session as any)?.accessToken) return;
    setIsFetching(true);

    let query = "in:inbox";
    if (mailboxToFetch === "Starred") query = "is:starred";
    if (mailboxToFetch === "Sent") query = "in:sent";
    if (mailboxToFetch === "Draft") query = "is:draft";
    if (mailboxToFetch === "Spam") query = "in:spam";
    if (mailboxToFetch === "Trash") query = "in:trash";
    if (mailboxToFetch === "Conversation History")
      query = 'label:"Conversation History"';
    if (mailboxToFetch === "GMass Auto Followup")
      query = 'label:"GMass Auto Followup"';
    if (mailboxToFetch === "GMass Reports") query = 'label:"GMass Reports"';
    if (mailboxToFetch === "GMass Scheduled") query = 'label:"GMass Scheduled"';

    // GLOBAL SEARCH ENGINe
    if (searchString.trim() !== "") {
      query += ` ${searchString}`;
    }

    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=30&q=${encodeURIComponent(query)}`;

    // Knock on Google's door
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${(session as any).accessToken}` },
    });

    const data = await response.json();

    if (data.messages) {
      const detailedEmails = await Promise.all(
        data.messages.map(async (msg: any) => {
          const res = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
            {
              headers: {
                Authorization: `Bearer ${(session as any).accessToken}`,
              },
            },
          );
          return await res.json();
        }),
      );

      const cleanEmails = detailedEmails
        .filter((msg: any) => msg && msg.payload && msg.payload.headers)
        .map((msg: any) => ({
          id: msg.id,
          snippet: msg.snippet,
          subject: getHeader(msg.payload.headers, "Subject"),
          from: getHeader(msg.payload.headers, "From").split("<")[0].trim(),
          date: getHeader(msg.payload.headers, "Date"),
          body: getEmailBody(msg.payload),
          isUnread: msg.labelIds?.includes("UNREAD") || false,
          isStarred: msg.labelIds?.includes("STARRED") || false,
          to: getHeader(msg.payload.headers, "To"),
          cc: getHeader(msg.payload.headers, "Cc"),
          hasAttachment:
            msg.payload.parts?.some(
              (part: any) => part.filename && part.filename.length > 0,
            ) || false,
        }));

      // 1. Show emails on screen immediately
      setEmails(cleanEmails);
      setIsFetching(false);

      // 2. BATCH AUTO-PILOT ENGAGE
      const apiKey = localStorage.getItem("gemini_api_key");
      if (apiKey) {
        await classifyEmailsBatch(cleanEmails, apiKey);
        await extractTasksAndLabelsBatch(cleanEmails, apiKey);
      }
    }
  };

  // --- ⚡ UPGRADED SAFETY BATCH PROCESSING ---

  const classifyEmailsBatch = async (allEmails: any[], apiKey: string) => {
    if (!apiKey) return;

    // Split 30 emails into smaller chunks of 10 to avoid 429 errors
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
          body: JSON.stringify({ emails: payload, apiKey }),
        });

        if (response.status === 429) {
          console.error("Rate limit hit, skipping this chunk...");
          continue;
        }

        const results = await response.json();
        if (Array.isArray(results)) {
          updateEmailStateWithAiData(results);
        }

        // Wait 2 seconds between chunks to let the API "breathe"
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error("Batch chunk failed:", error);
      }
    }
  };

  // Helper to keep the code clean
  const updateEmailStateWithAiData = (results: any[]) => {
    setEmails((prev) => {
      const updated = prev.map((email) => {
        const match = results.find((r: any) => r.id === email.id);
        return match ? { ...email, ...match } : email;
      });
      // Refresh reading pane if active
      if (selectedEmail) {
        const current = updated.find(e => e.id === selectedEmail.id);
        if (current) setSelectedEmail(current);
      }
      return updated;
    });
  };

  const extractTasksAndLabelsBatch = async (emailList: any[], apiKey: string) => {
    try {
      const response = await fetch("/api/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emailList.map(e => ({
            id: e.id,
            sender: e.from,
            content: `Subject: ${e.subject}\n\n${e.body.substring(0, 1000)}`
          })),
          apiKey: apiKey,
          customLabels: customLabels
        }),
      });

      if (!response.ok) {
        console.error(`Batch Tasks API failed with status: ${response.status}`);
        return;
      }

      const results = await response.json();

      if (Array.isArray(results)) {
        // 1. Update emails with applied labels
        setEmails((prevEmails) => {
          const updatedEmails = prevEmails.map((email) => {
            const result = results.find((r: any) => r.id === email.id);
            return result ? { ...email, appliedLabels: result.appliedLabels } : email;
          });

          // Refresh selectedEmail if it was part of this batch
          if (selectedEmail) {
            const updatedSelected = updatedEmails.find(e => e.id === selectedEmail.id);
            if (updatedSelected) {
              setSelectedEmail(updatedSelected);
            }
          }
          return updatedEmails;
        });

        // 2. Update Global Tasks
        const allNewTasks: any[] = [];
        results.forEach((result: any) => {
          if (result.tasks && result.tasks.length > 0) {
            result.tasks.forEach((task: any) => {
              allNewTasks.push({
                id: Math.random().toString(36).substr(2, 9),
                emailId: result.id,
                title: task.title,
                date: task.date,
                isUrgent: task.isUrgent,
                isPastDue: task.isPastDue,
                status: "active"
              });
            });
          }
        });
        setGlobalTasks((prev) => [...prev, ...allNewTasks]);
      }
    } catch (error) {
      console.error("Failed to extract batch tasks:", error);
    }
  };

  const classifyEmail = async (id: string, snippet: string) => {
    // Keep this for individual refreshes if needed, but the main loop is gone.
    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) return;
    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: [{ id, snippet, sender: "Unknown" }],
          apiKey
        }),
      });
      const results = await response.json();
      const result = results?.[0];

      setEmails((prevEmails) => {
        const updatedEmails = prevEmails.map((email) =>
          email.id === id
            ? {
              ...email,
              category: result.category,
              summary: result.summary,
              requires_reply: result.requires_reply,
              draft_reply: result.draft_reply,
            }
            : email,
        );

        // If the currently selected email just got an AI update, refresh it in the reading pane too!
        if (selectedEmail?.id === id) {
          setSelectedEmail(updatedEmails.find((e) => e.id === id));
        }
        return updatedEmails;
      });
    } catch (error) {
      console.error("Failed to classify:", error);
    }
  };

  const extractTasksAndLabels = async (email: any) => {
    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) return;

    try {
      const senderName = email.from.split("<")[0].replace(/"/g, "").trim();

      const response = await fetch("/api/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: [{
            id: email.id,
            sender: senderName,
            content: `Subject: ${email.subject}\n\n${email.body.substring(0, 1000)}`
          }],
          apiKey: apiKey,
          customLabels: customLabels
        }),
      });

      if (!response.ok) {
        console.error(`Tasks API failed with status: ${response.status}`);
        return; // Stop here before it tries to parse HTML!
      }

      const results = await response.json();
      const result = results?.[0];

      if (!result) return;

      // 1. Save Tasks to the Global Dashboard
      if (result.tasks && result.tasks.length > 0) {
        setGlobalTasks((prevTasks) => {
          const newTasks = result.tasks.map((task: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            emailId: email.id,
            title: task.title,
            date: task.date,
            isUrgent: task.isUrgent,
            isPastDue: task.isPastDue,
            status: "active"
          }));
          return [...prevTasks, ...newTasks];
        });
      }

      // 2. Add labels quietly to the email
      if (result.appliedLabels && result.appliedLabels.length > 0) {
        setEmails((prevEmails) =>
          prevEmails.map((e) => e.id === email.id ? { ...e, appliedLabels: result.appliedLabels } : e)
        );
      }

    } catch (error) {
      console.error("Failed to extract tasks:", error);
    }
  };


  // Quick action
  const handleEmailAction = async (id: string, action: string) => {
    if (action === "trash" || action === "archive" || action === "unarchive") {
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
    } else if (action === "reply") {
      if (selectedEmail) {
        const senderEmail = selectedEmail.from.match(/<(.*)>/)?.[1] || selectedEmail.from;
        setDraftData({
          to: senderEmail,
          subject: selectedEmail.subject?.startsWith("Re:") ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
          body: `\n\n\n\n--- On ${selectedEmail.date}, ${selectedEmail.from} wrote:\n> ${selectedEmail.body.replace(/<[^>]+>/g, '')}`, // Basic text fallback
        });
        setIsComposeOpen(true);
      }
      return; // Stop execution here, don't hit /api/action
    } else if (action === "forward") {
      if (selectedEmail) {
        setDraftData({
          to: "",
          subject: selectedEmail.subject?.startsWith("Fwd:") ? selectedEmail.subject : `Fwd: ${selectedEmail.subject}`,
          body: `\n\n\n\n--- Forwarded message ---\nFrom: ${selectedEmail.from}\nDate: ${selectedEmail.date}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body.replace(/<[^>]+>/g, '')}`, // Basic text fallback
        });
        setIsComposeOpen(true);
      }
      return; // Stop execution here
    }

    try {
      await fetch("/api/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(session as any).accessToken}`,
        },
        body: JSON.stringify({ id, action }),
      });
    } catch (error) {
      console.error(`Failed to ${action} email:`, error);
    }
  };

  // THE AI AUTO-REPLY ENGINE
  const handleAiReply = async (email: any) => {
    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) {
      alert(
        "⚠️ Please click the Gear icon in the bottom left to add your Gemini API Key first!",
      );
      return;
    }
    setIsAiThinking(true);

    try {
      const senderName = email.from.split("<")[0].replace(/"/g, "").trim();
      const senderEmail = email.from.match(/<(.*)>/)?.[1] || email.from;

      const response = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailBody: email.body,
          senderName,
          apiKey: apiKey,
        }),
      });

      const data = await response.json();

      if (data.reply) {
        setDraftData({
          to: senderEmail,
          subject: `Re: ${email.subject.replace(/^(Re:\s*)+/i, "")}`,
          body: data.reply,
        });

        setIsComposeOpen(true);
      }
    } catch (error) {
      console.error("AI Reply failed:", error);
      alert("AI failed to generate a reply. Please try again.");
    } finally {
      setIsAiThinking(false);
    }
  };

  // --- TO-DO DASHBOARD HANDLERS ---
  const handleToggleTask = (taskId: string) => {
    setGlobalTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, status: task.status === "active" ? "done" : "active" }
          : task
      )
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setGlobalTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const handleViewEmail = (emailId: string) => {
    const emailToView = emails.find((e) => e.id === emailId);
    if (emailToView) {
      setSelectedEmail(emailToView);
      setActiveMailbox("Inbox"); // Switch away from Dashboard to see the email!
    }
  };

  // --- NEW: SMART LABEL HANDLERS ---
  const handleDeleteCustomLabel = (labelName: string) => {
    // 1. Remove the label from our array
    setCustomLabels((prev) => prev.filter((label) => label.name !== labelName));

    // 2. If the user was currently looking at that label's folder, kick them back to Inbox
    if (activeMailbox === labelName) {
      setActiveMailbox("Inbox");
      fetchEmails("Inbox");
    }
  };
  // -------------------------------------

  useEffect(() => {
    if ((session as any)?.accessToken && emails.length === 0 && !isFetching) {
      fetchEmails();
    }
  }, [session, emails.length]);

  if (session) {
    return (
      //  Locks the screen height
      <div className="flex h-screen bg-[#f8f9fa] text-gray-900 font-sans overflow-hidden selection:bg-blue-500/20 relative">

        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onCompose={() => setIsComposeOpen(true)}
          activeMailbox={activeMailbox}
          onSelectMailbox={(folderName) => {
            setActiveMailbox(folderName);
            setSelectedEmail(null);
            setEmails([]);
            fetchEmails(folderName);
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenSmartLabelModal={() => setIsSmartLabelModalOpen(true)}
          customLabels={customLabels}
          onDeleteCustomLabel={handleDeleteCustomLabel} // <-- THIS WIRE MAKES IT WORK!
        />

        <div className="flex-1 flex overflow-hidden">
          {activeMailbox === "To-do" ? (
            <ToDoDashboard
              tasks={globalTasks}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onViewEmail={handleViewEmail}
            />
          ) : (
            <>
              {/* The Email Feed */}
              <EmailFeed
                emails={emails}
                selectedEmail={selectedEmail}
                onSelect={setSelectedEmail}
                onRefresh={fetchEmails}
                isSyncing={isFetching}
                onOpenAi={() => setIsAiChatOpen(true)}
                onAction={handleEmailAction}
                onSearch={(searchWord) => fetchEmails(activeMailbox, searchWord)}
                customLabels={customLabels}
                onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />

              {/* The Reading Pane */}
              <ReadingPane
                selectedEmail={selectedEmail}
                getBadgeStyle={getBadgeStyle}
                onBack={() => setSelectedEmail(null)}
                onOpenAi={() => setIsAiChatOpen(true)}
                onAction={handleEmailAction}
                onAiReply={() => handleAiReply(selectedEmail)}
                isAiThinking={isAiThinking}
              />
            </>
          )}
        </div>

        {/* The Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

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
          />
        )}

        {!isAiChatOpen && (
          <button
            onClick={() => setIsAiChatOpen(true)}
            className="fixed bottom-6 right-6 z-50 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-105 group border border-blue-400/30"
            title="Ask AI"
          >
            <Sparkles
              size={24}
              className="group-hover:animate-pulse text-white"
            />
          </button>
        )}

        <AiChat
          isOpen={isAiChatOpen}
          onClose={() => setIsAiChatOpen(false)}
          emails={emails}
        />

        {/* Smart Label Modal */}
        <SmartLabelModal
          isOpen={isSmartLabelModalOpen}
          onClose={() => setIsSmartLabelModalOpen(false)}
          onAddLabel={(newLabel) => {
            // Save the custom label to our state! The background AI will now use this rule.
            setCustomLabels((prev) => [...prev, newLabel]);
            alert(`Success! "${newLabel.name}" saved. Mail-Man will now scan incoming emails against this rule.`);
          }}
        />
      </div>
    );
  }

  if (!session) {
    return <LandingPage />;
  }
}