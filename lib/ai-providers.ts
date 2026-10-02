/** Provider names shared by server and browser code (no SDK imports here). */
export const AI_PROVIDERS = ["gemini", "openai", "anthropic"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<AiProvider, string> = {
    gemini: "Google Gemini",
    openai: "OpenAI (ChatGPT)",
    anthropic: "Anthropic (Claude)",
};

export const PROVIDER_KEY_INFO: Record<AiProvider, { placeholder: string; getKeyUrl: string }> = {
    gemini: { placeholder: "AIzaSy...", getKeyUrl: "https://aistudio.google.com/app/apikey" },
    openai: { placeholder: "sk-...", getKeyUrl: "https://platform.openai.com/api-keys" },
    anthropic: { placeholder: "sk-ant-...", getKeyUrl: "https://console.anthropic.com/settings/keys" },
};

export function isAiProvider(value: unknown): value is AiProvider {
    return typeof value === "string" && (AI_PROVIDERS as readonly string[]).includes(value);
}

/** Shape of the AI-key part of GET/POST /api/user. Keys themselves are never sent. */
export type SavedKeys = Record<AiProvider, { saved: boolean; hint: string }>;
