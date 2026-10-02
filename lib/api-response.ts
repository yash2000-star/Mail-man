import { NextResponse } from "next/server";
import { AiError } from "@/lib/ai";

export function unauthorized() {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function noAiKey() {
    return NextResponse.json(
        { error: "Add an AI API key in Settings to use AI features.", code: "NO_AI_KEY" },
        { status: 400 },
    );
}

/** Turns a provider failure into a response the UI can show as-is. */
export function aiErrorResponse(error: unknown, context: string) {
    if (error instanceof AiError) {
        return NextResponse.json({ error: error.message, code: error.kind }, { status: error.status });
    }
    console.error(`${context}:`, error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
