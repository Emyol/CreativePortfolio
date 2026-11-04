import { devices, expect, test, type Page } from "./fixtures";
import { gotoReady } from "./helpers";

// A phone, 390 × 844. Until phones get their own layout (the J-card as a sheet with detents),
// the deck stacks: the player on top, the transport under it, the J-card below, scrolling on
// its own. Nothing fixed may cover a link or a button, and every one of them can be reached.
const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];
test.use({ ...iphone, reducedMotion: "no-preference" });

test.beforeEach(() => test.setTimeout(60_000));

test.beforeAll(async ({ request }) => {
  for (const p of ["/", "/events", "/events/fixture-event-1", "/mixtape", "/people"]) await request.get(p);
});

/** Loads `url` and waits for the player (3D, or the sprite drawing) and the J-card's settle. */
async function ready(page: Page, url: string) {
  await gotoReady(page, url);
  await page.waitForSelector("[data-desk-view][data-ready], [data-sprite-desk]", { state: "attached", timeout: 30_000 });
  await page.waitForTimeout(600);
}

type Box = { x: number; y: number; width: number; height: number };
const box = async (page: Page, selector: string): Promise<Box> => (await page.locator(selector).first().boundingBox())!;

/**
 * Every fixed thing on screen whose box crosses a link's or a button's (not its own). The
 * player's own links (the tapes and keys laid over it, its held tape's bar) sit on it and
 * on each other by design. Decorative layers (aria-hidden, or empty and click-through) are
 * not things that cover.
 */
const fixedOverControls = (page: Page) =>
  page.evaluate(() => {
    const shown = (el: Element) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0 && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    };
    const name = (el: Element) => el.getAttribute("aria-label") || (el.textContent ?? "").trim().slice(0, 30) || el.tagName;
    const ownText = (el: Element) => [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
    const player = "[data-desk-view][data-state=deck], [data-sprite-desk] > div[data-state=deck]";
    const onPlayer = "[data-tape-links] *, [data-player-keys] *, [data-holding] *";
    const fixed = [...document.querySelectorAll("body *")].filter((el) => {
      if (el.matches(player)) return shown(el);
      const s = getComputedStyle(el);
      if (s.position !== "fixed" || el.closest("[aria-hidden='true']") || el.classList.contains("skip-link")) return false;
      if (s.pointerEvents === "none" && !ownText(el)) return false;
      return shown(el);
    });
    const controls = [...document.querySelectorAll("a[href], button")].filter((el) => shown(el) && !el.classList.contains("skip-link") && !el.closest("[inert]"));
    const out: string[] = [];
    for (const f of fixed) {
      const a = f.getBoundingClientRect();
      for (const c of controls) {
        if (f.contains(c) || c.contains(f)) continue;
        if ((f.matches(player) || f.matches(onPlayer)) && c.matches(onPlayer)) continue;
        const b = c.getBoundingClientRect();
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5) out.push(`${name(f)} over ${name(c)}`);
      }
    }
    return out;
  });

/** Each of the card's and the transport's links and buttons, scrolled to, is the one under its own centre. */
const unreachable = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    for (const c of document.querySelectorAll<HTMLElement>("main[data-jcard] :is(a[href], button), [data-transport] :is(a[href], button)")) {
      if (c.closest("[inert], [hidden]") || getComputedStyle(c).visibility === "hidden") continue;
      c.scrollIntoView({ block: "center", behavior: "instant" });
      const r = c.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!hit || !(c === hit || c.contains(hit))) out.push(`${c.getAttribute("aria-label") || c.textContent?.trim().slice(0, 30)} (under ${hit?.tagName ?? "nothing"})`);
      if (r.width < 44 - 0.5 || r.height < 44 - 0.5) {
        if (c.closest("[data-transport]")) out.push(`${c.getAttribute("aria-label") || c.textContent?.trim()} is ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }
    return out;
  });

for (const path of ["/", "/about", "/events", "/events/fixture-event-1", "/mixtape", "/tracklist"]) {
  test(`${path} reads on a phone with no sideways scroll`, async ({ page }) => {
    await gotoReady(page, path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("phones get light motion", async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.locator("html")).toHaveAttribute("data-tier", "lite");
});

for (const path of ["/events", "/events/fixture-event-1", "/people", "/mixtape"]) {
  test(`${path}: the player on top, the transport under it, the J-card stacked below`, async ({ page }) => {
    await ready(page, path);
    const vw = page.viewportSize()!.width;
    const [player, transport, card] = [await box(page, "[data-desk-view]"), await box(page, "[data-transport]"), await box(page, "main[data-jcard]")];
    expect(player.y).toBeGreaterThanOrEqual(0);
    expect(player.y + player.height).toBeLessThanOrEqual(transport.y);
    expect(transport.y + transport.height).toBeLessThanOrEqual(card.y);
    for (const b of [player, transport, card]) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(vw);
    }
    expect(await fixedOverControls(page)).toEqual([]);
    expect(await unreachable(page)).toEqual([]);
  });
}

// The 3D prints the keys' labels on the plate, larger on a phone; neighbours keep a clear
// gap (at least 15% of the distance between their keys), measured on their canvases.
test("the player's key labels print clear of each other", async ({ page }) => {
  await ready(page, "/events");
  const fit = await page.evaluate(() => (window as unknown as { __deskKeyLabels: () => { centres: number[]; widths: number[] } }).__deskKeyLabels());
  const printed = fit.centres.map((x, i) => ({ x, w: fit.widths[i] })).filter((l) => l.w > 0).sort((a, b) => a.x - b.x);
  expect(printed.length).toBeGreaterThan(1);
  for (let i = 1; i < printed.length; i++) {
    const [a, b] = [printed[i - 1], printed[i]];
    const gap = b.x - a.x - (a.w + b.w) / 2;
    expect(gap, `labels ${i - 1} and ${i}: ${JSON.stringify({ a, b })}`).toBeGreaterThanOrEqual(0.15 * (b.x - a.x));
  }
});

test("on the desk the lamp cord and the hint cover no tape", async ({ page }) => {
  await ready(page, "/");
  await expect(page.locator("[data-desk-hint][data-placed]")).toBeVisible();
  expect(await fixedOverControls(page)).toEqual([]);
});

test("without WebGL the sprite player sits on top, the J-card stacked below, nothing covered", { tag: "@sprite" }, async ({ page }) => {
  await ready(page, "/events");
  await expect(page.locator("[data-sprite-desk]")).toBeVisible();
  const [player, transport, card] = [await box(page, "[data-sprite-desk] > div"), await box(page, "[data-transport]"), await box(page, "main[data-jcard]")];
  expect(player.y + player.height).toBeLessThanOrEqual(transport.y);
  expect(transport.y + transport.height).toBeLessThanOrEqual(card.y);
  expect(await fixedOverControls(page)).toEqual([]);
  expect(await unreachable(page)).toEqual([]);
});

test("without WebGL, on the desk, the hint covers no tape", { tag: "@sprite" }, async ({ page }) => {
  await ready(page, "/");
  await expect(page.locator("[data-desk-hint]")).toBeVisible();
  expect(await fixedOverControls(page)).toEqual([]);
});
