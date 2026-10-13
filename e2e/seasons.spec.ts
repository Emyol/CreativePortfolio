import { expect, test, type Page } from "@playwright/test";
import { gotoReady } from "./helpers";

const wall = (page: Page) => page.evaluate(() => document.documentElement.style.getPropertyValue("--wall").trim());

test("the wall turns to the Events night, then to winter", async ({ page }) => {
  await gotoReady(page, "/#events");
  await expect.poll(() => wall(page)).toBe("#0f1426");
  await page.keyboard.press("5"); // Shelf
  await expect.poll(() => wall(page)).toBe("#262d33");
});

test("a gust appears on a season change and has stopped drawing shortly after", async ({ page }) => {
  await gotoReady(page, "/#about");
  await page.keyboard.press("2"); // to Events
  const canvas = page.locator("canvas[aria-hidden='true']");
  await expect(canvas).toHaveCount(1);
  await page.waitForTimeout(3_500);
  const painted = await canvas.evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return true;
    return false;
  });
  expect(painted).toBe(false);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("no weather at all", async ({ page }) => {
    await gotoReady(page, "/#about");
    await page.keyboard.press("2");
    await page.waitForTimeout(500);
    await expect(page.locator("canvas")).toHaveCount(0);
  });
});
