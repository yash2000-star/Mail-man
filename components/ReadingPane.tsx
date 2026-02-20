"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { 
  ChevronsRight, Reply, Forward, Tag, Star, Archive, 
  Trash2, MoreHorizontal, Sparkles, ThumbsUp, ThumbsDown, ChevronDown 
} from "lucide-react";

interface ReadingPaneProps {
  selectedEmail: any | null;
  getBadgeStyle: (category: string) => string;
  onBack: () => void; 
  onOpenAi?: () => void; // NEW: Prop to open the AI Chat from the top right!
}

export default function ReadingPane({
  selectedEmail,
  getBadgeStyle,
  onBack,
  onOpenAi
}: ReadingPaneProps) {
  const { data: session } = useSession();
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Helper to generate the same avatar gradient as the EmailFeed
  const getAvatarGradient = (name: string) => {
    const char = name?.charAt(0).toUpperCase() || "A";
    if (/[A-G]/.test(char)) return "from-blue-500 to-cyan-500";
    if (/[H-N]/.test(char)) return "from-purple-500 to-pink-500";
    if (/[O-U]/.test(char)) return "from-orange-500 to-red-500";
    return "from-emerald-500 to-teal-500";
  };

  const handleSend = async () => {
    if (!session || !(session as any).accessToken) return;
    setIsSending(true);

    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(session as any).accessToken}`,
        },
        body: JSON.stringify({
          to: selectedEmail.from,
          subject: selectedEmail.subject?.startsWith("Re:")
            ? selectedEmail.subject
            : `Re: ${selectedEmail.subject}`,
          message: selectedEmail.draft_reply,
        }),
      });

      if (response.ok) {
        setSendSuccess(true);
        setTimeout(() => setSendSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to send:", error);
    } finally {
      setIsSending(false);
    }
  };

  const senderName = selectedEmail?.from?.split("<")[0].replace(/"/g, '').trim() || "Unknown Sender";

  return (
    <main className={`flex-1 flex-col bg-zinc-950 relative border-l border-zinc-800/50 ${!selectedEmail ? "hidden md:flex" : "flex"}`}>
      {selectedEmail ? (
        <>
          {/* --- TOP TOOLBAR --- */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
            
            {/* Left Actions */}
            <div className="flex items-center gap-1">
              <button onClick={onBack} title="Back to Inbox" className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition">
                <ChevronsRight size={18} />
              </button>
              
              <div className="w-px h-5 bg-zinc-800 mx-1" /> {/* Divider */}
              
              <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition hidden sm:block"><Reply size={16} /></button>
              <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition hidden sm:block"><Forward size={16} /></button>
              
              <div className="w-px h-5 bg-zinc-800 mx-1 hidden sm:block" /> {/* Divider */}
              
              <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition" title="Labels"><Tag size={16} /></button>
              <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition" title="Star"><Star size={16} /></button>
              <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition" title="Archive"><Archive size={16} /></button>
              <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition" title="Delete"><Trash2 size={16} /></button>
              <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition" title="More"><MoreHorizontal size={16} /></button>
            </div>

            {/* Right Action: AI Button */}
            <div>
              <button 
                onClick={onOpenAi}
                className="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 hover:scale-105 rounded-full transition-all shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                title="Ask AI about this email"
              >
                <Sparkles size={18} />
              </button>
            </div>
          </div>

          {/* --- SCROLLABLE CONTENT --- */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide">
            <div className="max-w-3xl mx-auto">
              
              {/* Email Title & Badge */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold text-white leading-tight">
                  {selectedEmail.subject || "(No Subject)"}
                </h1>
                {selectedEmail.category && (
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getBadgeStyle(selectedEmail.category)}`}>
                    {selectedEmail.category}
                  </span>
                )}
              </div>

              {/* Sender Details */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(senderName)} flex items-center justify-center text-white font-bold text-lg shadow-inner`}>
                    {senderName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-200">
                      {senderName}
                    </p>
                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                      To: Me <ChevronDown size={12} />
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 hidden sm:block">Yesterday, 4:21 PM</span>
                  <button className="text-zinc-400 hover:text-white transition"><Reply size={16} /></button>
                  <button className="text-zinc-400 hover:text-white transition"><MoreHorizontal size={16} /></button>
                </div>
              </div>

              {/* AI Summary Block */}
              {selectedEmail.summary && (
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5 mb-8">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                      <Sparkles size={16} /> Summary
                    </h4>
                    <div className="flex gap-3">
                      <ThumbsUp size={14} className="text-blue-400 hover:text-blue-300 cursor-pointer transition" />
                      <ThumbsDown size={14} className="text-blue-400 hover:text-blue-300 cursor-pointer transition" />
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {selectedEmail.summary}
                  </p>
                </div>
              )}

              {/* AI Smart Draft Block */}
              {selectedEmail.requires_reply && selectedEmail.draft_reply && (
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-5 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✍️</span>
                      <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                        AI Smart Draft
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(selectedEmail.draft_reply)}
                        className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-500/30 text-xs font-bold py-1.5 px-3 rounded-lg transition"
                      >
                        Copy
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={isSending || sendSuccess}
                        className="bg-purple-600 hover:bg-purple-500 disabled:bg-emerald-600 text-white border border-purple-500/30 text-xs font-bold py-1.5 px-4 rounded-lg transition flex items-center shadow-lg"
                      >
                        {isSending ? "Sending..." : sendSuccess ? "Sent! ✓" : "Send Reply 🚀"}
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-900/60 p-4 rounded-xl text-zinc-300 text-sm whitespace-pre-wrap border border-zinc-800/50 leading-relaxed font-mono">
                    {selectedEmail.draft_reply}
                  </div>
                </div>
              )}

              {/* Actual Email Body */}
              <div className="bg-white text-black p-6 sm:p-10 rounded-2xl min-h-[400px] shadow-inner overflow-x-auto">
                <div
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                  className="email-content-wrapper"
                />
              </div>

              {/* Bottom Action Pills */}
              <div className="flex gap-3 mt-6">
                 <button className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-sm font-medium hover:bg-zinc-800 transition text-zinc-300 shadow-sm"><Reply size={16}/> Reply</button>
                 <button className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-sm font-medium hover:bg-zinc-800 transition text-zinc-300 shadow-sm"><Forward size={16}/> Forward</button>
              </div>

            </div>
          </div>
        </>
      ) : (
        // Empty State
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <span className="text-2xl opacity-50"><MoreHorizontal /></span>
          </div>
          <p className="font-medium text-lg text-zinc-400">
            Select an item to read
          </p>
        </div>
      )}
    </main>
  );
}