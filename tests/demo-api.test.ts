import { describe, expect, it } from "vitest";
import { createDemoApi } from "@/lib/demo/api";
import { createDemoState } from "@/lib/demo/data";

function setup() {
  const handle = createDemoApi(createDemoState());
  return async (method: string, url: string, body: Record<string, unknown> = {}) => {
    const u = new URL(url, "http://localhost");
    const res = await handle({ method, path: u.pathname, query: u.searchParams, body });
    return { status: res!.status, data: await res!.json() };
  };
}

describe("demo API", () => {
  it("serves a signed-in session and a saved key", async () => {
    const call = setup();
    expect((await call("GET", "/api/auth/session")).data.user.email).toContain("@example.com");
    expect((await call("GET", "/api/user")).data.savedKeys.gemini.saved).toBe(true);
  });

  it("lists the inbox newest first with AI results", async () => {
    const call = setup();
    const { data } = await call("GET", "/api/gmail/messages?folder=Inbox");
    expect(data.emails.length).toBeGreaterThan(5);
    expect(data.emails[0].summary).toBeTruthy();
    const times = data.emails.map((e: { timestamp: number }) => e.timestamp);
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("archives a conversation out of the inbox", async () => {
    const call = setup();
    const before = (await call("GET", "/api/gmail/messages?folder=Inbox")).data.emails;
    await call("POST", "/api/action", { threadId: before[0].threadId, action: "archive" });
    const after = (await call("GET", "/api/gmail/messages?folder=Inbox")).data.emails;
    expect(after).toHaveLength(before.length - 1);
    const archive = (await call("GET", "/api/gmail/messages?folder=Archive")).data.emails;
    expect(archive.some((e: { threadId: string }) => e.threadId === before[0].threadId)).toBe(true);
  });

  it("sends mail into Sent and needs a recipient", async () => {
    const call = setup();
    expect((await call("POST", "/api/send", { to: "", message: "x" })).status).toBe(400);
    await call("POST", "/api/send", { to: "sam@example.net", subject: "Hello", message: "Hi" });
    const sent = (await call("GET", "/api/gmail/messages?folder=Sent")).data.emails;
    expect(sent[0].subject).toBe("Hello");
  });

  it("adds, completes and deletes tasks", async () => {
    const call = setup();
    const added = (await call("POST", "/api/tasks", { title: "Demo task", dueDate: "2026-12-01" })).data.tasks;
    const task = added.find((t: { title: string }) => t.title === "Demo task");
    expect(task.dueDate).toBe("2026-12-01");
    const done = (await call("PATCH", "/api/tasks", { id: task.id, status: "done" })).data.tasks;
    expect(done.find((t: { id: string }) => t.id === task.id).status).toBe("done");
    const left = (await call("DELETE", `/api/tasks?id=${task.id}`)).data.tasks;
    expect(left.some((t: { id: string }) => t.id === task.id)).toBe(false);
  });

  it("refuses to save keys or delete data", async () => {
    const call = setup();
    expect((await call("POST", "/api/user", { geminiApiKey: "x" })).status).toBe(403);
    expect((await call("DELETE", "/api/user")).status).toBe(403);
  });
}, 20_000);
