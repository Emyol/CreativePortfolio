import type * as THREE from "three";
import { addScreenPlane } from "@/components/three/screenPlane";
import { HEAD_SIZE, drawScreen, headlineShift, measureHead, type ScreenLine } from "@/components/three/screenTexture";
import { gsap } from "@/lib/motion/gsap";
import { marqueeAt } from "@/lib/motion/marquee";

/**
 * The desk player's screen: live text on the OLED glass (as Hero3D's), flickering to new
 * text, a headline too long coming round. Still (reduced motion, `setStill`, live) it swaps
 * without a flicker and rests a long headline set smaller to fit, or past that cut short
 * (screenLayout).
 */
export function deskScreen(three: typeof THREE, root: THREE.Object3D, family: string, initiallyStill: boolean) {
  let still = initiallyStill;
  const { ctx, update, dispose } = addScreenPlane(three, root);
  let shown: string[] = [];
  let progress: number | undefined;
  let time = 0;
  let headAt = 0;
  let headShift = 0;
  let headScroll: number | null = null;
  let flicker: gsap.core.Timeline | null = null;
  let head: ScreenLine | null = null;

  const paint = (dim = 1, lines = shown) => {
    head = drawScreen(ctx, lines, { dim, progress, family, scroll: headScroll ?? undefined })[0] ?? null;
    update();
  };
  const take = (lines: string[]) => {
    if (lines[0] !== shown[0]) {
      headAt = time;
      headShift = still ? 0 : headlineShift(lines, measureHead(ctx, family));
      headScroll = headShift ? 0 : null;
    }
    shown = lines;
  };

  return {
    /** Shows `lines`; `quiet` skips the flicker (a counter ticking, a playhead moving). */
    show(lines: string[], nextProgress?: number, quiet = false) {
      const same = lines.join("\n") === shown.join("\n");
      if (same && nextProgress === progress) return;
      progress = nextProgress;
      flicker?.kill();
      if (same || quiet || still || !shown.length) {
        take(lines);
        paint();
        return;
      }
      const old = shown;
      flicker = gsap
        .timeline()
        .call(() => paint(0.15, old))
        .call(() => paint(1, old), undefined, 0.04)
        .call(() => paint(0.15, old), undefined, 0.08)
        .call(() => (take(lines), paint()), undefined, 0.12);
    },
    /** Reduced motion on or off: a flicker under way ends now, a long headline rests or comes round from the start. */
    setStill(on: boolean) {
      if (on === still) return;
      still = on;
      flicker?.progress(1);
      flicker = null;
      headAt = time;
      headShift = still || !shown.length ? 0 : headlineShift(shown, measureHead(ctx, family));
      headScroll = headShift ? 0 : null;
      if (shown.length) paint();
    },
    /** What it shows now (after any flicker), a line of text per line. */
    text: () => shown.join("\n"),
    /** The headline as last drawn: its text (cut short ends in `…`) and type size, in canvas px. */
    headline: () => (head ? { text: head.text, size: head.size } : null),
    /** Moves a long headline on (call every frame). */
    tick(dt: number) {
      time += dt;
      const scroll = headShift ? marqueeAt((time - headAt) * 1000, headShift, HEAD_SIZE) : null;
      if (scroll !== headScroll && !flicker?.isActive()) {
        headScroll = scroll;
        paint();
      }
    },
    dispose() {
      flicker?.kill();
      dispose();
    },
  };
}
