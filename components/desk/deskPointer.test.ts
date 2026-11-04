import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackId } from "@/lib/tape";
import { attachDeskPointer, type PointerScene } from "./deskPointer";

// The pointer's grammar on the desk: a press that wanders no more than 7 px is a click (and
// loads the tape once the double-click wait is over), a longer one is a drag; a drag across
// the player turns the knob a step per 60 px, and the wheel over it a step per 100 of delta
// (a notch), the remainder kept for the next turn; a line-mode wheel is a notch per event.

type Hit = { tape: TrackId | null; player: boolean };

function setup(hit: Hit = { tape: null, player: false }) {
  const el = document.createElement("div");
  document.body.append(el);
  el.setPointerCapture = () => {};
  el.hasPointerCapture = () => false;
  el.releasePointerCapture = () => {};
  const s: PointerScene = {
    el,
    pickTape: vi.fn(() => hit.tape),
    overPlayer: vi.fn(() => hit.player),
    hover: vi.fn(),
    grab: vi.fn(),
    dragTo: vi.fn(),
    release: vi.fn(),
    inspecting: vi.fn(() => null),
    beginTurn: vi.fn(),
    turnInspect: vi.fn(),
    inspect: vi.fn(),
    putBack: vi.fn(),
    turnKnob: vi.fn(),
    aimLamp: vi.fn(),
  };
  const cb = { onTapeClick: vi.fn(), onKnob: vi.fn() };
  const detach = attachDeskPointer(s, cb);
  const pointer = (type: string, x: number, y: number) => {
    const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
    Object.defineProperty(e, "pointerId", { value: 1 });
    el.dispatchEvent(e);
  };
  const wheel = (deltaY: number, deltaMode = 0) => {
    const e = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY, deltaMode, clientX: 10, clientY: 10 });
    el.dispatchEvent(e);
    return e;
  };
  return { el, s, cb, pointer, wheel, detach };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("deskPointer", () => {
  it("a press that wanders 7 px or less is a click: the tape loads once the double-click wait is over", () => {
    const { s, cb, pointer } = setup({ tape: "events", player: false });
    pointer("pointerdown", 100, 100);
    pointer("pointermove", 105, 104); // 6.4 px
    pointer("pointerup", 105, 104);
    expect(s.dragTo).not.toHaveBeenCalled();
    expect(cb.onTapeClick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(cb.onTapeClick).toHaveBeenCalledWith("events");
  });

  it("a press that wanders further is a drag, not a click", () => {
    const { s, cb, pointer } = setup({ tape: "events", player: false });
    pointer("pointerdown", 100, 100);
    pointer("pointermove", 106, 104); // 7.2 px
    pointer("pointerup", 106, 104);
    vi.advanceTimersByTime(500);
    expect(s.dragTo).toHaveBeenCalledWith(106, 104);
    expect(s.release).toHaveBeenCalledOnce();
    expect(cb.onTapeClick).not.toHaveBeenCalled();
  });

  it("two clicks within the wait pick the tape up instead of loading it", () => {
    const { s, cb, pointer } = setup({ tape: "people", player: false });
    for (let i = 0; i < 2; i++) {
      pointer("pointerdown", 50, 50);
      pointer("pointerup", 50, 50);
      vi.advanceTimersByTime(100);
    }
    vi.advanceTimersByTime(500);
    expect(s.inspect).toHaveBeenCalledWith("people");
    expect(cb.onTapeClick).not.toHaveBeenCalled();
  });

  it("a drag across the player turns the knob a step per 60 px, either way, the rest carried", () => {
    const { s, cb, pointer } = setup({ tape: null, player: true });
    pointer("pointerdown", 100, 100);
    pointer("pointermove", 159, 100);
    expect(s.turnKnob).not.toHaveBeenCalled();
    pointer("pointermove", 160, 100);
    expect(s.turnKnob).toHaveBeenLastCalledWith(1);
    pointer("pointermove", 290, 100); // 130 px on from the step: two more
    expect(s.turnKnob).toHaveBeenLastCalledWith(2);
    pointer("pointermove", 160, 100); // 120 px back from where the last step left it (280): two the other way
    expect(s.turnKnob).toHaveBeenLastCalledWith(-2);
    expect(cb.onKnob.mock.calls.map(([n]) => n)).toEqual([1, 2, -2]);
  });

  it("the wheel over the player turns a step per notch of 100, keeping the remainder, and the page does not scroll", () => {
    const { s, cb, wheel } = setup({ tape: null, player: true });
    expect(wheel(60).defaultPrevented).toBe(true);
    expect(s.turnKnob).not.toHaveBeenCalled();
    wheel(60); // 120: one step, 20 left
    expect(s.turnKnob).toHaveBeenLastCalledWith(1);
    wheel(80); // 100 again
    expect(s.turnKnob).toHaveBeenLastCalledWith(1);
    wheel(-250); // -250: two back, -50 left
    expect(s.turnKnob).toHaveBeenLastCalledWith(-2);
    wheel(3, 1); // a line-mode notch is one step whatever its delta (-50 + 100)
    expect(s.turnKnob).toHaveBeenCalledTimes(3);
    wheel(1, 1);
    expect(s.turnKnob).toHaveBeenLastCalledWith(1);
    expect(cb.onKnob.mock.calls.map(([n]) => n)).toEqual([1, 1, -2, 1]);
  });

  it("the wheel anywhere but over the player is the page's", () => {
    const { s, wheel } = setup({ tape: null, player: false });
    expect(wheel(300).defaultPrevented).toBe(false);
    expect(s.turnKnob).not.toHaveBeenCalled();
  });
});
