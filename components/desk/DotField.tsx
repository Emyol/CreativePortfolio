"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { REDUCE_QUERY } from "@/lib/motion/tier";
import { dprFor } from "@/lib/three/support";
import {
  BASE_ALPHA,
  GAP,
  LEVELS,
  REST_RADIUS,
  RIPPLE_LIFE,
  fillCount,
  levelLook,
  mixTint,
  planDots,
  type Cover,
  type DotPlan,
  type DotState,
  type Rgb,
} from "@/lib/desk/dotField";
import styles from "./DotField.module.css";

export type DotFieldHandle = { ripple: (x: number, y: number) => void };
type Props = { tint: Rgb; playing: boolean; night: boolean };

/**
 * The dot-matrix background: a thin canvas loop over the pure per-dot math in lib/desk/dotField.
 * Each frame is planned (`planDots`) and drawn in batches: one fill for the resting dots and
 * one per lit level, never one per dot. While the field moves under a tape, the dots wholly
 * under the J-card's opaque paper (its title, flap and panels, and the transport) are left
 * out, since the paper hides them; that is most of the field. The loop runs only while
 * something moves (the wave with a tape in, a ripple, the tint easing) and stops when
 * nothing does, to be woken by the pointer, a scroll, a resize or a new tint, tape,
 * lighting or tier.
 *
 * Under reduced motion (live, and the media query itself before the tier is known) it
 * holds still: no breathing or ripple, the tint changed at once, lit only near the pointer,
 * and drawn again only when one of those changes. The pointer's glow goes when the pointer
 * leaves the window or the window loses focus.
 */
export const DotField = forwardRef<DotFieldHandle, Props>(function DotField({ tint, playing, night }, ref) {
  const tier = useMotionTier();
  const dense = tier === "lite";
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ tint, playing, night, still: tier === "none" });
  live.current = { tint, playing, night, still: tier === "none" };
  const ripple = useRef<{ x: number; y: number; at: number } | null>(null);
  const wake = useRef<() => void>(() => {});
  useImperativeHandle(
    ref,
    () => ({
      ripple: (x, y) => {
        ripple.current = { x, y, at: performance.now() };
        wake.current();
      },
    }),
    [],
  );
  // A new tint, tape, lighting or tier: one more frame at least.
  useEffect(() => wake.current(), [tint, playing, night, tier]);

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
    let drawn = ""; // at rest: what the last frame drew
    let plan: DotPlan | undefined;

    const run = () => {
      if (raf || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const size = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawn = "";
      run();
    };
    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      run();
    };
    const onOut = (e: PointerEvent) => {
      if (e.relatedTarget) return;
      pointer = null; // off the page
      run();
    };
    const onBlur = () => {
      pointer = null;
      run();
    };

    const frame = (now: number) => {
      raf = 0;
      t += Math.min(0.05, (now - last) / 1000);
      last = now;
      const cur = live.current;
      const still = cur.still || reduce.matches;
      color = still ? cur.tint : mixTint(color, cur.tint, 0.04);
      const easing = color.some((c, i) => Math.abs(c - cur.tint[i]) > 0.5);
      if (!easing) color = cur.tint;
      const age = ripple.current ? (now - ripple.current.at) / 1000 : 0;
      if (ripple.current && (still || age > RIPPLE_LIFE)) ripple.current = null;
      const moving = !still && (cur.playing || !!ripple.current || easing);
      if (!moving) {
        // At rest: drawn again only if something it shows changed; otherwise the loop stops.
        const key = `${pointer?.x},${pointer?.y},${color},${cur.playing},${cur.night},${w},${h}`;
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
      // The covered dots are left out only while the field moves under a tape (measured each
      // frame); at rest it draws whole, so nothing it left out can be uncovered unseen.
      const began = performance.now();
      plan = planDots(w, h, gap, state, moving && cur.playing ? jcardCovers() : [], plan);
      draw(ctx, plan, color, cur.night, w, h);
      if (process.env.NODE_ENV !== "production") {
        const ms = performance.now() - began;
        (window as unknown as { __dotField?: DotStats }).__dotField = { dots: plan.dots, drawn: plan.drawn, fills: fillCount(plan), ms };
      }
      if (moving) raf = requestAnimationFrame(frame);
    };
    const onVisibility = () => {
      if (!document.hidden) return run();
      cancelAnimationFrame(raf);
      raf = 0;
    };
    wake.current = run;

    size();
    window.addEventListener("resize", size);
    window.addEventListener("scroll", run, { passive: true });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerout", onOut);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      wake.current = () => {};
      window.removeEventListener("resize", size);
      window.removeEventListener("scroll", run);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onOut);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      if (process.env.NODE_ENV !== "production") delete (window as unknown as { __dotField?: DotStats }).__dotField;
    };
  }, [dense]);

  return <canvas ref={canvas} className={styles.field} aria-hidden="true" data-dot-field />;
});

/** For tests (development only): the last frame's dots, those drawn, its fills and its cost (ms, planned and drawn). */
type DotStats = { dots: number; drawn: number; fills: number; ms: number };

const TAU = Math.PI * 2;

/** One frame: the resting dots in one fill, then each lit level in one. */
function draw(ctx: CanvasRenderingContext2D, plan: DotPlan, [r, g, b]: Rgb, night: boolean, w: number, h: number) {
  const batch = (pts: number[], radius: number, style: string) => {
    if (!pts.length) return;
    ctx.fillStyle = style;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) {
      ctx.moveTo(pts[i] + radius, pts[i + 1]);
      ctx.arc(pts[i], pts[i + 1], radius, 0, TAU);
    }
    ctx.fill();
  };
  ctx.clearRect(0, 0, w, h);
  batch(plan.rest, REST_RADIUS, night ? `rgba(210,214,224,${BASE_ALPHA.night})` : `rgba(40,42,48,${BASE_ALPHA.day})`);
  const [R, G, B] = [r, g, b].map(Math.round);
  for (let lv = 1; lv <= LEVELS; lv++) {
    const look = levelLook(lv);
    batch(plan.lit[lv], look.radius, `rgba(${R},${G},${B},${look.alpha})`);
  }
}

/**
 * The opaque paper over the field with a tape in: the J-card's title, flap and panels (each
 * clipped to the card, which on a phone scrolls inside its own box), and the transport. A
 * panel that is turning, fading or turned away (an inline transform or opacity, the card's
 * settle, inert) is not opaque yet, so it covers nothing.
 */
function jcardCovers(): Cover[] {
  const out: Cover[] = [];
  const opaque = (el: HTMLElement) => !el.style.opacity && !el.style.transform && !el.closest("[inert]");
  const card = document.querySelector<HTMLElement>("main[data-jcard]");
  if (card && opaque(card) && !card.getAnimations().length) {
    const clip = card.getBoundingClientRect();
    for (const el of card.querySelectorAll<HTMLElement>(":scope > h2, :scope > [data-panel], :scope > [data-live-panels] > [data-panel]")) {
      if (!opaque(el)) continue;
      const r = el.getBoundingClientRect();
      const c = { left: Math.max(r.left, clip.left), top: Math.max(r.top, clip.top), right: Math.min(r.right, clip.right), bottom: Math.min(r.bottom, clip.bottom) };
      if (c.right > c.left && c.bottom > c.top) out.push(c);
    }
  }
  const transport = document.querySelector<HTMLElement>("[data-transport]");
  if (transport) {
    const r = transport.getBoundingClientRect();
    out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
  }
  return out;
}
