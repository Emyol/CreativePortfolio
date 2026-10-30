import { expect, test, type Locator, type Page } from "@playwright/test";
import { gotoReady } from "./helpers";

type Rect = { x: number; y: number; width: number; height: number };

const HINT = "drag to throw · double-click to read the back · pull the cord";
const PICK = ["PICK A TAPE", "six on the desk"];

const deskReady = async (page: Page, url = "/") => {
  await gotoReady(page, url);
  await page.waitForSelector("[data-desk-view][data-ready]", { state: "attached", timeout: 30_000 });
};

const project = (page: Page, id: string) =>
  page.evaluate((t) => {
    const r = (window as unknown as { __deskProject?: (id: string) => DOMRect | null }).__deskProject?.(t);
    return r ? ({ x: r.x, y: r.y, width: r.width, height: r.height } as Rect) : null;
  }, id);

const lastScreen = (page: Page) => page.evaluate(() => (window as unknown as { __deskScreen?: string[] | null }).__deskScreen ?? null);

const overlaps = (a: Rect, b: Rect) =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.5;

const boxes = async (loc: Locator) => {
  const out: [string, Rect][] = [];
  for (const el of await loc.all()) {
    const r = await el.boundingBox();
    if (r && (await el.isVisible())) out.push([(await el.getAttribute("aria-label")) ?? (await el.innerText()), r]);
  }
  return out;
};

// The 3D loads three.js and the model on a dev server that compiles on demand.
test.beforeEach(() => test.setTimeout(60_000));

test.beforeAll(async ({ request }) => {
  for (const p of ["/", "/about"]) await request.get(p);
});

/** On `/` the hint and the screen welcome a visit; a tape in and out, and the hint is gone. */
async function firstVisit(page: Page, has3D: boolean) {
  const hint = page.getByText(HINT, { exact: true });
  await expect(hint).toBeVisible();
  await expect.poll(() => lastScreen(page)).toEqual(PICK);
  if (has3D) await expect(page.locator("[data-desk-view]")).toHaveAttribute("data-screen", PICK.join("\n"));
  else for (const line of PICK) await expect(page.locator("[data-sprite-desk] [data-screen]")).toContainText(line);

  // Printed on paper: near-black ink in Space Mono, at least 4.5:1.
  const style = await hint.evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, background: s.backgroundColor, font: s.fontFamily };
  });
  expect(style.font).toMatch(/Space Mono/i);
  expect(contrast(style.color, style.background)).toBeGreaterThanOrEqual(4.5);

  await page.getByRole("link", { name: "01 about, tape" }).click();
  await expect(page).toHaveURL(/\/about$/, { timeout: 10_000 });
  await expect(hint).toHaveCount(0);
  await page.getByRole("navigation", { name: "Transport" }).getByRole("link", { name: "eject" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  await expect(page.locator("html")).toHaveAttribute("data-desk", "desk");
  await expect.poll(() => lastScreen(page)).toEqual(PICK);
  // Focus is back on the about tape, which the 3D lifts and cues; let go of it, and the
  // screen asks for a tape again.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  if (has3D) await expect(page.locator("[data-desk-view]")).toHaveAttribute("data-screen", PICK.join("\n"), { timeout: 10_000 });
  await expect(hint).toHaveCount(0);

  // Remembered by the browser: a reload still has no hint.
  await page.reload();
  await page.waitForSelector("html[data-tier]", { state: "attached" });
  await expect(page.getByRole("link", { name: "01 about, tape" })).toBeVisible();
  await expect(hint).toHaveCount(0);
}

test("on / the hint and PICK A TAPE welcome a visit, gone after a tape goes in and out", async ({ page }) => {
  await deskReady(page);
  await firstVisit(page, true);
});

test("without 3D the sprite player welcomes a visit the same way @sprite", async ({ page }) => {
  await gotoReady(page, "/");
  await page.waitForSelector("[data-sprite-desk]");
  await firstVisit(page, false);
});

test("/ has one main, the skip link's target, with the desk's h1", async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("main")).toHaveAttribute("id", "main");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Miel");
  await expect(page.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
});

/** The cord and the hint clear every tape, key, the player (its print) and each other. */
async function clearOfTheDesk(page: Page, player: Rect) {
  const fixed = [
    ["the lamp cord", (await page.locator("[data-lamp-cord]").boundingBox())!],
    ["the hint", (await page.locator("[data-desk-hint]").boundingBox())!],
  ] as const;
  const others: [string, Rect][] = [
    ["the player", player],
    ...(await boxes(page.locator("[data-tape-links] a"))),
    ...(await boxes(page.locator("[data-player-keys] a"))),
  ];
  const vw = page.viewportSize()!;
  for (const [name, r] of fixed) {
    expect(r, `${name} is on screen`).toBeTruthy();
    expect(r.x >= 0 && r.y >= 0 && r.x + r.width <= vw.width && r.y + r.height <= vw.height, `${name} ${JSON.stringify(r)} inside the view`).toBe(true);
    for (const [other, o] of others) expect(overlaps(r, o), `${name} ${JSON.stringify(r)} clear of ${other} ${JSON.stringify(o)}`).toBe(false);
  }
  expect(overlaps(fixed[0][1], fixed[1][1]), "the cord clear of the hint").toBe(false);
}

for (const [width, height] of [
  [1440, 900],
  [1280, 720],
] as const) {
  test(`at ${width}×${height} the lamp cord and the hint clear the tapes, the keys and the player`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await deskReady(page);
    await page.waitForTimeout(300); // a frame or two to place the links
    await clearOfTheDesk(page, (await project(page, "player"))!);
  });

  test(`at ${width}×${height} without 3D the lamp cord and the hint clear the desk @sprite`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await gotoReady(page, "/");
    await page.waitForSelector("[data-sprite-desk]");
    await clearOfTheDesk(page, (await page.locator("[data-sprite-desk] > div").boundingBox())!);
  });
}

/** The highest the about tape is drawn over `ms`, against where it started (no input meanwhile). */
const aboutRise = (page: Page, ms: number) =>
  page.evaluate(
    (span) =>
      new Promise<number>((done) => {
        const at = () => (window as unknown as { __deskProject: (id: string) => DOMRect | null }).__deskProject("about")!.y;
        const y0 = at();
        let top = y0;
        const t0 = performance.now();
        const step = () => {
          top = Math.min(top, at());
          if (performance.now() - t0 < span) requestAnimationFrame(step);
          else done(y0 - top);
        };
        requestAnimationFrame(step);
      }),
    ms,
  );

test("left alone for two seconds, the about tape nudges once", async ({ page }) => {
  await deskReady(page);
  expect(await aboutRise(page, 3500)).toBeGreaterThan(2);
  // Once: it settles and stays.
  expect(await aboutRise(page, 2500)).toBeLessThan(0.5);
});

test("under reduced motion the about tape holds still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await deskReady(page);
  expect(await aboutRise(page, 3500)).toBeLessThan(0.5);
});

test("input before the two seconds are up puts the nudge off", async ({ page }) => {
  await deskReady(page);
  const rise = aboutRise(page, 3000);
  // The pointer moving over an empty part of the desk, every half second.
  for (let i = 0; i < 6; i++) {
    await page.mouse.move(1380 - i * 4, 860);
    await page.waitForTimeout(450);
  }
  expect(await rise).toBeLessThan(0.5);
});

/** WCAG contrast of two computed `rgb()` colours (the background opaque). */
function contrast(fg: string, bg: string) {
  const rgb = (c: string) => c.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const lum = (c: number[]) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [a, b] = [lum(rgb(fg)), lum(rgb(bg))].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

test("a tape held up to read hides the hint, which comes back as it is put down", async ({ page }) => {
  await deskReady(page);
  const hint = page.locator("[data-desk-hint]");
  await expect(hint).toHaveCSS("opacity", "1");
  await page.getByRole("link", { name: "03 mixtape, tape" }).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "put it back" })).toBeFocused();
  await expect(hint).toHaveCSS("opacity", "0");
  await page.keyboard.press("Escape");
  await expect(hint).toHaveCSS("opacity", "1");
});
