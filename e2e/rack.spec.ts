import { expect, test } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

test.use({ reducedMotion: "no-preference" });

test("a spine pulls out and shows its note on focus", async ({ page }) => {
  await gotoReady(page, "/#on-rotation");
  await headingAtTop(page, "on-rotation");
  const spines = page.locator("#on-rotation [data-spine]");
  await expect(spines).toHaveCount(3);
  await spines.nth(1).focus();
  await expect(spines.nth(1)).toHaveAttribute("aria-expanded", "true");
  await expect(spines.nth(0)).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("Fixture single page.")).toBeVisible();
  await expect(page.getByText("Fixture page three.")).toBeHidden();
  // Pulled up out of the rack, about 46 px above its neighbours.
  await expect.poll(async () => {
    const [a, b] = await Promise.all([spines.nth(0).boundingBox(), spines.nth(1).boundingBox()]);
    return Math.round(a!.y - b!.y);
  }).toBeGreaterThan(36);
});

test("every spine is a button named by its title", async ({ page }) => {
  await gotoReady(page, "/#on-rotation");
  for (const name of ["Fixture manga", "Fixture game with a long title", "Fixture anime"]) {
    await expect(page.getByRole("button", { name })).toHaveCount(1);
  }
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("a spine still opens its note, without moving", async ({ page }) => {
    await gotoReady(page, "/#on-rotation");
    await page.getByRole("button", { name: "Fixture anime" }).click();
    await expect(page.getByText("Fixture page two.").last()).toBeVisible();
  });
});
