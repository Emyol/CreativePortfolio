import type { Page } from "@playwright/test";

/** Navigate and wait for hydration: MotionProvider sets <html data-tier> once React is live. */
export async function gotoReady(page: Page, url: string) {
  const res = await page.goto(url);
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  return res;
}
