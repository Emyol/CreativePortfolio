import { expect, test } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

const dockScreen = (page: import("@playwright/test").Page) => page.locator("[data-dock] [data-screen]");

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test.describe(`motion: ${reducedMotion}`, () => {
    test.use({ reducedMotion });

    test("the tape turns over between people and made, and the dock follows to side B", async ({ page }) => {
      await gotoReady(page, "/#people");
      await headingAtTop(page, "people");
      await expect(dockScreen(page)).toContainText("SIDE A");
      const order = await page.locator("#people, #flip, #made").evaluateAll((els) => els.map((e) => e.id));
      expect(order).toEqual(["people", "flip", "made"]);
      await page.locator("#flip").scrollIntoViewIfNeeded();
      await page.locator("#made").evaluate((el) => el.scrollIntoView({ block: "start" }));
      await expect(dockScreen(page)).toContainText("SIDE B");
      const keys = page.locator("[data-dock]").getByRole("navigation", { name: "Tape" }).getByRole("link");
      await expect(keys).toHaveText(["made", "on rotation"]);
    });
  });
}

test("full motion scrubs the frames on a canvas as the flip scrolls by", async ({ page }) => {
  await gotoReady(page, "/#people");
  await headingAtTop(page, "people");
  await page.locator("#flip").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY + el.clientHeight * 0.3));
  await expect(page.locator("#flip canvas[data-ready]")).toHaveCount(1);
});
