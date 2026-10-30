import { expect, test, type Page } from "./fixtures";
import { gotoReady } from "./helpers";

type Rect = { x: number; y: number; width: number; height: number };

const deskReady = async (page: Page, url: string) => {
  await gotoReady(page, url);
  await page.waitForSelector("[data-desk-view][data-ready]", { state: "attached", timeout: 30_000 });
};

const overlaps = (a: Rect, b: Rect) =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.5;

const heading = (page: Page, name: string) => page.getByRole("heading", { level: 2, name, exact: true });

// The 3D loads three.js and the model on a dev server that compiles on demand.
test.beforeEach(() => test.setTimeout(60_000));

test.beforeAll(async ({ request }) => {
  // Compile the routes once, so a client navigation isn't waiting on the dev server.
  for (const p of ["/", "/events", "/events/fixture-event-1", "/mixtape", "/people"]) await request.get(p);
});

test("Esc on an event opened directly lands on /events, and a second Esc on the desk (Review Focus 2)", async ({ page }) => {
  await gotoReady(page, "/events/fixture-event-1");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/events$/, { timeout: 10_000 });
  await expect(heading(page, "events")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  await expect(page.locator("html")).toHaveAttribute("data-desk", "desk");
});

test("browser Back after desk → events → people is /events with the events tape in", async ({ page }) => {
  await deskReady(page, "/");
  await page.getByRole("link", { name: "02 events, tape" }).click();
  await expect(heading(page, "events")).toBeFocused({ timeout: 10_000 });
  await page.getByRole("link", { name: /next track/ }).click();
  await expect(page).toHaveURL(/\/mixtape$/, { timeout: 10_000 });
  await page.keyboard.press("4");
  await expect(page).toHaveURL(/\/people$/, { timeout: 10_000 });
  await expect(heading(page, "people")).toBeFocused({ timeout: 10_000 });
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.locator("html")).toHaveAttribute("data-loaded", "events");
});

test("the keys drive the desk: 3 loads mixtape, → from the J-card goes on, Esc ejects", async ({ page }) => {
  await deskReady(page, "/");
  await page.keyboard.press("3");
  await expect(page).toHaveURL(/\/mixtape$/, { timeout: 10_000 });
  await expect(heading(page, "mixtape")).toBeFocused({ timeout: 10_000 });
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/\/people$/, { timeout: 10_000 });
  await expect(heading(page, "people")).toBeFocused({ timeout: 10_000 });
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(/\/mixtape$/, { timeout: 10_000 });
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  await expect(page.getByRole("link", { name: "03 mixtape, tape" })).toBeFocused();
});

test("with the track keys off, a digit does nothing", async ({ page }) => {
  await deskReady(page, "/events");
  await page.getByRole("button", { name: "Track keys" }).click();
  await heading(page, "events").focus();
  await page.keyboard.press("3");
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/events$/);
});

test("Esc while a tape is held puts it back and does nothing else", async ({ page }) => {
  await deskReady(page, "/");
  await page.getByRole("link", { name: "03 mixtape, tape" }).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const putBack = page.getByRole("button", { name: "put it back" });
  await expect(putBack).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(putBack).toBeHidden();
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("data-desk", "desk");
});

test("the transport names the neighbours, ejects, and sits clear of the player, the keys and the J-card", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await deskReady(page, "/events");
  await page.waitForTimeout(500); // the direct load's settle
  const nav = page.getByRole("navigation", { name: "Transport" });
  await expect(nav.getByRole("link", { name: /previous track/ })).toHaveText(/01 about/);
  await expect(nav.getByRole("link", { name: /next track/ })).toHaveText(/03 mixtape/);
  for (const control of await nav.locator("a, button").all()) {
    const r = (await control.boundingBox())!;
    expect(r.width, await control.innerText()).toBeGreaterThanOrEqual(44);
    expect(r.height, await control.innerText()).toBeGreaterThanOrEqual(44);
  }
  const check = async (when: string) => {
    const t = (await nav.boundingBox())!;
    const others = [
      ["the player", page.locator("[data-desk-view]")],
      ["the flap", page.locator('main [data-panel="flap"]')],
      ["the title", page.locator("main > h2")],
      ["the device", page.locator('main [data-panel="device"]')],
      ["the liner", page.locator('main [data-panel="liner"]')],
    ] as const;
    for (const [name, loc] of others) {
      const r = (await loc.boundingBox())!;
      expect(overlaps(t, r), `transport ${JSON.stringify(t)} clear of ${name} ${JSON.stringify(r)} ${when}`).toBe(false);
    }
    for (const key of await page.locator("[data-player-keys] a").all()) {
      const r = (await key.boundingBox())!;
      expect(overlaps(t, r), `transport clear of a key ${JSON.stringify(r)} ${when}`).toBe(false);
    }
  };
  await check("at the top");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  await check("scrolled to the end");

  await nav.getByRole("link", { name: "eject" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  await expect(nav).toHaveCount(0);
});

test("the lamp cord and the transport's night key share one night, remembered", async ({ page }) => {
  await deskReady(page, "/");
  await page.evaluate(() => localStorage.removeItem("side-a:night"));
  await page.reload();
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  const cord = page.getByRole("button", { name: "Night lamp" });
  await expect(cord).toHaveAttribute("aria-pressed", "false");
  const box = (await cord.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await cord.click();
  await expect(cord).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-night", "");

  await page.keyboard.press("2");
  await expect(page).toHaveURL(/\/events$/, { timeout: 10_000 });
  const toggle = page.getByRole("navigation", { name: "Transport" }).getByRole("button", { name: "Night" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(page.locator("html")).not.toHaveAttribute("data-night", "");

  await page.reload();
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  await expect(page.getByRole("navigation", { name: "Transport" }).getByRole("button", { name: "Night" })).toHaveAttribute("aria-pressed", "false");
});

test("the system's dark preference starts a visit in night", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await gotoReady(page, "/");
  await expect(page.getByRole("button", { name: "Night lamp" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-night", "");
  await context.close();
});

test("the wheel over a player key turns the knob instead of scrolling the page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // A track whose J-card runs past the view (the events screen fits in it), so the page could scroll.
  await deskReady(page, "/mixtape");
  await page.waitForTimeout(500);
  const key = (await page.locator("[data-player-keys] a").first().boundingBox())!;
  await page.mouse.move(key.x + key.width / 2, key.y + key.height / 2);
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  // The same wheel over the J-card scrolls it: the page could have scrolled.
  const liner = (await page.locator('main [data-panel="liner"]').boundingBox())!;
  await page.mouse.move(liner.x + liner.width / 2, Math.min(liner.y + 40, 800));
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
});

// In the deck the corner player can show a tape still on the desk at its left edge (the 3D
// draws only inside the corner box). Neither that tape nor its link may sit under the
// transport above the corner.
for (const width of [1280, 1100]) {
  test(`at ${width}×800 the tapes peeking in at the corner player clear the transport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await deskReady(page, "/events");
    await page.waitForTimeout(500); // the direct load's settle
    const t = (await page.getByRole("navigation", { name: "Transport" }).boundingBox())!;
    const view = (await page.locator("[data-desk-view]").boundingBox())!;
    for (const id of ["about", "mixtape", "people", "made", "on-rotation"]) {
      const drawn = await page.evaluate((tape) => {
        const r = (window as unknown as { __deskProject: (id: string) => DOMRect | null }).__deskProject(tape);
        return r && { x: r.x, y: r.y, width: r.width, height: r.height };
      }, id);
      if (drawn) {
        // What of it is drawn: the part inside the corner box.
        const x = Math.max(drawn.x, view.x);
        const y = Math.max(drawn.y, view.y);
        const seen = { x, y, width: Math.min(drawn.x + drawn.width, view.x + view.width) - x, height: Math.min(drawn.y + drawn.height, view.y + view.height) - y };
        if (seen.width > 0 && seen.height > 0) expect(overlaps(t, seen), `${id} ${JSON.stringify(seen)} clear of the transport ${JSON.stringify(t)}`).toBe(false);
      }
      const link = page.locator(`[data-tape="${id}"] a`);
      if (await link.isVisible()) expect(overlaps(t, (await link.boundingBox())!), `${id}'s link clear of the transport`).toBe(false);
    }
  });
}
