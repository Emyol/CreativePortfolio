"use client";
import type { RefObject } from "react";
import { gsap, ScrollTrigger, useGSAP } from "./gsap";
import { holdDistance, holdStart, isTall, REST } from "./hold";
import { useMotionTier } from "./MotionProvider";
import { getLenis } from "./navigate";
import type { MotionTier } from "./tier";

export type ArrivalContext = { root: HTMLElement; held: HTMLElement[]; tier: MotionTier };

/**
 * How a section arrives. `hold` builds the arrival played while the section is held, over
 * `ctx.held` (every item, or for a section taller than the screen, the items on screen
 * while it holds); `enter` plays for each later item as it scrolls in.
 */
export type Arrival = {
  /** Scroll the hold lasts at full motion, in px. */
  distance: number;
  /** The section's repeating items, if its arrival is per item. */
  items?: string;
  hold: (tl: gsap.core.Timeline, ctx: ArrivalContext) => void;
  enter?: (tl: gsap.core.Timeline, item: HTMLElement) => void;
};

const write = (root: HTMLElement, progress: number) => root.setAttribute("data-arrival", progress.toFixed(2));

/**
 * Holds a section still once it is fully in view while the visitor's scroll plays its
 * arrival, and lets go only when the arrival is finished, after a short still rest.
 * Scrolling back reverses it. Lenis already smooths the scroll, so the arrival follows it
 * exactly (`scrub: true`): any scrub delay made arrivals trail the scroll and still be
 * finishing as the section moved away. Reduced motion never holds.
 */
export function useHold(ref: RefObject<HTMLElement | null>, arrival: Arrival, id?: string): void {
  const tier = useMotionTier();

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || tier === "none") return;
      const items = arrival.items ? [...root.querySelectorAll<HTMLElement>(arrival.items)] : [];
      const tall = isTall(root.offsetHeight, innerHeight);
      // A tall section holds with its top 10 px down: an item is held if at least half of
      // it is on screen then; the rest arrive as they scroll in, so none plays out of sight.
      const rootTop = root.getBoundingClientRect().top;
      const held = tall ? items.filter((it) => it.getBoundingClientRect().top - rootTop + 10 + it.offsetHeight / 2 < innerHeight) : items;

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          id: id ? `hold-${id}` : undefined,
          trigger: root,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          start: () => holdStart(root.offsetHeight, innerHeight),
          end: () => `+=${holdDistance(arrival.distance, tier)}`,
          onUpdate: (st) => write(root, st.progress),
          onRefresh: (st) => write(root, st.progress),
        },
      });
      arrival.hold(tl, { root, held, tier });
      tl.to({}, { duration: Math.max(0.15, tl.duration() * REST) });

      // Items inside the pinned section: pinnedContainer accounts for the hold's scroll.
      if (arrival.enter) {
        for (const item of items.filter((it) => !held.includes(it))) {
          arrival.enter(gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: item, pinnedContainer: root, start: "top 90%", end: "top 60%", scrub: true } }), item);
        }
      }

      // Keyboard users never wait on a hold: focus inside finishes it.
      const st = tl.scrollTrigger as ScrollTrigger;
      const finish = () => {
        if (st.progress >= 1) return;
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(st.end, { immediate: true });
        else window.scrollTo(0, st.end);
      };
      root.addEventListener("focusin", finish);
      return () => {
        root.removeEventListener("focusin", finish);
        root.removeAttribute("data-arrival");
      };
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );
}
