"use client";
import { useEffect, useState, type RefObject } from "react";

export function useInViewOnce(ref: RefObject<Element | null>, rootMargin = "0px 0px -15% 0px"): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen, rootMargin]);
  return seen;
}
