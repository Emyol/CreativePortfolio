import { expect, type Page } from "@playwright/test";

/** Navigate and wait for hydration: MotionProvider sets <html data-tier> once React is live. */
export async function gotoReady(page: Page, url: string) {
  const res = await page.goto(url);
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  return res;
}

/**
 * The chapter heading is near the top, or the page is scrolled as far as it goes (last
 * chapters). A track that holds lands where it holds (centred above the dock when it fits),
 * so for those: its arrival has finished and its heading is on screen above the dock.
 */
export async function headingAtTop(page: Page, id: string) {
  const state = () =>
    page.locator(`#${id}-title`).evaluate((el) => {
      const top = el.getBoundingClientRect().top;
      const section = el.closest("[data-arrival]");
      if (section) return section.getAttribute("data-arrival") === "1.00" && top >= 0 && top < window.innerHeight - 110;
      const atBottom = window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 2;
      return top >= 0 && (top < 200 || atBottom);
    });
  await expect.poll(state).toBe(true);
}
