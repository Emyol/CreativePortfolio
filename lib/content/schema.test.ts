import { describe, expect, test } from "vitest";
import { contentSchema, musicSongSchema } from "./schema";
import { FIXTURES } from "./fixtures";

const empty = { about: { letter: [], toolbox: [] }, events: [], music: [], hobbies: [], shelf: [], people: [] };
const photo = { src: "/photos/a.jpg", alt: "A lantern", width: 1200, height: 800 };
const event = { slug: "night-market", name: "Night market", date: "2025-10", summary: "Went.", photos: [photo] };

describe("contentSchema", () => {
  test("accepts an entirely empty site (launch state)", () => {
    expect(contentSchema.parse(empty)).toMatchObject(empty);
  });
  test("accepts the fixtures", () => {
    expect(() => contentSchema.parse(FIXTURES)).not.toThrow();
  });
  test("rejects a photo without alt text", () => {
    expect(() => contentSchema.parse({ ...empty, events: [{ ...event, photos: [{ ...photo, alt: " " }] }] })).toThrow(/alt/);
  });
  test("rejects an event without photos", () => {
    expect(() => contentSchema.parse({ ...empty, events: [{ ...event, photos: [] }] })).toThrow(/photo/);
  });
  test("rejects duplicate event slugs", () => {
    expect(() => contentSchema.parse({ ...empty, events: [event, event] })).toThrow(/duplicate/i);
  });
  test("rejects non-kebab slugs", () => {
    expect(() => contentSchema.parse({ ...empty, events: [{ ...event, slug: "Night Market" }] })).toThrow(/slug/);
  });
  test("rejects a toolbox item the professional site does not support", () => {
    expect(() => contentSchema.parse({ ...empty, about: { letter: [], toolbox: ["Rust"] } })).toThrow();
  });
  test("rejects photos hosted elsewhere", () => {
    expect(() => contentSchema.parse({ ...empty, about: { letter: ["Hi"], toolbox: [], candid: { ...photo, src: "https://x.com/a.jpg" } } })).toThrow(/public/);
  });
  test("rejects malformed dates", () => {
    expect(() => contentSchema.parse({ ...empty, events: [{ ...event, date: "Oct 2025" }] })).toThrow(/date/);
  });
});

const song = { title: "A", artist: "NIKI", spotify: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" };

describe("the mixtape and links", () => {
  test("a song needs title, artist and an open.spotify.com track URL", () => {
    expect(musicSongSchema.safeParse(song).success).toBe(true);
    expect(musicSongSchema.safeParse({ ...song, spotify: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc" }).success).toBe(true);
    for (const bad of ["https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC", "https://example.com/track/x", "spotify:track:4uLU6hMCjMI75M1A2tKUQC"])
      expect(musicSongSchema.safeParse({ ...song, spotify: bad }).success, bad).toBe(false);
    expect(musicSongSchema.safeParse({ title: "A", spotify: song.spotify }).success).toBe(false);
  });
  test("the mixtape holds at most 12 songs", () => {
    const base = { ...FIXTURES, music: Array(13).fill(song) };
    expect(contentSchema.safeParse(base).error?.issues[0].message).toMatch(/12/);
  });
  test("links are https, at most four, and default to none", () => {
    expect(contentSchema.parse({ ...FIXTURES, links: undefined }).links).toEqual([]);
    expect(contentSchema.safeParse({ ...FIXTURES, links: [{ label: "x", url: "http://a.b" }] }).success).toBe(false);
    expect(contentSchema.safeParse({ ...FIXTURES, links: Array(5).fill({ label: "x", url: "https://a.b" }) }).success).toBe(false);
  });
});
