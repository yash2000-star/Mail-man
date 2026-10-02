import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import EmailAnalysis from "@/models/EmailAnalysis";
import { folderQuery, getGmailAuth, getMailItems, getThreadItems, isFolder, listMessageIds, listThreadIds } from "@/lib/gmail";
import { withAnalysis } from "@/lib/analysis";
import { gmailAuthRequired, gmailErrorResponse } from "@/lib/api-response";
import type { MailPage } from "@/lib/mail-types";

const PAGE_SIZE = 25;

// Folders shown as conversations. Sent and Draft stay one row per message:
// Sent should show your own messages, and each draft opens on its own.
const THREADED = new Set(["Inbox", "Starred", "All Mail", "Archive", "Spam", "Trash"]);

/**
 * GET /api/gmail/messages
 *   ?folder=Inbox|Starred|Sent|Draft|All Mail|Archive|Spam|Trash
 *   ?label=<Smart Label name>   (emails the AI tagged with that label)
 *   ?view=needs-reply           (emails the AI flagged as needing a reply)
 *   &q=<Gmail search>  &pageToken=<from the previous page>
 */
export async function GET(req: NextRequest) {
    const auth = await getGmailAuth(req);
    if (!auth) return gmailAuthRequired();

    const params = req.nextUrl.searchParams;
    const label = params.get("label");
    const view = params.get("view");
    const pageToken = params.get("pageToken") || undefined;

    try {
        let page: { ids: string[]; nextPageToken: string | null };

        if (label || view === "needs-reply") {
            // Smart Labels and reply flags live in our database, not in Gmail
            const offset = Math.max(0, Number(pageToken) || 0);
            await dbConnect();
            const filter = label
                ? { userEmail: auth.email, appliedLabels: label }
                : { userEmail: auth.email, requires_reply: true };
            const tagged = await EmailAnalysis.find(filter)
                .sort({ updatedAt: -1 })
                .skip(offset)
                .limit(PAGE_SIZE)
                .select("emailId")
                .lean<{ emailId: string }[]>();
            page = {
                ids: tagged.map((t) => t.emailId),
                nextPageToken: tagged.length === PAGE_SIZE ? String(offset + PAGE_SIZE) : null,
            };
        } else {
            const folder = params.get("folder") || "Inbox";
            if (!isFolder(folder)) return NextResponse.json({ error: "Unknown folder" }, { status: 400 });
            const search = (params.get("q") || "").slice(0, 500);
            const query = { ...folderQuery(folder, search), pageToken, maxResults: PAGE_SIZE };
            if (THREADED.has(folder)) {
                const threads = await listThreadIds(auth.accessToken, query);
                const emails = await withAnalysis(auth.email, await getThreadItems(auth.accessToken, threads.ids, auth.email));
                const body: MailPage = { emails, nextPageToken: threads.nextPageToken };
                return NextResponse.json(body);
            }
            page = await listMessageIds(auth.accessToken, query);
        }

        const emails = await withAnalysis(auth.email, await getMailItems(auth.accessToken, page.ids));
        const body: MailPage = { emails, nextPageToken: page.nextPageToken };
        return NextResponse.json(body);
    } catch (error) {
        return gmailErrorResponse(error, "List messages failed");
    }
}
