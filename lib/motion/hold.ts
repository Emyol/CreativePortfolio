import type { MotionTier } from "./tier";

/** Room kept clear above the docked control strip (its height plus a gap). */
export const DOCK_RESERVE = 110;
/** The still rest at the end of every arrival, as a share of its length. */
export const REST = 0.15;

/** Taller than the screen: its arrival can't all be seen at once. */
export const isTall = (height: number, viewport: number): boolean => height > viewport - 20;

/**
 * Where a section holds (a ScrollTrigger start): centred in the space above the dock when
 * it fits there; otherwise with its top 10 px from the top of the screen. A section taller
 * than the screen also holds its top in view, and its lower rows arrive as they enter.
 */
export function holdStart(height: number, viewport: number): string {
  const room = viewport - DOCK_RESERVE;
  if (height <= room) return `center ${Math.round(room / 2)}px`;
  return "top top+=10";
}

/** How much scroll a hold lasts: phones hold 60% as long, and reduced motion never holds. */
export function holdDistance(base: number, tier: MotionTier): number {
  if (tier === "none") return 0;
  return tier === "lite" ? Math.round(base * 0.6) : base;
}
