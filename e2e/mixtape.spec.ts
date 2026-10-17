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
  await page.locator("#events").getByRole("link").first().click();
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
