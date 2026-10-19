import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "no-preference" });

const screen = (page: import("@playwright/test").Page) => page.locator("[data-hero] [data-screen]");
const recordBoot = async (page: import("@playwright/test").Page) =>
  page.addInitScript(() => {
    const seen: (string | null)[] = ((window as unknown as { __boot: (string | null)[] }).__boot = []);
    new MutationObserver(() => seen.push(document.documentElement.getAttribute("data-boot"))).observe(document, { attributes: true, subtree: true, attributeFilter: ["data-boot"] });
  });

test("the first visit plays the entrance once and settles", async ({ page }) => {
  await recordBoot(page);
  await page.goto("/");
  // The page opens as the player's dark screen, counting the tape in.
  await expect(page.locator("[data-boot-screen]")).toBeVisible({ timeout: 3_000 });
  await expect(page.locator("[data-boot-screen]")).toHaveText(/^\d{3}$|^SIDE A$/);
  await expect(page.locator("[data-boot-screen]")).toHaveCount(0, { timeout: 6_000 });
  await expect(page.locator("html")).not.toHaveAttribute("data-boot", { timeout: 6_000 });
  const seen = await page.evaluate(() => (window as unknown as { __boot: (string | null)[] }).__boot);
  expect(seen.at(-1)).toBeNull();
  await expect(screen(page)).toContainText("SIDE A");
  await expect(screen(page)).toContainText("01 about");
});

test("a reload plays it again, from the top", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot-screen]")).toBeVisible({ timeout: 3_000 });
  await page.keyboard.press("Escape"); // skip it
  await expect(page.locator("[data-boot-screen]")).toHaveCount(0);
  await page.mouse.wheel(0, 1500);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  await page.reload();
  await expect(page.locator("[data-boot-screen]")).toBeVisible({ timeout: 3_000 });
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator("[data-boot-screen]")).toHaveCount(0, { timeout: 12_000 });
});

test("any input skips it", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot-screen]")).toBeVisible({ timeout: 3_000 });
  await page.mouse.move(600, 400);
  await page.mouse.wheel(0, 40);
  await expect(page.locator("[data-boot-screen]")).toHaveCount(0, { timeout: 400 });
  await expect(screen(page)).toContainText("01 about");
});

test("links work during the entrance", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot-screen]")).toBeVisible({ timeout: 3_000 });
  await page.keyboard.press("2");
  await expect(page).toHaveURL(/#events$/);
});

test("a deep link skips it", async ({ page }) => {
  await page.goto("/#events");
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  await expect(page.locator("html")).not.toHaveAttribute("data-boot");
  await expect(page.locator("[data-boot-screen]")).toHaveCount(0);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("skips it: the screen is lit from the first frame", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-boot");
    await expect(page.locator("[data-boot-screen]")).toHaveCount(0);
    await expect(screen(page)).toContainText("SIDE A");
  });
});

test("coming back from another site doesn't replay it or lose the place", async ({ page }) => {
  await page.addInitScript(() => window.addEventListener("unload", () => {})); // no back/forward cache: a real reload
  await page.goto("/");
  await expect(page.locator("[data-boot-screen]")).toBeVisible({ timeout: 3_000 });
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-boot-screen]")).toHaveCount(0);
  await page.mouse.wheel(0, 1500);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  await page.waitForTimeout(600);
  await page.evaluate(() => ((window as unknown as { __mark: number }).__mark = 1));
  await page.goto("about:blank");
  await page.goBack();
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  expect(await page.evaluate(() => (window as unknown as { __mark?: number }).__mark)).toBeUndefined();
  await expect(page.locator("html")).not.toHaveAttribute("data-boot");
  await expect(page.locator("[data-boot-screen]")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300);
});

test("switching on reduced motion mid-entrance ends it", async ({ page }) => {
  // A slow model keeps the dark winding, so there is time to switch.
  await page.route("**/device/device.glb", () => {});
  await page.goto("/");
  await expect(page.locator("[data-boot-screen]")).toBeVisible({ timeout: 3_000 });
  await page.waitForTimeout(1200);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[data-boot-screen]")).toHaveCount(0, { timeout: 1_000 });
  await expect(page.locator("html")).not.toHaveAttribute("data-boot");
  await expect(screen(page)).toContainText("SIDE A");
});

test("pages reached from home keep the browser's own scroll restoration", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot-screen]")).toBeVisible({ timeout: 3_000 });
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => history.scrollRestoration)).toBe("manual");
  await page.locator("a[href^='/events/']").first().evaluate((a) => (a as HTMLAnchorElement).click());
  await expect(page).toHaveURL(/\/events\//);
  await expect.poll(() => page.evaluate(() => history.scrollRestoration)).toBe("auto");
});
