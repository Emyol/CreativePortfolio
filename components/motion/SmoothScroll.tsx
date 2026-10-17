"use client";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { setLenis } from "@/lib/motion/navigate";

export function SmoothScroll() {
  const tier = useMotionTier();
  const pathname = usePathname();
  const enabled = tier === "full" && pathname !== "/tracklist";

  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({ autoRaf: false, anchors: false, lerp: 0.1 });
    const onScroll = () => ScrollTrigger.update();
    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", onScroll);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(lenis);
    return () => {
      setLenis(null);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, [enabled]);

  return null;
}
