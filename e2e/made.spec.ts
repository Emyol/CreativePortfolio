import { expect, test } from "./fixtures";
import { gotoReady } from "./helpers";

test.use({ reducedMotion: "no-preference" });

const made = (page: import("@playwright/test").Page) => page.locator("main[data-jcard=made]");

test("things can be thrown around the table and tidied", async ({ page }) => {
  await gotoReady(page, "/made");
  const thing = made(page).locator("[data-throwable]").nth(1);
  const table = made(page).locator("[data-table]");
  // Where the thing sits on the table (the panel it is in may scroll).
  const onTable = () =>
    thing.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const t = el.closest("[data-table]")!.getBoundingClientRect();
      return { x: r.x - t.x, y: r.y - t.y };
    });
  // Measure once it has come to rest on the table.
  const rest = async () => JSON.stringify(await thing.boundingBox());
  await expect.poll(async () => { const p = await rest(); await page.waitForTimeout(200); return p === (await rest()); }).toBe(true);
  const a = (await thing.boundingBox())!;
  const t = (await table.boundingBox())!;
  const home = await onTable();
  // Thrown 200 px across the table, toward whichever side has the room (in the J-card the
  // table is a column, not the page's width).
  const room = Math.max(a.x - t.x, t.x + t.width - (a.x + a.width));
  const dx = (a.x - t.x > t.x + t.width - (a.x + a.width) ? -1 : 1) * Math.min(200, room);
  await page.mouse.move(a.x + a.width / 2, a.y + 30);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + dx, a.y + 60, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(1500);
  const b = (await thing.boundingBox())!;
  expect(Math.abs(dx)).toBeGreaterThan(100);
  expect(Math.abs(b.x - a.x)).toBeGreaterThan(Math.abs(dx) * 0.75);
  // Stays on the table. Draggable bounds the untilted card, so its tilted corners may poke
  // out by a few px: allow for that.
  expect(b.x).toBeGreaterThanOrEqual(t.x - 12);
  expect(b.x + b.width).toBeLessThanOrEqual(t.x + t.width + 12);
  await made(page).getByRole("button", { name: "Tidy up" }).click();
  await page.waitForTimeout(1200);
  const c = await onTable();
  expect(Math.abs(c.x - home.x)).toBeLessThanOrEqual(4);
  expect(Math.abs(c.y - home.y)).toBeLessThanOrEqual(4);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the things lie still and their links work", async ({ page }) => {
    await gotoReady(page, "/made");
    await expect(made(page).locator("[data-throwable]").first()).not.toHaveAttribute("style", /transform/);
    await expect(made(page).getByRole("link", { name: /^More about/ }).first()).toBeVisible();
  });
});
