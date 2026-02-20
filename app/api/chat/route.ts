import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { prompt, emails } = await req.json();

    // RAG database 
    const emailData = emails.map((e: any) => 
      `From: ${e.from} | Subject: ${e.subject} | Snippet: ${e.snippet}`
    ).join("\n\n");

    const systemPrompt = `
    You are EZee AI, an intelligent email assistant. 
    The user is asking a question: "${prompt}"
    
    Here are their recent emails to search through:
    ${emailData}

    Answer the user's question directly and politely based ONLY on the emails provided above. 
    If the answer is not in the emails, say "I couldn't find that in your recent emails."
    `;

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
      const model = genAI.getGenerativeModel({model: "gemini-2.5-flash-lite"});
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;

      return NextResponse.json({
        reply: response.text(),
        tier: "Pro (Gemini)"
      });
    } catch (geminiError) {
      console.log("Gemini Failed, switching to Free Tier fallback...");

      const searchKeyWords = prompt.toLowerCase().split(" ").filter((word: string) => word.length > 3);

      let fallbackReply = "";

      if (searchKeyWords.length === 0) {
        fallbackReply = `(Free Tier Mode) I did a quick scan but couldn't find anything matching that. Upgrade to Pro for deep AI search!`;
      } else {
        const foundEmails = emails.filter((e: any) => 
          searchKeyWords.some((word: string) => 
            e.subject?.toLowerCase().includes(word) || e.from?.toLowerCase().includes(word)
          )
        );

        if (foundEmails.length > 0) {
          fallbackReply = `(Free Tier Mode) I found ${foundEmails.length} email(s) that might match your search. For example: "${foundEmails[0].subject}" from ${foundEmails[0].from}. Upgrade to Pro for deep AI analysis!`;
        } else {
          fallbackReply = `(Free Tier Mode) I did a quick scan but couldn't find anything matching that. Upgrade to Pro for deep AI search!`;
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