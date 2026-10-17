import { expect, test } from "@playwright/test";

const screen = (page: import("@playwright/test").Page) => page.locator("[data-hero] [data-screen]");

test("the first visit of a session powers the screen on, once", async ({ page }) => {
  // Record data-boot as it changes; the power-on is quicker than a poll under load.
  await page.addInitScript(() => {
    const seen: (string | null)[] = ((window as unknown as { __boot: (string | null)[] }).__boot = []);
    new MutationObserver(() => seen.push(document.documentElement.getAttribute("data-boot"))).observe(document, { attributes: true, subtree: true, attributeFilter: ["data-boot"] });
  });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-boot", { timeout: 3_000 });
  expect(await page.evaluate(() => (window as unknown as { __boot: (string | null)[] }).__boot)).toEqual(["pending", null]);
  await expect(screen(page)).toContainText("SIDE A");
  await expect(screen(page)).toContainText("01 about");
  await page.reload();
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  await expect(page.locator("html")).not.toHaveAttribute("data-boot");
});

test("a deep link skips the power-on", async ({ page }) => {
  await page.goto("/#events");
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  await expect(page.locator("html")).not.toHaveAttribute("data-boot");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("skips the power-on: the screen is lit from the first frame", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-boot");
    await expect(screen(page)).toContainText("SIDE A");
  });
});
