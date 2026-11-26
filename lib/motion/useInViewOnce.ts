"use client";
import { useEffect, useState, type RefObject } from "react";

// Flips to true the first time the element comes into view and then stays true, so whatever
// it gates (a 3D scene, a photo draw) starts once and isn't undone when it scrolls away. The
// default margin trims 15% off the bottom of the viewport, so "in view" means properly on
// screen rather than a sliver peeking in; callers wanting an early start (the flip, the dot
// photos, the underside device) pass a margin a whole screen wide to begin before arrival.
export function useInViewOnce(ref: RefObject<Element | null>, rootMargin = "0px 0px -15% 0px"): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    // Once seen there is nothing left to watch, so no observer is set up again.
    if (!el || seen) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setSeen(true);
        // Disconnect straight away rather than waiting for the cleanup, so no further
        // entries are delivered after the one that counted.
        io.disconnect();
      }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen, rootMargin]);
  return seen;
}
