"use client";
import { useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";

type Props = { children: ReactNode; origin?: "center" | "random"; className?: string; start?: string };

export function InkBleed({ children, origin = "center", className, start = "top 85%" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();

  useGSAP(
    (_context, contextSafe) => {
      if (tier === "none" || !ref.current || !contextSafe) return;
      const el = ref.current;
      const setup = contextSafe(() => {
        // Something already on screen (first paint, a deep link, Back to Events) was seen
        // fully drawn; hiding it to bleed in again would be a second entrance.
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) return;
        const [x, y] = origin === "random" ? [15 + Math.random() * 70, 15 + Math.random() * 70] : [50, 50];
        gsap.fromTo(
          el,
          { "--x": `${x}%`, "--y": `${y}%`, "--r": "0%" },
          { "--r": "150%", duration: 1.1, ease: "power2.out", scrollTrigger: { trigger: el, start, once: true } },
        );
      });
      // Two frames: let any hash jump (HashLinks scrolls one frame after mount) land first.
      let raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(setup);
      });
      return () => cancelAnimationFrame(raf);
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={cx("ink-mask", className)} data-ink-bleed>
      {children}
    </div>
  );
}
