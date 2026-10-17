import { expect, test } from "vitest";
import { parseSpotifyMeta } from "./spotify";

const og = (content: string) => `<html><head><meta property="og:description" content="${content}"/></head></html>`;

test("title from oEmbed, artist from the page description", () => {
  expect(parseSpotifyMeta({ title: "lowkey" }, og("NIKI · Song · 2022"))).toEqual({ title: "lowkey", artist: "NIKI" });
  expect(parseSpotifyMeta({ title: "lowkey" }, og("Listen to lowkey on Spotify. NIKI · Song · 2022"))).toEqual({ title: "lowkey", artist: "NIKI" });
});

test("the page's musician tag wins when it is there", () => {
  const html = `<meta name="music:musician_description" content="NIKI, Rich Brian"/>${og("Someone else · Song · 2020")}`;
  expect(parseSpotifyMeta({ title: "t" }, html)).toEqual({ title: "t", artist: "NIKI, Rich Brian" });
});

test("entities are decoded and the title is never mistaken for the artist", () => {
  expect(parseSpotifyMeta({ title: "Tom &amp; Jerry" }, og("Tom &amp; Jerry · Song · 2001"))).toEqual({ title: "Tom & Jerry" });
});

test("garbage in, nothing out", () => {
  expect(parseSpotifyMeta(null, "")).toEqual({});
  expect(parseSpotifyMeta({ title: 42 }, "<html>")).toEqual({});
});
