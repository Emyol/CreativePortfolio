import { devices, expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];
test.use({ ...iphone, reducedMotion: "no-preference" });

for (const path of ["/", "/events/fixture-event-1", "/mokuroku"]) {
  test(`${path} reads on a phone with no sideways scroll`, async ({ page }) => {
    await gotoReady(page, path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("phones get light motion: no Lenis, no entrance, no weather", async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.locator("html")).toHaveAttribute("data-tier", "lite");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await expect(page.locator("[data-entrance-phase]")).toHaveAttribute("data-entrance-phase", "done", { timeout: 1_500 });
  await page.evaluate(() => document.getElementById("events")!.scrollIntoView());
  await page.waitForTimeout(500);
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("every chapter heading is present", async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.locator("h2")).toHaveCount(6);
});
