import { expect, test, type Page } from "@playwright/test";
import { gotoReady } from "./helpers";

/**
 * A real letter's lower fold is far taller than its first paragraph. Lengthen the fixture's
 * so the folded flap is taller than what it lies over (the hold animates transforms only, so
 * the arrival plays on the new size).
 */
const lengthenLetter = (page: Page) =>
  page.locator("#about [data-fold=bottom] p").first().evaluate((p) => {
    for (let i = 0; i < 4; i++) p.after(p.cloneNode(true));
  });

/** What the visitor sees of the letter at this point of the arrival. */
const sample = (page: Page) =>
  page.locator("#about").evaluate((root) => {
    const letter = root.querySelector("article")!;
    const back = root.querySelector("[data-fold=bottom] [aria-hidden]")!;
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
    const shown = Number(getComputedStyle(first.parentElement!).opacity) > 0;
    return { arrival: Number(root.getAttribute("data-arrival")), above, beside: bare && shown };
  });

test.describe("full motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the folded letter keeps its words hidden and its flap inside the letter", async ({ page }) => {
    await gotoReady(page, "/#top");
    await lengthenLetter(page);
    await page.mouse.move(720, 300);
    const seen: Awaited<ReturnType<typeof sample>>[] = [];
    for (let i = 0; i < 80; i++) {
      await page.mouse.wheel(0, 60);
      await page.waitForTimeout(60);
      const s = await sample(page);
      const box = await page.locator("#about article").boundingBox();
      if (box && box.y > 0 && box.y < 900) seen.push(s);
      if (s.arrival >= 1) break;
    }
    expect(seen.filter((s) => s.arrival > 0 && s.arrival < 0.5).length).toBeGreaterThan(2);
    // Where the flap lies over the first paragraph, none of it shows around the flap.
    expect(seen.filter((s) => s.beside)).toEqual([]);
    // The flap never reaches past the letter's top, whatever its height.
    expect(seen.filter((s) => s.above)).toEqual([]);
    expect(seen.at(-1)!.arrival).toBe(1);
  });
});
