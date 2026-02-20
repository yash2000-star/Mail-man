"use client";

import Sidebar from "@/components/Sidebar";
import EmailFeed from "@/components/EmailFeed";
import ReadingPane from "@/components/ReadingPane";
import AiChat from "@/components/AiChat";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function Home() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // The memory for the right-hand reading pane!
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);


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

  const fetchEmails = async () => {
    // Safety Check
    if (!(session as any)?.accessToken) return;
    setIsFetching(true);

    // Knock on Google's door
    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5",
      {
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      },
    );

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

      const cleanEmails = detailedEmails.map((msg: any) => ({
        id: msg.id,
        snippet: msg.snippet,
        subject: getHeader(msg.payload.headers, "Subject"),
        from: getHeader(msg.payload.headers, "From").split("<")[0].trim(),
        body: getEmailBody(msg.payload),
      }));

      // 1. Show emails on screen immediately
      setEmails(cleanEmails);
      setIsFetching(false);

      // 2. AUTO-PILOT ENGAGE
      for (const msg of cleanEmails) {
        await classifyEmail(msg.id, msg.snippet);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  };

  const classifyEmail = async (id: string, snippet: string) => {
    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        body: JSON.stringify({ snippet }),
      });
      const result = await response.json();

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

  useEffect(() => {
    if((session as any)?.accessToken && emails.length === 0 && !isFetching){
      fetchEmails();
    }
  }, [session, emails.length])

  if (session) {
    return (
      //  Locks the screen height
      <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden selection:bg-purple-500/30 relative">
        {/* Sidebar (Left) */}
        <Sidebar />

        {/* The Email Feed */}
        <EmailFeed
          emails={emails}
          selectedEmail={selectedEmail}
          onSelect={setSelectedEmail}
          onRefresh={fetchEmails} 
          isSyncing={isFetching}
        />

        {/* The Reading Pane */}
        <ReadingPane
          selectedEmail={selectedEmail}
          getBadgeStyle={getBadgeStyle}
          onBack={() => setSelectedEmail(null)}
          onOpenAi={() => setIsAiChatOpen(true)}
        />

        <AiChat isOpen={isAiChatOpen} onClose={() => setIsAiChatOpen(false)}  emails={emails}/>
      </div>
    );
  }
  // --- UI: LOGGED OUT ---
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-purple-500/30 overflow-y-auto">
      {/* Navbar */}
      <nav className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-purple-500">⚡</span> EZee Mail
          </h1>
          <button
            onClick={() => signIn("google")}
            className="text-sm font-medium bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative max-w-5xl mx-auto px-6 pt-32 pb-20 text-center">
        {/* Glowing background effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_50%)]"></div>

        <h1 className="relative text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
          Your Inbox, <br className="hidden md:block" /> On Autopilot.
        </h1>
        <p className="relative text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
          Stop drowning in emails. EZee Mail uses advanced AI to summarize
          threads, categorize junk, and draft perfect replies in seconds.
        </p>
        <button
          onClick={() => signIn("google")}
          className="relative bg-white text-black font-semibold py-4 px-8 rounded-full text-lg hover:scale-105 hover:bg-zinc-100 transition-all shadow-[0_0_40px_rgba(168,85,247,0.4)]"
        >
          Get Started for Free
        </button>
      </div>

      {/* dashboard looks like!) */}
      <div className="max-w-5xl mx-auto px-6 pb-32">
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-2 md:p-4 shadow-2xl overflow-hidden backdrop-blur-sm relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent opacity-50"></div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 h-[400px] flex overflow-hidden">
            {/* Fake Sidebar */}
            <div className="w-1/4 border-r border-zinc-800/50 hidden md:block bg-zinc-900/20 p-4">
              <div className="h-8 w-24 bg-zinc-800 rounded-lg mb-8"></div>
              <div className="space-y-3">
                <div className="h-6 w-full bg-zinc-800/50 rounded"></div>
                <div className="h-6 w-3/4 bg-zinc-800/30 rounded"></div>
                <div className="h-6 w-5/6 bg-zinc-800/30 rounded"></div>
              </div>
            </div>
            {/* Fake Email List */}
            <div className="w-full md:w-1/3 border-r border-zinc-800/50 bg-zinc-900/10 p-4 space-y-3">
              <div className="h-16 w-full rounded-lg bg-zinc-800/50"></div>
              <div className="h-16 w-full rounded-lg bg-purple-900/20 border-l-2 border-purple-500"></div>
              <div className="h-16 w-full rounded-lg bg-zinc-800/50"></div>
              <div className="h-16 w-full rounded-lg bg-zinc-800/50"></div>
            </div>
            {/* Fake Reading Pane */}
            <div className="flex-1 hidden md:block p-8 space-y-6">
              <div className="h-10 w-3/4 rounded-lg bg-zinc-800/80"></div>
              <div className="h-24 w-full rounded-xl bg-purple-500/5 border border-purple-500/20"></div>
              <div className="h-32 w-full rounded-xl bg-blue-500/5 border border-blue-500/20"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto px-6 pb-32 grid md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 hover:bg-zinc-900/80 transition cursor-default">
          <div className="text-3xl mb-4">✨</div>
          <h3 className="text-lg font-bold text-white mb-2">AI Summaries</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Instantly grasp the core message of long threads without reading
            paragraphs of text.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 hover:bg-zinc-900/80 transition cursor-default">
          <div className="text-3xl mb-4">✍️</div>
          <h3 className="text-lg font-bold text-white mb-2">Smart Drafts</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Our AI predicts when an email needs a reply and writes a highly
            professional draft for you.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 hover:bg-zinc-900/80 transition cursor-default">
          <div className="text-3xl mb-4">🔒</div>
          <h3 className="text-lg font-bold text-white mb-2">Privacy First</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Your emails stay secure. We use official Google APIs and never store
            your private data on our servers.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8 text-center text-zinc-500 text-sm">
        <p>© 2024 EZee Mail. Built with Next.js & Gemini AI.</p>
      </footer>
    </div>
  );
}
