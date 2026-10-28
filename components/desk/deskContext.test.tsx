import { render } from "@testing-library/react";
import { useMemo, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { DeskContext, knobStack, useDeskKnob, useDeskScreen, type DeskApi } from "./deskContext";

function Device({ onStep }: { onStep(steps: number): void }) {
  useDeskKnob(onStep);
  return null;
}

function Harness({ knob, children, setScreen = () => {} }: { knob: ReturnType<typeof knobStack>; children: ReactNode; setScreen?: DeskApi["setScreen"] }) {
  const api = useMemo<DeskApi>(() => ({ setScreen, useKnob: knob.useKnob, wiggleKnob() {} }), [knob, setScreen]);
  return <DeskContext.Provider value={api}>{children}</DeskContext.Provider>;
}

describe("deskContext", () => {
  it("sends knob steps only to the most recently mounted device", () => {
    const knob = knobStack();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <Harness knob={knob}>
        <Device onStep={first} />
      </Harness>,
    );
    rerender(
      <Harness knob={knob}>
        <Device onStep={first} />
        <Device onStep={second} />
      </Harness>,
    );
    knob.step(2);
    expect(second).toHaveBeenCalledWith(2);
    expect(first).not.toHaveBeenCalled();

    // The newest unmounts: the earlier device gets the knob back.
    rerender(
      <Harness knob={knob}>
        <Device onStep={first} />
      </Harness>,
    );
    knob.step(-1);
    expect(first).toHaveBeenCalledWith(-1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("calls the newest handler a device passed, without re-registering it", () => {
    const knob = knobStack();
    const a = vi.fn();
    const b = vi.fn();
    const { rerender } = render(
      <Harness knob={knob}>
        <Device onStep={a} />
      </Harness>,
    );
    rerender(
      <Harness knob={knob}>
        <Device onStep={b} />
      </Harness>,
    );
    knob.step(1);
    expect(b).toHaveBeenCalledWith(1);
    expect(a).not.toHaveBeenCalled();
  });

  it("writes to the desk's screen, and is a no-op outside a desk", () => {
    const setScreen = vi.fn();
    function Writer() {
      const screen = useDeskScreen();
      screen(["01 ABOUT", "▶ PLAYING"], 0.5);
      return null;
    }
    render(
      <Harness knob={knobStack()} setScreen={setScreen}>
        <Writer />
      </Harness>,
    );
    expect(setScreen).toHaveBeenCalledWith(["01 ABOUT", "▶ PLAYING"], 0.5);
    expect(() => render(<Writer />)).not.toThrow();
    expect(() => render(<Device onStep={() => {}} />)).not.toThrow();
  });
});
