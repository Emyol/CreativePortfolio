import { expect, test } from "vitest";
import { mulberry32 } from "./random";
import { GUST_MS, gustAlpha, gustDone, spawnGust, stepParticles } from "./weather";

test("spawns the requested number of particles, off-screen left", () => {
  const ps = spawnGust("petal", 30, 1440, 900, mulberry32(1));
  expect(ps).toHaveLength(30);
  for (const p of ps) expect(p.x).toBeLessThan(0);
});

test("lanterns rise, snow falls", () => {
  expect(spawnGust("lantern", 20, 1440, 900, mulberry32(2)).every((p) => p.vy < 0)).toBe(true);
  expect(spawnGust("snow", 20, 1440, 900, mulberry32(3)).every((p) => p.vy > 0)).toBe(true);
});

test("stepping moves particles right and ages them", () => {
  const [p] = spawnGust("maple", 1, 1440, 900, mulberry32(4));
  const [q] = stepParticles([p], 16);
  expect(q.x).toBeGreaterThan(p.x);
  expect(q.life).toBe(16);
});

test("the gust fades in, holds, fades out and ends", () => {
  expect(gustAlpha(0)).toBe(0);
  expect(gustAlpha(GUST_MS / 2)).toBe(1);
  expect(gustAlpha(GUST_MS)).toBe(0);
  expect(gustDone(GUST_MS - 1)).toBe(false);
  expect(gustDone(GUST_MS)).toBe(true);
});
