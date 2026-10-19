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

test.describe("the write-in", () => {
  test.use({ reducedMotion: "no-preference" });

  test("after the morph, the page writes in", async ({ page }) => {
    // Every frame, note whether the title and a gallery photo are off their place.
    await page.addInitScript(() => {
      const seen: Record<string, boolean> = {};
      (window as unknown as { __moved: Record<string, boolean> }).__moved = seen;
      const moved = (el: Element | null) => !!el && new DOMMatrix(getComputedStyle(el).transform).isIdentity === false;
      const tick = () => {
        if (moved(document.querySelector("main h1"))) seen.title = true;
        if (moved(document.querySelector("main ul li"))) seen.gallery = true;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await gotoReady(page, "/#events");
    await page.locator("#events").getByRole("link").first().click();
    await expect(page).toHaveURL(/\/events\/fixture-event-6$/, { timeout: 15_000 });
    const transform = (sel: string) => page.locator(sel).first().evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).isIdentity);
    await expect.poll(() => transform("main h1"), { timeout: 5_000 }).toBe(true);
    await expect.poll(() => transform("main ul li"), { timeout: 5_000 }).toBe(true);
    const moved = await page.evaluate(() => (window as unknown as { __moved: Record<string, boolean> }).__moved);
    expect(moved).toEqual({ title: true, gallery: true });
  });

  test("a direct visit shows the page as it is", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __moved: boolean }).__moved = false;
      const tick = () => {
        const h1 = document.querySelector("main h1");
        if (h1 && !new DOMMatrix(getComputedStyle(h1).transform).isIdentity) (window as unknown as { __moved: boolean }).__moved = true;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await gotoReady(page, "/events/fixture-event-3");
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => (window as unknown as { __moved: boolean }).__moved)).toBe(false);
  });

  test("going to an event and back leaves one canvas and working holds", async ({ page }) => {
    await gotoReady(page, "/#events");
    await page.locator("#events").getByRole("link").first().click();
    await expect(page).toHaveURL(/\/events\//, { timeout: 15_000 });
    await page.waitForFunction(() => !document.documentElement.matches(":active-view-transition"));
    await page.goBack();
    await expect(page).toHaveURL(/\/#events$/, { timeout: 15_000 });
    await expect(page.locator("canvas")).toHaveCount(1, { timeout: 15_000 });
    await expect(page.locator("html")).not.toHaveAttribute("data-boot");
    // The holds still work: scrolling on, the mixtape is held in place for a while.
    await page.mouse.move(1380, 450);
    let held = false;
    for (let i = 0; i < 80 && !held; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(50);
      held = await page.locator("#mixtape").evaluate((el) => getComputedStyle(el).position === "fixed");
    }
    expect(held).toBe(true);
  });
});

test.describe("after the arrival", () => {
  test.use({ reducedMotion: "no-preference" });

  test("arrived cards clip nothing, so their focus ring shows", async ({ page }) => {
    await gotoReady(page, "/#events");
    await headingAtTop(page, "events");
    const clips = await page.locator("#events li").evaluateAll((lis) => lis.slice(0, 3).map((li) => getComputedStyle(li).clipPath));
    expect(clips).toEqual(["none", "none", "none"]);
  });

  test("a resize after they've arrived leaves every print shown", async ({ page }) => {
    await gotoReady(page, "/#events");
    await headingAtTop(page, "events");
    await page.setViewportSize({ width: 1300, height: 860 });
    await page.waitForTimeout(800);
    const clips = await page.locator("#events li").evaluateAll((lis) => lis.slice(0, 3).map((li) => getComputedStyle(li).clipPath));
    expect(clips).toEqual(["none", "none", "none"]);
  });
});
