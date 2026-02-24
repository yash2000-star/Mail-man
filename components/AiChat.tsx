"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { PenLine, Search, ClipboardList, Clock, LayoutPanelLeft, X, ArrowUp } from "lucide-react";

interface AiChatProps {
  isOpen: boolean;
  onClose: () => void;
  emails: any[];
  apiKeys: {
    gemini: string;
    openai: string;
    anthropic: string;
  };
}

// The premium Filo AI Auto-fill prompts
const SUGGESTED_PROMPTS = [
  { text: "Help me draft a reply to Shanghai Metal about Aluminum Profile inquiry.", icon: PenLine },
  { text: "Explain the AWS account upgrade requirement by April 15, 2026.", icon: Search },
  { text: "Summarize all security alerts from Google.", icon: ClipboardList },
];

export default function AiChat({ isOpen, onClose, emails, apiKeys }: AiChatProps) {
  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-pro");
  // Start with an empty chat history so we can show the welcome screen!
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);

  // Extract user's first name for the greeting, default to "User" if not found
  const userName = session?.user?.name ? session.user.name : "User";

  if (!isOpen) return null;

  const sendMessage = async (overridePrompt?: string) => {
    const promptText = overridePrompt || input;
    if (!promptText.trim() || isLoading) return;

    // 1. SECURITY CHECK: Grab the correct key!
    let activeKey = "";
    let providerName = "";
    let finalModelStr = selectedModel;

    if (selectedModel.includes("gemini")) {
      activeKey = apiKeys.gemini;
      providerName = "Google Gemini";
    } else if (selectedModel.includes("gpt")) {
      activeKey = apiKeys.openai;
      providerName = "OpenAI";
    } else if (selectedModel.includes("claude")) {
      activeKey = apiKeys.anthropic;
      providerName = "Anthropic Claude";
    }

    // Auto-Fallback: If the current model has no key, but they PROVIDED another key, use the one they have!
    if (!activeKey) {
      if (apiKeys.openai) {
        activeKey = apiKeys.openai;
        finalModelStr = "gpt-4o";
        setSelectedModel("gpt-4o");
      } else if (apiKeys.anthropic) {
        activeKey = apiKeys.anthropic;
        finalModelStr = "claude-3-opus";
        setSelectedModel("claude-3-opus");
      } else if (apiKeys.gemini) {
        activeKey = apiKeys.gemini;
        finalModelStr = "gemini-1.5-pro";
        setSelectedModel("gemini-1.5-pro");
      } else {
        // They literally have 0 keys.
        setMessages((prev) => [...prev, { role: "ai", content: `⚠️ Please click the Gear icon in the bottom left to add an API Key first!` }]);
        return;
      }
    }

    // 2. Add user message to UI
    const newMessages = [...messages, { role: "user", content: promptText }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // 3 Only send the last 4 messages to save tokens!
      const recentHistory = newMessages.slice(-4);

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
          prompt: promptText,
          history: recentHistory,
          emails: recentEmails,
          apiKey: activeKey,
          model: finalModelStr
        }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: "ai", content: data.reply }]);
    } catch (error: any) {
      setMessages((prev) => [...prev, { role: "ai", content: `❌ Error: ${error.message || "Failed to connect to Gemini."}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Outer Sidebar Container
    <div className="relative w-[380px] shrink-0 h-full bg-[#f9f9f9] border-l border-gray-200/60 flex flex-col animate-in slide-in-from-right-8 duration-300 z-40">

      {/* Inner Area: Filo AI Premium Design (Now fills the whole height naturally) */}
      <div className="flex-1 flex flex-col relative w-full h-full">

        {/* Header */}
        <div className="px-6 py-5 flex justify-between items-center bg-transparent shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-[20px] font-extrabold text-[#2F95FF]">
              Filo AI
            </h2>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-[12px] font-semibold rounded-lg px-2 py-1 outline-none cursor-pointer focus:ring-2 focus:ring-[#2F95FF]/20 transition-all hover:bg-gray-50"
            >
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gpt-4o">ChatGPT-4o</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
            </select>
          </div>

          {/* Top Right Mini Controls Pill */}
          <div className="flex items-center gap-2 bg-[#f0f0f0] rounded-full px-3 py-1.5 border border-gray-200/50">
            <button className="text-gray-600 hover:text-black transition">
              <Clock size={14} strokeWidth={2.5} />
            </button>
            <div className="w-px h-3 bg-gray-300 mx-0.5"></div>
            <button className="text-gray-600 hover:text-black transition">
              <LayoutPanelLeft size={14} strokeWidth={2.5} />
            </button>
            <div className="w-px h-3 bg-gray-300 mx-0.5"></div>
            <button onClick={onClose} className="text-gray-600 hover:text-black transition">
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 flex flex-col scrollbar-hide">
          {/* Show Welcome Screen if no messages yet */}
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-500 mt-10">

              <h3 className="text-[22px] font-bold text-black tracking-tight">Hi {userName}</h3>
              <p className="text-gray-500 text-[15px] mb-12">
                Need help with an email?
              </p>

              <div className="space-y-3 w-full">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt.text)}
                    className="w-full text-left px-5 py-4 rounded-[16px] bg-[#f0f0f0] hover:bg-[#e8e8e8] text-gray-800 transition-colors text-[14px] leading-relaxed flex items-start gap-3 group"
                  >
                    <prompt.icon size={18} className="text-[#2F95FF] shrink-0 mt-0.5" strokeWidth={2} />
                    <span className="font-medium">{prompt.text}</span>
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
                    className={`p-3.5 rounded-[18px] text-[15px] leading-relaxed shadow-sm max-w-[85%] ${msg.role === "user"
                      ? "bg-[#f0f0f0] text-gray-900 rounded-tr-[4px]"
                      : "bg-white text-gray-800 rounded-tl-[4px] border border-gray-100"
                      }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="bg-white border border-gray-100 p-4 rounded-[18px] rounded-tl-[4px] text-[15px] text-gray-400 flex gap-1 items-center h-[52px]">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-100">●</span>
                    <span className="animate-bounce delay-200">●</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-5 pt-2 bg-transparent shrink-0">
          <div className="relative bg-white rounded-[24px] border border-gray-200 shadow-sm focus-within:border-[#2F95FF] focus-within:ring-2 focus-within:ring-[#2F95FF]/20 transition-all flex items-end min-h-[100px] p-3">
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
              className="flex-1 bg-transparent text-gray-900 text-[15px] p-2 outline-none resize-none h-full placeholder:text-gray-400"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#a0a0a0] hover:bg-[#808080] text-white"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
