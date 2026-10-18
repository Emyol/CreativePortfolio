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
