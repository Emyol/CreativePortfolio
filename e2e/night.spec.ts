import { expect, test, type Page } from "./fixtures";
import sharp from "sharp";
import { gotoReady } from "./helpers";

// Night (spec "The desk, pushed further"): lighting, not a theme. The room darkens because
// its light goes out, the lamp's warm pool follows the pointer, the paper stays paper under
// a warm tint, and every text keeps 4.5:1: the DOM's, and what the 3D prints (the key labels
// on the plate, the tapes' labels in the pool), measured here in the pixels as drawn.

type Point = { x: number; y: number };

test.beforeEach(() => test.setTimeout(90_000));
test.beforeAll(async ({ request }) => {
  for (const p of ["/", "/events", "/events/fixture-event-1"]) await request.get(p);
});

const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const rgbOf = (css: string) => css.match(/[\d.]+/g)!.slice(0, 3).map(Number) as [number, number, number];

/** Starts every visit of this page at night (the stored choice wins over the system's). */
const atNight = (page: Page, on = true) => page.addInitScript((v) => localStorage.setItem("side-a:night", v), on ? "on" : "off");

async function deskReady(page: Page, url = "/") {
  await gotoReady(page, url);
  await page.waitForSelector("[data-desk-view][data-ready]", { state: "attached", timeout: 30_000 });
}

const roomColour = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);

/** Where the 3D prints a key's label or a tape's sub-line (window.__deskPrint, a dev-only hook). */
const printQuad = (page: Page, id: string) =>
  page.evaluate((t) => (window as unknown as { __deskPrint: (id: string) => Point[] | null }).__deskPrint(t), id);
const project = (page: Page, id: string) =>
  page.evaluate((t) => {
    const r = (window as unknown as { __deskProject: (id: string) => DOMRect | null }).__deskProject(t);
    return r && { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, id);

/**
 * Printed text on the 3D as lit, whatever its size on screen (the tapes' sub-lines are a few
 * px tall at 1440 wide, where antialiasing alone would decide a measure of the glyphs): its
 * band painted solid in its ink, then in what it is printed on (window.__deskSwatch, a
 * dev-only hook), each screenshot pixel of the band compared between the two. Where the
 * swatch changes nothing (another tape lying over it) is left out; the band's median
 * pixel is the print as lit, pulled in from its edges so their antialiasing stays out.
 */
async function printAsLit(page: Page, id: string) {
  const quad = await printQuad(page, id);
  if (!quad) throw new Error(`${id}'s print is not on screen`);
  const swatch = (mode: "print" | "ground" | null) =>
    page.evaluate(
      async ([t, m]) => {
        (window as unknown as { __deskSwatch: (id: string, mode: string | null) => void }).__deskSwatch(t as string, m);
        for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r));
      },
      [id, mode] as const,
    );
  await swatch("print");
  const print = await sharp(await page.screenshot()).raw().toBuffer({ resolveWithObject: true });
  await swatch("ground");
  const ground = await sharp(await page.screenshot()).raw().toBuffer({ resolveWithObject: true });
  await swatch(null);
  const c = quad.reduce((a, p) => ({ x: a.x + p.x / 4, y: a.y + p.y / 4 }), { x: 0, y: 0 });
  const q = quad.map((p) => ({ x: c.x + (p.x - c.x) * 0.9, y: c.y + (p.y - c.y) * 0.8 }));
  const inside = (x: number, y: number) => {
    let hit = false;
    for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
      if (q[i].y > y !== q[j].y > y && x < ((q[j].x - q[i].x) * (y - q[i].y)) / (q[j].y - q[i].y) + q[i].x) hit = !hit;
    }
    return hit;
  };
  const { width, height, channels } = print.info;
  const ratios: number[] = [];
  let lp = 0;
  let lg = 0;
  for (let y = Math.max(0, Math.floor(Math.min(...q.map((p) => p.y)))); y < Math.min(height, Math.max(...q.map((p) => p.y))); y++)
    for (let x = Math.max(0, Math.floor(Math.min(...q.map((p) => p.x)))); x < Math.min(width, Math.max(...q.map((p) => p.x))); x++) {
      if (!inside(x + 0.5, y + 0.5)) continue;
      const k = (y * width + x) * channels;
      const a = lum(print.data[k], print.data[k + 1], print.data[k + 2]);
      const b = lum(ground.data[k], ground.data[k + 1], ground.data[k + 2]);
      if (ratio(a, b) < 1.15) continue; // covered: the swatch changed nothing here
      ratios.push(ratio(a, b));
      lp += a;
      lg += b;
    }
  ratios.sort((a, b) => a - b);
  const n = ratios.length;
  return { contrast: ratios[Math.floor(n / 2)] ?? 0, print: +(lp / n).toFixed(3), ground: +(lg / n).toFixed(3), pixels: n };
}

const TAPES = ["about", "events", "mixtape", "people", "made", "on-rotation"];
const KEYS = ["key0", "key1", "key2", "key3"];

async function expectPrint(page: Page, ids: string[], when: string) {
  for (const id of ids) {
    const m = await printAsLit(page, id);
    expect(m.pixels, `${id}'s print measured ${when}`).toBeGreaterThan(30);
    expect(m.contrast, `${id}'s print ${when} ${JSON.stringify(m)}`).toBeGreaterThanOrEqual(4.5);
  }
}

/**
 * Every rendered DOM text against what it sits on: its colour over the backgrounds under it
 * (each ancestor's, composited from the page up, the room at the bottom), at the opacity
 * it is drawn with. The warm night paper is a background colour, so it is measured too.
 */
const domText = (page: Page, skip: string) =>
  page.evaluate((skip) => {
    const parse = (c: string) => {
      const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0];
      return { r: m[0], g: m[1], b: m[2], a: c.startsWith("rgba") || c.includes("/") ? (m[3] ?? 1) : 1 };
    };
    const over = (top: { r: number; g: number; b: number; a: number }, under: { r: number; g: number; b: number }) => ({
      r: top.r * top.a + under.r * (1 - top.a),
      g: top.g * top.a + under.g * (1 - top.a),
      b: top.b * top.a + under.b * (1 - top.a),
    });
    const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const lum = (c: { r: number; g: number; b: number }) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
    const html = parse(getComputedStyle(document.documentElement).backgroundColor);
    const out: { text: string; contrast: number; fg: string; bg: string }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || seen.has(el) || !n.textContent?.trim()) continue;
      seen.add(el);
      if (el.closest(`script, style, noscript, .sr-only, [hidden]${skip ? `, ${skip}` : ""}`)) continue;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (s.visibility !== "visible" || r.width < 2 || r.height < 2) continue;
      let opacity = 1;
      const chain: Element[] = [];
      for (let a: Element | null = el; a; a = a.parentElement) {
        chain.push(a);
        opacity *= Number(getComputedStyle(a).opacity);
      }
      if (opacity < 0.99) continue; // fading in or out: not at rest
      let bg = { r: html.r, g: html.g, b: html.b };
      for (const a of chain.reverse()) {
        if (a === document.documentElement) continue;
        const c = parse(getComputedStyle(a).backgroundColor);
        if (c.a > 0) bg = over(c, bg);
      }
      const fg = over(parse(s.color), bg);
      const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
      out.push({
        text: n.textContent.trim().slice(0, 40),
        contrast: (hi + 0.05) / (lo + 0.05),
        fg: s.color,
        bg: `rgb(${[bg.r, bg.g, bg.b].map(Math.round).join(", ")})`,
      });
    }
    return out;
  }, skip);

/** `skip`: text printed on images, measured in its pixels instead. */
async function expectDomText(page: Page, where: string, include: string[], skip = "") {
  const texts = await domText(page, skip);
  const seen = texts.map((t) => t.text);
  for (const text of include) expect(seen, `"${text}" is measured ${where}`).toContainEqual(expect.stringContaining(text));
  for (const t of texts) expect(t.contrast, `"${t.text}" (${t.fg} on ${t.bg}) ${where}`).toBeGreaterThanOrEqual(4.5);
}

test("night darkens the room behind the desk; day's room is light", async ({ page }) => {
  await atNight(page, false);
  await deskReady(page);
  const day = rgbOf(await roomColour(page));
  expect(lum(...day)).toBeGreaterThan(0.6);
  await page.getByRole("button", { name: "Night lamp" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-night", "");
  await page.waitForTimeout(500);
  const night = rgbOf(await roomColour(page));
  expect(night).not.toEqual(day);
  expect(lum(...night), `the night room ${night}`).toBeLessThan(0.02);
  // The body lets the room through to the desk.
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
});

/** Holds the page's own scripts back until `release`, so what shows is the server's HTML and the pre-paint script alone. */
async function holdScripts(page: Page) {
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route("**/_next/static/**/*.js", async (route) => {
    await held;
    await route.continue();
  });
  return release;
}

for (const how of ["the system's dark preference", "a stored choice"] as const) {
  test(`a night visit (${how}) is dark from its first paint, before the page's script runs`, async ({ page }) => {
    if (how === "a stored choice") await atNight(page);
    else await page.emulateMedia({ colorScheme: "dark" });
    const release = await holdScripts(page);
    await page.goto("/events", { waitUntil: "domcontentloaded" });
    // Not hydrated yet (MotionProvider sets data-tier), and already the night room.
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-tier"))).toBe(false);
    await expect(page.locator("html")).toHaveAttribute("data-night", "");
    expect(lum(...rgbOf(await roomColour(page))), "the room before the script").toBeLessThan(0.02);
    release();
    await page.waitForSelector("html[data-tier]", { state: "attached" });
    await expect(page.locator("html")).toHaveAttribute("data-night", "");
    expect(lum(...rgbOf(await roomColour(page))), "the room once the desk runs").toBeLessThan(0.02);
  });
}

test("the pre-paint leaves the day room on a day visit, and off the desk's routes", async ({ page }) => {
  const release = await holdScripts(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-night"))).toBe(false);
  expect(lum(...rgbOf(await roomColour(page)))).toBeGreaterThan(0.6);
  release();
  await page.emulateMedia({ colorScheme: "dark" });
  await gotoReady(page, "/tracklist");
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-night"))).toBe(false);
});

test("the night dot field shows on the dark room, away from the lamp too", async ({ page }) => {
  await atNight(page);
  await deskReady(page);
  await page.mouse.move(1300, 850); // the lamp to the lower right, off the patch
  await page.waitForTimeout(300);
  // A patch at the top left, clear of the 3D and of the lamp's lit dots.
  const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 120, height: 80 } });
  const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
  const lums: number[] = [];
  for (let k = 0; k < data.length; k += info.channels) lums.push(lum(data[k], data[k + 1], data[k + 2]));
  const room = Math.min(...lums);
  const dot = Math.max(...lums);
  expect(room).toBeLessThan(0.02);
  expect(dot - room, "the rest dots stand out from the room").toBeGreaterThan(0.004);
});

test("switching night eases the room over about 0.3 s", async ({ page }) => {
  await atNight(page, false);
  await deskReady(page);
  const day = rgbOf(await roomColour(page));
  const seen = await page.evaluate(async () => {
    const read = () => getComputedStyle(document.documentElement).backgroundColor;
    document.querySelector<HTMLButtonElement>("[data-lamp-cord]")!.click();
    const out: string[] = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 500) {
      await new Promise((r) => requestAnimationFrame(r));
      out.push(`${Math.round(performance.now() - t0)}:${read()}`);
    }
    return out;
  });
  const end = rgbOf(seen.at(-1)!.split(":")[1]);
  const between = seen.filter((s) => {
    const c = rgbOf(s.split(":")[1]);
    return c.join() !== day.join() && c.join() !== end.join();
  });
  // Some frames in between (more than a cut's one), and none well after 0.3 s (a busy
  // machine's frames come late, so the bound has room).
  expect(between.length, seen.join(" ")).toBeGreaterThan(1);
  expect(Math.max(...between.map((s) => Number(s.split(":")[0]))), seen.join(" ")).toBeLessThan(480);
});

test("under reduced motion the night switch is instant", async ({ page }) => {
  await atNight(page, false);
  await deskReady(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-tier", "none");
  const first = await page.evaluate(async () => {
    document.querySelector<HTMLButtonElement>("[data-lamp-cord]")!.click();
    await new Promise((r) => requestAnimationFrame(r));
    return getComputedStyle(document.documentElement).backgroundColor;
  });
  await page.waitForTimeout(400);
  expect(first).toBe(await roomColour(page));
  expect(lum(...rgbOf(first))).toBeLessThan(0.02);
});

test("a visit that starts at night opens dark, without easing in from day", async ({ page }) => {
  await atNight(page);
  // The room's colour every frame from the first: the server's day until night goes on, then
  // night at once, never a colour in between.
  await page.addInitScript(() => {
    const seen: string[] = ((window as unknown as { __room: string[] }).__room = []);
    const tick = () => {
      if (document.documentElement) seen.push(getComputedStyle(document.documentElement).backgroundColor);
      if (seen.length < 120) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await gotoReady(page, "/");
  await expect(page.locator("html")).toHaveAttribute("data-night", "");
  await page.waitForTimeout(600);
  const seen = [...new Set(await page.evaluate(() => (window as unknown as { __room: string[] }).__room))];
  const night = await roomColour(page);
  expect(lum(...rgbOf(night))).toBeLessThan(0.02);
  expect(seen.filter((c) => c !== night && c !== "rgb(228, 230, 233)" && c !== "rgba(0, 0, 0, 0)"), seen.join(" ")).toEqual([]);
});

test("at night the key labels on the plate and the tape labels, in the lamp's pool and out of it, read at 4.5:1", async ({ page }) => {
  await atNight(page);
  await deskReady(page);
  // The lamp over the player (its pool on the plate and the keys), then on a tape (its label
  // in the middle of the pool, the light at its strongest), then off the desk.
  for (const at of ["player", "events", "mixtape", null]) {
    const p = at ? (await project(page, at))! : { x: 5, y: 5 };
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(800);
    await expectPrint(page, [...KEYS, ...TAPES], `at night, the lamp on ${at ?? "the room's corner"}`);
  }
});

test("by day the key labels and the tape labels still read at 4.5:1", async ({ page }) => {
  await atNight(page, false);
  await deskReady(page);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(500);
  await expectPrint(page, [...KEYS, ...TAPES], "by day");
});

test("on a track page at night the corner player's key labels and the tape in it read at 4.5:1", async ({ page }) => {
  await atNight(page);
  await deskReady(page, "/events");
  await page.waitForTimeout(600); // the direct load's settle
  for (const at of [null, "player"] as const) {
    const p = at ? (await project(page, at))! : { x: 700, y: 400 };
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(800);
    await expectPrint(page, [...KEYS, "events"], `in the corner, the pointer ${at ? "on the player" : "on the J-card"}`);
  }
});

test("at night every DOM text on the desk reads at 4.5:1: the cord, the hint, a tape held up", async ({ page }) => {
  await atNight(page);
  await deskReady(page);
  await page.waitForTimeout(400);
  await expectDomText(page, "on the desk", ["night", "drag to throw"]);
  await page.getByRole("link", { name: "03 mixtape, tape" }).focus();
  const inspect = page.getByRole("button", { name: "inspect 03 mixtape" });
  await expect.poll(() => inspect.evaluate((el) => getComputedStyle(el).opacity)).toBe("1"); // it fades in
  await expectDomText(page, "with a tape's inspect button showing", ["night", "inspect"]);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "put it back" })).toBeFocused();
  await page.waitForTimeout(400);
  await expectDomText(page, "holding a tape", ["night", "03", "drag to turn it over", "play it", "put it back"]);
});

for (const url of ["/events", "/events/fixture-event-1"]) {
  test(`at night every DOM text on ${url} reads at 4.5:1 on the warm paper`, async ({ page }) => {
    await atNight(page);
    await deskReady(page, url);
    await page.waitForTimeout(800);
    // The paper is warmer than by day, and never dimmer.
    const paper = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--paper").trim());
    const [r, g, b] = rgbOf(await page.evaluate((c) => {
      const el = document.createElement("i");
      el.style.color = c;
      document.body.append(el);
      const out = getComputedStyle(el).color;
      el.remove();
      return out;
    }, paper));
    expect(r).toBeGreaterThan(b);
    expect(lum(r, g, b)).toBeGreaterThanOrEqual(lum(0xee, 0xf0, 0xf2));
    await expectDomText(page, `on ${url}`, ["events", "SIDE A", "SIDE B", "⏏", "Night", "mixtape"]);
  });
}

test("the device renders take the lamp's light at night, not new art", async ({ page }) => {
  await atNight(page, false);
  await deskReady(page, "/events");
  // The events device is the CSS stand-in for now: the lamp's warm light laid over its bezel.
  const tint = () => page.locator("[data-device]").first().evaluate((el) => getComputedStyle(el, "::before").backgroundColor);
  const alpha = (c: string) => Number(c.match(/[\d.]+/g)![3] ?? 1);
  expect(alpha(await tint())).toBe(0);
  await page.getByRole("navigation", { name: "Transport" }).getByRole("button", { name: "Night" }).click();
  await expect.poll(async () => alpha(await tint())).toBeGreaterThan(0.2);
  // The screen is lit already, above the light.
  expect(await page.locator("[data-device] [data-device-screen]").first().evaluate((el) => getComputedStyle(el).zIndex)).toBe("1");
});

test("under reduced motion the cord, the hint, the inspect bar and the J-card's settle don't animate", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await deskReady(page);
  const still = () =>
    page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.playState === "running")
        .map((a) => (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? "?"),
    );
  const durations = (sel: string) =>
    page.locator(sel).evaluateAll((els) => els.map((el) => `${getComputedStyle(el).transitionDuration}|${getComputedStyle(el).animationName}`));
  for (const d of await durations("[data-lamp-cord], [data-lamp-cord] > span, [data-desk-hint]")) expect(d).toBe("0s|none");
  const cord = (await page.getByRole("button", { name: "Night lamp" }).boundingBox())!;
  await page.mouse.move(cord.x + cord.width / 2, cord.y + cord.height / 2);
  await page.mouse.down();
  expect(await still()).toEqual([]);
  await page.mouse.up();
  expect(await still()).toEqual([]);
  await page.getByRole("link", { name: "03 mixtape, tape" }).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-holding]")).toBeVisible();
  expect(await durations("[data-holding]")).toEqual(["0s|none"]);
  expect(await still()).toEqual([]);
  await page.keyboard.press("Escape");

  // A direct load of a track: its J-card is already open, and under reduce does not settle.
  await gotoReady(page, "/events");
  expect(await page.locator("main[data-jcard]").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(await still()).toEqual([]);
});

test("without WebGL at night the room is dark and the sprite player's print keeps 4.5:1 @sprite", async ({ page }) => {
  await atNight(page);
  await gotoReady(page, "/");
  await expect(page.locator("[data-sprite-desk]")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-night", "");
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  await page.waitForTimeout(500);
  expect(lum(...rgbOf(await roomColour(page)))).toBeLessThan(0.02);
  // The sprite art takes the lamp's light, never new art.
  expect(await page.locator("[data-sprite-desk] img").first().evaluate((el) => getComputedStyle(el).filter)).toContain("sepia(0.3)");
  await expectDomText(page, "on the sprite desk", ["night", "drag to throw"], "[data-sprite-desk], [data-sprite]");

  // The printed labels against what lies under their glyphs: drawn, then hidden.
  const sel = '[data-player-keys] a > span:last-child, [data-tape-links] [data-tape]:not([data-away]) [data-print], [data-sprite-desk] [data-print]';
  const targets = await page.locator(sel).evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { text: e.textContent ?? "", color: getComputedStyle(e).color, box: [r.x, r.y, r.width, r.height].map(Math.round) };
    }),
  );
  expect(targets.length).toBe(4 + 6 + 1); // the keys, the tapes, the nameplate
  const shown = await page.screenshot();
  await page.addStyleTag({ content: `:is(${sel}) { color: transparent !important; text-shadow: none !important; }` });
  const hidden = await page.screenshot();
  const [a, b] = await Promise.all([shown, hidden].map((s) => sharp(s).raw().toBuffer({ resolveWithObject: true })));
  const w = a.info.width;
  const ch = a.info.channels;
  for (const { text, color, box } of targets) {
    const lt = lum(...rgbOf(color));
    let min = Infinity;
    const [x0, y0, bw, bh] = box;
    for (let y = y0; y < y0 + bh; y++)
      for (let x = x0; x < x0 + bw; x++) {
        const k = (y * w + x) * ch;
        const d = a.data;
        const e = b.data;
        if (Math.abs(d[k] - e[k]) + Math.abs(d[k + 1] - e[k + 1]) + Math.abs(d[k + 2] - e[k + 2]) < 60) continue;
        min = Math.min(min, ratio(lt, lum(e[k], e[k + 1], e[k + 2])));
      }
    expect(min, `"${text}" at night`).toBeGreaterThanOrEqual(4.5);
  }
});
