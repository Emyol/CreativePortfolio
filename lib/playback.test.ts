import { afterEach, expect, test, vi } from "vitest";
import { getPlayback, isPlaying, resetPlayback, setPlayback, subscribePlayback } from "./playback";

afterEach(() => resetPlayback());

test("starts idle with nothing loaded", () => {
  expect(getPlayback()).toEqual({ status: "idle", song: null, position: 0, duration: 0 });
});

test("updates merge, notify subscribers and give a new snapshot", () => {
  const l = vi.fn();
  const off = subscribePlayback(l);
  const before = getPlayback();
  setPlayback({ status: "playing", song: 2, position: 1000, duration: 30000 });
  expect(getPlayback()).not.toBe(before);
  expect(getPlayback()).toEqual({ status: "playing", song: 2, position: 1000, duration: 30000 });
  expect(isPlaying(getPlayback())).toBe(true);
  setPlayback({ position: 2000 });
  expect(getPlayback().song).toBe(2);
  off();
  expect(l).toHaveBeenCalledTimes(2);
});

test("reset returns to idle", () => {
  setPlayback({ status: "paused", song: 1 });
  resetPlayback();
  expect(getPlayback().status).toBe("idle");
  expect(isPlaying(getPlayback())).toBe(false);
});
