import { expect, test } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

test.use({ reducedMotion: "no-preference" });

test("a note whose name has no link shows without hovering, so keyboards reach it too", async ({ page }) => {
  await gotoReady(page, "/#people");
  await headingAtTop(page, "people");
  await page.mouse.move(5, 5);
  const note = page.locator("#people li", { hasText: "Fixture person A" }).getByText("Fixture note.");
  await expect.poll(() => note.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(10);
});
