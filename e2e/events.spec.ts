import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

// The public events pages as v2 has them: /events is the Events device's screen menu and
// /events/<slug> its live recording, both inside the desk's J-card. The list, Enter, Esc,
// Back, focus, the wheel, the knob's screen lines, contrast and the transport are in
// events-screen.spec.ts. v1's card grid, its dock, the photo morph and write-in, and the
// scroll page's holds and arrivals are gone with the scroll page; their tests went with them.
// The admin preview's event page is still v1 until Task 14 (e2e/admin.spec.ts covers it then).

test.beforeEach(() => test.setTimeout(60_000));

test("an event's page is its live recording, with its story printed beside it", async ({ page }) => {
  const res = await gotoReady(page, "/events/fixture-event-3");
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture event with an extraordinarily long name that should wrap gracefully");
  const rec = page.getByRole("group", { name: "Live recording 06" });
  await expect(rec).toContainText("● LIVE REC 06");
  await expect(rec).toContainText("Fixture summary for event 3.");
  await expect(rec.getByRole("img", { name: "Fixture photo 3" })).toBeVisible();
  const liner = page.locator('main [data-panel="liner"]');
  await expect(liner).toContainText("12 March 2024");
  await expect(liner).toContainText("Fixture place 3");
  await expect(liner.getByText("Fixture story paragraph for event 3.")).toBeVisible();
  await expect(rec.getByRole("link", { name: /back to the list/ })).toHaveAttribute("href", "/events");
});

test("unknown events are a 404 with the device and a way home", async ({ page }) => {
  const res = await page.goto("/events/not-a-real-event");
  expect(res?.status()).toBe(404);
  await expect(page.locator("img[src*='/device/beauty']")).toHaveAttribute("alt", "");
  await expect(page.getByRole("link", { name: "Back to the tape" })).toHaveAttribute("href", "/");
});

test("the social card is the device's beauty shot", async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/device\/beauty\.jpg$/);
});

test("long unbroken names overflow neither the screen nor the liner", async ({ page }) => {
  await gotoReady(page, "/events");
  const listbox = page.getByRole("listbox", { name: "Events" });
  // The cursor on fixture event 5 (one unbroken word), fifth newest.
  await listbox.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown");
  await expect(listbox.getByRole("option").nth(4)).toHaveAttribute("aria-selected", "true");
  const spill = (sel: string) => page.locator(sel).evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(await spill("[data-device-screen]")).toBeLessThanOrEqual(0);
  expect(await spill('main [data-panel="liner"]')).toBeLessThanOrEqual(0);
  await gotoReady(page, "/events/fixture-event-5");
  expect(await spill("[data-device-screen]")).toBeLessThanOrEqual(0);
  expect(await spill('main [data-panel="liner"]')).toBeLessThanOrEqual(0);
});

test("an event links to its own page without JS", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/events");
  await expect(page.locator('a[href="/events/fixture-event-2"]').first()).toBeVisible();
  await context.close();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  for (const url of ["/events", "/events/fixture-event-1"]) {
    test(`${url} has no axe violations`, async ({ page }) => {
      await gotoReady(page, url);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
