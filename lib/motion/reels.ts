import type { MotionTier } from "./tier";

/** Angle in degrees and angular speed in degrees per second, in the direction tape plays. */
export type ReelState = { angle: number; omega: number };

/** Revolutions per second while a song plays: unhurried, like a real deck at 4.76 cm/s. */
export const PLAY_RPS = 0.6;
export const MAX_OMEGA = 1080;

/** Lenis reports velocity in px per frame; this turns a brisk scroll into a lively spin. */
const SCROLL_GAIN = 12;
/** Spin-up is quick, so the reels answer the wheel; the run-down is slower, like a flywheel. */
const SPIN_UP = 0.12;
const RUN_DOWN = 0.35;
/** A tab in the background returns with a huge dt; never integrate more than this. */
const MAX_DT = 0.1;

type Input = { velocity: number; playing: boolean; tier: MotionTier };

/**
 * One frame of reel motion. Playing holds a steady tape speed; otherwise, at full motion,
 * scrolling drives the reels and they coast to a stop. Reduced motion freezes them where
 * they are.
 */
export function stepReel(s: ReelState, dt: number, { velocity, playing, tier }: Input): ReelState {
  // Keep the current angle rather than resetting it, so switching reduced motion on mid-spin
  // leaves the reels exactly where they were instead of snapping.
  if (tier === "none") return { angle: s.angle, omega: 0 };
  const step = Math.min(Math.max(dt, 0), MAX_DT);
  // On phones (lite) scrolling does not drive the reels; only playback turns them.
  const target = playing ? PLAY_RPS * 360 : tier === "full" ? velocity * SCROLL_GAIN : 0;
  const tau = Math.abs(target) > Math.abs(s.omega) ? SPIN_UP : RUN_DOWN;
  // Exponential approach to the target: frame-rate independent, so the feel is the same at 60 Hz
  // and 120 Hz.
  let omega = target + (s.omega - target) * Math.exp(-step / tau);
  omega = Math.max(-MAX_OMEGA, Math.min(MAX_OMEGA, omega));
  // The exponential never quite reaches zero; snap the last crawl to a stop so the reels rest.
  if (!playing && target === 0 && Math.abs(omega) < 0.5) omega = 0;
  // Double modulo keeps the angle in [0, 360) even when the reels spin backwards (negative omega).
  const angle = (((s.angle + omega * step) % 360) + 360) % 360;
  return { angle, omega };
}
