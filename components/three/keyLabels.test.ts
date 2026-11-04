import { expect, test } from "vitest";
import { labelSize, LABEL_FIT, pitchFit } from "./keyLabels";

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

// The model's keys stand 1.02 units apart: "mixtape" at 1.5 x (81 px) printed 1.08 units wide
// and ran into "events" on a phone.
test("on a phone a label takes no more than its share of the keys' pitch", () => {
  const fit = pitchFit(1.02);
  // The four keys are the first four tracks (keySlots), whatever is on the tape.
  for (const label of ["about", "events", "mixtape", "people"]) {
    const size = labelSize(label, 1.5, fit);
    expect(label.length * size * 0.6).toBeLessThanOrEqual(fit);
    // Never smaller than the desk's own print.
    expect(size).toBeGreaterThanOrEqual(labelSize(label));
  }
  expect(labelSize("mixtape", 1.5, fit)).toBeLessThan(81);
});

test("the desk's print is unchanged by the fit", () => {
  for (const label of ["about", "events", "mixtape", "people", "made", "on rotation"]) {
    expect(labelSize(label, 1, pitchFit(1.02))).toBe(labelSize(label));
  }
  expect(labelSize("mixtape")).toBe(54);
  expect(labelSize("on rotation")).toBe(54);
});
