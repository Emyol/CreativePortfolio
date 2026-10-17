import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

test("the admin opens (fixtures make it ready) and stays out of search engines", async ({ page }) => {
  const res = await gotoReady(page, "/admin");
  expect(res?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("heading", { level: 1, name: "Edit the tape" })).toBeVisible();
  await expect(page.locator("[data-device], [data-dock]")).toHaveCount(0);
});

test("no smooth scrolling in the admin", async ({ page }) => {
  await gotoReady(page, "/admin");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
});
