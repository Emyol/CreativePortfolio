"use client";
import { useEffect, useRef, useState } from "react";
import { Flip3D } from "@/components/three/Flip3D";
import { DEVICE } from "@/lib/device/layout";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { useInViewOnce } from "@/lib/motion/useInViewOnce";
import { playClunk } from "@/lib/sound";
import { canUse3D, hasGpuWebGL } from "@/lib/three/support";
import styles from "./Flip.module.css";

const N = DEVICE.flipFrames;
const { width: FW, height: FH } = DEVICE.flipSize;
const frame = (i: number) => `/device/flip/flip-${String(i).padStart(2, "0")}.webp`;

/**
 * Between the sides the tape is turned over while the stage holds still (sticky, not pinned,
 * so nothing traps the scroll). Full motion turns the 3D cassette (Flip3D), or without it
 * scrubs the rendered frames on a canvas; phones crossfade the first and last frames;
 * reduced motion shows the turned tape.
 */
export function Flip() {
  const tier = useMotionTier();
  const ref = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef<HTMLImageElement>(null);
  const caption = useRef<HTMLParagraphElement>(null);
  // Frames load only when the flip is within a screen of the viewport.
  const near = useInViewOnce(ref, "100% 0px 100% 0px");
  // The 3D cassette on full motion with a GPU; the frames if it can't or it fails.
  // A failed 3D stays failed for the visit: the frames take over and never swap back.
  const [failed, setFailed] = useState(false);
  const [gpu, setGpu] = useState(false);
  useEffect(() => setGpu(canUse3D(tier, hasGpuWebGL())), [tier]);
  const three = tier === "full" && gpu && !failed;

  useGSAP(
    () => {
      if (tier === "none" || !ref.current) return;
      let progress = 0;
      let wasPast = false;
      const images: HTMLImageElement[] = [];
      const ctx = canvas.current?.getContext("2d") ?? null;

      const draw = () => {
        const c = canvas.current;
        if (!c || !ctx) return;
        const img = images[Math.round(progress * (N - 1))];
        if (!img?.complete || !img.naturalWidth) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.round(c.clientWidth * dpr);
        const h = Math.round(c.clientHeight * dpr);
        if (c.width !== w || c.height !== h) {
          c.width = w;
          c.height = h;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        c.dataset.ready = "";
      };

      if (tier === "full" && near && !three) {
        for (let i = 0; i < N; i++) {
          const img = new Image();
          img.decoding = "async";
          img.src = frame(i);
          img.onload = () => draw();
          images.push(img);
        }
      }

      const st = ScrollTrigger.create({
        trigger: ref.current,
        start: "top top",
        end: "bottom bottom",
        onRefresh: () => tier === "full" && draw(),
        onUpdate: (self) => {
          progress = self.progress;
          if (tier === "full") draw();
          else if (last.current) last.current.style.opacity = String(gsap.utils.clamp(0, 1, (progress - 0.3) / 0.4));
          if (caption.current) caption.current.dataset.side = progress >= 0.5 ? "b" : "a";
          const past = progress >= 0.5;
          if (past && !wasPast && self.direction > 0) playClunk();
          wasPast = past;
        },
      });
      return () => st.kill();
    },
    { scope: ref, dependencies: [tier, near, three], revertOnUpdate: true },
  );

  return (
    <section ref={ref} id="flip" aria-label="Flip to side B" className={styles.flip} data-flip data-fallback={failed ? "" : undefined}>
      <div className={styles.stage}>
        <div className={styles.frame}>
          {tier === "none" ? (
            <img src={frame(N - 1)} alt="" width={FW} height={FH} className={styles.img} />
          ) : (
            <>
              <img src={frame(0)} alt="" width={FW} height={FH} className={styles.img} loading="lazy" decoding="async" />
              {tier === "full" && three ? (
                near && <Flip3D onFail={() => setFailed(true)} />
              ) : tier === "full" ? (
                <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
              ) : (
                <img ref={last} src={frame(N - 1)} alt="" width={FW} height={FH} className={styles.img} style={{ opacity: 0 }} loading="lazy" decoding="async" />
              )}
            </>
          )}
        </div>
        <p ref={caption} className={styles.caption} aria-hidden="true" data-side={tier === "none" ? "b" : "a"}>
          <span>side a</span>
          <span>side b</span>
        </p>
      </div>
    </section>
  );
}
