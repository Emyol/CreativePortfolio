"use client";
import { useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { useHold } from "@/lib/motion/useHold";
import { ARRIVALS } from "./arrivals";
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

  // The track holds while the visitor's scroll plays its own arrival (arrivals.ts).
  useHold(ref, ARRIVALS[track.id], track.id);

  // The one cue every track shares: its title flickers on like the device's screen as the
  // track comes up. A title already on screen (or above it) when the page settles is left
  // lit; the decision waits two frames so a deep link's jump has landed first.
  useGSAP(
    (_context, contextSafe) => {
      if (tier === "none" || !ref.current || !contextSafe) return;
      const title = ref.current.querySelector<HTMLElement>("[data-track-heading]");
      if (!title) return;
      const arm = contextSafe(() => {
        if (title.getBoundingClientRect().top < window.innerHeight * 0.8) return;
        gsap.set(title, { opacity: 0 });
        ScrollTrigger.create({
          trigger: title,
          start: "top 80%",
          once: true,
          onEnter: () => gsap.to(title, { opacity: 1, duration: 0.05, repeat: 5, yoyo: true, ease: "steps(1)", onComplete: () => gsap.set(title, { opacity: 1 }) }),
        });
      });
      let raf = requestAnimationFrame(() => (raf = requestAnimationFrame(arm)));
      return () => cancelAnimationFrame(raf);
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
