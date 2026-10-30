import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";
import { gotoReady } from "./helpers";

// Folded from v1's structure.spec: the desk and a track's J-card, judged in their final
// states. The events pages and the track list have their own (events.spec, tracklist.spec).
test.use({ reducedMotion: "reduce" });

for (const url of ["/", "/about", "/mixtape", "/people", "/made", "/on-rotation"]) {
  test(`${url} has no axe violations at WCAG 2.1 AA`, async ({ page }) => {
    await gotoReady(page, url);
    // The 3D or the sprite player is in, and a track's J-card has faded in.
    await page.waitForSelector("[data-desk-view][data-ready], [data-sprite-desk]", { state: "attached", timeout: 30_000 });
    await page.waitForTimeout(400);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
}
