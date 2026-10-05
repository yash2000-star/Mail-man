import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-options";

describe("scrubEvent", () => {
  it("removes request bodies, cookies, auth headers and user details", () => {
    const event = {
      type: undefined,
      message: "boom",
      user: { email: "a@example.com", ip_address: "1.2.3.4" },
      request: {
        url: "https://mail-man.example/api/send",
        data: '{"message":"secret email body"}',
        cookies: { "next-auth.session-token": "abc" },
        headers: { Cookie: "x", authorization: "Bearer y", "user-agent": "test" },
      },
    } as unknown as ErrorEvent;
    const scrubbed = scrubEvent(event);
    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.request?.data).toBeUndefined();
    expect(scrubbed.request?.cookies).toBeUndefined();
    expect(scrubbed.request?.headers).toEqual({ "user-agent": "test" });
    expect(scrubbed.request?.url).toBe("https://mail-man.example/api/send");
    expect(scrubbed.message).toBe("boom");
  });
});
