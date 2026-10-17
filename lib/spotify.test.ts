import { afterEach, expect, test } from "vitest";
import { __resetSpotifyForTests, loadSpotifyApi, SPOTIFY_IFRAME_API, spotifyUri } from "./spotify";

afterEach(() => {
  __resetSpotifyForTests();
  document.head.innerHTML = "";
});

test("a track link becomes a Spotify URI, share parameters and all", () => {
  expect(spotifyUri("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x")).toBe("spotify:track:4uLU6hMCjMI75M1A2tKUQC");
  expect(spotifyUri("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC")).toBe("spotify:track:4uLU6hMCjMI75M1A2tKUQC");
});

test("the API script is added once, however many presses ask for it", () => {
  const a = loadSpotifyApi(50);
  const b = loadSpotifyApi(50);
  expect(a).toBe(b);
  expect(document.querySelectorAll(`script[src="${SPOTIFY_IFRAME_API}"]`)).toHaveLength(1);
  a.catch(() => {});
});

test("it resolves with the API Spotify hands to the ready callback", async () => {
  const p = loadSpotifyApi(1000);
  const api = { createController: () => {} };
  (window as unknown as { onSpotifyIframeApiReady: (a: unknown) => void }).onSpotifyIframeApiReady(api);
  await expect(p).resolves.toBe(api);
});

test("it gives up when the script never answers, and a later press can retry", async () => {
  await expect(loadSpotifyApi(50)).rejects.toThrow(/Spotify/);
  const again = loadSpotifyApi(50);
  again.catch(() => {});
  expect(document.querySelectorAll(`script[src="${SPOTIFY_IFRAME_API}"]`).length).toBeGreaterThanOrEqual(1);
  await expect(again).rejects.toThrow();
});

test("a blocked script fails fast instead of waiting for the timeout", async () => {
  const p = loadSpotifyApi(10_000);
  document.querySelector<HTMLScriptElement>(`script[src="${SPOTIFY_IFRAME_API}"]`)!.dispatchEvent(new Event("error"));
  await expect(p).rejects.toThrow(/Spotify/);
});

test("a script that answers after the timeout is kept, so the next press uses it at once", async () => {
  await expect(loadSpotifyApi(30)).rejects.toThrow(/timed out/);
  const api = { createController: () => {} };
  (window as unknown as { onSpotifyIframeApiReady: (a: unknown) => void }).onSpotifyIframeApiReady(api);
  await expect(loadSpotifyApi(30)).resolves.toBe(api);
});
