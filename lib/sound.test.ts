import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { __resetSoundForTests, playTap, setSoundEnabled, soundEnabled, subscribeSound } from "./sound";

beforeEach(() => {
  localStorage.clear();
  __resetSoundForTests();
});
afterEach(() => vi.restoreAllMocks());

test("off by default", () => {
  expect(soundEnabled()).toBe(false);
});

test("the choice is remembered across loads", () => {
  setSoundEnabled(true);
  __resetSoundForTests();
  expect(soundEnabled()).toBe(true);
});

test("still toggles for this visit when storage is blocked", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  setSoundEnabled(true);
  expect(soundEnabled()).toBe(true);
});

test("subscribers hear about changes", () => {
  const l = vi.fn();
  const off = subscribeSound(l);
  setSoundEnabled(true);
  off();
  setSoundEnabled(false);
  expect(l).toHaveBeenCalledOnce();
});

test("playTap never throws, with or without Web Audio", () => {
  expect(() => playTap()).not.toThrow();
  setSoundEnabled(true); // jsdom has no AudioContext
  expect(() => playTap()).not.toThrow();
});
