import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { gotoReady, headingAtTop } from "./helpers";

// Axe can't see text printed over an image, so this measures it: hide the labels, read the
// rendered plate behind each one, and compare with the label's ink.
const lum = (r: number, g: number, b: number) => {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

async function worstLabelContrast(page: Page) {
  const labels = page.locator("[data-hero] [data-key-index] span:last-child");
  const boxes = await labels.evaluateAll((els) => els.map((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, color: getComputedStyle(el).color };
  }));
  await labels.evaluateAll((els) => els.forEach((el) => ((el as HTMLElement).style.visibility = "hidden")));
  const shot = await page.screenshot();
  await labels.evaluateAll((els) => els.forEach((el) => ((el as HTMLElement).style.visibility = "")));
  let worst = Infinity;
  for (const b of boxes) {
    const { data } = await sharp(shot).extract({ left: Math.round(b.x), top: Math.round(b.y), width: Math.max(1, Math.round(b.w)), height: Math.max(1, Math.round(b.h)) }).raw().toBuffer({ resolveWithObject: true });
    let bg = 0;
    for (let i = 0; i < data.length; i += 3) bg = Math.max(bg, lum(data[i], data[i + 1], data[i + 2])); // the lightest pixel behind it is the worst case for light ink
    const [r, g, bl] = b.color.match(/\d+/g)!.map(Number);
    worst = Math.min(worst, ratio(lum(r, g, bl), bg));
  }
  return worst;
}

test.use({ reducedMotion: "reduce" });

test("the hero's printed key labels meet 4.5:1 against the plate", async ({ page }) => {
  await gotoReady(page, "/#top");
  expect(await worstLabelContrast(page)).toBeGreaterThanOrEqual(4.5);
});

test.describe("phones", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the labels stay legible and readable at phone size", async ({ page }) => {
    await gotoReady(page, "/#top");
    expect(await worstLabelContrast(page)).toBeGreaterThanOrEqual(4.5);
    const size = await page.locator("[data-hero] [data-key-index] span:last-child").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(11);
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
