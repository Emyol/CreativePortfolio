import { existsSync } from "node:fs";
import { expect, test } from "vitest";
import { DEVICE, pct } from "./layout";

const SPRITES = ["plate", "shadow", "shell-a", "shell-b", "hub", "pack", "knob", "knob-mark", "key-up", "key-down", "underside", "beauty"];

test("layout.json parses and every rect sits inside the plate", () => {
  for (const r of [...DEVICE.keys, ...DEVICE.keyLabels, DEVICE.screen, DEVICE.window, DEVICE.nameplate, DEVICE.cassette])
    expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= 1 && r.y + r.h <= 1).toBe(true);
});

test("keys are four, ordered left to right, not overlapping", () => {
  expect(DEVICE.keys).toHaveLength(4);
  for (let i = 1; i < 4; i++) expect(DEVICE.keys[i].x).toBeGreaterThanOrEqual(DEVICE.keys[i - 1].x + DEVICE.keys[i - 1].w);
});

test("every sprite the components use exists in both formats", () => {
  for (const name of SPRITES)
    for (const ext of ["avif", "webp"]) expect(existsSync(`public/device/${name}.${ext}`), `${name}.${ext}`).toBe(true);
  for (let i = 0; i < DEVICE.flipFrames; i++)
    expect(existsSync(`public/device/flip/flip-${String(i).padStart(2, "0")}.webp`)).toBe(true);
  expect(existsSync("public/device/beauty.jpg")).toBe(true);
});

test("the pack can shrink below its full size and never below the hub", () => {
  expect(DEVICE.pack.min).toBeGreaterThan(DEVICE.reels.hub);
  expect(DEVICE.pack.max).toBeGreaterThan(DEVICE.pack.min);
});

test("both reels sit inside the cassette, left of each other in order", () => {
  const c = DEVICE.cassette;
  for (const p of [DEVICE.reels.left, DEVICE.reels.right]) {
    expect(p.x).toBeGreaterThan(c.x);
    expect(p.x).toBeLessThan(c.x + c.w);
    expect(p.y).toBeGreaterThan(c.y);
    expect(p.y).toBeLessThan(c.y + c.h);
  }
  expect(DEVICE.reels.left.x).toBeLessThan(DEVICE.reels.right.x);
});

test("pct formats a fraction as a percentage", () => {
  expect(pct(0.25)).toBe("25%");
  expect(pct(0.123456)).toBe("12.3456%");
});
