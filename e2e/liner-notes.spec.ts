import { expect, test, type Page } from "@playwright/test";
import { gotoReady } from "./helpers";

/**
 * A real letter's lower fold is far taller than its first paragraph. Lengthen the fixture's
 * so the folded flap is taller than what it lies over, then resize a little: the refresh
 * re-measures the hold (and the fold's perspective) on the new size.
 */
const lengthenLetter = async (page: Page, paragraphs: number) => {
  await page.locator("#about [data-fold=bottom] p").first().evaluate((p, n) => {
    for (let i = 0; i < n; i++) p.after(p.cloneNode(true));
  }, paragraphs);
  const { width, height } = page.viewportSize()!;
  await page.setViewportSize({ width, height: height - 20 });
  await page.waitForTimeout(600);
};

/** What the visitor sees of the letter at this point of the arrival. */
const sample = (page: Page) =>
  page.locator("#about").evaluate((root) => {
    const letter = root.querySelector("article")!;
    const fold = root.querySelector("[data-fold=bottom]")!;
    const back = fold.querySelector("[aria-hidden]")!;
    const first = root.querySelector<HTMLElement>("[data-fold=top] p")!;
    const l = letter.getBoundingClientRect();
    // The flap painted just above the letter, over the card's padding and the heading's tab.
    const above = [0.1, 0.3, 0.5, 0.7, 0.9].some((f) => document.elementFromPoint(l.left + f * l.width, l.top - 6) === back);
    // The ends of the first paragraph's lines the flap still lies across: its words show
    // beside the flap if it leaves them bare. (Lines it has lifted off are meant to show.)
    const flap = back.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(first);
    const ends = [...range.getClientRects()]
      .filter((r) => r.top + r.height / 2 > flap.top && r.top + r.height / 2 < flap.bottom)
      .flatMap((r) => [
        [r.left + 3, r.top + r.height / 2],
        [r.right - 3, r.top + r.height / 2],
      ]);
    const bare = ends.some(([x, y]) => first.contains(document.elementFromPoint(x, y)));
    // How much wider than the letter the fold looks as it swings toward the visitor, and
    // whether any of it paints past the card's padding beside the letter.
    const f = fold.getBoundingClientRect();
    const swell = f.width / l.width;
    const pad = parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.25;
    const ys = [0.1, 0.3, 0.5, 0.7, 0.9].map((k) => f.top + k * f.height);
    const outside = ys.some((y) => [l.left - pad - 2, l.right + pad + 2].some((x) => fold.contains(document.elementFromPoint(x, y))));
    return { arrival: Number(root.getAttribute("data-arrival")), above, beside: bare, swell, outside };
  });

const cases = [
  { name: "a letter longer than its first paragraph", width: 1440, height: 900, paragraphs: 4 },
  { name: "a letter taller than the screen", width: 1440, height: 900, paragraphs: 30 },
  { name: "a long letter on a phone", width: 390, height: 844, paragraphs: 15 },
];

test.describe("full motion", () => {
  test.use({ reducedMotion: "no-preference" });

  for (const c of cases) {
    test(`the folded letter keeps its words hidden and its flap in place: ${c.name}`, async ({ page }) => {
      await page.setViewportSize({ width: c.width, height: c.height });
      await gotoReady(page, "/#top");
      await lengthenLetter(page, c.paragraphs);
      await page.mouse.move(c.width / 2, 300);
      const seen: Awaited<ReturnType<typeof sample>>[] = [];
      for (let i = 0; i < 150; i++) {
        await page.mouse.wheel(0, 60);
        await page.waitForTimeout(60);
        const s = await sample(page);
        const box = await page.locator("#about article").boundingBox();
        if (box && box.y > 0 && box.y < c.height) seen.push(s);
        if (s.arrival >= 1) break;
      }
      expect(seen.filter((s) => s.arrival > 0 && s.arrival < 0.5).length).toBeGreaterThan(2);
      // Where the flap lies over the first paragraph, none of it shows around the flap.
      expect(seen.filter((s) => s.beside)).toEqual([]);
      // The flap never reaches past the letter's top, whatever its height.
      expect(seen.filter((s) => s.above)).toEqual([]);
      // Nor does it balloon sideways as it swings past upright.
      expect(Math.max(...seen.map((s) => s.swell))).toBeLessThan(1.25);
      expect(seen.filter((s) => s.outside)).toEqual([]);
      expect(seen.at(-1)!.arrival).toBe(1);
    });
  }
});
