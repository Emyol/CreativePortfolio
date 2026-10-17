import { expect, test } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test.describe(`motion: ${reducedMotion}`, () => {
    test.use({ reducedMotion });

    test("a cold deep link lands on the track with focus on its heading", async ({ page }) => {
      await gotoReady(page, "/#mixtape");
      await headingAtTop(page, "mixtape");
      await expect(page.locator("#mixtape-title")).toBeFocused();
    });

    // Track shortcuts return with the dock (Task 6); this runs again from then on.
    test.fixme("back returns to the previous track", async ({ page }) => {
      await gotoReady(page, "/#about");
      await page.keyboard.press("4");
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
  await gotoReady(page, "/tracklist");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
});
