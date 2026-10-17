import { expect, test } from "vitest";
import { bentoShapes } from "./bento";

// Grid is 6 columns. a = 4x3, b = 2x2, c = 2x1 (a+b+c fill a 6x3 block), d/e/f = 2x2 (one 6x2 row),
// full = 6x2, half = 3x2. Every count must fill whole rows: no holes.
const AREA: Record<string, number> = { a: 12, b: 4, c: 2, d: 4, e: 4, f: 4, full: 12, half: 6 };

test.each([
  [1, ["full"]],
  [2, ["half", "half"]],
  [3, ["a", "b", "c"]],
  [4, ["a", "b", "c", "full"]],
  [5, ["a", "b", "c", "half", "half"]],
  [6, ["a", "b", "c", "d", "e", "f"]],
  [7, ["a", "b", "c", "d", "e", "f", "full"]],
  [8, ["a", "b", "c", "d", "e", "f", "half", "half"]],
  [9, ["a", "b", "c", "d", "e", "f", "a", "b", "c"]],
])("%i events -> %j", (n, shapes) => {
  expect(bentoShapes(n)).toEqual(shapes);
});

test("every count from 0 to 30 fills whole 6-column rows", () => {
  for (let n = 0; n <= 30; n++) {
    const area = bentoShapes(n).reduce((sum, s) => sum + AREA[s], 0);
    expect(area % 6, `n=${n}`).toBe(0);
    expect(bentoShapes(n)).toHaveLength(n);
  }
});
