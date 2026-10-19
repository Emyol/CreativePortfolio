"use client";
import { useEffect, useRef } from "react";
import type { ShelfItem } from "@/lib/content/schema";
import { gsap } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import styles from "./OnRotation.module.css";

type Props = { item: ShelfItem; noteId: string; expanded: boolean; onExpand: () => void };

/** A cassette spine in the rack: hovered, focused or tapped, it is pulled up out of the rack. */
export function Spine({ item, noteId, expanded, onExpand }: Props) {
  const tier = useMotionTier();
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reduced motion: the rack stands still, so nothing stays raised from before.
    if (tier === "none") return void gsap.set(el, { clearProps: "transform", overwrite: true });
    gsap.to(el, expanded ? { y: -46, duration: 0.35, ease: "back.out(2)", overwrite: "auto" } : { y: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
  }, [expanded, tier]);

  return (
    <button
      ref={ref}
      type="button"
      className={styles.spine}
      aria-expanded={expanded}
      aria-controls={noteId}
      onPointerEnter={onExpand}
      onFocus={onExpand}
      onClick={onExpand}
      data-spine
      data-kind={item.kind}
    >
      <span className={styles.stripe} aria-hidden="true" />
      <span className={styles.spineTitle}>{item.title}</span>
      <span className={styles.kind}>{item.kind}</span>
    </button>
  );
}
