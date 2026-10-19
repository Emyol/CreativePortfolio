import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

test.use({ reducedMotion: "reduce" }); // judge final states

const TRACKS = [["about", "about"], ["events", "events"], ["mixtape", "mixtape"], ["people", "people"], ["made", "made"], ["on-rotation", "on rotation"]];

test("one h1, one h2 per track in tape order", async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveAccessibleName("Miel");
  const ids = await page.locator("section[data-track]").evaluateAll((s) => s.map((e) => e.id));
  expect(ids).toEqual(TRACKS.map(([id]) => id));
  for (const [id, label] of TRACKS) await expect(page.locator(`section#${id} h2`)).toHaveAccessibleName(label);
});

test("skip links: content first, then the track list", async ({ page }) => {
  await gotoReady(page, "/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Tab");
  const list = page.getByRole("link", { name: "Skip to the track list" });
  await expect(list).toBeFocused();
  await expect(list).toHaveAttribute("href", "/tracklist");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("no Kakejiku left: no Japanese characters, no KanjiVG credit", async ({ page }) => {
  await gotoReady(page, "/");
  expect(await page.locator("body").innerText()).not.toMatch(/[぀-ヿ㐀-鿿]/);
  await expect(page.getByText("KanjiVG")).toHaveCount(0);
});

test("no portrait in the hero", async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.locator("[data-hero] img:not([alt=''])")).toHaveCount(0);
});

test("home has no axe violations at WCAG 2.1 AA", async ({ page }) => {
  await gotoReady(page, "/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test.describe("the footer, in 3D", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the footer turns the device over and the links land on the door", async ({ page }) => {
    await gotoReady(page, "/#made");
    const device = page.locator("footer [data-underside]");
    // Every link and toolbox item is there and focusable from the start.
    const links = page.locator("footer [data-anchor='door'] a");
    await expect(links.first()).toBeAttached();
    expect(await page.locator("footer [data-anchor='sticker'] li").count()).toBeGreaterThan(0);
    expect(await links.evaluateAll((els) => els.every((a) => (a as HTMLElement).tabIndex >= 0))).toBe(true);
    // Scroll to it: once in 3D, it holds still while it turns, then lets go.
    await device.scrollIntoViewIfNeeded();
    await expect(device).toHaveAttribute("data-3d", "", { timeout: 20_000 });
    const top = () => device.evaluate((el) => Math.round(el.getBoundingClientRect().top));
    await page.mouse.move(720, 300);
    let held: number | undefined;
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(60);
      const a = Number(await device.getAttribute("data-arrival"));
      if (a > 0.1 && a < 0.9) {
        held ??= await top();
        expect(Math.abs((await top()) - held)).toBeLessThanOrEqual(2);
      }
      if (a >= 1) break;
    }
    expect(held).toBeDefined();
    await expect(device).toHaveAttribute("data-arrival", "1.00");
    await expect(device).toHaveAttribute("data-turn", "1.00");
    // The links sit on the door as the model projects it.
    const door = page.locator("footer [data-anchor='door']");
    await expect(door).toHaveAttribute("data-placed", "");
    const [rect, boxes] = await Promise.all([door.evaluate((el) => el.getBoundingClientRect().toJSON()), links.evaluateAll((els) => els.map((a) => a.getBoundingClientRect().toJSON()))]);
    for (const b of boxes) {
      expect(b.left).toBeGreaterThanOrEqual(rect.left - 6);
      expect(b.right).toBeLessThanOrEqual(rect.right + 6);
      expect(b.top).toBeGreaterThanOrEqual(rect.top - 6);
      expect(b.bottom).toBeLessThanOrEqual(rect.bottom + 6);
    }
    // …and the door is where the model's door projects (recorded in the device box).
    const [dx, dy] = await door.evaluate((el) => {
      const [x, y] = (el as HTMLElement).dataset.rect!.split(",").map(Number);
      const d = el.getBoundingClientRect();
      const o = el.closest("[data-underside]")!.getBoundingClientRect();
      return [d.left - o.left - x, d.top - o.top - y];
    });
    expect(Math.abs(dx)).toBeLessThan(2);
    expect(Math.abs(dy)).toBeLessThan(2);
  });

  test("on a tall screen there is room to finish the turn", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1600 });
    await gotoReady(page, "/#on-rotation");
    const device = page.locator("footer [data-underside]");
    await device.scrollIntoViewIfNeeded();
    await expect(device).toHaveAttribute("data-3d", "", { timeout: 20_000 });
    await page.mouse.move(720, 300);
    let last = -1;
    for (let i = 0; i < 80; i++) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(60);
      const y = await page.evaluate(() => Math.round(scrollY));
      if (y === last && i > 5) break;
      last = y;
    }
    await expect(device).toHaveAttribute("data-turn", "1.00");
    await expect(device).toHaveAttribute("data-landed", "");
  });

  test("the footer holds only once the 3D has taken over", async ({ page }) => {
    // A slow model: held back until the footer has been in view a while.
    let release = () => {};
    const held = new Promise<void>((r) => (release = r));
    await page.route("**/device/device.glb", async (route) => {
      await held;
      await route.continue();
    });
    await gotoReady(page, "/#on-rotation");
    const device = page.locator("footer [data-underside]");
    await device.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await expect(device).not.toHaveAttribute("data-3d");
    await expect(device).not.toHaveAttribute("data-arrival");
    // …and the flat underside isn't shown while the 3D is on its way.
    expect(await device.locator("img").first().evaluate((el) => getComputedStyle(el).visibility)).toBe("hidden");
    release();
    await expect(device).toHaveAttribute("data-3d", "", { timeout: 20_000 });
    await expect(device).toHaveAttribute("data-arrival", /\d\.\d\d/);
  });
});
