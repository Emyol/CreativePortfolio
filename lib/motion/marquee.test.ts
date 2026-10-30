import { expect, test } from "vitest";
import { FIT_FLOOR, MARQUEE, fitScale, marqueeAt, marqueePass } from "./marquee";

// 300 px to come round at 20 px type: 5 s of scrolling at 3 sizes a second.
const pass = marqueePass(300, 20);

test("each pass rests at the start, then scrolls round at a steady speed", () => {
  expect(pass).toBe(MARQUEE.rest + 5000);
  expect(marqueeAt(0, 300, 20)).toBe(0);
  expect(marqueeAt(MARQUEE.rest, 300, 20)).toBe(0);
  expect(marqueeAt(MARQUEE.rest + 2500, 300, 20)).toBeCloseTo(150);
  expect(marqueeAt(pass - 1, 300, 20)).toBeCloseTo(300, 0);
});

test("the next pass starts from the start again", () => {
  expect(marqueeAt(pass, 300, 20)).toBe(0);
  expect(marqueeAt(pass + MARQUEE.rest + 2500, 300, 20)).toBeCloseTo(150);
});

test("it keeps coming round, pass after pass", () => {
  expect(marqueeAt(pass * 40, 300, 20)).toBe(0);
  expect(marqueeAt(pass * 40 + MARQUEE.rest + 2500, 300, 20)).toBeCloseTo(150);
});

test("it steps a dot column at a time", () => {
  const dot = MARQUEE.dot * 20;
  for (let ms = MARQUEE.rest; ms < pass; ms += 37) {
    const x = marqueeAt(ms, 300, 20);
    expect(x / dot).toBeCloseTo(Math.round(x / dot));
  }
});

test("a still line that fits keeps its size; a little too long, it is set smaller to fit", () => {
  expect(fitScale(800, 884)).toBe(1);
  const k = fitScale(1023, 884)!; // PICK A TAPE in Doto at the 3D headline's size
  expect(k).toBeLessThan(1);
  expect(k).toBeGreaterThanOrEqual(FIT_FLOOR);
  expect(1023 * k).toBeLessThanOrEqual(884);
});

test("a still line far too long would shrink below the floor: no fit, it is cut instead", () => {
  expect(fitScale(884 / (FIT_FLOOR - 0.05), 884)).toBeNull();
});
