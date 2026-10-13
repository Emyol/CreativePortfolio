"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ChapterId } from "@/lib/chapters";

const ActiveChapterContext = createContext<ChapterId | null>(null);
export const useActiveChapter = () => useContext(ActiveChapterContext);

/** One observer for the whole page: the chapter crossing the reading line (30% down the viewport) is active. */
export function ActiveChapterProvider({ ids, children }: { ids: ChapterId[]; children: ReactNode }) {
  const [active, setActive] = useState<ChapterId | null>(null);
  const key = ids.join("|");

  useEffect(() => {
    const targets = ["top", ...key.split("|").filter(Boolean)]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id === "top" ? null : (e.target.id as ChapterId));
      },
      { rootMargin: "-30% 0px -69% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [key]);

  return <ActiveChapterContext.Provider value={active}>{children}</ActiveChapterContext.Provider>;
}
