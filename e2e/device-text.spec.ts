import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { gotoReady, headingAtTop } from "./helpers";

// Axe can't see text printed on the 3D plate, so this measures it in a screenshot: in the
// box under each key where its label is printed, the ink (darkest pixels) against the plate
// (lightest), and how tall the printed letters stand.
const lum = (r: number, g: number, b: number) => {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

async function printedLabels(page: Page) {
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(1, { timeout: 30_000 });
  await page.waitForTimeout(600);
  const dpr = await page.evaluate(() => devicePixelRatio);
  // Where the hero says each label is printed (its plane, projected on screen).
  const boxes = await page.locator("[data-hero] [data-key-index]").evaluateAll((els) =>
    els.map((el) => {
      const [x, y, w, h] = (el as HTMLElement).dataset.printRect!.split(",").map(Number);
      return { x, y, w, h };
    }),
  );
  const shot = await page.screenshot();
  let contrast = Infinity;
  let height = Infinity;
  for (const b of boxes) {
    const left = Math.round(b.x * dpr), top = Math.round(b.y * dpr), width = Math.round(b.w * dpr), rows = Math.round(b.h * dpr);
    const { data, info } = await sharp(shot).extract({ left, top, width, height: rows }).raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    let ink = Infinity, plate = 0;
    const lums: number[] = [];
    for (let i = 0; i < data.length; i += ch) {
      const l = lum(data[i], data[i + 1], data[i + 2]);
      lums.push(l);
      ink = Math.min(ink, l);
      plate = Math.max(plate, l);
    }
    contrast = Math.min(contrast, ratio(ink, plate));
    const mid = (ink + plate) / 2;
    const inked = [...Array(rows).keys()].filter((y) => lums.slice(y * width, (y + 1) * width).some((l) => l < mid));
    height = Math.min(height, inked.length ? (inked[inked.length - 1] - inked[0] + 1) / dpr : 0);
  }
  return { contrast, height };
}

test.use({ reducedMotion: "reduce" });

test("the hero's printed key labels meet 4.5:1 against the plate", async ({ page }) => {
  await gotoReady(page, "/#top");
  expect((await printedLabels(page)).contrast).toBeGreaterThanOrEqual(4.5);
});

test.describe("phones", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the labels stay legible and readable at phone size", async ({ page }) => {
    await gotoReady(page, "/#top");
    const { contrast, height } = await printedLabels(page);
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    expect(height).toBeGreaterThanOrEqual(7); // CSS px from ascender to descender, about 11 px type
  });
});

test("no dock key label is ever cut off, on either side", async ({ page }) => {
  await gotoReady(page, "/#made");
  await headingAtTop(page, "made");
  const cut = await page.locator("[data-dock] [data-key-index] span:last-child").evaluateAll((els) =>
    els.filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1).map((el) => el.textContent),
  );
  expect(cut).toEqual([]);
});

test("tabbing never leaves the focused control under the dock", async ({ page }) => {
  await gotoReady(page, "/#mixtape");
  await headingAtTop(page, "mixtape");
  const dockTop = await page.locator("[data-dock]").evaluate((el) => el.getBoundingClientRect().top);
  const target = page.getByRole("link", { name: "Open in Spotify: Fixture song 6" });
  // Park the link just below the fold, then Tab onto it from the control before it.
  await target.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - innerHeight + 4));
  await page.getByRole("button", { name: "Play Fixture song 6 on Spotify" }).focus();
  await page.keyboard.press("Tab");
  await expect(target).toBeFocused();
  const bottom = await target.evaluate((el) => el.getBoundingClientRect().bottom);
  expect(bottom).toBeLessThanOrEqual(dockTop);
});

for (const width of [768, 820, 900, 1024]) {
  test(`the dock fits inside a ${width}px window`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await gotoReady(page, "/#events");
    await expect(page.locator("[data-dock]")).not.toHaveAttribute("inert");
    const box = await page.locator("[data-dock]").evaluate((el) => {
      const r = el.getBoundingClientRect();
      // Decorative parts (the knob sprite and its shadow canvas) may hang past the edge.
      const kids = [...el.querySelectorAll<HTMLElement>("*")].filter((k) => k.offsetParent !== null && !k.closest("[aria-hidden=\"true\"]")).map((k) => k.getBoundingClientRect());
      return { left: r.left, right: r.right, height: r.height, overflow: kids.some((k) => k.right > r.right + 1 || k.bottom > r.bottom + 1) };
    });
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(width);
    expect(box.overflow).toBe(false);
  });
}

test("the focus ring sits on a dark halo, so it reads on the light aluminium", async ({ page }) => {
  await gotoReady(page, "/#top");
  await page.keyboard.press("Tab"); // skip link
  await page.keyboard.press("Tab"); // track-list skip link
  await page.keyboard.press("Tab"); // first hero key
  const ring = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement!);
    return { outline: s.outlineColor, halo: s.boxShadow };
  });
  expect(ring.outline).toBe("rgb(255, 46, 0)");
  expect(ring.halo).toContain("rgb(5, 5, 6)");
});
