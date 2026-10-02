import { NextRequest, NextResponse } from "next/server";
import { getDraftAttachments, getGmailAuth, gmailFetch, gmailUpload, GmailError } from "@/lib/gmail";
import { buildMimeMessage, MimeError } from "@/lib/mime";
import { parseComposeRequest } from "@/lib/compose-request";
import { gmailAuthRequired, gmailErrorResponse } from "@/lib/api-response";
import dbConnect from "@/lib/mongodb";
import EmailAnalysis from "@/models/EmailAnalysis";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

/**
 * POST /api/send: JSON, or multipart/form-data with attachments.
 * Fields: to, cc?, bcc?, subject, message, isHtml?, threadId?, inReplyTo?,
 * references?, draftId? (deleted after sending), replyToEmailId?
 */
export async function POST(req: NextRequest) {
  const auth = await getGmailAuth(req);
  if (!auth) return gmailAuthRequired();
  const limited = await rateLimit(auth.email, "send");
  if (limited) return limited;

  try {
    const { message, threadId, draftId, replyToEmailId, keepDraftAttachments } = await parseComposeRequest(req, true);
    if (draftId && keepDraftAttachments.length > 0) {
      const kept = await getDraftAttachments(auth.accessToken, draftId, keepDraftAttachments);
      message.attachments = [...kept, ...(message.attachments ?? [])];
    }

    await gmailUpload(auth.accessToken, "messages/send", "POST", threadId ? { threadId } : {}, buildMimeMessage(message));

    // The draft has become a sent message: remove it from Drafts
    if (draftId) {
      await gmailFetch(auth.accessToken, `drafts/${draftId}`, { method: "DELETE" }).catch((error) => {
        if (!(error instanceof GmailError && error.status === 404)) console.error("Draft cleanup failed:", error);
      });
    }

    // Replying takes the original off the Needs Reply list
    if (replyToEmailId) {
      await dbConnect();
      await EmailAnalysis.updateOne({ emailId: replyToEmailId, userEmail: auth.email }, { $set: { requires_reply: false } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof MimeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return gmailErrorResponse(error, "Send failed");
  }
}
