import { expect, test, type Page } from "@playwright/test";
import { gotoReady } from "./helpers";

// Reduced motion on the desk (spec "Reduced motion (live, switching mid-visit)"): no throws
// or flight, an insert a short cross-fade into the slot, the J-card cross-fading, the dot
// field still, the corner view jumping. Switched mid-visit it takes effect at once, in both
// directions, without a reload and without the 3D starting over.

type Rect = { x: number; y: number; width: number; height: number };

// The 3D loads three.js and the model on a dev server that compiles on demand.
test.beforeEach(() => test.setTimeout(60_000));
test.beforeAll(async ({ request }) => {
  for (const p of ["/", "/about", "/events", "/people"]) await request.get(p);
});

async function deskReady(page: Page, url = "/") {
  await gotoReady(page, url);
  await page.waitForSelector("[data-desk-view][data-ready]", { state: "attached", timeout: 30_000 });
}

/** Where the 3D draws a tape now (window.__deskProject, a dev-only hook). */
const project = (page: Page, id: string) =>
  page.evaluate((t) => {
    const r = (window as unknown as { __deskProject: (id: string) => DOMRect | null }).__deskProject(t);
    return r && ({ x: r.x, y: r.y, width: r.width, height: r.height } as Rect);
  }, id);
async function tapeAt(page: Page, id: string) {
  const r = await project(page, id);
  if (!r) throw new Error(`tape ${id} is not on screen`);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** Counts every time the 3D's view stops being ready (the scene taken down to be built again). */
async function watchReady(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector("[data-desk-view]")!;
    const w = window as unknown as { __unready: number };
    w.__unready = 0;
    new MutationObserver(() => {
      if (!el.hasAttribute("data-ready")) w.__unready++;
    }).observe(el, { attributes: true, attributeFilter: ["data-ready"] });
  });
}
const unready = (page: Page) => page.evaluate(() => (window as unknown as { __unready: number }).__unready);

const dotField = (page: Page) => page.locator("canvas[data-dot-field]").evaluate((c) => (c as HTMLCanvasElement).toDataURL());

/** The 3D view's width every frame for `ms` after `go` runs in the page. */
async function viewWidths(page: Page, ms: number, go: () => Promise<void>) {
  await page.evaluate((ms) => {
    const el = document.querySelector<HTMLElement>("[data-desk-view]")!;
    const w = window as unknown as { __widths: number[] };
    w.__widths = [];
    const t0 = performance.now();
    const tick = () => {
      w.__widths.push(Math.round(el.getBoundingClientRect().width));
      if (performance.now() - t0 < ms) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, ms);
  await go();
  await page.waitForTimeout(ms + 100);
  return page.evaluate(() => (window as unknown as { __widths: number[] }).__widths);
}

async function reduce(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-tier", "none");
}

test("switched on after load, a tape loads readable within half a second and the dot field holds still", async ({ page }) => {
  await deskReady(page);
  await reduce(page);
  await page.getByRole("link", { name: "02 events, tape" }).click();
  await expect(page).toHaveURL(/\/events$/, { timeout: 10_000 });
  const card = page.locator("main[data-jcard]");
  await expect(card.getByRole("heading", { level: 2, name: "events" })).toBeVisible({ timeout: 500 });
  await expect.poll(() => card.evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: 500 }).toBe(1);
  // The tape cross-faded into the slot (0.25 s), no flight.
  await expect(page.locator("[data-desk-view]")).toHaveAttribute("data-seated", "events", { timeout: 500 });
  // The tint is the new tape's at once and the pointer is still: nothing changes.
  const a = await dotField(page);
  await page.waitForTimeout(300);
  expect(await dotField(page)).toBe(a);
});

test("switching on keeps the desk as it is: no rebuild, the tapes where they lay", async ({ page }) => {
  await deskReady(page);
  await watchReady(page);
  const before = await project(page, "made");
  await reduce(page);
  await page.waitForTimeout(400);
  expect(await unready(page), "the 3D was built again").toBe(0);
  const after = await project(page, "made");
  expect(after).not.toBeNull();
  expect(Math.abs(after!.x - before!.x)).toBeLessThan(2);
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(2);
});

test("switched on mid-insert, the tape is in and the view in its corner at once", async ({ page }) => {
  await deskReady(page);
  await page.getByRole("link", { name: "03 mixtape, tape" }).click();
  await expect(page).toHaveURL(/\/mixtape$/, { timeout: 10_000 });
  // The first insert of a visit is flying (about 1.2 s before it seats).
  await expect(page.locator("[data-desk-view]")).not.toHaveAttribute("data-seated", "mixtape");
  await reduce(page);
  await expect(page.locator("[data-desk-view]")).toHaveAttribute("data-seated", "mixtape", { timeout: 300 });
  const corner = Math.round(Math.min(1440 * 0.34, 420));
  expect(await page.locator("[data-desk-view]").evaluate((el) => Math.round(el.getBoundingClientRect().width))).toBe(corner);
});

test("under reduced motion a dragged tape follows the pointer and stops where it is let go", async ({ page }) => {
  await deskReady(page);
  await reduce(page);
  const start = await tapeAt(page, "people");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // A quick flick: with motion this throws the tape on across the desk.
  for (let i = 1; i <= 8; i++) await page.mouse.move(start.x + i * 22, start.y + i * 11);
  await page.mouse.up();
  await page.waitForTimeout(100);
  const released = await tapeAt(page, "people");
  expect(Math.hypot(released.x - start.x, released.y - start.y), "it followed the drag").toBeGreaterThan(100);
  await page.waitForTimeout(800);
  const later = await tapeAt(page, "people");
  expect(Math.hypot(later.x - released.x, later.y - released.y), "it slid on").toBeLessThan(3);
  await expect(page).toHaveURL(/\/$/);
});

test("under reduced motion the view jumps to the corner and back", async ({ page }) => {
  await deskReady(page);
  await reduce(page);
  const corner = Math.round(Math.min(1440 * 0.34, 420));
  const settled = (w: number) => w === 1440 || w === corner;
  const inWidths = await viewWidths(page, 2000, () => page.getByRole("link", { name: "04 people, tape" }).click());
  await expect(page).toHaveURL(/\/people$/, { timeout: 10_000 });
  expect(inWidths.filter((w) => !settled(w)), "in between on the way in").toEqual([]);
  expect(inWidths.at(-1)).toBe(corner);
  const outWidths = await viewWidths(page, 2000, () => page.keyboard.press("Escape"));
  await expect(page).toHaveURL(/\/$/);
  expect(outWidths.filter((w) => !settled(w)), "in between on the way out").toEqual([]);
  expect(outWidths.at(-1)).toBe(1440);
});

test("under reduced motion an insert leaves nothing inline on the J-card", async ({ page }) => {
  await deskReady(page);
  await reduce(page);
  await page.getByRole("link", { name: "01 about, tape" }).click();
  await expect(page).toHaveURL(/\/about$/, { timeout: 10_000 });
  await page.waitForTimeout(500);
  const inline = await page
    .locator("main[data-jcard], main[data-jcard] [data-panel], main[data-jcard] > h2")
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).style).filter((s) => s.transform || s.opacity).map((s) => s.cssText));
  expect(inline).toEqual([]);
  await expect(page.locator("[data-desk-view]")).toHaveAttribute("data-seated", "about");
});

test("switched back off mid-visit, the desk moves again without a reload", async ({ page }) => {
  await deskReady(page);
  await watchReady(page);
  await reduce(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveAttribute("data-tier", "full");
  const widths = await viewWidths(page, 2600, () => page.getByRole("link", { name: "02 events, tape" }).click());
  await expect(page).toHaveURL(/\/events$/, { timeout: 10_000 });
  const corner = Math.round(Math.min(1440 * 0.34, 420));
  expect(widths.some((w) => w > corner + 5 && w < 1440 - 5), "the view eased into the corner").toBe(true);
  // Playing, the dot field breathes again.
  const a = await dotField(page);
  await page.waitForTimeout(300);
  expect(await dotField(page)).not.toBe(a);
  expect(await unready(page), "the 3D was built again").toBe(0);
});

test.describe("loaded under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("a direct load animates nothing, before hydration too", async ({ page }) => {
    // Before React is live, html[data-tier] is not set yet: only the media query holds.
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const w = window as unknown as { __early: string[] };
        w.__early = document.getAnimations().map((a) => (a as CSSAnimation).animationName ?? "animation");
      });
    });
    await deskReady(page, "/events");
    expect(await page.evaluate(() => (window as unknown as { __early: string[] }).__early)).toEqual([]);
    await expect(page.locator("[data-desk-view]")).toHaveAttribute("data-seated", "events");
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
    expect(running).toBe(0);
    const a = await dotField(page);
    await page.waitForTimeout(300);
    expect(await dotField(page)).toBe(a);
  });
});

test("without 3D, switched on after load, the J-card cross-fades and the dot field holds still @sprite", async ({ page }) => {
  await gotoReady(page, "/");
  await reduce(page);
  await page.getByRole("link", { name: "02 events, tape" }).click();
  await expect(page).toHaveURL(/\/events$/, { timeout: 10_000 });
  const card = page.locator("main[data-jcard]");
  await expect.poll(() => card.evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: 500 }).toBe(1);
  const a = await dotField(page);
  await page.waitForTimeout(300);
  expect(await dotField(page)).toBe(a);
});
