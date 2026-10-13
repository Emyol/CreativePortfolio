"use client";
import { useEffect, useRef } from "react";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import type { WeatherKind } from "@/lib/seasons";
import { GUST_COUNT, gustAlpha, gustDone, spawnGust, stepParticles, type Particle } from "@/lib/weather";
import styles from "./WeatherGust.module.css";

const COLOUR: Record<WeatherKind, string> = {
  petal: "#f2b8c6", lantern: "#f2a640", maple: "#b8442c", ginkgo: "#e2b23a", snow: "#ffffff", plum: "#d9677f",
};

function draw(ctx: CanvasRenderingContext2D, kind: WeatherKind, p: Particle, alpha: number) {
  const s = p.size;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.fillStyle = COLOUR[kind];
  ctx.beginPath();
  switch (kind) {
    case "petal":
      ctx.ellipse(0, 0, s * 0.55, s * 0.3, 0, 0, Math.PI * 2);
      break;
    case "lantern":
      ctx.shadowColor = COLOUR.lantern;
      ctx.shadowBlur = s * 1.5;
      ctx.roundRect(-s * 0.4, -s * 0.55, s * 0.8, s * 1.1, s * 0.3);
      break;
    case "maple":
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.25 : s * 0.6;
        const a = (i / 10) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      break;
    case "ginkgo":
      ctx.moveTo(0, s * 0.4);
      ctx.arc(0, s * 0.4, s * 0.7, Math.PI * 1.15, Math.PI * 1.85);
      ctx.closePath();
      break;
    case "snow":
      ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
      break;
    case "plum":
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const [cx, cy] = [Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3];
        ctx.moveTo(cx + s * 0.18, cy);
        ctx.arc(cx, cy, s * 0.18, 0, Math.PI * 2);
      }
      break;
  }
  ctx.fill();
  ctx.restore();
}

export function WeatherGust({ kind }: { kind: WeatherKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tier = useMotionTier();

  useEffect(() => {
    if (tier !== "full") return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    let particles = spawnGust(kind, GUST_COUNT, w, h);
    const start = performance.now();
    let last = start;
    let raf = 0;
    const frame = (now: number) => {
      particles = stepParticles(particles, Math.min(now - last, 50));
      last = now;
      ctx.clearRect(0, 0, w, h);
      const elapsed = now - start;
      if (gustDone(elapsed)) return; // canvas left clear; the loop ends here
      const alpha = gustAlpha(elapsed);
      for (const p of particles) draw(ctx, kind, p, alpha);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, w, h);
    };
  }, [kind, tier]);

  if (tier !== "full") return null;
  return <canvas ref={ref} className={styles.gust} aria-hidden="true" />;
}
