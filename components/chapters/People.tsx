"use client";
import { useEffect, useRef, useState } from "react";
import type { Person } from "@/lib/content/schema";
import { finishOnFocus } from "@/lib/motion/finishOnFocus";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { threadPath } from "@/lib/thread";
import styles from "./People.module.css";

type Geometry = { d: string; w: number; h: number };

export function People({ people }: { people: Person[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();
  const [geom, setGeom] = useState<Geometry>({ d: "", w: 0, h: 0 });

  // The thread follows the real layout, so long notes can't break it. Knots face the centre
  // (text on the outer side), so the curves run through the gap between the columns.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const points = [...el.querySelectorAll<HTMLElement>("[data-knot]")].map((k) => {
        const r = k.getBoundingClientRect();
        return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
      });
      setGeom({ d: threadPath(points), w: box.width, h: box.height });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [people.length]);

  useGSAP(
    () => {
      if (tier === "none" || !geom.d) return;
      gsap.fromTo("[data-thread]", { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, ease: "none",
        scrollTrigger: { trigger: ref.current, start: "top 70%", end: "bottom 60%", scrub: 0.6 },
      });
      const cleanups = gsap.utils.toArray<HTMLElement>("[data-node]").map((node) =>
        finishOnFocus(node, gsap.from(node, { opacity: 0, scale: 0.85, duration: 0.5, ease: "back.out(2)", scrollTrigger: { trigger: node, start: "top 70%", once: true } })),
      );
      return () => cleanups.forEach((c) => c());
    },
    { scope: ref, dependencies: [tier, geom.d], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={styles.map}>
      <svg className={styles.svg} width={geom.w} height={geom.h} viewBox={`0 0 ${geom.w || 1} ${geom.h || 1}`} aria-hidden="true">
        <path d={geom.d} pathLength={1} strokeDasharray="1 1" className={styles.thread} data-thread />
      </svg>
      <ol className={styles.nodes}>
        {people.map((p, i) => (
          <li key={`${p.name}-${i}`} className={styles.node} data-side={i % 2 === 0 ? "left" : "right"} data-node>
            <span className={styles.knot} data-knot aria-hidden="true" />
            <div>
              <h3 className={styles.name}>{p.link ? <a href={p.link}>{p.name}</a> : p.name}</h3>
              <p className={styles.relation}>{p.relation}</p>
              {p.note && <p className={styles.note}>{p.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
