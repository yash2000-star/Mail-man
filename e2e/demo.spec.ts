import { expect, test } from "@playwright/test";
import { openDemo, trackErrors } from "./helpers";

test.beforeEach(async ({ page }) => {
  // The demo must never reach the real API (sign-in aside)
  page.on("request", (req) => {
    const path = new URL(req.url()).pathname;
    if (path.startsWith("/api/") && !path.startsWith("/api/auth/")) throw new Error(`Demo called the server: ${path}`);
  });
});

test("opens a conversation with its AI summary and suggested reply", async ({ page }) => {
  const errors = trackErrors(page);
  await openDemo(page);
  await page.getByText("Q4 roadmap review: slides by Thursday").first().click();
  await expect(page.getByText("3 messages in this conversation")).toBeVisible();
  await expect(page.getByText("AI Generated Summary")).toBeVisible();
  await expect(page.getByText("AI Recommended Draft")).toBeVisible();
  // The email body renders in a sandboxed frame
  await expect(page.frameLocator("iframe").first().locator("body")).toContainText("Priya");
  expect(errors).toEqual([]);
});

test("sends a suggested reply from Needs Reply and finds it in Sent", async ({ page }) => {
  await openDemo(page);
  await page.getByText("Needs Reply", { exact: true }).click();
  await page.getByText("Dinner Saturday?").first().click();
  await page.getByRole("button", { name: /Send Reply/ }).click();
  await expect(page.getByText("Reply sent to Jordan Lee.")).toBeVisible();
  await page.getByText("Sent", { exact: true }).click();
  await expect(page.getByText("Re: Dinner Saturday?").first()).toBeVisible();
});

test("archives a conversation out of the inbox", async ({ page }) => {
  await openDemo(page);
  await page.getByText("Photos from the hike").first().click();
  await page.getByRole("toolbar", { name: "Email actions" }).getByTitle("Archive").click();
  await expect(page.getByText("Photos from the hike")).toHaveCount(0);
  await page.getByText("Archive", { exact: true }).click();
  await expect(page.getByText("Photos from the hike").first()).toBeVisible();
});

test("turns an email into a to-do and completes it", async ({ page }) => {
  await openDemo(page);
  await page.getByText(/Invoice #4821/).first().click();
  await page.getByTitle("More").click();
  await page.getByText("Add to To-do").click();
  await expect(page.getByText("Added to your to-do list.")).toBeVisible();
  await page.getByText("To-do", { exact: true }).first().click();
  const task = page.getByText(/Follow up: Invoice #4821/);
  await expect(task).toBeVisible();
});

test("creates a Smart Label", async ({ page }) => {
  await openDemo(page);
  await page.getByText("New Smart Label").click();
  await page.getByPlaceholder("Name your label...").fill("Newsletters");
  await page.getByPlaceholder(/Which emails get this label/).fill("Newsletters and weekly digests");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByPlaceholder("Name your label...")).toHaveCount(0);
  await expect(page.getByText("Newsletters", { exact: true }).first()).toBeVisible();
});

test("answers inbox questions in chat", async ({ page }) => {
  await openDemo(page);
  await page.getByTitle("AI Assistant").click();
  const input = page.getByPlaceholder("Search, write, or ask anything...");
  await input.fill("What needs a reply from me?");
  await input.press("Enter");
  await expect(page.getByText("These conversations are waiting on a reply", { exact: false })).toBeVisible();
});

test("composes and sends a new email", async ({ page }) => {
  await openDemo(page);
  await page.getByText("Compose", { exact: true }).first().click();
  await page.getByLabel("To", { exact: true }).fill("sam.okafor@example.net");
  await page.getByLabel("Subject", { exact: true }).fill("Hike next month");
  await page.locator(".ql-editor").first().fill("Eagle Ridge works for me.");
  await page.getByTitle("Send", { exact: true }).click();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveCount(0);
  await page.getByText("Sent", { exact: true }).click();
  await expect(page.getByText("Hike next month").first()).toBeVisible();
});

test("new mail arrives live", async ({ page }) => {
  test.slow(); // the demo delivers it after ~20s; the app checks every 30s
  await openDemo(page);
  await expect(page.getByText("New email from Lumen Labs IT")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Your new laptop is ready for pickup").first()).toBeVisible();
  await expect(page).toHaveTitle(/^\(6\) Inbox/);
});
