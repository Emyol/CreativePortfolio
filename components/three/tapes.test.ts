import { describe, expect, it } from "vitest";
import { TRACK_INK } from "@/lib/desk/tapeLabel";
import { BACK, bsideInk } from "./tapes";

// WCAG 2.x relative luminance and contrast ratio, computed here independently of the code.
const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: readonly number[]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: readonly number[], b: readonly number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

describe("the B-side print", () => {
  it.each(Object.entries(TRACK_INK))("prints %s's heading at 4.5:1 or more on the dark label", (_, ink) => {
    expect(contrast(bsideInk(ink), hex(BACK))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps an ink that already reads unchanged, and only lifts one that doesn't", () => {
    expect(bsideInk(TRACK_INK.people)).toEqual(TRACK_INK.people);
    const events = bsideInk(TRACK_INK.events);
    expect(events).not.toEqual(TRACK_INK.events);
    // Lifted toward white, so still the same blue: every channel up, blue still the strongest.
    events.forEach((c, i) => expect(c).toBeGreaterThanOrEqual(TRACK_INK.events[i]));
    expect(events[2]).toBe(Math.max(...events));
  });
});
