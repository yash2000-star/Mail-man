"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronsRight, Reply, Forward, Tag, Star, Archive,
  Trash2, MoreHorizontal, Sparkles, ThumbsUp, ThumbsDown, ChevronDown, RefreshCw
} from "lucide-react";

interface ReadingPaneProps {
  selectedEmail: any | null;
  getBadgeStyle: (category: string) => string;
  onBack: () => void;
  onOpenAi?: () => void;
  onAction?: (id: string, action: string) => void;
  onAiReply?: () => void;
  isAiThinking?: boolean;
}

export default function ReadingPane({
  selectedEmail,
  getBadgeStyle,
  onBack,
  onOpenAi,
  onAction,
  onAiReply,
  isAiThinking
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
    <main className={`flex-1 min-w-0 flex-col bg-white relative border-l border-gray-100 ${!selectedEmail ? "hidden" : "flex"}`}>
      {selectedEmail && (
        <>
          {/* --- TOP TOOLBAR --- */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/95 backdrop-blur-md w-full gap-2 transition-shadow shadow-[0_1px_2px_rgba(0,0,0,0.02)]">

            {/* Left Actions */}
            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-hide pr-2">
              <button onClick={onBack} title="Back to Inbox" className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition shrink-0 md:hidden">
                <ChevronsRight size={20} className="rotate-180" strokeWidth={1.5} />
              </button>

              <button className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition hidden xl:block shrink-0">
                <ChevronsRight size={20} className="rotate-180" strokeWidth={1.5} />
              </button>

              <button
                onClick={() => onAction && onAction(selectedEmail.id, "reply")}
                className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition shrink-0"
              ><Reply size={18} strokeWidth={1.5} /></button>
              <button
                onClick={() => onAction && onAction(selectedEmail.id, "forward")}
                className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition shrink-0"
              ><Forward size={18} strokeWidth={1.5} /></button>

              <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" /> {/* Divider */}

              <button
                onClick={() => onAction && onAction(selectedEmail.id, 'archive')}
                className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition shrink-0"
                title="Archive"
              >
                <div className="relative flex items-center justify-center">
                  {/* Visual Archive Box match */}
                  <Archive size={18} strokeWidth={1.5} />
                </div>
              </button>
              <button
                onClick={() => onAction && onAction(selectedEmail.id, selectedEmail.isStarred ? 'unstar' : 'star')}
                className={`p-2 rounded-full transition shrink-0 ${selectedEmail.isStarred ? 'text-[#f4b400] bg-yellow-50 hover:bg-yellow-100' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'}`}
                title={selectedEmail.isStarred ? "Unstar" : "Star"}
              >
                <Star size={18} strokeWidth={1.5} className={selectedEmail.isStarred ? "fill-[#f4b400]" : ""} />
              </button>

              <button
                onClick={() => onAction && onAction(selectedEmail.id, 'trash')}
                className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition shrink-0"
                title="Delete"
              >
                <Trash2 size={18} strokeWidth={1.5} />
              </button>

              <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" /> {/* Divider */}
              <button className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition shrink-0" title="More">
                <MoreHorizontal size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Right Action: AI Button */}
            <div className="shrink-0 flex items-center gap-2 pl-2">
              <button
                onClick={onAiReply}
                disabled={isAiThinking}
                className="flex items-center justify-center p-2.5 rounded-full border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)] bg-white hover:bg-blue-50 transition disabled:opacity-50"
                title="AI Actions"
              >
                <Sparkles size={18} strokeWidth={1.5} className={`text-[#1a73e8] ${isAiThinking ? "animate-pulse" : ""}`} />
              </button>
            </div>
          </div>

          {/* --- SCROLLABLE CONTENT --- */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide bg-white">
            <div className="max-w-3xl mx-auto mt-2">

              {/* Email Title & Badge */}
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <h1 className="text-[26px] font-bold text-gray-900 leading-tight tracking-tight">
                  {selectedEmail.subject || "(No Subject)"}
                </h1>
                {selectedEmail.category ? (
                  <span className="px-3 py-1 rounded-full text-[13px] font-bold text-[#1a73e8] bg-[#eef6fc] whitespace-nowrap">
                    {selectedEmail.category}
                  </span>
                ) : (
                  <button
                    onClick={() => /* Add a single-email scan trigger here */ null}
                    className="px-3 py-1 rounded-full text-[13px] font-bold text-gray-500 bg-gray-50 border border-gray-200 hover:text-blue-500 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <RefreshCw size={12} strokeWidth={2} /> Scan
                  </button>
                )}
              </div>

              {/* Sender Details */}
              <div className="flex items-center justify-between mb-6 pb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(senderName)} flex items-center justify-center text-white font-bold text-xl shadow-sm shrink-0`}>
                    {senderName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-[15px] font-bold text-gray-900">
                        {senderName}
                      </h3>
                    </div>
                    <p className="text-[13px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <span className="font-bold">To:</span> Me <ChevronDown size={14} className="text-gray-400" />
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[12.5px] text-gray-500 font-medium">12:55 PM (1 hours ago)</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onAction && onAction(selectedEmail.id, "reply")}
                      className="text-gray-600 hover:text-gray-900 transition hover:bg-gray-100 p-2 rounded-full"
                      title="Reply"
                    >
                      <Reply size={18} strokeWidth={1.5} />
                    </button>
                    <button className="text-gray-600 hover:text-gray-900 transition hover:bg-gray-100 p-2 rounded-full"><MoreHorizontal size={18} strokeWidth={1.5} /></button>
                  </div>
                </div>
              </div>

              {/* AI Summary Block */}
              {selectedEmail.summary ? (
                <div className="bg-[#f0f7fd] rounded-3xl p-6 mb-8 mt-2 text-gray-900 font-sans shadow-sm border border-transparent">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[17px] font-bold text-[#1a73e8]">
                      Summary
                    </h4>
                    <div className="flex gap-1.5">
                      <button className="text-[#1a73e8] hover:bg-blue-100 p-1.5 rounded-full transition"><ThumbsUp size={16} strokeWidth={1.5} /></button>
                      <button className="text-[#1a73e8] hover:bg-blue-100 p-1.5 rounded-full transition"><ThumbsDown size={16} strokeWidth={1.5} /></button>
                    </div>
                  </div>
                  <ul className="text-[15px] text-gray-900 leading-[1.6] font-medium space-y-2 list-disc pl-5 marker:text-gray-800 marker:text-[12px]">
                    {selectedEmail.summary.split('.').filter((s: string) => s.trim().length > 0).map((sentence: string, idx: number) => (
                      <li key={idx} className="pl-1">{sentence.trim()}.</li>
                    ))}
                  </ul>

                  {/* Footer Action Pill */}
                  <div className="mt-5">
                    <button className="px-4 py-2 bg-[#d2eafd] hover:bg-[#c6e1fc] text-[#1a73e8] text-[13px] font-bold rounded-full transition">
                      Check activity
                    </button>
                  </div>
                </div>
              ) : (
                /* Optional: Show a subtle skeleton while batching is in progress */
                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 mb-8 border-dashed mt-2">
                  <p className="text-[15px] font-bold text-gray-500 animate-pulse flex items-center gap-3">
                    <RefreshCw size={16} className="animate-spin" />
                    Mail-Man is summarizing...
                  </p>
                </div>
              )}
              {/* AI Smart Draft Block */}
              {selectedEmail.draft_reply && (
                <div className="bg-[#f0f4f9] rounded-2xl p-5 mb-8 animate-in slide-in-from-bottom-2 border border-[#e5e7eb]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✍️</span>
                      <h4 className="text-[13px] font-bold text-gray-800 uppercase tracking-wider">
                        AI Draft
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(selectedEmail.draft_reply)}
                        className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold py-1.5 px-3 rounded-lg transition shadow-sm"
                      >
                        Copy
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={isSending || sendSuccess}
                        className="bg-[#1a73e8] hover:bg-blue-600 disabled:bg-emerald-600 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition flex items-center shadow-sm border border-[#1a73e8]"
                      >
                        {isSending ? "Sending..." : sendSuccess ? "Sent! ✓" : "Send Reply 🚀"}
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl text-gray-800 text-sm whitespace-pre-wrap border border-gray-200 leading-relaxed font-mono mt-4 shadow-inner">
                    {selectedEmail.draft_reply}
                  </div>
                </div>
              )}

              {/* Actual Email Body Boxed Container */}
              <div className="border border-gray-200 rounded-xl p-8 bg-white shadow-sm mt-8 mb-8 overflow-hidden">
                <div className="text-gray-900 text-[15px] leading-relaxed font-sans w-full max-w-full overflow-x-auto">
                  <div
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                    className="email-content-wrapper"
                  />
                </div>
              </div>

              {/* Bottom Action Pills */}
              <div className="flex gap-3 mt-6 mb-8">
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, "reply")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 rounded-full text-[14px] font-bold hover:bg-gray-50 transition text-gray-800 shadow-sm"
                >
                  <Reply size={18} strokeWidth={2} className="text-gray-600" /> Reply
                </button>
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, "forward")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 rounded-full text-[14px] font-bold hover:bg-gray-50 transition text-gray-800 shadow-sm"
                >
                  <Forward size={18} strokeWidth={2} className="text-gray-600" /> Forward
                </button>
              </div>

            </div>
          </div>
        </>
      )}
    </main>
  );
}