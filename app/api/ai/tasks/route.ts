import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    // 1. Accept the batch of emails and the custom labels
    const { emails, apiKey, customLabels } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "No API key provided." }, { status: 401 });
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json([]);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3.1-pro-preview",
        generationConfig: { responseMimeType: "application/json" } 
    });

    const labelsString = customLabels && customLabels.length > 0 
        ? JSON.stringify(customLabels) 
        : "No custom labels provided.";

    // 2. Format the batch into a readable list for Gemini
    const emailListText = emails.map((e: any) => 
      `EMAIL_ID: ${e.id}\nSENDER: ${e.sender}\nCONTENT: ${e.content}\n---`
    ).join("\n\n");

    // 3. Instruct the AI to return an ARRAY matching the IDs
    const prompt = `
      You are an elite AI task extractor. Analyze this batch of emails.
      
      ${emailListText}
      
      Instructions for EACH email:
      1. Tasks: Extract action items, requests, or To-Dos for the recipient. Note deadlines and if it is urgent ("ASAP", "by tonight").
      2. Smart Labels: Apply custom labels based on these user rules: ${labelsString}

      You MUST respond strictly with a valid JSON ARRAY of objects. The array must contain exactly ${emails.length} objects.
      Exact Format Required:
      [
        {
          "id": "The exact EMAIL_ID provided",
          "tasks": [
            { "title": "The specific action item", "date": "Extracted date or 'No due date'", "isUrgent": true, "isPastDue": false }
          ],
          "appliedLabels": ["Label Name 1"] 
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
      console.error("Batch Task JSON Parse Error:", text);
      return NextResponse.json([]); // Fail gracefully so the app doesn't crash
    }

  } catch (error: any) {
    console.error("AI Batch Task Server Error:", error);
    return NextResponse.json([]); // Safe fallback
  }
}