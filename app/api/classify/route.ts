import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import EmailAnalysis from "@/models/EmailAnalysis";
import * as cheerio from "cheerio";
import { decryptApiKey } from "@/lib/encryption";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. We accept a whole batch of emails at once!
    const { emails, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "No API key provided." }, { status: 401 });
    }

    // Decrypt the API key before use
    let decryptedKey: string;
    try {
      decryptedKey = decryptApiKey(apiKey);
    } catch (decryptionError) {
      console.error("Decryption failed in classify route:", decryptionError);
      return NextResponse.json({ error: "Invalid API key format or decryption failed." }, { status: 400 });
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json([]);
    }

    await dbConnect();
    const userEmail = session.user.email;
    const emailIds = emails.map((e: any) => e.id);

    // 2. Check DB for already summarized emails
    const existingAnalyses = await EmailAnalysis.find({
      emailId: { $in: emailIds },
      userEmail: userEmail
    });

    const existingIds = new Set(existingAnalyses.map(a => a.emailId));
    const emailsToProcess = emails.filter((e: any) => !existingIds.has(e.id));

    const combinedResults = existingAnalyses.map(a => ({
      id: a.emailId,
      category: a.category,
      summary: a.summary,
      requires_reply: a.requires_reply,
      draft_reply: a.draft_reply,
      appliedLabels: a.appliedLabels
    }));

    if (emailsToProcess.length === 0) {
      return NextResponse.json(combinedResults);
    }

    const genAI = new GoogleGenerativeAI(decryptedKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    // 3. We format all the NEW emails into one massive text block for Gemini to read
    const emailListText = emailsToProcess.map((e: any) => {
      // 3a. Use Cheerio to strip ALL HTML explicitly (head, scripts, navs, styles)
      const $ = cheerio.load(e.snippet || "");
      $('script, style, nav, footer, iframe, noscript').remove();
      let cleanText = $('body').text() || $.text();

      // 3b. Remove excessive newlines, tabs, and weird spacing
      cleanText = cleanText.replace(/\s+/g, ' ').trim();

      // 3c. TRUNCATE: Aggressively cut to a max of 15k characters (approx 3,000 tokens)
      const MAX_CHARS = 15000;
      if (cleanText.length > MAX_CHARS) {
        cleanText = cleanText.slice(0, MAX_CHARS) + "...[TRUNCATED]";
      }

      return `EMAIL_ID: ${e.id}\nSENDER: ${e.sender}\nCONTENT: ${cleanText}\n---`;
    }).join("\n\n");

    // 4. We instruct the AI to return an ARRAY of answers, matching the exact IDs
    const prompt = `
      You are an elite executive AI email assistant. Analyze this batch of emails.
      
      ${emailListText}
      
      For each email, follow these instructions:
      1. Category: Classify strictly as ONE of: "Important", "Promotions", "Social", "Spam", or "General".
      2. Summary: Write a crisp, 1-sentence summary.
      3. requires_reply: Boolean true or false.
      4. draft_reply: If true, write a 2-sentence professional reply. If false, output "".

      You MUST respond strictly with a valid JSON ARRAY of objects. The array must contain exactly ${emailsToProcess.length} objects.
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    let result;
    try {
      result = await model.generateContent(prompt, { signal: controller.signal } as any);
      clearTimeout(timeoutId);
    } catch (apiError: any) {
      clearTimeout(timeoutId);
      if (apiError.name === 'AbortError' || apiError.message?.includes('abort')) {
        console.error("Gemini Classification Timeout: Dropping overly complex batch.");
        return NextResponse.json({ error: "Request timed out. The emails were too complex or the server is busy." }, { status: 504 });
      }

      if (apiError.status === 429 || apiError.message?.includes('429')) {
        return NextResponse.json({ error: "API Rate limit exceeded." }, { status: 429 });
      }

      console.error("Gemini API Error:", apiError);
      return NextResponse.json({ error: apiError.message }, { status: 500 });
    }
    let text = await result.response.text();
    text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();

    try {
      const parsedData = JSON.parse(text);

      // Save new summaries to MongoDB!
      const bulkOps = parsedData.map((res: any) => ({
        updateOne: {
          filter: { emailId: res.id, userEmail },
          update: {
            $set: {
              category: res.category,
              summary: res.summary,
              requires_reply: res.requires_reply,
              draft_reply: res.draft_reply
            }
          },
          upsert: true
        }
      }));

      if (bulkOps.length > 0) {
        await EmailAnalysis.bulkWrite(bulkOps);
      }

      return NextResponse.json([...combinedResults, ...parsedData]);
    } catch (parseError) {
      console.error("Batch JSON Parse Error:", text);
      return NextResponse.json({ error: "Failed to parse AI response. It may have been cut off." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("AI Batch Server Error:", error);
    return NextResponse.json({ error: "Failed to analyze batch" }, { status: 500 });
  }
}