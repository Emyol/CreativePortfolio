import type { Arrival } from "@/lib/motion/useHold";
import type { TrackId } from "@/lib/tape";

/**
 * Each track's own arrival, played while it holds (docs/superpowers/specs/2026-10-18-motion-design.md).
 * Distances are the desktop hold lengths measured in the mockups.
 */
export const ARRIVALS: Record<TrackId, Arrival> = {
  // The letter unfolds like a folded J-card insert: the lower fold swings down and open.
  about: {
    distance: 650,
    hold: (tl, { root }) => {
      const top = root.querySelector("[data-fold=top]");
      const bottom = root.querySelector("[data-fold=bottom]");
      if (top) tl.fromTo(top, { opacity: 0.4 }, { opacity: 1, duration: 0.3 }, 0);
      if (bottom) tl.fromTo(bottom, { rotateX: -178, transformPerspective: 1400, transformOrigin: "50% 0%" }, { rotateX: 0, ease: "power2.inOut", duration: 1 }, 0.1);
    },
  },
  events: { distance: 900, hold: () => {} },
  mixtape: { distance: 800, hold: () => {} },
  people: { distance: 1100, hold: () => {} },
  made: { distance: 850, hold: () => {} },
  "on-rotation": { distance: 700, hold: () => {} },
};
