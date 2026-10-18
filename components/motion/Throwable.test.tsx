import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { setMedia } from "@/tests/media";

const spies = vi.hoisted(() => ({ timeline: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/motion/gsap", () => {
  const tl = { to: () => tl, kill: () => {} };
  spies.timeline.mockImplementation(() => tl);
  spies.create.mockImplementation(() => [{ kill: () => {} }]);
  return {
    gsap: { timeline: spies.timeline, to: vi.fn(), set: vi.fn(), killTweensOf: vi.fn(), getProperty: () => 0, utils: { clamp: (a: number, b: number, v: number) => Math.min(b, Math.max(a, v)), random: (a: number) => a } },
    Draggable: { create: spies.create },
    // Runs the setup like useGSAP does, without needing a real GSAP context.
    useGSAP: (fn: () => void | (() => void), opts?: { dependencies?: unknown[] }) => useEffect(() => fn() ?? undefined, opts?.dependencies ?? []), // eslint-disable-line react-hooks/exhaustive-deps
  };
});

import { Throwable } from "./Throwable";

const renderAt = (tier: "full" | "lite" | "none") =>
  render(
    <MotionTierContext.Provider value={tier}>
      <Throwable mode="home">
        <span>photo</span>
      </Throwable>
    </MotionTierContext.Provider>,
  );

beforeEach(() => {
  spies.timeline.mockClear();
  spies.create.mockClear();
});

test("a fine pointer can drag and throw it", () => {
  renderAt("full");
  expect(spies.create).toHaveBeenCalledTimes(1);
});

test("a coarse pointer gets a tap, not a drag", () => {
  setMedia("(pointer: coarse)", true);
  renderAt("lite");
  fireEvent.click(screen.getByText("photo"));
  expect(spies.create).not.toHaveBeenCalled();
  expect(spies.timeline).toHaveBeenCalled();
});

test("reduced motion renders the child untouched", () => {
  renderAt("none");
  fireEvent.click(screen.getByText("photo"));
  expect(spies.create).not.toHaveBeenCalled();
  expect(spies.timeline).not.toHaveBeenCalled();
  expect(screen.getByText("photo").closest("[data-throwable]")).not.toHaveAttribute("style");
});
