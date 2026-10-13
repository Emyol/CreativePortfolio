import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" }); // judge final states

const CHAPTERS = [["about", "About"], ["events", "Events"], ["music", "Music"], ["hobbies", "Hobbies"], ["shelf", "Shelf"], ["people", "People"]];

test("one h1, one h2 per chapter, each heading owns its section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveAccessibleName("Miel");
  for (const [id, label] of CHAPTERS) await expect(page.locator(`section#${id} h2`)).toHaveAccessibleName(label);
  await expect(page.locator("h2")).toHaveCount(6);
});

test("first Tab reaches the skip link, which moves focus to main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("a second skip link goes to the plain index", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to the plain index" })).toBeFocused();
});

test("footer credits KanjiVG and ends on 終", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "KanjiVG" })).toHaveAttribute("href", "http://kanjivg.tagaini.net");
  await expect(page.getByRole("img", { name: "The end" })).toBeVisible();
});

test("no portrait in the hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-hero] img")).toHaveCount(0);
});

test("home has no axe violations at WCAG 2.1 AA", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});
