"use client";
import { createContext, useContext, useEffect, useRef } from "react";

type Lines = [string, string];
type KnobHandler = (steps: number) => void;

/** What a section's device asks of the desk's player: its screen and its knob. */
export type DeskApi = {
  setScreen(lines: Lines, progress?: number): void;
  /** A hook: `handler` receives knob steps while the calling component is mounted. */
  useKnob(handler: KnobHandler): void;
  wiggleKnob(): void;
};

const NONE: DeskApi = {
  setScreen() {},
  useKnob() {
    // The same hook order with or without a desk around.
    useEffect(() => {}, []);
  },
  wiggleKnob() {},
};

export const DeskContext = createContext<DeskApi>(NONE);

/** Writes to the player's screen (a no-op outside the desk). */
export function useDeskScreen(): DeskApi["setScreen"] {
  return useContext(DeskContext).setScreen;
}

/** Receives knob steps while mounted; only the most recently mounted device gets them. */
export function useDeskKnob(handler: KnobHandler): void {
  useContext(DeskContext).useKnob(handler);
}

/**
 * The knob's side of the desk: a stack of handlers, the newest mounted receiving the steps.
 * `useKnob` is the hook the DeskApi hands out; `step` delivers the player's steps.
 */
export function knobStack() {
  const handlers: { current: KnobHandler }[] = [];
  return {
    step(steps: number) {
      handlers.at(-1)?.current(steps);
    },
    useKnob(handler: KnobHandler) {
      // The ref keeps the newest handler without re-registering (which would reorder the stack).
      const box = useRef(handler);
      useEffect(() => {
        box.current = handler;
      });
      useEffect(() => {
        handlers.push(box);
        return () => {
          const i = handlers.lastIndexOf(box);
          if (i >= 0) handlers.splice(i, 1);
        };
      }, []);
    },
  };
}
