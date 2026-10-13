import { afterEach, expect, test, vi } from "vitest";
import { readStorage, writeStorage } from "./storage";

afterEach(() => vi.restoreAllMocks());

test("round-trips a value", () => {
  writeStorage("local", "k", "v");
  expect(readStorage("local", "k")).toBe("v");
});

test("never throws when storage is blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(readStorage("session", "k")).toBeNull();
  expect(() => writeStorage("session", "k", "v")).not.toThrow();
});
