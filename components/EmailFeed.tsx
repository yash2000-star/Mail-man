"use client";

import { Search, RefreshCw, SlidersHorizontal, ListFilter, Sparkles, Archive, Trash2, Mail } from "lucide-react";

interface EmailFeedProps {
  emails: any[];
  onSelect: (email: any) => void;
  selectedEmail: any;
  onRefresh: () => void;
  isSyncing: boolean;
}

export default function EmailFeed({ emails, onSelect, selectedEmail, onRefresh, isSyncing }: EmailFeedProps) {
  
  // Generates a random premium gradient based on the sender's name
  const getAvatarGradient = (name: string) => {
    const char = name?.charAt(0).toUpperCase() || "A";
    if (/[A-G]/.test(char)) return "from-blue-500 to-cyan-500";
    if (/[H-N]/.test(char)) return "from-purple-500 to-pink-500";
    if (/[O-U]/.test(char)) return "from-orange-500 to-red-500";
    return "from-emerald-500 to-teal-500";
  };

  return (
    <section className={`h-screen overflow-y-auto bg-zinc-950 border-r border-zinc-800/50 flex-col transition-all duration-300 ${
      selectedEmail ? 'hidden md:flex md:w-[450px] shrink-0' : 'flex flex-1 w-full'
    }`}>
      
      {/* THE STICKY HEADER */}
      <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md p-4 border-b border-zinc-800/50">
        
        {/* SEARCH & FILTER */}
        <div className="flex items-center gap-2 mb-4">
          
          <button 
          onClick={onRefresh}
          disabled={isSyncing}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition shrink-0 disabled:opacity-50"
          >
            <RefreshCw size={18} className={isSyncing ? "animate-spin text-purple-500" : ""} />
          </button>
          
          <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 focus-within:border-purple-500/50 transition-colors">
            <Search size={16} className="text-zinc-500 mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-zinc-500"
            />
          </div>

          {/* ADVANCED SEARCH FILTER (Next to Search Bar) */}
          <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition shrink-0" title="Advanced Search">
            <ListFilter size={18} />
          </button>
        </div>

        {/* TABS & CUSTOMIZE */}
        <div className="flex items-center justify-between text-sm font-medium">
          <div className="flex gap-5 overflow-x-auto scrollbar-hide">
            <button className="text-white border-b-2 border-purple-500 pb-2 px-1 whitespace-nowrap">Important</button>
            <button className="text-zinc-500 hover:text-zinc-300 pb-2 px-1 flex items-center gap-2 whitespace-nowrap">
              Updates <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">1 New</span>
            </button>
            <button className="text-zinc-500 hover:text-zinc-300 pb-2 px-1 flex items-center gap-2 whitespace-nowrap">
              Promotions <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">1 New</span>
            </button>
            <button className="text-zinc-500 hover:text-zinc-300 pb-2 px-1 whitespace-nowrap">All</button>
          </div>

          {/* CUSTOMIZE TABS BUTTON (Next to Tabs) */}
          <button className="text-zinc-500 hover:text-zinc-300 pb-2 pl-2 shrink-0" title="Customize Views">
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* THE EMAIL LIST */}
      <div className="p-2 space-y-1">
        
        {/* Mock Time Divider */}
        <div className="px-3 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
          Last 7 Days
        </div>

        {emails.map((email: any) => {
          const isSelected = selectedEmail?.id === email.id;
          const senderName = email.from.split("<")[0].replace(/"/g, '').trim();

          return (
            <div 
              key={email.id}
              onClick={() => onSelect(email)}
              className={`group relative flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-200 border ${
                isSelected 
                  ? 'bg-purple-500/10 border-purple-500/20 shadow-sm' 
                  : 'bg-transparent border-transparent hover:bg-zinc-900'
              }`}
            >
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(senderName)} flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-inner`}>
                {senderName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0 pr-20 md:pr-10">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`text-sm truncate pr-2 ${isSelected ? 'text-purple-300 font-bold' : 'text-zinc-200 font-semibold'}`}>
                    {senderName}
                  </h3>
                  <span className="text-xs text-zinc-500 shrink-0">Feb 16</span>
                </div>
                <div className="text-sm text-zinc-400 truncate flex items-center gap-2">
                  <span className="truncate">{email.subject}</span>
                </div>
              </div>

              {/* Hover Actions */}
              <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 shadow-xl border border-zinc-800 p-1.5 rounded-lg flex items-center gap-1 hidden md:flex">
                <button className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition" title="Archive"><Archive size={14} /></button>
                <button className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition" title="Delete"><Trash2 size={14} /></button>
                <button className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition" title="Mark as Unread"><Mail size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}