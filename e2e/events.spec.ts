import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

test("a tile opens its event page, and Back returns to the Events chapter", async ({ page }) => {
  await gotoReady(page, "/#events");
  await page.locator("#events").getByRole("link").first().click();
  await expect(page).toHaveURL(/\/events\/fixture-event-1$/, { timeout: 15_000 });
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText("Fixture event 1");
  // Clicks during a view transition hit the snapshot overlay; wait for the morph to finish.
  await page.waitForFunction(() => !document.documentElement.matches(":active-view-transition"));

  await page.getByRole("link", { name: "Back to Events" }).click();
  // A soft navigation commits the URL once the home page's payload arrives; the dev server
  // can take longer than the default 5s under parallel workers.
  await expect(page).toHaveURL(/\/#events$/, { timeout: 15_000 });
  await expect(page.locator("#events-title")).toBeFocused();
  await headingAtTop(page, "events");
});

test("tiles work from the keyboard", async ({ page }) => {
  await gotoReady(page, "/#events");
  await page.locator("#events").getByRole("link").nth(1).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/events\/fixture-event-2$/, { timeout: 15_000 });
});

test("the event page shows the story and the rest of the photos", async ({ page }) => {
  await gotoReady(page, "/events/fixture-event-3");
  await expect(page.getByText("Fixture story paragraph for event 3.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Fixture photo 13" })).toBeVisible();
});

test("unknown events are a 404", async ({ page }) => {
  const res = await page.goto("/events/not-a-real-event");
  expect(res?.status()).toBe(404);
});

test("long unbroken names don't overflow their tile", async ({ page }) => {
  await gotoReady(page, "/#events");
  const overflow = await page.locator("#events li").nth(4).evaluate((li) => li.scrollWidth - li.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("event page has no axe violations", async ({ page }) => {
    await gotoReady(page, "/events/fixture-event-1");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
});

test("the cover is the morph's landing spot: no second ink-bleed entrance, loaded eagerly", async ({ page }) => {
  await gotoReady(page, "/events/fixture-event-1");
  await expect(page.locator("main header [data-ink-bleed]")).toHaveCount(0);
  await expect(page.locator("main header img")).toHaveAttribute("loading", "eager");
});

test("tiles already on screen don't bleed in again after Back to Events", async ({ page }) => {
  await gotoReady(page, "/events/fixture-event-1");
  await page.getByRole("link", { name: "Back to Events" }).click();
  await expect(page).toHaveURL(/\/#events$/, { timeout: 15_000 });
  await page.waitForTimeout(300);
  const restarted = await page.locator("#events [data-ink-bleed]").evaluateAll((els) =>
    els.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top < innerHeight && r.bottom > 0 && (el as HTMLElement).style.getPropertyValue("--r") === "0%";
    }).length,
  );
  expect(restarted).toBe(0);
});

test("browser Back from an event page returns to where you were, not to an old #hash", async ({ page }) => {
  await gotoReady(page, "/#about");
  const tile = page.locator("#events li").nth(4);
  await tile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => Math.round(scrollY));
  await tile.getByRole("link").click();
  await expect(page).toHaveURL(/\/events\/fixture-event-5$/, { timeout: 15_000 });
  await page.waitForFunction(() => !document.documentElement.matches(":active-view-transition"));
  await page.goBack();
  await expect.poll(() => page.evaluate(() => Math.round(scrollY)), { timeout: 15_000 }).toBeGreaterThan(before - 150);
  expect(await page.evaluate(() => Math.round(scrollY))).toBeLessThan(before + 150);
});
