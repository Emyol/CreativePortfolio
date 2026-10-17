import { expect, test } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test.describe(`motion: ${reducedMotion}`, () => {
    test.use({ reducedMotion });

    test("a cold deep link lands on the chapter with focus on its heading", async ({ page }) => {
      await gotoReady(page, "/#music");
      await headingAtTop(page, "music");
      await expect(page.locator("#music-title")).toBeFocused();
    });

    test("menu links scroll, focus and update the URL", async ({ page }) => {
      await gotoReady(page, "/#top");
      await page.locator("[data-hero-menu]").getByRole("link", { name: "Hobbies" }).click();
      await headingAtTop(page, "hobbies");
      await expect(page.locator("#hobbies-title")).toBeFocused();
      await expect(page).toHaveURL(/#hobbies$/);
    });

    test("back returns to the previous chapter", async ({ page }) => {
      await gotoReady(page, "/#about");
      await page.keyboard.press("6");
      await headingAtTop(page, "people");
      await page.goBack();
      await headingAtTop(page, "about");
    });
  });
}

test("Lenis runs at full motion and is removed live on reduced motion", async ({ page }) => {
  await gotoReady(page, "/#top");
  await expect(page.locator("html")).toHaveClass(/lenis/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await page.keyboard.press("End"); // native scrolling works again
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
});

test("no smooth scrolling on the plain index", async ({ page }) => {
  await gotoReady(page, "/mokuroku");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
});
