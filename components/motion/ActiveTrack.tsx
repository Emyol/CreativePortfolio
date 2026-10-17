"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { TrackId } from "@/lib/tape";

const ActiveTrackContext = createContext<TrackId | null>(null);
export const useActiveTrack = () => useContext(ActiveTrackContext);

/** One observer for the whole page: the track crossing the reading line (30% down the viewport) is active. */
export function ActiveTrackProvider({ ids, children }: { ids: TrackId[]; children: ReactNode }) {
  const [active, setActive] = useState<TrackId | null>(null);
  const key = ids.join("|");

  useEffect(() => {
    const targets = ["top", ...key.split("|").filter(Boolean)]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id === "top" ? null : (e.target.id as TrackId));
      },
      { rootMargin: "-30% 0px -69% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [key]);

  return <ActiveTrackContext.Provider value={active}>{children}</ActiveTrackContext.Provider>;
}
