"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";


import { 
  Inbox, CheckSquare, Plus, Folder, Star, File, Send, 
  Archive, AlertOctagon, Trash2, MoreHorizontal, Minus,
  PanelLeftClose, PanelLeft, Settings, PenSquare, Tag
} from "lucide-react";

export default function Sidebar() {
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMailboxesOpen, setIsMailboxesOpen] = useState(true);
  
  // NEW: The state for the "More/Less" toggle!
  const [isMoreOpen, setIsMoreOpen] = useState(false); 

  // Upgraded NavItem to accept our new SVG icons
  const NavItem = ({ icon, label, count, active = false, onClick }: any) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      active 
        ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm" 
        : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100 border border-transparent"
    }`}>
      <div className="flex items-center gap-3">
        {/* The icon now renders directly here */}
        <span className={`${active ? "text-purple-400" : "text-zinc-400"}`}>
          {icon}
        </span>
        {!isCollapsed && <span>{label}</span>}
      </div>
      {!isCollapsed && count && (
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${active ? 'bg-purple-500/20 text-purple-300' : 'bg-zinc-800 text-zinc-500'}`}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} hidden md:flex flex-col bg-zinc-950 border-r border-zinc-800/50 h-screen transition-all duration-300 shrink-0 z-10`}>
      
      {/* 1. Header & Collapse Toggle */}
      <div className="p-4 flex items-center justify-between h-16">
        {!isCollapsed && (
          <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
            <span className="text-purple-500 text-xl flex items-center justify-center">⚡</span> EZee Mail
          </h1>
        )}
        {isCollapsed && <span className="text-purple-500 text-xl mx-auto flex items-center justify-center mt-1">⚡</span>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-zinc-500 hover:text-white transition p-1.5 rounded-lg hover:bg-zinc-900"
        >
          {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* 2. Primary Action: Compose Button */}
      <div className="px-4 mb-6 mt-2">
        <button className="w-full bg-zinc-100 hover:bg-white text-black font-bold py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-[1.02] flex items-center justify-center gap-2">
          <PenSquare size={18} />
          {!isCollapsed && "Compose"}
        </button>
      </div>

      {/* 3. Main Navigation Area */}
      <div className="flex-1 overflow-y-auto px-3 space-y-8 scrollbar-hide pb-4">
        
        {/* Smart Views */}
        <div className="space-y-1">
          <NavItem icon={<Inbox size={18} />} label="Inbox" count="49" active={true} />
          <NavItem icon={<CheckSquare size={18} />} label="To-do" count="7" />
          {!isCollapsed && (
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors mt-2 group">
              <Plus size={18} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" /> 
              New Smart Label
            </button>
          )}
        </div>

        {/* Mailboxes Section */}
        <div>
          {!isCollapsed && (
            <div 
              className="px-3 py-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between cursor-pointer hover:text-zinc-300 transition-colors"
              onClick={() => setIsMailboxesOpen(!isMailboxesOpen)}
            >
              <span>Mailboxes</span>
              <span className="text-xs transition-transform duration-200" style={{ transform: isMailboxesOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
            </div>
          )}
          
          <div className={`space-y-1 mt-1 overflow-hidden transition-all duration-300 ${isMailboxesOpen || isCollapsed ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <NavItem icon={<Folder size={18} />} label="All Mail" />
            <NavItem icon={<Star size={18} />} label="Starred" />
            <NavItem icon={<File size={18} />} label="Draft" />
            <NavItem icon={<Send size={18} />} label="Sent" />
            <NavItem icon={<Archive size={18} />} label="Archive" />
            <NavItem icon={<AlertOctagon size={18} />} label="Spam" />
            <NavItem icon={<Trash2 size={18} />} label="Trash" />
            
            {/* THE MORE / LESS TOGGLE */}
            {!isCollapsed && (
              <NavItem 
                icon={isMoreOpen ? <Minus size={18} /> : <MoreHorizontal size={18} />} 
                label={isMoreOpen ? "Less" : "More"} 
                onClick={() => setIsMoreOpen(!isMoreOpen)}
              />
            )}

            {/* THE EXTRA FOLDERS (Only shows when 'More' is clicked) */}
            {!isCollapsed && isMoreOpen && (
              <div className="pl-4 space-y-1 border-l-2 border-zinc-800/50 ml-4 mt-2 animate-in slide-in-from-top-2 duration-200">
                 <NavItem icon={<Tag size={16} />} label="Conversation History" />
                 <NavItem icon={<Tag size={16} />} label="Scheduled Emails" />
                 <NavItem icon={<Tag size={16} />} label="Important Receipts" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. User Profile Footer */}
      <div className="p-4 border-t border-zinc-800/50 bg-zinc-950">
        <div className="flex items-center justify-between bg-zinc-900/40 hover:bg-zinc-900 p-2 rounded-xl border border-zinc-800/50 transition cursor-pointer group">
          <div className="flex items-center gap-3 overflow-hidden">
            {session?.user?.image ? (
              <img src={session.user.image} alt="User" className="w-9 h-9 rounded-full border border-zinc-700 shrink-0 object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                {session?.user?.name?.charAt(0) || "Y"}
              </div>
            )}
            
            {!isCollapsed && (
              <div className="flex flex-col truncate pr-2">
                <span className="text-sm font-bold text-white truncate group-hover:text-purple-100 transition-colors">
                  {session?.user?.name || "Yash Nirwan"}
                </span>
                <span className="text-[10px] text-purple-400 font-medium uppercase tracking-wider">Free Plan</span>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <button 
              onClick={() => signOut({ callbackUrl: '/' })} 
              className="text-zinc-500 hover:text-zinc-300 transition p-1.5 hover:bg-zinc-800 rounded-lg" 
              title="Settings & Sign Out"
            >
              <Settings size={18} />
            </button>
          )}
        </div>
      </div>

    </aside>
  );
}