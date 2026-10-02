import { NextRequest, NextResponse } from "next/server";
import {
    findDraftByMessageId, getDraft, getDraftAttachments, getGmailAuth, gmailFetch, gmailUpload, GmailError,
} from "@/lib/gmail";
import { buildMimeMessage, MimeError } from "@/lib/mime";
import { parseComposeRequest } from "@/lib/compose-request";
import { gmailAuthRequired, gmailErrorResponse } from "@/lib/api-response";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const ID = /^[a-zA-Z0-9-]+$/;

/**
 * Gmail drafts for the compose window.
 *   GET    ?messageId=   open a draft from the Draft folder
 *   POST   compose fields (+ draftId to update)   save; returns { draftId, messageId, attachments }
 *   DELETE ?id=          discard
 */
export async function GET(req: NextRequest) {
    const auth = await getGmailAuth(req);
    if (!auth) return gmailAuthRequired();

    const messageId = req.nextUrl.searchParams.get("messageId") ?? "";
    if (!ID.test(messageId)) return NextResponse.json({ error: "Invalid draft." }, { status: 400 });

    try {
        const draftId = await findDraftByMessageId(auth.accessToken, messageId);
        if (!draftId) return NextResponse.json({ error: "That draft no longer exists." }, { status: 404 });
        const { message } = await getDraft(auth.accessToken, draftId);
        return NextResponse.json({ draftId, message });
    } catch (error) {
        return gmailErrorResponse(error, "Open draft failed");
    }
}

export async function POST(req: NextRequest) {
    const auth = await getGmailAuth(req);
    if (!auth) return gmailAuthRequired();
    const limited = await rateLimit(auth.email, "drafts");
    if (limited) return limited;

    try {
        const { message, threadId, draftId, keepDraftAttachments } = await parseComposeRequest(req, false);
        if (draftId && keepDraftAttachments.length > 0) {
            const kept = await getDraftAttachments(auth.accessToken, draftId, keepDraftAttachments);
            message.attachments = [...kept, ...(message.attachments ?? [])];
        }

        const metadata = { ...(draftId ? { id: draftId } : {}), message: threadId ? { threadId } : {} };
        const mime = buildMimeMessage(message);
        let saved: { id: string; message: { id: string } };
        try {
            saved = draftId
                ? await gmailUpload(auth.accessToken, `drafts/${draftId}`, "PUT", metadata, mime)
                : await gmailUpload(auth.accessToken, "drafts", "POST", metadata, mime);
        } catch (error) {
            // The draft was deleted elsewhere (e.g. in Gmail): save it as a new one
            if (draftId && error instanceof GmailError && error.status === 404) {
                saved = await gmailUpload(auth.accessToken, "drafts", "POST", { message: metadata.message }, mime);
            } else {
                throw error;
            }
        }
        // Gmail re-issues attachment ids on every save: send back the current ones
        const attachments = message.attachments?.length
            ? (await getDraft(auth.accessToken, saved.id)).message.attachments
            : [];
        return NextResponse.json({ draftId: saved.id, messageId: saved.message.id, attachments });
    } catch (error) {
        if (error instanceof MimeError) return NextResponse.json({ error: error.message }, { status: 400 });
        return gmailErrorResponse(error, "Save draft failed");
    }
}

export async function DELETE(req: NextRequest) {
    const auth = await getGmailAuth(req);
    if (!auth) return gmailAuthRequired();
    const limited = await rateLimit(auth.email, "drafts");
    if (limited) return limited;

    const id = req.nextUrl.searchParams.get("id") ?? "";
    if (!ID.test(id)) return NextResponse.json({ error: "Invalid draft." }, { status: 400 });

    try {
        await gmailFetch(auth.accessToken, `drafts/${id}`, { method: "DELETE" });
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof GmailError && error.status === 404) return NextResponse.json({ success: true });
        return gmailErrorResponse(error, "Discard draft failed");
    }
}
