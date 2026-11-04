import { expect, test, type Page } from "./fixtures";
import { gotoReady } from "./helpers";

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

// The mixtape on its route, in the J-card. v1 also showed the song on the hero's and the
// dock's screens, turned the reels and lit the LED; the desk's player gets the song with the
// mixtape's own device (a later phase), so those checks went with the scroll page.
const deck = (page: Page) => page.locator("main[data-jcard=mixtape] [data-deck]");
const clock = async (page: Page) => (await deck(page).innerText()).match(/\d+:\d\d(?= \/)/)?.[0];

test("pressing play loads the song in the deck and says it is playing", async ({ page }) => {
  await page.route(API, (route) => route.fulfill({ contentType: "text/javascript", body: STUB }));
  await gotoReady(page, "/mixtape");
  await page.getByRole("button", { name: "Play Fixture song 1 on Spotify" }).click();
  await expect(deck(page)).toContainText("Fixture song 1");
  await expect(page.getByRole("status").filter({ hasText: "Now playing" })).toHaveText("Now playing: Fixture song 1 by Fixture artist");
  await expect(page.locator("[data-fake-embed]")).toBeVisible();
  await expect.poll(() => clock(page)).toMatch(/0:0[1-9]/);
});

test("switching to another track stops the tape; coming back, nothing plays", async ({ page }) => {
  await page.route(API, (route) => route.fulfill({ contentType: "text/javascript", body: STUB }));
  await gotoReady(page, "/mixtape");
  await page.getByRole("button", { name: "Play Fixture song 1 on Spotify" }).click();
  await expect(page.locator("[data-fake-embed]")).toBeVisible();
  await page.locator("main[data-jcard=mixtape] [data-panel=flap]").getByRole("link", { name: "02 events" }).click();
  await expect(page).toHaveURL(/\/events$/, { timeout: 15_000 });
  await expect(page.locator("[data-fake-embed]")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/mixtape$/, { timeout: 15_000 });
  await expect(deck(page)).toContainText("pick a song");
  await expect(page.locator("[data-fake-embed]")).toHaveCount(0);
});

test("when Spotify is blocked, the deck says so and the plain links still work", async ({ page, allowConsole }) => {
  allowConsole(/Failed to load resource: net::ERR_FAILED/, /^https:\/\/open\.spotify\.com\/embed\/iframe-api\//);
  await page.route(API, (route) => route.abort());
  await gotoReady(page, "/mixtape");
  await page.getByRole("button", { name: "Play Fixture song 1 on Spotify" }).click();
  await expect(deck(page).getByRole("alert")).toHaveText("Spotify didn't load. Open the song in Spotify instead.", { timeout: 9_000 });
  await expect(page.getByRole("link", { name: "Open in Spotify: Fixture song 1" })).toHaveAttribute("href", /open\.spotify\.com\/track\//);
});

test("nothing from Spotify is requested before a press", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (r) => r.url().includes("spotify.com") && requested.push(r.url()));
  await gotoReady(page, "/mixtape");
  await page.waitForTimeout(500);
  expect(requested).toEqual([]);
});

test.describe("phones", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the mixtape wraps long titles without sideways scroll", async ({ page }) => {
    await gotoReady(page, "/mixtape");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});

test("reduced motion switched on mid-song: the song and its clock go on", async ({ page }) => {
  await page.route(API, (route) => route.fulfill({ contentType: "text/javascript", body: STUB }));
  await gotoReady(page, "/mixtape");
  await page.getByRole("button", { name: "Play Fixture song 1 on Spotify" }).click();
  await expect.poll(() => clock(page)).toMatch(/0:0[1-9]/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-tier", "none");
  const before = await clock(page);
  await page.waitForTimeout(1300);
  expect(await clock(page)).not.toBe(before);
  await expect(page.locator("[data-fake-embed]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause Fixture song 1" })).toBeVisible();
});

test("the titles are printed whole", async ({ page }) => {
  await gotoReady(page, "/mixtape");
  const title = page.locator("main[data-jcard=mixtape] [data-print]").first();
  const clip = await title.evaluate((el) => getComputedStyle(el).clipPath);
  expect(clip === "none" || /inset\(0px 0% 0px 0px\)|inset\(0px\)/.test(clip)).toBe(true);
  await expect(title).toHaveText("Fixture song 1");
});
