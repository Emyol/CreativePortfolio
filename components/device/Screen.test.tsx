import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import type { MotionTier } from "@/lib/motion/tier";
import { Screen } from "./Screen";

const realAnimate = HTMLElement.prototype.animate;
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  HTMLElement.prototype.animate = realAnimate;
});
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

// jsdom lays nothing out: every row's text is 500 px wide in a 200 px screen, and animate() is
// a stand-in that finishes when told to.
function longRows() {
  const ends: (() => void)[] = [];
  const animate = vi.fn(() => ({ finished: new Promise<void>((r) => ends.push(r)), cancel: vi.fn() }));
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.tagName === "SPAN" ? 500 : 0;
    });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.tagName === "P" ? 200 : 0;
    });
  HTMLElement.prototype.animate = animate as unknown as HTMLElement["animate"];
  return { animate, finish: () => act(async () => ends.forEach((end) => end())) };
}

test("a title too long for the screen comes round a few passes, then rests cut short", async () => {
  const rows = longRows();
  render(at("full", <Screen lines={["A song title far too long for the screen", "Artist  0:01"]} />));
  const row = document.querySelector("[data-screen] p")!;
  expect(row).toHaveAttribute("data-marquee");
  // It comes round to a copy of itself, hidden from screen readers.
  expect(row.querySelector("[aria-hidden]")).toHaveTextContent("A song title far too long for the screen");
  expect(rows.animate).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ iterations: 3 }));
  await rows.finish();
  expect(row).not.toHaveAttribute("data-marquee");
  expect(row.querySelector("[aria-hidden]")).toBeNull();
});

test("under reduced motion a long title only rests, cut short", () => {
  const rows = longRows();
  render(at("none", <Screen lines={["A song title far too long for the screen"]} />));
  expect(document.querySelector("[data-screen] p")).not.toHaveAttribute("data-marquee");
  expect(rows.animate).not.toHaveBeenCalled();
});

test("the clock ticking does not start a long title over", () => {
  const rows = longRows();
  const { rerender } = render(at("full", <Screen lines={["Song", "An artist with a very long name  0:01"]} />));
  const started = rows.animate.mock.calls.length;
  rerender(at("full", <Screen lines={["Song", "An artist with a very long name  0:02"]} />));
  expect(rows.animate).toHaveBeenCalledTimes(started);
});
