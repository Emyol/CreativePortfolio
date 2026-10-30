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
