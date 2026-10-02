import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { refreshAccessToken } from "@/lib/auth";
import { isFolder, type Folder, type MailAttachment, type MailItem, type MailMessage } from "@/lib/mail-types";

export { isFolder };

/**
 * Server-side Gmail access. The Google access token lives in the encrypted
 * NextAuth cookie and is only read here, so the browser never holds it.
 */

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const LIST_HEADERS = ["From", "To", "Cc", "Subject", "Date", "Content-Type"];
const CONCURRENCY = 10;

export class GmailError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = "GmailError";
    }
}

export interface GmailAuth {
    email: string;
    accessToken: string;
}

/**
 * The signed-in user's email and a valid Google access token, refreshing it
 * if it has expired. Returns null when the user must sign in again.
 */
export async function getGmailAuth(req: NextRequest): Promise<GmailAuth | null> {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email || !token.accessToken) return null;

    const expires = Number(token.accessTokenExpires) || 0;
    if (Date.now() < expires - 60_000) {
        return { email: token.email, accessToken: String(token.accessToken) };
    }

    // Expired: refresh for this request. The cookie itself is refreshed the
    // next time the browser polls its session.
    const refreshed = await refreshAccessToken(token);
    if (refreshed.error || !refreshed.accessToken) return null;
    return { email: token.email, accessToken: String(refreshed.accessToken) };
}

export async function gmailFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${GMAIL_API}/${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            ...init?.headers,
        },
        cache: "no-store",
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new GmailError(response.status, data?.error?.message || `Gmail request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
}

/* ---------- Folders ---------- */

const FOLDER_QUERIES: Record<Folder, string> = {
    Inbox: "in:inbox",
    Starred: "is:starred",
    Sent: "in:sent",
    Draft: "in:drafts",
    "All Mail": "",
    // Gmail has no Archive label: archived mail is everything not in a system folder
    Archive: "-in:inbox -in:sent -in:drafts -in:spam -in:trash -in:chats",
    Spam: "in:spam",
    Trash: "in:trash",
};

export function folderQuery(folder: Folder, search = ""): { q: string; includeSpamTrash: boolean } {
    return {
        q: [FOLDER_QUERIES[folder], search.trim()].filter(Boolean).join(" "),
        includeSpamTrash: folder === "Spam" || folder === "Trash",
    };
}

/* ---------- Gmail API shapes (the parts we use) ---------- */

interface GmailHeader { name: string; value: string }

interface GmailPart {
    partId?: string;
    mimeType?: string;
    filename?: string;
    headers?: GmailHeader[];
    body?: { size?: number; data?: string; attachmentId?: string };
    parts?: GmailPart[];
}

export interface GmailMessage {
    id: string;
    threadId: string;
    labelIds?: string[];
    snippet?: string;
    internalDate?: string;
    payload?: GmailPart;
}

interface GmailList {
    messages?: { id: string; threadId: string }[];
    nextPageToken?: string;
}

/* ---------- Parsing ---------- */

function header(headers: GmailHeader[] | undefined, name: string): string {
    return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** "Jane Doe <jane@x.com>" -> name "Jane Doe", address "jane@x.com" */
export function parseAddress(value: string): { name: string; email: string } {
    const match = value.match(/^\s*"?([^"<]*?)"?\s*<([^<>]+)>\s*$/);
    if (match) return { name: match[1].trim() || match[2].trim(), email: match[2].trim() };
    return { name: value.trim(), email: value.trim() };
}

function decodeBody(data: string, contentType: string): string {
    const bytes = Buffer.from(data, "base64url");
    const charset = contentType.match(/charset="?([^";\s]+)"?/i)?.[1] || "utf-8";
    try {
        return new TextDecoder(charset).decode(bytes);
    } catch {
        return bytes.toString("utf-8");
    }
}

function findPart(part: GmailPart | undefined, mimeType: string): GmailPart | null {
    if (!part) return null;
    if (part.mimeType === mimeType && part.body?.data && !part.filename) return part;
    for (const child of part.parts ?? []) {
        const found = findPart(child, mimeType);
        if (found) return found;
    }
    return null;
}

function collectAttachments(part: GmailPart | undefined, out: MailAttachment[] = []): MailAttachment[] {
    if (!part) return out;
    if (part.filename && part.body?.attachmentId) {
        out.push({
            attachmentId: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType ?? "application/octet-stream",
            size: part.body.size ?? 0,
        });
    }
    for (const child of part.parts ?? []) collectAttachments(child, out);
    return out;
}

/** List row from a message fetched with format=metadata (or full). */
export function toMailItem(message: GmailMessage): MailItem {
    const headers = message.payload?.headers;
    const from = parseAddress(header(headers, "From"));
    const labels = message.labelIds ?? [];
    return {
        id: message.id,
        threadId: message.threadId,
        from: from.name,
        fromEmail: from.email,
        to: header(headers, "To"),
        cc: header(headers, "Cc"),
        subject: header(headers, "Subject") || "(no subject)",
        date: header(headers, "Date") || (message.internalDate ? new Date(Number(message.internalDate)).toUTCString() : ""),
        snippet: decodeEntities(message.snippet ?? ""),
        isUnread: labels.includes("UNREAD"),
        isStarred: labels.includes("STARRED"),
        hasAttachment: /multipart\/mixed/i.test(header(headers, "Content-Type")) || collectAttachments(message.payload).length > 0,
    };
}

/** Full message from format=full: list fields plus body and attachments. */
export function toMailMessage(message: GmailMessage): MailMessage {
    const html = findPart(message.payload, "text/html");
    const text = findPart(message.payload, "text/plain");
    const part = html ?? text;
    const contentType = part ? header(part.headers, "Content-Type") : "";
    const headers = message.payload?.headers;
    const attachments = collectAttachments(message.payload);

    return {
        ...toMailItem(message),
        hasAttachment: attachments.length > 0,
        body: part?.body?.data ? decodeBody(part.body.data, contentType) : "",
        bodyIsHtml: Boolean(html),
        attachments,
        messageId: header(headers, "Message-ID") || header(headers, "Message-Id"),
        references: header(headers, "References"),
    };
}

/** Plain-text version of a message body, for AI prompts. */
export function bodyText(message: MailMessage, maxChars: number): string {
    const text = message.bodyIsHtml
        ? message.body
            .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
            .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
            .replace(/<[^>]+>/g, " ")
        : message.body;
    return decodeEntities(text).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim().slice(0, maxChars);
}

function decodeEntities(text: string): string {
    return text
        .replace(/&nbsp;/g, " ")
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&amp;/g, "&");
}

/* ---------- Fetching ---------- */

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await fn(items[index]);
        }
    });
    await Promise.all(workers);
    return results;
}

/** Fetches list rows for message ids, skipping any that no longer exist. */
export async function getMailItems(accessToken: string, ids: string[]): Promise<MailItem[]> {
    const params = new URLSearchParams({ format: "metadata" });
    for (const h of LIST_HEADERS) params.append("metadataHeaders", h);

    const items = await mapLimit(ids, CONCURRENCY, async (id) => {
        try {
            return toMailItem(await gmailFetch<GmailMessage>(accessToken, `messages/${encodeURIComponent(id)}?${params}`));
        } catch (error) {
            if (error instanceof GmailError && error.status === 404) return null;
            throw error;
        }
    });
    return items.filter((m): m is MailItem => m !== null);
}

export async function getMailMessage(accessToken: string, id: string): Promise<MailMessage> {
    return toMailMessage(await gmailFetch<GmailMessage>(accessToken, `messages/${encodeURIComponent(id)}?format=full`));
}

export async function listMessageIds(
    accessToken: string,
    options: { q: string; includeSpamTrash: boolean; pageToken?: string; maxResults: number },
): Promise<{ ids: string[]; nextPageToken: string | null }> {
    const params = new URLSearchParams({ maxResults: String(options.maxResults) });
    if (options.q) params.set("q", options.q);
    if (options.includeSpamTrash) params.set("includeSpamTrash", "true");
    if (options.pageToken) params.set("pageToken", options.pageToken);

    const data = await gmailFetch<GmailList>(accessToken, `messages?${params}`);
    return { ids: (data.messages ?? []).map((m) => m.id), nextPageToken: data.nextPageToken ?? null };
}
