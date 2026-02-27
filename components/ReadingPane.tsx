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
    if (/[A-G]/.test(char)) return "from-blue-600 to-cyan-600";
    if (/[H-N]/.test(char)) return "from-purple-600 to-pink-600";
    if (/[O-U]/.test(char)) return "from-orange-600 to-amber-600";
    return "from-emerald-600 to-teal-600";
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
    <main className={`flex-1 min-w-0 flex-col bg-zinc-950 relative border-l border-zinc-800/60 ${!selectedEmail ? "hidden" : "flex"}`}>
      {selectedEmail && (
        <>
          {/* --- TOP TOOLBAR --- */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md w-full gap-2 transition-shadow">


            {/* Left Actions - Styled identically to the screenshot with grouped pills and dividers */}
            <div className="flex items-center gap-3 flex-1 min-w-0 pr-2 py-1 pl-2">

              {/* Group 1: Collapse/Back (Circle) */}
              <button
                onClick={onBack}
                title="Close"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800/60 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition shadow-xl"
              >
                <ChevronsRight size={18} strokeWidth={2} />
              </button>

              {/* Group 2: Reply / Forward (Pill with Divider) */}
              <div className="flex items-center h-10 bg-zinc-900 rounded-full px-1.5 border border-zinc-800/60 shadow-xl overflow-hidden">
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, "reply")}
                  className="w-9 h-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
                  title="Reply"
                >
                  <Reply size={18} strokeWidth={2} />
                </button>
                <div className="w-px h-5 bg-zinc-800 mx-1" />
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, "forward")}
                  className="w-9 h-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
                  title="Forward"
                >
                  <Forward size={18} strokeWidth={2} />
                </button>
              </div>

              {/* Group 3: Tag / Star / Archive / Trash (Pill with Dividers) */}
              <div className="flex items-center h-10 bg-zinc-900 rounded-full px-1.5 border border-zinc-800/60 shadow-xl overflow-hidden">
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, "tag")}
                  className="w-9 h-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
                  title="Label"
                >
                  <Tag size={18} strokeWidth={2} />
                </button>
                <div className="w-px h-5 bg-zinc-800 mx-1" />
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, selectedEmail.isStarred ? 'unstar' : 'star')}
                  className={`w-9 h-full flex items-center justify-center transition hover:bg-zinc-800 ${selectedEmail.isStarred ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-400 hover:text-zinc-100'}`}
                  title={selectedEmail.isStarred ? "Unstar" : "Star"}
                >
                  <Star size={18} strokeWidth={2} className={selectedEmail.isStarred ? "fill-amber-500" : ""} />
                </button>
                <div className="w-px h-5 bg-zinc-800 mx-1" />
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, 'archive')}
                  className="w-9 h-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
                  title="Archive"
                >
                  <Archive size={18} strokeWidth={2} />
                </button>
                <div className="w-px h-5 bg-zinc-800 mx-1" />
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, 'trash')}
                  className="w-9 h-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
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
                  className={`w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 border transition shadow-xl ${isMoreMenuOpen ? "border-amber-500/50 text-amber-500 bg-amber-500/10" : "border-zinc-800/60 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"}`}
                >
                  <MoreHorizontal size={18} strokeWidth={2} />
                </button>

                {/* --- FLOATING DROPDOWN MENU --- */}
                {isMoreMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-800/60 shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 py-2">
                      <div className="flex flex-col">
                        <button className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition">
                          <span>Create Todo</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-600 font-bold">Ctrl+⇧+T</span>
                            <ListTodo size={16} strokeWidth={1.5} className="text-zinc-500" />
                          </div>
                        </button>

                        <div className="h-px bg-zinc-800 w-full my-1"></div>

                        <button onClick={() => { onAction && onAction(selectedEmail.id, "spam"); setIsMoreMenuOpen(false); }} className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition">
                          <span>Spam</span>
                          <AlertCircle size={16} strokeWidth={1.5} className="text-zinc-500" />
                        </button>

                        <div className="h-px bg-zinc-800 w-full my-1"></div>

                        <button onClick={() => { onAction && onAction(selectedEmail.id, "unread"); setIsMoreMenuOpen(false); }} className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition">
                          <span>Mark as Unread</span>
                          <Mail size={16} strokeWidth={1.5} className="text-zinc-500" />
                        </button>

                        <div className="h-px bg-zinc-800 w-full my-1"></div>

                        <button className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition">
                          <span>No Split</span>
                          <Maximize2 size={16} strokeWidth={1.5} className="text-zinc-500" />
                        </button>

                        <div className="h-px bg-zinc-800 w-full my-1"></div>

                        <button className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition">
                          <span>Filter mail like this</span>
                          <Filter size={16} strokeWidth={1.5} className="text-zinc-500" />
                        </button>

                        <div className="h-px bg-zinc-800 w-full my-1"></div>

                        <button className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition">
                          <span>Print</span>
                          <Printer size={16} strokeWidth={1.5} className="text-zinc-500" />
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
                className="w-9 h-9 flex items-center justify-center rounded-full text-amber-500 hover:bg-amber-500/10 transition disabled:opacity-50"
                title="AI Actions"
              >
                <Sparkles size={18} strokeWidth={2.5} className={isAiThinking ? "animate-pulse" : ""} />
              </button>
            </div>
          </div>

          {/* --- SCROLLABLE CONTENT --- */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-950 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
            <div className="max-w-3xl mx-auto mt-2">

              {/* Email Title & Badge */}
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold text-zinc-50 leading-tight tracking-tight">
                  {selectedEmail.subject || "(No Subject)"}
                </h1>
                {selectedEmail.category ? (
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20">
                    {selectedEmail.category}
                  </span>
                ) : (
                  <button
                    onClick={() => /* Add a single-email scan trigger here */ null}
                    className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-900 border border-zinc-800/60 hover:text-amber-500 hover:border-amber-500/50 flex items-center gap-2 transition-all"
                  >
                    <RefreshCw size={12} strokeWidth={3} /> Scan
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
                      <h3 className="text-base font-bold text-zinc-100">
                        {senderName}
                      </h3>
                    </div>
                    <p className="text-sm text-zinc-500 flex items-center gap-1 mt-0.5">
                      <span className="font-bold text-zinc-400">To:</span> Me <ChevronDown size={14} className="text-zinc-600" />
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-500 font-medium tracking-tight">12:55 PM (1 hours ago)</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onAction && onAction(selectedEmail.id, "reply")}
                      className="text-zinc-500 hover:text-zinc-100 transition hover:bg-zinc-800 p-2 rounded-full"
                      title="Reply"
                    >
                      <Reply size={18} strokeWidth={1.5} />
                    </button>
                    <button className="text-zinc-500 hover:text-zinc-100 transition hover:bg-zinc-800 p-2 rounded-full"><MoreHorizontal size={18} strokeWidth={1.5} /></button>
                  </div>
                </div>
              </div>

              {/* AI Summary Block */}
              {selectedEmail.summary ? (
                <div className="bg-zinc-900 border border-zinc-800/60 rounded-3xl p-6 mb-8 mt-2 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50" />
                  <div className="flex justify-between items-center mb-5">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
                      AI Generated Summary
                    </h4>
                    <div className="flex gap-2">
                      <button className="text-zinc-600 hover:text-amber-500 transition"><ThumbsUp size={16} strokeWidth={2} /></button>
                      <button className="text-zinc-600 hover:text-amber-500 transition"><ThumbsDown size={16} strokeWidth={2} /></button>
                    </div>
                  </div>
                  <ul className="text-[15px] text-zinc-300 leading-relaxed font-medium space-y-3 list-disc pl-5 marker:text-amber-500/40">
                    {selectedEmail.summary.split('.').filter((s: string) => s.trim().length > 0).map((sentence: string, idx: number) => (
                      <li key={idx} className="pl-1">{sentence.trim()}.</li>
                    ))}
                  </ul>

                  {/* Footer Action Pill */}
                  <div className="mt-6">
                    <button className="px-5 py-2 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-500 text-[11px] font-black uppercase tracking-widest rounded-full transition-all">
                      Check activity
                    </button>
                  </div>
                </div>
              ) : (
                /* Optional: Show a subtle skeleton while batching is in progress */
                <div className="bg-zinc-900/50 border border-zinc-800/40 border-dashed rounded-3xl p-6 mb-8 mt-2">
                  <p className="text-sm font-bold text-zinc-500 animate-pulse flex items-center gap-3">
                    <RefreshCw size={16} className="animate-spin text-amber-500" />
                    Mail-Man is summarizing...
                  </p>
                </div>
              )}
              {/* AI Smart Draft Block */}
              {selectedEmail.draft_reply && (
                <div className="bg-zinc-900 border border-zinc-800/60 rounded-3xl p-6 mb-8 animate-in slide-in-from-bottom-3 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-[60px] rounded-full" />
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <Sparkles size={18} className="text-amber-500" />
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                        AI Recommended Draft
                      </h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigator.clipboard.writeText(selectedEmail.draft_reply)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-[11px] font-black uppercase tracking-widest py-2 px-4 rounded-full transition shadow-xl"
                      >
                        Copy
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={isSending || sendSuccess}
                        className={`
                          bg-gradient-to-b from-amber-400 to-amber-600
                          text-zinc-900 text-[11px] font-black uppercase tracking-widest py-2 px-5 rounded-full transition-all flex items-center shadow-lg
                          ${isSending ? "opacity-50 grayscale" : sendSuccess ? "from-emerald-400 to-emerald-600" : "hover:-translate-y-0.5 hover:shadow-amber-500/20"}
                        `}
                      >
                        {isSending ? "Sending..." : sendSuccess ? "Sent! ✓" : "Send Reply 🚀"}
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-950/50 p-5 rounded-2xl text-zinc-300 text-[14px] whitespace-pre-wrap border border-zinc-800/40 leading-relaxed font-mono mt-4 shadow-inner min-h-[100px]">
                    {selectedEmail.draft_reply}
                  </div>
                </div>
              )}

              {/* Actual Email Body Boxed Container */}
              <div className="mt-8 mb-8 p-6 md:p-8 bg-zinc-950 rounded-2xl">
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-zinc-200/10">
                  {/* overflow-x-auto clips wide newsletter tables; break-words handles long unbroken strings */}
                  <div className="overflow-x-auto overflow-y-auto max-h-[70vh] p-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400">
                    <div
                      dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                      className="email-content-wrapper text-zinc-900 text-[15px] leading-relaxed font-sans max-w-full break-words prose"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Action Pills */}
              <div className="flex gap-4 mt-8 mb-12">
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, "reply")}
                  className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-full px-6 py-2 transition-colors text-sm font-bold shadow-xl"
                >
                  <Reply size={18} strokeWidth={2} className="text-zinc-500" /> Reply
                </button>
                <button
                  onClick={() => onAction && onAction(selectedEmail.id, "forward")}
                  className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-full px-6 py-2 transition-colors text-sm font-bold shadow-xl"
                >
                  <Forward size={18} strokeWidth={2} className="text-zinc-500" /> Forward
                </button>
              </div>

            </div>
          </div>
        </>
      )}
    </main>
  );
}