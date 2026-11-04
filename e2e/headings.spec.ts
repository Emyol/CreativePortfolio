import { expect, test, type Page } from "./fixtures";
import { gotoReady } from "./helpers";

// The desk's heading outline (spec "Accessibility"): every desk route, public and preview,
// has exactly one h1, visually hidden and first in its main: "Miel" on the desk and the six
// tracks, the event's name on an event's page. Under it the J-card's title is the section's
// h2, and nothing skips a level on the way down (h1, h2, h3).

const TRACKS = [
  ["about", "about"],
  ["events", "events"],
  ["mixtape", "mixtape"],
  ["people", "people"],
  ["made", "made"],
  ["on-rotation", "on rotation"],
] as const;

type Route = { path: string; h1: string; h2: string | null };
const routes = (base: string): Route[] => [
  { path: base || "/", h1: "Miel", h2: null },
  ...TRACKS.map(([path, label]) => ({ path: `${base}/${path}`, h1: "Miel", h2: label })),
  { path: `${base}/events/fixture-event-1`, h1: "Fixture event 1", h2: "events" },
];

/** Every heading in document order, with whether it is the first heading in its main. */
const outline = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")].map((h) => ({
      level: Number(h.tagName[1]),
      text: h.textContent?.trim() ?? "",
      firstInMain: !!h.closest("main") && h.closest("main")!.querySelector("h1, h2, h3, h4, h5, h6") === h,
      srOnly: h.classList.contains("sr-only"),
    })),
  );

test.beforeEach(() => test.setTimeout(60_000));

for (const base of ["", "/admin/preview"]) {
  for (const route of routes(base)) {
    test(`${route.path}: one hidden h1 first in main, the section's h2 under it, no level skipped`, async ({ page }) => {
      await gotoReady(page, route.path);
      await expect(page.locator("main")).toHaveCount(1);
      if (route.h2) await expect(page.locator("main > h2")).toHaveText(route.h2);
      const hs = await outline(page);
      const h1s = hs.filter((h) => h.level === 1);
      expect(h1s).toHaveLength(1);
      expect(hs[0]).toEqual({ level: 1, text: route.h1, firstInMain: true, srOnly: true });
      if (route.h2) expect(hs[1]).toMatchObject({ level: 2, text: route.h2 });
      else expect(hs.filter((h) => h.level === 2)).toHaveLength(0);
      for (let i = 1; i < hs.length; i++) expect(hs[i].level, `${hs[i].text} after ${hs[i - 1].text}`).toBeLessThanOrEqual(hs[i - 1].level + 1);
    });
  }
}
