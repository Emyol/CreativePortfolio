import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import type { MotionTier } from "@/lib/motion/tier";
import { Screen } from "./Screen";

afterEach(() => vi.useRealTimers());
const at = (tier: MotionTier, ui: ReactNode) => <MotionTierContext.Provider value={tier}>{ui}</MotionTierContext.Provider>;

test("changing text flickers the screen once, for 120 ms", () => {
  vi.useFakeTimers();
  const { rerender } = render(at("full", <Screen lines={["SIDE A", "01 about"]} />));
  const el = () => document.querySelector("[data-screen]")!;
  expect(el()).not.toHaveAttribute("data-flicker");
  rerender(at("full", <Screen lines={["SIDE A", "02 events"]} />));
  expect(el()).toHaveAttribute("data-flicker");
  act(() => vi.advanceTimersByTime(130));
  expect(el()).not.toHaveAttribute("data-flicker");
});

test("reduced motion swaps the text with no flicker", () => {
  const { rerender } = render(at("none", <Screen lines={["SIDE A", "01 about"]} />));
  rerender(at("none", <Screen lines={["SIDE A", "02 events"]} />));
  expect(document.querySelector("[data-screen]")).not.toHaveAttribute("data-flicker");
  expect(document.querySelector("[data-screen]")).toHaveTextContent("02 events");
});

test("the elapsed time ticking does not flicker the screen", () => {
  const { rerender } = render(at("full", <Screen lines={["Song", "Artist  0:01"]} />));
  rerender(at("full", <Screen lines={["Song", "Artist  0:02"]} />));
  expect(document.querySelector("[data-screen]")).not.toHaveAttribute("data-flicker");
});
