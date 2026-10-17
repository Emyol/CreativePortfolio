import { devices, expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];
test.use({ ...iphone, reducedMotion: "no-preference" });

for (const path of ["/", "/events/fixture-event-1", "/tracklist"]) {
  test(`${path} reads on a phone with no sideways scroll`, async ({ page }) => {
    await gotoReady(page, path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("phones get light motion: no Lenis", async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.locator("html")).toHaveAttribute("data-tier", "lite");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
});
