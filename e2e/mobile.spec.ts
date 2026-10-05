import { expect, test } from "@playwright/test";
import { openDemo } from "./helpers";

test("mobile layout: bottom navigation and the sidebar drawer", async ({ page }) => {
  await openDemo(page);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav).toBeVisible();
  await nav.getByRole("button", { name: "To-do" }).click();
  await expect(page.getByText("Return library books")).toBeVisible();
  await nav.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByText("Needs Reply", { exact: true })).toBeVisible();
});
