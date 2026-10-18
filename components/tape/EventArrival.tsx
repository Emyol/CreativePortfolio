"use client";
import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";

/** Whether the photo's card-to-page morph is playing (a browser that can't tell says no). */
function morphing(): boolean {
  try {
    return document.documentElement.matches(":active-view-transition");
  } catch {
    return false;
  }
}

/**
 * The event page, written in once the clicked photo has grown into its header
 * (docs/superpowers/specs/2026-10-18-motion-design.md, "Opening an event"): the title and
 * meta rise, the story follows, the photos are dealt in. Only on arriving through that
 * morph: a direct visit, a browser without view transitions or reduced motion shows the page
 * as it is. Transforms and opacity only, so nothing shifts.
 */
export function EventArrival({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const tier = useMotionTier();

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || tier === "none" || !morphing()) return;
      const q = (sel: string) => [...root.querySelectorAll<HTMLElement>(sel)];
      const lines = [...q("header > *").reverse(), ...q("[data-story] > p")];
      const photos = q("[data-gallery] > li");
      // Set before the morph's new snapshot is taken (this runs as the page commits), so the
      // text isn't seen in place first; played once the morph has finished.
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(lines, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.08 }, 0);
      if (photos.length) tl.fromTo(photos, { y: 80, rotate: (i) => (i % 2 ? 6 : -6), opacity: 0 }, { y: 0, rotate: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.08 }, 0.25);
      tl.eventCallback("onComplete", () => gsap.set([...lines, ...photos], { clearProps: "transform,opacity" }));
      let frame = requestAnimationFrame(function wait() {
        if (morphing()) frame = requestAnimationFrame(wait);
        else tl.play();
      });
      return () => cancelAnimationFrame(frame);
    },
    { scope: ref, dependencies: [tier] },
  );

  return (
    <article ref={ref} className={className}>
      {children}
    </article>
  );
}
