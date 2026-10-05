import { NextRequest, NextResponse } from "next/server";
import { getGmailAuth, gmailFetch, GmailError } from "@/lib/gmail";
import { gmailAuthRequired, gmailErrorResponse } from "@/lib/api-response";
import type { MailChanges } from "@/lib/mail-types";

interface HistoryResponse {
    historyId?: string;
    nextPageToken?: string;
    history?: { messagesAdded?: { message: { id: string; labelIds?: string[] } }[] }[];
}

const HISTORY_ID = /^\d{1,30}$/;
const MAX_PAGES = 5;

/** The mailbox's current position in Gmail's change history. */
async function currentHistoryId(accessToken: string): Promise<string> {
    const profile = await gmailFetch<{ historyId: string }>(accessToken, "profile");
    return profile.historyId;
}

/**
 * GET /api/gmail/changes?since=<historyId>
 *
 * Which Inbox messages arrived since `since`, using Gmail's history API
 * (much cheaper than re-listing the inbox). Without `since` it only returns
 * the current position. The browser polls this to show new mail live.
 */
export async function GET(req: NextRequest) {
    const auth = await getGmailAuth(req);
    if (!auth) return gmailAuthRequired();

    const since = req.nextUrl.searchParams.get("since");
    try {
        if (!since || !HISTORY_ID.test(since)) {
            const body: MailChanges = { historyId: await currentHistoryId(auth.accessToken), newMessageIds: [] };
            return NextResponse.json(body);
        }

        const ids = new Set<string>();
        let historyId = since;
        let pageToken: string | undefined;
        for (let page = 0; page < MAX_PAGES; page++) {
            const query = new URLSearchParams({ startHistoryId: since, historyTypes: "messageAdded", labelId: "INBOX" });
            if (pageToken) query.set("pageToken", pageToken);
            const history = await gmailFetch<HistoryResponse>(auth.accessToken, `history?${query}`);
            historyId = history.historyId ?? historyId;
            for (const entry of history.history ?? []) {
                for (const { message } of entry.messagesAdded ?? []) {
                    const labels = message.labelIds ?? [];
                    if (labels.includes("INBOX") && !labels.includes("DRAFT") && !labels.includes("SENT")) ids.add(message.id);
                }
            }
            pageToken = history.nextPageToken;
            if (!pageToken) break;
        }

        const body: MailChanges = { historyId, newMessageIds: [...ids] };
        return NextResponse.json(body);
    } catch (error) {
        // Gmail keeps about a week of history; an older position can't be compared
        if (error instanceof GmailError && error.status === 404) {
            const body: MailChanges = { historyId: await currentHistoryId(auth.accessToken), newMessageIds: [], reset: true };
            return NextResponse.json(body);
        }
        return gmailErrorResponse(error, "Mail changes failed");
    }
}
