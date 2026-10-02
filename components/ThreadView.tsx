"use client";

import { useState } from "react";
import { Forward, Paperclip, Reply } from "lucide-react";
import EmailBodyFrame from "./EmailBodyFrame";
import type { MailMessage } from "@/lib/mail-types";

interface ThreadViewProps {
  messages: MailMessage[];
  /** The message the user clicked in the list; it starts expanded */
  focusId?: string;
  onReply?: (message: MailMessage) => void;
  onForward?: (message: MailMessage) => void;
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function formatWhen(message: MailMessage): string {
  const d = message.timestamp ? new Date(message.timestamp) : new Date(message.date);
  if (Number.isNaN(d.getTime())) return message.date;
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * A conversation, oldest first, Gmail-style: the latest message, unread
 * messages and the one clicked are open; the rest collapse to one line and
 * expand on click.
 */
export default function ThreadView({ messages, focusId, onReply, onForward }: ThreadViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(
    messages
      .filter((m, i) => i === messages.length - 1 || m.isUnread || m.id === focusId)
      .map((m) => m.id),
  ));

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOpen = expanded.size === messages.length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          {messages.length} messages in this conversation
        </p>
        <button
          onClick={() => setExpanded(allOpen ? new Set([messages[messages.length - 1].id]) : new Set(messages.map((m) => m.id)))}
          className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="space-y-3">
        {messages.map((message) => {
          const isOpen = expanded.has(message.id);
          return (
            <article
              key={message.id}
              aria-label={`Message from ${message.from}`}
              className={`rounded-2xl border transition ${isOpen ? "border-zinc-200 bg-white" : "border-zinc-200/70 bg-zinc-50 hover:bg-zinc-100"}`}
            >
              <button
                onClick={() => toggle(message.id)}
                aria-expanded={isOpen}
                className="w-full flex items-start gap-3 px-5 py-4 text-left"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {(message.from || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={`text-sm truncate ${message.isUnread ? "font-black text-zinc-900" : "font-bold text-zinc-800"}`}>
                      {message.from}
                      {isOpen && <span className="font-normal text-zinc-500"> &lt;{message.fromEmail}&gt;</span>}
                    </span>
                    <span className="text-xs text-zinc-500 shrink-0">{formatWhen(message)}</span>
                  </div>
                  {isOpen ? (
                    <p className="text-xs text-zinc-500 truncate">to {message.to || "me"}{message.cc ? `, cc ${message.cc}` : ""}</p>
                  ) : (
                    <p className="text-sm text-zinc-500 truncate">{message.snippet}</p>
                  )}
                </div>
                {!isOpen && message.attachments.length > 0 && <Paperclip size={14} className="text-zinc-400 mt-1 shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-5 pb-5">
                  <EmailBodyFrame
                    html={message.body || message.snippet}
                    isHtml={message.body ? message.bodyIsHtml : false}
                    title={`Message from ${message.from}`}
                  />

                  {message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {message.attachments.map((a) => (
                        <a
                          key={a.attachmentId}
                          href={`/api/gmail/messages/${message.id}/attachments/${encodeURIComponent(a.attachmentId)}`}
                          download={a.filename}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 text-sm max-w-[260px]"
                        >
                          <Paperclip size={14} className="shrink-0 text-zinc-500" />
                          <span className="truncate font-medium">{a.filename}</span>
                          <span className="shrink-0 text-xs text-zinc-500">{formatSize(a.size)}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => onReply?.(message)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-zinc-300 text-zinc-700 text-sm font-bold hover:bg-zinc-100 transition"
                    >
                      <Reply size={14} /> Reply
                    </button>
                    <button
                      onClick={() => onForward?.(message)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-zinc-300 text-zinc-700 text-sm font-bold hover:bg-zinc-100 transition"
                    >
                      <Forward size={14} /> Forward
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
