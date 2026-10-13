export type MotionTier = "full" | "lite" | "none";

export const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
export const NARROW_QUERY = "(max-width: 767px)";

/** none: reduced motion. lite: phones, light motion only. full: desktop. */
export function computeTier(reduce: boolean, narrow: boolean): MotionTier {
  if (reduce) return "none";
  return narrow ? "lite" : "full";
}
