"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useActiveTrack } from "@/components/motion/ActiveTrack";
import { Hero3D } from "@/components/three/Hero3D";
import { clock } from "@/components/tracks/Mixtape";
import { getCue, getServerCue, subscribeCue } from "@/lib/cue";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { setHeroScroll } from "@/lib/motion/heroScroll";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { getPlayback, getServerPlayback, subscribePlayback } from "@/lib/playback";
import { installSoundUnlock } from "@/lib/sound";
import { sideOf, type Track } from "@/lib/tape";
import { Device } from "./Device";
import { Dock } from "./Dock";
import { useEntrance } from "./Entrance";
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
  const hero = useRef<HTMLElement>(null);
  const tier = useMotionTier();

  // Leaving the hero, the device leans back and sinks into the table and the dock rises, in
  // step with the scroll (full motion). Phones and reduced motion keep the dock's rise-in.
  useGSAP(
    () => {
      const el = hero.current;
      const device = el?.querySelector<HTMLElement>("[data-device]");
      const dock = document.querySelector<HTMLElement>("[data-dock]");
      if (!el || !device || !dock || tier !== "full") return;
      gsap.fromTo(
        device,
        { rotateX: 0, scale: 1, yPercent: 0, opacity: 1 },
        { rotateX: 32, scale: 0.72, yPercent: 18, opacity: 0.15, transformPerspective: 1400, transformOrigin: "50% 70%", ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true } },
      );
      const write = (p: number) => {
        setHeroScroll(p);
        dock.style.setProperty("--rise", String(1 - gsap.utils.clamp(0, 1, (p - 0.45) / 0.4)));
      };
      dock.setAttribute("data-scrubbed", "");
      const st = ScrollTrigger.create({ trigger: el, start: "top top", end: "bottom top", onUpdate: (s) => write(s.progress), onRefresh: (s) => write(s.progress) });
      return () => {
        st.kill();
        dock.removeAttribute("data-scrubbed");
        dock.style.removeProperty("--rise");
        setHeroScroll(0);
      };
    },
    { scope: hero, dependencies: [tier], revertOnUpdate: true },
  );

  useEffect(() => {
    const hero = document.querySelector("[data-hero]");
    if (!hero) return;
    // The latest entry counts: after a long frame the browser can report several at once
    // (still half in view, then gone), and the first would leave the dock asleep.
    const io = new IntersectionObserver((entries) => setHeroInView(entries[entries.length - 1].intersectionRatio >= HERO_THRESHOLD), {
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
  // Hovering a song in the mixtape cues it on both screens; a song playing still wins.
  const cue = useSyncExternalStore(subscribeCue, getCue, getServerCue);
  const cued = cue ? [`SIDE ${side.toUpperCase()}`, `CUE ${cue}`] : undefined;
  const entrance = useEntrance();

  // The flip's clunk is scroll-driven, not a gesture; wake audio on the first tap or key.
  useEffect(() => installSoundUnlock(), []);

  useTrackKeys(tracks, side);
  useKeyPress();
  useReelMotion(tracks);

  return (
    <>
      <header ref={hero} data-hero id="top" className={styles.hero}>
        {tier !== "none" && <Hero3D key={tier} tracks={tracks} side={side} current={current} screen={entrance.lines ?? nowPlaying ?? cued} progress={entrance.lines || !nowPlaying ? undefined : progress} led={lit || entrance.led} />}
        <Device tracks={tracks} side={side} current={current} interactive={heroInView} screen={entrance.lines ?? nowPlaying ?? cued} progress={entrance.lines || !nowPlaying ? undefined : progress} led={lit || entrance.led} className={styles.device} />
      </header>
      {entrance.overlay}
      {children}
      <Dock tracks={tracks} side={side} current={current} visible={!heroInView} screen={nowPlaying ?? cued} progress={nowPlaying ? progress : undefined} />
    </>
  );
}
