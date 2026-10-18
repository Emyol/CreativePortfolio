import type { Arrival } from "@/lib/motion/useHold";
import type { TrackId } from "@/lib/tape";

/**
 * Each track's own arrival, played while it holds (docs/superpowers/specs/2026-10-18-motion-design.md).
 * Distances are the desktop hold lengths measured in the mockups.
 */
export const ARRIVALS: Record<TrackId, Arrival> = {
  about: { distance: 650, hold: () => {} },
  events: { distance: 900, hold: () => {} },
  mixtape: { distance: 800, hold: () => {} },
  people: { distance: 1100, hold: () => {} },
  made: { distance: 850, hold: () => {} },
  "on-rotation": { distance: 700, hold: () => {} },
};
