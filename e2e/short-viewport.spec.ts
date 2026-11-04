import { expect, test, type Page } from "./fixtures";
import { gotoReady } from "./helpers";

// A short view: a 1280×720 laptop at 200% zoom is 640×360, a 1366×768 one is 683×384, and a
// phone on its side or a small window is about 900×400 (WCAG 1.4.4 and 1.4.10). There is no
// room for the flap and the transport above the corner player there, so the J-card scrolls
// with the page beside the player. Its print shows, nothing fixed covers a link, a button
// or a line of text at any scroll, and every track on the flap can be reached.

test.beforeEach(() => test.setTimeout(90_000));
test.beforeAll(async ({ request }) => {
  for (const p of ["/people", "/events/fixture-event-1"]) await request.get(p);
});

async function ready(page: Page, url: string) {
  await gotoReady(page, url);
  await page.waitForSelector("[data-desk-view][data-ready], [data-sprite-desk]", { state: "attached", timeout: 30_000 });
  await page.waitForTimeout(600); // the direct load's settle
}

/**
 * Every fixed thing on screen (the corner player, its key and tape links, the transport if
 * fixed, a label) whose box crosses a link's, a button's or a line of text's in the J-card or
 * the transport. Decorative layers (aria-hidden, or empty and click-through) cover nothing.
 */
const fixedOverContent = (page: Page) =>
  page.evaluate(() => {
    const shown = (el: Element) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0 && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    };
    const ownText = (el: Element) => [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
    const player = "[data-desk-view][data-state=deck], [data-sprite-desk] > div[data-state=deck]";
    const fixed = [...document.querySelectorAll("body *")].filter((el) => {
      if (el.matches(player)) return shown(el);
      const s = getComputedStyle(el);
      if (s.position !== "fixed" || el.closest("[aria-hidden='true']") || el.classList.contains("skip-link")) return false;
      if (s.pointerEvents === "none" && !ownText(el)) return false;
      return shown(el);
    });
    const scope = [...document.querySelectorAll("main[data-jcard], [data-transport]")];
    const boxes: { name: string; r: DOMRect }[] = [];
    for (const root of scope) {
      for (const c of root.querySelectorAll("a[href], button")) {
        if (!c.closest("[inert]") && shown(c)) boxes.push({ name: (c.getAttribute("aria-label") || c.textContent || "").trim().slice(0, 30), r: c.getBoundingClientRect() });
      }
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const el = n.parentElement!;
        if (!n.textContent!.trim() || el.closest("[inert], [aria-hidden='true'], .sr-only") || !shown(el)) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) boxes.push({ name: n.textContent!.trim().slice(0, 30), r });
      }
    }
    const out: string[] = [];
    for (const f of fixed) {
      const a = f.getBoundingClientRect();
      for (const { name, r: b } of boxes) {
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5) {
          out.push(`${f.getAttribute("aria-label") || f.tagName}${f.hasAttribute("data-desk-view") ? " (the player)" : ""} over "${name}" at scroll ${scrollY}`);
        }
      }
    }
    return out;
  });

/** Steps down the page half a view at a time, checking at each stop. */
async function coveredAnywhere(page: Page) {
  const out: string[] = [];
  const end = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const step = (page.viewportSize()!.height / 2) | 0;
  for (let y = 0; ; y = Math.min(end, y + step)) {
    await page.evaluate((to) => window.scrollTo({ top: to, behavior: "instant" }), y);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    out.push(...(await fixedOverContent(page)));
    if (y >= end) break;
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  return out;
}

for (const [width, height] of [
  [640, 360],
  [683, 384],
  [900, 400],
] as const) {
  for (const path of ["/people", "/events/fixture-event-1"]) {
    test(`${width}×${height} ${path}: the J-card shows and scrolls, nothing fixed covers it, every track is reachable`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await ready(page, path);
      const card = page.locator("main[data-jcard]");
      // The print shows: the title, and panels with height, in the view or below it.
      const title = (await card.locator(":scope > h2").boundingBox())!;
      expect(title.height).toBeGreaterThan(20);
      expect(title.y).toBeGreaterThanOrEqual(0);
      expect(title.y + title.height).toBeLessThanOrEqual(height);
      for (const panel of ["flap", "device", "liner"]) expect((await card.locator(`[data-panel="${panel}"]`).first().boundingBox())!.height, panel).toBeGreaterThan(20);
      await expect(page.getByRole("navigation", { name: "Transport" })).toBeVisible();
      expect(await coveredAnywhere(page)).toEqual([]);

      // Every track on the flap, scrolled to, is the link under its own centre.
      const links = card.locator('[data-panel="flap"] a');
      await expect(links).toHaveCount(6);
      const blocked = await page.evaluate(() => {
        const out: string[] = [];
        for (const c of document.querySelectorAll<HTMLElement>('main[data-jcard] [data-panel="flap"] a, [data-transport] :is(a[href], button)')) {
          c.scrollIntoView({ block: "center", behavior: "instant" });
          const r = c.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (!hit || !(c === hit || c.contains(hit))) out.push(`${c.textContent?.trim()} (under ${hit?.tagName ?? "nothing"})`);
        }
        return out;
      });
      expect(blocked).toEqual([]);
      // And one of them, clicked, loads its track.
      await links.filter({ hasText: "06 on rotation" }).click();
      await expect(page).toHaveURL(/\/on-rotation$/, { timeout: 10_000 });
      await expect(card.locator(":scope > h2")).toHaveText("on rotation");
    });
  }
}
