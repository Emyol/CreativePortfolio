import type { MotionTier } from "@/lib/motion/tier";

/** How sharp the 3D renders: up to 2x at full motion, 1.5x on phones (light motion). */
export function dprFor(tier: MotionTier, dpr: number): number {
  return Math.min(dpr, tier === "lite" ? 1.5 : 2);
}

/**
 * Whether the flip and the footer turn in 3D: not under reduced motion (they show the turned
 * drawing), never without WebGL. The hero is 3D under reduced motion too, held still (Hero3D).
 */
export function canUse3D(tier: MotionTier, gl: boolean): boolean {
  return tier !== "none" && gl;
}

/** A view's scissor and viewport (CSS px), measured from the canvas's bottom edge as WebGL does. */
export function scissorFor(rect: DOMRect, canvasHeight: number): [number, number, number, number] {
  return [rect.left, canvasHeight - rect.top - rect.height, rect.width, rect.height];
}

/**
 * Whether a WebGL renderer draws in software (no GPU, or hardware acceleration off). Such a
 * browser draws the 3D at a few frames a second, so it keeps the sprite device.
 */
export function isSoftwareRenderer(name: string): boolean {
  return /swiftshader|llvmpipe|softpipe|basic render|software/i.test(name);
}

/** Whether this browser can make a WebGL2 context on a real GPU (checked once). */
let gl: boolean | undefined;
export function hasGpuWebGL(): boolean {
  if (gl !== undefined) return gl;
  if (typeof WebGL2RenderingContext === "undefined") return (gl = false);
  try {
    const ctx = document.createElement("canvas").getContext("webgl2");
    if (!ctx) return (gl = false);
    const info = ctx.getExtension("WEBGL_debug_renderer_info");
    gl = !isSoftwareRenderer(String(ctx.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : ctx.RENDERER)));
    ctx.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    gl = false;
  }
  return gl;
}

/** When the CSS failsafes show the flat drawing if the page's script hasn't run yet (the
 * gl-failsafe animations in HomeTape, Flip and Underside's CSS). */
export const GL_FAILSAFE = 10_000;

/**
 * Whether this page load draws the 3D: a real GPU, and the script arrived before the
 * failsafe showed the flat drawing (past that the drawing stays, never swapped for the 3D).
 * Decided at the first call, at hydration, so later pages of the visit agree.
 */
let late: boolean | undefined;
export function canDraw3D(): boolean {
  late ??= performance.now() >= GL_FAILSAFE;
  return !late && hasGpuWebGL();
}

/**
 * Once the page's script runs: html[data-gl] goes from "pending" (set before first paint
 * wherever WebGL2 exists, lib/powerOn.ts) to "on" where the 3D will draw, or away where it
 * won't, so the flat drawing shows at once on every page. The CSS failsafes cover only
 * "pending", a script that never ran; from "on", each 3D view's own timeout hands its box
 * to the flat drawing.
 */
export function settleGl(): void {
  const html = document.documentElement;
  if (!html.dataset.gl) return;
  if (canDraw3D()) html.dataset.gl = "on";
  else delete html.dataset.gl;
}
