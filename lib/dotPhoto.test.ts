import { describe, expect, it } from "vitest";
import { coverRect, dotLevels, rowLight, sampleSrc, STEPS } from "./dotPhoto";

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

describe("rowLight", () => {
  it("is dark before the sweep and fully lit once it has passed", () => {
    expect(rowLight(0, 50, 0)).toBe(0);
    expect(rowLight(49, 50, 0)).toBe(0);
    expect(rowLight(0, 50, 1)).toBe(1);
    expect(rowLight(49, 50, 1)).toBe(1);
  });

  it("lights from the top down", () => {
    const top = rowLight(5, 50, 0.4);
    const middle = rowLight(25, 50, 0.4);
    const bottom = rowLight(45, 50, 0.4);
    expect(top).toBe(1);
    expect(middle).toBeLessThan(top);
    expect(bottom).toBe(0);
  });

  it("eases a row up as the scanline crosses it, never jumping", () => {
    const steps = Array.from({ length: 101 }, (_, i) => rowLight(25, 50, i / 100));
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]).toBeGreaterThanOrEqual(steps[i - 1]);
      expect(steps[i] - steps[i - 1]).toBeLessThan(0.35);
    }
  });
});

describe("sampleSrc", () => {
  it("samples a published upload from a small optimised copy, not the full file", () => {
    expect(sampleSrc("/api/media/ab12.jpg")).toBe("/_next/image?url=%2Fapi%2Fmedia%2Fab12.jpg&w=128&q=75");
  });

  it("takes fixture data: URIs and admin drafts as they are (the optimiser can't read them)", () => {
    expect(sampleSrc("data:image/svg+xml,abc")).toBe("data:image/svg+xml,abc");
    expect(sampleSrc("/api/media/ab12.jpg?draft")).toBe("/api/media/ab12.jpg?draft");
  });
});
