import { NextResponse } from "next/server";

const HEADER_BREAK = /[\r\n]/;

// Accepts "user@example.com" or "Display Name <user@example.com>".
const ADDRESS = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;
function isValidRecipient(recipient: string) {
  const match = recipient.match(/^(.*)<([^<>]+)>$/);
  if (match) return ADDRESS.test(match[2].trim()) && !/[<>]/.test(match[1]);
  return ADDRESS.test(recipient);
}

// RFC 2047 encoded-word so non-ASCII subjects survive transport.
function encodeHeader(value: string) {
  return /^[\x20-\x7e]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

export async function POST(req: Request) {
  try {
    const { to, subject, message } = await req.json();
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (typeof to !== "string" || typeof subject !== "string" || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Header values must be a single line: a CR/LF here would let the caller
    // inject extra headers (e.g. Bcc:) into the outgoing message.
    if (HEADER_BREAK.test(to) || HEADER_BREAK.test(subject)) {
      return NextResponse.json({ error: "Invalid recipient or subject" }, { status: 400 });
    }

    const recipients = to.split(",").map((r) => r.trim()).filter(Boolean);
    if (recipients.length === 0 || !recipients.every(isValidRecipient)) {
      return NextResponse.json({ error: "Invalid recipient address" }, { status: 400 });
    }

    // MIME Email String (RFC 5322 uses CRLF line endings)
    const mimeEmail = [
      `To: ${recipients.join(", ")}`,
      `Subject: ${encodeHeader(subject)}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(message, "utf-8").toString("base64").replace(/.{76}/g, "$&\r\n"),
    ].join("\r\n");

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
      const errorData = await response.json();
      console.error("GOOGLE API EXACT ERROR:", errorData); 
      throw new Error(`Google rejected the email: ${errorData.error?.message || "Unknown error"}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("Send Error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}