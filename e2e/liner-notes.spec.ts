import { expect, test, type Page } from "@playwright/test";
import { gotoReady } from "./helpers";

/**
 * The letter as the visitor sees it. While its lines rise, SplitText wraps each line in an
 * edge (`p > span`) that the line (`p > span > span`) rises into: `risen` is how far each has
 * risen, in order (0 hidden below its edge, 1 in place).
 */
const letter = (page: Page) =>
  page.locator("#about article").evaluate((el) => {
    const lines = [...el.querySelectorAll<HTMLElement>("p > span > span")];
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    return {
      arrival: Number(el.closest("#about")!.getAttribute("data-arrival")),
      opacity: Number(getComputedStyle(el).opacity),
      split: lines.length,
      risen: lines.map((line) => {
        const edge = line.parentElement!.getBoundingClientRect();
        return 1 - (line.getBoundingClientRect().top - edge.top) / edge.height;
      }),
      outside: lines.some((line) => line.getBoundingClientRect().top < line.parentElement!.getBoundingClientRect().top - 1),
      // A split line that wraps onto a second line inside its edge was split for another width.
      rewrapped: lines.some((line) => line.getBoundingClientRect().height > lineHeight * 1.5),
      text: el.textContent,
      hidden: el.querySelectorAll("[aria-hidden]").length,
    };
  });

type Seen = Awaited<ReturnType<typeof letter>>;

/** Scrolls into the About hold until `until` holds, recording what the visitor saw. */
async function scrollAbout(page: Page, until: (s: Seen) => boolean) {
  await page.mouse.move(720, 300);
  const seen: Seen[] = [await letter(page)];
  for (let i = 0; i < 80 && !until(seen.at(-1)!); i++) {
    await page.mouse.wheel(0, 60);
    await page.waitForTimeout(60);
    seen.push(await letter(page));
  }
  return seen;
}

test.describe("full motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the letter's lines rise into place one by one, none showing before its turn", async ({ page }) => {
    await gotoReady(page, "/#top");
    const { text } = await letter(page);
    const seen = await scrollAbout(page, (s) => s.arrival >= 1);
    // Before the hold the letter is hidden whole, and plain text.
    expect(seen[0]).toMatchObject({ opacity: 0, split: 0 });
    const rising = seen.filter((s) => s.split > 0);
    expect(rising.length).toBeGreaterThan(2);
    // Midway some lines are in and later ones still hidden: they rise in order.
    expect(rising.some((s) => s.risen[0] > 0.99 && s.risen.at(-1)! < 0.01)).toBe(true);
    for (const s of rising) {
      for (let i = 1; i < s.risen.length; i++) expect(s.risen[i]).toBeLessThanOrEqual(s.risen[i - 1] + 0.001);
    }
    // No line ever shows above its own edge, and a screen reader reads the same letter.
    expect(seen.filter((s) => s.outside)).toEqual([]);
    for (const s of rising) expect(s).toMatchObject({ text, hidden: 0 });
    // Arrived, it is plain text again (find-in-page and copying work), shown in full.
    await expect(page.locator("#about")).toHaveAttribute("data-arrival", "1.00");
    await expect.poll(async () => (await letter(page)).split).toBe(0);
    expect(await letter(page)).toMatchObject({ opacity: 1, text });
  });

  test("a deep link to About shows the letter settled, never hidden or split", async ({ page }) => {
    await page.goto("/#about");
    await page.waitForSelector("html[data-tier]", { state: "attached" });
    const frames = await page.evaluate(
      () =>
        new Promise<{ opacity: number; split: number }[]>((done) => {
          const out: { opacity: number; split: number }[] = [];
          const el = document.querySelector("#about article")!;
          const tick = () => {
            out.push({ opacity: Number(getComputedStyle(el).opacity), split: el.querySelectorAll("p > span > span").length });
            if (out.length < 90) requestAnimationFrame(tick);
            else done(out);
          };
          tick();
        }),
    );
    expect(frames.filter((f) => f.opacity < 1 || f.split > 0)).toEqual([]);
  });

  test("a resize mid-rise splits the lines again as they now wrap", async ({ page }) => {
    await gotoReady(page, "/#top");
    await scrollAbout(page, (s) => s.split > 0 && s.risen[0] > 0.5 && s.risen.at(-1)! < 0.5);
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.waitForTimeout(800);
    const after = await letter(page);
    expect(after.split).toBeGreaterThan(0);
    expect(after.rewrapped).toBe(false);
  });

  test("switching on reduced motion puts the letter back as plain text, all of it shown", async ({ page }) => {
    await gotoReady(page, "/#top");
    await scrollAbout(page, (s) => s.split > 0 && s.risen[0] > 0.5 && s.risen.at(-1)! < 0.5);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(async () => (await letter(page)).split).toBe(0);
    expect((await letter(page)).opacity).toBe(1);
    await expect(page.locator("#about article p").last()).toBeInViewport();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the letter is never split or hidden", async ({ page }) => {
    await gotoReady(page, "/#about");
    expect(await letter(page)).toMatchObject({ split: 0, opacity: 1 });
  });
});
