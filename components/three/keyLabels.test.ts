import { expect, test } from "vitest";
import { labelSize, LABEL_W } from "./keyLabels";

test("a short label prints at the plate's size", () => {
  expect(labelSize("about")).toBe(54);
});

test("a long label shrinks to fit under its key, never below a readable size", () => {
  const size = labelSize("a much longer track label");
  expect(size).toBeLessThan(54);
  expect(size).toBeGreaterThanOrEqual(30);
  expect("a much longer track label".length * size * 0.6).toBeLessThanOrEqual(LABEL_W);
});
