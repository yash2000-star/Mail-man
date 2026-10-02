import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { getUserAi } from "@/lib/user-ai";
import { generateText } from "@/lib/ai";
import { aiErrorResponse, noAiKey, unauthorized } from "@/lib/api-response";

export const maxDuration = 60;

const STYLES: Record<string, string> = {
  Default: "Make the tone more professional, clear, and polite.",
  Concise: "Make the tone extremely concise and brief. Get straight to the point in as few words as possible.",
  Friendly: "Make the tone exceptionally friendly, warm, and approachable. Express enthusiasm.",
  Professional: "Make the tone highly formal, business-appropriate, and strictly professional.",
};

const str = (value: unknown, max: number, fallback = "") =>
  typeof value === "string" ? value.slice(0, max) : fallback;

export async function POST(req: Request) {
  const userEmail = await getSessionEmail();
  if (!userEmail) return unauthorized();

  try {
    const body = await req.json();
    const draft = str(body?.draft, 20000);
    const language = str(body?.language, 50, "English") || "English";
    const command = str(body?.command, 1000).trim();
    const styleInstruction = STYLES[str(body?.style, 50)] ?? STYLES.Default;
    const hasDraft = draft.trim() !== "" && draft !== "<p><br></p>";

    if (!hasDraft && !command) {
      return NextResponse.json({ error: "Write a draft or an instruction first." }, { status: 400 });
    }

    const ai = await getUserAi(userEmail);
    if (!ai) return noAiKey();

    const instructions = [
      hasDraft
        ? "The user has written a draft email. Improve it."
        : "Write a new email from scratch based on the user's instruction.",
      `1. ${styleInstruction}`,
      `2. Write the final email entirely in ${language}, so it reads as native ${language}.`,
      command
        ? `3. The user's specific instruction, which takes priority over the rest: "${command}"`
        : "3. Fix any spelling or grammar mistakes.",
      "4. Format the output as HTML using <p>, <b>, <i> and <br> where helpful.",
      "Return only the HTML for the email body, with no markdown code fences and no commentary.",
      hasDraft ? `\nThe draft:\n${draft}` : "",
    ].join("\n");

    let enhancedText = await generateText({
      ...ai,
      task: "batch",
      system: "You are an expert email copywriter.",
      messages: [{ role: "user", content: instructions }],
    });
    enhancedText = enhancedText.trim().replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/, "");

    return NextResponse.json({ enhancedText });
  } catch (error) {
    return aiErrorResponse(error, "AI enhance failed");
  }
}
