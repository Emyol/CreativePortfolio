import { expect, test } from "vitest";
import { KONAMI, konamiStep } from "./konami";

const run = (keys: string[]) => keys.reduce(konamiStep, 0);

test("the full code completes", () => {
  expect(run([...KONAMI])).toBe(KONAMI.length);
});

test("letters are case-insensitive", () => {
  expect(run([...KONAMI.slice(0, 8), "B", "A"])).toBe(KONAMI.length);
});

test("a wrong key resets", () => {
  expect(run(["ArrowUp", "ArrowUp", "x"])).toBe(0);
});

test("an extra Up keeps the run alive (Up Up Up Down ...)", () => {
  expect(run(["ArrowUp", ...KONAMI])).toBe(KONAMI.length);
});

test("a wrong key that is itself Up starts a new run", () => {
  expect(run(["ArrowUp", "ArrowUp", "ArrowDown", "ArrowUp"])).toBe(1);
});
