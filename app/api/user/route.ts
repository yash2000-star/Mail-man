import { NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { encryptApiKey } from '@/lib/encryption';
import { AI_PROVIDERS, AiProvider, isAiProvider } from '@/lib/ai';
import { KEY_FIELDS, keyHint, providersWithKeys } from '@/lib/user-ai';
import { unauthorized } from '@/lib/api-response';

const MAX_KEY_LENGTH = 512;
const MAX_LABELS = 100;
const MAX_TASKS = 2000;

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

function sanitizeTasks(input: unknown) {
    if (!Array.isArray(input) || input.length > MAX_TASKS) return null;
    const tasks = [];
    for (const task of input) {
        if (!task || typeof task !== 'object') return null;
        tasks.push({
            id: str(task.id, 100) ?? '',
            emailId: str(task.emailId, 100) ?? '',
            title: str(task.title, 1000) ?? '',
            date: str(task.date, 100) ?? '',
            isUrgent: Boolean(task.isUrgent),
            isPastDue: Boolean(task.isPastDue),
            status: task.status === 'done' ? 'done' : 'active',
        });
    }
    return tasks;
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
function toClient(user: UserDoc) {
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
        globalTasks: user.globalTasks ?? [],
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

        return NextResponse.json(toClient(user!), { status: 200 });
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

        if (body.globalTasks !== undefined) {
            const tasks = sanitizeTasks(body.globalTasks);
            if (!tasks) return NextResponse.json({ error: 'Invalid globalTasks' }, { status: 400 });
            updateData.globalTasks = tasks;
        }

        const user = await User.findOneAndUpdate(
            { email },
            Object.keys(updateData).length > 0 ? { $set: updateData } : { $setOnInsert: { email } },
            { new: true, upsert: true, runValidators: true },
        ).lean<UserDoc>();

        return NextResponse.json(toClient(user!), { status: 200 });
    } catch (error) {
        console.error("User POST error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
