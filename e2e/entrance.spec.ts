import { expect, test, type Page } from "@playwright/test";

const phase = (page: Page) => page.locator("[data-entrance-phase]");
const heroClip = (page: Page) => page.locator("[data-hero]").evaluate((el) => getComputedStyle(el).clipPath);

test("plays once, then settles", async ({ page }) => {
  await page.goto("/");
  await expect(phase(page)).not.toHaveAttribute("data-entrance-phase", "done", { timeout: 500 });
  await expect(phase(page)).toHaveAttribute("data-entrance-phase", "done", { timeout: 15_000 });
  await expect(page.locator("[data-hero-menu] li").first()).toBeVisible();
});

test("a second visit in the same session skips it", async ({ page }) => {
  await page.goto("/");
  await expect(phase(page)).toHaveAttribute("data-entrance-phase", "done", { timeout: 15_000 });
  await page.reload();
  await expect(phase(page)).toHaveAttribute("data-entrance-phase", "done", { timeout: 1_500 });
});

test("pressing Tab finishes it and the skip link is usable", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  await page.waitForTimeout(300);
  await page.keyboard.press("Tab");
  await expect(phase(page)).toHaveAttribute("data-entrance-phase", "done", { timeout: 1_000 });
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  expect(await heroClip(page)).not.toContain("100%");
});

test("scrolling finishes it", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  await page.waitForTimeout(300);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 400);
  await expect(phase(page)).toHaveAttribute("data-entrance-phase", "done", { timeout: 1_000 });
});

test("deep links skip it", async ({ page }) => {
  await page.goto("/#music");
  await expect(phase(page)).toHaveAttribute("data-entrance-phase", "done", { timeout: 1_500 });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("never plays", async ({ page }) => {
    await page.goto("/");
    await expect(phase(page)).toHaveAttribute("data-entrance-phase", "done", { timeout: 1_500 });
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the hero is never left clipped", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(4_500);
    expect(await heroClip(page)).not.toContain("100%");
  });
});

test("if the script never takes over, the failsafe unclips the hero within 4 seconds", async ({ page }) => {
  // Simulate "pre-paint ran, app JS crashed": block the Next.js bundles but keep the inline script.
  await page.route(/\/_next\/static\/chunks\//, (route) => route.abort());
  await page.goto("/");
  await page.waitForTimeout(4_500);
  expect(await heroClip(page)).not.toContain("100%");
});
