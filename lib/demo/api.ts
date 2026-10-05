/**
 * An in-browser stand-in for Mail-man's API, used by /demo. It patches
 * window.fetch so the real app components run unchanged against the sample
 * mailbox in ./data. Nothing reaches Gmail, the database or an AI provider,
 * and the state resets on every page load.
 */
import { AI_PROVIDERS, type SavedKeys } from "@/lib/ai-providers";
import { validateLabel, type SmartLabel } from "@/lib/labels";
import { cleanDueDate, cleanTitle, type Task } from "@/lib/tasks";
import type { MailAnalysis, MailItem, MailMessage, MailPage } from "@/lib/mail-types";
import { DEMO_USER, createDemoState, newDemoMessage, type DemoMessage, type DemoState } from "./data";

type Json = Record<string, unknown>;

interface DemoRequest {
    method: string;
    path: string;
    query: URLSearchParams;
    body: Json;
}

const THREADED = new Set(["Inbox", "Starred", "All Mail", "Archive", "Spam", "Trash"]);

// Same label changes as /api/action
const ACTIONS: Record<string, { add?: string[]; remove?: string[] }> = {
    archive: { remove: ["INBOX"] },
    unarchive: { add: ["INBOX"] },
    trash: { add: ["TRASH"], remove: ["INBOX"] },
    untrash: { add: ["INBOX"], remove: ["TRASH"] },
    spam: { add: ["SPAM"], remove: ["INBOX"] },
    notspam: { add: ["INBOX"], remove: ["SPAM"] },
    read: { remove: ["UNREAD"] },
    unread: { add: ["UNREAD"] },
    star: { add: ["STARRED"] },
    unstar: { remove: ["STARRED"] },
};

/** Does one message belong in a folder? Mirrors the Gmail queries in lib/gmail.ts. */
function inFolder(m: DemoMessage, folder: string): boolean {
    const has = (label: string) => m.labels.includes(label);
    switch (folder) {
        case "Inbox": return has("INBOX");
        case "Starred": return has("STARRED");
        case "Sent": return has("SENT");
        case "Draft": return has("DRAFT");
        case "All Mail": return !has("SPAM") && !has("TRASH") && !has("DRAFT");
        case "Archive": return !["INBOX", "SENT", "DRAFT", "SPAM", "TRASH"].some(has);
        case "Spam": return has("SPAM");
        case "Trash": return has("TRASH");
        default: return false;
    }
}

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const error = (message: string, status = 400) => json({ error: message }, status);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function textOf(m: MailMessage): string {
    return (m.bodyIsHtml ? m.body.replace(/<[^>]+>/g, " ") : m.body).replace(/\s+/g, " ");
}

/** How long after the demo opens a "new" email arrives, to show live updates. */
export const DEMO_NEW_MAIL_AFTER_MS = 20_000;

export function createDemoApi(state: DemoState, { newMailAfterMs = DEMO_NEW_MAIL_AFTER_MS } = {}) {
    const startedAt = Date.now();
    let historyId = 1000;
    let newMailDelivered = false;

    /** Stand-in for /api/gmail/changes: one new email arrives a little after the demo opens. */
    const changes = (since: string | null) => {
        if (since && !newMailDelivered && Date.now() - startedAt >= newMailAfterMs) {
            newMailDelivered = true;
            historyId++;
            const message = newDemoMessage({
                id: "m2001",
                threadId: "t20",
                from: ["Lumen Labs IT", "it@lumenlabs.example"],
                subject: "Your new laptop is ready for pickup",
                body: "Hi Alex,\n\nYour replacement laptop is set up and ready. Pick it up from the IT desk on floor 3 any time before Friday, and bring your old one so we can wipe it.\n\nLumen Labs IT",
                labels: ["INBOX", "UNREAD"],
            });
            state.messages.push(message);
            state.analysis.t20 = {
                category: "Important",
                summary: "Your replacement laptop is ready at the floor 3 IT desk; pick it up before Friday and bring the old one.",
                requires_reply: false,
                draft_reply: "",
                appliedLabels: ["Work"],
            };
            return { historyId: String(historyId), newMessageIds: [message.id] };
        }
        return { historyId: String(historyId), newMessageIds: [] as string[] };
    };

    const byId = (id: string) => state.messages.find((m) => m.id === id);
    const threadOf = (threadId: string) =>
        state.messages.filter((m) => m.threadId === threadId).sort((a, b) => a.timestamp - b.timestamp);
    const newId = (prefix: string) => `${prefix}demo${state.nextId++}`;

    const withFlags = (m: DemoMessage): MailMessage => {
        const { labels, ...message } = m;
        return { ...message, isUnread: labels.includes("UNREAD"), isStarred: labels.includes("STARRED") };
    };
    const toItem = (m: DemoMessage): MailItem => {
        const { body, bodyIsHtml, attachments, bcc, messageId, references, ...item } = withFlags(m);
        void body; void bodyIsHtml; void attachments; void bcc; void messageId; void references;
        return item;
    };
    const analysisFor = (m: DemoMessage): MailAnalysis => state.analysis[m.threadId] ?? {};

    /** The list row for a conversation, built like toThreadItem in lib/gmail.ts. */
    const threadRow = (threadId: string, folder: string): MailItem | null => {
        const all = threadOf(threadId);
        const messages = all.filter((m) => !m.labels.includes("DRAFT") && (folder === "Trash" || !m.labels.includes("TRASH")));
        const items = (messages.length ? messages : all).map(toItem);
        if (items.length === 0) return null;
        const latest = items[items.length - 1];
        const sender = [...items].reverse().find((m) => m.fromEmail !== DEMO_USER.email) ?? latest;
        return {
            ...latest,
            ...state.analysis[threadId],
            from: sender.fromEmail === DEMO_USER.email ? "me" : sender.from,
            fromEmail: sender.fromEmail,
            subject: items[0].subject,
            isUnread: items.some((m) => m.isUnread),
            isStarred: items.some((m) => m.isStarred),
            messageCount: items.length,
        };
    };

    const matchesSearch = (messages: DemoMessage[], q: string) => {
        if (!q) return true;
        const needle = q.toLowerCase();
        return messages.some((m) => `${m.from} ${m.fromEmail} ${m.subject} ${textOf(m)}`.toLowerCase().includes(needle));
    };

    const threadIds = (filter: (threadId: string) => boolean) =>
        [...new Set(state.messages.map((m) => m.threadId))]
            .filter(filter)
            .sort((a, b) => Math.max(...threadOf(b).map((m) => m.timestamp)) - Math.max(...threadOf(a).map((m) => m.timestamp)));

    const listMessages = (q: URLSearchParams): MailPage => {
        const search = (q.get("q") ?? "").trim();
        const label = q.get("label");
        let emails: MailItem[];
        if (label || q.get("view") === "needs-reply") {
            const ids = threadIds((t) => {
                const a = state.analysis[t];
                const visible = threadOf(t).some((m) => !m.labels.includes("SPAM") && !m.labels.includes("TRASH"));
                return visible && Boolean(label ? a?.appliedLabels?.includes(label) : a?.requires_reply);
            });
            emails = ids.map((t) => threadRow(t, "Inbox")).filter((r): r is MailItem => r !== null);
        } else {
            const folder = q.get("folder") || "Inbox";
            if (THREADED.has(folder)) {
                const ids = threadIds((t) => threadOf(t).some((m) => inFolder(m, folder)) && matchesSearch(threadOf(t), search));
                emails = ids.map((t) => threadRow(t, folder)).filter((r): r is MailItem => r !== null);
            } else {
                emails = state.messages
                    .filter((m) => inFolder(m, folder) && matchesSearch([m], search))
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((m) => ({ ...toItem(m), ...analysisFor(m) }));
            }
        }
        return { emails, nextPageToken: null };
    };

    const needsReplyCount = () =>
        Object.entries(state.analysis).filter(([t, a]) =>
            a.requires_reply && threadOf(t).some((m) => !m.labels.includes("SPAM") && !m.labels.includes("TRASH"))).length;

    const userResponse = () => {
        const savedKeys = Object.fromEntries(
            AI_PROVIDERS.map((p) => [p, { saved: p === "gemini", hint: p === "gemini" ? "demo" : "" }]),
        ) as SavedKeys;
        return {
            email: DEMO_USER.email,
            aiProvider: "gemini",
            savedKeys,
            customLabels: state.labels,
            globalTasks: state.tasks,
            needsReplyCount: needsReplyCount(),
        };
    };

    /** Compose payloads arrive as JSON, or as form data when files are attached. */
    const composeFields = (body: Json) => ({
        to: typeof body.to === "string" ? body.to.trim() : "",
        cc: typeof body.cc === "string" ? body.cc.trim() : "",
        subject: typeof body.subject === "string" && body.subject.trim() ? body.subject.trim() : "(no subject)",
        message: typeof body.message === "string" ? body.message : "",
        isHtml: Boolean(body.isHtml),
        threadId: typeof body.threadId === "string" ? body.threadId : "",
        draftId: typeof body.draftId === "string" ? body.draftId : "",
    });

    const saveDraft = (body: Json) => {
        const f = composeFields(body);
        const existing = f.draftId ? byId(f.draftId) : undefined;
        if (existing?.labels.includes("DRAFT")) state.messages = state.messages.filter((m) => m !== existing);
        const draft = newDemoMessage({
            id: existing?.id ?? newId("d"),
            threadId: existing?.threadId ?? (f.threadId || newId("t")),
            to: f.to,
            cc: f.cc,
            subject: f.subject,
            body: f.message,
            html: f.isHtml,
            labels: ["DRAFT"],
        });
        state.messages.push(draft);
        return json({ draftId: draft.id, messageId: draft.id, attachments: [] });
    };

    const send = (body: Json) => {
        const f = composeFields(body);
        if (!f.to) return error('Add at least one recipient in "to".');
        if (f.draftId) state.messages = state.messages.filter((m) => !(m.id === f.draftId && m.labels.includes("DRAFT")));
        const threadId = f.threadId && threadOf(f.threadId).length ? f.threadId : newId("t");
        state.messages.push(newDemoMessage({
            id: newId("m"),
            threadId,
            to: f.to,
            cc: f.cc,
            subject: f.subject,
            body: f.message,
            html: f.isHtml,
            labels: ["SENT"],
        }));
        return json({ success: true });
    };

    const tasksResponse = () => json({ tasks: state.tasks });

    const labelsResponse = () => json({ customLabels: state.labels });
    const renameLabel = (from: string, to: string | null) => {
        for (const a of Object.values(state.analysis)) {
            a.appliedLabels = a.appliedLabels?.flatMap((l) => (l === from ? (to ? [to] : []) : [l]));
        }
    };

    /** Smart Label scan: a keyword match on the label's description stands in for the AI. */
    const scanLabel = (name: string) => {
        const label = state.labels.find((l) => l.name === name);
        if (!label) return error("That label doesn't exist.", 404);
        const words = `${label.name} ${label.prompt}`.toLowerCase().match(/[a-z]{4,}/g) ?? [];
        const keywords = words.filter((w) => !["emails", "email", "from", "about", "with", "that", "this", "they", "have", "mail"].includes(w));
        const inbox = threadIds((t) => threadOf(t).some((m) => m.labels.includes("INBOX")));
        const matched: string[] = [];
        for (const t of inbox) {
            const text = threadOf(t).map((m) => `${m.from} ${m.subject} ${textOf(m)}`).join(" ").toLowerCase();
            if (!keywords.some((k) => text.includes(k.replace(/s$/, "")))) continue;
            const a = (state.analysis[t] ??= {});
            a.appliedLabels = [...new Set([...(a.appliedLabels ?? []), label.name])];
            const row = threadRow(t, "Inbox");
            if (row) matched.push(row.id);
        }
        return json({ matched, scanned: inbox.length });
    };

    const firstName = (name: string) => name.split(/\s+/)[0] || "there";

    /** Scripted chat: answers a few kinds of questions from the sample inbox. */
    const chat = (body: Json) => {
        const history = Array.isArray(body.history) ? (body.history as { role?: string; content?: string }[]) : [];
        const question = String([...history].reverse().find((m) => m.role === "user")?.content ?? "").toLowerCase();
        const inboxRows = listMessages(new URLSearchParams({ folder: "Inbox" })).emails;
        const bullet = (rows: MailItem[]) => rows.map((r) => `• ${r.from}: ${r.summary ?? r.subject}`).join("\n");
        const about = (pattern: RegExp) => inboxRows.filter((r) => pattern.test(`${r.from} ${r.subject} ${r.summary ?? ""}`.toLowerCase()));

        const sender = inboxRows.find((r) => r.from !== "me" && question.includes(firstName(r.from).toLowerCase()));
        let reply: string;
        if (/\b(reply|respond|answer|owe|waiting)\b/.test(question)) {
            const rows = inboxRows.filter((r) => r.requires_reply);
            reply = rows.length ? `These conversations are waiting on a reply from you:\n${bullet(rows)}` : "You're all caught up: nothing is waiting on a reply.";
        } else if (/\b(task|tasks|todo|to-do|deadline|deadlines|due)\b/.test(question)) {
            const open = state.tasks.filter((t) => t.status === "active");
            reply = `You have ${open.length} open tasks:\n${open.map((t) => `• ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`).join("\n")}`;
        } else if (/\b(flight|travel|trip|denver)\b/.test(question)) {
            reply = bullet(about(/flight|skyway|travel/));
        } else if (/\b(bill|bills|invoice|pay|payment|bank)\b/.test(question)) {
            reply = `Here's what's money-related:\n${bullet(about(/invoice|bank|statement|billing/))}`;
        } else if (/\b(interview|job|recruit)\w*/.test(question)) {
            reply = bullet(about(/interview|orbit/));
        } else if (sender) {
            reply = `${sender.from} wrote about "${sender.subject}": ${sender.summary ?? sender.snippet}`;
        } else if (/\b(summar\w*|today|new|unread|inbox|important)\b/.test(question)) {
            const unread = inboxRows.filter((r) => r.isUnread);
            reply = `You have ${unread.length} unread conversations. The highlights:\n${bullet(unread.slice(0, 5))}`;
        } else {
            reply = "This is the demo, so my answers come from a short script. Try asking what needs a reply, what's due, or about your flight, bills or interview. Sign in and add your own AI key to ask anything about your real inbox.";
        }
        return json({ reply, provider: "gemini", tier: "Demo · scripted answers" });
    };

    const enhance = (body: Json) => {
        const draft = typeof body.draft === "string" ? body.draft : "";
        const command = typeof body.command === "string" ? body.command.trim() : "";
        const text = draft.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "").trim();
        if (!text && !command) return error("Write a draft or an instruction first.");
        const paragraphs = text
            ? text.split(/\n+/).map((p) => p.trim()).filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            : [`Following up on this: ${command.charAt(0).toLowerCase()}${command.slice(1)}.`, "Let me know if you have any questions."];
        const hasGreeting = /^(hi|hello|hey|dear)\b/i.test(paragraphs[0] ?? "");
        const html = [
            ...(hasGreeting ? [] : ["Hi there,"]),
            ...paragraphs,
            "Best regards,<br>Alex",
        ].map((p) => `<p>${p}</p>`).join("");
        return json({ enhancedText: html });
    };

    const aiReply = (body: Json) => {
        const senderName = typeof body.senderName === "string" ? body.senderName : "";
        const thread = Object.entries(state.analysis).find(([t, a]) =>
            a.draft_reply && threadOf(t).some((m) => m.from === senderName));
        const reply = thread?.[1].draft_reply
            || `Hi ${firstName(senderName)},\n\nThanks for your email. I'll take a look and get back to you shortly.\n\nBest,\nAlex`;
        return json({ reply });
    };

    const routes: Record<string, (r: DemoRequest) => Response | Promise<Response>> = {
        "GET /api/auth/session": () => json({ user: { name: DEMO_USER.name, email: DEMO_USER.email, image: null }, expires: new Date(Date.now() + 86_400_000).toISOString() }),
        // Signing out of the demo just leaves it
        "POST /api/auth/signout": () => json({ url: "/" }),

        "GET /api/user": () => json(userResponse()),
        "POST /api/user": () => error("The demo can't save API keys. Sign in with Google to use your own key.", 403),
        "DELETE /api/user": () => error("The demo doesn't store anything, so there's nothing to delete.", 403),

        "GET /api/gmail/messages": (r) => json(listMessages(r.query)),
        "GET /api/gmail/changes": (r) => json(changes(r.query.get("since"))),
        "POST /api/action": (r) => {
            const change = ACTIONS[String(r.body.action)];
            const targets = typeof r.body.threadId === "string"
                ? threadOf(r.body.threadId)
                : state.messages.filter((m) => m.id === r.body.id);
            if (!change || targets.length === 0) return error("Invalid action");
            for (const m of targets) {
                m.labels = [...new Set([...m.labels.filter((l) => !change.remove?.includes(l)), ...(change.add ?? [])])];
            }
            return json({ success: true });
        },

        "GET /api/drafts": (r) => {
            const draft = byId(r.query.get("messageId") ?? "");
            if (!draft?.labels.includes("DRAFT")) return error("That draft no longer exists.", 404);
            return json({ draftId: draft.id, message: withFlags(draft) });
        },
        "POST /api/drafts": (r) => saveDraft(r.body),
        "DELETE /api/drafts": (r) => {
            const id = r.query.get("id");
            state.messages = state.messages.filter((m) => !(m.id === id && m.labels.includes("DRAFT")));
            return json({ success: true });
        },
        "POST /api/send": (r) => send(r.body),

        "POST /api/labels": (r) => {
            const label = validateLabel(r.body, state.labels);
            if (typeof label === "string") return error(label);
            state.labels.push(label);
            return labelsResponse();
        },
        "PATCH /api/labels": (r) => {
            const index = state.labels.findIndex((l) => l.name === r.body.originalName);
            if (index === -1) return error("That label doesn't exist.", 404);
            const label = validateLabel(r.body, state.labels.filter((_, i) => i !== index));
            if (typeof label === "string") return error(label);
            if (label.name !== state.labels[index].name) renameLabel(state.labels[index].name, label.name);
            state.labels[index] = label;
            return labelsResponse();
        },
        "DELETE /api/labels": (r) => {
            const name = r.query.get("name") ?? "";
            state.labels = state.labels.filter((l: SmartLabel) => l.name !== name);
            renameLabel(name, null);
            return labelsResponse();
        },
        "POST /api/labels/scan": (r) => scanLabel(String(r.body.name ?? "")),
        "POST /api/labels/assign": (r) => {
            const message = byId(String(r.body.emailId ?? ""));
            const name = String(r.body.name ?? "");
            if (!message || !state.labels.some((l) => l.name === name)) return error("Invalid label.");
            const a = (state.analysis[message.threadId] ??= {});
            const current = a.appliedLabels ?? [];
            a.appliedLabels = r.body.applied ? [...new Set([...current, name])] : current.filter((l) => l !== name);
            return json({ appliedLabels: a.appliedLabels });
        },
        "POST /api/analysis/handled": (r) => {
            const message = byId(String(r.body.emailId ?? ""));
            if (message && state.analysis[message.threadId]) state.analysis[message.threadId].requires_reply = false;
            return json({ success: true });
        },

        "GET /api/tasks": () => tasksResponse(),
        "POST /api/tasks": (r) => {
            const title = cleanTitle(r.body.title);
            if (!title) return error("Give the task a title.");
            const task: Task = {
                id: newId("task"),
                emailId: typeof r.body.emailId === "string" ? r.body.emailId : "",
                title,
                dueDate: cleanDueDate(r.body.dueDate),
                date: "",
                isUrgent: Boolean(r.body.isUrgent),
                status: "active",
                createdAt: new Date().toISOString(),
                completedAt: "",
            };
            state.tasks.push(task);
            return tasksResponse();
        },
        "PATCH /api/tasks": (r) => {
            const task = state.tasks.find((t) => t.id === r.body.id);
            if (!task) return error("That task no longer exists.", 404);
            if (r.body.title !== undefined) {
                const title = cleanTitle(r.body.title);
                if (!title) return error("A task needs a title.");
                task.title = title;
            }
            if (r.body.dueDate !== undefined) task.dueDate = cleanDueDate(r.body.dueDate);
            if (r.body.isUrgent !== undefined) task.isUrgent = Boolean(r.body.isUrgent);
            if (r.body.status === "active" || r.body.status === "done") {
                task.status = r.body.status;
                task.completedAt = r.body.status === "done" ? new Date().toISOString() : "";
            }
            return tasksResponse();
        },
        "DELETE /api/tasks": (r) => {
            state.tasks = state.tasks.filter((t) => t.id !== r.query.get("id"));
            return tasksResponse();
        },

        // The sample mail already carries its AI results, so these return them
        "POST /api/classify": (r) => {
            const emails = Array.isArray(r.body.emails) ? (r.body.emails as { id?: string; snippet?: string }[]) : [];
            return json(emails.map((e) => {
                const message = byId(String(e.id ?? ""));
                const known = message ? state.analysis[message.threadId] : undefined;
                return { id: e.id, ...(known ?? { category: "General", summary: e.snippet ?? "", requires_reply: false, draft_reply: "" }) };
            }));
        },
        "POST /api/ai/tasks": (r) => {
            const ids = Array.isArray(r.body.ids) ? (r.body.ids as string[]) : [];
            return json(ids.map((id) => {
                const message = byId(id);
                return { id, appliedLabels: (message && state.analysis[message.threadId]?.appliedLabels) ?? [] };
            }));
        },
        "POST /api/ai/reply": (r) => aiReply(r.body),
        "POST /api/ai/enhance": (r) => enhance(r.body),
        "POST /api/chat": (r) => chat(r.body),
    };

    return async (req: DemoRequest): Promise<Response | null> => {
        const exact = routes[`${req.method} ${req.path}`];
        if (exact) {
            // A short pause so loading states look like the real app; longer for "AI"
            await wait(/\/api\/(ai|chat|classify|labels\/scan)/.test(req.path) ? 900 : 150);
            return exact(req);
        }
        const message = req.path.match(/^\/api\/gmail\/messages\/([^/]+)$/);
        if (message && req.method === "GET") {
            await wait(150);
            const m = byId(decodeURIComponent(message[1]));
            return m ? json({ ...withFlags(m), ...analysisFor(m) }) : error("Email not found", 404);
        }
        const thread = req.path.match(/^\/api\/gmail\/threads\/([^/]+)$/);
        if (thread && req.method === "GET") {
            await wait(150);
            const threadId = decodeURIComponent(thread[1]);
            const messages = threadOf(threadId).filter((m) => !m.labels.includes("DRAFT")).map(withFlags);
            return messages.length ? json({ threadId, messages }) : error("Conversation not found", 404);
        }
        // Real sign-in still works from the demo ("Connect your Gmail")
        if (req.path.startsWith("/api/auth/")) return null;
        return error("This isn't available in the demo.", 404);
    };
}

async function readBody(body: BodyInit | null | undefined): Promise<Json> {
    if (!body) return {};
    try {
        if (typeof body === "string") return JSON.parse(body);
        if (body instanceof FormData) return JSON.parse(String(body.get("payload") ?? "{}"));
    } catch {
        // fall through: an unreadable body is treated as empty
    }
    return {};
}

let installed = false;

/** Routes this page's /api requests to the sample mailbox. Call once, in the browser. */
export function installDemoApi(): void {
    if (installed || typeof window === "undefined") return;
    installed = true;
    const handle = createDemoApi(createDemoState());
    const realFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.href);
        if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) return realFetch(input, init);
        const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
        const response = await handle({ method, path: url.pathname, query: url.searchParams, body: await readBody(init?.body) });
        return response ?? realFetch(input, init);
    };
}
