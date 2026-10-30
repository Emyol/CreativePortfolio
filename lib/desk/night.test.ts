import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setMedia } from "@/tests/media";
import { __resetNightForTests, initialNight, nightOn, setNight, subscribeNight } from "./night";

beforeEach(() => {
  localStorage.clear();
  __resetNightForTests();
});
afterEach(() => vi.restoreAllMocks());

describe("night", () => {
  it("starts from the system preference when there is no stored choice", () => {
    expect(initialNight(true)).toBe(true);
    expect(initialNight(false)).toBe(false);
  });

  it("lets a stored choice win over the system preference", () => {
    setNight(false);
    expect(initialNight(true)).toBe(false);
    setNight(true);
    expect(initialNight(false)).toBe(true);
    expect(localStorage.getItem("side-a:night")).toBe("on");
  });

  it("reads the system's dark preference on first use", () => {
    setMedia("(prefers-color-scheme: dark)", true);
    expect(nightOn()).toBe(true);
  });

  it("tells every subscriber, so the cord and the transport agree", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = subscribeNight(a);
    subscribeNight(b);
    setNight(true);
    offA();
    setNight(false);
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledTimes(2);
    expect(nightOn()).toBe(false);
  });

  it("still switches when storage throws (private windows)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    setNight(true);
    expect(nightOn()).toBe(true);
    expect(initialNight(false)).toBe(false);
  });
});
