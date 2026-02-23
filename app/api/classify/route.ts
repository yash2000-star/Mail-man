import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    // 1. We now accept a whole batch of emails at once!
    const { emails, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "No API key provided." }, { status: 401 });
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json([]);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" } 
    });

    // 2. We format all the emails into one massive text block for Gemini to read
    const emailListText = emails.map((e: any) => 
      `EMAIL_ID: ${e.id}\nSENDER: ${e.sender}\nCONTENT: ${e.snippet}\n---`
    ).join("\n\n");

    // 3. We instruct the AI to return an ARRAY of answers, matching the exact IDs
    const prompt = `
      You are an elite executive AI email assistant. Analyze this batch of emails.
      
      ${emailListText}
      
      For each email, follow these instructions:
      1. Category: Classify strictly as ONE of: "Important", "Promotions", "Social", "Spam", or "General".
      2. Summary: Write a crisp, 1-sentence summary.
      3. requires_reply: Boolean true or false.
      4. draft_reply: If true, write a 2-sentence professional reply. If false, output "".

      You MUST respond strictly with a valid JSON ARRAY of objects. The array must contain exactly ${emails.length} objects.
      Exact Format Required:
      [
        {
          "id": "The exact EMAIL_ID provided",
          "category": "Important",
          "summary": "This is a summary.",
          "requires_reply": true,
          "draft_reply": "This is a reply."
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    let text = await result.response.text();
    text = text.replace(/```json/gi, '').replace(/```/gi, '').trim(); 

    try {
      const parsedData = JSON.parse(text);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error("Batch JSON Parse Error:", text);
      return NextResponse.json([]); // Fail gracefully
    }

  } catch (error: any) {
    console.error("AI Batch Server Error:", error);
    return NextResponse.json({ error: "Failed to analyze batch" }, { status: 500 });
  }
}