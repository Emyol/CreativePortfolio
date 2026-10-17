"use client";
import { useRef } from "react";
import { Photo } from "@/components/Photo";
import type { Hobby } from "@/lib/content/schema";
import { finishOnFocus } from "@/lib/motion/finishOnFocus";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import styles from "./Hobbies.module.css";

export function Hobbies({ hobbies }: { hobbies: Hobby[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const tier = useMotionTier();

  useGSAP(
    () => {
      if (tier === "none") return;
      const drop = gsap.from("[data-ema]", {
        y: -90, rotation: (i: number) => (i % 2 ? 8 : -8), opacity: 0,
        duration: 1.1, ease: "elastic.out(1, 0.45)", stagger: 0.12,
        scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
      });
      return finishOnFocus(ref.current, drop);
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  return (
    <ul ref={ref} className={styles.ema}>
      {hobbies.map((h, i) => (
        <li key={`${h.name}-${i}`} className={styles.slot} data-ema>
          <span className={styles.peg} aria-hidden="true" />
          <article className={styles.plaque}>
            <h3 className={styles.name}>{h.name}</h3>
            <p className={styles.note}>{h.note}</p>
            {h.photo && <Photo photo={h.photo} sizes="16rem" className={styles.photo} />}
            {h.link && (
              // The label starts with the visible word, so voice control users can say "More".
              <a href={h.link} className={styles.link} aria-label={`More about ${h.name}`}>
                More
              </a>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
