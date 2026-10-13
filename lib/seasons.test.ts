import { describe, expect, test } from "vitest";
import { contrastRatio } from "./color";
import { SEAL_RED, SEASONS, seasonVars, type SeasonId } from "./seasons";

const ids = Object.keys(SEASONS) as SeasonId[];

describe.each(ids)("season %s", (id) => {
  const s = SEASONS[id];
  test("body ink meets WCAG AA on its paper", () => {
    expect(contrastRatio(s.ink, s.paper)).toBeGreaterThanOrEqual(4.5);
  });
  test("muted text meets WCAG AA on its paper", () => {
    expect(contrastRatio(s.muted, s.paper)).toBeGreaterThanOrEqual(4.5);
  });
  test("focus ring meets 3:1 non-text contrast on its paper", () => {
    expect(contrastRatio(s.focus, s.paper)).toBeGreaterThanOrEqual(3);
  });
});

test("white seal text on seal red meets AA", () => {
  expect(contrastRatio("#ffffff", SEAL_RED)).toBeGreaterThanOrEqual(4.5);
});

test("the Events season is the dark one", () => {
  expect(contrastRatio(SEASONS["summer-night"].paper, "#000000")).toBeLessThan(2);
});

test("seasonVars exposes CSS custom properties from the single source", () => {
  expect(seasonVars("winter")).toMatchObject({ "--paper": SEASONS.winter.paper, "--ink": SEASONS.winter.ink });
});
