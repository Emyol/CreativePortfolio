import { expect, test, type Page } from "@playwright/test";

test.use({ reducedMotion: "no-preference" });

// Lowest opacity a section shows over its first moments on the page.
async function lowestOpacity(page: Page, selector: string) {
  return page.evaluate(
    (sel) =>
      new Promise<number>((resolve) => {
        let min = 1;
        const start = performance.now();
        const tick = () => {
          const el = document.querySelector(sel);
          if (el) min = Math.min(min, Number(getComputedStyle(el).opacity));
          if (performance.now() - start < 700) requestAnimationFrame(tick);
          else resolve(min);
        };
        tick();
      }),
    selector,
  );
}

test("a deep-linked track is on screen from the first frame: it never blinks out to fade in", async ({ page }) => {
  await page.goto("/#events");
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  expect(await lowestOpacity(page, "#events")).toBe(1);
});

test.describe("phones", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the first track, visible under the hero at load, doesn't flash", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("html[data-tier]", { state: "attached" });
    expect(await lowestOpacity(page, "#about")).toBe(1);
  });
});

test("a track further down still rises in as it enters", async ({ page }) => {
  await page.goto("/#top");
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  expect(await page.locator("#people").evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(1);
});
