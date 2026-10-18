import type { MotionTier } from "@/lib/motion/tier";

/** How sharp the 3D renders: up to 2x at full motion, 1.5x on phones (light motion). */
export function dprFor(tier: MotionTier, dpr: number): number {
  return Math.min(dpr, tier === "lite" ? 1.5 : 2);
}

/** Whether the real-time 3D player is used: never under reduced motion, never without WebGL. */
export function canUse3D(tier: MotionTier, gl: boolean): boolean {
  return tier !== "none" && gl;
}

/** A view's scissor and viewport (CSS px), measured from the canvas's bottom edge as WebGL does. */
export function scissorFor(rect: DOMRect, canvasHeight: number): [number, number, number, number] {
  return [rect.left, canvasHeight - rect.top - rect.height, rect.width, rect.height];
}

/** Whether this browser can make a WebGL2 context (checked once). */
let gl: boolean | undefined;
export function hasWebGL(): boolean {
  if (gl !== undefined) return gl;
  try {
    gl = !!document.createElement("canvas").getContext("webgl2");
  } catch {
    gl = false;
  }
  return gl;
}
