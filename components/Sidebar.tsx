"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

import {
  Inbox, ListTodo, Plus, Folder, Star, FileText, Send,
  Archive, AlertCircle, Trash2, MoreHorizontal, Minus,
  PanelRightClose, Settings, Pencil, Tag, Edit2, Check,
  Mail, ChevronRight, ChevronDown, ChevronUp, Sparkles, CheckSquare, LogOut, Menu, PanelLeftClose, PanelLeftOpen,
  X
} from "lucide-react";

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCompose?: () => void;
  activeMailbox: string;
  onSelectMailbox: (mailbox: string) => void;
  onOpenSettings?: () => void;
  onOpenSmartLabelModal?: () => void;
  customLabels?: any[];
  onDeleteCustomLabel?: (name: string) => void;
  unreadCount?: number;
  onClose?: () => void;
}

const LABEL_COLORS: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500",
  gray: "bg-zinc-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
};

export default function Sidebar({
  onCompose,
  activeMailbox,
  onSelectMailbox,
  onOpenSettings,
  onOpenSmartLabelModal,
  customLabels = [],
  onDeleteCustomLabel,
  isCollapsed = false,
  unreadCount = 0,
  onClose,
}: SidebarProps) {
  const { data: session } = useSession();
  const [isMailboxesOpen, setIsMailboxesOpen] = useState(true);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const NavItem = ({ icon, label, count, active = false, onClick, hasChevron = false }: any) => {
    if (isCollapsed) {
      return (
        <div className="flex justify-center mb-1">
          <button
            onClick={onClick}
            title={label}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${active
              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
              : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
          >
            {icon}
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-3 py-1.5 text-sm font-medium transition-all duration-200 ${active
          ? "bg-amber-500/10 text-amber-500 rounded-r-full -ml-3 pl-6 font-bold"
          : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 rounded-r-full -ml-3 pl-6"
          }`}
      >
        <div className="flex items-center gap-4">
          {hasChevron && !isCollapsed ? (
            <ChevronRight size={14} className="text-zinc-600 -ml-4" />
          ) : (
            <div className="w-[14px] -ml-4"></div>
          )}
          <span className={`${active ? "text-amber-500" : "text-zinc-500"}`}>
            {icon}
          </span>
          {!isCollapsed && <span className={active ? "text-amber-500" : "text-zinc-400 group-hover:text-zinc-200"}>{label}</span>}
        </div>
        {!isCollapsed && count && (
          <span className="text-xs text-zinc-600 pr-2">
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} flex flex-col bg-zinc-950 border-r border-zinc-800/60 h-screen transition-all duration-300 shrink-0 z-10 font-sans`}>

      {/* 1. Header */}
      <div className={`p-4 flex items-center h-16 shrink-0 mt-1 ${isCollapsed ? "justify-center px-0 mt-2" : "justify-between pl-[22px] pr-3"}`}>
        {isCollapsed ? (
          <div className="w-7 h-7 border border-zinc-700 flex items-center justify-center">
            <Mail size={13} strokeWidth={2} className="text-amber-500" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-zinc-700 flex items-center justify-center">
              <Mail size={13} strokeWidth={2} className="text-amber-500" />
            </div>
            <span className="font-bold tracking-tight text-white text-[15px]">Mail-man</span>
          </div>
        )}
        {/* Close button — only visible on mobile */}
        {onClose && !isCollapsed && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X size={20} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* 2. The Main Content Area */}
      <div className={`flex-1 flex flex-col bg-zinc-900 border border-zinc-800/60 transition-all duration-300 overflow-hidden relative ${isCollapsed ? "mx-2 rounded-2xl" : "mr-3 ml-1 rounded-2xl"}`}>

        {/* Compose Button */}
        <div className={`mb-5 mt-6 border-b border-zinc-800/60 pb-5 ${isCollapsed ? "flex justify-center mt-6 px-2" : "pl-4"}`}>
          <button
            onClick={onCompose}
            className={`
              bg-gradient-to-b from-amber-400 to-amber-600
              text-zinc-900 font-bold rounded-full transition-all flex items-center justify-center
              shadow-[inset_0px_1px_1px_rgba(255,255,255,0.4),0px_0px_15px_rgba(245,158,11,0.2)]
              hover:shadow-[inset_0px_1px_1px_rgba(255,255,255,0.5),0px_0px_20px_rgba(245,158,11,0.4)]
              hover:-translate-y-0.5
              ${isCollapsed ? "w-11 h-11 p-0" : "py-3 px-6 text-sm gap-3 w-fit"}
            `}
          >
            <div className="relative flex items-center justify-center">
              <Pencil size={18} strokeWidth={2} />
              <Sparkles size={10} strokeWidth={2} className="absolute -bottom-1 -right-1" />
            </div>
            {!isCollapsed && "Compose"}
          </button>
        </div>

        {/* 3. Main Navigation Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden hover:overflow-x-visible px-3 space-y-6 scrollbar-hide pb-4">

          {/* Smart Views */}
          <div className="space-y-0.5 relative">
            <NavItem icon={<Mail size={19} strokeWidth={1.5} />} label="Inbox" active={activeMailbox === "Inbox"} onClick={() => onSelectMailbox("Inbox")} count={unreadCount > 0 ? unreadCount.toString() : ""} hasChevron={true} />
            <NavItem icon={<ListTodo size={19} strokeWidth={1.5} />} label="To-do" active={activeMailbox === "To-do"} onClick={() => onSelectMailbox("To-do")} count="" hasChevron={false} />

            {/* --- RENDER CUSTOM LABELS WITH HOVER MENU --- */}
            {customLabels.map((label, idx) => {
              const isActive = activeMailbox === label.name;
              const dotColorClass = LABEL_COLORS[label.color] || "bg-blue-500";

              return (
                <div key={idx} className="relative group">
                  <button
                    onClick={() => onSelectMailbox(label.name)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium transition-all duration-200 ${isActive
                      ? "bg-amber-500/10 text-amber-500 font-bold rounded-r-full -ml-3 pl-7"
                      : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 rounded-r-full -ml-3 pl-7"
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-2.5 h-2.5 rounded-full outline outline-1 outline-gray-200 dark:outline-white/10 ${dotColorClass}`} />
                      {!isCollapsed && <span className="truncate pr-4">{label.name}</span>}
                    </div>
                  </button>

                  {!isCollapsed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === label.name ? null : label.name);
                      }}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all ${openMenuId === label.name
                        ? "opacity-100 bg-gray-200 dark:bg-white/20 text-gray-800 dark:text-white"
                        : "opacity-0 group-hover:opacity-100 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 dark:hover:text-white"
                        }`}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  )}

                  {openMenuId === label.name && !isCollapsed && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-56 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.2)] rounded-xl overflow-hidden z-[9999] animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col p-1.5 border-b border-gray-100 dark:border-white/10">
                          <button className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors rounded-lg">
                            <span>Edit</span>
                            <Edit2 size={14} className="text-gray-400 dark:text-slate-400" />
                          </button>
                          <button
                            onClick={() => {
                              if (onDeleteCustomLabel) onDeleteCustomLabel(label.name);
                              setOpenMenuId(null);
                            }}
                            className="flex items-center justify-between w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                          >
                            <span>Delete</span>
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="px-4 py-3 bg-zinc-950/50 flex justify-between items-center gap-2">
                          {Object.keys(LABEL_COLORS).map((colorKey) => (
                            <button
                              key={colorKey}
                              className={`w-4 h-4 rounded-full ${LABEL_COLORS[colorKey]} hover:scale-110 transition-transform flex items-center justify-center ${label.color === colorKey ? 'ring-2 ring-zinc-400 ring-offset-1 ring-offset-zinc-900' : ''}`}
                            >
                              {label.color === colorKey && <Check size={10} className="text-white drop-shadow-md" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {!isCollapsed && (
              <button
                onClick={onOpenSmartLabelModal}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-all mt-2 group border border-transparent hover:border-blue-500/20"
              >
                <Plus size={16} className="text-blue-500 group-hover:text-blue-400 transition-colors" />
                <Sparkles size={14} className="text-blue-500" />
                New Smart Label
              </button>
            )}
          </div>

          {/* Mailboxes Section */}
          <div className="mt-6">
            {!isCollapsed && (
              <div
                className="px-3 py-2 text-[12px] font-bold text-gray-500 dark:text-slate-400 flex items-center justify-between cursor-pointer hover:text-gray-700 dark:hover:text-white transition-colors"
                onClick={() => setIsMailboxesOpen(!isMailboxesOpen)}
              >
                <span>Mailboxes</span>
              </div>
            )}

            <div className={`space-y-1 mt-1 overflow-hidden hover:overflow-visible transition-all duration-300 ${isMailboxesOpen || isCollapsed ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <NavItem icon={<Inbox size={18} strokeWidth={1.5} />} label="All Mail" active={activeMailbox === "All Mail"} onClick={() => onSelectMailbox("All Mail")} hasChevron={true} />
              <NavItem icon={<Star size={18} strokeWidth={1.5} />} label="Starred" active={activeMailbox === "Starred"} onClick={() => onSelectMailbox("Starred")} />
              <NavItem icon={<FileText size={18} strokeWidth={1.5} />} label="Draft" active={activeMailbox === "Draft"} onClick={() => onSelectMailbox("Draft")} count="1" />
              <NavItem icon={<Send size={18} strokeWidth={1.5} />} label="Sent" active={activeMailbox === "Sent"} onClick={() => onSelectMailbox("Sent")} />
              <NavItem icon={<Archive size={18} strokeWidth={1.5} />} label="Archive" active={activeMailbox === "Archive"} onClick={() => onSelectMailbox("Archive")} />
              <NavItem icon={<AlertCircle size={18} strokeWidth={1.5} />} label="Spam" active={activeMailbox === "Spam"} onClick={() => onSelectMailbox("Spam")} />
              <NavItem icon={<Trash2 size={18} strokeWidth={1.5} />} label="Trash" active={activeMailbox === "Trash"} onClick={() => onSelectMailbox("Trash")} />

              {!isCollapsed && (
                <NavItem
                  icon={isMoreOpen ? <ChevronUp size={18} strokeWidth={1.5} /> : <ChevronDown size={18} strokeWidth={1.5} />}
                  label={isMoreOpen ? "Less" : "More"}
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                />
              )}

              {!isCollapsed && isMoreOpen && (
                <div className="pl-4 space-y-1 border-l ml-4 mt-2 animate-in slide-in-from-top-2 duration-200 border-gray-200 dark:border-white/10">
                  <NavItem icon={<Tag size={16} strokeWidth={1.5} className="-rotate-45" />} label="Conversation History" active={activeMailbox === "Conversation History"} onClick={() => onSelectMailbox("Conversation History")} />
                  <NavItem icon={<Tag size={16} strokeWidth={1.5} className="-rotate-45" />} label="GMass Auto Followup" active={activeMailbox === "GMass Auto Followup"} onClick={() => onSelectMailbox("GMass Auto Followup")} />
                  <NavItem icon={<Tag size={16} strokeWidth={1.5} className="-rotate-45" />} label="GMass Reports" active={activeMailbox === "GMass Reports"} onClick={() => onSelectMailbox("GMass Reports")} hasChevron={true} />
                  <NavItem icon={<Tag size={16} strokeWidth={1.5} className="-rotate-45" />} label="GMass Scheduled" active={activeMailbox === "GMass Scheduled"} onClick={() => onSelectMailbox("GMass Scheduled")} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. User Profile Footer */}
        <div className="p-4 bg-transparent mt-auto">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} bg-zinc-900/80 hover:bg-zinc-800/60 p-2 rounded-xl transition cursor-pointer group border border-zinc-800/60`}>

            {/* Left Side: Avatar + Name (or just Avatar if collapsed) */}
            <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? '' : 'pl-1'}`}>
              {session?.user?.image ? (
                <img src={session.user.image} alt="User" className="w-8 h-8 min-w-[32px] min-h-[32px] shrink-0 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 min-w-[32px] min-h-[32px] shrink-0 rounded-full bg-amber-600 flex items-center justify-center text-white font-semibold text-[14px]">
                  {session?.user?.name?.charAt(0) || "Y"}
                </div>
              )}

              {!isCollapsed && (
                <div className="flex flex-col truncate pr-2">
                  <span className="text-sm font-bold text-zinc-100 truncate">
                    {session?.user?.name || "Yash Nirwan"}
                  </span>
                  <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Free Plan</span>
                </div>
              )}
            </div>

            {/* Right Side: Action Icons (Hidden if collapsed) */}
            {!isCollapsed && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={onOpenSettings} className="text-zinc-400 hover:text-zinc-100 transition-colors p-1 rounded-lg" title="Settings">
                  <Settings size={18} strokeWidth={1.5} />
                </button>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="text-zinc-400 hover:text-zinc-100 transition-colors p-1 rounded-lg" title="Sign Out">
                  <LogOut size={18} strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </aside>
  );
}