import { expect, test } from "vitest";
import { MAX_OMEGA, PLAY_RPS, stepReel } from "./reels";

test("tier none never moves", () => {
  expect(stepReel({ angle: 30, omega: 500 }, 0.016, { velocity: 40, playing: true, tier: "none" })).toEqual({ angle: 30, omega: 0 });
});

test("playing settles at tape speed regardless of scroll", () => {
  let s = { angle: 0, omega: 0 };
  for (let i = 0; i < 300; i++) s = stepReel(s, 1 / 60, { velocity: 0, playing: true, tier: "full" });
  expect(s.omega).toBeCloseTo(PLAY_RPS * 360, 0);
});

test("playing turns the reels on phones too", () => {
  let s = { angle: 0, omega: 0 };
  for (let i = 0; i < 300; i++) s = stepReel(s, 1 / 60, { velocity: 0, playing: true, tier: "lite" });
  expect(s.omega).toBeCloseTo(PLAY_RPS * 360, 0);
});

test("scroll velocity spins the reel, then momentum decays to a stop", () => {
  let s = stepReel({ angle: 0, omega: 0 }, 1 / 60, { velocity: 30, playing: false, tier: "full" });
  expect(s.omega).toBeGreaterThan(0);
  for (let i = 0; i < 240; i++) s = stepReel(s, 1 / 60, { velocity: 0, playing: false, tier: "full" });
  expect(Math.abs(s.omega)).toBeLessThan(1);
});

test("scrolling back up winds the reels backwards", () => {
  const s = stepReel({ angle: 0, omega: 0 }, 1 / 60, { velocity: -30, playing: false, tier: "full" });
  expect(s.omega).toBeLessThan(0);
});

test("lite ignores scroll velocity", () => {
  expect(stepReel({ angle: 0, omega: 0 }, 1 / 60, { velocity: 30, playing: false, tier: "lite" }).omega).toBe(0);
});

test("omega is clamped", () => {
  expect(stepReel({ angle: 0, omega: 0 }, 1 / 60, { velocity: 1e6, playing: false, tier: "full" }).omega).toBeLessThanOrEqual(MAX_OMEGA);
});

test("the angle wraps and a long frame can't make it jump", () => {
  const s = stepReel({ angle: 350, omega: 600 }, 1 / 60, { velocity: 0, playing: true, tier: "full" });
  expect(s.angle).toBeGreaterThanOrEqual(0);
  expect(s.angle).toBeLessThan(360);
  const long = stepReel({ angle: 0, omega: 600 }, 5, { velocity: 0, playing: false, tier: "full" });
  expect(Number.isFinite(long.angle)).toBe(true);
});
