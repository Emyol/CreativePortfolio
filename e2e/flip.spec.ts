import { expect, test } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

const dockScreen = (page: import("@playwright/test").Page) => page.locator("[data-dock] [data-screen]");

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test.describe(`motion: ${reducedMotion}`, () => {
    test.use({ reducedMotion });

    test("the tape turns over between people and made, and the dock follows to side B", async ({ page }) => {
      await gotoReady(page, "/#people");
      await headingAtTop(page, "people");
      await expect(dockScreen(page)).toContainText("SIDE A");
      const order = await page.locator("#people, #flip, #made").evaluateAll((els) => els.map((e) => e.id));
      expect(order).toEqual(["people", "flip", "made"]);
      await page.locator("#flip").scrollIntoViewIfNeeded();
      await page.locator("#made").evaluate((el) => el.scrollIntoView({ block: "start" }));
      await expect(dockScreen(page)).toContainText("SIDE B");
      const keys = page.locator("[data-dock]").getByRole("navigation", { name: "Tape" }).getByRole("link");
      await expect(keys).toHaveText(["made", "on rotation"]);
    });
  });
}

/** Scrolls to `share` of the way through the flip (its ScrollTrigger runs top-top to bottom-bottom). */
const scrollFlip = (page: import("@playwright/test").Page, share: number) =>
  page.locator("#flip").evaluate((el, share) => {
    const top = el.getBoundingClientRect().top + scrollY;
    window.scrollTo(0, top + (el.clientHeight - innerHeight) * share);
  }, share);
const turn = (page: import("@playwright/test").Page) => page.locator("[data-flip][data-3d]").evaluate((el) => Number((el as HTMLElement).dataset.turn));

test.describe("in 3D", () => {
  test.use({ reducedMotion: "no-preference" });

  test("full motion turns the 3D cassette with the scroll", async ({ page }) => {
    await gotoReady(page, "/#people");
    await headingAtTop(page, "people");
    await scrollFlip(page, 0.2);
    await expect(page.locator("[data-flip][data-3d]")).toHaveCount(1, { timeout: 20_000 });
    await scrollFlip(page, 0.5);
    await expect.poll(() => turn(page)).toBeGreaterThanOrEqual(0.45);
    expect(await turn(page)).toBeLessThanOrEqual(0.55);
    await scrollFlip(page, 1);
    await expect.poll(() => page.locator("[data-flip]").getAttribute("data-turn")).toBe("1.00");
  });

  test("the flat frame never shows before the 3D cassette", async ({ page }) => {
    let release = () => {};
    const held = new Promise<void>((r) => (release = r));
    await page.route("**/device/device.glb", async (route) => {
      await held;
      await route.continue();
    });
    await gotoReady(page, "/#people");
    await headingAtTop(page, "people");
    await scrollFlip(page, 0.2);
    await page.waitForTimeout(800);
    const poster = page.locator("#flip img").first();
    expect(await poster.evaluate((el) => getComputedStyle(el).visibility)).toBe("hidden");
    release();
    await expect(page.locator("[data-flip][data-3d]")).toHaveCount(1, { timeout: 20_000 });
  });

  test("dragging spins it and it settles on a side", async ({ page }) => {
    await gotoReady(page, "/#people");
    await headingAtTop(page, "people");
    await scrollFlip(page, 1);
    await expect(page.locator("[data-flip][data-3d]")).toHaveCount(1, { timeout: 20_000 });
    await expect.poll(() => turn(page)).toBe(1);
    const box = (await page.locator("#flip [data-flip-view]").boundingBox())!;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width / 2 + 150, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 150, y, { steps: 12 });
    expect(await turn(page)).not.toBe(1);
    await page.mouse.up();
    await page.waitForTimeout(1500);
    expect(Math.abs((await turn(page)) % 1)).toBeLessThan(0.005);
  });
});

test("without WebGL, full motion scrubs the frames on a canvas as the flip scrolls by", async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
      return (get as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await gotoReady(page, "/#people");
  await headingAtTop(page, "people");
  await page.locator("#flip").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY + el.clientHeight * 0.3));
  await expect(page.locator("#flip canvas[data-ready]")).toHaveCount(1);
  await expect(page.locator("[data-flip][data-3d]")).toHaveCount(0);
});
