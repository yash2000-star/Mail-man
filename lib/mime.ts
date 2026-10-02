import { randomBytes } from "crypto";

/**
 * Builds RFC 5322 messages for Gmail's send API. Header values are validated
 * so user input can never add headers of its own.
 */

const HEADER_BREAK = /[\r\n]/;
// "user@example.com" or "Display Name <user@example.com>"
const ADDRESS = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;

export class MimeError extends Error {}

function isValidRecipient(recipient: string): boolean {
    const match = recipient.match(/^(.*)<([^<>]+)>$/);
    if (match) return ADDRESS.test(match[2].trim()) && !/[<>]/.test(match[1]);
    return ADDRESS.test(recipient);
}

/** Splits "a@x.com, B <b@y.com>" into validated recipients; throws on bad input. */
export function parseRecipients(value: unknown, field: string, required = false): string[] {
    if (value === undefined || value === null || value === "") {
        if (required) throw new MimeError(`Add at least one recipient in "${field}".`);
        return [];
    }
    if (typeof value !== "string" || HEADER_BREAK.test(value)) throw new MimeError(`Invalid "${field}" field.`);
    const recipients = value.split(/[,;]/).map((r) => r.trim()).filter(Boolean);
    if (required && recipients.length === 0) throw new MimeError(`Add at least one recipient in "${field}".`);
    const bad = recipients.find((r) => !isValidRecipient(r));
    if (bad) throw new MimeError(`"${bad}" is not a valid email address.`);
    return recipients;
}

/** RFC 2047 encoded-word so non-ASCII header text survives transport. */
function encodeHeader(value: string): string {
    return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

function base64Lines(text: string): string {
    return Buffer.from(text, "utf-8").toString("base64").replace(/.{76}/g, "$&\r\n");
}

/** Rough plain-text version of an HTML body, for the text/plain alternative. */
export function htmlToText(html: string): string {
    return html
        .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|li|h\d)>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export interface OutgoingMessage {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    /** Plain-text body (used when html is not given) */
    text?: string;
    /** HTML body; a plain-text alternative is generated from it */
    html?: string;
    /** Message-ID of the email being replied to */
    inReplyTo?: string;
    references?: string;
}

/** Returns the base64url "raw" string Gmail's messages.send expects. */
export function buildRawMessage(message: OutgoingMessage): string {
    for (const value of [message.subject, message.inReplyTo ?? "", message.references ?? ""]) {
        if (HEADER_BREAK.test(value)) throw new MimeError("Invalid header value.");
    }

    const headers = [
        `To: ${message.to.join(", ")}`,
        ...(message.cc?.length ? [`Cc: ${message.cc.join(", ")}`] : []),
        // Gmail reads Bcc from the raw message and strips it before delivery
        ...(message.bcc?.length ? [`Bcc: ${message.bcc.join(", ")}`] : []),
        `Subject: ${encodeHeader(message.subject)}`,
        ...(message.inReplyTo ? [`In-Reply-To: ${message.inReplyTo}`] : []),
        ...(message.inReplyTo || message.references
            ? [`References: ${[message.references, message.inReplyTo].filter(Boolean).join(" ")}`]
            : []),
        "MIME-Version: 1.0",
    ];

    let body: string[];
    if (message.html) {
        const boundary = `mm_${randomBytes(12).toString("hex")}`;
        body = [
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            "",
            `--${boundary}`,
            'Content-Type: text/plain; charset="UTF-8"',
            "Content-Transfer-Encoding: base64",
            "",
            base64Lines(htmlToText(message.html)),
            `--${boundary}`,
            'Content-Type: text/html; charset="UTF-8"',
            "Content-Transfer-Encoding: base64",
            "",
            base64Lines(message.html),
            `--${boundary}--`,
        ];
    } else {
        body = [
            'Content-Type: text/plain; charset="UTF-8"',
            "Content-Transfer-Encoding: base64",
            "",
            base64Lines(message.text ?? ""),
        ];
    }

    return Buffer.from([...headers, ...body].join("\r\n"), "utf-8").toString("base64url");
}
