import { describe, expect, test } from "vitest";
import { contentSchema, musicSongSchema, withoutArchived } from "./schema";
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
    expect(() => contentSchema.parse({ ...empty, events: [event, event] })).toThrow(/already uses the address/);
  });
  test("rejects non-kebab slugs", () => {
    expect(() => contentSchema.parse({ ...empty, events: [{ ...event, slug: "Night Market" }] })).toThrow(/lowercase words joined by hyphens/);
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

describe("content written in the admin", () => {
  const photo = { src: "/api/media/0b0e5c3c-1f2a-4b3c-9d8e-123456789abc.webp", alt: "A stage", width: 2400, height: 1600 };
  const event = { slug: "a-gig", name: "A gig", date: "2026-10", summary: "Went.", photos: [photo] };
  test("an archived entry is valid and keeps its flag (Zod would otherwise strip it)", () => {
    const parsed = contentSchema.parse({ ...FIXTURES, events: [{ ...event, archived: true }], music: [{ ...FIXTURES.music[0], archived: true }] });
    expect(parsed.events[0].archived).toBe(true);
    expect(parsed.music[0].archived).toBe(true);
  });
  test("an uploaded photo path is valid, a photo hosted elsewhere is not", () => {
    expect(contentSchema.safeParse({ ...FIXTURES, events: [event] }).success).toBe(true);
    expect(contentSchema.safeParse({ ...FIXTURES, events: [{ ...event, photos: [{ ...photo, src: "https://x.test/a.jpg" }] }] }).success).toBe(false);
  });
  test("phone numbers stay off the tape", () => {
    const people = [{ name: "A", relation: "friend", note: "call 0917 123 4567" }];
    const r = contentSchema.safeParse({ ...FIXTURES, people });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("phone numbers stay off the tape");
    expect(contentSchema.safeParse({ ...FIXTURES, people: [{ name: "A", relation: "+63 friend" }] }).success).toBe(false);
  });
  test("withoutArchived drops archived entries from every list", () => {
    const c = contentSchema.parse({ ...FIXTURES, events: [{ ...event, archived: true }, { ...event, slug: "kept" }], people: [{ name: "A", relation: "b", archived: true }] });
    const out = withoutArchived(c);
    expect(out.events.map((e) => e.slug)).toEqual(["kept"]);
    expect(out.people).toEqual([]);
    expect(out.music).toHaveLength(FIXTURES.music.length);
  });
});

test("a hotel is not a phone number", () => {
  expect(contentSchema.safeParse({ ...FIXTURES, people: [{ name: "A", relation: "Stayed at the Hotel: Okura" }] }).success).toBe(true);
});
