/** Smart Label shapes and validation, shared by the browser and API routes. */

export const LABEL_COLOR_IDS = ["blue", "green", "yellow", "red", "gray", "indigo", "purple"] as const;
export type LabelColor = (typeof LABEL_COLOR_IDS)[number];

export interface SmartLabel {
    name: string;
    /** Plain-English rule the AI uses to decide if an email gets this label */
    prompt: string;
    color: LabelColor;
}

export const MAX_LABELS = 50;
export const MAX_LABEL_NAME = 40;
export const MAX_LABEL_RULE = 1000;

/**
 * Validates label input. Returns the cleaned label, or an error message.
 * `existing` is the user's other labels, to reject duplicate names.
 */
export function validateLabel(input: unknown, existing: SmartLabel[]): SmartLabel | string {
    if (!input || typeof input !== "object") return "Invalid label.";
    const { name, prompt, color } = input as Record<string, unknown>;

    const cleanName = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
    if (!cleanName) return "Give the label a name.";
    if (cleanName.length > MAX_LABEL_NAME) return `Keep the name under ${MAX_LABEL_NAME} characters.`;
    if (existing.some((l) => l.name.toLowerCase() === cleanName.toLowerCase())) {
        return `You already have a label called "${cleanName}".`;
    }

    const cleanRule = typeof prompt === "string" ? prompt.trim() : "";
    if (!cleanRule) return "Describe which emails should get this label.";
    if (cleanRule.length > MAX_LABEL_RULE) return `Keep the description under ${MAX_LABEL_RULE} characters.`;

    const cleanColor = (LABEL_COLOR_IDS as readonly string[]).includes(color as string) ? (color as LabelColor) : "blue";
    return { name: cleanName, prompt: cleanRule, color: cleanColor };
}
