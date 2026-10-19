import { expect, test, type Page } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

const reelTransforms = (page: Page) => page.locator("[data-reel]").evaluateAll((els) => els.map((el) => (el as HTMLElement).style.transform));
const packScales = (page: Page) => page.locator("[data-pack]").evaluateAll((els) => els.map((el) => (el as HTMLElement).style.scale));

/** The invariant: nothing on the page is left hidden, half-drawn or moving. */
async function expectSettled(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-tier", "none");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await expect(page.locator("canvas")).toHaveCount(0);
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[style]")].filter((el) => el.style.opacity === "0" || el.style.visibility === "hidden").map((el) => el.outerHTML.slice(0, 120)),
  );
  expect(hidden).toEqual([]);
  const reels = await reelTransforms(page);
  await page.waitForTimeout(300);
  expect(await reelTransforms(page)).toEqual(reels);
  const packs = await packScales(page);
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(300);
  expect(await packScales(page)).toEqual(packs);
}

test("scrolling turns the reels and moves tape from the left pack to the right", async ({ page }) => {
  await gotoReady(page, "/#top");
  const before = { reels: await reelTransforms(page), packs: await packScales(page) };
  await page.mouse.wheel(0, 1600);
  await page.waitForTimeout(200);
  expect(await reelTransforms(page)).not.toEqual(before.reels);
  await headingAtTop(page, "events").catch(() => {});
  await page.waitForTimeout(400);
  const [left, right] = (await packScales(page)).map(Number);
  expect(left).toBeLessThan(Number(before.packs[0]));
  expect(right).toBeGreaterThan(Number(before.packs[1]));
});

test("switching on reduced motion mid-scroll freezes the reels and packs where they are", async ({ page }) => {
  await gotoReady(page, "/#about");
  await page.keyboard.press("2");
  await page.mouse.wheel(0, 600); // reels spinning
  await page.waitForTimeout(120);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expectSettled(page);
});

test("turning it back off restores smooth scroll without a reload", async ({ page }) => {
  await gotoReady(page, "/#mixtape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveClass(/lenis/);
});

test("switching on reduced motion lets a raised spine back down", async ({ page }) => {
  await gotoReady(page, "/#on-rotation");
  await headingAtTop(page, "on-rotation");
  await page.locator("[data-spine]").nth(1).hover();
  const raised = () => page.locator("[data-spine]").evaluateAll((els) => els.some((el) => !new DOMMatrix(getComputedStyle(el).transform).isIdentity));
  await expect.poll(raised).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => page.locator("[data-spine]").evaluateAll((els) => els.every((el) => new DOMMatrix(getComputedStyle(el).transform).isIdentity))).toBe(true);
});

test("switching on reduced motion puts a cued tape back in its row", async ({ page }) => {
  await gotoReady(page, "/#mixtape");
  await headingAtTop(page, "mixtape");
  await page.locator("[data-cue-row]").first().hover();
  const tape = page.locator("[data-cue-row]").first().locator("span[aria-hidden='true']").first();
  await expect.poll(() => tape.evaluate((el) => (el as HTMLElement).style.transform)).toContain("translate");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => tape.evaluate((el) => (el as HTMLElement).style.transform)).toBe("");
});
