import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { __resetKeysForTests, trackKeysEnabled, setTrackKeysEnabled, subscribeTrackKeys } from "./keys";

beforeEach(() => {
  localStorage.clear();
  __resetKeysForTests();
});
afterEach(() => vi.restoreAllMocks());

test("track keys are on by default", () => {
  expect(trackKeysEnabled()).toBe(true);
});

test("turning them off is remembered (WCAG 2.1.4: single-key shortcuts can be turned off)", () => {
  setTrackKeysEnabled(false);
  __resetKeysForTests();
  expect(trackKeysEnabled()).toBe(false);
});

test("subscribers hear about changes", () => {
  const l = vi.fn();
  const off = subscribeTrackKeys(l);
  setTrackKeysEnabled(false);
  off();
  expect(l).toHaveBeenCalledOnce();
});
