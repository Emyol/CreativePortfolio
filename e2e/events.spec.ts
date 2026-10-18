import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

// Cards run newest first: fixture event 6 (June 2025) leads.
test("a card opens its live-recording page, and Back to events returns to the track", async ({ page }) => {
  await gotoReady(page, "/#events");
  await page.locator("#events").getByRole("link").first().click();
  await expect(page).toHaveURL(/\/events\/fixture-event-6$/, { timeout: 15_000 });
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText("Fixture event 6");
  await page.waitForFunction(() => !document.documentElement.matches(":active-view-transition"));
  await page.getByRole("link", { name: "Back to events" }).click();
  await expect(page).toHaveURL(/\/#events$/, { timeout: 15_000 });
  await expect(page.locator("#events-title")).toBeFocused();
  await headingAtTop(page, "events");
});

test("cards work from the keyboard", async ({ page }) => {
  await gotoReady(page, "/#events");
  await page.locator("#events").getByRole("link").nth(1).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/events\/fixture-event-4$/, { timeout: 15_000 });
});

test("the dock reads LIVE with the place and date, and its keys go back to the tape", async ({ page }) => {
  await gotoReady(page, "/events/fixture-event-3");
  const dock = page.locator("[data-dock]");
  await expect(dock).not.toHaveAttribute("inert");
  await expect(dock.locator("[data-screen]")).toContainText("LIVE");
  await expect(dock.locator("[data-screen]")).toContainText("12 March 2024");
  await expect(dock.getByRole("link", { name: "people" })).toHaveAttribute("href", "/#people");
});

test("dock keys on an event page go back to the tape without reloading the page", async ({ page }) => {
  await gotoReady(page, "/events/fixture-event-3");
  await page.evaluate(() => ((window as unknown as { __kept: boolean }).__kept = true));
  await page.locator("[data-dock]").getByRole("link", { name: "people" }).click();
  await expect(page).toHaveURL(/\/#people$/, { timeout: 15_000 });
  await headingAtTop(page, "people");
  expect(await page.evaluate(() => (window as unknown as { __kept?: boolean }).__kept)).toBe(true);
});

test("the event page shows the story and the rest of the photos", async ({ page }) => {
  await gotoReady(page, "/events/fixture-event-3");
  await expect(page.getByText("Fixture story paragraph for event 3.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Fixture photo 13" })).toBeVisible();
  await expect(page.locator("main img").first()).toHaveAttribute("loading", "eager");
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

test("long unbroken names don't overflow their card", async ({ page }) => {
  await gotoReady(page, "/#events");
  const overflow = await page.locator("#events li").evaluateAll((lis) => Math.max(...lis.map((li) => li.scrollWidth - li.clientWidth)));
  expect(overflow).toBeLessThanOrEqual(0);
});

test("browser Back from an event page returns to where you were", async ({ page }) => {
  // From the settled track: mid-hold, a print the REC playhead hasn't reached is clipped away.
  await gotoReady(page, "/#events");
  const card = page.locator("#events li").nth(4);
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => Math.round(scrollY));
  await card.getByRole("link").click();
  await expect(page).toHaveURL(/\/events\//, { timeout: 15_000 });
  await page.waitForFunction(() => !document.documentElement.matches(":active-view-transition"));
  await page.goBack();
  await expect.poll(() => page.evaluate(() => Math.round(scrollY)), { timeout: 15_000 }).toBeGreaterThan(before - 150);
  expect(await page.evaluate(() => Math.round(scrollY))).toBeLessThan(before + 150);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("event page has no axe violations", async ({ page }) => {
    await gotoReady(page, "/events/fixture-event-1");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
});
