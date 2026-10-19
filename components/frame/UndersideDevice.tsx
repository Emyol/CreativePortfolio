"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Underside3D } from "@/components/three/Underside3D";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { useInViewOnce } from "@/lib/motion/useInViewOnce";
import { canUse3D, hasGpuWebGL } from "@/lib/three/support";

/**
 * The footer's device box. On full motion with a GPU it holds while the 3D player turns over
 * into it (Underside3D); otherwise, if that fails, or if the keyboard gets there first, it is
 * the rendered underside.
 */
export function UndersideDevice({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();
  const near = useInViewOnce(ref, "100% 0px 100% 0px");
  // A failed 3D stays failed for the visit: the rendered underside shows and never swaps back.
  const [failed, setFailed] = useState(false);
  const [gpu, setGpu] = useState(false);
  useEffect(() => setGpu(canUse3D(tier, hasGpuWebGL())), [tier]);
  const three = tier === "full" && gpu && !failed;
  // A link reached from the keyboard before the 3D has taken over can't wait for it: the
  // rendered underside shows instead, for the visit, so focus never lands on unseen text.
  useEffect(() => {
    const box = ref.current;
    if (!box || !three) return;
    const focus = (e: FocusEvent) => {
      if (!box.hasAttribute("data-3d") && (e.target as Element).matches(":focus-visible")) setFailed(true);
    };
    box.addEventListener("focusin", focus);
    return () => box.removeEventListener("focusin", focus);
  }, [three]);
  return (
    <div ref={ref} className={className} data-underside data-fallback={failed ? "" : undefined}>
      {children}
      {three && near && <Underside3D device={ref} onFail={() => setFailed(true)} />}
    </div>
  );
}
