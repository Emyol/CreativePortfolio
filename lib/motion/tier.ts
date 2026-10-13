export type MotionTier = "full" | "lite" | "none";

export const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
export const NARROW_QUERY = "(max-width: 767px)";

/** none: reduced motion. lite: phones, light motion only. full: desktop. */
export function computeTier(reduce: boolean, narrow: boolean): MotionTier {
  if (reduce) return "none";
  return narrow ? "lite" : "full";
}

export const ENTRANCE_KEY = "kakejiku:entered";

/** Runs in <head> before paint so the hero starts rolled up instead of flashing. */
export const ENTRANCE_PREPAINT = `try{var d=document.documentElement;if(location.pathname==="/"&&!location.hash&&!matchMedia(${JSON.stringify(REDUCE_QUERY)}).matches&&!matchMedia(${JSON.stringify(NARROW_QUERY)}).matches&&sessionStorage.getItem(${JSON.stringify(ENTRANCE_KEY)})!=="1")d.dataset.entrance="pending"}catch(e){}`;
