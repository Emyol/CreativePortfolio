import { expect, test } from "vitest";
import { computeTier } from "./tier";

test.each([
  [false, false, "full"],
  [false, true, "lite"],
  [true, false, "none"],
  [true, true, "none"],
] as const)("reduce=%s narrow=%s -> %s", (reduce, narrow, tier) => {
  expect(computeTier(reduce, narrow)).toBe(tier);
});
