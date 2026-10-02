import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import EmailAnalysis from "@/models/EmailAnalysis";
import { getSessionEmail } from "@/lib/auth";
import { unauthorized } from "@/lib/api-response";
import { MAX_LABELS, SmartLabel, validateLabel } from "@/lib/labels";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Smart Label management. Every response is the user's full, updated label list.
 *   POST   { name, prompt, color }                    create
 *   PATCH  { originalName, name, prompt, color }      edit (renames it on tagged emails)
 *   DELETE ?name=...                                  delete (removes it from tagged emails)
 */

async function loadLabels(email: string): Promise<SmartLabel[]> {
    const user = await User.findOne({ email }).select("customLabels").lean<{ customLabels?: SmartLabel[] }>();
    return (user?.customLabels ?? []).map(({ name, prompt, color }) => ({ name, prompt, color }));
}

async function saveLabels(email: string, labels: SmartLabel[]) {
    await User.updateOne({ email }, { $set: { customLabels: labels } }, { upsert: true });
    return NextResponse.json({ customLabels: labels });
}

const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function POST(req: Request) {
    const email = await getSessionEmail();
    if (!email) return unauthorized();
    const limited = await rateLimit(email, "writes");
    if (limited) return limited;

    await dbConnect();
    const labels = await loadLabels(email);
    if (labels.length >= MAX_LABELS) return badRequest(`You can have up to ${MAX_LABELS} labels.`);

    const label = validateLabel(await req.json().catch(() => null), labels);
    if (typeof label === "string") return badRequest(label);
    return saveLabels(email, [...labels, label]);
}

export async function PATCH(req: Request) {
    const email = await getSessionEmail();
    if (!email) return unauthorized();
    const limited = await rateLimit(email, "writes");
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    const originalName = body?.originalName;
    if (typeof originalName !== "string") return badRequest("Which label should be edited?");

    await dbConnect();
    const labels = await loadLabels(email);
    const index = labels.findIndex((l) => l.name === originalName);
    if (index === -1) return NextResponse.json({ error: "That label no longer exists." }, { status: 404 });

    const others = labels.filter((_, i) => i !== index);
    const label = validateLabel(body, others);
    if (typeof label === "string") return badRequest(label);

    if (label.name !== originalName) {
        // Keep emails tagged under the old name tagged under the new one
        await EmailAnalysis.updateMany(
            { userEmail: email, appliedLabels: originalName },
            { $set: { "appliedLabels.$[old]": label.name } },
            { arrayFilters: [{ old: originalName }] },
        );
    }
    labels[index] = label;
    return saveLabels(email, labels);
}

export async function DELETE(req: Request) {
    const email = await getSessionEmail();
    if (!email) return unauthorized();
    const limited = await rateLimit(email, "writes");
    if (limited) return limited;

    const name = new URL(req.url).searchParams.get("name");
    if (!name) return badRequest("Which label should be deleted?");

    await dbConnect();
    const labels = await loadLabels(email);
    await EmailAnalysis.updateMany({ userEmail: email, appliedLabels: name }, { $pull: { appliedLabels: name } });
    return saveLabels(email, labels.filter((l) => l.name !== name));
}
