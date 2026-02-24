"use client";

import { useState } from "react";
import {
  Search,
  RefreshCw,
  SlidersHorizontal,
  ListFilter,
  Sparkles,
  Archive,
  Trash2,
  Mail,
  Star,
  Coffee,
  MailOpen,
  PanelLeft // Added for header
} from "lucide-react";

interface EmailFeedProps {
  emails: any[];
  onSelect: (email: any) => void;
  selectedEmail: any;
  onRefresh: () => void;
  isSyncing: boolean;
  onAction: (id: string, action: string) => void;
  onSearch: (query: string) => void;
  onOpenAi: () => void;
  customLabels?: any[];
  onToggleSidebar?: () => void;
}

export default function EmailFeed({
  emails,
  onSelect,
  selectedEmail,
  onRefresh,
  isSyncing,
  onAction,
  onSearch,
  onOpenAi,
  customLabels = [],
  onToggleSidebar,
}: EmailFeedProps) {
  // The memory for what the user is searching and what tab is active!
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    unread: false,
    toMe: false,
    ccMe: false,
    hasAttachment: false,
    dateRange: "all",
  });

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [visibleTabs, setVisibleTabs] = useState({
    Important: true,
    Updates: true,
    Promotions: true,
  });

  // Generates a random premium gradient based on the sender's name
  const getAvatarGradient = (name: string) => {
    const char = name?.charAt(0).toUpperCase() || "A";
    if (/[A-G]/.test(char)) return "from-blue-500 to-cyan-500";
    if (/[H-N]/.test(char)) return "from-purple-500 to-pink-500";
    if (/[O-U]/.test(char)) return "from-orange-500 to-red-500";
    return "from-emerald-500 to-teal-500";
  };

  // Google ugly timestamp into clean human time
  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();

    // Check if the email was sent today
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Filter ENGINE
  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      email.subject?.toLowerCase().includes(searchQuery.toLocaleLowerCase()) ||
      email.from?.toLowerCase().includes(searchQuery.toLocaleLowerCase());

    let matchesTab = true;
    if (activeTab === "Important") {
      matchesTab = email.category?.toLowerCase() === "important";
    } else if (activeTab === "Updates") {
      matchesTab =
        email.category?.toLowerCase() === "updates" ||
        email.category?.toLowerCase() === "social";
    } else if (activeTab === "Promotions") {
      matchesTab = email.category?.toLowerCase() === "promotions";
    } else if (activeTab !== "All") {
      // NEW: IT MUST BE A CUSTOM SMART LABEL!
      matchesTab = email.appliedLabels && email.appliedLabels.includes(activeTab);
    }

    let matchesAdvanced = true;

    if (advancedFilters.unread && !email.isUnread) matchesAdvanced = false;
    if (advancedFilters.hasAttachment && !email.hasAttachment)
      matchesAdvanced = false;
    if (advancedFilters.toMe && !email.to?.includes("@"))
      matchesAdvanced = false;
    if (advancedFilters.ccMe && !email.cc?.includes("@"))
      matchesAdvanced = false;

    //Date Filter
    if (advancedFilters.dateRange !== "all" && email.date) {
      const emailDate = new Date(email.date);
      const now = new Date();
      const diffInDays =
        (now.getTime() - emailDate.getTime()) / (1000 * 3600 * 24);

      if (advancedFilters.dateRange === "week" && diffInDays < 7)
        matchesAdvanced = false;
      if (advancedFilters.dateRange === "month" && diffInDays < 30)
        matchesAdvanced = false;
      if (advancedFilters.dateRange === "6months" && diffInDays < 180)
        matchesAdvanced = false;
    }

    return matchesSearch && matchesTab && matchesAdvanced;
  });

  return (
    <section
      className={`h-screen overflow-y-auto bg-white border-r border-gray-100 flex-col transition-all duration-300 ${selectedEmail
        ? "hidden md:flex md:w-[450px] shrink-0"
        : "flex flex-1 w-full"
        }`}
    >
      {/* THE HEADER */}
      <div className="sticky top-0 z-10 bg-white p-3 pt-4 border-b border-gray-100 flex flex-col gap-3">
        {/* ROW 1: ACTIONS & SEARCH */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={onToggleSidebar}
              className="p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-full transition"
              title="Expand Sidebar"
            >
              <PanelLeft size={20} strokeWidth={1.5} />
            </button>
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="p-2.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition disabled:opacity-50"
            >
              <RefreshCw
                size={18}
                strokeWidth={1.5}
                className={isSyncing ? "animate-spin text-blue-500" : ""}
              />
            </button>
          </div>

          <div className="flex-1 flex items-center bg-[#f1f3f4] rounded-full px-4 py-2.5 focus-within:bg-white focus-within:shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] transition-all border border-transparent group min-w-[150px]">
            <Search size={20} strokeWidth={1.5} className="text-gray-500 mr-3 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch(searchQuery);
              }}
              className="bg-transparent border-none outline-none text-[15.5px] font-medium text-gray-900 w-full placeholder-gray-500 placeholder:font-normal"
            />
            {/* Filter settings inside search */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition shrink-0 ml-1"
              title="Show search options"
            >
              <SlidersHorizontal size={18} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex items-center shrink-0 pl-1">
            <button
              onClick={onOpenAi}
              className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-full transition bg-blue-50 md:bg-transparent shadow-sm border border-blue-100 md:border-transparent md:shadow-none"
              title="AI Assistant"
            >
              <Sparkles size={20} strokeWidth={1.5} className="text-[#1a73e8]" />
            </button>
          </div>
        </div>

        {/* ADVANCED SEARCH FILTER HOVER CONTAINER */}
        <div className="relative w-full h-0">

          {/* The Floating Menu */}
          {isFilterOpen && (
            <div className="absolute right-0 top-0 mt-2 w-[340px] bg-white border border-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 font-sans">
              {/* Header & Clear Button */}
              <div className="px-5 py-4 bg-gray-50/80 border-b border-gray-100 flex justify-between items-center">
                <span className="text-[13px] font-bold text-gray-700 tracking-wide uppercase">
                  Advanced Search
                </span>
                <button
                  onClick={() =>
                    setAdvancedFilters({
                      unread: false,
                      toMe: false,
                      ccMe: false,
                      hasAttachment: false,
                      dateRange: "all",
                    })
                  }
                  className="text-[13px] text-blue-600 hover:text-blue-800 transition font-bold"
                >
                  Clear All
                </button>
              </div>

              {/* The Checkboxes */}
              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={advancedFilters.unread}
                      onChange={(e) =>
                        setAdvancedFilters({
                          ...advancedFilters,
                          unread: e.target.checked,
                        })
                      }
                      className="accent-[#1a73e8] w-[18px] h-[18px] rounded cursor-pointer"
                    />
                    <span className="text-[14.5px] font-medium text-gray-700 group-hover:text-gray-900 transition">
                      Unread mail only
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={advancedFilters.toMe}
                      onChange={(e) =>
                        setAdvancedFilters({
                          ...advancedFilters,
                          toMe: e.target.checked,
                        })
                      }
                      className="accent-[#1a73e8] w-[18px] h-[18px] rounded cursor-pointer"
                    />
                    <span className="text-[14.5px] font-medium text-gray-700 group-hover:text-gray-900 transition">
                      Sent directly to me
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={advancedFilters.hasAttachment}
                      onChange={(e) =>
                        setAdvancedFilters({
                          ...advancedFilters,
                          hasAttachment: e.target.checked,
                        })
                      }
                      className="accent-[#1a73e8] w-[18px] h-[18px] rounded cursor-pointer"
                    />
                    <span className="text-[14.5px] font-medium text-gray-700 group-hover:text-gray-900 transition">
                      Has attachment
                    </span>
                  </label>
                </div>

                {/* The Date Dropdown */}
                <div className="pt-4 border-t border-gray-100">
                  <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">
                    Date Range
                  </span>
                  <select
                    value={advancedFilters.dateRange}
                    onChange={(e) =>
                      setAdvancedFilters({
                        ...advancedFilters,
                        dateRange: e.target.value,
                      })
                    }
                    className="w-full bg-white border border-gray-300 text-gray-800 text-[14px] font-medium rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">Any time</option>
                    <option value="week">Older than a week</option>
                    <option value="month">Older than a month</option>
                    <option value="6months">Older than 6 months</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TABS & CUSTOMIZE */}
        <div className="flex items-center justify-between font-medium mt-1 pl-2 pr-1 h-[40px]">
          <div className="flex items-center overflow-x-auto scrollbar-hide h-full">

            {/* --- NEW: RENDER CUSTOM LABELS AS TABS! --- */}
            {customLabels.map((label, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(label.name)}
                className={`h-full px-4 flex items-center gap-1.5 whitespace-nowrap border-b-[3px] transition-colors text-[14.5px] ${activeTab === label.name ? "text-[#1a73e8] border-[#1a73e8] font-bold" : "text-gray-600 font-semibold hover:bg-gray-50 border-transparent hover:text-gray-900 rounded-t-lg"
                  }`}
              >
                <Sparkles size={14} className={activeTab === label.name ? "text-blue-500" : "text-gray-500"} />
                {label.name}
              </button>
            ))}
            {/* ---------------------------------------- */}

            {visibleTabs.Important && (
              <button
                onClick={() => setActiveTab("Important")}
                className={`h-full px-3 whitespace-nowrap border-b-[3px] transition-colors text-[14.5px] ${activeTab === "Important" ? "text-gray-900 border-[#1a73e8] font-bold" : "text-gray-600 font-semibold hover:bg-gray-50 border-transparent hover:text-gray-900 rounded-t-lg"}`}
              >
                Important
              </button>
            )}

            {visibleTabs.Updates && (
              <button
                onClick={() => setActiveTab("Updates")}
                className={`h-full px-4 flex items-center gap-2 whitespace-nowrap border-b-[3px] transition-colors text-[14.5px] ${activeTab === "Updates" ? "text-gray-900 border-[#1a73e8] font-bold" : "text-gray-600 font-semibold hover:bg-gray-50 border-transparent hover:text-gray-900 rounded-t-lg"}`}
              >
                Updates
              </button>
            )}

            {visibleTabs.Promotions && (
              <button
                onClick={() => setActiveTab("Promotions")}
                className={`h-full px-4 flex items-center gap-2 whitespace-nowrap border-b-[3px] transition-colors text-[14.5px] ${activeTab === "Promotions" ? "text-gray-900 border-[#1a73e8] font-bold" : "text-gray-600 font-semibold hover:bg-gray-50 border-transparent hover:text-gray-900 rounded-t-lg"}`}
              >
                Promotions
                <span className="px-[5px] py-[2px] rounded uppercase text-[9px] font-bold bg-blue-50 text-blue-500">2 New</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("All")}
              className={`h-full px-4 flex items-center gap-2 whitespace-nowrap border-b-[3px] transition-colors text-[14.5px] ${activeTab === "All" ? "text-gray-900 border-[#1a73e8] font-bold" : "text-gray-600 font-semibold hover:bg-gray-50 border-transparent hover:text-gray-900 rounded-t-lg"}`}
            >
              All
              <span className="px-[5px] py-[2px] rounded uppercase text-[9px] font-bold bg-blue-50 text-blue-500">2 New</span>
            </button>
          </div>

          {/* CUSTOMIZE TABS BUTTON (Next to Tabs) */}
          <div className="relative h-full flex items-center">
            {/* The Button */}
            <button
              onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
              className={`p-2 shrink-0 transition-colors rounded hover:bg-gray-50 ${isCustomizeOpen ? "text-[#1a73e8] bg-blue-50" : "text-gray-500"}`}
              title="Customize Views"
            >
              <ListFilter size={18} strokeWidth={1.5} />
            </button>

            {/* The Floating Menu (Only shows if isCustomizeOpen is true) */}
            {isCustomizeOpen && (
              <div className="absolute right-0 top-10 w-52 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Visible Tabs
                </div>
                <div className="p-2 space-y-1">
                  {Object.keys(visibleTabs).map((tab) => (
                    <label
                      key={tab}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer transition group"
                    >
                      <input
                        type="checkbox"
                        checked={visibleTabs[tab as keyof typeof visibleTabs]}
                        onChange={() => {
                          setVisibleTabs((prev) => ({
                            ...prev,
                            [tab]: !prev[tab as keyof typeof visibleTabs],
                          }));

                          if (activeTab === tab && visibleTabs[tab as keyof typeof visibleTabs]) setActiveTab("All");
                        }}
                        className="accent-[#1a73e8] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[14px] font-medium text-gray-700 group-hover:text-gray-900">
                        {tab}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* THE EMAIL LIST */}
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-0 pb-20 bg-white">
        {filteredEmails.length === 0 ? (

          /* --- THE EMPTY STATE UI --- */
          <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <Coffee size={28} className="text-gray-400" />
            </div>
            <h3 className="text-[17px] text-gray-800 font-semibold tracking-tight">Nothing to see here</h3>
            <p className="text-gray-500 text-[14px] mt-1.5 max-w-[250px]">
              {searchQuery ? "No emails match your search." : "This folder is completely empty. Enjoy your free time!"}
            </p>
          </div>

        ) : (

          /* --- THE NORMAL EMAIL LIST --- */
          filteredEmails.map((email: any, index: number) => {
            const isSelected = selectedEmail?.id === email.id;
            const senderName = email.from.split("<")[0].replace(/"/g, "").trim();

            const getGroupCategory = (dateString: string) => {
              if (!dateString) return "Older";
              const date = new Date(dateString);
              const now = new Date();

              const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              if (isToday) return "Today";

              const yesterday = new Date(now);
              yesterday.setDate(now.getDate() - 1);
              const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
              if (isYesterday) return "Yesterday";

              const diffTime = Math.abs(now.getTime() - date.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays <= 7) return "Last 7 Days";

              return date.toLocaleString('default', { month: 'long' });
            };

            const currentCategory = getGroupCategory(email.date);
            const prevCategory = index > 0 ? getGroupCategory(filteredEmails[index - 1].date) : null;
            const showSeparator = currentCategory !== prevCategory;

            return (
              <div key={email.id}>
                {showSeparator && (
                  <div className="px-5 py-2.5 text-[11px] font-bold text-gray-500 mt-2 tracking-wide">
                    {currentCategory}
                  </div>
                )}
                <div
                  onClick={() => onSelect(email)}
                  className={`group relative flex items-center gap-4 py-2.5 px-3 border-b border-gray-100 last:border-0 cursor-pointer transition-colors duration-[50ms] ${isSelected
                    ? "bg-[#eaf1fb]" // Exact blue from Filo Rakuten ID screenshot
                    : "bg-white hover:bg-[#f8f9fa] hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] z-0 hover:z-10"
                    }`}
                >
                  <div className="flex items-center gap-2.5 pl-1 shrink-0">
                    <input type="checkbox" className="w-[18px] h-[18px] rounded-[4px] border-gray-300 accent-[#1a73e8] cursor-pointer opacity-30 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()} />
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(senderName)} flex items-center justify-center text-white font-semibold text-[13px] shadow-sm ml-1`}>
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 pr-20 md:pr-10 flex flex-col justify-center gap-0.5">
                    <div className="flex justify-between items-baseline">
                      <h3 className={`text-[14px] truncate pr-2 ${isSelected ? "text-gray-900 font-bold" : (email.isUnread ? "text-gray-900 font-bold" : "text-gray-600 font-semibold")}`}>
                        {senderName}
                      </h3>
                      <span className={`text-[12px] shrink-0 ${isSelected ? "text-gray-800 font-semibold" : (email.isUnread ? "text-gray-900 font-bold" : "text-gray-500 font-medium")}`}>
                        {formatTime(email.date)}
                      </span>
                    </div>

                    <div className={`text-[13.5px] truncate ${email.isUnread ? "text-gray-900 font-bold" : "text-gray-500 font-medium"}`}>
                      {email.subject}
                    </div>

                    {/* Inline Badges (e.g. Important, Promotional) */}
                    {email.appliedLabels && email.appliedLabels.length > 0 && (
                      <div className="flex gap-1.5 mt-1">
                        {email.appliedLabels.map((l: string, i: number) => (
                          <span key={i} className="text-[10.5px] font-bold px-2 py-0.5 rounded-full border text-blue-500 border-blue-200 bg-blue-50 inline-flex items-center gap-1">
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm shadow-[-10px_0_10px_rgba(255,255,255,0.9)] pl-2 py-0.5 flex items-center gap-1 hidden md:flex rounded-l-full">
                    <button
                      onClick={(e) => { e.stopPropagation(); onAction(email.id, "archive"); }}
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition" title="Archive"
                    >
                      <Archive size={16} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAction(email.id, email.isStarred ? "unstar" : "star"); }}
                      className={`p-1.5 rounded-full transition ${email.isStarred ? "text-[#f4b400] hover:bg-yellow-50" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`} title={email.isStarred ? "Unstar" : "Star"}
                    >
                      <Star size={16} strokeWidth={1.5} className={email.isStarred ? "fill-[#f4b400]" : ""} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAction(email.id, "trash"); }}
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition" title="Delete"
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAction(email.id, email.isUnread ? "read" : "unread"); }}
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition" title={email.isUnread ? "Mark as Read" : "Mark as Unread"}
                    >
                      {email.isUnread ? <MailOpen size={16} strokeWidth={1.5} /> : <Mail size={16} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}