"use client";

import { useState } from "react";
// Added 'Check' to the imports!
import { Clock, Info, ThumbsDown, Trash2, Sparkles, AlertCircle, Check, ListFilter } from "lucide-react";

// 1. Updated interface to accept our 4 new target actions
interface ToDoDashboardProps {
  tasks?: any[];
  onToggleTask?: (id: string) => void;
  onDeleteTask?: (id: string) => void;
  onViewEmail?: (emailId: string) => void;
  onScan?: () => void;
  isScanning?: boolean;
}

export default function ToDoDashboard({
  tasks = [],
  onToggleTask,
  onDeleteTask,
  onViewEmail,
  onScan,
  isScanning = false
}: ToDoDashboardProps) {
  const [activeTab, setActiveTab] = useState("active");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const displayTasks = tasks.filter((task) => task.status === activeTab);

  return (
    <div className="flex-1 h-screen bg-zinc-950 flex flex-col animate-in fade-in duration-300">

      {/* Top Header Navigation */}
      <div className="h-20 px-8 flex items-center justify-between shrink-0 bg-transparent z-10 pt-4 border-b border-zinc-800/60">

        {/* Active / Done Toggle & Filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800/60 rounded-full shadow-2xl">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-5 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-full transition-all ${activeTab === "active" ? "bg-amber-500 text-black shadow-lg" : "text-zinc-500 hover:text-zinc-100"
                }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab("done")}
              className={`px-5 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-full transition-all ${activeTab === "done" ? "bg-amber-500 text-black shadow-lg" : "text-zinc-500 hover:text-zinc-100"
                }`}
            >
              Done
            </button>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              title="Filter"
              className={`w-9 h-9 flex items-center justify-center rounded-full border border-zinc-800 transition-all ${isFilterOpen ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "bg-zinc-900 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800"}`}
            >
              <ListFilter size={16} strokeWidth={2.5} />
            </button>

            {/* Filter Popover Menu */}
            {isFilterOpen && (
              <>
                <div className="relative inset-0 z-50" onClick={() => setIsFilterOpen(false)} />
                <div className="absolute left-0 top-[125%] w-60 bg-zinc-900 border border-zinc-800/60 shadow-2xl rounded-2xl overflow-hidden z-[9999] animate-in fade-in zoom-in-95 duration-200 pb-2 p-1">

                  {/* Status Section */}
                  <div className="flex flex-col pt-3 pb-2 border-b border-zinc-800/60">
                    <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest px-4 mb-2">Status</span>
                    <button className="flex items-center justify-between w-full px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition rounded-lg" onClick={() => setIsFilterOpen(false)}>
                      <span>To Respond</span>
                    </button>
                    <button className="flex items-center justify-between w-full px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition rounded-lg" onClick={() => setIsFilterOpen(false)}>
                      <span>Awaiting Reply</span>
                    </button>
                    <button className="flex items-center justify-between w-full px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition rounded-lg" onClick={() => setIsFilterOpen(false)}>
                      <span>Meeting Update</span>
                    </button>
                    <button className="flex items-center justify-between w-full px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition rounded-lg" onClick={() => setIsFilterOpen(false)}>
                      <span>Approval Needed</span>
                    </button>
                  </div>

                  {/* Priority Section */}
                  <div className="flex flex-col pt-3 pb-2 border-b border-zinc-800/60">
                    <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest px-4 mb-2">Priority</span>
                    <button className="flex items-center justify-between w-full px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition rounded-lg" onClick={() => setIsFilterOpen(false)}>
                      <span>Low</span>
                    </button>
                    <button className="flex items-center justify-between w-full px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition rounded-lg" onClick={() => setIsFilterOpen(false)}>
                      <span>Medium</span>
                    </button>
                    <button className="flex items-center justify-between w-full px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition rounded-lg" onClick={() => setIsFilterOpen(false)}>
                      <span>High</span>
                    </button>
                  </div>

                  {/* Email Account Section */}
                  <div className="flex flex-col pt-3 pb-1">
                    <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest px-4 mb-2">Email Account</span>
                    <button className="flex items-center justify-between w-full px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition rounded-lg" onClick={() => setIsFilterOpen(false)}>
                      <span className="truncate">yashnirwan18@gmail.com</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* AI Auto-Scan Button */}
        <button
          onClick={onScan}
          disabled={isScanning}
          className={`w-9 h-9 flex items-center justify-center rounded-full border border-zinc-800 transition-all ${isScanning ? "opacity-50 cursor-not-allowed animate-pulse" : "bg-zinc-900 text-amber-500 hover:bg-zinc-800 hover:scale-105"}`}
          title="Scan inbox for new tasks"
        >
          <Sparkles size={16} className={isScanning ? "animate-spin" : ""} strokeWidth={2.5} />
        </button>
      </div>

      {/* Main Task List Area */}
      <div className="flex-1 overflow-y-auto px-8 py-4 scrollbar-hide">
        <div className="max-w-4xl">

          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6">
            {activeTab === "active" ? "Past Due & Upcoming" : "Completed Tasks"}
          </h2>

          <div className="space-y-0 relative">

            {displayTasks.length === 0 ? (
              <div className="text-center py-20 bg-transparent border border-zinc-800/40 border-dashed rounded-3xl">
                <p className="text-zinc-500 font-bold text-sm">
                  No {activeTab} tasks found. The Mail-Man AI will extract them automatically as emails arrive!
                </p>
              </div>
            ) : (
              displayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => { if (onViewEmail) onViewEmail(task.emailId); }}
                  className="group relative z-10 flex items-start gap-4 py-4 border-b border-zinc-900 hover:bg-zinc-900/40 transition-all cursor-pointer -mx-4 px-4 rounded-xl"
                >

                  {/* TARGET 1: Interactive Checkbox */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleTask) onToggleTask(task.id);
                    }}
                    className={`w-4 h-4 rounded border flex-shrink-0 mt-1 transition-all flex items-center justify-center cursor-pointer ${task.status === "done"
                      ? "bg-amber-500 border-amber-500"
                      : "border-zinc-700 bg-zinc-900 group-hover:border-zinc-500"
                      }`}
                  >
                    {task.status === "done" && <Check size={11} className="text-black" strokeWidth={4} />}
                  </div>

                  {/* Task Details */}
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      {task.isUrgent && <span className="text-red-500 font-bold select-none" title="Urgent">‼️</span>}
                      {/* Add line-through styling if the task is done */}
                      <h3 className={`text-sm font-bold tracking-tight transition-all ${task.status === "done"
                        ? "text-zinc-600 line-through"
                        : "text-zinc-100"
                        }`}>
                        {task.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Clock size={12} className={task.isPastDue && task.status !== "done" ? "text-amber-500" : "text-zinc-500"} />
                      <span className={`text-xs font-bold ${task.isPastDue && task.status !== "done" ? "text-amber-500" : "text-zinc-500"}`}>
                        {task.date}
                      </span>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">

                    {/* TARGET 2: View Source Email */}
                    <button
                      onClick={(e) => { e.stopPropagation(); if (onViewEmail) onViewEmail(task.emailId); }}
                      className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition" title="View Source Email">
                      <Info size={16} />
                    </button>

                    {/* TARGET 3: Not a Task (Deleting for now) */}
                    <button
                      onClick={(e) => { e.stopPropagation(); if (onDeleteTask) onDeleteTask(task.id); }}
                      className="p-1.5 text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition" title="Not a task (Train AI)">
                      <ThumbsDown size={16} />
                    </button>

                    {/* TARGET 4: Delete Task */}
                    <button
                      onClick={(e) => { e.stopPropagation(); if (onDeleteTask) onDeleteTask(task.id); }}
                      className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Delete Task">
                      <Trash2 size={16} />
                    </button>
                  </div>

                </div>
              ))
            )}

          </div>
        </div>
      </div>

    </div>
  );
}