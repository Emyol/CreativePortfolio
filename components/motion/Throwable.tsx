"use client";
import { useRef, type ReactNode, type RefObject } from "react";
import { Draggable, gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";

type Home = { x: number; y: number; rotate: number };
type Props = {
  children: ReactNode;
  /** "home": thrown, it springs back to where it was taped. "table": it stays where it lands. */
  mode: "home" | "table";
  /** The area a table piece stays inside. */
  bounds?: RefObject<HTMLElement | null>;
  /** Table pieces that one "Tidy up" puts back together. */
  group?: string;
  /** A table piece's resting place, in % of the table and degrees. */
  home?: Home;
  className?: string;
};

const tidiers = new Map<string, Set<() => void>>();

/** Puts every piece of a table group back where it started. */
export function throwableTidy(group: string): void {
  tidiers.get(group)?.forEach((tidy) => tidy());
}

const coarse = () => window.matchMedia("(pointer: coarse)").matches;
let lifted = 10;

/**
 * Something on the table the visitor can pick up. With a mouse it is dragged and thrown with
 * momentum, tilting with the throw; on a touch screen a tap does it (a toss, or a move to a
 * new spot), so it never fights the page scroll. Reduced motion leaves it as it is.
 */
export function Throwable({ children, mode, bounds, group, home, className }: Props) {
  const tier = useMotionTier();
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || tier === "none") return;
      const rest = home?.rotate ?? 0;
      const settle = () => gsap.to(el, { x: 0, y: 0, rotate: rest, scale: 1, duration: 1.1, ease: "elastic.out(1, 0.55)" });
      const tidy = () => gsap.to(el, { x: 0, y: 0, rotate: rest, duration: 0.9, ease: "power3.inOut" });
      let set: Set<() => void> | undefined;
      if (group) {
        set = tidiers.get(group) ?? new Set();
        tidiers.set(group, set);
        set.add(tidy);
      }
      const unregister = () => set?.delete(tidy);

      if (coarse()) {
        const tap = () => {
          if (mode === "home") {
            gsap.timeline().to(el, { y: -60, rotate: rest - 12, scale: 1.05, duration: 0.25, ease: "power2.out" }).to(el, { y: 0, rotate: rest, scale: 1, duration: 0.6, ease: "elastic.out(1, 0.5)" });
            return;
          }
          const box = bounds?.current?.getBoundingClientRect();
          const r = el.getBoundingClientRect();
          if (!box) return;
          el.style.zIndex = String(++lifted);
          gsap.timeline()
            .to(el, { scale: 1.06, duration: 0.15, ease: "power2.out" })
            .to(el, { x: `+=${gsap.utils.random(box.left - r.left, box.right - r.right)}`, y: `+=${gsap.utils.random(box.top - r.top, box.bottom - r.bottom)}`, rotate: gsap.utils.random(-10, 10), scale: 1, duration: 0.6, ease: "power3.out" });
        };
        el.addEventListener("click", tap);
        return () => {
          el.removeEventListener("click", tap);
          unregister();
        };
      }

      const [drag] = Draggable.create(el, {
        type: "x,y",
        inertia: true,
        edgeResistance: mode === "table" ? 0.8 : 0.65,
        bounds: bounds?.current ?? undefined,
        onPress() {
          el.style.zIndex = String(++lifted);
          gsap.to(el, { scale: 1.05, duration: 0.2 });
        },
        onDrag() {
          gsap.to(el, { rotate: rest + gsap.utils.clamp(-25, 25, this.deltaX * 2), duration: 0.3 });
        },
        onThrowUpdate() {
          gsap.to(el, { rotate: rest + gsap.utils.clamp(-25, 25, this.deltaX * 2), duration: 0.3 });
        },
        onThrowComplete() {
          if (mode === "home") settle();
          else gsap.to(el, { scale: 1, duration: 0.35 });
        },
        onRelease() {
          if (this.tween) return; // still flying: onThrowComplete settles it
          if (mode === "home") settle();
          else gsap.to(el, { scale: 1, duration: 0.35 });
        },
      });
      return () => {
        drag.kill();
        unregister();
      };
    },
    { scope: ref, dependencies: [tier, mode, group], revertOnUpdate: true },
  );

  const place = home && mode === "table" ? { left: `${home.x}%`, top: `${home.y}%`, rotate: `${home.rotate}deg` } : undefined;
  return (
    <div ref={ref} className={className} style={tier === "none" ? undefined : place} data-throwable={mode}>
      {children}
    </div>
  );
}
