import { describe, expect, test } from "vitest";
import { contrastRatio } from "./color";

describe("contrastRatio", () => {
  test("black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });
  test("is symmetric", () => {
    expect(contrastRatio("#a8281f", "#efe6d2")).toBeCloseTo(contrastRatio("#efe6d2", "#a8281f"), 6);
  });
  test("rejects non-hex input", () => {
    expect(() => contrastRatio("red", "#fff")).toThrow(/#rrggbb/);
  });
});
