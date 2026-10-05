"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { baseSubject } from "@/lib/compose";
import type { Task } from "@/lib/tasks";
import type { MailItem } from "@/lib/mail-types";

export type TaskChanges = Partial<Pick<Task, "title" | "dueDate" | "isUrgent" | "status">>;
export interface NewTask {
    title: string;
    dueDate: string;
    isUrgent: boolean;
    emailId?: string;
}

/** The to-do list. Changes show at once; the server's list replaces them when it answers. */
export function useTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);

    /** Calls the tasks API and syncs the list. Returns an error message, or null. */
    const request = async (method: string, body?: object, query = ""): Promise<string | null> => {
        const result = await api<{ tasks: Task[] }>(`/api/tasks${query}`, { method, body });
        if (!result.ok) return result.error;
        setTasks(result.data.tasks);
        return null;
    };

    const refresh = () => request("GET");

    const add = (task: NewTask) => request("POST", task);

    /** "Add to To-do" from the reading pane: a task that links back to the email. */
    const addFromEmail = async (email: MailItem) => {
        const error = await add({ title: `Follow up: ${baseSubject(email.subject) || "(no subject)"}`, dueDate: "", isUrgent: false, emailId: email.id });
        if (error) toast(error, "error");
        else toast("Added to your to-do list.", "success");
    };

    const update = async (id: string, changes: TaskChanges) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
        const error = await request("PATCH", { id, ...changes });
        if (error) {
            toast(error, "error");
            refresh();
        }
    };

    const remove = async (id: string) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        const error = await request("DELETE", undefined, `?id=${encodeURIComponent(id)}`);
        if (error) {
            toast(error, "error");
            refresh();
        }
    };

    return { tasks, setTasks, refresh, add, addFromEmail, update, remove };
}
