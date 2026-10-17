"use client";
import { useEffect, useRef, useState } from "react";
import { Ja } from "@/components/Ja";
import type { Track } from "@/lib/content/schema";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import styles from "./Music.module.css";

export const NUMERALS = ["壱", "弐", "参", "肆", "伍"] as const;

const ENSO = "M100 18 C150 18 184 54 182 102 C180 150 142 184 98 182 C52 180 18 146 20 98 C22 62 46 32 82 22";

export function Music({ tracks }: { tracks: Track[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();
  const [onScreen, setOnScreen] = useState(false);

  // Only spin while visible: no hidden work off-screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(!!e?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      if (tier === "none") return;
      gsap.fromTo("[data-enso]", { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut",
        scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
      });
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={styles.music}>
      <div className={styles.record} data-record data-playing={onScreen} aria-hidden="true">
        <svg viewBox="0 0 200 200" className={styles.disc}>
          <circle cx="100" cy="100" r="96" className={styles.vinyl} />
          <circle cx="100" cy="100" r="28" className={styles.label} />
          <circle cx="100" cy="100" r="3" className={styles.hole} />
          <path d={ENSO} pathLength={1} strokeDasharray="1 1" className={styles.enso} data-enso />
        </svg>
      </div>
      <ol className={styles.setlist}>
        {tracks.map((t, i) => (
          <li key={`${t.title}-${i}`} className={styles.track}>
            <Ja aria-hidden="true" className={styles.numeral} data-numeral>{NUMERALS[i]}</Ja>
            <div>
              <p className={styles.title}>{t.link ? <a href={t.link}>{t.title}</a> : t.title}</p>
              {t.note && <p className={styles.note}>{t.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
