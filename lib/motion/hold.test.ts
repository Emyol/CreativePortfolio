import { expect, test } from "vitest";
import { holdDistance, holdStart, isTall } from "./hold";

test("a section that fits above the dock holds centred above it", () => expect(holdStart(500, 800)).toBe("center 345px"));

test("one that fits the screen but not above the dock holds its top 10 px down", () => expect(holdStart(710, 800)).toBe("top top+=10"));

test("one taller than the screen holds its top in view (spec call 7)", () => expect(holdStart(2000, 800)).toBe("top top+=10"));

test("phones hold 60% as long; reduced motion never holds", () => {
  expect(holdDistance(900, "full")).toBe(900);
  expect(holdDistance(900, "lite")).toBe(540);
  expect(holdDistance(900, "none")).toBe(0);
});

test("tall means taller than the screen less 20 px", () => {
  expect(isTall(781, 800)).toBe(true);
  expect(isTall(780, 800)).toBe(false);
});
