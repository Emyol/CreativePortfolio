import { expect, test, type Page } from "@playwright/test";
import { gotoReady, headingAtTop } from "./helpers";

const API = "https://open.spotify.com/embed/iframe-api/v1";

// A stand-in for Spotify's iFrame API: an iframe-free embed whose controller reports
// playback every 250 ms once play() is called, like the real one.
const STUB = `
window.onSpotifyIframeApiReady({
  createController(el, opts, cb) {
    const frame = document.createElement("div");
    frame.setAttribute("data-fake-embed", opts.uri);
    frame.style.height = "152px";
    el.replaceWith(frame);
    const listeners = {};
    let timer = null, pos = 0, uri = opts.uri;
    const emit = (paused) => (listeners.playback_update || []).forEach((l) => l({ data: { playingURI: uri, isPaused: paused, isBuffering: false, duration: 30000, position: pos } }));
    const c = {
      loadEntity(u) { uri = u; pos = 0; },
      loadUri(u) { uri = u; pos = 0; },
      play() { clearInterval(timer); timer = setInterval(() => { pos += 250; emit(false); }, 250); emit(false); },
      pause() { clearInterval(timer); emit(true); },
      resume() { this.play(); },
      togglePlay() { timer ? this.pause() : this.play(); },
      destroy() { clearInterval(timer); frame.remove(); },
      addListener(ev, l) { (listeners[ev] ||= []).push(l); },
    };
    cb(c);
  },
});`;

const reels = (page: Page) => page.locator("[data-reel]").first().evaluate((el) => (el as HTMLElement).style.transform);

test("pressing play shows the song on the device screen and turns the reels", async ({ page }) => {
  await page.route(API, (route) => route.fulfill({ contentType: "text/javascript", body: STUB }));
  await gotoReady(page, "/#mixtape");
  await headingAtTop(page, "mixtape");
  await page.waitForTimeout(800); // let scroll momentum die away
  await page.getByRole("button", { name: "Play Fixture song 1 on Spotify" }).click();
  await expect(page.locator("[data-dock] [data-screen]")).toContainText("Fixture song 1");
  await expect(page.getByRole("status").filter({ hasText: "Now playing" })).toHaveText("Now playing: Fixture song 1 by Fixture artist");
  const a = await reels(page);
  await page.waitForTimeout(300);
  expect(await reels(page)).not.toBe(a);
  await expect(page.locator("[data-fake-embed]")).toBeVisible();
});

test("leaving for an event page stops the tape; coming back, the reels are still", async ({ page }) => {
  await page.route(API, (route) => route.fulfill({ contentType: "text/javascript", body: STUB }));
  await gotoReady(page, "/#mixtape");
  await headingAtTop(page, "mixtape");
  await page.getByRole("button", { name: "Play Fixture song 1 on Spotify" }).click();
  await expect(page.locator("[data-dock] [data-screen]")).toContainText("Fixture song 1");
  // Keyboard, like a visitor tabbing back: focus finishes the events hold, then Enter opens it.
  // (A pointer click on a card the REC playhead hasn't reached yet can't land: it's clipped away.)
  await page.locator("#events").getByRole("link").first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/events\//, { timeout: 15_000 });
  await page.goBack();
  await expect(page.locator("#mixtape")).toBeVisible({ timeout: 15_000 });
  // The restored scroll may set them coasting; with no song they must come to rest.
  await expect
    .poll(async () => {
      const a = await reels(page);
      await page.waitForTimeout(250);
      return (await reels(page)) === a;
    }, { timeout: 8_000 })
    .toBe(true);
  await expect(page.locator("[data-fake-embed]")).toHaveCount(0);
});

test("when Spotify is blocked, the deck says so and the plain links still work", async ({ page }) => {
  await page.route(API, (route) => route.abort());
  await gotoReady(page, "/#mixtape");
  await page.getByRole("button", { name: "Play Fixture song 1 on Spotify" }).click();
  await expect(page.locator("[data-deck]").getByRole("alert")).toHaveText("Spotify didn't load. Open the song in Spotify instead.", { timeout: 9_000 });
  await expect(page.getByRole("link", { name: "Open in Spotify: Fixture song 1" })).toHaveAttribute("href", /open\.spotify\.com\/track\//);
});

test("nothing from Spotify is requested before a press", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (r) => r.url().includes("spotify.com") && requested.push(r.url()));
  await gotoReady(page, "/#mixtape");
  await page.waitForTimeout(500);
  expect(requested).toEqual([]);
});

test.describe("phones", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the mixtape wraps long titles without sideways scroll", async ({ page }) => {
    await gotoReady(page, "/#mixtape");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});

test("reduced motion switched on mid-song freezes the reels, but the song and its clock go on", async ({ page }) => {
  await page.route(API, (route) => route.fulfill({ contentType: "text/javascript", body: STUB }));
  await gotoReady(page, "/#mixtape");
  await headingAtTop(page, "mixtape");
  await page.getByRole("button", { name: "Play Fixture song 1 on Spotify" }).click();
  const dockScreen = page.locator("[data-dock] [data-screen]");
  await expect(dockScreen).toContainText(/0:0[1-9]/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-tier", "none");
  const clockOf = async () => (await dockScreen.innerText()).match(/\d+:\d\d/)?.[0];
  const before = { reels: await page.locator("[data-reel]").evaluateAll((els) => els.map((el) => (el as HTMLElement).style.transform)), clock: await clockOf() };
  await page.waitForTimeout(1300);
  expect(await page.locator("[data-reel]").evaluateAll((els) => els.map((el) => (el as HTMLElement).style.transform))).toEqual(before.reels);
  expect(await clockOf()).not.toBe(before.clock);
  await expect(page.locator("[data-fake-embed]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause Fixture song 1" })).toBeVisible();
  await expect(page.locator("[data-hero] [data-led][data-on]")).toHaveCount(1);
});

test.describe("cueing", () => {
  test.use({ reducedMotion: "no-preference" });
  test("hovering a song cues it on the dock, and leaving clears it", async ({ page }) => {
    await gotoReady(page, "/#mixtape");
    await headingAtTop(page, "mixtape");
    const dock = page.locator("[data-dock] [data-screen]");
    await page.locator("#mixtape li").nth(1).hover();
    await expect(dock).toContainText("CUE Fixture song 2");
    await page.mouse.move(5, 5);
    await expect(dock).not.toContainText("CUE");
  });

  test("the titles print in as the mixtape arrives, and are whole once it has", async ({ page }) => {
    await gotoReady(page, "/#mixtape");
    await headingAtTop(page, "mixtape");
    const clip = await page.locator("#mixtape [data-print]").first().evaluate((el) => getComputedStyle(el).clipPath);
    expect(clip === "none" || /inset\(0px 0% 0px 0px\)|inset\(0px\)/.test(clip)).toBe(true);
    await expect(page.locator("#mixtape [data-print]").first()).toHaveText("Fixture song 1");
  });
});

test.describe("printing", () => {
  test.use({ reducedMotion: "no-preference" });
  test("partway through the hold, the later titles are still being printed", async ({ page }) => {
    await gotoReady(page, "/#events");
    await page.mouse.move(1400, 450);
    for (let i = 0; i < 80; i++) {
      await page.mouse.wheel(0, 80);
      await page.waitForTimeout(60);
      const a = Number(await page.locator("#mixtape").getAttribute("data-arrival"));
      if (a > 0.25 && a < 0.5) break;
    }
    const right = await page.locator("#mixtape [data-print]").last().evaluate((el) => /inset\(\S+ (\S+)%/.exec(getComputedStyle(el).clipPath)?.[1]);
    expect(Number(right)).toBeGreaterThan(0);
  });
});

test.describe("a long title", () => {
  test.use({ reducedMotion: "no-preference" });
  test("comes round on the dock's screen, and rests cut short once reduced motion is on", async ({ page }) => {
    await page.route(API, (route) => route.fulfill({ contentType: "text/javascript", body: STUB }));
    await gotoReady(page, "/#mixtape");
    await headingAtTop(page, "mixtape");
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Play FixtureSongWithAnUnbrokenTitleThatMustTruncate on Spotify" }).click();
    const row = page.locator("[data-dock] [data-screen] p").first();
    await expect(row).toHaveAttribute("data-marquee", "");
    const x = () => row.locator("> span").evaluate((el) => el.getBoundingClientRect().left);
    const start = await x();
    // It rests first, then moves left; its copy is hidden from screen readers.
    await expect.poll(x, { timeout: 5000 }).toBeLessThan(start - 20);
    await expect(row.locator("[aria-hidden='true']")).toHaveText("FixtureSongWithAnUnbrokenTitleThatMustTruncate");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(row).not.toHaveAttribute("data-marquee");
    expect(await row.evaluate((el) => getComputedStyle(el).textOverflow)).toBe("ellipsis");
    expect(await x()).toBeCloseTo(start, 0);
  });
});
