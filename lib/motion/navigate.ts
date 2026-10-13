import type Lenis from "lenis";

let lenis: Lenis | null = null;

export function setLenis(l: Lenis | null): void {
  lenis = l;
}

export function getLenis(): Lenis | null {
  return lenis;
}

function focusTarget(el: HTMLElement) {
  const target = el.querySelector<HTMLElement>("[data-chapter-heading]") ?? el;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

/** One path for every in-page jump: menu, rail, keys, skip link, deep links. */
export function scrollToId(id: string, { push = true, immediate = false } = {}): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  if (push && location.hash !== `#${id}`) history.pushState(null, "", `#${id}`);
  if (lenis) {
    lenis.scrollTo(el, { immediate, onComplete: () => focusTarget(el) });
  } else {
    el.scrollIntoView({ block: "start", behavior: immediate ? "instant" : "auto" });
    focusTarget(el);
  }
  return true;
}
