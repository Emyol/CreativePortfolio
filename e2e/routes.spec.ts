import { expect, test } from "./fixtures";

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

test("an event page is headed by the event's name, its h1, and prints it on the liner", async ({ page }) => {
  const res = await page.goto("/events/fixture-event-1");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture event 1");
  await expect(page.locator('main [data-panel="liner"]').getByRole("heading", { level: 3, name: "Fixture event 1" })).toBeVisible();
});

test("/ has no h2", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h2")).toHaveCount(0);
});

test("/#events ends on /events", async ({ page }) => {
  await page.goto("/#events");
  await expect(page).toHaveURL(/\/events$/);
});

// Folded from v1's navigation.spec: a cold deep link to a track lands on it, its heading focused.
test("/#mixtape ends on /mixtape with the J-card's heading focused", async ({ page }) => {
  await page.goto("/#mixtape");
  await expect(page).toHaveURL(/\/mixtape$/);
  await expect(page.getByRole("heading", { level: 2, name: "mixtape", exact: true })).toBeFocused();
});

// Folded from v1's structure.spec.
for (const path of ["/", "/about"]) {
  test(`no Kakejiku left on ${path}: no Japanese characters, no KanjiVG credit`, async ({ page }) => {
    await page.goto(path);
    expect(await page.locator("body").innerText()).not.toMatch(/[぀-ヿ㐀-鿿]/);
    await expect(page.getByText("KanjiVG")).toHaveCount(0);
  });
}
