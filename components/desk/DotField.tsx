"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { dprFor } from "@/lib/three/support";
import { BASE_ALPHA, GAP, RIPPLE_LIFE, dotLevel, mixTint, type DotState, type Rgb } from "@/lib/desk/dotField";
import styles from "./DotField.module.css";

export type DotFieldHandle = { ripple: (x: number, y: number) => void };
type Props = { tint: Rgb; playing: boolean; night: boolean };

/** The dot-matrix background: a thin canvas loop over the pure per-dot math in lib/desk/dotField. */
export const DotField = forwardRef<DotFieldHandle, Props>(function DotField({ tint, playing, night }, ref) {
  const tier = useMotionTier();
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ tint, playing, night });
  live.current = { tint, playing, night };
  const ripple = useRef<{ x: number; y: number; at: number } | null>(null);
  useImperativeHandle(ref, () => ({ ripple: (x, y) => void (ripple.current = { x, y, at: performance.now() }) }), []);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const still = tier === "none";
    const gap = tier === "lite" ? GAP.lite : GAP.full;
    const dpr = dprFor(tier, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    let pointer: { x: number; y: number } | null = null;
    let color: Rgb = live.current.tint;
    let t = 0;
    let last = performance.now();
    let raf = 0;

    const size = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const onMove = (e: PointerEvent) => (pointer = { x: e.clientX, y: e.clientY });

    const frame = (now: number) => {
      t += Math.min(0.05, (now - last) / 1000);
      last = now;
      const cur = live.current;
      color = mixTint(color, cur.tint, 0.04);
      const age = ripple.current ? (now - ripple.current.at) / 1000 : 0;
      if (ripple.current && age > RIPPLE_LIFE) ripple.current = null;
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
      raf = requestAnimationFrame(frame);
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
    document.addEventListener("visibilitychange", onVisibility);
    if (!document.hidden) start();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tier]);

  return <canvas ref={canvas} className={styles.field} aria-hidden="true" />;
});
