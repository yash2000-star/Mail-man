import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import EmailAnalysis from "@/models/EmailAnalysis";
import { folderQuery, getGmailAuth, getMailItems, isFolder, listMessageIds } from "@/lib/gmail";
import { withAnalysis } from "@/lib/analysis";
import { gmailAuthRequired, gmailErrorResponse } from "@/lib/api-response";
import type { MailPage } from "@/lib/mail-types";

const PAGE_SIZE = 25;

/**
 * GET /api/gmail/messages
 *   ?folder=Inbox|Starred|Sent|Draft|All Mail|Archive|Spam|Trash
 *   ?label=<Smart Label name>   (emails the AI tagged with that label)
 *   &q=<Gmail search>  &pageToken=<from the previous page>
 */
export async function GET(req: NextRequest) {
    const auth = await getGmailAuth(req);
    if (!auth) return gmailAuthRequired();

    const params = req.nextUrl.searchParams;
    const label = params.get("label");
    const pageToken = params.get("pageToken") || undefined;

    try {
        let page: { ids: string[]; nextPageToken: string | null };

        if (label) {
            // Smart Labels live in our database, not in Gmail
            const offset = Math.max(0, Number(pageToken) || 0);
            await dbConnect();
            const tagged = await EmailAnalysis.find({ userEmail: auth.email, appliedLabels: label })
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
            page = await listMessageIds(auth.accessToken, { ...folderQuery(folder, search), pageToken, maxResults: PAGE_SIZE });
        }

        const emails = await withAnalysis(auth.email, await getMailItems(auth.accessToken, page.ids));
        const body: MailPage = { emails, nextPageToken: page.nextPageToken };
        return NextResponse.json(body);
    } catch (error) {
        return gmailErrorResponse(error, "List messages failed");
    }
}
