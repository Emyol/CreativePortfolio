"use client";
import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { formatTrackNumber, type Track } from "@/lib/tape";
import styles from "./TrackSection.module.css";

/**
 * One track on the tape: its number, then its title lit on a screen tab that grows out of
 * the panel holding the content (orange on the table would fail contrast; on black it passes).
 */
export function TrackSection({ track, children }: { track: Track; children: ReactNode }) {
  const titleId = `${track.id}-title`;
  const ref = useRef<HTMLElement>(null);
  const tier = useMotionTier();

  // Each track rises 8 px into place once, as it enters. A track already on screen (or
  // above it) when the page settles is left alone: hiding it to fade it back would blink.
  // The decision waits two frames so a deep link's jump has landed first. Focus landing
  // inside finishes the rise at once.
  useGSAP(
    (_context, contextSafe) => {
      if (tier === "none" || !ref.current || !contextSafe) return;
      const el = ref.current;
      let tween: gsap.core.Tween | undefined;
      const arm = contextSafe(() => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;
        tween = gsap.from(el, { y: 8, opacity: 0, duration: 0.4, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 85%", once: true } });
      });
      let raf = requestAnimationFrame(() => (raf = requestAnimationFrame(arm)));
      const finish = () => tween?.progress(1);
      el.addEventListener("focusin", finish);
      return () => {
        cancelAnimationFrame(raf);
        el.removeEventListener("focusin", finish);
      };
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  return (
    <section ref={ref} id={track.id} aria-labelledby={titleId} className={styles.track} data-track={track.id} data-side={track.side}>
      <header className={styles.head}>
        <span className={styles.number} aria-hidden="true">{formatTrackNumber(track.number)}</span>
        <div className={styles.tab}>
          <h2 id={titleId} tabIndex={-1} data-track-heading className={styles.title}>{track.label}</h2>
        </div>
      </header>
      <div className={styles.panel}>{children}</div>
    </section>
  );
}
