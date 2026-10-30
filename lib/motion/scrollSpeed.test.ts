import { afterEach, expect, test } from "vitest";
import { trackScroll } from "./scrollSpeed";

function scroller(start = 0) {
  const el = document.createElement("div");
  let top = start;
  Object.defineProperty(el, "scrollTop", { get: () => top });
  document.body.append(el);
  return {
    el,
    to(y: number) {
      top = y;
      el.dispatchEvent(new Event("scroll"));
    },
  };
}

afterEach(() => document.body.replaceChildren());

test("a panel's scroll between reads is the speed, and a read resets it", () => {
  const t = trackScroll();
  const p = scroller(100);
  p.to(100); // first seen: nothing moved yet
  p.to(130);
  p.to(150);
  expect(t.read()).toBe(50);
  expect(t.read()).toBe(0);
  p.to(120);
  expect(t.read()).toBe(-30);
  t.stop();
});

test("after stop, scrolling is no longer counted", () => {
  const t = trackScroll();
  const p = scroller();
  p.to(0);
  t.stop();
  p.to(80);
  expect(t.read()).toBe(0);
});
