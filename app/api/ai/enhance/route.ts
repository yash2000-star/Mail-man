import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { draft, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "No API key provided." }, { status: 401 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // The Prompt: We explicitly tell it to preserve HTML tags so the Rich Text Editor doesn't break!
    const prompt = `
      You are an elite executive copywriter. 
      The user has written a draft email. It is currently formatted in HTML.
      
      Your job is to:
      1. Fix any spelling or grammar mistakes.
      2. Make the tone more professional, clear, and polite.
      3. CRITICAL: Preserve all HTML tags (like <p>, <b>, <i>, <u>, <br>). Do not strip the formatting.
      4. DO NOT wrap your response in markdown blocks like \`\`\`html. Just return the raw HTML string.
      
      Here is the user's draft:
      ${draft}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let enhancedText = response.text().trim();

    // Safety check: Sometimes Gemini stubbornly adds markdown wrappers anyway. Let's strip them if they exist.
    if (enhancedText.startsWith("```html")) {
      enhancedText = enhancedText.replace(/^```html\n?/, "").replace(/\n?```$/, "");
    } else if (enhancedText.startsWith("```")) {
      enhancedText = enhancedText.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    return NextResponse.json({ enhancedText });

  } catch (error: any) {
    console.error("AI Enhance Server Error:", error);
    return NextResponse.json({ error: "Failed to enhance draft" }, { status: 500 });
  }
}