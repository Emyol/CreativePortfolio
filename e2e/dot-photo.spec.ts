import { expect, test, type Page } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

const screen = (page: Page) => page.locator("#about [data-dot-photo]");
/** The share of the screen's pixels lit, read from the canvas itself (an off dot is nearly transparent). */
const lit = (page: Page) =>
  screen(page).evaluate((c) => {
    const canvas = c as HTMLCanvasElement;
    const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    let n = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 60) n++;
    return n / (data.length / 4);
  });
/** Counts the screen's flickers. */
const countFlickers = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __flickers: number };
    w.__flickers = 0;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, ...args: Parameters<Element["animate"]>) {
      if (this.hasAttribute("data-dot-photo")) w.__flickers++;
      return animate.apply(this, args);
    };
  });
const flickers = (page: Page) => page.evaluate(() => (window as unknown as { __flickers: number }).__flickers);
const reveal = async (page: Page) => Number(await screen(page).getAttribute("data-reveal"));

test("the About photo is a dot-matrix screen, named for screen readers", async ({ page }) => {
  await gotoReady(page, "/#about");
  await headingAtTop(page, "about");
  await expect(page.getByRole("img", { name: "Fixture photo 0" })).toHaveAttribute("data-dot-photo", "");
  // Only the dot version: the photo itself is never shown.
  await expect(page.locator("#about img")).toHaveCount(0);
  await expect.poll(() => lit(page)).toBeGreaterThan(0.02);
});

test.describe("full motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("it powers on with a scanline as About arrives, and scrolling back dims it again", async ({ page }) => {
    await countFlickers(page);
    await gotoReady(page, "/#top");
    const about = page.locator("#about");
    await page.mouse.move(720, 300);
    let partly: number | undefined;
    for (let i = 0; i < 60; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(60);
      const a = Number(await about.getAttribute("data-arrival"));
      const r = await reveal(page);
      if (a > 0.2 && a < 0.6 && r > 0 && r < 1) partly ??= await lit(page);
      if (a >= 1) break;
    }
    expect(partly).toBeDefined();
    await expect(about).toHaveAttribute("data-arrival", "1.00");
    await expect.poll(() => reveal(page)).toBe(1);
    const full = await lit(page);
    expect(full).toBeGreaterThan(partly! + 0.05);
    // It flickered once as it came on, and never again on the way back.
    expect(await flickers(page)).toBe(1);
    for (let i = 0; i < 40 && (await reveal(page)) >= 1; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(60);
    }
    expect(await reveal(page)).toBeLessThan(1);
    expect(await flickers(page)).toBe(1);
  });

  test("a resize after it has come on leaves it lit", async ({ page }) => {
    await gotoReady(page, "/#about");
    await headingAtTop(page, "about");
    await expect.poll(() => reveal(page)).toBe(1);
    const before = await lit(page);
    expect(before).toBeGreaterThan(0.1);
    await page.setViewportSize({ width: 1300, height: 860 });
    await page.waitForTimeout(800);
    expect(await reveal(page)).toBe(1);
    expect(await lit(page)).toBeGreaterThan(0.1);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the screen is fully lit at once, with no sweep", async ({ page }) => {
    await gotoReady(page, "/#about");
    await expect.poll(() => reveal(page)).toBe(1);
    await expect.poll(() => lit(page)).toBeGreaterThan(0.02);
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the screen sits centred under the letter", async ({ page }) => {
    await gotoReady(page, "/#about");
    await headingAtTop(page, "about");
    const [left, right] = await page.locator("#about figure").evaluate((el) => {
      const r = el.getBoundingClientRect();
      const box = el.closest("[data-has-photo]")!.getBoundingClientRect();
      return [r.left - box.left, box.right - r.right];
    });
    expect(Math.abs(left - right)).toBeLessThan(4);
  });
});
