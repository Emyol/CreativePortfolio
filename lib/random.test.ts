import { expect, test } from "vitest";
import { mulberry32 } from "./random";

test("same seed gives the same sequence in [0, 1)", () => {
  const a = mulberry32(42), b = mulberry32(42);
  const xs = Array.from({ length: 5 }, () => a());
  expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
  for (const x of xs) {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(1);
  }
});
