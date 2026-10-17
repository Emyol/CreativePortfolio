import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { __resetSoundForTests, playClunk, playKey, setSoundEnabled, soundEnabled, subscribeSound } from "./sound";

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

test("the key click and the tape clunk never throw, with or without Web Audio", () => {
  expect(() => playKey()).not.toThrow();
  expect(() => playClunk()).not.toThrow();
  setSoundEnabled(true); // jsdom has no AudioContext
  expect(() => playKey()).not.toThrow();
  expect(() => playClunk()).not.toThrow();
});

test("nothing touches Web Audio while sound is off", () => {
  const ctor = vi.fn();
  vi.stubGlobal("AudioContext", ctor);
  playKey();
  playClunk();
  expect(ctor).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
