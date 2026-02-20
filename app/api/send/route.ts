import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { to, subject, message } = await req.json();
        const authHeader = req.headers.get("authorization");

        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // MIME Email String
    const mimeEmail = [
      "Content-Type: text/plain; charset=\"UTF-8\"\n",
      "MIME-Version: 1.0\n",
      "Content-Transfer-Encoding: 7bit\n",
      `To: ${to}\n`,
      `Subject: ${subject}\n\n`,
      message
    ].join("");

    // (Google's requirement)
    const encodedMail = Buffer.from(mimeEmail)
      .toString("base64")
      .replace(/\+/g, "-") // Convert + to -
      .replace(/\//g, "_") // Convert / to _
      .replace(/=+$/, ""); // Remove padding at the end

      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
            method: "POST",
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },

            body: JSON.stringify({ raw: encodedMail }),
        }
      );

      if (!response.ok) {
        throw new Error("Google rejected the email.");
      }

      return NextResponse.json({ success: true });
    } catch (error) {
        console.log("Send Error:", error);
        return NextResponse.json({ error: "Failed to send email" }, { status: 500})
    }
}