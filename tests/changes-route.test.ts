import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const gmailFetch = vi.fn();

vi.mock("@/lib/gmail", async () => {
  class GmailError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  }
  return {
    GmailError,
    gmailFetch: (...args: unknown[]) => gmailFetch(...args),
    getGmailAuth: async () => ({ email: "a@example.com", accessToken: "token" }),
  };
});

const { GET } = await import("@/app/api/gmail/changes/route");
const { GmailError } = await import("@/lib/gmail");

const get = (query = "") => GET(new NextRequest(`http://localhost/api/gmail/changes${query}`));

beforeEach(() => gmailFetch.mockReset());

describe("GET /api/gmail/changes", () => {
  it("returns the current position when there is no `since`", async () => {
    gmailFetch.mockResolvedValueOnce({ historyId: "500" });
    const res = await get();
    expect(await res.json()).toEqual({ historyId: "500", newMessageIds: [] });
    expect(gmailFetch).toHaveBeenCalledWith("token", "profile");
  });

  it("lists new inbox messages, skipping drafts and sent mail, across pages", async () => {
    gmailFetch
      .mockResolvedValueOnce({
        historyId: "510",
        nextPageToken: "p2",
        history: [
          { messagesAdded: [{ message: { id: "a", labelIds: ["INBOX", "UNREAD"] } }] },
          { messagesAdded: [{ message: { id: "d", labelIds: ["DRAFT"] } }, { message: { id: "s", labelIds: ["SENT", "INBOX"] } }] },
        ],
      })
      .mockResolvedValueOnce({ historyId: "512", history: [{ messagesAdded: [{ message: { id: "b", labelIds: ["INBOX"] } }] }] });
    const res = await get("?since=500");
    expect(await res.json()).toEqual({ historyId: "512", newMessageIds: ["a", "b"] });
    expect(gmailFetch.mock.calls[0][1]).toContain("startHistoryId=500");
    expect(gmailFetch.mock.calls[1][1]).toContain("pageToken=p2");
  });

  it("asks for a reload when the position is too old", async () => {
    gmailFetch.mockRejectedValueOnce(new GmailError(404, "not found")).mockResolvedValueOnce({ historyId: "900" });
    const res = await get("?since=1");
    expect(await res.json()).toEqual({ historyId: "900", newMessageIds: [], reset: true });
  });

  it("ignores a malformed `since`", async () => {
    gmailFetch.mockResolvedValueOnce({ historyId: "500" });
    await get("?since=abc");
    expect(gmailFetch).toHaveBeenCalledWith("token", "profile");
  });
});
