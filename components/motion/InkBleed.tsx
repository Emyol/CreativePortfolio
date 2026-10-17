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
    () => {
      if (tier === "none" || !ref.current) return;
      const [x, y] = origin === "random" ? [15 + Math.random() * 70, 15 + Math.random() * 70] : [50, 50];
      gsap.fromTo(
        ref.current,
        { "--x": `${x}%`, "--y": `${y}%`, "--r": "0%" },
        { "--r": "150%", duration: 1.1, ease: "power2.out", scrollTrigger: { trigger: ref.current, start, once: true } },
      );
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={cx("ink-mask", className)} data-ink-bleed>
      {children}
    </div>
  );
}
