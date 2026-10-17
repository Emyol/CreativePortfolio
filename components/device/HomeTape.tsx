"use client";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useActiveTrack } from "@/components/motion/ActiveTrack";
import { clock } from "@/components/tracks/Mixtape";
import { getPlayback, getServerPlayback, subscribePlayback } from "@/lib/playback";
import { sideOf, type Track } from "@/lib/tape";
import { Device } from "./Device";
import { Dock } from "./Dock";
import { usePowerOn } from "./usePowerOn";
import { useReelMotion } from "./useReelMotion";
import { useKeyPress, useTrackKeys } from "./useTrackKeys";
import styles from "./HomeTape.module.css";

// The hero's keys stay in charge until most of the device has scrolled away.
const HERO_THRESHOLD = 0.3;

/**
 * The home page's device: the hero while it is in view, then the dock. Only one of the two
 * is interactive at a time; the other is inert. Both read the same tracks, side and track.
 */
type Song = { title: string; artist: string };

export function HomeTape({ tracks, songs, children }: { tracks: Track[]; songs: Song[]; children: ReactNode }) {
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

  // While a song is loaded the screens show it, with the elapsed time and the playhead.
  const playback = useSyncExternalStore(subscribePlayback, getPlayback, getServerPlayback);
  const song = playback.song !== null && playback.status !== "idle" && playback.status !== "error" ? songs[playback.song] : undefined;
  const nowPlaying = song ? [song.title, `${song.artist}  ${clock(playback.position)}`] : undefined;
  const progress = song ? (playback.duration > 0 ? playback.position / playback.duration : 0) : undefined;
  const lit = playback.status === "playing";
  const power = usePowerOn();

  useTrackKeys(tracks, side);
  useKeyPress();
  useReelMotion(tracks);

  return (
    <>
      <header data-hero id="top" className={styles.hero}>
        <Device tracks={tracks} side={side} current={current} interactive={heroInView} screen={power.lines ?? nowPlaying} progress={power.lines ? undefined : progress} led={lit || power.on} className={styles.device} />
      </header>
      {children}
      <Dock tracks={tracks} side={side} current={current} visible={!heroInView} screen={nowPlaying} progress={progress} />
    </>
  );
}
