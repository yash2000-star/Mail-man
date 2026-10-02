import { NextRequest, NextResponse } from "next/server";
import { getGmailAuth, gmailFetch } from "@/lib/gmail";
import { gmailAuthRequired, gmailErrorResponse } from "@/lib/api-response";
import { rateLimit } from "@/lib/rate-limit";

// Each action is a Gmail label change on the message
const ACTIONS: Record<string, { add?: string[]; remove?: string[] }> = {
    archive: { remove: ["INBOX"] },
    unarchive: { add: ["INBOX"] },
    trash: { add: ["TRASH"], remove: ["INBOX"] },
    untrash: { add: ["INBOX"], remove: ["TRASH"] },
    spam: { add: ["SPAM"], remove: ["INBOX"] },
    notspam: { add: ["INBOX"], remove: ["SPAM"] },
    read: { remove: ["UNREAD"] },
    unread: { add: ["UNREAD"] },
    star: { add: ["STARRED"] },
    unstar: { remove: ["STARRED"] },
};

export async function POST(req: NextRequest) {
    const auth = await getGmailAuth(req);
    if (!auth) return gmailAuthRequired();
    const limited = await rateLimit(auth.email, "writes");
    if (limited) return limited;

    try {
        // { id, action } changes one message; { threadId, action } the whole conversation
        const { id, threadId, action } = await req.json();
        const change = typeof action === "string" ? ACTIONS[action] : undefined;
        const target = typeof threadId === "string" ? `threads/${threadId}` : `messages/${id}`;
        const targetId = typeof threadId === "string" ? threadId : id;
        if (typeof targetId !== "string" || !/^[a-zA-Z0-9]+$/.test(targetId) || !change) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        await gmailFetch(auth.accessToken, `${target}/modify`, {
            method: "POST",
            body: JSON.stringify({ addLabelIds: change.add ?? [], removeLabelIds: change.remove ?? [] }),
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return gmailErrorResponse(error, "Email action failed");
    }
}
