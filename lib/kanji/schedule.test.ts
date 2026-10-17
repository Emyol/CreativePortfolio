import { expect, test } from "vitest";
import { scheduleEnd, strokeSchedule } from "./schedule";

test("duration scales with length, with a minimum and a gap", () => {
  const s = strokeSchedule([260, 10, 520], { speed: 260, minMs: 140, gapMs: 70 });
  expect(s).toEqual([
    { delay: 0, duration: 1000 },
    { delay: 1070, duration: 140 },
    { delay: 1280, duration: 2000 },
  ]);
  expect(scheduleEnd(s)).toBe(3280);
});

test("no strokes, no time", () => {
  expect(scheduleEnd(strokeSchedule([]))).toBe(0);
});
