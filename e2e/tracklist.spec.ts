import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

test("the track list shows every track as a heading and links every event", async ({ page }) => {
  await gotoReady(page, "/tracklist");
  await expect(page.locator("h1")).toHaveCount(1);
  for (const label of ["about", "events", "mixtape", "people", "made", "on rotation"])
    await expect(page.getByRole("heading", { level: 2, name: label })).toHaveCount(1);
  for (let i = 1; i <= 7; i++) await expect(page.locator(`a[href="/events/fixture-event-${i}"]`)).toHaveCount(1);
});

test("songs link to Spotify in the plain list", async ({ page }) => {
  await gotoReady(page, "/tracklist");
  await expect(page.getByRole("link", { name: /Fixture song 1/ })).toHaveAttribute("href", /^https:\/\/open\.spotify\.com\/track\//);
});

test("no smooth scrolling and no motion on the track list", async ({ page }) => {
  await gotoReady(page, "/tracklist");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
});

test("the old index address redirects to the track list", async ({ page }) => {
  await page.goto("/mokuroku");
  await expect(page).toHaveURL(/\/tracklist$/);
});

test("track list has no axe violations", async ({ page }) => {
  await gotoReady(page, "/tracklist");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});
