"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { scrollToId } from "@/lib/motion/navigate";

const idFromHash = (hash: string) => decodeURIComponent(hash.replace(/^#/, ""));

export function HashLinks() {
  const pathname = usePathname();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href^='#']");
      const id = link ? idFromHash(link.getAttribute("href") ?? "") : "";
      if (id && scrollToId(id)) e.preventDefault();
    };
    const onPop = () => {
      const id = idFromHash(location.hash);
      if (id) scrollToId(id, { push: false });
    };
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  // Cold deep links and arrivals from other pages (e.g. "Back to Events").
  useEffect(() => {
    const id = idFromHash(location.hash);
    if (!id) return;
    const raf = requestAnimationFrame(() => scrollToId(id, { push: false, immediate: true }));
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
