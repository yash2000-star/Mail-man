import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { encryptApiKey, decryptApiKey } from '@/lib/encryption';

export async function GET(req: Request) {
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

        // Body can contain geminiApiKey, customLabels, globalTasks
        const updateData = await req.json();

        // Encrypt keys if they are present in the update
        if (updateData.geminiApiKey) updateData.geminiApiKey = encryptApiKey(updateData.geminiApiKey);
        if (updateData.openAiApiKey) updateData.openAiApiKey = encryptApiKey(updateData.openAiApiKey);
        if (updateData.anthropicApiKey) updateData.anthropicApiKey = encryptApiKey(updateData.anthropicApiKey);

        const user = await User.findOneAndUpdate(
            { email: session.user.email },
            { $set: updateData },
            { new: true, upsert: true }
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
