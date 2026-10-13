import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

test("rail appears after the hero, marks the current chapter and jumps by key", async ({ page }) => {
  await gotoReady(page, "/#about");
  const rail = page.getByRole("navigation", { name: "Chapter rail" });
  await expect(rail).toBeVisible();
  await expect(rail.getByRole("link", { name: /About/ })).toHaveAttribute("aria-current", "location");

  await page.keyboard.press("3");
  await expect(page.locator("#music-title")).toBeFocused();
  await expect(rail.getByRole("link", { name: /Music/ })).toHaveAttribute("aria-current", "location");
});

test("rail is not in the tab order while the hero is showing", async ({ page }) => {
  await gotoReady(page, "/#top");
  await expect(page.locator("nav[aria-label='Chapter rail']")).toHaveAttribute("inert", "");
});

test("rail links reach the plain index", async ({ page }) => {
  await gotoReady(page, "/#events");
  await expect(page.getByRole("navigation", { name: "Chapter rail" }).getByRole("link", { name: "Index" })).toHaveAttribute("href", "/mokuroku");
});
