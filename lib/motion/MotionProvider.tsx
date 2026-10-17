"use client";
import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { computeTier, NARROW_QUERY, REDUCE_QUERY, type MotionTier } from "./tier";

export const MotionTierContext = createContext<MotionTier>("full");
export const useMotionTier = () => useContext(MotionTierContext);

function subscribe(onChange: () => void) {
  const queries = [REDUCE_QUERY, NARROW_QUERY].map((q) => window.matchMedia(q));
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}
const snapshot = (): MotionTier => computeTier(window.matchMedia(REDUCE_QUERY).matches, window.matchMedia(NARROW_QUERY).matches);
// Server renders "full" markup; CSS shows final states for reduced-motion visitors before
// hydration, so they never see hidden content.
const serverSnapshot = (): MotionTier => "full";

export function MotionProvider({ children }: { children: ReactNode }) {
  const tier = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  useEffect(() => {
    document.documentElement.dataset.tier = tier;
  }, [tier]);
  return <MotionTierContext.Provider value={tier}>{children}</MotionTierContext.Provider>;
}
