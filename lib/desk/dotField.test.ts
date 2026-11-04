import { describe, expect, it } from "vitest";
import { COVER_INSET, GAP, LEVELS, dotLevel, fillCount, levelLook, mixTint, planDots, type Cover } from "./dotField";

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

describe("planDots, the field's draw plan", () => {
  const W = 1440;
  const H = 900;
  const grid = Math.ceil((W - GAP.full / 2) / GAP.full) * Math.ceil((H - GAP.full / 2) / GAP.full);
  const box = (left: number, top: number, right: number, bottom: number): Cover => ({ left, top, right, bottom });
  // The deck at 1440×900 (JCard.module.css): the flap over the corner player, the transport
  // under it, and the title, device and liner panels across the rest; the player's corner open.
  const JCARD = [box(18, 18, 450, 300), box(18, 342, 438, 448), box(462, 18, 1422, 120), box(462, 120, 990, 882), box(990, 18, 1422, 882)];

  it("plans every dot once, at rest when nothing lights it", () => {
    const plan = planDots(W, H, GAP.full, base, []);
    expect(plan.dots).toBe(grid);
    expect(plan.drawn).toBe(grid);
    expect(plan.rest.length / 2).toBe(grid);
    expect(fillCount(plan)).toBe(1);
  });

  it("lights only the dots near the pointer, in a few batched levels", () => {
    const plan = planDots(W, H, GAP.full, { ...base, pointer: { x: 700, y: 450 } }, []);
    const lit = plan.lit.reduce((n, pts) => n + pts.length / 2, 0);
    expect(lit).toBeGreaterThan(50);
    expect(lit).toBeLessThan(grid / 10);
    expect(plan.drawn).toBe(grid);
    expect(fillCount(plan)).toBeLessThanOrEqual(LEVELS + 1);
  });

  it("with a tape in, draws well under the dot count: the J-card's paper covers most of them", () => {
    const deck = { ...base, playing: true, t: 1.7, pointer: { x: 800, y: 400 } };
    const plan = planDots(W, H, GAP.full, deck, JCARD);
    expect(plan.dots).toBe(grid);
    expect(plan.drawn).toBeLessThan(grid * 0.35);
    // One fill per level drawn, not one per dot.
    expect(fillCount(plan)).toBeLessThanOrEqual(LEVELS + 1);
    expect(fillCount(plan)).toBeLessThan(plan.drawn / 20);
  });

  it("skips a dot only when it lies wholly under a cover, its largest size included", () => {
    const cover = box(100, 100, 300, 300);
    const plan = planDots(400, 400, GAP.full, { ...base, pointer: { x: 0, y: 0 } }, [cover]);
    const all: [number, number][] = [];
    for (const pts of [plan.rest, ...plan.lit]) for (let i = 0; i < pts.length; i += 2) all.push([pts[i], pts[i + 1]]);
    const inside = (x: number, y: number, m: number) => x > cover.left + m && x < cover.right - m && y > cover.top + m && y < cover.bottom - m;
    expect(all.some(([x, y]) => inside(x, y, COVER_INSET))).toBe(false);
    expect(all.some(([x, y]) => inside(x, y, 0))).toBe(true); // the dots along its edges still show
    expect(COVER_INSET).toBeGreaterThanOrEqual(levelLook(LEVELS).radius);
  });

  it("keeps the look: each level's colour and size within half a step of the exact dot's", () => {
    for (const lit of [0.05, 0.13, 0.5, 0.77, 1]) {
      const b = Math.max(1, Math.round(lit * LEVELS));
      const { alpha, radius } = levelLook(b);
      expect(Math.abs(alpha - (0.18 + lit * 0.8))).toBeLessThanOrEqual(0.8 / LEVELS / 2 + 1e-9);
      expect(Math.abs(radius - (1.1 + lit * 2.2))).toBeLessThanOrEqual(2.2 / LEVELS / 2 + 1e-9);
    }
  });
});
