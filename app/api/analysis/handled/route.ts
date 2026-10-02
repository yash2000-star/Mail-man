import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import EmailAnalysis from "@/models/EmailAnalysis";
import { getSessionEmail } from "@/lib/auth";
import { unauthorized } from "@/lib/api-response";

/** POST { emailId }: takes an email off the Needs Reply list. */
export async function POST(req: Request) {
    const email = await getSessionEmail();
    if (!email) return unauthorized();

    const { emailId } = (await req.json().catch(() => ({}))) ?? {};
    if (typeof emailId !== "string" || !/^[a-zA-Z0-9]+$/.test(emailId)) {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    await dbConnect();
    await EmailAnalysis.updateOne({ emailId, userEmail: email }, { $set: { requires_reply: false } });
    return NextResponse.json({ success: true });
}
