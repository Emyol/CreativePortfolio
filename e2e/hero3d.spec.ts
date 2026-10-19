import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

test.use({ reducedMotion: "no-preference" });

// The test browser runs on the machine's GPU (playwright.config.ts); the dev server compiles
// three.js on first use, so the waits are generous. Never frame-rate checks.
const READY = 30_000;

/** Notes, every frame from the first paint, whether the flat (sprite) device was visible. */
const watchFlat = (page: import("@playwright/test").Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __flat: boolean };
    w.__flat = false;
    const tick = () => {
      const plate = document.querySelector("[data-hero] [data-device] img[src*='/plate.']");
      if (plate && Number(getComputedStyle(plate).opacity) > 0.01) w.__flat = true;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
const flatSeen = (page: import("@playwright/test").Page) => page.evaluate(() => (window as unknown as { __flat: boolean }).__flat);
/** Holds the model's download until `release()`. */
async function holdModel(page: import("@playwright/test").Page) {
  let release = () => {};
  const held = new Promise<void>((r) => (release = r));
  await page.route("**/device/device.glb", async (route) => {
    await held;
    await route.continue();
  });
  return () => release();
}

test("the flat device never shows while the 3D loads or takes over", async ({ page }) => {
  await watchFlat(page);
  const release = await holdModel(page);
  await gotoReady(page, "/#top");
  await page.waitForTimeout(1200);
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(0);
  release();
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(1, { timeout: READY });
  await page.waitForTimeout(800);
  expect(await flatSeen(page)).toBe(false);
});

test("the entrance waits for the 3D and plays in it", async ({ page }) => {
  await watchFlat(page);
  const release = await holdModel(page);
  await page.goto("/");
  await expect(page.locator("[data-boot-screen]")).toBeVisible({ timeout: 3_000 });
  await page.waitForTimeout(2500);
  await expect(page.locator("[data-boot-screen]")).toBeVisible(); // still winding the tape in
  release();
  await expect(page.locator("[data-boot-screen]")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(1);
  await expect(page.locator("[data-hero] [data-screen]")).toContainText("01 about");
  expect(await flatSeen(page)).toBe(false);
});

test("the hero becomes 3D without moving the page", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await gotoReady(page, "/#top");
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(1, { timeout: READY });
  await expect(page.locator("canvas[data-stage]")).toHaveCount(1);
  expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.01);
});

// (In dev, Turbopack's tiny async-loader stub for three is in the page; the library isn't.)
test("three.js loads only after the page has painted", async ({ page }) => {
  const three: number[] = [];
  page.on("request", (r) => /three_build|three_examples|device\.glb/.test(r.url()) && three.push(Date.now()));
  const start = Date.now();
  await gotoReady(page, "/#top");
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(1, { timeout: READY });
  const paint = await page.evaluate(() => performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0);
  expect(three.length).toBeGreaterThan(0);
  expect(Math.min(...three) - start).toBeGreaterThan(paint);
});

test("the keys are real links over the 3D keys", async ({ page }) => {
  await gotoReady(page, "/#top");
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(1, { timeout: READY });
  const keys = page.locator("[data-hero] [data-tape-keys] [data-key-index]");
  await expect(keys).toHaveCount(4);
  // One read for all four: the software-drawn canvas leaves the page few turns to answer.
  const placed = await keys.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { dx: r.left + r.width / 2 - Number((el as HTMLElement).dataset.keyX), dy: r.top + r.height / 2 - Number((el as HTMLElement).dataset.keyY) };
    }),
  );
  for (const { dx, dy } of placed) {
    expect(Math.abs(dx)).toBeLessThan(20);
    expect(Math.abs(dy)).toBeLessThan(20);
  }
  await keys.nth(1).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#events$/);
});

test("the key labels are printed on the 3D plate, not laid over it", async ({ page }) => {
  await gotoReady(page, "/#top");
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(1, { timeout: READY });
  await expect(page.locator("[data-hero]")).toHaveAttribute("data-printed", "about|events|mixtape|people");
  const opacities = await page.locator("[data-hero] [data-key-index] > span").evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
  expect(opacities).toEqual(["0", "0", "0", "0"]);
  // Still the links' names for screen readers.
  await expect(page.locator("[data-hero]").getByRole("link", { name: "mixtape" })).toHaveCount(1);
});

test("after the GPU drops the 3D, the flip starts a fresh stage", async ({ page }) => {
  await gotoReady(page, "/#top");
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(1, { timeout: READY });
  await page.locator("canvas[data-stage]").evaluate((c) => (c as HTMLCanvasElement).getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext());
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(0);
  await page.locator("#flip").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY + 40));
  await expect(page.locator("[data-flip][data-3d]")).toHaveCount(1, { timeout: READY });
  await expect(page.locator("canvas[data-stage]")).toHaveCount(1);
  expect(await page.locator("canvas[data-stage]").evaluate((c) => (c as HTMLCanvasElement).getContext("webgl2")!.isContextLost())).toBe(false);
});

test("the stage's canvas is exactly the visible viewport", async ({ page }) => {
  await gotoReady(page, "/#top");
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(1, { timeout: READY });
  const [h, css] = await page.locator("canvas[data-stage]").evaluate((c) => [innerHeight, (c as HTMLElement).style.height]);
  expect(css).toBe(`${h}px`);
});

test("without WebGL the sprite device and the entrance still work", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
      return (get as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto("/");
  await expect(page.locator("[data-boot-screen]")).toHaveCount(0, { timeout: 8_000 });
  await expect(page.locator("[data-hero] [data-screen]")).toContainText("01 about");
  await page.waitForTimeout(1500);
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(0);
  // The flat device is the one shown, since 3D can't run here.
  expect(await page.locator("[data-hero] [data-device] img[src*='/plate.']").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  await expect(page.locator("canvas[data-stage]")).toHaveCount(0);
  expect(errors.filter((e) => !/Spotify|React DevTools|HMR/.test(e))).toEqual([]);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the 3D player, held still, with no entrance", async ({ page }) => {
    await watchFlat(page);
    await gotoReady(page, "/");
    await expect(page.locator("html")).not.toHaveAttribute("data-boot");
    await expect(page.locator("[data-hero][data-3d]")).toHaveCount(1, { timeout: READY });
    await expect(page.locator("canvas[data-stage]")).toHaveCount(1);
    expect(await flatSeen(page)).toBe(false);
  });
});
