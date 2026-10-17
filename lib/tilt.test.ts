import { expect, test } from "vitest";
import { tiltFor } from "./tilt";

const rect = { left: 100, top: 100, width: 200, height: 100 };

test("centre is flat", () => {
  expect(tiltFor(200, 150, rect)).toEqual({ rotationX: 0, rotationY: 0 });
});

test("top-left corner tilts toward the pointer, capped at half the max each way", () => {
  expect(tiltFor(100, 100, rect, 8)).toEqual({ rotationX: 4, rotationY: -4 });
});

test("pointer outside the tile is clamped", () => {
  expect(tiltFor(-500, 900, rect, 8)).toEqual({ rotationX: -4, rotationY: -4 });
});
