import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

test("plain index: one h1, a section per chapter, no motion", async ({ page }) => {
  await gotoReady(page, "/mokuroku");
  await expect(page.locator("h1")).toHaveText(/Index/);
  for (const label of ["About", "Events", "Music", "Hobbies", "Shelf", "People"]) {
    await expect(page.getByRole("heading", { level: 2, name: label })).toBeVisible();
  }
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await expect(page.locator("svg[data-phase], canvas, [data-ink-bleed]")).toHaveCount(0);
});

test("events link to their pages", async ({ page }) => {
  await gotoReady(page, "/mokuroku");
  await expect(page.getByRole("link", { name: "Fixture event 1", exact: true })).toHaveAttribute("href", "/events/fixture-event-1");
});

test("the glossary lists every Japanese term with reading and meaning", async ({ page }) => {
  await gotoReady(page, "/mokuroku");
  const table = page.getByRole("table", { name: "Japanese on this site" });
  await expect(table.getByRole("cell", { name: "目録" })).toBeVisible();
  await expect(table.getByRole("cell", { name: "mokuroku" })).toBeVisible();
});

test("credits KanjiVG", async ({ page }) => {
  await gotoReady(page, "/mokuroku");
  await expect(page.locator("main").getByRole("link", { name: "KanjiVG" })).toHaveAttribute("href", "http://kanjivg.tagaini.net");
});

test("no axe violations", async ({ page }) => {
  await gotoReady(page, "/mokuroku");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});
