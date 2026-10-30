import { expect, test, type Page } from "@playwright/test";
import { gotoReady } from "./helpers";

type Rect = { x: number; y: number; width: number; height: number };

// The fixtures, newest first: 6 (June 2025), 4, 2, 7, 5, 3, 1. The third row is event 2.
const THIRD = { slug: "fixture-event-2", name: "Fixture event 2" };

const deskReady = async (page: Page, url: string) => {
  await gotoReady(page, url);
  await page.waitForSelector("[data-desk-view][data-ready]", { state: "attached", timeout: 30_000 });
};
const listbox = (page: Page) => page.getByRole("listbox", { name: "Events" });
const option = (page: Page, i: number) => listbox(page).getByRole("option").nth(i);
/** What the 3D player's screen shows (Desk3D's `data-screen`). */
const playerScreen = (page: Page) => page.locator("[data-desk-view]").getAttribute("data-screen");

const overlaps = (a: Rect, b: Rect) =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.5;

// The 3D loads three.js and the model on a dev server that compiles on demand.
test.beforeEach(() => test.setTimeout(60_000));

test.beforeAll(async ({ request }) => {
  for (const p of ["/", "/events", `/events/${THIRD.slug}`, "/mixtape"]) await request.get(p);
});

test("Enter on the third row opens its live recording; Esc comes back to the list with it selected", async ({ page }) => {
  await deskReady(page, "/events");
  await expect(listbox(page).getByRole("option")).toHaveCount(7);
  await listbox(page).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(option(page, 2)).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => playerScreen(page)).toBe("02 EVENTS\n> 03 OF 07");

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/events/${THIRD.slug}$`), { timeout: 10_000 });
  const heading = page.getByRole("heading", { level: 1, name: THIRD.name });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.getByRole("group", { name: "Live recording 03" })).toContainText("● LIVE REC 03");
  await expect.poll(() => playerScreen(page)).toBe("02 EVENTS\n● LIVE REC 03");

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/events$/, { timeout: 10_000 });
  await expect(option(page, 2)).toHaveAttribute("aria-selected", "true");
  // Focus went with the event's page; it comes to the list, not to the end of the page.
  await expect(listbox(page)).toBeFocused();
  await expect.poll(() => playerScreen(page)).toBe("02 EVENTS\n> 03 OF 07");
});

test("an event opened directly steps back to its own row", async ({ page }) => {
  await deskReady(page, `/events/${THIRD.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: THIRD.name })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/events$/, { timeout: 10_000 });
  await expect(option(page, 2)).toHaveAttribute("aria-selected", "true");
});

test("a click opens an event, and the wheel over the list moves the cursor without scrolling the page", async ({ page }) => {
  await deskReady(page, "/events");
  const box = (await listbox(page).boundingBox())!;
  await page.mouse.move(box.x + box.width - 4, box.y + 4); // over the list, on the first row
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(200);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  await expect(option(page, 2)).toHaveAttribute("aria-selected", "true");
  await option(page, 1).click();
  await expect(page).toHaveURL(/\/events\/fixture-event-4$/, { timeout: 10_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Fixture event 4" })).toBeFocused();
});

test("the screen's dim hint reads at 4.5:1 or more, at 13 px or larger", async ({ page }) => {
  for (const url of ["/events", `/events/${THIRD.slug}`]) {
    await gotoReady(page, url);
    const hint = page.locator("[data-hint]").first();
    await expect(hint).toBeVisible();
    const { ratio, size } = await hint.evaluate((el) => {
      const rgb = (c: string) => c.match(/[\d.]+/g)!.slice(0, 3).map(Number);
      const lum = (c: number[]) =>
        c
          .map((v) => v / 255)
          .map((s) => (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4))
          .reduce((sum, s, i) => sum + s * [0.2126, 0.7152, 0.0722][i], 0);
      const style = getComputedStyle(el);
      const fg = lum(rgb(style.color));
      const bg = lum([5, 5, 6]); // the screen's glass, #050506
      return { ratio: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05), size: parseFloat(style.fontSize) };
    });
    expect(ratio, url).toBeGreaterThanOrEqual(4.5);
    expect(size, url).toBeGreaterThanOrEqual(13);
  }
});

test("the screen's lines show on a tape loaded from the desk, whatever order the 3D and the section take", async ({ page }) => {
  await deskReady(page, "/");
  // By the keyboard: a click would leave the pointer where the list lands, and hover moves the cursor.
  await page.getByRole("link", { name: "02 events, tape" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/events$/, { timeout: 10_000 });
  await expect(page.getByRole("heading", { level: 2, name: "events", exact: true })).toBeFocused({ timeout: 10_000 });
  // The first insert seats the tape and counts LOADING first, then the section's lines.
  await expect.poll(() => playerScreen(page), { timeout: 10_000 }).toBe("02 EVENTS\n> 01 OF 07");
  // Another tape clears them; Back brings the events tape and its lines again.
  await page.keyboard.press("3");
  await expect(page).toHaveURL(/\/mixtape$/, { timeout: 10_000 });
  await expect.poll(() => playerScreen(page), { timeout: 10_000 }).toBe("03 MIXTAPE\n▶ PLAYING");
  await page.goBack();
  await expect(page).toHaveURL(/\/events$/, { timeout: 10_000 });
  await expect.poll(() => playerScreen(page), { timeout: 10_000 }).toBe("02 EVENTS\n> 01 OF 07");
});

test("Back to an event from another track gives its heading focus", async ({ page }) => {
  await deskReady(page, `/events/${THIRD.slug}`);
  await page.keyboard.press("3");
  await expect(page).toHaveURL(/\/mixtape$/, { timeout: 10_000 });
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/events/${THIRD.slug}$`), { timeout: 10_000 });
  await expect(page.getByRole("heading", { level: 1, name: THIRD.name })).toBeFocused({ timeout: 10_000 });
});

test("on an event, the transport shows and sits clear of every control and text", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await deskReady(page, `/events/${THIRD.slug}`);
  await page.waitForTimeout(500); // the direct load's settle
  const nav = page.getByRole("navigation", { name: "Transport" });
  await expect(nav).toBeVisible();
  const check = async (when: string) => {
    const t = (await nav.boundingBox())!;
    const others = [
      page.locator("[data-desk-view]"),
      page.locator('main [data-panel="flap"]'),
      page.locator("main > h2"),
      page.locator('main [data-panel="device"]'),
      page.locator('main [data-panel="liner"]'),
      ...(await page.locator("[data-player-keys] a").all()),
    ];
    for (const loc of others) {
      const r = (await loc.boundingBox())!;
      expect(overlaps(t, r), `transport ${JSON.stringify(t)} clear of ${JSON.stringify(r)} ${when}`).toBe(false);
    }
  };
  await check("at the top");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  await check("scrolled to the end");
});

// Runs only in the "no-webgl" project (playwright.config.ts), where the browser has no WebGL.
test("without WebGL the sprite player's screen shows the events lines", { tag: "@sprite" }, async ({ page }) => {
  await gotoReady(page, "/events");
  const screen = page.locator("[data-sprite-desk] [data-screen]");
  await expect(screen).toContainText("02 EVENTS");
  await expect(screen).toContainText("> 01 OF 07");
  await listbox(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect(screen).toContainText("> 02 OF 07");
});
