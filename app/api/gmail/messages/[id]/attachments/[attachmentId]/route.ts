import { NextRequest, NextResponse } from "next/server";
import { getGmailAuth, getMailMessage, gmailFetch } from "@/lib/gmail";
import { gmailAuthRequired, gmailErrorResponse } from "@/lib/api-response";

/** GET: downloads one attachment of a message. */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
    const auth = await getGmailAuth(req);
    if (!auth) return gmailAuthRequired();

    const { id, attachmentId } = await params;
    if (!/^[a-zA-Z0-9]+$/.test(id) || !/^[\w-]+$/.test(attachmentId)) {
        return NextResponse.json({ error: "Invalid attachment" }, { status: 400 });
    }

    try {
        // Look the attachment up on the message to get its real name and type
        const message = await getMailMessage(auth.accessToken, id);
        const meta = message.attachments.find((a) => a.attachmentId === attachmentId);
        if (!meta) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

        const data = await gmailFetch<{ data: string }>(
            auth.accessToken,
            `messages/${id}/attachments/${encodeURIComponent(attachmentId)}`,
        );
        const bytes = Buffer.from(data.data, "base64url");
        const filename = meta.filename.replace(/["\r\n]/g, "_");

        return new NextResponse(bytes, {
            headers: {
                // Always download: never render attachment content in our origin
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(meta.filename)}`,
                "Content-Length": String(bytes.length),
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        return gmailErrorResponse(error, "Attachment download failed");
    }
}
