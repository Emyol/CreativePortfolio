import { expect, test } from "@playwright/test";

const ROUTES = [
  ["about", "about"],
  ["events", "events"],
  ["mixtape", "mixtape"],
  ["people", "people"],
  ["made", "made"],
  ["on-rotation", "on rotation"],
] as const;

for (const [path, label] of ROUTES) {
  test(`/${path} responds and has its h2`, async ({ page }) => {
    const res = await page.goto(`/${path}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: label, exact: true })).toBeVisible();
  });
}

test("an event page shows the event name", async ({ page }) => {
  const res = await page.goto("/events/fixture-event-1");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("/ has no h2", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h2")).toHaveCount(0);
});

test("/#events ends on /events", async ({ page }) => {
  await page.goto("/#events");
  await expect(page).toHaveURL(/\/events$/);
});
