"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getLenis, scrollToId } from "@/lib/motion/navigate";
import { readStorage, writeStorage } from "@/lib/motion/storage";

const idFromHash = (hash: string) => decodeURIComponent(hash.replace(/^#/, ""));
const scrollKey = () => `side-a:scroll:${location.pathname}${location.hash}`;

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
        writeStorage("session", scrollKey(), String(Math.round(window.scrollY)));
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
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  useEffect(() => {
    if (traversing.current) {
      traversing.current = false;
      const saved = Number(readStorage("session", scrollKey()));
      if (!Number.isFinite(saved) || saved <= 0) return;
      // Two frames: after Next's own hash scroll, then put the visitor back.
      let raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          const lenis = getLenis();
          if (lenis) {
            lenis.resize();
            lenis.scrollTo(saved, { immediate: true });
          } else {
            window.scrollTo(0, saved);
          }
        });
      });
      return () => cancelAnimationFrame(raf);
    }
    // Cold deep links and arrivals from other pages by link (e.g. "Back to Events").
    const id = idFromHash(location.hash);
    if (!id) return;
    const raf = requestAnimationFrame(() => scrollToId(id, { push: false, immediate: true }));
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
