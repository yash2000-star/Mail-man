import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import EmailAnalysis from "@/models/EmailAnalysis";
import { decryptApiKey } from "@/lib/encryption";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Accept the batch of emails and the custom labels
    const { emails, apiKey, customLabels } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "No API key provided." }, { status: 401 });
    }

    // Decrypt the API key before use
    let decryptedKey: string;
    try {
      decryptedKey = decryptApiKey(apiKey);
    } catch (decryptionError) {
      console.error("Decryption failed in tasks route:", decryptionError);
      return NextResponse.json({ error: "Invalid API key format or decryption failed." }, { status: 400 });
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json([]);
    }

    await dbConnect();
    const userEmail = session.user.email;
    const emailIds = emails.map((e: any) => e.id);

    // 2. Check DB for emails that have ALREADY had tasks extracted
    const existingAnalyses = await EmailAnalysis.find({
      emailId: { $in: emailIds },
      userEmail: userEmail,
      tasks_extracted: true
    });

    const existingIds = new Set(existingAnalyses.map(a => a.emailId));
    const emailsToProcess = emails.filter((e: any) => !existingIds.has(e.id));

    const combinedResults = existingAnalyses.map(a => ({
      id: a.emailId,
      appliedLabels: a.appliedLabels || []
    }));

    if (emailsToProcess.length === 0) {
      return NextResponse.json(combinedResults);
    }

    const genAI = new GoogleGenerativeAI(decryptedKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: { responseMimeType: "application/json" }
    });

    const labelsString = customLabels && customLabels.length > 0
      ? JSON.stringify(customLabels)
      : "No custom labels provided.";

    // 3. Format the NEW batch into a readable list for Gemini
    const emailListText = emailsToProcess.map((e: any) =>
      `EMAIL_ID: ${e.id}\nSENDER: ${e.sender}\nCONTENT: ${e.content}\n---`
    ).join("\n\n");

    // 4. Instruct the AI to return an ARRAY matching the IDs
    const prompt = `
      You are an elite AI task extractor. Analyze this batch of emails.
      Today's date and time is: ${new Date().toISOString()}
      
      ${emailListText}
      
      Instructions for EACH email:
      1. Tasks: Extract action items, requests, or To-Dos for the recipient. Note deadlines and if it is urgent ("ASAP", "by tonight"). Calculate if it is past due using Today's date context.
      2. Smart Labels: Apply custom labels based on these user rules: ${labelsString}

      You MUST respond strictly with a valid JSON ARRAY of objects. The array must contain exactly ${emailsToProcess.length} objects.
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

      // Filter out duplicate tasks if the email was already processed
      const user = await User.findOne({ email: userEmail });
      const existingTaskEmailIds = new Set(user?.globalTasks?.map((t: any) => t.emailId) || []);

      const allNewTasks: any[] = [];
      const bulkOps: any[] = [];

      parsedData.forEach((res: any) => {
        // 1. Save appliedLabels and set tasks_extracted to true
        bulkOps.push({
          updateOne: {
            filter: { emailId: res.id, userEmail },
            update: {
              $addToSet: { appliedLabels: { $each: res.appliedLabels || [] } },
              $set: { tasks_extracted: true }
            },
            upsert: true
          }
        });

        // 2. Save Tasks to User.globalTasks (only if we haven't already saved tasks for this email)
        if (res.tasks && res.tasks.length > 0 && !existingTaskEmailIds.has(res.id)) {
          res.tasks.forEach((task: any) => {
            allNewTasks.push({
              id: Math.random().toString(36).substr(2, 9),
              emailId: res.id,
              title: task.title,
              date: task.date,
              isUrgent: task.isUrgent,
              isPastDue: task.isPastDue,
              status: "active"
            });
          });
        }
      });

      if (bulkOps.length > 0) {
        await EmailAnalysis.bulkWrite(bulkOps);
      }

      if (allNewTasks.length > 0) {
        await User.updateOne(
          { email: userEmail },
          { $push: { globalTasks: { $each: allNewTasks } } }
        );
      }

      return NextResponse.json([...combinedResults, ...parsedData]);
    } catch (parseError) {
      console.error("Batch Task JSON Parse Error:", text);
      return NextResponse.json(combinedResults); // Fail gracefully so the app doesn't crash on this batch, returning cached stuff
    }

  } catch (error: any) {
    console.error("AI Batch Task Server Error:", error);
    return NextResponse.json([]); // Safe fallback
  }
}