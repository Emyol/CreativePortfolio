import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { __resetSoundForTests, installSoundUnlock, playClunk, playKey, setSoundEnabled, soundEnabled, subscribeSound } from "./sound";

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
  Object.defineProperty(window, "AudioContext", { value: ctor, configurable: true, writable: true });
  playKey();
  playClunk();
  expect(ctor).not.toHaveBeenCalled();
});

// jsdom's window is not globalThis for stubGlobal, so the tests set the constructor directly.
const setAudio = (ctor: unknown) => Object.defineProperty(window, "AudioContext", { value: ctor, configurable: true, writable: true });
afterEach(() => {
  delete (window as unknown as { AudioContext?: unknown }).AudioContext;
});

class FakeContext {
  static made = 0;
  resume(): Promise<void> {
    return Promise.resolve();
  }
  state = "suspended";
  currentTime = 0;
  sampleRate = 8000;
  constructor() {
    FakeContext.made++;
  }
  createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
  createBufferSource() { return { connect: (n: unknown) => n, start() {}, stop() {}, buffer: null }; }
  createBiquadFilter() { return { type: "", frequency: { value: 0 }, Q: { value: 0 }, connect: (n: unknown) => n }; }
  createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (n: unknown) => n }; }
  createOscillator() { return { type: "", frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (n: unknown) => n, start() {}, stop() {} }; }
  get destination() { return {}; }
}

test("audio that can't start never throws into the page", async () => {
  setAudio(vi.fn(() => {
    throw new Error("too many contexts");
  }));
  setSoundEnabled(true);
  expect(() => playKey()).not.toThrow();
  expect(() => playClunk()).not.toThrow();
});

test("a refused resume is handled, not left as an unhandled rejection", async () => {
  setAudio(FakeContext);
  setSoundEnabled(true);
  const refused = vi.fn(() => Promise.reject(new Error("not allowed")));
  FakeContext.prototype.resume = refused as never;
  const handled = vi.fn();
  const realReject = Promise.reject.bind(Promise);
  // Watch the rejection: it must have a catch attached by the time the microtask runs.
  refused.mockImplementation(() => {
    const p = realReject(new Error("not allowed"));
    const origCatch = p.catch.bind(p);
    p.catch = ((fn: (e: unknown) => unknown) => {
      handled();
      return origCatch(fn);
    }) as typeof p.catch;
    return p;
  });
  playKey();
  await new Promise((r) => setTimeout(r, 0));
  expect(refused).toHaveBeenCalled();
  expect(handled).toHaveBeenCalled();
});

test("after a reload with sound on, the first tap or key wakes audio, once", () => {
  setAudio(FakeContext);
  localStorage.setItem("side-a:sound", "on");
  __resetSoundForTests(); // a fresh page: the choice is remembered, no context exists yet
  FakeContext.made = 0;
  const off = installSoundUnlock();
  window.dispatchEvent(new Event("keydown"));
  expect(FakeContext.made).toBe(1);
  window.dispatchEvent(new Event("pointerdown"));
  expect(FakeContext.made).toBe(1); // unlocked once; the listeners are gone
  off();
});

test("with sound off, a tap wakes nothing", () => {
  setAudio(FakeContext);
  __resetSoundForTests();
  FakeContext.made = 0;
  const off = installSoundUnlock();
  window.dispatchEvent(new Event("pointerdown"));
  expect(FakeContext.made).toBe(0);
  off();
});
