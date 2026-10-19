import type Lenis from "lenis";
import { ScrollTrigger } from "./gsap";

let lenis: Lenis | null = null;

export function setLenis(l: Lenis | null): void {
  lenis = l;
}

export function getLenis(): Lenis | null {
  return lenis;
}

function focusTarget(el: HTMLElement) {
  // Tracks hand focus to their heading; anything else (e.g. #main, which contains
  // every track) takes focus itself.
  const heading = el.hasAttribute("data-track") ? el.querySelector<HTMLElement>("[data-track-heading]") : null;
  const target = heading ?? el;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

/** One path for every in-page jump: tape keys, dock, shortcuts, skip link, deep links. */
export function scrollToId(id: string, { push = true, immediate = false } = {}): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  if (push && location.hash !== `#${id}`) history.pushState(null, "", `#${id}`);
  // A track that holds is landed on at the end of its hold, so it arrives settled.
  const hold = ScrollTrigger.getById(`hold-${id}`);
  if (lenis) {
    // One Lenis instance outlives client-side navigation; re-measure so its scroll limit
    // matches the page we're on now, not the one we came from.
    lenis.resize();
    lenis.scrollTo(hold ? hold.end : el, { immediate, onComplete: () => focusTarget(el) });
  } else {
    if (hold) window.scrollTo({ top: hold.end, behavior: immediate ? "instant" : "auto" });
    else el.scrollIntoView({ block: "start", behavior: immediate ? "instant" : "auto" });
    focusTarget(el);
  }
  return true;
}
