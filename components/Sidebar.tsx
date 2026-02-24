"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

import {
  Inbox, ListTodo, Plus, Folder, Star, FileText, Send,
  Archive, AlertCircle, Trash2, MoreHorizontal, Minus,
  PanelRightClose, Settings, Pencil, Tag, Edit2, Check,
  Mail, ChevronRight, Sparkles, CheckSquare, LogOut
} from "lucide-react";

interface SidebarProps {
  isCollapsed?: boolean;
  onCompose?: () => void;
  activeMailbox: string;
  onSelectMailbox: (mailbox: string) => void;
  onOpenSettings?: () => void;
  onOpenSmartLabelModal?: () => void;
  customLabels?: any[]; // <-- Added custom labels array
  onDeleteCustomLabel?: (name: string) => void; // <-- Added delete function
}

// Color mapper for the dots
const LABEL_COLORS: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
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
  isCollapsed = false
}: SidebarProps) {
  const { data: session } = useSession();
  const [isMailboxesOpen, setIsMailboxesOpen] = useState(true);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // State to track which label's 3-dot menu is currently open
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const NavItem = ({ icon, label, count, active = false, onClick, hasChevron = false }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2 text-[14px] transition-all duration-200 ${active
        ? "bg-[#f1f3f4] text-blue-500 rounded-lg"
        : "text-[#3c4043] rounded-lg hover:bg-[#f1f3f4]"
        }`}>
      <div className="flex items-center gap-3">
        {hasChevron && !isCollapsed ? (
          <ChevronRight size={14} className="text-gray-400 -ml-1" />
        ) : (
          <div className="w-[14px] -ml-1"></div>
        )}
        <span className={`${active ? "text-[#1a73e8]" : "text-[#444746]"}`}>
          {icon}
        </span>
        {!isCollapsed && <span className={active ? "text-[#1a73e8]" : "text-[#444746]"}>{label}</span>}
      </div>
      {!isCollapsed && count && (
        <span className="text-xs text-gray-500 pr-1">
          {count}
        </span>
      )}
    </button>
  );
  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} hidden md:flex flex-col bg-[#f8f9fa] h-screen transition-all duration-300 shrink-0 z-10`}>

      {/* 1. Header & Collapse Toggle */}
      <div className="p-4 flex items-center justify-between h-16 mt-2 pb-0">
        {!isCollapsed && (
          <h1 className="text-[17px] font-bold text-[#001d35] flex items-center gap-2">
            <div className="bg-[#1a73e8] p-1 rounded-[4px]">
              <Check className="text-white w-4 h-4" strokeWidth={3} />
            </div>
            Filo Mail
          </h1>
        )}
        {isCollapsed && (
          <div className="mx-auto bg-[#1a73e8] p-1 rounded-[4px]">
            <Check className="text-white w-4 h-4" strokeWidth={3} />
          </div>
        )}
      </div>

      {/* 2. Primary Action: Compose Button */}
      <div className="px-5 mb-6 mt-4">
        <button
          onClick={onCompose}
          className="bg-white hover:bg-gray-50 text-gray-800 text-[15px] font-medium py-3 px-6 rounded-full transition-all shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-gray-100 hover:shadow-[0_2px_5px_rgba(0,0,0,0.15)] flex items-center justify-center sm:justify-start gap-3">
          <Pencil size={18} strokeWidth={1.5} className="text-gray-900" />
          {!isCollapsed && "Compose"}
        </button>
      </div>

      {/* 3. Main Navigation Area */}
      <div className="flex-1 overflow-y-auto px-3 space-y-8 scrollbar-hide pb-4">

        {/* Smart Views */}
        <div className="space-y-1">

          <NavItem icon={<Mail size={18} strokeWidth={1.5} />} label="Inbox" active={activeMailbox === "Inbox"} onClick={() => onSelectMailbox("Inbox")} count="49" hasChevron={true} />
          <NavItem icon={<ListTodo size={18} strokeWidth={1.5} />} label="To-do" active={activeMailbox === "To-do"} onClick={() => onSelectMailbox("To-do")} count="9" hasChevron={false} />


          {/* --- RENDER CUSTOM LABELS WITH HOVER MENU --- */}
          {customLabels.map((label, idx) => {
            const isActive = activeMailbox === label.name;
            const dotColorClass = LABEL_COLORS[label.color] || "bg-blue-500";

            return (
              <div key={idx} className="relative group">
                <button
                  onClick={() => onSelectMailbox(label.name)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-[14px] font-medium transition-all duration-200 ${isActive ? "bg-[#f2f6fc] text-[#0b57d0] font-bold rounded-r-full -ml-3 pl-7" : "text-gray-700 hover:bg-gray-100 rounded-r-full -ml-3 pl-7"
                    }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full outline outline-1 outline-gray-200 ${dotColorClass}`} />
                    {!isCollapsed && <span className="truncate pr-4">{label.name}</span>}
                  </div>
                </button>

                {/* The 3 Dots Hover Button */}
                {!isCollapsed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === label.name ? null : label.name);
                    }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all ${openMenuId === label.name ? "opacity-100 bg-gray-200 text-gray-800" : "opacity-0 group-hover:opacity-100 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
                      }`}
                  >
                    <MoreHorizontal size={14} />
                  </button>
                )}

                {/* The Popover Menu (Based exactly on Screenshot 288) */}
                {openMenuId === label.name && !isCollapsed && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                    <div className="absolute left-full ml-2 top-0 w-56 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">

                      <div className="flex flex-col p-1.5 border-b border-gray-100">
                        <button className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition">
                          <span>Edit</span>
                          <Edit2 size={14} className="text-gray-400" />
                        </button>
                        <button
                          onClick={() => {
                            if (onDeleteCustomLabel) onDeleteCustomLabel(label.name);
                            setOpenMenuId(null);
                          }}
                          className="flex items-center justify-between w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <span>Delete</span>
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Color Changers */}
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
              className="px-3 py-2 text-[12px] font-bold text-gray-500 flex items-center justify-between cursor-pointer hover:text-gray-700 transition-colors"
              onClick={() => setIsMailboxesOpen(!isMailboxesOpen)}
            >
              <span>Mailboxes</span>
            </div>
          )}

          <div className={`space-y-1 mt-1 overflow-hidden transition-all duration-300 ${isMailboxesOpen || isCollapsed ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <NavItem icon={<Inbox size={18} strokeWidth={1.5} />} label="All Mail" active={activeMailbox === "All Mail"} onClick={() => onSelectMailbox("All Mail")} hasChevron={true} />
            <NavItem icon={<Star size={18} strokeWidth={1.5} />} label="Starred" active={activeMailbox === "Starred"} onClick={() => onSelectMailbox("Starred")} />
            <NavItem icon={<FileText size={18} strokeWidth={1.5} />} label="Draft" active={activeMailbox === "Draft"} onClick={() => onSelectMailbox("Draft")} count="1" />
            <NavItem icon={<Send size={18} strokeWidth={1.5} />} label="Sent" active={activeMailbox === "Sent"} onClick={() => onSelectMailbox("Sent")} />
            <NavItem icon={<Archive size={18} strokeWidth={1.5} />} label="Archive" active={activeMailbox === "Archive"} onClick={() => onSelectMailbox("Archive")} />
            <NavItem icon={<AlertCircle size={18} strokeWidth={1.5} />} label="Spam" active={activeMailbox === "Spam"} onClick={() => onSelectMailbox("Spam")} />
            <NavItem icon={<Trash2 size={18} strokeWidth={1.5} />} label="Trash" active={activeMailbox === "Trash"} onClick={() => onSelectMailbox("Trash")} />

            {!isCollapsed && (
              <NavItem
                icon={isMoreOpen ? <MoreHorizontal size={18} strokeWidth={1.5} /> : <MoreHorizontal size={18} strokeWidth={1.5} />}
                label={isMoreOpen ? "Less" : "Less"}
                onClick={() => setIsMoreOpen(!isMoreOpen)}
              />
            )}

            {!isCollapsed && isMoreOpen && (
              <div className="pl-4 space-y-1 border-l ml-4 mt-2 animate-in slide-in-from-top-2 duration-200 border-gray-200">
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
      <div className="p-4 bg-[#f8f9fa] mt-auto">
        <div className="flex items-center justify-between bg-white hover:bg-gray-50 p-2 rounded-xl transition cursor-pointer group shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 overflow-hidden pl-1">
            {session?.user?.image ? (
              <img src={session.user.image} alt="User" className="w-10 h-10 rounded-full shrink-0 object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#8b23a5] flex items-center justify-center text-white font-semibold shrink-0 text-lg">
                {session?.user?.name?.charAt(0) || "Y"}
              </div>
            )}

            {!isCollapsed && (
              <div className="flex flex-col truncate pr-2">
                <span className="text-[14px] font-bold text-gray-900 truncate">
                  {session?.user?.name || "Yash Nirwan"}
                </span>
                <span className="text-[12px] text-gray-500 font-medium">Free Plan</span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-1">
              <button onClick={onOpenSettings} className="text-gray-700 hover:text-gray-900 transition p-1.5 hover:bg-gray-100 rounded-lg" title="Settings">
                <Settings size={20} strokeWidth={1.5} />
              </button>
              <button onClick={() => signOut({ callbackUrl: '/' })} className="text-gray-700 hover:text-gray-900 transition p-1.5 hover:bg-gray-100 rounded-lg" title="Sign Out">
                <LogOut size={20} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      </div>

    </aside>
  );
}