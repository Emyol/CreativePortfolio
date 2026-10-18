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
    // The observer only says what changed, and a jump that reflows the page (pins going in)
    // can sweep a track across the line and back without its neighbour ever leaving it; so
    // each time, ask which track holds the line now.
    const pick = () => {
      const line = window.innerHeight * 0.305;
      const at = targets.find((t) => {
        const r = t.getBoundingClientRect();
        return r.top <= line && r.bottom > line;
      });
      if (at) setActive(at.id === "top" ? null : (at.id as TrackId));
    };
    const io = new IntersectionObserver(pick, { rootMargin: "-30% 0px -69% 0px" });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [key]);

  return <ActiveTrackContext.Provider value={active}>{children}</ActiveTrackContext.Provider>;
}
