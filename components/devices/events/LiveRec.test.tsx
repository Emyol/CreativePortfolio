import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { DeskContext, knobStack, type DeskApi } from "@/components/desk/deskContext";
import { FIXTURES } from "@/lib/content/fixtures";
import { __resetBackForTests, runBack } from "@/lib/desk/back";
import { __resetEventsMemoryForTests, recalledEvent } from "@/lib/devices/events";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import type { MotionTier } from "@/lib/motion/tier";
import { LiveRec } from "./LiveRec";

const event = FIXTURES.events[1];

function renderRec(tier: MotionTier = "full", setScreen: DeskApi["setScreen"] = () => {}) {
  const api: DeskApi = { setScreen, wiggleKnob() {}, useKnob: knobStack().useKnob };
  return render(
    <MotionTierContext.Provider value={tier}>
      <DeskContext.Provider value={api}>
        <LiveRec event={event} number={3} base="" />
      </DeskContext.Provider>
    </MotionTierContext.Provider>,
  );
}

const clock = () => document.querySelector("[data-rec-clock]")?.textContent;

describe("LiveRec", () => {
  beforeEach(() => {
    __resetBackForTests();
    __resetEventsMemoryForTests();
    push.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("is the live recording: its number, the summary, and the player's screen", () => {
    const setScreen = vi.fn();
    renderRec("full", setScreen);
    expect(screen.getByRole("group", { name: /live recording/i })).toHaveTextContent("● LIVE REC 03");
    expect(screen.getByText(event.summary)).toBeInTheDocument();
    expect(setScreen).toHaveBeenLastCalledWith(["02 EVENTS", "● LIVE REC 03"]);
    // Back on the list, this event is the one selected.
    expect(recalledEvent()).toBe(event.slug);
  });

  it("steps back to the list on Esc", () => {
    const { unmount } = renderRec();
    expect(runBack()).toBe(true);
    expect(push).toHaveBeenCalledWith("/events");
    unmount();
    expect(runBack()).toBe(false);
  });

  it("runs its clock, which holds still under reduced motion", () => {
    const { unmount } = renderRec("full");
    expect(clock()).toBe("00:00");
    act(() => vi.advanceTimersByTime(3_100));
    expect(clock()).toBe("00:03");
    unmount();
    renderRec("none");
    act(() => vi.advanceTimersByTime(3_100));
    expect(clock()).toBe("00:00");
  });
});
