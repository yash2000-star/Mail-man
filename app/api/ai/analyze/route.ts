import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { emails, apiKey, customLabels } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key provided." },
        { status: 401 }
      );
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json([]);
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "ggemini-3-flash-preview",
      generationConfig: { responseMimeType: "application/json" },
    });

    const labelsString =
      customLabels && customLabels.length > 0
        ? JSON.stringify(customLabels)
        : "No custom labels provided.";

    // 🔥 Build batch email text
    const emailListText = emails
      .map(
        (e: any) =>
          `EMAIL_ID: ${e.id}
SENDER: ${e.sender}
CONTENT: ${e.content}
---`
      )
      .join("\n\n");

    const prompt = `
You are an elite executive AI email assistant.

Analyze this batch of emails:

${emailListText}

For EACH email return:

1. summary: 1 sentence
2. tasks: extract action items
3. Smart Labels using these rules: ${labelsString}

Return STRICT JSON ARRAY of exactly ${emails.length} objects.

Format:
[
  {
    "id": "exact EMAIL_ID",
    "summary": "Short summary",
    "tasks": [
      {
        "title": "Task",
        "date": "Extracted date or 'No due date'",
        "isUrgent": true,
        "isPastDue": false
      }
    ],
    "appliedLabels": ["Label Name"]
  }
]

If no tasks, return empty array.
If no labels match, return empty array.
`;

    const result = await model.generateContent(prompt);

    let text = await result.response.text();
    text = text.replace(/```json/gi, "").replace(/```/gi, "").trim();

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch {
      console.error("JSON parse failed:", text);
      return NextResponse.json([]);
    }
  } catch (error: any) {
    console.error("AI Analysis Server Error:", error);
    return NextResponse.json([]);
  }
}