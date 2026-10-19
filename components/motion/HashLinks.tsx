"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ScrollTrigger } from "@/lib/motion/gsap";
import { getLenis, scrollToId } from "@/lib/motion/navigate";
import { readStorage, writeStorage } from "@/lib/motion/storage";

const idFromHash = (hash: string) => decodeURIComponent(hash.replace(/^#/, ""));
const scrollKey = () => `side-a:scroll:${location.pathname}${location.hash}`;
const savePlace = () => writeStorage("session", scrollKey(), String(Math.round(window.scrollY)));
// The home page keeps its own scroll (manual, for its entrance: lib/powerOn.ts), so the
// browser won't put a visitor back there with Back or Forward from another site; we do.
let coldRestored = false;
const coldTraversal = () => {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return !coldRestored && nav?.type === "back_forward" && history.scrollRestoration === "manual";
};

const SETTLE = 10_000; // ms a restore keeps at it
const MOVES = ["wheel", "keydown", "pointerdown", "touchstart"] as const;

/**
 * Puts the visitor back at `y`, two frames in (after Next's own hash scroll). Holds made
 * late (the footer's, once its 3D is ready, and its padding) lengthen the page and can move
 * the scroll after that, so it puts them back whenever the page grows or ScrollTrigger
 * refreshes, until the visitor moves or SETTLE passes.
 */
function restore(y: number, placed: () => void): () => void {
  let raf = 0;
  const grows = new ResizeObserver(() => put());
  const put = () => {
    if (Math.abs(window.scrollY - y) < 2) return;
    const lenis = getLenis();
    if (lenis) {
      lenis.resize();
      lenis.scrollTo(y, { immediate: true });
    } else {
      window.scrollTo(0, y);
    }
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(timer);
    ScrollTrigger.removeEventListener("refresh", put);
    grows.disconnect();
    MOVES.forEach((e) => window.removeEventListener(e, stop, { capture: true }));
  };
  const timer = window.setTimeout(stop, SETTLE);
  raf = requestAnimationFrame(() => {
    raf = requestAnimationFrame(() => {
      placed();
      ScrollTrigger.addEventListener("refresh", put);
      grows.observe(document.body);
      put();
    });
  });
  MOVES.forEach((e) => window.addEventListener(e, stop, { capture: true, passive: true }));
  return stop;
}

export function HashLinks() {
  const pathname = usePathname();
  // Set by Back/Forward. On a history traversal Next scrolls to the entry's #hash, which
  // overrides where the visitor actually was; we put them back from the position saved
  // when they left by link.
  const traversing = useRef(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      traversing.current = false; // any click (e.g. "Back to Events") is a fresh arrival
      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (anchor instanceof HTMLAnchorElement && anchor.origin === location.origin && anchor.pathname !== location.pathname) {
        savePlace();
      }
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href^='#']");
      const id = link ? idFromHash(link.getAttribute("href") ?? "") : "";
      if (id && scrollToId(id)) e.preventDefault();
    };
    const onPop = () => {
      traversing.current = true;
      const id = idFromHash(location.hash);
      // Same-page hash history (#about <- #people) still scrolls; on a page change the
      // element isn't here yet and this is a no-op.
      if (id) scrollToId(id, { push: false });
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    window.addEventListener("pagehide", savePlace); // leaving the site, or a reload
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pagehide", savePlace);
    };
  }, []);

  useEffect(() => {
    // Only the home page needs its own scroll; any entry pushed from it inherits the mode.
    if (location.pathname !== "/") history.scrollRestoration = "auto";
    if (traversing.current || coldTraversal()) {
      traversing.current = false;
      const saved = Number(readStorage("session", scrollKey()));
      if (!Number.isFinite(saved) || saved <= 0) return;
      return restore(saved, () => (coldRestored = true));
    }
    // Cold deep links and arrivals from other pages by link (e.g. "Back to Events").
    const id = idFromHash(location.hash);
    if (!id) return;
    const raf = requestAnimationFrame(() => scrollToId(id, { push: false, immediate: true }));
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
