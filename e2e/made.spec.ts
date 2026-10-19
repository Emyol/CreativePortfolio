import { expect, test } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

test.use({ reducedMotion: "no-preference" });

test("things can be thrown around the table and tidied", async ({ page }) => {
  await gotoReady(page, "/#made");
  await headingAtTop(page, "made");
  const thing = page.locator("#made [data-throwable]").nth(1);
  const table = await page.locator("#made [data-table]").boundingBox();
  // Measure once it has come to rest on the table.
  const rest = async () => JSON.stringify(await thing.boundingBox());
  await expect.poll(async () => { const p = await rest(); await page.waitForTimeout(200); return p === (await rest()); }).toBe(true);
  const a = (await thing.boundingBox())!;
  const home = await thing.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY }; });
  await page.mouse.move(a.x + a.width / 2, a.y + 30);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 - 200, a.y + 60, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(1500);
  const b = (await thing.boundingBox())!;
  expect(Math.abs(b.x - a.x)).toBeGreaterThan(150);
  // Stays on the table. Draggable bounds the untilted card, so its tilted corners may poke
  // out by a few px: allow for that.
  expect(b.x).toBeGreaterThanOrEqual(table!.x - 12);
  expect(b.x + b.width).toBeLessThanOrEqual(table!.x + table!.width + 12);
  // Compare on the page, not the screen: reaching the button may scroll.
  const onPage = async () => thing.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY }; });
  await page.getByRole("button", { name: "Tidy up" }).click();
  await page.waitForTimeout(1200);
  const c = await onPage();
  expect(Math.abs(c.x - home.x)).toBeLessThanOrEqual(4);
  expect(Math.abs(c.y - home.y)).toBeLessThanOrEqual(4);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the things lie still and their links work", async ({ page }) => {
    await gotoReady(page, "/#made");
    await expect(page.locator("#made [data-throwable]").first()).not.toHaveAttribute("style", /transform/);
    await expect(page.getByRole("link", { name: /^More about/ }).first()).toBeVisible();
  });
});
