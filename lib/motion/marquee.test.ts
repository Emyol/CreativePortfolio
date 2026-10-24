import { expect, test } from "vitest";
import { MARQUEE, marqueeAt, marqueePass } from "./marquee";

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
