import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetHintForTests, deskScreenLines, hintSeen, markHintSeen, subscribeHint } from "./hint";

beforeEach(() => {
  localStorage.clear();
  __resetHintForTests();
});
afterEach(() => vi.restoreAllMocks());

describe("the desk's hint", () => {
  it("is unseen until the first insert marks it, and stays seen in this browser", () => {
    expect(hintSeen()).toBe(false);
    markHintSeen();
    expect(hintSeen()).toBe(true);
    expect(localStorage.getItem("side-a:hint")).toBe("seen");
    __resetHintForTests(); // a reload: only the browser's storage is left
    expect(hintSeen()).toBe(true);
  });

  it("tells its subscribers once it is seen", () => {
    const l = vi.fn();
    const off = subscribeHint(l);
    markHintSeen();
    off();
    markHintSeen();
    expect(l).toHaveBeenCalledOnce();
  });

  it("still goes away when storage throws (private windows)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(hintSeen()).toBe(false);
    expect(() => markHintSeen()).not.toThrow();
    expect(hintSeen()).toBe(true);
  });
});

describe("the screen on the desk", () => {
  it("asks for a tape and counts the tapes on the desk", () => {
    expect(deskScreenLines(6)).toEqual(["PICK A TAPE", "six on the desk"]);
    expect(deskScreenLines(1)).toEqual(["PICK A TAPE", "one on the desk"]);
  });
});
