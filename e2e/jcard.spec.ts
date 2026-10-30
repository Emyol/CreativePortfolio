import { expect, test, type Page } from "./fixtures";
import { TIMING } from "../lib/desk/timing";
import { gotoReady } from "./helpers";

type Rect = { x: number; y: number; width: number; height: number };

const deskReady = async (page: Page, url: string) => {
  await gotoReady(page, url);
  await page.waitForSelector("[data-desk-view][data-ready]", { state: "attached", timeout: 30_000 });
};

type Times = { press: number; shown: number; focused: number; readable: number; turned: boolean };

/**
 * Times, in the page and every frame, from the next press (pointer or key): when the J-card
 * titled `label` is in the page (`shown`), when its title has focus, and when it is readable;
 * and notes whether any panel turned on its hinge meanwhile. Readable, not only "visible" to
 * Playwright (which counts opacity 0 and a turned-away panel as visible): on screen, fully
 * opaque all the way up, and not turned. Timed in the page, not by the driver: on a machine
 * busy with two browsers' 3D, a round trip to the page can take a few hundred ms.
 */
const watch = (page: Page, label: string) =>
  page.evaluate((label) => {
    const w = window as unknown as { __jcard: Times };
    const t: Times = (w.__jcard = { press: 0, shown: 0, focused: 0, readable: 0, turned: false });
    const press = () => (t.press ||= performance.now());
    document.addEventListener("pointerdown", press, { capture: true, once: true });
    document.addEventListener("keydown", press, { capture: true, once: true });
    const turned = (el: Element) => {
      const tf = getComputedStyle(el).transform;
      return tf !== "none" && Math.abs(new DOMMatrix(tf).m11 - 1) > 0.01;
    };
    const readable = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.bottom < 0 || r.top > innerHeight) return false;
      for (let e: Element | null = el; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (Number(s.opacity) < 0.99 || s.visibility === "hidden" || turned(e)) return false;
      }
      return true;
    };
    const tick = () => {
      if (!t.press) return requestAnimationFrame(tick);
      t.turned ||= [...document.querySelectorAll("main [data-panel]")].some(turned);
      const h = [...document.querySelectorAll("main > h2")].find((e) => e.textContent === label);
      if (h) {
        const now = performance.now();
        t.shown ||= now;
        if (document.activeElement === h) t.focused ||= now;
        if (readable(h)) t.readable ||= now;
      }
      if (!t.focused || !t.readable) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, label);

/** The watched times, in ms after the press (`readable` also after `shown`). */
const times = async (page: Page) => {
  const done = () => page.evaluate(() => (window as unknown as { __jcard: Times }).__jcard);
  await expect.poll(async () => { const t = await done(); return t.focused > 0 && t.readable > 0; }, { timeout: 10_000 }).toBe(true);
  const t = await done();
  return { shown: t.shown - t.press, focused: t.focused - t.press, readable: t.readable - t.press, readableAfterShown: t.readable - t.shown, turned: t.turned };
};

const overlaps = (a: Rect, b: Rect) =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.5;

// The 3D loads three.js and the model on a dev server that compiles on demand.
test.beforeEach(() => test.setTimeout(60_000));

test.beforeAll(async ({ request }) => {
  // Compile the routes once, so a client navigation isn't waiting on the dev server.
  for (const p of ["/", "/events", "/mixtape", "/people"]) await request.get(p);
});

test("a tape loads its J-card: the heading is shown and focused within 2.4 s, readable once it unfolds", async ({ page }) => {
  await deskReady(page, "/");
  await watch(page, "events");
  await page.getByRole("link", { name: "02 events, tape" }).click();
  const load = await times(page);
  expect(load.shown, "shown").toBeLessThanOrEqual(2400);
  expect(load.focused, "focused").toBeLessThanOrEqual(2400);
  // Readable once the tape is seated and loaded and the card has unfolded, counted from when
  // the route is in (before that, the dev server's own response time).
  const unfolded = (TIMING.fly + TIMING.drop + TIMING.load + TIMING.unfold) * 1000;
  expect(load.readableAfterShown, "readable after the route is in").toBeLessThanOrEqual(unfolded);

  // A later switch, from the J-card's own tracklist, reprints in place.
  const flap = page.getByRole("navigation", { name: "Tape", exact: true });
  await expect(flap.getByRole("link", { name: "02 events" })).toHaveAttribute("aria-current", "page");
  await watch(page, "mixtape");
  await flap.getByRole("link", { name: "03 mixtape" }).click();
  const swap = await times(page);
  expect(swap.readable, "readable").toBeLessThanOrEqual(800);
  await expect(page.getByRole("heading", { level: 2, name: "mixtape", exact: true })).toBeFocused();
  await expect(flap.getByRole("link", { name: "03 mixtape" })).toHaveAttribute("aria-current", "page");
});

test("eject folds the J-card away and gives focus back to the tape that was in", async ({ page }) => {
  await deskReady(page, "/");
  await page.getByRole("link", { name: "04 people, tape" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "people", exact: true })).toBeFocused({ timeout: 10_000 });
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "04 people, tape" })).toBeFocused();
  await expect(page.locator("[data-panel]")).toHaveCount(0);
  await expect(page.locator("main")).toHaveCount(1);
});

// Runs only in the "no-webgl" project (playwright.config.ts): the sprite desk, no 3D.
test("without WebGL, eject gives focus back to the tape that was in", { tag: "@sprite" }, async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.locator("[data-sprite-desk]")).toBeVisible();
  await page.getByRole("link", { name: "04 people, tape" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 2, name: "people", exact: true })).toBeFocused({ timeout: 10_000 });
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "04 people, tape" })).toBeFocused();
  await expect(page.locator("[data-panel]")).toHaveCount(0);
  await expect(page.locator("main")).toHaveCount(1);
});

for (const size of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1100, height: 800 },
]) {
  test(`the J-card's panels never overlap the corner player at ${size.width}×${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await deskReady(page, "/events");
    await page.waitForTimeout(500); // the direct load's settle
    const check = async (when: string) => {
      const box = (await page.locator("[data-desk-view]").boundingBox())!;
      const panels = page.locator("main [data-panel]");
      await expect(panels).toHaveCount(3);
      for (const panel of await panels.all()) {
        const name = await panel.getAttribute("data-panel");
        const r = (await panel.boundingBox())!;
        expect(r.height, `${name} has a size`).toBeGreaterThan(0);
        expect(overlaps(r, box), `${name} (${JSON.stringify(r)}) clear of the player (${JSON.stringify(box)}) ${when}`).toBe(false);
      }
    };
    await check("at the top");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    await check("scrolled to the end");
  });
}

test("under reduced motion, switched on mid-visit, a tape's J-card cross-fades in without turning", async ({ page }) => {
  await deskReady(page, "/");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-tier", "none");
  // The 3D switches its motion in place: still ready, nothing to wait for.
  await expect(page.locator("[data-desk-view]")).toHaveAttribute("data-ready", "");
  await page.getByRole("link", { name: "02 events, tape" }).focus();
  await watch(page, "events");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/events$/, { timeout: 10_000 });
  const load = await times(page);
  expect(load.turned, "a panel turned").toBe(false);
  // The route's own fetch, then a 0.2 s fade: no seating wait and no unfold, which alone take
  // TIMING.fly + drop + load + unfold. Counted from when the route is in, as above: on the
  // dev server, with two browsers drawing 3D, the new route's work can stall the main thread
  // for most of a second (traced: in at 0.93 s, readable 0.17 s later when idle; the
  // production build's numbers are in the Task 15 report). No panel turned is the check.
  const seated = (TIMING.fly + TIMING.drop + TIMING.load + TIMING.unfold) * 1000;
  expect(load.readableAfterShown, "readable after the route is in").toBeLessThan(seated);
  expect(load.shown, "shown").toBeLessThanOrEqual(2400);
  expect(load.focused, "focused").toBeLessThanOrEqual(2400);
});
