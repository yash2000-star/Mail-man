import { describe, expect, it } from "vitest";
import { MimeError, buildMimeMessage, parseRecipients } from "@/lib/mime";

describe("parseRecipients", () => {
  it("splits and validates addresses", () => {
    expect(parseRecipients("a@x.com, B <b@y.org>; c@z.io", "to")).toEqual(["a@x.com", "B <b@y.org>", "c@z.io"]);
  });

  it("rejects header injection", () => {
    expect(() => parseRecipients("a@x.com\r\nBcc: evil@x.com", "to")).toThrow(MimeError);
  });

  it("rejects invalid addresses and requires one when asked", () => {
    expect(() => parseRecipients("not-an-email", "to")).toThrow(MimeError);
    expect(() => parseRecipients("", "to", true)).toThrow(MimeError);
    expect(parseRecipients("", "cc")).toEqual([]);
  });
});

describe("buildMimeMessage", () => {
  it("rejects line breaks in the subject", () => {
    expect(() => buildMimeMessage({ to: ["a@x.com"], subject: "Hi\r\nBcc: evil@x.com", text: "x" })).toThrow(MimeError);
  });

  it("encodes non-ASCII subjects and builds HTML with a text alternative", () => {
    const raw = buildMimeMessage({ to: ["a@x.com"], subject: "Héllo", html: "<p>Hi <b>there</b></p>" });
    expect(raw).toContain("Subject: =?UTF-8?B?");
    expect(raw).toContain("multipart/alternative");
    expect(raw).toContain("text/plain");
    expect(raw).toContain("text/html");
  });

  it("adds threading headers for replies", () => {
    const raw = buildMimeMessage({ to: ["a@x.com"], subject: "Re: x", text: "y", inReplyTo: "<m1@x>", references: "<m0@x>" });
    expect(raw).toContain("In-Reply-To: <m1@x>");
    expect(raw).toContain("References: <m0@x> <m1@x>");
  });

  it("attaches files with safe filenames", () => {
    const raw = buildMimeMessage({
      to: ["a@x.com"],
      subject: "Files",
      text: "see attached",
      attachments: [{ filename: 'evil"\r\nX-Injected: 1.txt', mimeType: "text/plain", data: Buffer.from("hello") }],
    });
    expect(raw).toContain("multipart/mixed");
    expect(raw).not.toMatch(/\r\nX-Injected/);
    expect(raw).toContain(Buffer.from("hello").toString("base64"));
  });
});
