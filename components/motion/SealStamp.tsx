"use client";
import { useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import styles from "./SealStamp.module.css";

type Props = { children: ReactNode; decorative?: boolean; lang?: string; size?: "md" | "sm"; className?: string };

export function SealStamp({ children, decorative = false, lang, size = "md", className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const tier = useMotionTier();

  useGSAP(
    () => {
      if (tier === "none" || !ref.current) return;
      gsap.from(ref.current, {
        scale: 1.8, rotate: -10, autoAlpha: 0, duration: 0.45, ease: "back.out(2.2)",
        scrollTrigger: { trigger: ref.current, start: "top 90%", once: true },
      });
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  return (
    <span ref={ref} lang={lang} aria-hidden={decorative || undefined} className={cx(styles.seal, styles[size], className)}>
      {children}
    </span>
  );
}
