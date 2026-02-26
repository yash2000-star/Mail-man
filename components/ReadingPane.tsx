"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronsRight, Reply, Forward, Tag, Star, Archive,
  Trash2, MoreHorizontal, Sparkles, ThumbsUp, ThumbsDown, ChevronDown, RefreshCw,
  ListTodo, AlertCircle, Mail, Maximize2, Filter, Printer
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

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
    <main className={`flex-1 min-w-0 flex-col bg-white dark:bg-slate-950/50 dark:backdrop-blur-xl relative border-l border-gray-100 dark:border-white/5 ${!selectedEmail ? "hidden" : "flex"}`}>
      {selectedEmail && (
        <>
          {/* --- TOP TOOLBAR --- */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10 bg-white/95 dark:bg-transparent backdrop-blur-md w-full gap-2 transition-shadow shadow-[0_1px_2px_rgba(0,0,0,0.02)]">


            {/* Left Actions - Styled identically to the screenshot with grouped pills and dividers */}
            <div className="flex items-center gap-3 flex-1 min-w-0 pr-2 py-1 pl-2">

              {/* Group 1: Collapse/Back (Circle) */}
              <button
                onClick={onBack}
                title="Close"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-white/10 dark:backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20 transition shrink-0 border border-gray-100/50 dark:border-white/20"
              >
                <ChevronsRight size={18} strokeWidth={2} />
              </button>

              {/* Group 2: Reply / Forward (Pill with Divider) */}
              <div className="flex items-center h-10 bg-white dark:bg-white/10 dark:backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.1)] rounded-full px-1.5 shrink-0 border border-gray-100/50 dark:border-white/20">
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, "reply")}
                  className="w-9 h-full flex items-center justify-center rounded-l-full text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20 transition"
                  title="Reply"
                >
                  <Reply size={18} strokeWidth={2} />
                </button>
                <div className="w-[1px] h-5 bg-gray-200 dark:bg-white/20 mx-1" />
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, "forward")}
                  className="w-9 h-full flex items-center justify-center rounded-r-full text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20 transition"
                  title="Forward"
                >
                  <Forward size={18} strokeWidth={2} />
                </button>
              </div>

              {/* Group 3: Tag / Star / Archive / Trash (Pill with Dividers) */}
              <div className="flex items-center h-10 bg-white dark:bg-white/10 dark:backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.1)] rounded-full px-1.5 shrink-0 border border-gray-100/50 dark:border-white/20">
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, "tag")}
                  className="w-9 h-full flex items-center justify-center rounded-l-full text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20 transition"
                  title="Label"
                >
                  <Tag size={18} strokeWidth={2} />
                </button>
                <div className="w-[1px] h-5 bg-gray-200 dark:bg-white/20 mx-1" />
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, selectedEmail.isStarred ? 'unstar' : 'star')}
                  className={`w-9 h-full flex items-center justify-center transition dark:hover:bg-white/20 dark:text-white ${selectedEmail.isStarred ? 'text-[#f4b400] hover:bg-yellow-50' : 'text-gray-700 hover:bg-gray-50'}`}
                  title={selectedEmail.isStarred ? "Unstar" : "Star"}
                >
                  <Star size={18} strokeWidth={2} className={selectedEmail.isStarred ? "fill-[#f4b400]" : ""} />
                </button>
                <div className="w-[1px] h-5 bg-gray-200 dark:bg-white/20 mx-1" />
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, 'archive')}
                  className="w-9 h-full flex items-center justify-center text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20 transition"
                  title="Archive"
                >
                  <Archive size={18} strokeWidth={2} />
                </button>
                <div className="w-[1px] h-5 bg-gray-200 dark:bg-white/20 mx-1" />
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, 'trash')}
                  className="w-9 h-full flex items-center justify-center rounded-r-full text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20 transition"
                  title="Delete"
                >
                  <Trash2 size={18} strokeWidth={2} />
                </button>
              </div>

              {/* Group 4: More (Circle with Popover Menu) */}
              <div className="relative">
                <button
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  title="More"
                  className={`w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-white/10 dark:backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition shrink-0 border ${isMoreMenuOpen ? "border-gray-300 dark:border-white/30 bg-gray-50 dark:bg-white/20 text-gray-900 dark:text-white" : "border-gray-100/50 dark:border-white/20 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20"}`}
                >
                  <MoreHorizontal size={18} strokeWidth={2} />
                </button>

                {/* --- FLOATING DROPDOWN MENU --- */}
                {isMoreMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 py-2">
                      <div className="flex flex-col">
                        <button className="flex items-center justify-between w-full px-4 py-2.5 text-[14px] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/10 transition">
                          <span>Create Todo</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-400 font-medium">Ctrl+⇧+T</span>
                            <ListTodo size={16} strokeWidth={1.5} className="text-gray-900 dark:text-slate-400" />
                          </div>
                        </button>

                        <div className="h-[1px] bg-gray-100 dark:bg-white/10 w-full my-1"></div>

                        <button onClick={() => { onAction && onAction(selectedEmail.id, "spam"); setIsMoreMenuOpen(false); }} className="flex items-center justify-between w-full px-4 py-2.5 text-[14px] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/10 transition">
                          <span>Spam</span>
                          <AlertCircle size={16} strokeWidth={1.5} className="text-gray-900 dark:text-slate-400" />
                        </button>

                        <div className="h-[1px] bg-gray-100 dark:bg-white/10 w-full my-1"></div>

                        <button onClick={() => { onAction && onAction(selectedEmail.id, "unread"); setIsMoreMenuOpen(false); }} className="flex items-center justify-between w-full px-4 py-2.5 text-[14px] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/10 transition">
                          <span>Mark as Unread</span>
                          <Mail size={16} strokeWidth={1.5} className="text-gray-900 dark:text-slate-400" />
                        </button>

                        <div className="h-[1px] bg-gray-100 dark:bg-white/10 w-full my-1"></div>

                        <button className="flex items-center justify-between w-full px-4 py-2.5 text-[14px] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/10 transition">
                          <span>No Split</span>
                          <Maximize2 size={16} strokeWidth={1.5} className="text-gray-900 dark:text-slate-400" />
                        </button>

                        <div className="h-[1px] bg-gray-100 dark:bg-white/10 w-full my-1"></div>

                        <button className="flex items-center justify-between w-full px-4 py-2.5 text-[14px] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/10 transition">
                          <span>Filter mail like this</span>
                          <Filter size={16} strokeWidth={1.5} className="text-gray-900 dark:text-slate-400" />
                        </button>

                        <div className="h-[1px] bg-gray-100 dark:bg-white/10 w-full my-1"></div>

                        <button className="flex items-center justify-between w-full px-4 py-2.5 text-[14px] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/10 transition">
                          <span>Print</span>
                          <Printer size={16} strokeWidth={1.5} className="text-gray-900 dark:text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Action: AI Button Custom Match */}
            <div className="shrink-0 flex items-center gap-2 pr-2">
              <button
                onClick={onAiReply}
                disabled={isAiThinking}
                className="w-[36px] h-[36px]  flex items-center justify-center rounded-full text-blue-500 hover:bg-blue-50 transition disabled:opacity-50"
                title="AI Actions"
              >
                <Sparkles size={18} strokeWidth={3} className={`text-purple-500 ${isAiThinking ? "animate-pulse" : ""}`} />
              </button>
            </div>
          </div>

          {/* --- SCROLLABLE CONTENT --- */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide bg-white dark:bg-transparent">
            <div className="max-w-3xl mx-auto mt-2">

              {/* Email Title & Badge */}
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <h1 className="text-[26px] font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
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
                      <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                        {senderName}
                      </h3>
                    </div>
                    <p className="text-[13px] text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <span className="font-bold">To:</span> Me <ChevronDown size={14} className="text-gray-400 dark:text-slate-500" />
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[12.5px] text-gray-500 dark:text-slate-400 font-medium">12:55 PM (1 hours ago)</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onAction && onAction(selectedEmail.id, "reply")}
                      className="text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition hover:bg-gray-100 dark:hover:bg-white/10 p-2 rounded-full"
                      title="Reply"
                    >
                      <Reply size={18} strokeWidth={1.5} />
                    </button>
                    <button className="text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition hover:bg-gray-100 dark:hover:bg-white/10 p-2 rounded-full"><MoreHorizontal size={18} strokeWidth={1.5} /></button>
                  </div>
                </div>
              </div>

              {/* AI Summary Block */}
              {selectedEmail.summary ? (
                <div className="bg-[#f0f7fd] dark:bg-white/5 dark:backdrop-blur-xl rounded-3xl p-6 mb-8 mt-2 text-gray-900 dark:text-white font-sans shadow-sm border border-transparent dark:border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[17px] font-bold text-[#1a73e8]">
                      Summary
                    </h4>
                    <div className="flex gap-1.5">
                      <button className="text-[#1a73e8] hover:bg-blue-100 p-1.5 rounded-full transition"><ThumbsUp size={16} strokeWidth={1.5} /></button>
                      <button className="text-[#1a73e8] hover:bg-blue-100 p-1.5 rounded-full transition"><ThumbsDown size={16} strokeWidth={1.5} /></button>
                    </div>
                  </div>
                  <ul className="text-[15px] text-gray-900 dark:text-slate-300 leading-[1.6] font-medium space-y-2 list-disc pl-5 marker:text-gray-800 dark:marker:text-slate-400 marker:text-[12px]">
                    {selectedEmail.summary.split('.').filter((s: string) => s.trim().length > 0).map((sentence: string, idx: number) => (
                      <li key={idx} className="pl-1">{sentence.trim()}.</li>
                    ))}
                  </ul>

                  {/* Footer Action Pill */}
                  <div className="mt-5">
                    <button className="px-4 py-2 bg-[#d2eafd] dark:bg-[#1a73e8]/20 hover:bg-[#c6e1fc] dark:hover:bg-[#1a73e8]/30 text-[#1a73e8] dark:text-blue-400 text-[13px] font-bold rounded-full transition">
                      Check activity
                    </button>
                  </div>
                </div>
              ) : (
                /* Optional: Show a subtle skeleton while batching is in progress */
                <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl p-6 mb-8 border-dashed mt-2">
                  <p className="text-[15px] font-bold text-gray-500 dark:text-slate-400 animate-pulse flex items-center gap-3">
                    <RefreshCw size={16} className="animate-spin" />
                    Mail-Man is summarizing...
                  </p>
                </div>
              )}
              {/* AI Smart Draft Block */}
              {selectedEmail.draft_reply && (
                <div className="bg-[#f0f4f9] dark:bg-white/5 rounded-2xl p-5 mb-8 animate-in slide-in-from-bottom-2 border border-[#e5e7eb] dark:border-white/10 dark:backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✍️</span>
                      <h4 className="text-[13px] font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                        AI Draft
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(selectedEmail.draft_reply)}
                        className="bg-white dark:bg-white/10 dark:backdrop-blur-md hover:bg-gray-50 dark:hover:bg-white/20 text-gray-700 dark:text-white border border-gray-200 dark:border-white/20 text-xs font-bold py-1.5 px-3 rounded-lg transition shadow-sm"
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

                  <div className="bg-gray-50 dark:bg-transparent p-4 rounded-xl text-gray-800 dark:text-slate-300 text-sm whitespace-pre-wrap border border-gray-200 dark:border-white/10 leading-relaxed font-mono mt-4 shadow-inner">
                    {selectedEmail.draft_reply}
                  </div>
                </div>
              )}

              {/* Actual Email Body Boxed Container */}
              <div className="border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 dark:backdrop-blur-xl shadow-sm mt-8 mb-8 overflow-hidden">
                {/* overflow-x-auto clips wide newsletter tables; break-words handles long unbroken strings */}
                <div className="overflow-x-auto overflow-y-auto max-h-[70vh] p-8">
                  <div
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                    className="email-content-wrapper text-gray-900 dark:text-white text-[15px] leading-relaxed font-sans max-w-full break-words"
                  />
                </div>
              </div>

              {/* Bottom Action Pills */}
              <div className="flex gap-3 mt-6 mb-8">
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, "reply")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/10 dark:backdrop-blur-md border border-gray-300 dark:border-white/20 rounded-full text-[14px] font-bold hover:bg-gray-50 dark:hover:bg-white/20 transition text-gray-800 dark:text-white shadow-sm"
                >
                  <Reply size={18} strokeWidth={2} className="text-gray-600 dark:text-slate-400" /> Reply
                </button>
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, "forward")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/10 dark:backdrop-blur-md border border-gray-300 dark:border-white/20 rounded-full text-[14px] font-bold hover:bg-gray-50 dark:hover:bg-white/20 transition text-gray-800 dark:text-white shadow-sm"
                >
                  <Forward size={18} strokeWidth={2} className="text-gray-600 dark:text-slate-400" /> Forward
                </button>
              </div>

            </div>
          </div>
        </>
      )}
    </main>
  );
}