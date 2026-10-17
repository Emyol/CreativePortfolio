"use client";
import { useEffect, useRef } from "react";
import { DEVICE } from "@/lib/device/layout";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { getLenis } from "@/lib/motion/navigate";
import { stepReel, type ReelState } from "@/lib/motion/reels";
import { getPlayback, isPlaying } from "@/lib/playback";
import { packDiameters, sideTracks, type Track } from "@/lib/tape";

/**
 * Drives every reel and tape pack on the page (hero and dock) outside React: reels turn on
 * the GSAP ticker from Lenis's scroll velocity, or at tape speed while a song plays; packs
 * trade tape as the visitor reads through each side. Reduced motion freezes both in place.
 */
export function useReelMotion(tracks: Track[]): void {
  const tier = useMotionTier();
  const reel = useRef<ReelState>({ angle: 0, omega: 0 });
  const key = tracks.map((t) => t.id).join("|");

  // Reels.
  useEffect(() => {
    if (tier === "none") return; // frozen where they are; nothing writes
    const reels = () => document.querySelectorAll<HTMLElement>("[data-reel]");
    let last = NaN;
    const tick = (_time: number, deltaMs: number) => {
      const next = stepReel(reel.current, deltaMs / 1000, {
        velocity: getLenis()?.velocity ?? 0,
        playing: isPlaying(getPlayback()),
        tier,
      });
      reel.current = next;
      if (next.angle === last) return;
      last = next.angle;
      // Tape runs left to right along the bottom of the cassette: both hubs turn anticlockwise.
      const t = `rotate(${(-next.angle).toFixed(2)}deg)`;
      reels().forEach((el) => (el.style.transform = t));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [tier]);

  // Tape packs.
  useEffect(() => {
    if (tier === "none") return;
    const sections = (side: "a" | "b") => sideTracks(tracks, side).map((t) => document.getElementById(t.id)).filter((el): el is HTMLElement => !!el);
    // Declared before create(): ScrollTrigger calls onRefresh while it is still constructing.
    let a: ScrollTrigger | null = null;
    let b: ScrollTrigger | null = null;
    const span = (side: "a" | "b") => {
      const s = sections(side);
      if (!s.length) return null;
      return ScrollTrigger.create({ trigger: s[0], endTrigger: s[s.length - 1], start: "top center", end: "bottom center", onUpdate: write, onRefresh: write });
    };
    a = span("a");
    b = span("b");
    // The flip turns the cassette over, so side B starts again with the left reel full;
    // until side B begins, the packs show where side A is.
    function write() {
      const progress = b && b.progress > 0 ? b.progress : (a?.progress ?? 0);
      const d = packDiameters(progress, DEVICE.pack);
      document.querySelectorAll<HTMLElement>("[data-pack]").forEach((el) => {
        el.style.scale = String((el.dataset.pack === "left" ? d.left : d.right) / DEVICE.pack.max);
      });
    }
    write();
    return () => {
      a?.kill();
      b?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tracks are keyed by id
  }, [tier, key]);
}
