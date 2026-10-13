import { expect, test } from "vitest";
import { threadPath } from "./thread";

test("no people, no thread; one person, just a starting point", () => {
  expect(threadPath([])).toBe("");
  expect(threadPath([{ x: 10, y: 20 }])).toBe("M10 20");
});

test("consecutive knots are joined by vertical-easing curves", () => {
  expect(threadPath([{ x: 0, y: 0 }, { x: 100, y: 200 }])).toBe("M0 0 C0 100 100 100 100 200");
});

test("coordinates are rounded to one decimal", () => {
  expect(threadPath([{ x: 0.123, y: 0 }, { x: 1.06, y: 1 }])).toBe("M0.1 0 C0.1 0.5 1.1 0.5 1.1 1");
});

