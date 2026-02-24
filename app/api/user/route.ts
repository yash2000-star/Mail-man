import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

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

        return NextResponse.json(user, { status: 200 });
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

        const user = await User.findOneAndUpdate(
            { email: session.user.email },
            { $set: updateData },
            { new: true, upsert: true } // Upsert is handy to create them instantly
        );

        return NextResponse.json(user, { status: 200 });
    } catch (error) {
        console.error("User POST error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
