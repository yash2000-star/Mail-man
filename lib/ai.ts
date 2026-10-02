import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from "@google/generative-ai";

/**
 * One interface over the three AI providers a user can bring a key for.
 * Every AI feature (classification, tasks, replies, compose, chat) goes
 * through `generateText`, so any one key is enough to use the whole app.
 */

import { AiProvider, PROVIDER_LABELS } from "./ai-providers";

export { AI_PROVIDERS, PROVIDER_LABELS, isAiProvider } from "./ai-providers";
export type { AiProvider } from "./ai-providers";

/**
 * "batch" = high-volume structured work (classify, tasks, labels, replies).
 * "chat"  = conversational answers where quality matters more than speed.
 */
export type AiTask = "batch" | "chat";

// Model ids can be overridden per deployment without a code change.
const MODELS: Record<AiProvider, Record<AiTask, string>> = {
    gemini: {
        batch: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        chat: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    },
    openai: {
        batch: process.env.OPENAI_MODEL_FAST || "gpt-4o-mini",
        chat: process.env.OPENAI_MODEL || "gpt-4o",
    },
    anthropic: {
        batch: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
        chat: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    },
};

const MAX_OUTPUT_TOKENS = 16000;
// Stay under the route's maxDuration (60s) so a slow provider fails cleanly.
const REQUEST_TIMEOUT_MS = 55_000;

export interface AiMessage {
    role: "user" | "assistant";
    content: string;
}

export interface GenerateTextOptions {
    provider: AiProvider;
    apiKey: string;
    task: AiTask;
    system?: string;
    messages: AiMessage[];
    /** Ask the provider for JSON output where it supports a JSON mode. */
    json?: boolean;
}

export type AiErrorKind = "invalid_key" | "rate_limited" | "timeout" | "refused" | "failed";

export class AiError extends Error {
    constructor(public kind: AiErrorKind, message: string) {
        super(message);
        this.name = "AiError";
    }

    /** HTTP status an API route should answer with. */
    get status(): number {
        switch (this.kind) {
            case "invalid_key": return 401;
            case "rate_limited": return 429;
            case "timeout": return 504;
            default: return 502;
        }
    }
}

export function modelLabel(provider: AiProvider, task: AiTask): string {
    return MODELS[provider][task];
}

export async function generateText(options: GenerateTextOptions): Promise<string> {
    try {
        switch (options.provider) {
            case "gemini": return await generateWithGemini(options);
            case "openai": return await generateWithOpenAI(options);
            case "anthropic": return await generateWithAnthropic(options);
        }
    } catch (error) {
        throw toAiError(options.provider, error);
    }
}

async function generateWithGemini({ apiKey, task, system, messages, json }: GenerateTextOptions) {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel(
        {
            model: MODELS.gemini[task],
            systemInstruction: system,
            generationConfig: json ? { responseMimeType: "application/json" } : undefined,
        },
        { timeout: REQUEST_TIMEOUT_MS },
    );
    const result = await model.generateContent({
        contents: messages.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
        })),
    });
    return result.response.text();
}

async function generateWithOpenAI({ apiKey, task, system, messages }: GenerateTextOptions) {
    const client = new OpenAI({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
    // No JSON mode here: it only allows a top-level object, and our prompts ask
    // for arrays. parseJsonArray handles the plain-text answer instead.
    const response = await client.chat.completions.create({
        model: MODELS.openai[task],
        messages: [
            ...(system ? [{ role: "system" as const, content: system }] : []),
            ...messages,
        ],
    });
    return response.choices[0]?.message?.content ?? "";
}

async function generateWithAnthropic({ apiKey, task, system, messages }: GenerateTextOptions) {
    const client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
    const response = await client.beta.messages.create({
        model: MODELS.anthropic[task],
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        messages,
        // Structured batch work doesn't need deep reasoning; chat gets a bit more.
        output_config: { effort: task === "batch" ? "low" : "medium" },
        // If the model declines on a safety classifier, let the API retry on a fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
    });
    if (response.stop_reason === "refusal") {
        throw new AiError("refused", "The AI declined to answer this request.");
    }
    return response.content
        .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");
}

function toAiError(provider: AiProvider, error: unknown): AiError {
    if (error instanceof AiError) return error;
    const name = PROVIDER_LABELS[provider];

    let status: number | undefined;
    if (error instanceof Anthropic.APIError || error instanceof OpenAI.APIError) {
        status = error.status;
    } else if (error instanceof GoogleGenerativeAIFetchError) {
        status = error.status;
        // Gemini reports a bad key as 400 API_KEY_INVALID
        if (status === 400 && /api key/i.test(error.message)) status = 401;
    }

    if (error instanceof Anthropic.APIConnectionTimeoutError || error instanceof OpenAI.APIConnectionTimeoutError
        || (error instanceof Error && /timed? ?out|aborted/i.test(error.message))) {
        return new AiError("timeout", `${name} took too long to respond. Please try again.`);
    }
    if (status === 401 || status === 403) {
        return new AiError("invalid_key", `Your ${name} API key was rejected. Check it in Settings.`);
    }
    if (status === 429) {
        return new AiError("rate_limited", `${name} rate limit reached. Please wait a minute and try again.`);
    }

    console.error(`${name} request failed:`, error);
    return new AiError("failed", `${name} request failed. Please try again.`);
}

/**
 * Pulls a JSON array out of a model's answer, tolerating ```json fences,
 * leading prose, or an object that wraps the array.
 */
export function parseJsonArray(text: string): unknown[] {
    const cleaned = text.replace(/```(?:json)?/gi, "").trim();
    const candidates = [cleaned];
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start !== -1 && end > start) candidates.push(cleaned.slice(start, end + 1));

    for (const candidate of candidates) {
        try {
            const parsed: unknown = JSON.parse(candidate);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === "object") {
                const inner = Object.values(parsed).find(Array.isArray);
                if (inner) return inner;
            }
        } catch {
            // try the next candidate
        }
    }
    throw new AiError("failed", "The AI returned an answer in an unexpected format. Please try again.");
}
