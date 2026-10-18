"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Underside3D } from "@/components/three/Underside3D";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { useInViewOnce } from "@/lib/motion/useInViewOnce";
import { canUse3D, hasGpuWebGL } from "@/lib/three/support";

/**
 * The footer's device box. On full motion with a GPU it holds while the 3D player turns over
 * into it (Underside3D); otherwise, or if that fails, it is the rendered underside.
 */
export function UndersideDevice({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();
  const near = useInViewOnce(ref, "100% 0px 100% 0px");
  const [three, setThree] = useState(false);
  useEffect(() => setThree(tier === "full" && canUse3D(tier, hasGpuWebGL())), [tier]);
  return (
    <div ref={ref} className={className} data-underside>
      {children}
      {three && near && <Underside3D device={ref} onFail={() => setThree(false)} />}
    </div>
  );
}
