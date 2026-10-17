"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useActiveTrack } from "@/components/motion/ActiveTrack";
import { sideOf, type Track } from "@/lib/tape";
import { Device } from "./Device";
import { Dock } from "./Dock";
import { useKeyPress, useTrackKeys } from "./useTrackKeys";
import styles from "./HomeTape.module.css";

// The hero's keys stay in charge until most of the device has scrolled away.
const HERO_THRESHOLD = 0.3;

/**
 * The home page's device: the hero while it is in view, then the dock. Only one of the two
 * is interactive at a time; the other is inert. Both read the same tracks, side and track.
 */
export function HomeTape({ tracks, children }: { tracks: Track[]; children: ReactNode }) {
  const current = useActiveTrack();
  const side = sideOf(tracks, current);
  const [heroInView, setHeroInView] = useState(true);

  useEffect(() => {
    const hero = document.querySelector("[data-hero]");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setHeroInView(e.intersectionRatio >= HERO_THRESHOLD), {
      threshold: [0, HERO_THRESHOLD, 0.6, 1],
    });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  useTrackKeys(tracks, side);
  useKeyPress();

  return (
    <>
      <header data-hero id="top" className={styles.hero}>
        <Device tracks={tracks} side={side} current={current} interactive={heroInView} className={styles.device} />
      </header>
      {children}
      <Dock tracks={tracks} side={side} current={current} visible={!heroInView} />
    </>
  );
}
