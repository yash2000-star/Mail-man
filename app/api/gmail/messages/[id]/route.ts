import { NextRequest, NextResponse } from "next/server";
import { getGmailAuth, getMailMessage } from "@/lib/gmail";
import { withAnalysis } from "@/lib/analysis";
import { gmailAuthRequired, gmailErrorResponse } from "@/lib/api-response";

/** GET /api/gmail/messages/:id: the full message for the reading pane. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await getGmailAuth(req);
    if (!auth) return gmailAuthRequired();

    const { id } = await params;
    if (!/^[a-zA-Z0-9]+$/.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    try {
        const [message] = await withAnalysis(auth.email, [await getMailMessage(auth.accessToken, id)]);
        return NextResponse.json(message);
    } catch (error) {
        return gmailErrorResponse(error, "Get message failed");
    }
}
