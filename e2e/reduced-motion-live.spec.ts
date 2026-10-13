import { expect, test, type Page } from "@playwright/test";
import { gotoReady } from "./helpers";

/** The invariant: nothing in the page is left hidden, clipped, half-drawn or moving. */
async function expectSettled(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-tier", "none");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("[data-entrance-phase]")).toHaveAttribute("data-entrance-phase", "done");
  const report = await page.evaluate(() => ({
    clipped: getComputedStyle(document.querySelector("[data-hero]")!).clipPath.includes("100%"),
    unwritten: [...document.querySelectorAll("svg[data-phase]")].filter((s) => s.getAttribute("data-phase") !== "done").length,
    bleeding: [...document.querySelectorAll<HTMLElement>("[data-ink-bleed]")].filter((el) => el.style.getPropertyValue("--r") !== "").length,
    hidden: [...document.querySelectorAll<HTMLElement>("[style]")].filter((el) => el.style.opacity === "0" || el.style.visibility === "hidden").map((el) => el.outerHTML.slice(0, 120)),
    tilted: [...document.querySelectorAll<HTMLElement>("[data-tilt]")].filter((el) => el.style.transform !== "").length,
    clippedLines: [...document.querySelectorAll<HTMLElement>("[data-letter-line]")].filter((el) => el.style.clipPath !== "").length,
  }));
  expect(report).toEqual({ clipped: false, unwritten: 0, bleeding: 0, hidden: [], tilted: 0, clippedLines: 0 });
}

test("switching on reduced motion mid-entrance settles everything", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  await page.waitForTimeout(400); // mid-unroll
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expectSettled(page);
});

test("switching on reduced motion mid-scroll settles everything", async ({ page }) => {
  await gotoReady(page, "/#about");
  await page.keyboard.press("2"); // Events: prints bleeding, gust blowing
  await page.mouse.move(700, 500); // a tile may be tilting
  await page.waitForTimeout(250);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expectSettled(page);
});

test("turning it back off restores smooth scroll without a reload", async ({ page }) => {
  await gotoReady(page, "/#music");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveClass(/lenis/);
});
