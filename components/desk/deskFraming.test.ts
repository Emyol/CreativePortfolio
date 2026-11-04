import { expect, test } from "vitest";
import { deckBox } from "./deskFraming";

test("on a desk-sized screen the deck's player sits in the lower-left corner", () => {
  const b = deckBox(1440, 900);
  expect(b.width).toBeCloseTo(420);
  expect(b.height).toBeCloseTo(420 / 1.35);
  expect(b.left).toBe(18);
  expect(b.top).toBeCloseTo(900 - 18 - 420 / 1.35);
});

test("on a phone it sits on top, centred, with the J-card stacked below it", () => {
  const b = deckBox(390, 844);
  expect(b.width).toBe(300);
  expect(b.height).toBeCloseTo(300 / 1.35);
  expect(b.left).toBe(45);
  expect(b.top).toBe(12);
});

test("on a narrow phone it takes the width less its margins", () => {
  const b = deckBox(320, 640);
  expect(b.width).toBe(296);
  expect(b.left).toBe(12);
});

test("on a short view (a laptop at 200% zoom, a phone on its side) the player keeps the corner, phone-wide or not", () => {
  for (const [vw, vh] of [[640, 360], [683, 384], [900, 400], [1440, 600]]) {
    const b = deckBox(vw, vh);
    expect(b.left, `${vw}×${vh}`).toBe(18);
    expect(b.width).toBeCloseTo(Math.min(vw * 0.34, 420));
    expect(b.top + b.height).toBeCloseTo(vh - 18);
  }
  // Just taller than short, a phone-wide view stacks again.
  expect(deckBox(640, 601).top).toBe(12);
});
