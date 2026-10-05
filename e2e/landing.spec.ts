import { expect, test } from "@playwright/test";

test("landing page shows the hero and links to the demo", async ({ page }) => {
  await page.goto("/");
  const demoLink = page.getByRole("link", { name: /Try the live demo/ }).first();
  await expect(demoLink).toBeVisible();
  await expect(page.getByRole("button", { name: /Connect Gmail Free/ }).first()).toBeVisible();
  await demoLink.click();
  await expect(page).toHaveURL(/\/demo$/);
});

test("legal pages, 404 and metadata routes work", async ({ page, request }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByText("Limited Use", { exact: false })).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeVisible();
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toBeVisible();

  expect((await request.get("/robots.txt")).ok()).toBe(true);
  expect((await request.get("/sitemap.xml")).ok()).toBe(true);
  const og = await request.get("/opengraph-image");
  expect(og.headers()["content-type"]).toBe("image/png");
});

test("every page sends the security headers", async ({ request }) => {
  const headers = (await request.get("/")).headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["strict-transport-security"]).toBeTruthy();
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("API routes refuse requests without a session", async ({ request }) => {
  for (const path of ["/api/user", "/api/tasks", "/api/gmail/messages", "/api/gmail/changes"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(401);
  }
});
