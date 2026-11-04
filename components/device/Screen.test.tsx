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
// a stand-in.
function longRows(width = 500) {
  const animate = vi.fn(() => ({ cancel: vi.fn() }));
  // The text's width scales with the row's fit (its font size), as it would when laid out.
  const fit = (el: HTMLElement) => Number(el.closest("p")?.style.getPropertyValue("--fit") || 1);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.tagName === "SPAN" ? width * fit(this) : 0;
    });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return new DOMRect(0, 0, this.tagName === "SPAN" ? width * fit(this) : 0, 0);
    });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.tagName === "P" ? 200 : 0;
    });
  HTMLElement.prototype.animate = animate as unknown as HTMLElement["animate"];
  return { animate };
}

test("a title too long for the screen comes round for as long as it shows", () => {
  const rows = longRows();
  render(at("full", <Screen lines={["A song title far too long for the screen", "Artist  0:01"]} />));
  const row = document.querySelector("[data-screen] p")!;
  expect(row).toHaveAttribute("data-marquee");
  // It comes round to a copy of itself, hidden from screen readers.
  expect(row.querySelector("[aria-hidden]")).toHaveTextContent("A song title far too long for the screen");
  expect(rows.animate).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ iterations: Infinity }));
});

test("under reduced motion a title far too long only rests, cut short, its full text in the title", () => {
  const rows = longRows();
  render(at("none", <Screen lines={["A song title far too long for the screen"]} />));
  const row = document.querySelector<HTMLElement>("[data-screen] p")!;
  expect(row).not.toHaveAttribute("data-marquee");
  expect(row.style.getPropertyValue("--fit")).toBe(""); // 500 in 200 would go below the floor
  expect(row).toHaveAttribute("title", "A song title far too long for the screen");
  expect(rows.animate).not.toHaveBeenCalled();
});

test("the clock ticking does not start a long title over", () => {
  const rows = longRows();
  const { rerender } = render(at("full", <Screen lines={["Song", "An artist with a very long name  0:01"]} />));
  const started = rows.animate.mock.calls.length;
  rerender(at("full", <Screen lines={["Song", "An artist with a very long name  0:02"]} />));
  expect(rows.animate).toHaveBeenCalledTimes(started);
});

test("under reduced motion a title a little too long is set smaller to fit, whole", () => {
  longRows(220); // 10% over the 200 px screen
  render(at("none", <Screen lines={["PICK A TAPE", "six on the desk"]} />));
  const row = document.querySelector<HTMLElement>("[data-screen] p")!;
  const fit = Number(row.style.getPropertyValue("--fit"));
  expect(fit).toBeLessThan(1);
  expect(220 * fit).toBeLessThanOrEqual(200);
  expect(row).toHaveAttribute("data-fit");
});

test("with motion the same title comes round at its full size", () => {
  longRows(220);
  render(at("full", <Screen lines={["PICK A TAPE", "six on the desk"]} />));
  const row = document.querySelector<HTMLElement>("[data-screen] p")!;
  expect(row.style.getPropertyValue("--fit")).toBe("");
  expect(row).toHaveAttribute("data-marquee");
});
