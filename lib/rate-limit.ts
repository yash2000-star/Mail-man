import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import RateLimit from "@/models/RateLimit";

/**
 * Per-user request limits, counted in MongoDB so they hold across serverless
 * instances. Each limit is a fixed window: at most `limit` requests per
 * `windowSec` seconds.
 */
export const RATE_LIMITS = {
    /** Any request that calls an AI provider */
    ai: { limit: 120, windowSec: 10 * 60 },
    /** Sending email */
    send: { limit: 60, windowSec: 60 * 60 },
    /** Saving and deleting drafts (compose autosaves) */
    drafts: { limit: 300, windowSec: 10 * 60 },
    /** Settings, labels, tasks and other writes */
    writes: { limit: 300, windowSec: 10 * 60 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

/** The current window's number and when it ends. */
export function rateWindow(now: number, windowSec: number): { index: number; resetAt: number } {
    const size = windowSec * 1000;
    const index = Math.floor(now / size);
    return { index, resetAt: (index + 1) * size };
}

/** Counts one request; returns false once the limit for this window is used up. */
async function hit(key: string, resetAt: number): Promise<number> {
    const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(resetAt) } };
    try {
        const doc = await RateLimit.findOneAndUpdate({ key }, update, { upsert: true, new: true }).lean<{ count: number }>();
        return doc?.count ?? 1;
    } catch (error) {
        // Two first requests in the same window can race on the upsert; the retry finds the document
        if ((error as { code?: number }).code !== 11000) throw error;
        const doc = await RateLimit.findOneAndUpdate({ key }, update, { new: true }).lean<{ count: number }>();
        return doc?.count ?? 1;
    }
}

/**
 * Returns a 429 response when the user is over the limit, or null to carry on.
 * If the counter can't be reached the request is allowed, so a database
 * hiccup never locks people out.
 */
export async function rateLimit(email: string, bucket: RateLimitBucket, now = Date.now()): Promise<NextResponse | null> {
    const { limit, windowSec } = RATE_LIMITS[bucket];
    const { index, resetAt } = rateWindow(now, windowSec);
    try {
        await dbConnect();
        const count = await hit(`${bucket}:${email}:${index}`, resetAt);
        if (count <= limit) return null;
    } catch (error) {
        console.error("Rate limit check failed:", error);
        return null;
    }
    const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
    const minutes = Math.ceil(retryAfter / 60);
    return NextResponse.json(
        { error: `Too many requests. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
}
