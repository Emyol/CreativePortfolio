import { expect, test } from "vitest";
import { labelSize, LABEL_FIT } from "./keyLabels";

test("a short label prints at the plate's size", () => {
  expect(labelSize("about")).toBe(54);
});

test("a long label shrinks to fit under its own key, never below a readable size", () => {
  const size = labelSize("on rotation forever");
  expect(size).toBeLessThan(54);
  expect("on rotation forever".length * size * 0.6).toBeLessThanOrEqual(LABEL_FIT);
  expect(labelSize("a much longer track label")).toBeGreaterThanOrEqual(30);
});

test("on a phone the labels print larger, as the whole player is smaller there", () => {
  expect(labelSize("about", 1.5)).toBe(81);
  expect("mixtape".length * labelSize("mixtape", 1.5) * 0.6).toBeLessThanOrEqual(LABEL_FIT);
});
