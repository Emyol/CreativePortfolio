import { expect, test } from "./fixtures";
import { gotoReady } from "./helpers";

// v1's letter rose into place line by line as the scroll page's About hold played; the desk
// has no holds, so the letter is plain text from the first frame, at any motion setting.
for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test.describe(`motion: ${reducedMotion}`, () => {
    test.use({ reducedMotion });

    test("the letter shows settled from the first frame, never hidden or split", async ({ page }) => {
      await page.goto("/about");
      await page.waitForSelector("html[data-tier]", { state: "attached" });
      const frames = await page.evaluate(
        () =>
          new Promise<{ opacity: number; split: number }[]>((done) => {
            const out: { opacity: number; split: number }[] = [];
            const el = document.querySelector("main[data-jcard=about] article")!;
            const tick = () => {
              out.push({ opacity: Number(getComputedStyle(el).opacity), split: el.querySelectorAll("p > span > span").length });
              if (out.length < 90) requestAnimationFrame(tick);
              else done(out);
            };
            tick();
          }),
      );
      expect(frames.filter((f) => f.opacity < 1 || f.split > 0)).toEqual([]);
    });
  });
}
