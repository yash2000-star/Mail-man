"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { PenLine, Search, ClipboardList, Clock, LayoutPanelLeft, X, ArrowUp } from "lucide-react";
import { AiProvider, PROVIDER_LABELS } from "@/lib/ai-providers";
import type { MailItem } from "@/lib/mail-types";

interface AiChatProps {
  isOpen: boolean;
  onClose: () => void;
  emails: Pick<MailItem, "from" | "subject" | "snippet" | "date">[];
  /** Providers the user has a saved key for. */
  availableProviders: AiProvider[];
  defaultProvider: AiProvider | null;
  onOpenSettings: () => void;
}

// Starter questions shown on an empty chat; they work with any inbox
const SUGGESTED_PROMPTS = [
  { text: "What needs a reply from me?", icon: PenLine },
  { text: "Do I have any deadlines coming up?", icon: Search },
  { text: "Summarize my unread emails.", icon: ClipboardList },
];

export default function AiChat({ isOpen, onClose, emails, availableProviders, defaultProvider, onOpenSettings }: AiChatProps) {
  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const [chosenProvider, setChosenProvider] = useState<AiProvider | null>(null);
  // Start with an empty chat history so we can show the welcome screen!
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);

  // Extract user's first name for the greeting, default to "User" if not found
  const userName = session?.user?.name ? session.user.name : "User";

  // The user's pick if it still has a key, else their default, else any saved key
  const provider =
    (chosenProvider && availableProviders.includes(chosenProvider) && chosenProvider) ||
    (defaultProvider && availableProviders.includes(defaultProvider) && defaultProvider) ||
    availableProviders[0] ||
    null;

  if (!isOpen) return null;

  const sendMessage = async (overridePrompt?: string) => {
    const promptText = overridePrompt || input;
    if (!promptText.trim() || isLoading) return;

    if (!provider) {
      setMessages((prev) => [...prev, { role: "ai", content: "Add an AI API key in Settings to start chatting." }]);
      onOpenSettings();
      return;
    }

    // 2. Add user message to UI
    const newMessages = [...messages, { role: "user", content: promptText }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Only send the last few messages to save tokens
      const recentHistory = newMessages.slice(-6);

      // Only send the 5 most recent emails to save tokens!
      const recentEmails = emails.slice(0, 5).map(e => ({
        from: e.from,
        subject: e.subject,
        snippet: e.snippet,
        date: e.date
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: recentHistory,
          emails: recentEmails,
          provider,
        }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: "ai", content: data.reply }]);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Could not reach the AI. Please try again.";
      setMessages((prev) => [...prev, { role: "ai", content: `Error: ${message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Outer Sidebar Container
    <div className="relative w-[380px] shrink-0 h-full bg-zinc-950 border-l border-zinc-800/60 flex flex-col animate-in slide-in-from-right-8 duration-300 z-40">

      {/* Inner Area: Mail-man AI Premium Design (Now fills the whole height naturally) */}
      <div className="flex-1 flex flex-col relative w-full h-full">

        {/* Header */}
        <div className="px-6 py-5 flex justify-between items-center bg-transparent shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-[20px] font-black tracking-tighter text-amber-500">
              MAIL-MAN AI
            </h2>
            {availableProviders.length > 1 ? (
              <select
                aria-label="AI provider"
                value={provider ?? ""}
                onChange={(e) => setChosenProvider(e.target.value as AiProvider)}
                className="bg-zinc-900 border border-zinc-800/60 text-zinc-300 text-[11px] font-black uppercase tracking-widest rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-amber-500/50 transition-all hover:bg-zinc-800"
              >
                {availableProviders.map((p) => (
                  <option key={p} value={p} className="bg-zinc-900">{PROVIDER_LABELS[p]}</option>
                ))}
              </select>
            ) : provider ? (
              <span className="text-zinc-500 text-[11px] font-black uppercase tracking-widest">{PROVIDER_LABELS[provider]}</span>
            ) : null}
          </div>

          {/* Top Right Mini Controls Pill */}
          <div className="flex items-center gap-2 bg-zinc-900 rounded-full px-3 py-1.5 border border-zinc-800/60">
            <button className="text-zinc-500 hover:text-zinc-100 transition">
              <Clock size={14} strokeWidth={2.5} />
            </button>
            <div className="w-px h-3 bg-zinc-800 mx-0.5"></div>
            <button className="text-zinc-500 hover:text-zinc-100 transition">
              <LayoutPanelLeft size={14} strokeWidth={2.5} />
            </button>
            <div className="w-px h-3 bg-zinc-800 mx-0.5"></div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100 transition">
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 flex flex-col scrollbar-hide">
          {/* Show Welcome Screen if no messages yet */}
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-500 mt-10">

              <h3 className="text-2xl font-bold text-zinc-50 tracking-tight">Hi {userName}</h3>
              <p className="text-zinc-400 text-sm mb-12">
                Need help with an email?
              </p>

              <div className="space-y-3 w-full">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt.text)}
                    className="w-full text-left px-5 py-4 rounded-2xl bg-zinc-900 border border-zinc-800/60 hover:bg-zinc-800 hover:border-amber-500/30 text-zinc-100 transition-all text-sm leading-relaxed flex items-start gap-3 group"
                  >
                    <prompt.icon size={18} className="text-amber-500 shrink-0 mt-0.5" strokeWidth={2} />
                    <span className="font-medium group-hover:text-zinc-50">{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Show Chat History if messages exist
            <div className="flex flex-col gap-5 pt-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`p-4 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap break-words shadow-xl max-w-[85%] ${msg.role === "user"
                      ? "bg-zinc-800 text-zinc-100 rounded-tr-none"
                      : "bg-zinc-900 text-zinc-300 rounded-tl-none border border-zinc-800/60"
                      }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="bg-zinc-900 border border-zinc-800/60 p-4 rounded-2xl rounded-tl-none text-zinc-500 flex gap-1 items-center h-[52px]">
                    <span className="animate-bounce inline-block w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    <span className="animate-bounce delay-100 inline-block w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    <span className="animate-bounce delay-200 inline-block w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-5 pt-2 bg-transparent shrink-0">
          <div className="relative bg-zinc-900 rounded-3xl border border-zinc-800/60 shadow-2xl focus-within:border-amber-500/50 transition-all flex items-end min-h-[100px] p-3 overflow-hidden">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Search, write, or ask anything..."
              className="flex-1 bg-transparent text-zinc-100 text-[15px] p-2 outline-none resize-none h-full placeholder:text-zinc-600"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="absolute right-4 bottom-4 w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-zinc-800 hover:bg-amber-500 hover:text-black text-zinc-400 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group"
            >
              <ArrowUp size={18} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
