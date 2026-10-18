import { afterEach, expect, test, vi } from "vitest";
import { getCue, setCue, subscribeCue } from "./cue";

afterEach(() => setCue(null));

test("a cue is set, read and cleared, telling subscribers each time", () => {
  const heard = vi.fn();
  const stop = subscribeCue(heard);
  setCue("Fixture song 1");
  expect(getCue()).toBe("Fixture song 1");
  setCue(null);
  expect(getCue()).toBeNull();
  expect(heard).toHaveBeenCalledTimes(2);
  stop();
});

test("cueing the same song twice tells subscribers once", () => {
  const heard = vi.fn();
  const stop = subscribeCue(heard);
  setCue("Fixture song 2");
  setCue("Fixture song 2");
  expect(heard).toHaveBeenCalledTimes(1);
  stop();
});
