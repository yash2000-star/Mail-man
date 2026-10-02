import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { decryptApiKey } from "@/lib/encryption";
import { AI_PROVIDERS, AiProvider, isAiProvider } from "@/lib/ai";

/** Where each provider's encrypted key lives on the User document. */
export const KEY_FIELDS: Record<AiProvider, "geminiApiKey" | "openAiApiKey" | "anthropicApiKey"> = {
    gemini: "geminiApiKey",
    openai: "openAiApiKey",
    anthropic: "anthropicApiKey",
};

export interface UserAi {
    provider: AiProvider;
    apiKey: string;
}

interface StoredKeys {
    aiProvider?: string;
    geminiApiKey?: string;
    openAiApiKey?: string;
    anthropicApiKey?: string;
}

/** Providers this user has saved a key for, in the app's default order. */
export function providersWithKeys(user: StoredKeys | null | undefined): AiProvider[] {
    if (!user) return [];
    return AI_PROVIDERS.filter((p) => Boolean(user[KEY_FIELDS[p]]));
}

/**
 * Picks the provider and decrypted key to use for this user. Keys are read
 * from the database on the server and never sent to the browser.
 *
 * Order: the provider the caller asked for (if the user has its key), then
 * the user's preferred provider, then whichever key they have.
 */
export async function getUserAi(email: string, requested?: unknown): Promise<UserAi | null> {
    await dbConnect();
    const user = await User.findOne({ email })
        .select("aiProvider geminiApiKey openAiApiKey anthropicApiKey")
        .lean<StoredKeys>();

    const available = providersWithKeys(user);
    if (!user || available.length === 0) return null;

    const provider =
        (isAiProvider(requested) && available.includes(requested) && requested) ||
        (isAiProvider(user.aiProvider) && available.includes(user.aiProvider) && user.aiProvider) ||
        available[0];

    return { provider, apiKey: decryptApiKey(user[KEY_FIELDS[provider]] as string) };
}

/** Last 4 characters of a key, so the UI can show which key is saved. */
export function keyHint(encrypted: string | undefined): string {
    if (!encrypted) return "";
    try {
        const plain = decryptApiKey(encrypted);
        return plain.length > 8 ? plain.slice(-4) : "";
    } catch {
        return "";
    }
}
