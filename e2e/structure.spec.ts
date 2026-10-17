import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

test.use({ reducedMotion: "reduce" }); // judge final states

const TRACKS = [["about", "about"], ["events", "events"], ["mixtape", "mixtape"], ["people", "people"], ["made", "made"], ["on-rotation", "on rotation"]];

test("one h1, one h2 per track in tape order", async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveAccessibleName("Miel");
  const ids = await page.locator("section[data-track]").evaluateAll((s) => s.map((e) => e.id));
  expect(ids).toEqual(TRACKS.map(([id]) => id));
  for (const [id, label] of TRACKS) await expect(page.locator(`section#${id} h2`)).toHaveAccessibleName(label);
});

test("skip links: content first, then the track list", async ({ page }) => {
  await gotoReady(page, "/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Tab");
  const list = page.getByRole("link", { name: "Skip to the track list" });
  await expect(list).toBeFocused();
  await expect(list).toHaveAttribute("href", "/tracklist");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("no Kakejiku left: no Japanese characters, no KanjiVG credit", async ({ page }) => {
  await gotoReady(page, "/");
  expect(await page.locator("body").innerText()).not.toMatch(/[぀-ヿ㐀-鿿]/);
  await expect(page.getByText("KanjiVG")).toHaveCount(0);
});

test("no portrait in the hero", async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.locator("[data-hero] img:not([alt=''])")).toHaveCount(0);
});

test("home has no axe violations at WCAG 2.1 AA", async ({ page }) => {
  await gotoReady(page, "/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});
