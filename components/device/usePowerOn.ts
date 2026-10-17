"use client";
import { useEffect, useRef, useState } from "react";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { writeStorage } from "@/lib/motion/storage";
import { POWER_KEY } from "@/lib/powerOn";

const TEXT = "SIDE A";
const DELAY_MS = 120;
const STEP_MS = 80;
const HOLD_MS = 220;

/**
 * Once per session the screen lights and types SIDE A, about 600 ms in all. The device is
 * visible and usable throughout; only the screen's text waits. Returns what the screen
 * shows meanwhile, and whether the LED is on.
 */
export function usePowerOn(): { lines: string[] | undefined; on: boolean } {
  const tier = useMotionTier();
  const [typed, setTyped] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const finish = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    writeStorage("session", POWER_KEY, "1");
    delete document.documentElement.dataset.boot;
    setTyped(null);
  };

  useEffect(() => {
    if (document.documentElement.dataset.boot !== "pending") return;
    setTyped("");
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    for (let i = 1; i <= TEXT.length; i++) at(DELAY_MS + i * STEP_MS, () => setTyped(TEXT.slice(0, i)));
    at(DELAY_MS + TEXT.length * STEP_MS + HOLD_MS, finish);
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  // Reveal the screen only once its dark state has rendered, so the text never flashes.
  useEffect(() => {
    if (typed !== null) delete document.documentElement.dataset.boot;
  }, [typed]);

  // Reduced motion switched on mid-boot: light up at once.
  useEffect(() => {
    if (tier === "none" && typed !== null) finish();
  }, [tier, typed]);

  return { lines: typed === null ? undefined : [typed], on: typed !== null };
}
