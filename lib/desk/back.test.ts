import { beforeEach, describe, expect, it } from "vitest";
import { __resetBackForTests, pushBack, runBack } from "./back";

describe("back ladder", () => {
  beforeEach(() => __resetBackForTests());

  it("returns false with no handlers", () => {
    expect(runBack()).toBe(false);
  });

  it("runs the newest handler first and stops when it handles the step", () => {
    const calls: string[] = [];
    pushBack(() => (calls.push("old"), true));
    pushBack(() => (calls.push("new"), true));
    expect(runBack()).toBe(true);
    expect(calls).toEqual(["new"]);
  });

  it("passes the step down when a handler returns false", () => {
    const calls: string[] = [];
    pushBack(() => (calls.push("old"), true));
    pushBack(() => (calls.push("new"), false));
    expect(runBack()).toBe(true);
    expect(calls).toEqual(["new", "old"]);
  });

  it("returns false when no handler takes the step", () => {
    pushBack(() => false);
    expect(runBack()).toBe(false);
  });

  it("unregisters a handler", () => {
    const calls: string[] = [];
    const off = pushBack(() => (calls.push("a"), true));
    off();
    expect(runBack()).toBe(false);
    expect(calls).toEqual([]);
  });
});
