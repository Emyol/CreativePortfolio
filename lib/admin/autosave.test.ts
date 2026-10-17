import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { createAutosave } from "./autosave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("quick changes cause one save, 800 ms after the last", async () => {
  const save = vi.fn(async (_c: unknown, r: number) => r + 1);
  const a = createAutosave({ save, revision: 3 });
  a.change(FIXTURES);
  await vi.advanceTimersByTimeAsync(500);
  a.change({ ...FIXTURES, links: [] });
  expect(a.status()).toBe("pending");
  await vi.advanceTimersByTimeAsync(799);
  expect(save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(save).toHaveBeenCalledTimes(1);
  expect(save.mock.calls[0][1]).toBe(3);
  expect(a.status()).toBe("saved");
  expect(a.revision()).toBe(4);
});

test("a conflict stops saving and says so", async () => {
  const save = vi.fn(async () => Promise.reject({ status: 409 }));
  const a = createAutosave({ save, revision: 1 });
  a.change(FIXTURES);
  await vi.advanceTimersByTimeAsync(800);
  expect(a.status()).toBe("conflict");
  a.change(FIXTURES);
  await vi.advanceTimersByTimeAsync(5000);
  expect(save).toHaveBeenCalledTimes(1);
});

test("offline, it retries after 2 s, then 4 s, and recovers", async () => {
  let fail = 2;
  const save = vi.fn(async (_c: unknown, r: number) => (fail-- > 0 ? Promise.reject(new TypeError("Failed to fetch")) : r + 1));
  const a = createAutosave({ save, revision: 1 });
  a.change(FIXTURES);
  await vi.advanceTimersByTimeAsync(800);
  expect(a.status()).toBe("offline");
  await vi.advanceTimersByTimeAsync(2000);
  expect(save).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(4000);
  expect(save).toHaveBeenCalledTimes(3);
  expect(a.status()).toBe("saved");
});

test("a change made during a save is saved next, against the new revision", async () => {
  let release!: (n: number) => void;
  const save = vi.fn((_c: unknown, r: number) => (r === 1 ? new Promise<number>((res) => (release = res)) : Promise.resolve(r + 1)));
  const a = createAutosave({ save, revision: 1 });
  a.change(FIXTURES);
  await vi.advanceTimersByTimeAsync(800);
  expect(a.status()).toBe("saving");
  a.change({ ...FIXTURES, links: [] });
  release(2);
  await vi.advanceTimersByTimeAsync(800);
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[1][1]).toBe(2);
});

test("flush saves now", async () => {
  const save = vi.fn(async (_c: unknown, r: number) => r + 1);
  const a = createAutosave({ save, revision: 1 });
  a.change(FIXTURES);
  await a.flush();
  expect(save).toHaveBeenCalledTimes(1);
  expect(a.status()).toBe("saved");
});
