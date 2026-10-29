import { expect, test, type Page } from "@playwright/test";
import { gotoReady } from "./helpers";

type Rect = { x: number; y: number; width: number; height: number };

const project = (page: Page, id: string) =>
  page.evaluate((t) => {
    const r = (window as unknown as { __deskProject?: (id: string) => DOMRect | null }).__deskProject?.(t);
    return r ? ({ x: r.x, y: r.y, width: r.width, height: r.height } as Rect) : null;
  }, id);

const deskReady = async (page: Page, url: string) => {
  await gotoReady(page, url);
  await page.waitForSelector("[data-desk-view][data-ready]", { state: "attached", timeout: 30_000 });
};

// The 3D loads three.js and the model on a dev server that compiles on demand.
test.beforeEach(() => test.setTimeout(60_000));

test.beforeAll(async ({ request }) => {
  for (const p of ["/", "/about", "/events"]) await request.get(p);
});

test("Tab from the skip links reaches the about tape first, and Enter loads it", async ({ page }) => {
  await deskReady(page, "/");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveText("Skip to content");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveText("Skip to the track list");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("aria-label", "01 about, tape");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/about$/, { timeout: 10_000 });
  // The J-card's title (Task 9); until then the route's own h2.
  await expect(page.getByRole("heading", { level: 2, name: "about", exact: true })).toBeFocused();
});

test("a focused tape link offers inspect, which picks the tape up", async ({ page }) => {
  await deskReady(page, "/");
  await page.getByRole("link", { name: "03 mixtape, tape" }).focus();
  await page.keyboard.press("Tab");
  const inspect = page.getByRole("button", { name: "inspect 03 mixtape" });
  await expect(inspect).toBeFocused();
  const box = await inspect.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "put it back" })).toBeFocused();
});

test("the key links stay on the 3D keys through a resize", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await deskReady(page, "/events");
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.waitForTimeout(600);
  const keys = page.locator("[data-player-keys] [data-key]");
  await expect(keys).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    const want = await project(page, `key${i}`);
    expect(want, `key${i} is on screen`).not.toBeNull();
    const got = (await keys.nth(i).boundingBox())!;
    // The hit box grows to 44 px around a smaller key, so it is compared by its centre and
    // by covering the key; at this size the keys are bigger than that.
    expect(Math.abs(got.x + got.width / 2 - (want!.x + want!.width / 2))).toBeLessThanOrEqual(6);
    expect(Math.abs(got.y + got.height / 2 - (want!.y + want!.height / 2))).toBeLessThanOrEqual(6);
    expect(got.width).toBeGreaterThanOrEqual(Math.max(44, want!.width) - 6);
    expect(got.height).toBeGreaterThanOrEqual(Math.max(44, want!.height) - 6);
  }
});

// Runs only in the "no-webgl" project (playwright.config.ts), where the browser has no WebGL.
test("without WebGL the desk is the sprite player, and its links work", { tag: "@sprite" }, async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.locator("[data-sprite-desk]")).toBeVisible();
  await expect(page.locator("[data-desk-view]")).toHaveCount(0);
  const events = page.getByRole("link", { name: "02 events, tape" });
  await expect(events).toBeVisible();
  await events.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/events$/, { timeout: 10_000 });
  await expect(page.getByRole("heading", { level: 2, name: "events", exact: true })).toBeFocused();
  await expect(page.getByRole("link", { name: "02 events, key" })).toHaveAttribute("aria-current", "page");
});
