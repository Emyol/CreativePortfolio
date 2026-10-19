"use client";
import { useEffect, useRef } from "react";
import type { Photo } from "@/lib/content/schema";
import { coverRect, dotLevels, rowLight, STEPS } from "@/lib/dotPhoto";
import styles from "./DotPhoto.module.css";

const COLS = 40;
const ROWS = 50; // 4:5, the screen's shape
const OFF = 0.06; // an unlit dot still shows faintly, like an off pixel

const redraws = new WeakMap<Element, () => void>();

/**
 * How far the screen has powered on, 0 (dark) to 1 (fully lit): the About arrival's
 * scanline (components/tracks/arrivals.ts). Kept on the element, so it holds even if the
 * arrival is made before the screen has drawn.
 */
export function revealDots(screen: Element | null, reveal: number): void {
  if (!(screen instanceof HTMLElement)) return;
  screen.dataset.reveal = reveal.toFixed(2);
  redraws.get(screen)?.();
}

/** One short flicker, as the player's screen gives when its text changes. */
export function flickerDots(screen: Element | null): void {
  if (!(screen instanceof HTMLElement)) return;
  screen.removeAttribute("data-flicker");
  void screen.offsetWidth; // restart the animation
  screen.setAttribute("data-flicker", "");
}

/**
 * The owner's photo as a dot-matrix screen, in the language of the player's lettering:
 * every dot the same size on a fixed grid, lit orange at one of a few brightness steps.
 * Drawn here from the uploaded photo; the photo itself is never shown. Its description
 * names the screen for screen readers.
 */
export function DotPhoto({ photo, className }: { photo: Photo; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    let levels: Uint8Array | null = null;

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const reveal = Number(canvas.dataset.reveal ?? 1);
      const pitch = Math.min(w / COLS, h / ROWS);
      const ox = (w - pitch * COLS) / 2 + pitch / 2;
      const oy = (h - pitch * ROWS) / 2 + pitch / 2;
      const r = pitch * 0.36;
      for (let y = 0; y < ROWS; y++) {
        const light = levels ? rowLight(y, ROWS, reveal) : 0;
        for (let x = 0; x < COLS; x++) {
          const step = levels ? levels[y * COLS + x] : 0;
          const on = step ? (0.18 + (step / STEPS) * 0.82) * light : 0;
          g.fillStyle = `rgb(255 90 31 / ${Math.max(OFF, on).toFixed(3)})`;
          g.beginPath();
          g.arc(ox + x * pitch, oy + y * pitch, r, 0, Math.PI * 2);
          g.fill();
        }
      }
    };

    // Sampled once, at the grid's size: one pixel per dot.
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const s = document.createElement("canvas");
      s.width = COLS;
      s.height = ROWS;
      const sg = s.getContext("2d", { willReadFrequently: true });
      if (!sg) return;
      const { sx, sy, sw, sh } = coverRect(img.naturalWidth, img.naturalHeight, COLS / ROWS);
      sg.drawImage(img, sx, sy, sw, sh, 0, 0, COLS, ROWS);
      try {
        levels = dotLevels(sg.getImageData(0, 0, COLS, ROWS).data);
      } catch (e) {
        console.warn("[dot photo] couldn't read the photo:", e);
        return;
      }
      draw();
    };
    img.src = photo.src;

    redraws.set(canvas, draw);
    const resized = new ResizeObserver(draw);
    resized.observe(canvas);
    draw();
    return () => {
      img.onload = null;
      redraws.delete(canvas);
      resized.disconnect();
    };
  }, [photo.src]);

  return (
    <div className={[styles.panel, className].filter(Boolean).join(" ")}>
      <div className={styles.glass}>
        <canvas ref={ref} role="img" aria-label={photo.alt} className={styles.dots} data-dot-photo="" data-reveal="1.00" onAnimationEnd={(e) => e.currentTarget.removeAttribute("data-flicker")} />
      </div>
    </div>
  );
}
