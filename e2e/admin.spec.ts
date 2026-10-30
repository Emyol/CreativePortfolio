import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

test("the admin opens (fixtures make it ready) and stays out of search engines", async ({ page }) => {
  const res = await gotoReady(page, "/admin");
  expect(res?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("heading", { level: 1, name: "Edit the tape" })).toBeVisible();
  await expect(page.locator("[data-device], [data-dock]")).toHaveCount(0);
});

test("no smooth scrolling in the admin", async ({ page }) => {
  await gotoReady(page, "/admin");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
});

test.describe("the preview", () => {
  // The desk loads three.js and the model on a dev server that compiles on demand.
  test.beforeEach(() => test.setTimeout(60_000));

  const label = (page: Page) => page.getByText("Preview: not published");
  // Every link in the preview stays in it, or leaves for the editor or another site. The
  // root layout's skip link to the public track list is the one exception (Task 15).
  const strays = (page: Page) =>
    page.locator("a[href]:not(.skip-link)").evaluateAll((links) =>
      links.map((a) => a.getAttribute("href") ?? "").filter((h) => h.startsWith("/") && h !== "/admin" && h !== "/admin/preview" && !h.startsWith("/admin/preview/")),
    );

  test("is the desk with the draft, marked as unpublished, and every move stays in it", async ({ page }) => {
    await gotoReady(page, "/admin/preview");
    await expect(label(page)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator("html")).toHaveAttribute("data-desk", "desk");
    await expect(page.locator("main")).toHaveCount(1);
    expect(await strays(page)).toEqual([]);

    // Loading the events tape: the J-card, with the draft's newest event on its liner.
    await page.getByRole("link", { name: "02 events, tape" }).click();
    await expect(page).toHaveURL(/\/admin\/preview\/events$/, { timeout: 15_000 });
    const card = page.locator("main[data-jcard=events]");
    await expect(card.getByRole("heading", { level: 2, name: "events" })).toBeFocused();
    await expect(card.getByRole("heading", { level: 3, name: "Fixture event 6" })).toBeVisible();
    await expect(label(page)).toBeVisible();
    // Pinned over the card's left column, the label leaves the tracklist on the flap clear
    // (once the card has unfolded: on its hinge, the flap's box swings).
    const clear = async () => {
      const [over, flap] = await Promise.all([page.locator("p:has(> a[href='/admin'])").boundingBox(), card.locator("[data-panel=flap]").boundingBox()]);
      return !!over && !!flap && over.y + over.height <= flap.y && over.x + over.width <= flap.x + flap.width + 0.5;
    };
    await expect.poll(clear, { timeout: 10_000 }).toBe(true);
    await expect(page.locator("main")).toHaveCount(1);
    expect(await strays(page)).toEqual([]);

    // Its live recording, then one step back at a time with Esc: the list, then the desk.
    await card.getByRole("link", { name: /open the live recording/ }).click();
    await expect(page).toHaveURL(/\/admin\/preview\/events\/fixture-event-6$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Fixture event 6" })).toBeVisible();
    await expect(label(page)).toBeVisible();
    await expect(page.locator("main")).toHaveCount(1);
    expect(await strays(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/admin\/preview\/events$/, { timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/admin\/preview$/, { timeout: 15_000 });
    await expect(page.locator("html")).toHaveAttribute("data-desk", "desk");
  });

  test("opens a track directly, and 404s for one that isn't on the tape", async ({ page }) => {
    const res = await gotoReady(page, "/admin/preview/people");
    expect(res?.status()).toBe(200);
    await expect(page.locator("main[data-jcard=people]").getByRole("heading", { level: 2, name: "people" })).toBeVisible();
    await expect(label(page)).toBeVisible();
    expect((await page.goto("/admin/preview/side-b"))?.status()).toBe(404);
    expect((await page.goto("/admin/preview/events/no-such-event"))?.status()).toBe(404);
  });

  test("doesn't use up the public site's first-visit hint", async ({ page }) => {
    await gotoReady(page, "/admin/preview");
    await page.getByRole("link", { name: "01 about, tape" }).click();
    await expect(page).toHaveURL(/\/admin\/preview\/about$/, { timeout: 15_000 });
    await expect(page.locator("main[data-jcard=about]")).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("side-a:hint"))).toBeNull();
    await gotoReady(page, "/");
    await expect(page.getByText("drag to throw · double-click to read the back · pull the cord", { exact: true })).toBeVisible();
  });
});

import AxeBuilder from "@axe-core/playwright";
import { devices, type Page } from "@playwright/test";

// A 4 x 3 px PNG, small enough to inline; the browser decodes, shrinks and re-encodes it.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEElEQVQImWM40+ECRww4OQB7hhMhQLrF8gAAAABJRU5ErkJggg==", "base64");

async function stubBackend(page: Page, { conflict = false } = {}) {
  let revision = 1;
  let n = 0;
  await page.route("**/api/admin/content", (route) =>
    conflict ? route.fulfill({ status: 409, json: { error: "Saved somewhere else since. Reload to get the latest." } }) : route.fulfill({ json: { revision: ++revision } }),
  );
  await page.route("**/api/admin/upload", (route) => route.fulfill({ json: { url: `/api/media/0b0e5c3c-1f2a-4b3c-9d8e-${String(++n).padStart(12, "0")}.webp` } }));
  await page.route("**/api/media/**", (route) => route.fulfill({ contentType: "image/png", body: PNG }));
  await page.route("**/api/admin/publish", (route) => route.fulfill({ json: { published: true } }));
  await page.route("**/api/admin/spotify**", (route) => route.fulfill({ json: {} }));
}

const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];

for (const [name, use] of [["desktop", {}], ["phone", iphone]] as const) {
  test.describe(`editing on ${name}`, () => {
    test.use(use);

    test("add an event with two photos, see it saved, publish it", async ({ page }) => {
      await stubBackend(page);
      await gotoReady(page, "/admin");
      const events = page.getByRole("region", { name: "events" });
      await events.getByRole("button", { name: "Add an event" }).click();
      const first = events.locator("li").first();
      await first.getByLabel("Name").fill("Fixture gig");
      await expect(first.getByLabel("Address")).toHaveValue("fixture-gig");
      await first.getByLabel("Date", { exact: true }).fill("2026-10");
      await first.getByLabel("Summary").fill("Fixture summary.");
      await first.getByLabel("Add photos").setInputFiles([
        { name: "a.png", mimeType: "image/png", buffer: PNG },
        { name: "b.png", mimeType: "image/png", buffer: PNG },
      ]);
      await expect(first.getByLabel("Describe this photo")).toHaveCount(2);
      await expect(first.getByText("Cover", { exact: true })).toBeVisible();
      await first.getByLabel("Describe this photo").nth(0).fill("Fixture stage");
      await first.getByLabel("Describe this photo").nth(1).fill("Fixture crowd");
      // Routine saves are shown, not announced, so this is the visible status line.
      await expect(page.getByRole("region", { name: "Save and publish" }).getByText("Saved", { exact: true })).toBeVisible({ timeout: 5_000 });
      await page.getByRole("button", { name: "Publish", exact: true }).click();
      await page.getByRole("button", { name: "Publish to the tape" }).click();
      await expect(page.getByText("Published")).toBeVisible();
    });

    test("a save from a stale device says so and offers a reload", async ({ page }) => {
      await stubBackend(page, { conflict: true });
      await gotoReady(page, "/admin");
      const links = page.getByRole("region", { name: "links" });
      await links.locator("summary").first().click();
      await links.getByLabel("Label").first().fill("Fixture link");
      // Shown on the bar and announced as an alert.
      await expect(page.getByRole("region", { name: "Save and publish" }).getByRole("alert")).toHaveText("Saved somewhere else since. Reload to get the latest.", { timeout: 5_000 });
      await expect(page.locator("[data-status=conflict]")).toBeVisible();
      await expect(page.getByRole("button", { name: "Reload" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeDisabled();
    });
  });
}

test.describe("on a phone", () => {
  test.use(iphone);

  test("no sideways scroll, every control big enough to tap, no serious accessibility problems", async ({ page }) => {
    await gotoReady(page, "/admin");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    const small = await page.locator("main button:visible, main a:visible, main input:not([type=file]):not([type=checkbox]):visible, main select:visible, [aria-label='Save and publish'] button:visible, [aria-label='Save and publish'] a:visible").evaluateAll((els) =>
      els.filter((e) => e.getBoundingClientRect().height < 44).map((e) => e.outerHTML.slice(0, 80)),
    );
    expect(small).toEqual([]);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
  });
});

test("the candid's dots can be adjusted, seen at once, saved, and reset", async ({ page }) => {
  await stubBackend(page);
  const saved: unknown[] = [];
  page.on("request", (r) => r.url().endsWith("/api/admin/content") && r.method() !== "GET" && saved.push(r.postDataJSON()));
  await gotoReady(page, "/admin");
  const about = page.getByRole("region", { name: "about" });
  const dots = about.getByRole("group", { name: "Dot screen" });
  const preview = dots.getByRole("img", { name: "Fixture photo 0" });
  await expect(preview).toHaveAttribute("data-across", "40");
  await dots.getByLabel("Dots across").fill("24");
  await dots.getByLabel("Brightness").fill("0.2");
  await dots.getByLabel("Contrast").fill("1.5");
  await expect(preview).toHaveAttribute("data-across", "24");
  await expect(dots.getByText("+20%")).toBeVisible();
  await expect(page.getByRole("region", { name: "Save and publish" }).getByText("Saved", { exact: true })).toBeVisible({ timeout: 5_000 });
  const last = JSON.stringify(saved.at(-1));
  expect(last).toContain('"dots":{"across":24,"brightness":0.2,"contrast":1.5}');
  await dots.getByRole("button", { name: "Reset" }).click();
  await expect(preview).toHaveAttribute("data-across", "40");
  await expect(dots.getByLabel("Dots across")).toHaveValue("40");
});
