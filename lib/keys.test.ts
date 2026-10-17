import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { __resetKeysForTests, chapterKeysEnabled, setChapterKeysEnabled, subscribeChapterKeys } from "./keys";

beforeEach(() => {
  localStorage.clear();
  __resetKeysForTests();
});
afterEach(() => vi.restoreAllMocks());

test("chapter keys are on by default", () => {
  expect(chapterKeysEnabled()).toBe(true);
});

test("turning them off is remembered (WCAG 2.1.4: single-key shortcuts can be turned off)", () => {
  setChapterKeysEnabled(false);
  __resetKeysForTests();
  expect(chapterKeysEnabled()).toBe(false);
});

test("subscribers hear about changes", () => {
  const l = vi.fn();
  const off = subscribeChapterKeys(l);
  setChapterKeysEnabled(false);
  off();
  expect(l).toHaveBeenCalledOnce();
});
