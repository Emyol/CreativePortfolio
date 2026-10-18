import { expect, test } from "vitest";
import { screenLayout } from "./screenTexture";

test("two lines: an orange headline and a white second line", () => {
  const [a, b] = screenLayout(["SIDE A", "01 about"]);
  expect(a).toMatchObject({ text: "SIDE A", size: 150, color: "#FF5A1F" });
  expect(b).toMatchObject({ text: "01 about", size: 92, color: "#F1E7E2" });
  expect(b.y).toBeGreaterThan(a.y);
});

test("one line is the headline alone", () => {
  expect(screenLayout(["SIDE A"])).toHaveLength(1);
});

test("a long second line is shrunk to fit the screen's width", () => {
  const [, b] = screenLayout(["SIDE A", "CUE A very long song title that runs on and on"]);
  expect(b.size).toBeLessThan(92);
  expect(b.size).toBeGreaterThanOrEqual(48);
});
