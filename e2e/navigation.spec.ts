import { expect, test } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test.describe(`motion: ${reducedMotion}`, () => {
    test.use({ reducedMotion });

    test("a cold deep link lands on the track with focus on its heading", async ({ page }) => {
      await gotoReady(page, "/#mixtape");
      await headingAtTop(page, "mixtape");
      await expect(page.locator("#mixtape-title")).toBeFocused();
    });

    test("hero keys scroll, focus and update the URL", async ({ page }) => {
      await gotoReady(page, "/#top");
      await page.locator("[data-hero]").getByRole("link", { name: "people" }).click();
      await headingAtTop(page, "people");
      await expect(page.locator("#people-title")).toBeFocused();
      await expect(page).toHaveURL(/#people$/);
    });

    test("the dock rises once the hero is gone and its keys navigate", async ({ page }) => {
      await gotoReady(page, "/#top");
      await expect(page.locator("[data-dock]")).toHaveAttribute("inert", "");
      await page.mouse.wheel(0, 1200);
      await expect(page.locator("[data-dock]")).not.toHaveAttribute("inert");
      await page.locator("[data-dock]").getByRole("link", { name: "people" }).click();
      await headingAtTop(page, "people");
      await expect(page.locator("#people-title")).toBeFocused();
      await expect(page).toHaveURL(/#people$/);
    });

    test("keys 1-4 follow side a, B flips to side b, then 2 is on rotation", async ({ page }) => {
      await gotoReady(page, "/#about");
      await headingAtTop(page, "about");
      await page.keyboard.press("3");
      await headingAtTop(page, "mixtape");
      await page.keyboard.press("b");
      await headingAtTop(page, "made");
      await page.keyboard.press("2");
      await headingAtTop(page, "on-rotation");
    });

    test("back returns to the previous track", async ({ page }) => {
      await gotoReady(page, "/#about");
      await headingAtTop(page, "about");
      await page.keyboard.press("4");
      await headingAtTop(page, "people");
      await page.goBack();
      await headingAtTop(page, "about");
    });
  });
}

test("shortcuts are ignored when turned off", async ({ page }) => {
  await gotoReady(page, "/#about");
  await headingAtTop(page, "about");
  await page.locator("footer").getByRole("button", { name: "Track keys" }).click();
  const before = await page.evaluate(() => scrollY);
  await page.keyboard.press("2");
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => scrollY)).toBe(before);
});

test("Lenis runs at full motion and is removed live on reduced motion", async ({ page }) => {
  await gotoReady(page, "/#top");
  await expect(page.locator("html")).toHaveClass(/lenis/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await page.keyboard.press("End"); // native scrolling works again
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
});

test("no smooth scrolling on the track list", async ({ page }) => {
  await gotoReady(page, "/tracklist");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
});

test.describe("hero to dock", () => {
  test.use({ reducedMotion: "no-preference" });
  test("the dock rises with the scroll, not at a threshold", async ({ page }) => {
    await gotoReady(page, "/#top");
    const heroH = await page.locator("[data-hero]").evaluate((el) => (el as HTMLElement).offsetHeight);
    const dockY = async (share: number) => {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(heroH * share));
      await page.waitForTimeout(500);
      return page.locator("[data-dock]").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
    };
    const sunk = await dockY(0);
    const at60 = await dockY(0.6);
    const at75 = await dockY(0.75);
    const risen = await dockY(1);
    expect(sunk).toBeGreaterThan(0);
    expect(at60).toBeLessThan(sunk);
    expect(at60).toBeGreaterThan(0);
    expect(at75).toBeLessThan(at60);
    expect(risen).toBe(0);
  });

  test("the device leans back and sinks as you leave it", async ({ page }) => {
    await gotoReady(page, "/#top");
    const heroH = await page.locator("[data-hero]").evaluate((el) => (el as HTMLElement).offsetHeight);
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(heroH * 0.5));
    await page.waitForTimeout(500);
    const m = await page.locator("[data-hero] [data-device]").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform));
    expect(m.isIdentity).toBe(false);
  });
});
