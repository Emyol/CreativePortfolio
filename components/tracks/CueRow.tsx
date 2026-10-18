"use client";
import { useRef, type ReactNode } from "react";
import { Sprite } from "@/components/device/Sprite";
import { setCue } from "@/lib/cue";
import { gsap } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";

type Props = { title: string; className?: string; tapeClassName?: string; children: ReactNode } & Record<`data-${string}`, string | undefined>;

/**
 * A mixtape row that cues its song while hovered or focused: its little cassette slides out
 * of the row like a tape from its case, and the device and dock screens show "CUE <title>".
 */
export function CueRow({ title, className, tapeClassName, children, ...data }: Props) {
  const tier = useMotionTier();
  const tape = useRef<HTMLSpanElement>(null);
  const still = tier === "none";
  const cue = () => {
    setCue(title);
    if (!still && tape.current) gsap.to(tape.current, { x: 30, opacity: 1, rotate: -6, duration: 0.45, ease: "back.out(1.6)", overwrite: true });
  };
  const uncue = () => {
    setCue(null);
    if (!still && tape.current) gsap.to(tape.current, { x: 0, opacity: 0, rotate: 0, duration: 0.25, ease: "power2.in", overwrite: true });
  };
  return (
    <li
      className={className}
      {...data}
      onPointerEnter={cue}
      onPointerLeave={uncue}
      onFocus={cue}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) uncue();
      }}
      data-cue-row
    >
      <span ref={tape} className={tapeClassName} aria-hidden="true">
        <Sprite name="shell-a" width={1077} height={714} />
      </span>
      {children}
    </li>
  );
}
