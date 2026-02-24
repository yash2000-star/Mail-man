import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const { prompt, history, emails, apiKey, model } = await req.json();

    // --- Subscription & Security Check ---
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const dbUser = await User.findOne({ email: session.user.email });

    // Multi-Model Paywall Logic: 
    // They either need to be a Premium User, OR they must provide their own API Key (BYOK)
    if (!dbUser?.isPremium && !apiKey) {
      return NextResponse.json({
        reply: "🔒 **Premium Feature Locked**\n\nThe Filo AI Chat requires an active premium subscription OR a valid personal API Key.\n\nPlease open settings (Gear icon) to enter your API key, or upgrade your account.",
        tier: "Free"
      }, { status: 403 });
    }
    // ------------------------------------

    const emailData = emails.map((e: any) =>
      `From: ${e.from} | Subject: ${e.subject} | Snippet: ${e.snippet}`
    ).join("\n\n");

    const systemPrompt = `
    You are Filo AI, an incredibly smart, friendly, and conversational AI email assistant. 
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
      if (!apiKey) throw new Error("No API Key provided by user or system fallback.");

      let replyText = "";
      let tierLabel = "";

      // Route the Prompt to the requested Brain!
      if (model === "gpt-4o") {

        const openai = new OpenAI({ apiKey });

        const gptHistory = history.map((msg: any) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content
        }));

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            ...gptHistory
          ],
          max_tokens: 1000,
        });

        replyText = response.choices[0]?.message?.content || "No response generated.";
        tierLabel = "Filo AI Premium (ChatGPT-4o)";

      } else if (model === "claude-3-opus") {

        // Note: Anthropic uses "claude-3-opus-20240229" for the model string
        const anthropic = new Anthropic({ apiKey });

        const claudeHistory = history.map((msg: any) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content
        }));

        const response = await anthropic.messages.create({
          model: "claude-3-opus-20240229",
          system: systemPrompt,
          max_tokens: 1000,
          messages: claudeHistory,
        });

        replyText = (response.content[0] as any)?.text || "No response generated.";
        tierLabel = "Filo AI Premium (Claude 3 Opus)";

      } else {

        // Default to Google Gemini 1.5 Pro
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({
          model: "gemini-1.5-pro",
          systemInstruction: systemPrompt
        });

        const geminiHistory = history.map((msg: any) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        }));

        const result = await geminiModel.generateContent({
          contents: geminiHistory
        });

        replyText = result.response.text();
        tierLabel = "Filo AI Premium (Gemini 1.5 Pro)";
      }

      return NextResponse.json({
        reply: replyText,
        tier: tierLabel
      });

    } catch (aiError: any) {
      console.error(`🚨 ${model} API CRASHED:`, aiError);
      return NextResponse.json({ error: `Connection to ${model} failed. Please verify your selected API key in Settings.` }, { status: 500 });
    }
  } catch (error: any) {
    console.error("🚨 CHAT ROUTE OUTER CRASH:", error);
    return NextResponse.json({ error: `Failed to process request: ${error?.message || String(error)}` }, { status: 500 });
  }
}