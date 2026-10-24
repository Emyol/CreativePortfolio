import { expect, test, type Page } from "@playwright/test";
import { gotoReady } from "./helpers";

/**
 * How far each of the letter's lines has risen into place, in order (0 is hidden below its
 * edge, 1 is in place), and how much of any line shows outside its own edge. SplitText wraps
 * each line in an edge (`p > div`) that the line (`p > div > div`) rises into.
 */
const lines = (page: Page) =>
  page.locator("#about article").evaluate((letter) =>
    [...letter.querySelectorAll<HTMLElement>("p > div > div")].map((line) => {
      const edge = line.parentElement!.getBoundingClientRect();
      const r = line.getBoundingClientRect();
      return { risen: 1 - (r.top - edge.top) / edge.height, outside: r.top < edge.top - 1 };
    }),
  );

const plain = (page: Page) =>
  page.locator("#about article").evaluate((letter) => ({
    split: letter.querySelectorAll("p > div").length,
    text: letter.textContent,
    hidden: letter.querySelectorAll("[aria-hidden]").length,
  }));

test.describe("full motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the letter's lines rise into place one by one, none showing before its turn", async ({ page }) => {
    await gotoReady(page, "/#top");
    const about = page.locator("#about");
    const { text } = await plain(page);
    await page.mouse.move(720, 300);
    const seen: { arrival: number; risen: number[]; outside: boolean }[] = [];
    for (let i = 0; i < 80; i++) {
      await page.mouse.wheel(0, 60);
      await page.waitForTimeout(60);
      const arrival = Number(await about.getAttribute("data-arrival"));
      const ls = await lines(page);
      seen.push({ arrival, risen: ls.map((l) => l.risen), outside: ls.some((l) => l.outside) });
      if (arrival >= 1) break;
    }
    expect(seen[0].risen.length).toBeGreaterThan(3);
    // Before the hold every line is hidden below its own edge.
    expect(seen[0].risen.every((r) => r <= 0.001)).toBe(true);
    // Midway some lines are in and later ones still hidden: they rise in order.
    expect(seen.some((s) => s.risen[0] > 0.99 && s.risen.at(-1)! < 0.01)).toBe(true);
    for (const s of seen) {
      for (let i = 1; i < s.risen.length; i++) expect(s.risen[i]).toBeLessThanOrEqual(s.risen[i - 1] + 0.001);
    }
    // No line ever shows above its edge, and all are in place once it arrives.
    expect(seen.filter((s) => s.outside)).toEqual([]);
    await expect(about).toHaveAttribute("data-arrival", "1.00");
    await expect.poll(async () => Math.min(...(await lines(page)).map((l) => l.risen))).toBeGreaterThan(0.999);
    // A screen reader reads the same letter throughout: nothing hidden from it, no text lost.
    const during = await plain(page);
    expect(during.text).toBe(text);
    expect(during.hidden).toBe(0);
  });

  test("switching on reduced motion puts the letter back as plain text, all of it shown", async ({ page }) => {
    await gotoReady(page, "/#top");
    await page.mouse.move(720, 300);
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, 60);
      await page.waitForTimeout(60);
      const risen = (await lines(page)).map((l) => l.risen);
      if (risen.length && risen[0] > 0.5 && risen.at(-1)! < 0.5) break;
    }
    expect((await plain(page)).split).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(async () => (await plain(page)).split).toBe(0);
    await expect(page.locator("#about article p").first()).toBeVisible();
    await expect(page.locator("#about article p").last()).toBeInViewport();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the letter is never split", async ({ page }) => {
    await gotoReady(page, "/#about");
    expect((await plain(page)).split).toBe(0);
  });
});
