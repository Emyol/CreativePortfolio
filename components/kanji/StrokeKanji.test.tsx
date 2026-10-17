import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import type { MotionTier } from "@/lib/motion/tier";
import { StrokeKanji } from "./StrokeKanji";
import { StrokeWord } from "./StrokeWord";

const animate = vi.fn(() => ({ cancel: vi.fn() }));

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom implements neither SVG geometry nor the Web Animations API.
  Object.defineProperty(SVGElement.prototype, "getTotalLength", { value: () => 52, configurable: true });
  Object.defineProperty(Element.prototype, "animate", { value: animate, configurable: true });
});
afterEach(() => {
  vi.useRealTimers();
  animate.mockClear();
});

const withTier = (tier: MotionTier, ui: ReactNode) => <MotionTierContext.Provider value={tier}>{ui}</MotionTierContext.Provider>;

test("renders one pen path and one mask path per stroke", () => {
  const { container } = render(withTier("full", <StrokeKanji char="私" mode="idle" />));
  expect(container.querySelectorAll("[data-pen]")).toHaveLength(7);
  expect(container.querySelectorAll("[data-mask]")).toHaveLength(7);
});

test("labelled kanji are images with an English name; unlabelled ones are hidden", () => {
  const { getByRole, container } = render(
    withTier("full", <><StrokeKanji char="終" mode="done" label="The end" /><StrokeKanji char="私" mode="done" /></>),
  );
  expect(getByRole("img", { name: "The end" })).toBeInTheDocument();
  expect(container.querySelectorAll("svg")[1]).toHaveAttribute("aria-hidden", "true");
});

test("reduced motion renders fully written and animates nothing", () => {
  const { container } = render(withTier("none", <StrokeKanji char="私" mode="write" />));
  expect(container.querySelector("svg")).toHaveAttribute("data-phase", "done");
  expect(animate).not.toHaveBeenCalled();
});

test("write animates pen and mask per stroke, widens the mask, fades the pen, then reports done", () => {
  const onDone = vi.fn();
  const { container } = render(withTier("full", <StrokeKanji char="ル" mode="write" onDone={onDone} />));
  // 2 strokes x (pen + mask) + 2 mask widenings + 1 pen fade
  expect(animate).toHaveBeenCalledTimes(7);
  act(() => vi.advanceTimersByTime(10_000));
  expect(onDone).toHaveBeenCalledOnce();
  expect(container.querySelector("svg")).toHaveAttribute("data-phase", "done");
});

test("switching to reduced motion mid-write cancels and shows the finished glyph", () => {
  const { container, rerender } = render(withTier("full", <StrokeKanji char="私" mode="write" />));
  rerender(withTier("none", <StrokeKanji char="私" mode="write" />));
  expect(container.querySelector("svg")).toHaveAttribute("data-phase", "done");
  const anims = animate.mock.results.map((r) => r.value as { cancel: ReturnType<typeof vi.fn> });
  expect(anims.length).toBeGreaterThan(0);
  expect(anims.every((a) => a.cancel.mock.calls.length === 1)).toBe(true);
});

test("StrokeWord writes characters in sequence and reports done once", async () => {
  const onDone = vi.fn();
  const { container } = render(withTier("full", <StrokeWord text="ミエル" mode="write" onDone={onDone} />));
  for (let i = 0; i < 3; i++) await act(async () => vi.advanceTimersByTime(10_000));
  expect(onDone).toHaveBeenCalledOnce();
  expect([...container.querySelectorAll("svg")].map((s) => s.getAttribute("data-phase"))).toEqual(["done", "done", "done"]);
});
