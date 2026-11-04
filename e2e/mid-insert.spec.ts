import { expect, test, type Page } from "./fixtures";
import { gotoReady } from "./helpers";

// Review Focus 1: input while a tape is still going in. Back, Esc or eject pressed before
// the first insert has seated the tape, or another tape asked for mid-flight, ends on the
// last requested route with the 3D matching it (data-seated, the 3D's own state, beside the
// route's data-loaded), focus where that route puts it, and the desk still works after.

test.beforeEach(() => test.setTimeout(60_000));
test.beforeAll(async ({ request }) => {
  for (const p of ["/", "/about", "/people"]) await request.get(p);
});

async function deskReady(page: Page) {
  await gotoReady(page, "/");
  await page.waitForSelector("[data-desk-view][data-ready]", { state: "attached", timeout: 30_000 });
}

const view = (page: Page) => page.locator("[data-desk-view]");
const seated = (page: Page) => view(page).evaluate((el) => (el as HTMLElement).dataset.seated ?? "");
// The 3D draws it on the page (out of the slot, with nothing seated, it lies on the desk).
const onScreen = (page: Page, id: string) =>
  page.evaluate((t) => !!(window as unknown as { __deskProject: (id: string) => DOMRect | null }).__deskProject(t), id);

/** Loads the about tape by the keyboard and returns once the route is in, the tape still flying. */
async function startInsert(page: Page) {
  await page.getByRole("link", { name: "01 about, tape" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/about$/, { timeout: 10_000 });
  expect(await seated(page), "still going in").not.toBe("about");
}

const STEPS = {
  "browser Back": (page: Page) => page.goBack(),
  Esc: (page: Page) => page.keyboard.press("Escape"),
  "the transport's eject": (page: Page) => page.getByRole("link", { name: "eject" }).click(),
};

for (const [name, out] of Object.entries(STEPS)) {
  test(`${name} mid-insert ends on the desk with no tape in, focus on the tape, and the tape loads again`, async ({ page }) => {
    await deskReady(page);
    await startInsert(page);
    await out(page);
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
    await expect(page.locator("html")).toHaveAttribute("data-desk", "desk");
    await expect(page.locator("html")).not.toHaveAttribute("data-loaded", /.*/);
    await expect(view(page)).toHaveAttribute("data-state", "desk");
    // Settled: nothing seated, the tape drawn again, focus on it.
    await page.waitForTimeout(1500);
    expect(await seated(page)).toBe("");
    expect(await onScreen(page, "about")).toBe(true);
    await expect(page.getByRole("link", { name: "01 about, tape" })).toBeFocused();
    await expect(page.locator("main[data-jcard]")).toHaveCount(0);

    // And it goes in again, all the way.
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/about$/, { timeout: 10_000 });
    await expect(view(page)).toHaveAttribute("data-seated", "about", { timeout: 5_000 });
    await expect(page.locator("html")).toHaveAttribute("data-loaded", "about");
  });
}

test("another tape mid-insert, then Back: the 3D seats what the route says, its heading focused", async ({ page }) => {
  await deskReady(page);
  await startInsert(page);
  await page.keyboard.press("4");
  await expect(page).toHaveURL(/\/people$/, { timeout: 10_000 });
  await page.goBack();
  await expect(page).toHaveURL(/\/about$/, { timeout: 10_000 });
  await expect(page.locator("html")).toHaveAttribute("data-loaded", "about");
  await expect(view(page)).toHaveAttribute("data-seated", "about", { timeout: 5_000 });
  await page.waitForTimeout(1500);
  // Still the route's tape once everything has settled.
  expect(await seated(page)).toBe("about");
  await expect(page.locator("html")).toHaveAttribute("data-loaded", "about");
  await expect(page.getByRole("heading", { level: 2, name: "about", exact: true })).toBeFocused();
});
