import { expect, type Page } from "@playwright/test";

/** Opens the demo and waits for the sample inbox. */
export async function openDemo(page: Page) {
  await page.goto("/demo");
  await expect(page.getByText("Q4 roadmap review: slides by Thursday").first()).toBeVisible();
}

/** Collects uncaught page errors so a test can assert there were none. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
