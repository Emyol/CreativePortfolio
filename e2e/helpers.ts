import { expect, type Page } from "@playwright/test";

/** Navigate and wait for hydration: MotionProvider sets <html data-tier> once React is live. */
export async function gotoReady(page: Page, url: string) {
  const res = await page.goto(url);
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  return res;
}

/** The chapter heading is near the top, or the page is scrolled as far as it goes (last chapters). */
export async function headingAtTop(page: Page, id: string) {
  const state = () =>
    page.locator(`#${id}-title`).evaluate((el) => {
      const top = el.getBoundingClientRect().top;
      const atBottom = window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 2;
      return top >= 0 && (top < 200 || atBottom);
    });
  await expect.poll(state).toBe(true);
}
