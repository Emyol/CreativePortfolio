import { expect, test } from "./fixtures";
import { gotoReady } from "./helpers";

// v1's checks of the hero's and the dock's printed key labels went with them: the desk's
// printed labels are measured in night.spec.ts (by day and at night) and, without 3D, in
// desk-keyboard.spec.ts.

test("the focus ring sits on a dark halo, so it reads on the light desk and the player", async ({ page }) => {
  await gotoReady(page, "/");
  await page.keyboard.press("Tab"); // skip link
  await page.keyboard.press("Tab"); // track-list skip link
  await page.keyboard.press("Tab"); // the first tape
  await expect(page.locator(":focus")).toHaveAttribute("aria-label", "01 about, tape");
  const ring = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement!);
    return { outline: s.outlineColor, halo: s.boxShadow };
  });
  expect(ring.outline).toBe("rgb(255, 46, 0)");
  expect(ring.halo).toContain("rgb(5, 5, 6)");
});
