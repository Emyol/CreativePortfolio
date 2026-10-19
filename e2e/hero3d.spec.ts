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
  await expect(page.locator("[data-boot-screen]")).toBeVisible({ timeout: 8_000 });
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
  // What the dark screen reads, every frame it changes.
  await page.addInitScript(() => {
    const seen: string[] = ((window as unknown as { __boot: string[] }).__boot = []);
    const tick = () => {
      const t = document.querySelector("[data-boot-screen]")?.textContent;
      if (t && t !== seen.at(-1)) seen.push(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto("/");
  await expect(page.locator("[data-boot-screen]")).toBeVisible({ timeout: 8_000 });
  await expect(page.locator("[data-boot-screen]")).toHaveCount(0, { timeout: 8_000 });
  await expect(page.locator("[data-hero] [data-screen]")).toContainText("01 about");
  // It lands on SIDE A and stays there: the counter never writes over it.
  const boot = await page.evaluate(() => (window as unknown as { __boot: string[] }).__boot);
  expect(boot).toContain("SIDE A");
  expect(boot.slice(boot.indexOf("SIDE A"))).toEqual(["SIDE A"]);
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

/** Makes WebGL2 report a software renderer, as with hardware acceleration off or over RDP. */
const softwareGL = (page: import("@playwright/test").Page) =>
  page.addInitScript(() => {
    const get = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (this: WebGL2RenderingContext, p: number) {
      if (p === 0x9246 || p === 0x1f01) return "Google SwiftShader";
      return get.call(this, p);
    } as typeof WebGL2RenderingContext.prototype.getParameter;
  });
const footerShown = (page: import("@playwright/test").Page) =>
  page.locator("footer [data-underside]").evaluate((box) => [getComputedStyle(box.querySelector("img")!).visibility, getComputedStyle(box.querySelector("[data-anchor='door']")!).opacity]);

test("on a software renderer an event page shows its footer at once", async ({ page }) => {
  await softwareGL(page);
  await gotoReady(page, "/events/fixture-event-1");
  await expect(page.locator("html")).not.toHaveAttribute("data-gl");
  await page.locator("footer [data-underside]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  expect(await footerShown(page)).toEqual(["visible", "1"]);
});

test("a footer reached after 10 s still never shows flat before its 3D", async ({ page }) => {
  test.setTimeout(60_000);
  const release = await holdModel(page);
  await gotoReady(page, "/#top");
  await page.waitForTimeout(10_500);
  const device = page.locator("footer [data-underside]");
  await device.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  expect((await footerShown(page))[0]).toBe("hidden");
  release();
  await expect(device).toHaveAttribute("data-3d", "", { timeout: READY });
});

test("while the 3D loads, a key reached from the keyboard shows its name", async ({ page }) => {
  const release = await holdModel(page);
  await gotoReady(page, "/#top");
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => !!document.activeElement?.closest("[data-hero] [data-key-index]"))) break;
  }
  const [opacity, bg] = await page.evaluate(() => {
    const span = document.activeElement!.closest("[data-key-index]")!.querySelector("span")!;
    const s = getComputedStyle(span);
    return [s.opacity, s.backgroundColor];
  });
  expect(opacity).toBe("1");
  expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  release();
});

test("a footer link focused before its 3D arrives keeps the flat footer for the visit", async ({ page }) => {
  const release = await holdModel(page);
  await gotoReady(page, "/#on-rotation");
  const device = page.locator("footer [data-underside]");
  await device.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await device.locator("[data-anchor='door'] a").first().focus();
  await expect(device).toHaveAttribute("data-fallback", "");
  expect(await footerShown(page)).toEqual(["visible", "1"]);
  release();
  await page.waitForTimeout(2500);
  await expect(device).not.toHaveAttribute("data-3d");
});

test("crossing to phone width doesn't leave the hero empty or fading in again", async ({ page }) => {
  await gotoReady(page, "/#top");
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(1, { timeout: READY });
  await page.evaluate(() => {
    const w = window as unknown as { __gap: number; __back: string };
    w.__gap = 0;
    let from = 0;
    const tick = (t: number) => {
      const on = document.querySelector<HTMLElement>("[data-hero][data-3d]");
      if (!on && !from) from = t;
      if (on && from) {
        w.__gap = Math.max(w.__gap, t - from);
        w.__back = on.style.getPropertyValue("--fade3d"); // how strongly it shows as it comes back
        from = 0;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.setViewportSize({ width: 700, height: 900 });
  await expect(page.locator("html")).toHaveAttribute("data-tier", "lite");
  await page.waitForTimeout(300);
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(1, { timeout: READY });
  await page.waitForTimeout(300);
  const { gap, back } = await page.evaluate(() => {
    const w = window as unknown as { __gap: number; __back: string };
    return { gap: w.__gap, back: w.__back };
  });
  // Gone only while it compiles and draws unseen (a new tier can mean new shaders), not left empty…
  expect(gap).toBeGreaterThan(0);
  expect(gap).toBeLessThan(2500);
  // …and it comes back at full strength, not fading in again.
  expect(back).toBe("1");
});

test("a script that arrives after the failsafe keeps the flat device, never swapping it", async ({ page }) => {
  test.setTimeout(60_000);
  const start = Date.now();
  await page.route(/\/_next\/static\/.*\.js/, async (route) => {
    await new Promise((r) => setTimeout(r, Math.max(0, 11_000 - (Date.now() - start))));
    await route.continue();
  });
  await page.goto("/#top");
  await page.waitForSelector("html[data-tier]", { state: "attached", timeout: 40_000 });
  const plate = page.locator("[data-hero] [data-device] img[src*='/plate.']");
  await page.waitForTimeout(3000);
  expect(await plate.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  await expect(page.locator("html")).not.toHaveAttribute("data-gl");
  await expect(page.locator("[data-hero][data-3d]")).toHaveCount(0);
});

test("Back from a footer link puts the visitor back at the landed footer", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => window.addEventListener("unload", () => {})); // no back/forward cache: a real reload
  await page.goto("/");
  await expect(page.locator("[data-boot-screen]")).toBeVisible({ timeout: 8_000 });
  await page.keyboard.press("Escape");
  const device = page.locator("footer [data-underside]");
  await device.scrollIntoViewIfNeeded();
  await expect(device).toHaveAttribute("data-3d", "", { timeout: READY });
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(400);
  }
  await expect(device).toHaveAttribute("data-landed", "");
  const left = await page.evaluate(() => Math.round(scrollY));
  await page.goto("about:blank");
  await page.goBack();
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  await expect(device).toHaveAttribute("data-3d", "", { timeout: READY });
  await expect.poll(() => page.evaluate(() => Math.round(scrollY)), { timeout: 15_000 }).toBeGreaterThan(left - 5);
  await expect(device).toHaveAttribute("data-landed", "");
});
