import { expect, test } from "vitest";
import { mountainPath } from "./mountains";

test("deterministic per seed, closed, inside the box", () => {
  const a = mountainPath(7, 1200, 400, 6);
  expect(a).toBe(mountainPath(7, 1200, 400, 6));
  expect(a).not.toBe(mountainPath(8, 1200, 400, 6));
  expect(a.startsWith("M0 400")).toBe(true);
  expect(a.endsWith("Z")).toBe(true);
  const ys = [...a.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[2]));
  for (const y of ys) {
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(400);
  }
});
