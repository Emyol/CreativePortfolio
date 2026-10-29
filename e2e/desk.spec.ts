import { expect, test, type Page } from "@playwright/test";
import { gotoReady } from "./helpers";

type Rect = { x: number; y: number; width: number; height: number };

// Where the 3D draws a tape (window.__deskProject, a dev-only hook), for the hands-on tests:
// the drag and the double-click aim at the tape itself, not at its link's box.
async function tapeAt(page: Page, id: string): Promise<{ x: number; y: number }> {
  const r = await page.evaluate((t) => {
    const rect = (window as unknown as { __deskProject?: (id: string) => DOMRect | null }).__deskProject?.(t);
    return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
  }, id);
  if (!r) throw new Error(`tape ${id} is not on screen`);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

async function deskReady(page: Page, url = "/") {
  await gotoReady(page, url);
  await page.waitForSelector("[data-desk-view][data-ready]", { state: "attached", timeout: 30_000 });
}

const project = (page: Page, id: string) =>
  page.evaluate((t) => {
    const r = (window as unknown as { __deskProject: (id: string) => DOMRect | null }).__deskProject(t);
    return r && ({ x: r.x, y: r.y, width: r.width, height: r.height } as Rect);
  }, id);

// The 3D loads three.js and the model on a dev server that compiles on demand.
test.beforeEach(() => test.setTimeout(60_000));

test.beforeAll(async ({ request }) => {
  // Compile the routes once, so a client navigation isn't waiting on the dev server.
  for (const p of ["/", "/about", "/events", "/people"]) await request.get(p);
});

test("the desk state follows the route", async ({ page }) => {
  await deskReady(page);
  await expect(page.locator("html")).toHaveAttribute("data-desk", "desk");
  await page.getByRole("link", { name: "01 about, tape" }).click();
  await expect(page).toHaveURL(/\/about$/, { timeout: 10_000 });
  await expect(page.locator("html")).toHaveAttribute("data-desk", "deck");
  await expect(page.locator("html")).toHaveAttribute("data-loaded", "about");
});

test("three quick picks end on the last one, with the 3D matching", async ({ page }) => {
  await deskReady(page);
  const spots = [];
  for (const id of ["about", "events", "people"]) spots.push({ id, ...(await tapeAt(page, id)) });
  // The about, events and people links pressed in the page at 0, 100 and 200 ms: the
  // driver's round trips alone can take longer than 300 ms on a loaded machine. A press on
  // a link goes on to the 3D's view, which then holds the pointer (capture), so the release
  // lands on the view.
  const spread = await page.evaluate(
    (points) =>
      new Promise<number>((done) => {
        const el = document.querySelector<HTMLElement>("[data-desk-view]")!;
        const t0 = performance.now();
        points.forEach((p, i) =>
          setTimeout(() => {
            const link = document.querySelector<HTMLElement>(`[data-tape="${p.id}"] a`)!;
            const init = { bubbles: true, clientX: p.x, clientY: p.y, button: 0, pointerId: 1, pointerType: "mouse", isPrimary: true };
            link.dispatchEvent(new PointerEvent("pointerdown", { ...init, buttons: 1 }));
            el.dispatchEvent(new PointerEvent("pointerup", { ...init, buttons: 0 }));
            if (i === points.length - 1) done(performance.now() - t0);
          }, i * 100),
        );
      }),
    spots,
  );
  expect(spread).toBeLessThan(300);
  await page.waitForTimeout(2000);
  await expect(page).toHaveURL(/\/people$/);
  await expect(page.locator("html")).toHaveAttribute("data-desk", "deck");
  await expect(page.locator("html")).toHaveAttribute("data-loaded", "people");
  await expect(page.locator("[data-desk-view]")).toHaveAttribute("data-seated", "people");
});

test("a thrown tape slides on and stays on the desk", async ({ page }) => {
  await deskReady(page);
  const start = await tapeAt(page, "people");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // Down and right, into the open desk below the player, 200 px in a few quick moves.
  for (let i = 1; i <= 8; i++) await page.mouse.move(start.x + i * 22, start.y + i * 11);
  await page.mouse.up();
  await page.waitForTimeout(1500);
  const end = await tapeAt(page, "people");
  expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeGreaterThan(200);
  await expect(page).toHaveURL(/\/$/);
  expect(await project(page, "people")).not.toBeNull();
});

test("a double-click picks a tape up and Esc puts it back", async ({ page }) => {
  await deskReady(page);
  // Hovered, a tape lifts: aim at where it is once lifted.
  const rest = await tapeAt(page, "mixtape");
  await page.mouse.move(rest.x, rest.y);
  await page.waitForTimeout(500);
  const p = await tapeAt(page, "mixtape");
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(100);
  await page.mouse.dblclick(p.x, p.y);
  const putBack = page.getByRole("button", { name: "put it back" });
  await expect(putBack).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(putBack).toBeHidden();
  await page.waitForTimeout(400);
  await expect(page).toHaveURL(/\/$/);
});
