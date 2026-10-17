"use client";
import { useEffect, useRef, useState } from "react";
import { Ja } from "@/components/Ja";
import { KONAMI, konamiStep } from "@/lib/konami";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { playTap } from "@/lib/sound";
import styles from "./Konami.module.css";

const TOAST_MS = 4000;
const CRANE = "M8 38 Q34 8 58 30 Q82 6 112 16 Q88 28 72 33 L102 50 L62 41 Q38 52 8 38Z";

export function Konami() {
  const tier = useMotionTier();
  const crane = useRef<SVGSVGElement>(null);
  const progress = useRef(0);
  const [found, setFound] = useState(0);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      progress.current = konamiStep(progress.current, e.key);
      if (progress.current === KONAMI.length) {
        progress.current = 0;
        setFound((n) => n + 1);
        playTap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!found) return;
    setToast(true);
    const t = window.setTimeout(() => setToast(false), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [found]);

  useGSAP(
    () => {
      if (!found || tier === "none" || !crane.current) return;
      gsap.fromTo(crane.current, { x: "-15vw", y: "12vh", autoAlpha: 1 }, { x: "115vw", y: "-4vh", duration: 4, ease: "sine.inOut", onComplete: () => gsap.set(crane.current, { autoAlpha: 0 }) });
    },
    { dependencies: [found, tier], revertOnUpdate: true },
  );

  return (
    <>
      <svg ref={crane} className={styles.crane} viewBox="0 0 120 60" aria-hidden="true">
        <path d={CRANE} />
      </svg>
      <div role="status" className={styles.toast} data-shown={toast}>
        {toast ? (
          <>
            <Ja aria-hidden="true" className={styles.mark}>鶴</Ja> A crane passes by.
          </>
        ) : null}
      </div>
    </>
  );
}
