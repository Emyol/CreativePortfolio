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

test("on a phone, an event page's dock scrolls its long line without resizing its screen", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await gotoReady(page, "/events/fixture-event-1");
  const screen = page.locator("[data-dock] [data-screen]");
  await expect(screen.locator("p[data-marquee]")).not.toHaveCount(0);
  const widths = new Set<number>();
  for (let i = 0; i < 10; i++) {
    widths.add(Math.round(await screen.evaluate((el) => el.getBoundingClientRect().width)));
    await page.waitForTimeout(100);
  }
  expect([...widths]).toHaveLength(1);
  expect(errors).toEqual([]);
});
