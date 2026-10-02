import { NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import EmailAnalysis from '@/models/EmailAnalysis';
import { encryptApiKey } from '@/lib/encryption';
import { AI_PROVIDERS, AiProvider, isAiProvider } from '@/lib/ai';
import { KEY_FIELDS, keyHint, providersWithKeys } from '@/lib/user-ai';
import { unauthorized } from '@/lib/api-response';
import { normalizeTask } from '@/lib/tasks';

const MAX_KEY_LENGTH = 512;
const MAX_LABELS = 100;

const str = (value: unknown, max: number) =>
    typeof value === 'string' ? value.slice(0, max) : undefined;

function sanitizeLabels(input: unknown) {
    if (!Array.isArray(input) || input.length > MAX_LABELS) return null;
    const labels = [];
    for (const label of input) {
        if (!label || typeof label !== 'object') return null;
        labels.push({
            name: str(label.name, 100) ?? '',
            prompt: str(label.prompt, 2000) ?? '',
            color: str(label.color, 50) ?? '',
            applyRetroactively: Boolean(label.applyRetroactively),
        });
    }
    return labels;
}


interface UserDoc {
    email: string;
    aiProvider?: string;
    geminiApiKey?: string;
    openAiApiKey?: string;
    anthropicApiKey?: string;
    customLabels?: unknown[];
    globalTasks?: unknown[];
}

/**
 * What the browser gets back. API keys never leave the server: the client
 * only learns which providers have a key saved and its last 4 characters.
 */
function toClient(user: UserDoc, needsReplyCount: number) {
    const available = providersWithKeys(user);
    const savedKeys = Object.fromEntries(
        AI_PROVIDERS.map((p) => [p, { saved: available.includes(p), hint: keyHint(user[KEY_FIELDS[p]]) }]),
    ) as Record<AiProvider, { saved: boolean; hint: string }>;
    const aiProvider = isAiProvider(user.aiProvider) && available.includes(user.aiProvider)
        ? user.aiProvider
        : available[0] ?? null;

    return {
        email: user.email,
        aiProvider,
        savedKeys,
        customLabels: user.customLabels ?? [],
        // Tasks are edited through /api/tasks
        globalTasks: (user.globalTasks ?? []).map((t) => normalizeTask(t as Record<string, unknown>)),
        needsReplyCount,
    };
}

export async function GET() {
    const email = await getSessionEmail();
    if (!email) return unauthorized();

    try {
        await dbConnect();
        // Find the user, or create one on their first visit
        const user = await User.findOneAndUpdate(
            { email },
            { $setOnInsert: { email } },
            { new: true, upsert: true },
        ).lean<UserDoc>();

        const needsReplyCount = await EmailAnalysis.countDocuments({ userEmail: email, requires_reply: true });
        return NextResponse.json(toClient(user!, needsReplyCount), { status: 200 });
    } catch (error) {
        console.error("User GET error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const email = await getSessionEmail();
    if (!email) return unauthorized();

    try {
        await dbConnect();

        // Only these fields may be written by the client. Anything else in the
        // body (isPremium, email, _id, timestamps...) is ignored, so users
        // cannot grant themselves premium or touch other accounts' data.
        let body: Record<string, unknown>;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};

        for (const field of Object.values(KEY_FIELDS)) {
            const value = body[field];
            if (value === undefined) continue;
            if (typeof value !== 'string' || value.length > MAX_KEY_LENGTH) {
                return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
            }
            const key = value.trim();
            // Empty string clears the key
            updateData[field] = key ? encryptApiKey(key) : '';
        }

        if (body.aiProvider !== undefined) {
            if (!isAiProvider(body.aiProvider)) {
                return NextResponse.json({ error: 'Invalid aiProvider' }, { status: 400 });
            }
            updateData.aiProvider = body.aiProvider;
        }

        if (body.customLabels !== undefined) {
            const labels = sanitizeLabels(body.customLabels);
            if (!labels) return NextResponse.json({ error: 'Invalid customLabels' }, { status: 400 });
            updateData.customLabels = labels;
        }

        const user = await User.findOneAndUpdate(
            { email },
            Object.keys(updateData).length > 0 ? { $set: updateData } : { $setOnInsert: { email } },
            { new: true, upsert: true, runValidators: true },
        ).lean<UserDoc>();

        const needsReplyCount = await EmailAnalysis.countDocuments({ userEmail: email, requires_reply: true });
        return NextResponse.json(toClient(user!, needsReplyCount), { status: 200 });
    } catch (error) {
        console.error("User POST error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
