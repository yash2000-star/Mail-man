import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";


const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { snippet } = data;

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

            const prompt = `
            Act as an email assistant. Read this email snippet: "${snippet}"
            
            Provide exactly 4 things in strictly valid JSON format:
            1. "category": Classify it as "Important", "Social", "Promotions", or "Spam".
            2. "summary": A very short, 1-sentence summary of what the email is about.
            3. "requires_reply": true or false. (Does this email look like it needs a response?)
            4. "draft_reply": If requires_reply is true, write a short, professional draft response. If false, make it an empty string "".
            
            DO NOT include markdown formatting like \`\`\`json. Just output the raw JSON object.
            `;

            const result = await model.generateContent(prompt);
            const rawText = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
            const aiData = JSON.parse(rawText);

            return NextResponse.json(aiData);

        } catch (geminiError) {
            console.log("Gemini Rate Limit Reached. Sending fallback UI.");
            
            return NextResponse.json({
                category: "Limit Reached",
                summary: "API rate limit exceeded. Could not generate AI summary.",
                requires_reply: false,
                draft_reply: ""
            }); 
        }

    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: "Server failed to process request" }, { status: 500 });
    }
}