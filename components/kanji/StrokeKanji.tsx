"use client";
import { useEffect, useId, useRef, useState } from "react";
import { getStrokes } from "@/lib/kanji";
import { scheduleEnd, strokeSchedule } from "@/lib/kanji/schedule";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import styles from "./StrokeKanji.module.css";

export type StrokeMode = "idle" | "write" | "done";

type Props = { char: string; mode: StrokeMode; label?: string; onDone?: () => void; className?: string };

const MASK_WIDEN_MS = 350;
const PEN_FADE_DELAY = 150;
const PEN_FADE_MS = 600;
const EASE = "cubic-bezier(.45,.05,.35,1)";

export function StrokeKanji({ char, mode, label, onDone, className }: Props) {
  const strokes = getStrokes(char);
  const tier = useMotionTier();
  const svgRef = useRef<SVGSVGElement>(null);
  const onDoneRef = useRef(onDone);
  const [finished, setFinished] = useState(false);
  const maskId = `kanji-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const phase: StrokeMode = tier === "none" || (mode === "write" && finished) ? "done" : mode;

  useEffect(() => {
    if (tier === "none" || mode !== "write") return;
    const svg = svgRef.current;
    if (!svg) return;
    setFinished(false);
    const pens = [...svg.querySelectorAll<SVGPathElement>("[data-pen]")];
    const masks = [...svg.querySelectorAll<SVGPathElement>("[data-mask]")];
    const penGroup = svg.querySelector<SVGGElement>("[data-pen-group]");
    const plan = strokeSchedule(pens.map((p) => p.getTotalLength()));
    const end = scheduleEnd(plan);

    const anims: Animation[] = [];
    plan.forEach(({ delay, duration }, i) => {
      for (const el of [pens[i], masks[i]]) {
        anims.push(el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay, duration, easing: EASE, fill: "both" }));
      }
    });
    for (const m of masks) anims.push(m.animate([{ strokeWidth: 15 }, { strokeWidth: 40 }], { delay: end, duration: MASK_WIDEN_MS, fill: "forwards" }));
    if (penGroup) anims.push(penGroup.animate([{ opacity: 1 }, { opacity: 0 }], { delay: end + PEN_FADE_DELAY, duration: PEN_FADE_MS, fill: "forwards" }));

    const timer = window.setTimeout(() => {
      setFinished(true);
      onDoneRef.current?.();
    }, end + PEN_FADE_DELAY + PEN_FADE_MS);

    return () => {
      window.clearTimeout(timer);
      anims.forEach((a) => a.cancel());
    };
  }, [tier, mode, char]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 109 109"
      className={[styles.kanji, className].filter(Boolean).join(" ")}
      data-phase={phase}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-20" y="-20" width="149" height="149">
          <g className={styles.mask}>
            {strokes.map((d, i) => (
              <path key={i} d={d} pathLength={1} strokeDasharray="1 1" data-mask />
            ))}
          </g>
        </mask>
      </defs>
      <text x="54.5" y="56" textAnchor="middle" dominantBaseline="central" className={styles.glyph} mask={`url(#${maskId})`} lang="ja">
        {char}
      </text>
      <g className={styles.pen} data-pen-group>
        {strokes.map((d, i) => (
          <path key={i} d={d} pathLength={1} strokeDasharray="1 1" data-pen />
        ))}
      </g>
    </svg>
  );
}
