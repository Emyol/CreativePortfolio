import { expect, test, type Page } from "./fixtures";
import { gotoReady } from "./helpers";

const about = (page: Page) => page.locator("main[data-jcard=about]");
const screen = (page: Page) => about(page).locator("[data-dot-photo]");
/** The share of the screen's pixels lit, read from the canvas itself (an off dot is nearly transparent). */
const lit = (page: Page) =>
  screen(page).evaluate((c) => {
    const canvas = c as HTMLCanvasElement;
    const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    let n = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 60) n++;
    return n / (data.length / 4);
  });

test("the About photo is a dot-matrix screen, named for screen readers", async ({ page }) => {
  await gotoReady(page, "/about");
  await expect(about(page).getByRole("img", { name: "Fixture photo 0" })).toHaveAttribute("data-dot-photo", "");
  // Only the dot version: the photo itself is never shown.
  await expect(about(page).locator("img")).toHaveCount(0);
  await expect.poll(() => lit(page)).toBeGreaterThan(0.02);
});

test.describe("full motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("a resize after it has come on leaves it lit", async ({ page }) => {
    await gotoReady(page, "/about");
    await expect.poll(() => lit(page)).toBeGreaterThan(0.1);
    await page.setViewportSize({ width: 1300, height: 860 });
    await page.waitForTimeout(800);
    expect(await lit(page)).toBeGreaterThan(0.1);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the screen is lit", async ({ page }) => {
    await gotoReady(page, "/about");
    await expect.poll(() => lit(page)).toBeGreaterThan(0.02);
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the screen sits centred under the letter", async ({ page }) => {
    await gotoReady(page, "/about");
    const [left, right] = await about(page).locator("figure").evaluate((el) => {
      const r = el.getBoundingClientRect();
      const box = el.closest("[data-has-photo]")!.getBoundingClientRect();
      return [r.left - box.left, box.right - r.right];
    });
    expect(Math.abs(left - right)).toBeLessThan(4);
  });
});
