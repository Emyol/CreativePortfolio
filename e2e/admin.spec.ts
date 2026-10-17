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

test("the preview is the real tape, marked as unpublished, with its own event pages", async ({ page }) => {
  await gotoReady(page, "/admin/preview");
  await expect(page.getByText("Preview: not published")).toBeVisible();
  await expect(page.locator("[data-hero] [data-device]")).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.locator("#events").getByRole("link").first().click();
  await expect(page).toHaveURL(/\/admin\/preview\/events\/fixture-event-6$/, { timeout: 15_000 });
  await expect(page.getByText("Preview: not published")).toBeVisible();
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
      await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible({ timeout: 5_000 });
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
      await expect(page.getByText("Saved somewhere else since. Reload to get the latest.")).toBeVisible({ timeout: 5_000 });
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
