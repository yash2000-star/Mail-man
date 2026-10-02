"use client";

import { useMemo, useState } from "react";
import { Check, Clock, Flag, ListFilter, Mail, Plus, Sparkles, Trash2, X } from "lucide-react";
import { localToday, MAX_TASK_TITLE, Task } from "@/lib/tasks";

export type TaskChanges = Partial<Pick<Task, "title" | "dueDate" | "isUrgent" | "status">>;

interface ToDoDashboardProps {
  tasks?: Task[];
  /** Resolves to an error message, or null on success */
  onAddTask?: (task: { title: string; dueDate: string; isUrgent: boolean }) => Promise<string | null>;
  onUpdateTask?: (id: string, changes: TaskChanges) => void;
  onDeleteTask?: (id: string) => void;
  onViewEmail?: (emailId: string) => void;
  onScan?: () => void;
  isScanning?: boolean;
}

type Group = "overdue" | "today" | "week" | "later" | "none";
type PriorityFilter = "all" | "urgent" | "normal";
type SourceFilter = "all" | "email" | "manual";
type DueFilter = "all" | Group;

const GROUP_TITLES: Record<Group, string> = {
  overdue: "Overdue",
  today: "Today",
  week: "Next 7 days",
  later: "Later",
  none: "No due date",
};
const GROUP_ORDER: Group[] = ["overdue", "today", "week", "later", "none"];

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localToday(d);
}

/**
 * Due date to sort and group by: the exact date, or (for older tasks) the
 * email's wording when it parses as a date, e.g. "Oct 9, 2026".
 */
function effectiveDue(task: Task): string {
  if (task.dueDate) return task.dueDate;
  if (!task.date || !/\d/.test(task.date)) return "";
  const parsed = new Date(task.date);
  return Number.isNaN(parsed.getTime()) || parsed.getFullYear() < 2000 ? "" : localToday(parsed);
}

function groupOf(due: string, today: string): Group {
  if (!due) return "none";
  if (due < today) return "overdue";
  if (due === today) return "today";
  if (due <= addDays(today, 7)) return "week";
  return "later";
}

function formatDue(due: string, today: string): string {
  if (due === today) return "Today";
  if (due === addDays(today, 1)) return "Tomorrow";
  if (due === addDays(today, -1)) return "Yesterday";
  const d = new Date(`${due}T00:00:00`);
  return d.toLocaleDateString([], { month: "short", day: "numeric", ...(due.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" } : {}) });
}

export default function ToDoDashboard({
  tasks = [],
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onViewEmail,
  onScan,
  isScanning = false,
}: ToDoDashboardProps) {
  const [activeTab, setActiveTab] = useState<"active" | "done">("active");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [due, setDue] = useState<DueFilter>("all");

  // New-task form
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newUrgent, setNewUrgent] = useState(false);
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Inline title editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const today = localToday();
  const activeFilterCount = [priority !== "all", source !== "all", due !== "all"].filter(Boolean).length;

  const counts = useMemo(() => ({
    active: tasks.filter((t) => t.status === "active").length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue: tasks.filter((t) => t.status === "active" && groupOf(effectiveDue(t), today) === "overdue").length,
  }), [tasks, today]);

  const visible = useMemo(() => {
    const filtered = tasks.filter((t) => {
      if (t.status !== activeTab) return false;
      if (priority === "urgent" && !t.isUrgent) return false;
      if (priority === "normal" && t.isUrgent) return false;
      if (source === "email" && !t.emailId) return false;
      if (source === "manual" && t.emailId) return false;
      if (due !== "all" && groupOf(effectiveDue(t), today) !== due) return false;
      return true;
    });

    if (activeTab === "done") {
      return filtered.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    }
    // Soonest first, undated last; urgent first on the same day; then oldest first
    return filtered.sort((a, b) => {
      const da = effectiveDue(a) || "9999-99-99";
      const db = effectiveDue(b) || "9999-99-99";
      if (da !== db) return da.localeCompare(db);
      if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [tasks, activeTab, priority, source, due, today]);

  const handleAdd = async () => {
    if (!newTitle.trim() || !onAddTask) return;
    setIsAdding(true);
    setAddError("");
    const error = await onAddTask({ title: newTitle, dueDate: newDue, isUrgent: newUrgent });
    setIsAdding(false);
    if (error) {
      setAddError(error);
      return;
    }
    setNewTitle("");
    setNewDue("");
    setNewUrgent(false);
  };

  const saveTitle = (task: Task) => {
    const title = editTitle.trim();
    setEditingId(null);
    if (title && title !== task.title) onUpdateTask?.(task.id, { title });
  };

  const clearFilters = () => {
    setPriority("all");
    setSource("all");
    setDue("all");
  };

  const filterOption = <T extends string>(label: string, value: T, current: T, set: (v: T) => void) => (
    <button
      key={value}
      onClick={() => set(value)}
      aria-pressed={current === value}
      className={`flex items-center justify-between w-full px-4 py-2 text-sm rounded-lg transition ${current === value ? "text-amber-500 bg-amber-500/10" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"}`}
    >
      <span>{label}</span>
      {current === value && <Check size={14} />}
    </button>
  );

  const renderTask = (task: Task) => {
    const taskDue = effectiveDue(task);
    const group = groupOf(taskDue, today);
    const isDone = task.status === "done";
    const isOverdue = !isDone && group === "overdue";

    return (
      <div key={task.id} className="group flex items-start gap-4 py-3.5 border-b border-zinc-900 hover:bg-zinc-900/40 transition-all -mx-4 px-4 rounded-xl">
        <button
          onClick={() => onUpdateTask?.(task.id, { status: isDone ? "active" : "done" })}
          aria-label={isDone ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
          className={`w-4 h-4 rounded border flex-shrink-0 mt-1 transition-all flex items-center justify-center ${isDone ? "bg-amber-500 border-amber-500" : "border-zinc-700 bg-zinc-900 hover:border-zinc-400"}`}
        >
          {isDone && <Check size={11} className="text-black" strokeWidth={4} />}
        </button>

        <div className="flex-1 min-w-0">
          {editingId === task.id ? (
            <input
              autoFocus
              value={editTitle}
              maxLength={MAX_TASK_TITLE}
              aria-label="Task title"
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => saveTitle(task)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle(task);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="w-full bg-zinc-900 border border-amber-500/50 rounded-lg px-2 py-1 text-sm font-bold text-zinc-100 outline-none"
            />
          ) : (
            <button
              onClick={() => { setEditingId(task.id); setEditTitle(task.title); }}
              title="Click to edit"
              className={`text-left text-sm font-bold tracking-tight break-words ${isDone ? "text-zinc-600 line-through" : "text-zinc-100 hover:text-white"}`}
            >
              {task.title}
            </button>
          )}

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {/* Due date: shown as a label, edited with a native date picker */}
            <label className={`relative flex items-center gap-1.5 text-xs font-bold cursor-pointer ${isOverdue ? "text-rose-400" : group === "today" && !isDone ? "text-amber-500" : "text-zinc-500 hover:text-zinc-300"}`}>
              <Clock size={12} />
              <span>
                {taskDue ? `${isOverdue ? "Overdue · " : ""}${formatDue(taskDue, today)}` : task.date || "Add due date"}
              </span>
              <input
                type="date"
                value={task.dueDate}
                aria-label={`Due date for "${task.title}"`}
                onChange={(e) => onUpdateTask?.(task.id, { dueDate: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
            {task.dueDate && !isDone && (
              <button
                onClick={() => onUpdateTask?.(task.id, { dueDate: "" })}
                aria-label="Clear due date"
                className="text-zinc-600 hover:text-zinc-300 -ml-2"
              >
                <X size={12} />
              </button>
            )}
            {task.emailId && (
              <button
                onClick={() => onViewEmail?.(task.emailId)}
                className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-amber-500 transition"
              >
                <Mail size={12} /> From email
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onUpdateTask?.(task.id, { isUrgent: !task.isUrgent })}
            aria-label={task.isUrgent ? "Remove urgent" : "Mark urgent"}
            aria-pressed={task.isUrgent}
            title={task.isUrgent ? "Urgent" : "Mark urgent"}
            className={`p-1.5 rounded-lg transition ${task.isUrgent ? "text-rose-400" : "text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-200 hover:bg-zinc-800"}`}
          >
            <Flag size={16} className={task.isUrgent ? "fill-rose-400" : ""} />
          </button>
          <button
            onClick={() => onDeleteTask?.(task.id)}
            aria-label={`Delete "${task.title}"`}
            title="Delete"
            className="p-1.5 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    );
  };

  // Active tasks are grouped by due date; done tasks are one list
  const sections: { title: string; tasks: Task[] }[] = activeTab === "done"
    ? [{ title: "Completed", tasks: visible }]
    : GROUP_ORDER
      .map((g) => ({ title: GROUP_TITLES[g], tasks: visible.filter((t) => groupOf(effectiveDue(t), today) === g) }))
      .filter((s) => s.tasks.length > 0);

  return (
    <div className="flex-1 h-screen bg-zinc-950 flex flex-col animate-in fade-in duration-300">

      {/* Header */}
      <div className="h-20 px-8 flex items-center justify-between shrink-0 z-10 pt-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-4">
          <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800/60 rounded-full shadow-2xl" role="tablist">
            {(["active", "done"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-full transition-all ${activeTab === tab ? "bg-amber-500 text-black shadow-lg" : "text-zinc-500 hover:text-zinc-100"}`}
              >
                {tab === "active" ? "Active" : "Done"} {counts[tab] > 0 && <span className="opacity-70">{counts[tab]}</span>}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              title="Filter"
              aria-expanded={isFilterOpen}
              className={`h-9 px-3 flex items-center gap-2 justify-center rounded-full border transition-all ${isFilterOpen || activeFilterCount > 0 ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800"}`}
            >
              <ListFilter size={16} strokeWidth={2.5} />
              {activeFilterCount > 0 && <span className="text-xs font-black">{activeFilterCount}</span>}
            </button>

            {isFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                <div className="absolute left-0 top-[125%] w-60 bg-zinc-900 border border-zinc-800/60 shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 p-1">
                  <div className="flex flex-col pt-3 pb-2 border-b border-zinc-800/60">
                    <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest px-4 mb-2">Due</span>
                    {filterOption("Any time", "all", due, setDue)}
                    {filterOption("Overdue", "overdue", due, setDue)}
                    {filterOption("Today", "today", due, setDue)}
                    {filterOption("Next 7 days", "week", due, setDue)}
                    {filterOption("No due date", "none", due, setDue)}
                  </div>
                  <div className="flex flex-col pt-3 pb-2 border-b border-zinc-800/60">
                    <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest px-4 mb-2">Priority</span>
                    {filterOption("All", "all", priority, setPriority)}
                    {filterOption("Urgent", "urgent", priority, setPriority)}
                    {filterOption("Not urgent", "normal", priority, setPriority)}
                  </div>
                  <div className="flex flex-col pt-3 pb-2">
                    <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest px-4 mb-2">Source</span>
                    {filterOption("All", "all", source, setSource)}
                    {filterOption("From emails", "email", source, setSource)}
                    {filterOption("Added by me", "manual", source, setSource)}
                  </div>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="w-full text-xs font-bold text-amber-500 hover:text-amber-400 py-2">
                      Clear filters
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {counts.overdue > 0 && activeTab === "active" && (
            <span className="text-xs font-bold text-rose-400">{counts.overdue} overdue</span>
          )}
        </div>

        <button
          onClick={onScan}
          disabled={isScanning}
          className={`h-9 px-4 flex items-center gap-2 rounded-full border border-zinc-800 text-xs font-bold transition-all ${isScanning ? "opacity-50 cursor-not-allowed" : "bg-zinc-900 text-amber-500 hover:bg-zinc-800"}`}
          title="Find tasks in your recent emails"
        >
          <Sparkles size={14} className={isScanning ? "animate-spin" : ""} strokeWidth={2.5} />
          {isScanning ? "Scanning..." : "Scan inbox"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 scrollbar-hide">
        <div className="max-w-4xl">

          {/* Add a task */}
          {activeTab === "active" && (
            <div className="mb-8">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/60 focus-within:border-amber-500/50 rounded-2xl px-4 py-2 transition">
                <Plus size={16} className="text-zinc-500 shrink-0" />
                <input
                  value={newTitle}
                  maxLength={MAX_TASK_TITLE}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                  placeholder="Add a task..."
                  aria-label="New task"
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold text-zinc-100 placeholder:text-zinc-600 py-1.5"
                />
                <input
                  type="date"
                  value={newDue}
                  min={today}
                  onChange={(e) => setNewDue(e.target.value)}
                  aria-label="New task due date"
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 [color-scheme:dark]"
                />
                <button
                  onClick={() => setNewUrgent(!newUrgent)}
                  aria-pressed={newUrgent}
                  aria-label="Urgent"
                  title="Urgent"
                  className={`p-1.5 rounded-lg transition ${newUrgent ? "text-rose-400 bg-rose-500/10" : "text-zinc-500 hover:text-zinc-200"}`}
                >
                  <Flag size={15} className={newUrgent ? "fill-rose-400" : ""} />
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newTitle.trim() || isAdding}
                  className="px-4 py-1.5 rounded-full bg-amber-500 text-black text-xs font-black uppercase tracking-widest disabled:bg-zinc-800 disabled:text-zinc-600 transition"
                >
                  Add
                </button>
              </div>
              {addError && <p role="alert" className="text-rose-400 text-xs font-medium mt-2 px-2">{addError}</p>}
            </div>
          )}

          {visible.length === 0 ? (
            <div className="text-center py-20 border border-zinc-800/40 border-dashed rounded-3xl">
              <p className="text-zinc-500 font-bold text-sm px-6">
                {activeFilterCount > 0
                  ? "No tasks match these filters."
                  : activeTab === "active"
                    ? "Nothing to do. Add a task above, or Mail-man will pick them up from new emails."
                    : "No completed tasks yet."}
              </p>
            </div>
          ) : (
            sections.map((section) => (
              <section key={section.title} className="mb-8">
                <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${section.title === "Overdue" ? "text-rose-400" : "text-zinc-500"}`}>
                  {section.title} <span className="opacity-60">{section.tasks.length}</span>
                </h2>
                {section.tasks.map(renderTask)}
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
