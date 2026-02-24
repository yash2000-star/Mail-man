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
    <div className="flex-1 h-screen bg-white flex flex-col animate-in fade-in duration-300">

      {/* Top Header Navigation */}
      <div className="h-20 px-8 flex items-center justify-between shrink-0 bg-white z-10 pt-4">

        {/* Active / Done Toggle & Filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center p-1.5 bg-gray-50/80 border border-gray-100 rounded-[20px] shadow-sm">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-5 py-2 text-[14px] font-bold rounded-[16px] transition-all ${activeTab === "active" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab("done")}
              className={`px-5 py-2 text-[14px] font-bold rounded-[16px] transition-all ${activeTab === "done" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Done
            </button>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              title="Filter"
              className={`w-10 h-10 flex items-center justify-center rounded-full border border-gray-100 shadow-sm transition-all ${isFilterOpen ? "bg-gray-100 text-gray-800" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              <ListFilter size={18} />
            </button>

            {/* Filter Popover Menu */}
            {isFilterOpen && (
              <>
                <div className="relative inset-0 z-50" onClick={() => setIsFilterOpen(false)} />
                <div className="absolute left-0 top-[115%] w-56 bg-white border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-[16px] overflow-hidden z-[9999] animate-in fade-in zoom-in-95 duration-200 pb-2">

                  {/* Status Section */}
                  <div className="flex flex-col pt-3 pb-2 border-b border-gray-100">
                    <span className="text-[13px] text-gray-400 font-medium px-4 mb-1">Status</span>
                    <button className="flex items-center justify-between w-full px-4 py-1.5 text-[14px] text-gray-700 hover:bg-gray-50 transition" onClick={() => setIsFilterOpen(false)}>
                      <span>To Respond</span>
                    </button>
                    <button className="flex items-center justify-between w-full px-4 py-1.5 text-[14px] text-gray-700 hover:bg-gray-50 transition" onClick={() => setIsFilterOpen(false)}>
                      <span>Awaiting Reply</span>
                    </button>
                    <button className="flex items-center justify-between w-full px-4 py-1.5 text-[14px] text-gray-700 hover:bg-gray-50 transition" onClick={() => setIsFilterOpen(false)}>
                      <span>Meeting Update</span>
                    </button>
                    <button className="flex items-center justify-between w-full px-4 py-1.5 text-[14px] text-gray-700 hover:bg-gray-50 transition" onClick={() => setIsFilterOpen(false)}>
                      <span>Approval Needed</span>
                    </button>
                    <button className="flex items-center justify-between w-full px-4 py-1.5 text-[14px] text-gray-700 hover:bg-gray-50 transition" onClick={() => setIsFilterOpen(false)}>
                      <span>Suggested Done</span>
                    </button>
                  </div>

                  {/* Priority Section */}
                  <div className="flex flex-col pt-3 pb-2 border-b border-gray-100">
                    <span className="text-[13px] text-gray-400 font-medium px-4 mb-1">Priority</span>
                    <button className="flex items-center justify-between w-full px-4 py-1.5 text-[14px] text-gray-700 hover:bg-gray-50 transition" onClick={() => setIsFilterOpen(false)}>
                      <span>Low</span>
                    </button>
                    <button className="flex items-center justify-between w-full px-4 py-1.5 text-[14px] text-gray-700 hover:bg-gray-50 transition" onClick={() => setIsFilterOpen(false)}>
                      <span>Medium</span>
                    </button>
                    <button className="flex items-center justify-between w-full px-4 py-1.5 text-[14px] text-gray-700 hover:bg-gray-50 transition" onClick={() => setIsFilterOpen(false)}>
                      <span>High</span>
                    </button>
                  </div>

                  {/* Email Account Section */}
                  <div className="flex flex-col pt-3 pb-1">
                    <span className="text-[13px] text-gray-400 font-medium px-4 mb-1">Email Account</span>
                    <button className="flex items-center justify-between w-full px-4 py-1.5 text-[14px] text-gray-700 hover:bg-gray-50 transition" onClick={() => setIsFilterOpen(false)}>
                      <span>yashnirwan18@gmail.com</span>
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
          className={`w-10 h-10 flex items-center justify-center rounded-full border border-gray-100 bg-white text-blue-500 hover:bg-gray-50 shadow-sm transition-all ${isScanning ? "opacity-50 cursor-not-allowed animate-pulse" : "hover:scale-105"}`}
          title="Scan inbox for new tasks"
        >
          <Sparkles size={18} className={isScanning ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Main Task List Area */}
      <div className="flex-1 overflow-y-auto px-8 py-4 scrollbar-hide">
        <div className="max-w-4xl">

          <h2 className="text-[18px] font-extrabold text-gray-900 mb-5 tracking-tight">
            {activeTab === "active" ? "Past Due & Upcoming" : "Completed Tasks"}
          </h2>

          <div className="space-y-0 relative">

            {displayTasks.length === 0 ? (
              <div className="text-center py-20 relative z-10 bg-white">
                <p className="text-gray-500 font-medium">
                  No {activeTab} tasks found. The Mail-Man AI will extract them automatically as emails arrive!
                </p>
              </div>
            ) : (
              displayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => { if (onViewEmail) onViewEmail(task.emailId); }}
                  className="group relative z-10 flex items-start gap-3 py-4 border-b border-gray-100 hover:bg-gray-50 transition-all cursor-pointer -mx-4 px-4"
                >

                  {/* TARGET 1: Interactive Checkbox */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleTask) onToggleTask(task.id);
                    }}
                    className={`w-[18px] h-[18px] rounded-[4px] border flex-shrink-0 mt-0.5 transition-colors flex items-center justify-center cursor-pointer ${task.status === "done"
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-300 bg-white group-hover:border-gray-400"
                      }`}
                  >
                    {task.status === "done" && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>

                  {/* Task Details */}
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      {task.isUrgent && <span className="text-red-500 font-bold select-none" title="Urgent">‼️</span>}
                      {/* Add line-through styling if the task is done */}
                      <h3 className={`text-[14px] font-medium transition-all ${task.status === "done"
                        ? "text-gray-400 line-through"
                        : "text-gray-700"
                        }`}>
                        {task.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock size={12} className={task.isPastDue && task.status !== "done" ? "text-rose-500" : "text-gray-400"} />
                      <span className={`text-[12px] font-medium ${task.isPastDue && task.status !== "done" ? "text-rose-500" : "text-gray-400"}`}>
                        {task.date}
                      </span>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">

                    {/* TARGET 2: View Source Email */}
                    <button
                      onClick={(e) => { e.stopPropagation(); if (onViewEmail) onViewEmail(task.emailId); }}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition" title="View Source Email">
                      <Info size={16} />
                    </button>

                    {/* TARGET 3: Not a Task (Deleting for now) */}
                    <button
                      onClick={(e) => { e.stopPropagation(); if (onDeleteTask) onDeleteTask(task.id); }}
                      className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition" title="Not a task (Train AI)">
                      <ThumbsDown size={16} />
                    </button>

                    {/* TARGET 4: Delete Task */}
                    <button
                      onClick={(e) => { e.stopPropagation(); if (onDeleteTask) onDeleteTask(task.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition" title="Delete Task">
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