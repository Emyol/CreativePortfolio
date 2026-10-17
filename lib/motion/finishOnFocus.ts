"use client";
import type { gsap } from "./gsap";

/**
 * Scroll reveals fade content in with opacity (never visibility, which would drop it from
 * the accessibility tree and the tab order). If keyboard focus reaches the content before
 * the reveal has played, jump the reveal to its end so a focused link is never invisible.
 * Returns the cleanup; call it from the useGSAP callback's return.
 */
export function finishOnFocus(el: Element | null, tween: gsap.core.Animation): () => void {
  if (!el) return () => {};
  const done = () => {
    tween.scrollTrigger?.kill();
    tween.progress(1);
  };
  el.addEventListener("focusin", done);
  return () => el.removeEventListener("focusin", done);
}
