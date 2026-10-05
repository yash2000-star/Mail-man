/** Building the Compose window's starting content: replies, forwards and reopened drafts. */
import type { MailMessage } from "@/lib/mail-types";

export interface ComposeData {
    to: string;
    subject: string;
    body: string;
    replyTo?: { emailId: string; threadId: string; messageId: string; references: string };
    /** Original message shown below the editor and appended on send */
    quotedHtml?: string;
    /** A saved Gmail draft being reopened */
    draft?: { draftId: string; cc: string; bcc: string; attachments: MailMessage["attachments"] };
}

export const EMPTY_COMPOSE: ComposeData = { to: "", subject: "", body: "" };

export function escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Plain text as editor HTML: blank lines become paragraphs, single newlines line breaks. */
export function textToHtml(text: string): string {
    return text
        .split(/\n{2,}/)
        .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
        .join("");
}

/** "Re: Re: Fwd: Lunch" → "Lunch" */
export function baseSubject(subject: string): string {
    return (subject || "").replace(/^((re|fwd?):\s*)+/i, "").trim();
}

/** The original email as HTML, safe to place inside a quote. */
function originalAsHtml(original: MailMessage): string {
    return original.bodyIsHtml
        ? original.body
        : `<div style="white-space:pre-wrap">${escapeHtml(original.body || original.snippet || "")}</div>`;
}

function senderLine(original: MailMessage): string {
    return `${escapeHtml(original.from)} &lt;${escapeHtml(original.fromEmail)}&gt;`;
}

/** A threaded reply to `original`, quoting it below the editor. */
export function replyCompose(original: MailMessage, body = ""): ComposeData {
    return {
        to: original.fromEmail || original.from,
        subject: `Re: ${baseSubject(original.subject)}`,
        body,
        replyTo: { emailId: original.id, threadId: original.threadId, messageId: original.messageId, references: original.references },
        quotedHtml: `<div class="gmail_quote"><div>On ${escapeHtml(original.date)}, ${senderLine(original)} wrote:</div>`
            + `<blockquote class="gmail_quote" style="margin:0 0 0 .8ex;border-left:1px solid #ccc;padding-left:1ex">`
            + `${originalAsHtml(original)}</blockquote></div>`,
    };
}

/** A forward of `original`, with its headers and body included. */
export function forwardCompose(original: MailMessage, body = ""): ComposeData {
    return {
        to: "",
        subject: `Fwd: ${baseSubject(original.subject)}`,
        body,
        quotedHtml: `<div class="gmail_quote"><div>---------- Forwarded message ----------</div>`
            + `<div>From: ${senderLine(original)}<br>Date: ${escapeHtml(original.date)}<br>Subject: ${escapeHtml(original.subject)}<br>To: ${escapeHtml(original.to)}</div><br>`
            + `${originalAsHtml(original)}</div>`,
    };
}

/** A saved Gmail draft, reopened for editing. */
export function draftCompose(draftId: string, draft: MailMessage): ComposeData {
    return {
        to: draft.to,
        subject: draft.subject === "(no subject)" ? "" : draft.subject,
        body: draft.bodyIsHtml ? draft.body : textToHtml(draft.body),
        draft: { draftId, cc: draft.cc, bcc: draft.bcc, attachments: draft.attachments },
    };
}
