import { describe, expect, it } from "vitest";
import { dotLevel, mixTint } from "./dotField";

const base = { pointer: null, ripple: null, playing: false, night: false, t: 0, still: false };

describe("dotLevel", () => {
  it("is above 0.9 under the pointer", () => {
    expect(dotLevel({ x: 100, y: 100 }, { ...base, pointer: { x: 100, y: 100 } })).toBeGreaterThan(0.9);
  });
  it("is 0 four hundred px from the pointer by day", () => {
    expect(dotLevel({ x: 500, y: 100 }, { ...base, pointer: { x: 100, y: 100 } })).toBe(0);
  });
  it("reaches further at night", () => {
    const s = { ...base, pointer: { x: 0, y: 0 } };
    expect(dotLevel({ x: 200, y: 0 }, s)).toBe(0);
    expect(dotLevel({ x: 200, y: 0 }, { ...s, night: true })).toBeGreaterThan(0);
  });
  it("lights a dot on the ripple ring, and not when still", () => {
    const age = 0.5;
    const p = { x: 100 + age * 900, y: 100 };
    const ripple = { x: 100, y: 100, age };
    expect(dotLevel(p, { ...base, ripple })).toBeGreaterThan(0.5);
    expect(dotLevel(p, { ...base, ripple, still: true })).toBe(0);
  });
  it("ends the ripple after its life", () => {
    const ripple = { x: 0, y: 0, age: 2.3 };
    expect(dotLevel({ x: 2.3 * 900, y: 0 }, { ...base, ripple })).toBe(0);
  });
  it("waves with time while playing, but not when still", () => {
    const p = { x: 300, y: 200 };
    const at = (t: number, still: boolean) => dotLevel(p, { ...base, playing: true, t, still });
    expect(at(0, false)).not.toBeCloseTo(at(1.3, false), 3);
    expect(at(0, true)).toBe(at(1.3, true));
    expect(at(0, true)).toBe(0);
  });
});

describe("mixTint", () => {
  it("eases from towards to", () => {
    expect(mixTint([0, 100, 200], [100, 0, 200], 0.5)).toEqual([50, 50, 200]);
    expect(mixTint([1, 2, 3], [9, 9, 9], 0)).toEqual([1, 2, 3]);
    expect(mixTint([1, 2, 3], [9, 9, 9], 1)).toEqual([9, 9, 9]);
  });
});
