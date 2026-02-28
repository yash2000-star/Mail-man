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
  PanelLeft,
  Tag,
  PanelLeftClose,
  PanelLeftOpen
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
  isSidebarCollapsed?: boolean;
}

const LABEL_COLORS: Record<string, string> = {
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
  yellow: "bg-amber-500/20 text-amber-400 border-amber-500/20",
  red: "bg-rose-500/20 text-rose-400 border-rose-500/20",
  gray: "bg-zinc-500/20 text-zinc-400 border-zinc-500/20",
  indigo: "bg-indigo-500/20 text-indigo-400 border-indigo-500/20",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/20",
};

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
  isSidebarCollapsed,
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

  // Helper to calculate unread counts dynamically
  const getUnreadCount = (tabName: string) => {
    if (tabName === "All") return emails.filter(e => !e.isRead).length;
    if (tabName === "Important" || tabName === "Updates" || tabName === "Promotions") {
      return emails.filter(e => !e.isRead && e.category?.toLowerCase() === tabName.toLowerCase()).length;
    }
    // For custom labels
    return emails.filter(e => !e.isRead && e.appliedLabels && e.appliedLabels.includes(tabName)).length;
  };

  const Badge = ({ count }: { count: number }) => {
    if (count <= 0) return null;
    return (
      <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-black ml-1.5 self-center">
        {count}
      </span>
    );
  };

  return (
    <section
      className={`h-screen overflow-y-auto bg-zinc-950 border-r border-zinc-800/60 flex-col transition-all duration-300 ${selectedEmail
        ? "hidden md:flex md:w-[450px] shrink-0"
        : "flex flex-1 w-full"
        }`}
    >
      {/* THE HEADER */}
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-md p-3 pt-4 border-b border-zinc-800/60 flex flex-col gap-3">
        {/* ROW 1: ACTIONS & SEARCH */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-0.5 shrink-0">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition"
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isSidebarCollapsed ? <PanelLeftOpen size={18} strokeWidth={1.5} /> : <PanelLeftClose size={18} strokeWidth={1.5} />}
              </button>
            )}
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="p-2.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition disabled:opacity-50"
            >
              <RefreshCw
                size={18}
                strokeWidth={1.5}
                className={isSyncing ? "animate-spin text-amber-500" : ""}
              />
            </button>
          </div>

          <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-800/60 rounded-full px-4 py-2.5 focus-within:border-amber-500/50 shadow-inner transition-all group min-w-[150px]">
            <Search size={20} strokeWidth={1.5} className="text-zinc-500 mr-3 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch(searchQuery);
              }}
              className="bg-transparent border-none outline-none text-[15.5px] font-medium text-zinc-100 w-full placeholder-zinc-600"
            />
            {/* Filter settings inside search */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition shrink-0 ml-1"
              title="Show search options"
            >
              <SlidersHorizontal size={18} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex items-center shrink-0 pl-1">
            <button
              onClick={onOpenAi}
              className="p-2.5 text-amber-500 hover:bg-amber-500/10 rounded-full transition border border-transparent hover:border-amber-500/20"
              title="AI Assistant"
            >
              <Sparkles size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ADVANCED SEARCH FILTER HOVER CONTAINER */}
        <div className="relative w-full h-0">

          {/* The Floating Menu */}
          {isFilterOpen && (
            <div className="absolute right-0 top-0 mt-2 w-80 bg-zinc-900 border border-zinc-800/60 shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 font-sans">
              {/* Header & Clear Button */}
              <div className="px-5 py-4 bg-zinc-950/50 border-b border-zinc-800/60 flex justify-between items-center">
                <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
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
                  className="text-xs text-amber-500 hover:text-amber-400 font-bold"
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
                      className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition">
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
                      className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition">
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
                      className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition">
                      Has attachment
                    </span>
                  </label>
                </div>

                {/* The Date Dropdown */}
                <div className="pt-4 border-t border-zinc-800/60">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">
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
                    className="w-full bg-zinc-950 border border-zinc-800/60 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-amber-500/50 cursor-pointer"
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
        <div className="flex items-center justify-between font-medium mt-1 pl-2 pr-1 h-[40px] relative">
          <div className="flex items-center overflow-x-auto scrollbar-hide h-full flex-1 pr-12 relative">

            {/* --- NEW: RENDER CUSTOM LABELS AS TABS! --- */}
            {customLabels.map((label, idx) => {
              const count = getUnreadCount(label.name);
              return (
                <button
                  key={idx}
                  onClick={() => setActiveTab(label.name)}
                  className={`h-full px-4 flex items-center gap-1.5 whitespace-nowrap border-b-2 transition-all text-sm font-bold tracking-tight ${activeTab === label.name ? "text-white border-amber-500" : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/50"
                    }`}
                >
                  <Sparkles size={14} className={activeTab === label.name ? "text-amber-500" : "text-zinc-600"} />
                  {label.name}
                  <Badge count={count} />
                </button>
              );
            })}
            {/* ---------------------------------------- */}

            {visibleTabs.Important && (
              <button
                onClick={() => setActiveTab("Important")}
                className={`h-full px-3 flex items-center whitespace-nowrap border-b-2 transition-all text-sm font-bold tracking-tight ${activeTab === "Important" ? "text-white border-amber-500" : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/50"}`}
              >
                Important
                <Badge count={getUnreadCount("Important")} />
              </button>
            )}

            {visibleTabs.Updates && (
              <button
                onClick={() => setActiveTab("Updates")}
                className={`h-full px-4 flex items-center gap-2 whitespace-nowrap border-b-2 transition-all text-sm font-bold tracking-tight ${activeTab === "Updates" ? "text-white border-amber-500" : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/50"}`}
              >
                Updates
                <Badge count={getUnreadCount("Updates")} />
              </button>
            )}

            {visibleTabs.Promotions && (
              <button
                onClick={() => setActiveTab("Promotions")}
                className={`h-full px-4 flex items-center gap-2 whitespace-nowrap border-b-2 transition-all text-sm font-bold tracking-tight ${activeTab === "Promotions" ? "text-white border-amber-500" : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/50"}`}
              >
                Promotions
                <Badge count={getUnreadCount("Promotions")} />
              </button>
            )}

            <button
              onClick={() => setActiveTab("All")}
              className={`h-full px-4 flex items-center gap-2 whitespace-nowrap border-b-2 transition-all text-sm font-bold tracking-tight ${activeTab === "All" ? "text-white border-amber-500" : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/50"}`}
            >
              All
              <Badge count={getUnreadCount("All")} />
            </button>
          </div>

          {/* CUSTOMIZE TABS BUTTON (Next to Tabs) */}
          <div className="shrink-0 flex items-center absolute right-1 h-full z-10 bg-gradient-to-l from-zinc-950 via-zinc-950/90 to-transparent pl-8">
            {/* The Button */}
            <button
              onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
              className={`p-2 shrink-0 transition-all rounded-lg overflow-hidden ${isCustomizeOpen ? "text-amber-500 bg-amber-500/10" : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800"}`}
              title="Customize Views"
            >
              <ListFilter size={18} strokeWidth={1.5} />
            </button>

            {/* The Floating Menu (Only shows if isCustomizeOpen is true) */}
            {isCustomizeOpen && (
              <div className="absolute right-0 top-10 w-52 bg-zinc-900 border border-zinc-800/60 shadow-2xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 bg-zinc-950/50 border-b border-zinc-800/60 text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                  Visible Tabs
                </div>
                <div className="p-2 space-y-1">
                  {Object.keys(visibleTabs).map((tab) => (
                    <label
                      key={tab}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/50 rounded-lg cursor-pointer transition group"
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
                        className="accent-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200">
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
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-0 pb-20 md:pb-4 bg-zinc-950">
        {filteredEmails.length === 0 ? (

          /* --- THE EMPTY STATE UI --- */
          <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800/60 shadow-xl">
              <Coffee size={28} className="text-zinc-600" />
            </div>
            <h3 className="text-xl text-zinc-100 font-bold tracking-tight">Nothing to see here</h3>
            <p className="text-zinc-500 text-sm mt-2 max-w-[250px]">
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
                  <div className="px-5 py-4 text-[10px] font-black tracking-widest text-zinc-500 uppercase mt-4">
                    {currentCategory}
                  </div>
                )}
                <div
                  onClick={() => onSelect(email)}
                  className={`group relative flex items-center gap-4 py-3.5 px-3 border border-transparent border-b border-zinc-800/60 cursor-pointer transition-all duration-100 ${isSelected
                    ? "bg-zinc-900/80 border-l-2 border-l-amber-500 mx-2 rounded-r-2xl shadow-2xl z-10 my-1 border-t border-b border-r border-zinc-800/60"
                    : "bg-transparent hover:bg-zinc-900/50 hover:rounded-xl hover:border-transparent hover:mx-1 hover:px-4 hover:shadow-lg z-0 hover:z-10"
                    }`}
                >
                  <div className="flex items-center gap-2.5 pl-1 shrink-0">
                    <input
                      type="checkbox"
                      className={`w-4 h-4 rounded border-zinc-700 bg-zinc-900 accent-amber-500 cursor-pointer transition-all ${isSelected ? "block" : "hidden group-hover:block"}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(senderName)} flex items-center justify-center text-white font-bold text-sm shadow-lg ml-1 ${isSelected ? "hidden" : "group-hover:hidden"}`}>
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Wrapper to dynamically size available space so text doesn't hide behind icons */}
                  <div className="flex-1 min-w-0 pr-4 flex items-center justify-between">
                    <div className="min-w-0 flex flex-col justify-center gap-0.5 truncate flex-1">
                      <div className="flex justify-between items-baseline">
                        <h3 className={`text-sm truncate pr-2 ${isSelected ? "text-zinc-50 font-bold" : (email.isUnread ? "text-zinc-50 font-bold" : "text-zinc-400 font-semibold")}`}>
                          {senderName}
                        </h3>
                        {/* Time only shows if NOT hovering */}
                        <span className={`text-xs shrink-0 group-hover:hidden md:block md:group-hover:hidden ${isSelected ? "text-zinc-300 font-semibold" : (email.isUnread ? "text-zinc-200 font-bold" : "text-zinc-500 font-medium")}`}>
                          {formatTime(email.date)}
                        </span>
                      </div>

                      <div className={`text-sm truncate ${email.isUnread ? "text-zinc-200 font-bold" : "text-zinc-500 font-medium"}`}>
                        {email.subject}
                      </div>

                      {/* Inline Badges (e.g. Important, Promotional, Custom) */}
                      {email.appliedLabels && email.appliedLabels.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {email.appliedLabels.map((l: string, i: number) => {
                            const customLabel = customLabels.find(cl => cl.name === l);
                            const badgeColorClass = customLabel && LABEL_COLORS[customLabel.color]
                              ? LABEL_COLORS[customLabel.color]
                              : "text-amber-400 border-amber-500/20 bg-amber-500/10";

                            return (
                              <span key={i} className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border inline-flex items-center gap-1 ${badgeColorClass}`}>
                                {l}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Hover Actions - Pushes from the right side instead of overlaying purely */}
                    <div className="hidden group-hover:flex items-center gap-2 pl-4 shrink-0 relative z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); onAction(email.id, "tag"); }}
                        className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition" title="Tag"
                      >
                        <Tag size={18} strokeWidth={2} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAction(email.id, email.isStarred ? "unstar" : "star"); }}
                        className={`p-1.5 rounded-full transition ${email.isStarred ? "text-amber-500 hover:bg-amber-500/10" : "text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800"}`} title={email.isStarred ? "Unstar" : "Star"}
                      >
                        <Star size={18} strokeWidth={2} className={email.isStarred ? "fill-amber-500" : ""} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAction(email.id, "archive"); }}
                        className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition" title="Archive"
                      >
                        <Archive size={18} strokeWidth={2} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAction(email.id, "trash"); }}
                        className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition" title="Delete"
                      >
                        <Trash2 size={18} strokeWidth={2} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAction(email.id, email.isUnread ? "read" : "unread"); }}
                        className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition" title={email.isUnread ? "Mark as Read" : "Mark as Unread"}
                      >
                        {email.isUnread ? <MailOpen size={18} strokeWidth={2} /> : <Mail size={18} strokeWidth={2} />}
                      </button>
                    </div>
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