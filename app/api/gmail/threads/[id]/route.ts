import { NextRequest, NextResponse } from "next/server";
import { getGmailAuth, getThread } from "@/lib/gmail";
import { withAnalysis } from "@/lib/analysis";
import { gmailAuthRequired, gmailErrorResponse } from "@/lib/api-response";
import type { MailThread } from "@/lib/mail-types";

/** GET /api/gmail/threads/:id: every message in a conversation, oldest first. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await getGmailAuth(req);
    if (!auth) return gmailAuthRequired();

    const { id } = await params;
    if (!/^[a-zA-Z0-9]+$/.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    try {
        const messages = await withAnalysis(auth.email, await getThread(auth.accessToken, id));
        if (messages.length === 0) return NextResponse.json({ error: "That conversation no longer exists." }, { status: 404 });
        const body: MailThread = { threadId: id, messages };
        return NextResponse.json(body);
    } catch (error) {
        return gmailErrorResponse(error, "Get thread failed");
    }
}
