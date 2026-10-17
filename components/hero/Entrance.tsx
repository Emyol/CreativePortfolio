"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { readStorage, writeStorage } from "@/lib/motion/storage";
import { ENTRANCE_KEY } from "@/lib/motion/tier";

export type EntrancePhase = "unroll" | "write" | "menu" | "done";
type Ctx = { phase: EntrancePhase; nameWritten: () => void };

const EntranceContext = createContext<Ctx>({ phase: "done", nameWritten: () => {} });
export const useEntrance = () => useContext(EntranceContext);

const PARTS = "[data-hero], [data-unroll-roller], [data-hero-mountains], [data-hero-menu] li";

export function EntranceProvider({ children }: { children: ReactNode }) {
  const tier = useMotionTier();
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<EntrancePhase>("unroll");
  const phaseRef = useRef(phase);
  const pendingAtLoad = useRef<boolean | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const finish = useCallback(() => {
    timeline.current?.kill();
    timeline.current = null;
    const parts = ref.current?.querySelectorAll(PARTS);
    if (parts?.length) {
      gsap.killTweensOf(parts);
      gsap.set(parts, { clearProps: "all" }); // back to the CSS final state
    }
    document.documentElement.removeAttribute("data-entrance");
    writeStorage("session", ENTRANCE_KEY, "1");
    phaseRef.current = "done";
    setPhase("done");
  }, []);

  useGSAP(
    () => {
      // Remember the pre-paint decision once; StrictMode runs effects twice in development.
      pendingAtLoad.current ??= document.documentElement.dataset.entrance === "pending" && readStorage("session", ENTRANCE_KEY) !== "1";
      if (phaseRef.current === "done") return;
      if (tier !== "full" || !pendingAtLoad.current) {
        finish();
        return;
      }
      const hero = ref.current?.querySelector<HTMLElement>("[data-hero]");
      const roller = hero?.querySelector<HTMLElement>("[data-unroll-roller]");
      const mountains = hero?.querySelector<HTMLElement>("[data-hero-mountains]");
      if (!hero || !roller || !mountains) {
        finish();
        return;
      }
      document.documentElement.dataset.entrance = "playing"; // GSAP owns the clip from here; menu stays hidden
      timeline.current = gsap
        .timeline()
        .fromTo(hero, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.2, ease: "power2.inOut" })
        // The roller rides just inside the revealed edge, so the clip never cuts it.
        .fromTo(roller, { y: () => -roller.offsetHeight, autoAlpha: 1 }, { y: () => hero.offsetHeight - roller.offsetHeight, duration: 1.2, ease: "power2.inOut" }, 0)
        .to(roller, { autoAlpha: 0, duration: 0.25 })
        .fromTo(mountains, { "--r": "0%" }, { "--r": "150%", duration: 0.9, ease: "power1.out" }, "-=0.35")
        .call(() => setPhase("write"));
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      if (phase !== "menu") return;
      document.documentElement.removeAttribute("data-entrance"); // release the menu for its stagger
      gsap.from("[data-hero-menu] li", { autoAlpha: 0, y: 16, stagger: 0.08, duration: 0.5, ease: "power2.out", onComplete: finish });
    },
    { scope: ref, dependencies: [phase] },
  );

  // Any intent to move on finishes the entrance immediately.
  useEffect(() => {
    if (phase === "done") return;
    const events = ["keydown", "wheel", "pointerdown", "touchstart"] as const;
    const stop = () => finish();
    events.forEach((ev) => window.addEventListener(ev, stop, { once: true, passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, stop));
  }, [phase, finish]);

  const nameWritten = useCallback(() => setPhase((p) => (p === "write" ? "menu" : p)), []);
  const value = useMemo(() => ({ phase, nameWritten }), [phase, nameWritten]);

  return (
    <div ref={ref} data-entrance-phase={phase}>
      <EntranceContext.Provider value={value}>{children}</EntranceContext.Provider>
    </div>
  );
}
