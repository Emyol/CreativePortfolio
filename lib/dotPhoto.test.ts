import { describe, expect, it } from "vitest";
import { coverRect, DOTS, dotLevels, gridFor, sampleSrc, STEPS } from "./dotPhoto";
import { contentSchema } from "./content/schema";

/** An RGBA buffer of grey pixels. */
const greys = (...vs: number[]) => new Uint8ClampedArray(vs.flatMap((v) => [v, v, v, 255]));

describe("dotLevels", () => {
  it("stretches any photo to the full range: darkest off, brightest fully lit", () => {
    expect([...dotLevels(greys(100, 110, 120, 130, 140))]).toEqual([0, 1, 2, 3, STEPS]);
  });

  it("weighs green over blue, as the eye does", () => {
    const px = new Uint8ClampedArray([0, 0, 0, 255, 0, 200, 0, 255, 0, 0, 200, 255, 255, 255, 255, 255]);
    const [, green, blue] = dotLevels(px);
    expect(green).toBeGreaterThan(blue);
  });

  it("doesn't let a small highlight take every bright step from the rest of the photo", () => {
    // A dark photo with one tiny bright spot: its own tones still spread across the steps.
    const dark = Array.from({ length: 98 }, (_, i) => 20 + Math.floor(i / 2));
    const levels = [...dotLevels(greys(...dark, 255, 255))];
    expect(new Set(levels.slice(0, 98)).size).toBe(STEPS + 1);
  });

  it("brightness lifts or lowers every dot", () => {
    const tones = greys(100, 110, 120, 130, 140);
    expect([...dotLevels(tones, { ...DOTS, brightness: 0.25 })]).toEqual([1, 2, 3, 4, 4]);
    expect([...dotLevels(tones, { ...DOTS, brightness: -0.25 })]).toEqual([0, 0, 1, 2, 3]);
  });

  it("contrast pushes tones apart from the middle, or draws them together", () => {
    const tones = greys(100, 110, 120, 130, 140);
    expect([...dotLevels(tones, { ...DOTS, contrast: 2 })]).toEqual([0, 0, 2, 4, 4]);
    expect([...dotLevels(tones, { ...DOTS, contrast: 0.5 })]).toEqual([1, 1, 2, 3, 3]);
  });

  it("lights nothing on a flat photo rather than dividing by zero", () => {
    expect([...dotLevels(greys(90, 90, 90))]).toEqual([0, 0, 0]);
  });
});

describe("coverRect", () => {
  it("crops a landscape photo to the screen's shape from its middle", () => {
    expect(coverRect(1200, 800, 4 / 5)).toEqual({ sx: 280, sy: 0, sw: 640, sh: 800 });
  });

  it("keeps the upper part of a tall photo, where a face usually is", () => {
    const r = coverRect(800, 2000, 4 / 5);
    expect(r.sw).toBe(800);
    expect(r.sh).toBe(1000);
    expect(r.sy).toBe(300);
  });
});
