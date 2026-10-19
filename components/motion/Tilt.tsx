"use client";
import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";

type Props = { children: ReactNode; max?: { x: number; y: number }; className?: string };

/**
 * Tilts toward the cursor like a print held in the hand, with a soft light following it
 * (the --gx/--gy custom properties). Touch screens and reduced motion get it still.
 */
export function Tilt({ children, max = { x: 8, y: 10 }, className }: Props) {
  const tier = useMotionTier();
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || tier === "none" || window.matchMedia("(pointer: coarse)").matches) return;
      gsap.set(el, { transformPerspective: 700 });
      const rx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3" });
      const ry = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3" });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        rx(-(py - 0.5) * 2 * max.x);
        ry((px - 0.5) * 2 * max.y);
        el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
      };
      const leave = () => {
        rx(0);
        ry(0);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      };
    },
    { scope: ref, dependencies: [tier, max.x, max.y], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={className} data-tilt>
      {children}
    </div>
  );
}
