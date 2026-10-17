import { devices, expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

test.describe("full motion, before anything is scrolled into view", () => {
  test.use({ reducedMotion: "no-preference" });

  test("content waiting for its reveal stays in the accessibility tree and the tab order", async ({ page }) => {
    await gotoReady(page, "/#top");
    // visibility:hidden (GSAP autoAlpha) would remove these until scrolled past.
    await expect(page.getByRole("link", { name: "More about Fixture hobby two" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Fixture person B" })).toHaveCount(1);
    await expect(page.getByRole("list", { name: "Toolbox" }).getByRole("listitem")).toHaveCount(4);
  });

  test("tabbing to a link that hasn't revealed yet shows it", async ({ page }) => {
    await gotoReady(page, "/#top");
    const link = page.getByRole("link", { name: "More about Fixture hobby two" });
    await link.focus();
    await expect.poll(() => link.evaluate((el) => Number(getComputedStyle(el.closest("[data-ema]")!).opacity))).toBe(1);
  });

  test("the hero menu is in the accessibility tree during the entrance", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("html[data-tier]", { state: "attached" });
    await expect(page.getByRole("navigation", { name: "Chapters" }).getByRole("link")).toHaveCount(6);
  });
});

test.describe("seal rail", () => {
  test("sits on its own opaque backing, so it reads over paper at narrower widths", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await gotoReady(page, "/#music");
    const bg = await page.locator("nav[aria-label='Chapter rail']").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  });
});

test.describe("phones", () => {
  const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];
  test.use({ ...iphone });

  test("every rail link has an accessible name", async ({ page }) => {
    await gotoReady(page, "/#events");
    const rail = page.getByRole("navigation", { name: "Chapter rail" });
    for (const name of ["About", "Events", "Music", "Hobbies", "Shelf", "People"]) {
      await expect(rail.getByRole("link", { name })).toHaveCount(1);
    }
  });
});
