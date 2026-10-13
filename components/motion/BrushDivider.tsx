"use client";
import { useRef, type CSSProperties } from "react";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { SEASONS, type SeasonId } from "@/lib/seasons";
import { SealStamp } from "./SealStamp";
import styles from "./BrushDivider.module.css";

const STROKE = "M10 34 C 130 18, 260 46, 420 31 S 700 21, 860 33";

export function BrushDivider({ from, to, seal }: { from: SeasonId; to: SeasonId; seal: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();
  const vars = { "--from": SEASONS[from].paper, "--to": SEASONS[to].paper, "--stroke": SEASONS[to].ink } as CSSProperties;

  useGSAP(
    () => {
      if (tier === "none" || !ref.current) return;
      gsap.fromTo(ref.current.querySelectorAll("path"), { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut", stagger: 0.15,
        scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
      });
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={styles.divider} style={vars} aria-hidden="true">
      <svg viewBox="0 0 900 60" preserveAspectRatio="none" className={styles.svg}>
        <path d={STROKE} pathLength={1} strokeDasharray="1 1" className={styles.main} />
        <path d={STROKE} pathLength={1} strokeDasharray="1 1" className={styles.dry} transform="translate(6 5)" />
      </svg>
      <SealStamp decorative lang="ja" className={styles.seal}>{seal}</SealStamp>
    </div>
  );
}
