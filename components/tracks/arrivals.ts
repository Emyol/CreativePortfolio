import { gsap } from "@/lib/motion/gsap";
import type { Arrival } from "@/lib/motion/useHold";
import type { TrackId } from "@/lib/tape";

/** A print recorded in to `share` (0 to 1): revealed from the left, dark and grey to full colour. */
function record(li: HTMLElement, share: number) {
  const f = gsap.utils.clamp(0, 1, share);
  li.style.clipPath = `inset(0 ${((1 - f) * 100).toFixed(1)}% 0 0)`;
  const media = li.querySelector<HTMLElement>("[data-media]");
  if (media) media.style.filter = f >= 1 ? "" : `brightness(${(0.35 + 0.65 * f).toFixed(3)}) saturate(${f.toFixed(3)})`;
}

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
  // A red REC playhead sweeps across and records each print in as it passes.
  events: {
    distance: 900,
    items: "li",
    hold: (tl, { root, held }) => {
      const rec = root.querySelector<HTMLElement>("[data-rec]");
      const list = root.querySelector<HTMLElement>("ul");
      if (!list) return;
      const head = { at: 0 };
      const paint = () => {
        const x = head.at * (list.offsetWidth + 40) - 20;
        if (rec) gsap.set(rec, { x, opacity: head.at > 0 && head.at < 1 ? 1 : 0 });
        for (const li of held) record(li, (x - li.offsetLeft) / li.offsetWidth);
      };
      paint();
      tl.to(head, { at: 1, duration: 1, onUpdate: paint }, 0);
    },
    enter: (tl, li) => {
      const row = { at: 0 };
      record(li, 0);
      tl.to(row, { at: 1, duration: 1, onUpdate: () => record(li, row.at) });
    },
  },
  mixtape: { distance: 800, hold: () => {} },
  people: { distance: 1100, hold: () => {} },
  made: { distance: 850, hold: () => {} },
  "on-rotation": { distance: 700, hold: () => {} },
};
