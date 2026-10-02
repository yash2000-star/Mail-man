import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import EmailAnalysis from "@/models/EmailAnalysis";
import { getSessionEmail } from "@/lib/auth";
import { unauthorized } from "@/lib/api-response";
import type { SmartLabel } from "@/lib/labels";

/** POST { emailId, name, applied }: add or remove a Smart Label on one email by hand. */
export async function POST(req: Request) {
    const email = await getSessionEmail();
    if (!email) return unauthorized();

    const { emailId, name, applied } = (await req.json().catch(() => ({}))) ?? {};
    if (typeof emailId !== "string" || !/^[a-zA-Z0-9]+$/.test(emailId) || typeof name !== "string") {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email }).select("customLabels").lean<{ customLabels?: SmartLabel[] }>();
    if (!user?.customLabels?.some((l) => l.name === name)) {
        return NextResponse.json({ error: "That label no longer exists." }, { status: 404 });
    }

    const analysis = await EmailAnalysis.findOneAndUpdate(
        { emailId, userEmail: email },
        applied ? { $addToSet: { appliedLabels: name } } : { $pull: { appliedLabels: name } },
        { new: true, upsert: true },
    ).lean<{ appliedLabels?: string[] }>();

    return NextResponse.json({ appliedLabels: analysis?.appliedLabels ?? [] });
}
