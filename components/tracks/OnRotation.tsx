"use client";
import { useId, useRef, useState } from "react";
import type { ShelfItem } from "@/lib/content/schema";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { getLenis } from "@/lib/motion/navigate";
import { Spine } from "./Spine";
import styles from "./OnRotation.module.css";

/**
 * Games, anime and manga Miel is into right now, as cassette spines in a rack. They drop
 * into the rack as the track arrives (arrivals.ts); hovering, focusing or tapping a spine
 * pulls it up and shows its note below; scrolling fast makes the spines lean.
 */
export function OnRotation({ items }: { items: ShelfItem[] }) {
  const [open, setOpen] = useState(0);
  const base = useId();
  const tier = useMotionTier();
  const rack = useRef<HTMLUListElement>(null);

  // The spines lean with the scroll speed, and straighten when it stops.
  useGSAP(
    () => {
      const spines = rack.current?.querySelectorAll<HTMLElement>("[data-spine]");
      if (!spines?.length || tier === "none") return;
      const lean = gsap.quickTo(spines, "skewX", { duration: 0.6, ease: "power3" });
      const tick = () => {
        const v = getLenis()?.velocity ?? 0;
        lean(gsap.utils.clamp(-14, 14, -v * 0.5));
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    },
    { scope: rack, dependencies: [tier, items.length], revertOnUpdate: true },
  );

  return (
    <div className={styles.shelf}>
      <ul ref={rack} className={styles.rack}>
        {items.map((item, i) => (
          <li key={`${item.title}-${i}`} className={styles.slot}>
            <h3 className={styles.title}>
              <Spine item={item} noteId={`${base}-${i}`} expanded={open === i} onExpand={() => setOpen(i)} />
            </h3>
          </li>
        ))}
      </ul>
      <div className={styles.notes}>
        {items.map((item, i) => (
          <div key={`${item.title}-${i}`} id={`${base}-${i}`} className={styles.note} hidden={open !== i}>
            <p className={styles.noteTitle}>
              <span>{item.title}</span> <span className={styles.noteKind}>{item.kind}</span>
            </p>
            {item.note.split(/\n\s*\n/).map((p, j) => (
              <p key={j}>{p}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
