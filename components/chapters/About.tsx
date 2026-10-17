"use client";
import { useRef } from "react";
import { SealStamp } from "@/components/motion/SealStamp";
import { Photo } from "@/components/Photo";
import type { About as AboutData } from "@/lib/content/schema";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import styles from "./About.module.css";

export function About({ about }: { about: AboutData }) {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();

  useGSAP(
    () => {
      if (tier === "none") return;
      gsap.fromTo(
        "[data-letter-line]",
        { clipPath: "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0)", duration: 1, stagger: 0.4, ease: "power1.inOut",
          scrollTrigger: { trigger: "[data-letter]", start: "top 75%", once: true },
        },
      );
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={styles.about}>
      <article className={styles.letter} aria-label="A letter from Miel" data-letter>
        {about.letter.map((p, i) => (
          <p key={i} className={styles.line} data-letter-line>{p}</p>
        ))}
        <p className={styles.sign}>Miel</p>
      </article>

      {about.candid && (
        <figure className={styles.candid}>
          <span className={styles.tape} aria-hidden="true" />
          <Photo photo={about.candid} sizes="(min-width: 768px) 320px, 80vw" className={styles.photo} />
        </figure>
      )}

      {about.toolbox.length > 0 && (
        <div className={styles.toolbox}>
          <h3 id="toolbox-title" className={styles.toolboxTitle}>Toolbox</h3>
          <ul aria-labelledby="toolbox-title" className={styles.stamps}>
            {about.toolbox.map((tool) => (
              <li key={tool}><SealStamp size="sm">{tool}</SealStamp></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
