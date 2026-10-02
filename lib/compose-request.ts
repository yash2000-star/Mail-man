import { NextRequest } from "next/server";
import { MimeError, OutgoingAttachment, OutgoingMessage, parseRecipients } from "@/lib/mime";

/** Total attachment size per message. Vercel caps request bodies at 4.5 MB. */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const MAX_BODY_CHARS = 500_000;
const ID = /^[a-zA-Z0-9]+$/;
const DRAFT_ID = /^[a-zA-Z0-9-]+$/;

export interface ComposeRequest {
    message: OutgoingMessage;
    threadId?: string;
    /** Gmail draft being edited, if any */
    draftId?: string;
    /** Email this replies to, so it can leave the Needs Reply list */
    replyToEmailId?: string;
    /** Attachment ids of the saved draft to carry over into this version */
    keepDraftAttachments: string[];
}

/**
 * Reads a compose request: JSON, or multipart/form-data with a "payload"
 * JSON field and "attachments" files. Throws MimeError on invalid input.
 * `requireRecipient` is false for drafts, which may not have one yet.
 */
export async function parseComposeRequest(req: NextRequest, requireRecipient: boolean): Promise<ComposeRequest> {
    let payload: Record<string, unknown>;
    let attachments: OutgoingAttachment[] = [];

    if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
        const form = await req.formData();
        try {
            payload = JSON.parse(String(form.get("payload") ?? "{}"));
        } catch {
            throw new MimeError("Invalid request.");
        }
        const files = form.getAll("attachments").filter((f): f is File => typeof f === "object" && "arrayBuffer" in f);
        const total = files.reduce((sum, f) => sum + f.size, 0);
        if (total > MAX_ATTACHMENT_BYTES) {
            throw new MimeError("Attachments can total at most 4 MB.");
        }
        attachments = await Promise.all(files.map(async (file) => ({
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            data: Buffer.from(await file.arrayBuffer()),
        })));
    } else {
        payload = (await req.json().catch(() => null)) ?? {};
    }

    const { subject = "", message = "", isHtml, threadId, inReplyTo, references, draftId, replyToEmailId } = payload;
    const keep = Array.isArray(payload.keepDraftAttachments)
        ? payload.keepDraftAttachments.filter((id): id is string => typeof id === "string" && /^[\w-]+$/.test(id))
        : [];
    if (typeof subject !== "string" || typeof message !== "string" || message.length > MAX_BODY_CHARS) {
        throw new MimeError("Invalid subject or message.");
    }
    // Gmail draft ids look like "r-12345"; message and thread ids are alphanumeric
    for (const [value, what, pattern] of [
        [threadId, "thread", ID], [draftId, "draft", DRAFT_ID], [replyToEmailId, "email", ID],
    ] as const) {
        if (value !== undefined && (typeof value !== "string" || !pattern.test(value))) throw new MimeError(`Invalid ${what}.`);
    }

    return {
        message: {
            to: parseRecipients(payload.to, "To", requireRecipient),
            cc: parseRecipients(payload.cc, "Cc"),
            bcc: parseRecipients(payload.bcc, "Bcc"),
            subject: subject.slice(0, 1000),
            ...(isHtml ? { html: message } : { text: message }),
            inReplyTo: typeof inReplyTo === "string" ? inReplyTo : undefined,
            references: typeof references === "string" ? references : undefined,
            attachments,
        },
        threadId: threadId as string | undefined,
        draftId: draftId as string | undefined,
        replyToEmailId: replyToEmailId as string | undefined,
        keepDraftAttachments: keep,
    };
}
