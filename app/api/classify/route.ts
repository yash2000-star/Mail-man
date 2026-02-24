import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import EmailAnalysis from "@/models/EmailAnalysis";

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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    // 3. We format all the NEW emails into one massive text block for Gemini to read
    const emailListText = emailsToProcess.map((e: any) =>
      `EMAIL_ID: ${e.id}\nSENDER: ${e.sender}\nCONTENT: ${e.snippet}\n---`
    ).join("\n\n");

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

    const result = await model.generateContent(prompt);
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
      return NextResponse.json(combinedResults); // Fail gracefully, returning what we have cached at least
    }

  } catch (error: any) {
    console.error("AI Batch Server Error:", error);
    return NextResponse.json({ error: "Failed to analyze batch" }, { status: 500 });
  }
}