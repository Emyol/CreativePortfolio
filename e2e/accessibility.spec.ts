import { devices, expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

test.describe("full motion, before anything is scrolled into view", () => {
  test.use({ reducedMotion: "no-preference" });

  test("content waiting below the fold stays in the accessibility tree and the tab order", async ({ page }) => {
    await gotoReady(page, "/#top");
    await expect(page.getByRole("link", { name: "More about Fixture hobby two" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Fixture person B" })).toHaveCount(1);
  });
});

test.describe("phones", () => {
  const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];
  test.use({ ...iphone });

  test("every track heading is reachable", async ({ page }) => {
    await gotoReady(page, "/");
    await expect(page.locator("section[data-track] h2")).toHaveCount(6);
  });
});
