import { describe, expect, test } from "vitest";
import { contentSchema } from "./schema";
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
  test("rejects a sixth song: the setlist only has five numerals", () => {
    const track = { title: "Song" };
    expect(() => contentSchema.parse({ ...empty, music: Array(6).fill(track) })).toThrow(/five/);
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
