import { describe, expect, it } from "vitest";
import { baseSubject, draftCompose, escapeHtml, forwardCompose, replyCompose, textToHtml } from "@/lib/compose";
import type { MailMessage } from "@/lib/mail-types";

const original: MailMessage = {
  id: "m1", threadId: "t1", from: "Ana <script>", fromEmail: "ana@example.com", to: "me@example.com", cc: "",
  subject: "Re: Fwd: Plans", date: "Mon, 5 Oct 2026 10:00:00 +0000", snippet: "hi", isUnread: false, isStarred: false,
  hasAttachment: false, timestamp: 0, body: "Line 1\n<b>not bold</b>", bodyIsHtml: false, attachments: [],
  bcc: "", messageId: "<m1@example.com>", references: "<m0@example.com>",
};

describe("compose helpers", () => {
  it("escapes HTML", () => {
    expect(escapeHtml(`<a href="x">&</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });

  it("turns text into paragraphs", () => {
    expect(textToHtml("Hi Ana,\n\nSounds good.\nAlex")).toBe("<p>Hi Ana,</p><p>Sounds good.<br>Alex</p>");
  });

  it("strips reply and forward prefixes", () => {
    expect(baseSubject("Re: RE: Fwd: FW: Plans")).toBe("Plans");
  });

  it("builds a threaded reply that quotes the original safely", () => {
    const reply = replyCompose(original, "<p>Yes</p>");
    expect(reply.to).toBe("ana@example.com");
    expect(reply.subject).toBe("Re: Plans");
    expect(reply.replyTo).toEqual({ emailId: "m1", threadId: "t1", messageId: "<m1@example.com>", references: "<m0@example.com>" });
    expect(reply.quotedHtml).toContain("&lt;b&gt;not bold&lt;/b&gt;");
    expect(reply.quotedHtml).not.toContain("<script>");
  });

  it("builds a forward with the original headers", () => {
    const fwd = forwardCompose(original);
    expect(fwd.to).toBe("");
    expect(fwd.subject).toBe("Fwd: Plans");
    expect(fwd.quotedHtml).toContain("Forwarded message");
    expect(fwd.replyTo).toBeUndefined();
  });

  it("reopens drafts", () => {
    const draft = draftCompose("d1", { ...original, subject: "(no subject)", body: "Hello\nthere" });
    expect(draft.subject).toBe("");
    expect(draft.body).toBe("<p>Hello<br>there</p>");
    expect(draft.draft?.draftId).toBe("d1");
  });
});
