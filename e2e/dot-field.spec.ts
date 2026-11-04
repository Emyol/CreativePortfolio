import { expect, test, type Page } from "./fixtures";
import { gotoReady } from "./helpers";

// The dot field's frame cost (lib/desk/dotField planDots). With a tape in, the wave moves
// every dot every frame, but the J-card's paper hides most of them: those are left out, and
// the rest are drawn in a few batched fills. With nothing moving, no frame is drawn at all.
// window.__dotField (development only) holds the last frame's counts.

type Stats = { dots: number; drawn: number; fills: number };
const stats = (page: Page) => page.evaluate(() => (window as unknown as { __dotField?: Stats }).__dotField ?? null);

/** Whether the field draws a frame within `ms` (its stats object is replaced each frame). */
const drawsWithin = (page: Page, ms: number) =>
  page.evaluate(async (wait) => {
    const w = window as unknown as { __dotField?: unknown };
    const before = w.__dotField;
    await new Promise((r) => setTimeout(r, wait));
    return w.__dotField !== before;
  }, ms);

async function deskReady(page: Page, url: string) {
  await gotoReady(page, url);
  await page.waitForSelector("[data-desk-view][data-ready]", { state: "attached", timeout: 30_000 });
}

test.beforeEach(() => test.setTimeout(60_000));

test("with a tape in, a frame draws well under the field's dots, in a few fills", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await deskReady(page, "/events");
  await page.mouse.move(900, 400);
  await page.waitForTimeout(800); // the direct load's settle, then the wave
  expect(await drawsWithin(page, 200), "the wave keeps drawing").toBe(true);
  const s = (await stats(page))!;
  expect(s.dots).toBeGreaterThan(6000);
  expect(s.drawn, JSON.stringify(s)).toBeLessThan(s.dots * 0.5);
  expect(s.fills).toBeLessThanOrEqual(33);
});

test("on the desk with nothing moving, the field draws no frames", async ({ page }) => {
  await deskReady(page, "/");
  await page.waitForTimeout(1500); // the tint and any ripple settle
  expect(await stats(page)).not.toBeNull();
  expect(await drawsWithin(page, 600)).toBe(false);
  // The pointer wakes it, and it stops again.
  await page.mouse.move(400, 300);
  await expect.poll(() => drawsWithin(page, 200)).toBe(false);
});

test("under reduced motion with a tape in, the field draws no frames until something changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await deskReady(page, "/events");
  await page.waitForTimeout(800);
  expect(await drawsWithin(page, 600)).toBe(false);
  const moved = page.evaluate(async () => {
    const w = window as unknown as { __dotField?: unknown };
    const before = w.__dotField;
    await new Promise((r) => setTimeout(r, 300));
    return w.__dotField !== before;
  });
  await page.mouse.move(700, 300);
  expect(await moved).toBe(true);
});
