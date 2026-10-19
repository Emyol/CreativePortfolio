"use client";
import { useEffect, useRef } from "react";
import type { Photo } from "@/lib/content/schema";
import { coverRect, DOTS, dotLevels, gridFor, rowLight, sampleSrc, STEPS, type DotSettings } from "@/lib/dotPhoto";
import { useInViewOnce } from "@/lib/motion/useInViewOnce";
import styles from "./DotPhoto.module.css";

const OFF = 0.06; // an unlit dot still shows faintly, like an off pixel

const redraws = new WeakMap<Element, () => void>();
// Decoded once per photo, so adjusting the dots in the admin redraws at once.
const images = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string): Promise<HTMLImageElement> {
  let image = images.get(src);
  if (!image) {
    const img = new Image();
    img.src = src;
    image = img.decode().then(() => img);
    image.catch(() => images.delete(src)); // a failed load is tried again next time
    images.set(src, image);
  }
  return image;
}

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

/** One short flicker, as the player's screen gives when its text changes (Screen.module.css). */
export function flickerDots(screen: Element | null): void {
  screen?.animate([{ opacity: 0.15 }, { opacity: 0.7 }, { opacity: 1 }], { duration: 120, easing: "steps(3, jump-none)" });
}

/**
 * The owner's photo as a dot-matrix screen, in the language of the player's lettering:
 * every dot the same size on a fixed grid, lit orange at one of a few brightness steps.
 * Drawn here from a small copy of the uploaded photo, once it comes near, with the owner's
 * dot settings from the admin; the photo itself is never shown. Its description names the
 * screen for screen readers.
 */
export function DotPhoto({ photo, dots = DOTS, className }: { photo: Photo; dots?: DotSettings; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const near = useInViewOnce(ref, "100% 0px 100% 0px");
  const { across, brightness, contrast } = dots;

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const { cols, rows } = gridFor(across);
    let levels: Uint8Array | null = null;
    let drawn = "";

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      const reveal = Number(canvas.dataset.reveal ?? 1);
      const key = `${pw}x${ph} ${reveal} ${levels ? 1 : 0}`;
      if (key === drawn) return;
      drawn = key;
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const pitch = Math.min(w / cols, h / rows);
      const ox = (w - pitch * cols) / 2 + pitch / 2;
      const oy = (h - pitch * rows) / 2 + pitch / 2;
      const r = pitch * 0.36;
      // A row's dots at the same step share one fill.
      for (let y = 0; y < rows; y++) {
        const light = levels ? rowLight(y, rows, reveal) : 0;
        const paths = Array.from({ length: STEPS + 1 }, () => new Path2D());
        for (let x = 0; x < cols; x++) {
          const cx = ox + x * pitch;
          const cy = oy + y * pitch;
          const path = paths[levels && light > 0 ? levels[y * cols + x] : 0];
          path.moveTo(cx + r, cy);
          path.arc(cx, cy, r, 0, Math.PI * 2);
        }
        paths.forEach((path, step) => {
          g.fillStyle = `rgb(255 90 31 / ${Math.max(OFF, step ? (0.18 + (step / STEPS) * 0.82) * light : 0).toFixed(3)})`;
          g.fill(path);
        });
      }
    };

    redraws.set(canvas, draw);
    const resized = new ResizeObserver(draw);
    resized.observe(canvas);
    draw();

    // Sampled near the viewport, at the grid's size: one pixel per dot.
    let gone = false;
    if (near) {
      loadImage(sampleSrc(photo.src))
        .then((img) => {
          if (gone) return;
          const s = document.createElement("canvas");
          s.width = cols;
          s.height = rows;
          const sg = s.getContext("2d", { willReadFrequently: true });
          if (!sg) return;
          const { sx, sy, sw, sh } = coverRect(img.naturalWidth, img.naturalHeight, cols / rows);
          sg.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
          levels = dotLevels(sg.getImageData(0, 0, cols, rows).data, { across, brightness, contrast });
          draw();
        })
        .catch((e) => console.warn("[dot photo] couldn't load or read the photo:", e));
    }
    return () => {
      gone = true;
      redraws.delete(canvas);
      resized.disconnect();
    };
  }, [photo.src, near, across, brightness, contrast]);

  return (
    <div className={[styles.panel, className].filter(Boolean).join(" ")}>
      <div className={styles.glass}>
        <canvas ref={ref} role="img" aria-label={photo.alt} className={styles.dots} data-dot-photo="" data-reveal="1.00" data-across={across} />
      </div>
    </div>
  );
}
