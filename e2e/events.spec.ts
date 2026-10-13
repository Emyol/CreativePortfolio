import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

test("a tile opens its event page, and Back returns to the Events chapter", async ({ page }) => {
  await gotoReady(page, "/#events");
  await page.locator("#events").getByRole("link").first().click();
  await expect(page).toHaveURL(/\/events\/fixture-event-1$/);
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
  await expect(page).toHaveURL(/\/events\/fixture-event-2$/);
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
