import { NextResponse } from "next/server";
import { AiError } from "@/lib/ai";
import { GmailError } from "@/lib/gmail";

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

/** Gmail failures: 401 means the Google sign-in must be renewed. */
export function gmailErrorResponse(error: unknown, context: string) {
    if (error instanceof GmailError) {
        if (error.status === 401) {
            return NextResponse.json({ error: "Your Google sign-in expired. Please sign in again.", code: "GMAIL_AUTH" }, { status: 401 });
        }
        if (error.status === 404) {
            return NextResponse.json({ error: "That email no longer exists." }, { status: 404 });
        }
        if (error.status === 429) {
            return NextResponse.json({ error: "Gmail is rate limiting requests. Please wait a moment." }, { status: 429 });
        }
    }
    console.error(`${context}:`, error);
    return NextResponse.json({ error: "Could not reach Gmail. Please try again." }, { status: 502 });
}

export function gmailAuthRequired() {
    return NextResponse.json({ error: "Please sign in again.", code: "GMAIL_AUTH" }, { status: 401 });
}
