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
  Menu,
  X,
  ListTodo,
  Pencil,
} from "lucide-react";

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
  const [draftData, setDraftData] = useState({ to: "", subject: "", body: "" });
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSmartLabelModalOpen, setIsSmartLabelModalOpen] = useState(false);
  const [globalTasks, setGlobalTasks] = useState<any[]>([]);
  const [customLabels, setCustomLabels] = useState<any[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [openAiApiKey, setOpenAiApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [isScanningTasks, setIsScanningTasks] = useState(false);
  // Prevents flash of dashboard before the API-key check completes
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  // Find a specific header from the list
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
    overrideApiKey?: string
  ) => {
    // Safety Check
    if (!(session as any)?.accessToken) return;
    setIsFetching(true);

    try {
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

      if (!response.ok) {
        console.error("Failed to fetch messages. Status:", response.status);
        setIsFetching(false);
        return;
      }

      const data = await response.json();

      if (data.messages && data.messages.length > 0) {
        const detailedEmails = await Promise.all(
          data.messages.map(async (msg: any) => {
            try {
              const res = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
                {
                  headers: {
                    Authorization: `Bearer ${(session as any).accessToken}`,
                  },
                },
              );
              if (!res.ok) return null;
              return await res.json();
            } catch (err) {
              console.error("Error fetching message detail:", err);
              return null;
            }
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

        // Immediately cache the fetched inbox emails so the NEXT time the user logs in, it loads instantly!
        try {
          if (mailboxToFetch === "Inbox") {
            localStorage.setItem("ezee_mail_cache_Inbox", JSON.stringify(cleanEmails));
          }
        } catch (e) {
          console.error("Could not cache to local storage", e);
        }

        // 2. BATCH AUTO-PILOT ENGAGE
        const currentApiKey = overrideApiKey || geminiApiKey;
        if (currentApiKey) {
          await classifyEmailsBatch(cleanEmails, currentApiKey);
          await extractTasksAndLabelsBatch(cleanEmails, currentApiKey);
        }
      } else {
        setIsFetching(false);
        // Only clear emails if we are sure there are absolutely 0 emails returned
        if (searchString || mailboxToFetch !== "Inbox") {
          setEmails([]);
        }
      }
    } catch (error) {
      console.error("Error in fetchEmails:", error);
      setIsFetching(false);
    }
  };

  // --- ⚡ UPGRADED SAFETY BATCH PROCESSING ---

  const classifyEmailsBatch = async (allEmails: any[], apiKey: string) => {
    if (!apiKey) {
      // No key — open the settings modal so the user can add one
      setIsSettingsOpen(true);
      return;
    }

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
          body: JSON.stringify({ emails: payload, apiKey }),
        });

        if (response.status === 429) {
          console.error("Rate limit hit! Injecting failure states into UI.");
          // Inject a failure state so the UI stops spinning
          const failedResults = payload.map(e => ({
            id: e.id,
            category: "Limit Reached",
            summary: "Gemini API rate limit exceeded. Please try again later or add a paid API key.",
            requires_reply: false,
            draft_reply: ""
          }));
          updateEmailStateWithAiData(failedResults);
          continue;
        }

        const results = await response.json();

        // Handle explicit backend errors (timeout, invalid key, etc.)
        if (results.error) {
          console.error("Backend Error:", results.error);
          const isTimeout = results.error.toLowerCase().includes("timed out") || results.error.toLowerCase().includes("timeout");
          const errorResults = payload.map(e => ({
            id: e.id,
            category: "Error",
            summary: isTimeout
              ? "Summary unavailable (Timeout — server was busy, try refreshing)"
              : `Summary unavailable (${results.error})`,
            requires_reply: false,
            draft_reply: ""
          }));
          updateEmailStateWithAiData(errorResults);
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

  const classifyEmail = async (id: string, snippet: string) => {
    // Keep this for individual refreshes if needed, but the main loop is gone.
    if (!geminiApiKey) return;
    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: [{ id, snippet, sender: "Unknown" }],
          apiKey: geminiApiKey
        }),
      });
      const results = await response.json();
      const result = results?.[0];

      setEmails((prevEmails) => {
        return prevEmails.map((email) =>
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
      });

      // If the currently selected email just got an AI update, refresh it in the reading pane using updater!
      setSelectedEmail((prevSelected: any) => {
        if (prevSelected?.id === id) {
          return {
            ...prevSelected,
            category: result.category,
            summary: result.summary,
            requires_reply: result.requires_reply,
            draft_reply: result.draft_reply,
          };
        }
        return prevSelected;
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

      // 1. Sync Global Tasks directly from MongoDB to capture the real Database IDs!
      try {
        const userRes = await fetch('/api/user');
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.globalTasks) setGlobalTasks(userData.globalTasks);
        }
      } catch (e) {
        console.error("Failed to sync DB tasks", e);
      }

      // 2. Add labels quietly to the email
      if (result.appliedLabels && result.appliedLabels.length > 0) {
        setEmails((prevEmails) =>
          prevEmails.map((e) => e.id === email.id ? { ...e, appliedLabels: result.appliedLabels } : e)
        );

        setSelectedEmail((prevSelected: any) => {
          if (prevSelected?.id === email.id) {
            return { ...prevSelected, appliedLabels: result.appliedLabels };
          }
          return prevSelected;
        });
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
          body: "",
        });
        setIsComposeOpen(true);
      }
      return; // Stop execution here, don't hit /api/action
    } else if (action === "forward") {
      if (selectedEmail) {
        setDraftData({
          to: "",
          subject: selectedEmail.subject?.startsWith("Fwd:") ? selectedEmail.subject : `Fwd: ${selectedEmail.subject}`,
          body: "",
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
    if (!geminiApiKey) {
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
          apiKey: geminiApiKey,
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

  const handleViewEmail = (emailId: string) => {
    const emailToView = emails.find((e) => e.id === emailId);
    if (emailToView) {
      setSelectedEmail(emailToView);
      setActiveMailbox("Inbox"); // Switch away from Dashboard to see the email!
    }
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
      if ((session as any)?.accessToken && !initializationRef.current) {
        initializationRef.current = true;

        // 1. Fetch User Data from MongoDB First!
        let fetchedApiKey = "";
        try {
          const res = await fetch('/api/user');
          if (res.ok) {
            const userData = await res.json();
            if (userData.geminiApiKey) {
              setGeminiApiKey(userData.geminiApiKey);
              fetchedApiKey = userData.geminiApiKey;
            } else {
              // New user with no API key — send to the onboarding setup page
              router.replace("/setup");
              return; // keep isCheckingKey=true so nothing flashes before redirect
            }
            if (userData.openAiApiKey) setOpenAiApiKey(userData.openAiApiKey);
            if (userData.anthropicApiKey) setAnthropicApiKey(userData.anthropicApiKey);
            if (userData.customLabels) setCustomLabels(userData.customLabels);
            if (userData.globalTasks) setGlobalTasks(userData.globalTasks);
          }
        } catch (e) {
          console.error("Error fetching user profile:", e);
        }

        // Key check is done — safe to reveal the dashboard
        setIsCheckingKey(false);

        // 2. Load the super-fast UI cached emails
        const cached = localStorage.getItem("ezee_mail_cache_Inbox");
        if (cached) {
          try {
            setEmails(JSON.parse(cached));
          } catch (e) {
            console.error("Failed to parse cached emails", e);
          }
        }

        // 3. Perform a silent background fetch to sync any new emails (Supply key explicitly to dodge stale closures)
        fetchEmails(undefined, undefined, fetchedApiKey);
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
            onSelectMailbox={(folderName) => {
              setActiveMailbox(folderName);
              setSelectedEmail(null);
              setEmails([]);
              fetchEmails(folderName);
            }}
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
                if (!geminiApiKey) {
                  alert("⚠️ Please add your Gemini API Key in Settings first.");
                  return;
                }
                if (emails.length === 0) {
                  alert("Inbox is currently empty. Fetching emails might still be in progress.");
                  return;
                }

                setIsScanningTasks(true);
                try {
                  // Pass the currently loaded emails into the batch processor
                  await extractTasksAndLabelsBatch(emails.slice(0, 30), geminiApiKey);
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
                onSelect={setSelectedEmail}
                onRefresh={fetchEmails}
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
            apiKeys={{ gemini: geminiApiKey, openai: openAiApiKey, anthropic: anthropicApiKey }}
          />
        </div>

        {/* The Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          initialKeys={{ gemini: geminiApiKey, openai: openAiApiKey, anthropic: anthropicApiKey }}
          onSaveDb={async (keys) => {
            setGeminiApiKey(keys.geminiApiKey);
            setOpenAiApiKey(keys.openAiApiKey);
            setAnthropicApiKey(keys.anthropicApiKey);
            try {
              await fetch('/api/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(keys),
              });
            } catch (e) {
              console.error("Failed to sync API keys", e);
            }
          }}
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

              if (newLabel.applyRetroactively && geminiApiKey && emails.length > 0) {
                const emailsToProcess = emails.slice(0, 50);
                alert(`Success! "${newLabel.name}" saved. Filo is now retroactively scanning your last 50 emails...`);
                // Use the existing batch processor to scan the slice
                extractTasksAndLabelsBatch(emailsToProcess, geminiApiKey);
              } else {
                alert(`Success! "${newLabel.name}" safely stored. Filo will now automatically scan new incoming emails.`);
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
            onClick={() => { setActiveMailbox("Inbox"); setSelectedEmail(null); }}
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
            onClick={() => { setActiveMailbox("To-do"); setSelectedEmail(null); }}
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