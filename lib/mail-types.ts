/** Mail shapes shared by the API routes and the browser. */

/** Gmail folders the app can show. Anything else in the sidebar is a Smart Label. */
export const FOLDERS = ["Inbox", "Starred", "Sent", "Draft", "All Mail", "Archive", "Spam", "Trash"] as const;
export type Folder = (typeof FOLDERS)[number];

export function isFolder(value: unknown): value is Folder {
    return typeof value === "string" && (FOLDERS as readonly string[]).includes(value);
}

export interface MailAnalysis {
    category?: string;
    summary?: string;
    requires_reply?: boolean;
    draft_reply?: string;
    appliedLabels?: string[];
}

/** One row in the email list (no body). */
export interface MailItem extends MailAnalysis {
    id: string;
    threadId: string;
    /** Sender display name */
    from: string;
    /** Sender address */
    fromEmail: string;
    to: string;
    cc: string;
    subject: string;
    date: string;
    snippet: string;
    isUnread: boolean;
    isStarred: boolean;
    hasAttachment: boolean;
}

export interface MailAttachment {
    attachmentId: string;
    filename: string;
    mimeType: string;
    size: number;
}

/** A fully loaded message, as shown in the reading pane. */
export interface MailMessage extends MailItem {
    body: string;
    bodyIsHtml: boolean;
    attachments: MailAttachment[];
    /** Only present on drafts and sent mail */
    bcc: string;
    /** RFC 5322 Message-ID, used to thread replies */
    messageId: string;
    references: string;
}

export interface MailPage {
    emails: MailItem[];
    /** Pass back as `pageToken` to load the next page; null on the last page */
    nextPageToken: string | null;
}
