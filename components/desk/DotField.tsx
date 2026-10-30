"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { REDUCE_QUERY } from "@/lib/motion/tier";
import { dprFor } from "@/lib/three/support";
import { BASE_ALPHA, GAP, RIPPLE_LIFE, dotLevel, mixTint, type DotState, type Rgb } from "@/lib/desk/dotField";
import styles from "./DotField.module.css";

export type DotFieldHandle = { ripple: (x: number, y: number) => void };
type Props = { tint: Rgb; playing: boolean; night: boolean };

/**
 * The dot-matrix background: a thin canvas loop over the pure per-dot math in lib/desk/dotField.
 * Under reduced motion (live, and the media query itself before the tier is known) it holds
 * still: no breathing or ripple, the tint changed at once, lit only near the pointer, and
 * drawn again only when one of those changes. The pointer's glow goes when the pointer
 * leaves the window or the window loses focus.
 */
export const DotField = forwardRef<DotFieldHandle, Props>(function DotField({ tint, playing, night }, ref) {
  const tier = useMotionTier();
  const dense = tier === "lite";
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ tint, playing, night, still: tier === "none" });
  live.current = { tint, playing, night, still: tier === "none" };
  const ripple = useRef<{ x: number; y: number; at: number } | null>(null);
  useImperativeHandle(ref, () => ({ ripple: (x, y) => void (ripple.current = { x, y, at: performance.now() }) }), []);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const gap = dense ? GAP.lite : GAP.full;
    const dpr = dprFor(dense ? "lite" : "full", window.devicePixelRatio || 1);
    const reduce = window.matchMedia(REDUCE_QUERY);
    let w = 0;
    let h = 0;
    let pointer: { x: number; y: number } | null = null;
    let color: Rgb = live.current.tint;
    let t = 0;
    let last = performance.now();
    let raf = 0;
    let drawn = ""; // still: what the last frame drew

    const size = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawn = "";
    };
    const onMove = (e: PointerEvent) => (pointer = { x: e.clientX, y: e.clientY });
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) pointer = null; // off the page
    };
    const onBlur = () => (pointer = null);

    const frame = (now: number) => {
      t += Math.min(0.05, (now - last) / 1000);
      last = now;
      const cur = live.current;
      const still = cur.still || reduce.matches;
      color = still ? cur.tint : mixTint(color, cur.tint, 0.04);
      const age = ripple.current ? (now - ripple.current.at) / 1000 : 0;
      if (ripple.current && (still || age > RIPPLE_LIFE)) ripple.current = null;
      raf = requestAnimationFrame(frame);
      if (still) {
        const key = `${pointer?.x},${pointer?.y},${color},${cur.playing},${cur.night}`;
        if (key === drawn) return;
        drawn = key;
      } else drawn = "";
      const state: DotState = {
        pointer,
        ripple: ripple.current ? { x: ripple.current.x, y: ripple.current.y, age } : null,
        playing: cur.playing,
        night: cur.night,
        t,
        still,
      };
      const [r, g, b] = color.map(Math.round);
      const rest = cur.night ? `rgba(210,214,224,${BASE_ALPHA.night})` : `rgba(40,42,48,${BASE_ALPHA.day})`;
      ctx.clearRect(0, 0, w, h);
      for (let y = gap / 2; y < h; y += gap) {
        for (let x = gap / 2; x < w; x += gap) {
          const lit = dotLevel({ x, y }, state);
          ctx.fillStyle = lit > 0.04 ? `rgba(${r},${g},${b},${0.18 + lit * 0.8})` : rest;
          ctx.beginPath();
          ctx.arc(x, y, 1.1 + lit * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : start());

    size();
    window.addEventListener("resize", size);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerout", onOut);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    if (!document.hidden) start();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onOut);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dense]);

  return <canvas ref={canvas} className={styles.field} aria-hidden="true" data-dot-field />;
});
