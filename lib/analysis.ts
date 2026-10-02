import dbConnect from "@/lib/mongodb";
import EmailAnalysis from "@/models/EmailAnalysis";
import type { MailItem } from "@/lib/mail-types";

/** Adds saved AI results (category, summary, labels...) to emails from Gmail. */
export async function withAnalysis<T extends MailItem>(userEmail: string, emails: T[]): Promise<T[]> {
    if (emails.length === 0) return emails;
    await dbConnect();
    const analyses = await EmailAnalysis.find({ userEmail, emailId: { $in: emails.map((e) => e.id) } }).lean<{
        emailId: string;
        category?: string;
        summary?: string;
        requires_reply?: boolean;
        draft_reply?: string;
        appliedLabels?: string[];
    }[]>();
    const byId = new Map(analyses.map((a) => [a.emailId, a]));

    return emails.map((email) => {
        const a = byId.get(email.id);
        if (!a) return email;
        return {
            ...email,
            ...(a.summary ? {
                category: a.category,
                summary: a.summary,
                requires_reply: a.requires_reply,
                draft_reply: a.draft_reply,
            } : {}),
            appliedLabels: a.appliedLabels ?? [],
        };
    });
}
