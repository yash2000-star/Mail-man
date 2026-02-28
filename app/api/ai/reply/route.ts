import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { decryptApiKey } from "@/lib/encryption";

export async function POST(req: Request) {
  try {
    const { emailBody, senderName, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "No API key provided." }, { status: 401 });
    }

    // Decrypt the API key before use
    let decryptedKey: string;
    try {
      decryptedKey = decryptApiKey(apiKey);
    } catch (decryptionError) {
      console.error("Decryption failed in reply route:", decryptionError);
      return NextResponse.json({ error: "Invalid API key format or decryption failed." }, { status: 400 });
    }


    const genAI = new GoogleGenerativeAI(decryptedKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `
      You are an elite executive assistant drafting an email reply.
      The user just received this email from ${senderName}:
      
      --- EMAIL START ---
      ${emailBody}
      --- EMAIL END ---
      
      Draft a professional, polite, and concise reply. 
      Do NOT include subject lines, placeholders like [Your Name], or any introductory conversation. 
      Just output the exact body of the email reply so it can be directly pasted into a text box.
    `;

    // 3. Generate the response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const draftedReply = response.text();

    return NextResponse.json({ reply: draftedReply });

  } catch (error: any) {
    console.error("AI Reply Server Error:", error);
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
  }
}