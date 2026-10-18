import { expect, test } from "vitest";
import { canUse3D, dprFor, scissorFor } from "./support";

test("full motion renders sharp up to 2x; phones cap at 1.5x", () => {
  expect(dprFor("full", 3)).toBe(2);
  expect(dprFor("lite", 3)).toBe(1.5);
  expect(dprFor("full", 1)).toBe(1);
});

test("3D needs motion and WebGL", () => {
  expect(canUse3D("none", true)).toBe(false);
  expect(canUse3D("full", false)).toBe(false);
  expect(canUse3D("full", true)).toBe(true);
  expect(canUse3D("lite", true)).toBe(true);
});

test("a view's scissor is its box, measured from the canvas bottom", () => {
  expect(scissorFor({ left: 10, top: 20, width: 100, height: 50 } as DOMRect, 800)).toEqual([10, 730, 100, 50]);
});
