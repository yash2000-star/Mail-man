import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { encryptApiKey, decryptApiKey } from '@/lib/encryption';

const API_KEY_FIELDS = ['geminiApiKey', 'openAiApiKey', 'anthropicApiKey'] as const;
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

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Find User, or create one if this is their first time!
        let user = await User.findOne({ email: session.user.email });

        if (!user) {
            user = await User.create({ email: session.user.email });
        }

        // Decrypt keys before sending to frontend!
        const userObj = user.toObject();
        if (userObj.geminiApiKey) userObj.geminiApiKey = decryptApiKey(userObj.geminiApiKey);
        if (userObj.openAiApiKey) userObj.openAiApiKey = decryptApiKey(userObj.openAiApiKey);
        if (userObj.anthropicApiKey) userObj.anthropicApiKey = decryptApiKey(userObj.anthropicApiKey);

        return NextResponse.json(userObj, { status: 200 });
    } catch (error) {
        console.error("User GET error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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

        for (const field of API_KEY_FIELDS) {
            const value = body[field];
            if (value === undefined) continue;
            if (typeof value !== 'string' || value.length > MAX_KEY_LENGTH) {
                return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
            }
            const key = value.trim();
            // Empty string clears the key
            updateData[field] = key ? encryptApiKey(key) : '';
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
            { email: session.user.email },
            { $set: updateData },
            { new: true, upsert: true, runValidators: true }
        );

        // Decrypt back for the response so frontend state stays in sync
        const userObj = user.toObject();
        if (userObj.geminiApiKey) userObj.geminiApiKey = decryptApiKey(userObj.geminiApiKey);
        if (userObj.openAiApiKey) userObj.openAiApiKey = decryptApiKey(userObj.openAiApiKey);
        if (userObj.anthropicApiKey) userObj.anthropicApiKey = decryptApiKey(userObj.anthropicApiKey);

        return NextResponse.json(userObj, { status: 200 });
    } catch (error) {
        console.error("User POST error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
