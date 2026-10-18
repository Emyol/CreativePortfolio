import { expect, test, type Page } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

test.use({ reducedMotion: "no-preference" });

type Sample = { id: string; held: boolean; top: number; arrival: string | null };

/** Every section's state: held (ScrollTrigger has it fixed in place), where it is, how far its arrival has played. */
const sample = (page: Page) =>
  page.locator("[data-track]").evaluateAll((els) =>
    els.map((el) => ({
      id: el.id,
      held: getComputedStyle(el).position === "fixed",
      top: Math.round(el.getBoundingClientRect().top),
      arrival: el.getAttribute("data-arrival"),
    })),
  );

/** Scroll the whole page in wheel steps, recording every section after each step. */
async function scrollThrough(page: Page, step: number, wait: number): Promise<Sample[][]> {
  await page.mouse.move(1380, 450); // over empty table, clear of the toys
  const frames: Sample[][] = [];
  let last = -1;
  for (let i = 0; i < 400; i++) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(wait);
    frames.push(await sample(page));
    const y = await page.evaluate(() => Math.round(scrollY));
    if (y === last && i > 5) break;
    last = y;
  }
  return frames;
}

/** For each section: the tops it had while held, and its arrival on the first frame after it let go. */
function holds(frames: Sample[][]) {
  const out = new Map<string, { tops: number[]; releasedAt: string | null }>();
  for (let f = 0; f < frames.length; f++) {
    for (const s of frames[f]) {
      const h = out.get(s.id) ?? { tops: [], releasedAt: null };
      out.set(s.id, h);
      if (s.held) h.tops.push(s.top);
      const wasHeld = f > 0 && frames[f - 1].find((p) => p.id === s.id)?.held;
      if (wasHeld && !s.held && h.releasedAt === null) h.releasedAt = s.arrival;
    }
  }
  return out;
}

async function lowestOpacity(page: Page, selector: string) {
  return page.evaluate(
    (sel) =>
      new Promise<number>((resolve) => {
        let min = 1;
        const start = performance.now();
        const tick = () => {
          const el = document.querySelector(sel);
          if (el) min = Math.min(min, Number(getComputedStyle(el).opacity));
          if (performance.now() - start < 700) requestAnimationFrame(tick);
          else resolve(min);
        };
        tick();
      }),
    selector,
  );
}

test("a section holds still until its arrival has finished", async ({ page }) => {
  await gotoReady(page, "/#top");
  const mixtape = holds(await scrollThrough(page, 120, 60)).get("mixtape")!;
  expect(mixtape.tops.length).toBeGreaterThan(2);
  expect(Math.max(...mixtape.tops) - Math.min(...mixtape.tops)).toBeLessThanOrEqual(1);
  expect(mixtape.releasedAt).toBe("1.00");
});

for (const [step, wait, speed] of [[120, 60, "2000"], [400, 80, "5000"]] as const) {
  test(`every section is complete when it lets go, at about ${speed} px/s`, async ({ page }) => {
    await gotoReady(page, "/#top");
    const all = holds(await scrollThrough(page, step, wait));
    expect([...all.keys()].sort()).toEqual(["about", "events", "made", "mixtape", "on-rotation", "people"]);
    for (const [id, h] of all) expect(h.releasedAt, `${id} let go at`).toBe("1.00");
  });
}

test("a dock key jumps across holds and lands settled", async ({ page }) => {
  await gotoReady(page, "/#top");
  await page.keyboard.press("B");
  await page.keyboard.press("1");
  await headingAtTop(page, "made");
  await expect(page.locator("[data-track=made]")).toHaveAttribute("data-arrival", "1.00");
});

test("a deep link lands settled and never blinks", async ({ page }) => {
  await page.goto("/#events");
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  expect(await lowestOpacity(page, "#events")).toBe(1);
  await expect(page.locator("#events")).toHaveAttribute("data-arrival", "1.00");
});

test("focus moving into a held section completes it", async ({ page }) => {
  await gotoReady(page, "/#about");
  const link = page.locator("[data-track=events] a").first();
  await link.focus();
  await expect(page.locator("#events")).toHaveAttribute("data-arrival", "1.00");
  await expect(link).toBeInViewport();
});

test("resizing mid-hold keeps the section in view", async ({ page }) => {
  await gotoReady(page, "/#top");
  await page.mouse.move(1380, 450);
  for (let i = 0; i < 60; i++) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(60);
    const s = (await sample(page)).find((x) => x.id === "events")!;
    if (s.held && s.arrival !== null && Number(s.arrival) > 0.2 && Number(s.arrival) < 0.8) break;
  }
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.waitForTimeout(600);
  const box = await page.locator("#events").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom) };
  });
  const fitsAboveDock = box.top >= 0 && box.bottom <= 700 - 110;
  expect(fitsAboveDock || box.top === 10).toBe(true);
});

test.describe("a short screen", () => {
  test.use({ viewport: { width: 1440, height: 600 } });
  test("a tall section holds its top and reveals later rows on entry", async ({ page }) => {
    await gotoReady(page, "/#top");
    await page.mouse.move(1380, 300);
    const frames: { held: boolean; top: number; lastTop: number; lastRevealed: number }[] = [];
    for (let i = 0; i < 90; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(60);
      frames.push(
        await page.locator("#events").evaluate((el) => {
          const last = [...el.querySelectorAll("li")].at(-1)!;
          // How much of the last card is recorded in: 1 - its clip-path's right inset.
          const right = /inset\(\S+ (\S+)%/.exec(getComputedStyle(last).clipPath)?.[1];
          return {
            held: getComputedStyle(el).position === "fixed",
            top: Math.round(el.getBoundingClientRect().top),
            lastTop: Math.round(last.getBoundingClientRect().top),
            lastRevealed: right === undefined ? 1 : 1 - Number(right) / 100,
          };
        }),
      );
      if (frames.length > 3 && frames.at(-1)!.lastTop < -100) break;
    }
    const held = frames.filter((f) => f.held);
    expect(held.length).toBeGreaterThan(2);
    expect(held.every((f) => f.top === 10)).toBe(true);
    // The last row is below the screen while the section holds: it waits until it enters,
    // and is fully recorded by the time it passes 60% of the screen.
    for (const f of frames) if (f.lastTop > 600 * 0.9) expect(f.lastRevealed).toBe(0);
    const passed = frames.filter((f) => f.lastTop < 600 * 0.6 - 20);
    expect(passed.length).toBeGreaterThan(0);
    expect(passed.every((f) => f.lastRevealed === 1)).toBe(true);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("no pins, nothing hidden", async ({ page }) => {
    await gotoReady(page, "/");
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    await expect(page.locator("[data-arrival]")).toHaveCount(0);
  });
});
