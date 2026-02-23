import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    
    const { prompt, history, emails, apiKey } = await req.json();

    
    const emailData = emails.map((e: any) => 
      `From: ${e.from} | Subject: ${e.subject} | Snippet: ${e.snippet}`
    ).join("\n\n");

    const systemPrompt = `
    You are EZee AI, an incredibly smart, friendly, and conversational AI email assistant. 
    You have the personality of a helpful, highly intelligent human colleague. 

    If the user just says "Hi", "Hello", or asks how you are, greet them warmly and chat like a normal person! 
    
    If the user asks about their emails, search through this recent inbox data to help them:
    ${emailData}

    Rules:
    1. Be conversational, natural, and friendly.
    2. If they ask you to find a specific email, summarize a thread, or extract info, use the provided email data.
    3. If they ask for something you cannot see in the context, politely let them know you don't see it in their recent emails.
    `;

    try {
      if (!apiKey) throw new Error("No API Key provided");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-3.1-pro-preview",
        systemInstruction: systemPrompt 
      });

      const formattedHistory = history.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));

      const result = await model.generateContent({
        contents: formattedHistory
      });
      
      const response = await result.response;

      return NextResponse.json({
        reply: response.text(),
        tier: "Pro (Gemini BYOK)"
      });

    } catch (geminiError) {
      console.error("🚨 GEMINI API CRASHED:", geminiError); 

      console.log("Gemini Failed, switching to Free Tier fallback...");

      
      const searchKeyWords = prompt.toLowerCase().split(" ").filter((word: string) => word.length > 3);
      let fallbackReply = "";

      if (searchKeyWords.length === 0) {
        fallbackReply = `(Free Tier Mode) I did a quick scan but couldn't find anything matching that. Please ensure your Gemini API key in Settings is valid for deep AI search!`;
      } else {
        const foundEmails = emails.filter((e: any) => 
          searchKeyWords.some((word: string) => 
            e.subject?.toLowerCase().includes(word) || e.from?.toLowerCase().includes(word)
          )
        );

        if (foundEmails.length > 0) {
          fallbackReply = `(Free Tier Mode) I found ${foundEmails.length} email(s) that might match your search. For example: "${foundEmails[0].subject}" from ${foundEmails[0].from}. Check your API Key settings for deep AI analysis!`;
        } else {
          fallbackReply = `(Free Tier Mode) I did a quick scan but couldn't find anything matching that. Check your API Key settings for deep AI search!`;
        }
      }

      return NextResponse.json({ 
        reply: fallbackReply,
        tier: "Free (Local Search)" 
      });
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}