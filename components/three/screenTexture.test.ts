import { expect, test } from "vitest";
import { headlineShift, screenLayout } from "./screenTexture";

test("two lines: an orange headline and a white second line", () => {
  const [a, b] = screenLayout(["SIDE A", "01 about"]);
  expect(a).toMatchObject({ text: "SIDE A", size: 150, color: "#FF5A1F" });
  expect(b).toMatchObject({ text: "01 about", size: 92, color: "#F1E7E2" });
  expect(b.y).toBeGreaterThan(a.y);
});

test("one line is the headline alone", () => {
  expect(screenLayout(["SIDE A"])).toHaveLength(1);
});

test("a long second line is shrunk to fit the screen's width", () => {
  const [, b] = screenLayout(["SIDE A", "CUE A very long song title that runs on and on"]);
  expect(b.size).toBeLessThan(92);
  expect(b.size).toBeGreaterThanOrEqual(48);
});

test("a headline that fits never comes round", () => {
  expect(headlineShift(["La La"])).toBe(0);
  expect(screenLayout(["La La"], 0)[0].scroll).toBeUndefined();
});

test("a headline too long is cut short at rest, and whole while it comes round", () => {
  const long = ["A song title far too long", "Artist  0:01"];
  expect(headlineShift(long)).toBeGreaterThan(0);
  const [rest] = screenLayout(long);
  expect(rest.text.endsWith("…")).toBe(true);
  expect(rest.text.length).toBeLessThan(long[0].length);
  const [moving] = screenLayout(long, 120);
  expect(moving).toMatchObject({ text: long[0], scroll: 120 });
});

test("widths are measured, so a headline in a wider face comes round and is cut to fit", () => {
  const wide = (text: string) => Array.from(text).length * 150; // a fallback face about 1 em wide
  const lines = ["あいうえおかきくけ", "Artist  0:01"]; // nine wide characters: too wide to shrink to fit
  expect(headlineShift(lines)).toBe(0); // Doto's advance would say it fits
  expect(headlineShift(lines, wide)).toBeGreaterThan(0);
  const [rest] = screenLayout(lines, undefined, wide);
  expect(wide(rest.text)).toBeLessThanOrEqual(1024 - 140);
  expect(rest.text.endsWith("…")).toBe(true);
});

test("an emoji is cut whole, never split in half", () => {
  const [rest] = screenLayout(["🎵".repeat(12)]);
  expect(rest.text).toMatch(/^(🎵)+…$/u);
});

test("at rest, a headline a little too long is set smaller to fit, whole", () => {
  const lines = ["PICK A TAPE", "six on the desk"];
  expect(headlineShift(lines)).toBeGreaterThan(0); // it would come round with motion
  const [rest] = screenLayout(lines);
  expect(rest.text).toBe("PICK A TAPE");
  expect(rest.size).toBeLessThan(150);
  expect(rest.size).toBeGreaterThanOrEqual(120);
  expect(Array.from(rest.text).length * rest.size * 0.62).toBeLessThanOrEqual(1024 - 140);
  // Coming round, it keeps its full size.
  expect(screenLayout(lines, 0)[0].size).toBe(150);
});
