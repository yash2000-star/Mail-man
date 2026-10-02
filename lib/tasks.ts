/** To-do task shape and validation, shared by the browser and API routes. */

export interface Task {
    id: string;
    /** Gmail message the task came from; "" for tasks added by hand */
    emailId: string;
    title: string;
    /** Due date as YYYY-MM-DD, or "" when there is none */
    dueDate: string;
    /** Deadline wording from the email (e.g. "by Friday"), shown when there's no exact date */
    date: string;
    isUrgent: boolean;
    status: "active" | "done";
    createdAt: string;
    completedAt: string;
}

export const MAX_TASKS = 2000;
export const MAX_TASK_TITLE = 300;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns the date if it's a real YYYY-MM-DD calendar date, else "". */
export function cleanDueDate(value: unknown): string {
    if (typeof value !== "string" || !ISO_DATE.test(value)) return "";
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value ? value : "";
}

export function cleanTitle(value: unknown): string {
    return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, MAX_TASK_TITLE) : "";
}

/** Fills defaults for tasks saved before due dates and timestamps existed. */
export function normalizeTask(raw: Partial<Task> & Record<string, unknown>): Task {
    return {
        id: String(raw.id ?? ""),
        emailId: String(raw.emailId ?? ""),
        title: String(raw.title ?? ""),
        dueDate: cleanDueDate(raw.dueDate),
        date: String(raw.date ?? ""),
        isUrgent: Boolean(raw.isUrgent),
        status: raw.status === "done" ? "done" : "active",
        createdAt: String(raw.createdAt ?? ""),
        completedAt: String(raw.completedAt ?? ""),
    };
}

/** Today's date as YYYY-MM-DD in the viewer's local time zone. */
export function localToday(now = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
