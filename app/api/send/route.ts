import { NextRequest, NextResponse } from "next/server";
import { getGmailAuth, gmailFetch } from "@/lib/gmail";
import { buildRawMessage, MimeError, parseRecipients } from "@/lib/mime";
import { gmailAuthRequired, gmailErrorResponse } from "@/lib/api-response";

const MAX_BODY_CHARS = 500_000;

/**
 * POST /api/send
 * { to, cc?, bcc?, subject, message, isHtml?, threadId?, inReplyTo?, references? }
 */
export async function POST(req: NextRequest) {
  const auth = await getGmailAuth(req);
  if (!auth) return gmailAuthRequired();

  try {
    const body = await req.json();
    const { subject = "", message, isHtml, threadId, inReplyTo, references } = body ?? {};

    if (typeof subject !== "string" || typeof message !== "string" || message.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: "Invalid subject or message." }, { status: 400 });
    }
    if (threadId !== undefined && (typeof threadId !== "string" || !/^[a-zA-Z0-9]+$/.test(threadId))) {
      return NextResponse.json({ error: "Invalid thread." }, { status: 400 });
    }

    const raw = buildRawMessage({
      to: parseRecipients(body.to, "To", true),
      cc: parseRecipients(body.cc, "Cc"),
      bcc: parseRecipients(body.bcc, "Bcc"),
      subject: subject.slice(0, 1000),
      ...(isHtml ? { html: message } : { text: message }),
      inReplyTo: typeof inReplyTo === "string" ? inReplyTo : undefined,
      references: typeof references === "string" ? references : undefined,
    });

    await gmailFetch(auth.accessToken, "messages/send", {
      method: "POST",
      body: JSON.stringify({ raw, ...(threadId ? { threadId } : {}) }),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof MimeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return gmailErrorResponse(error, "Send failed");
  }
}
