"use client";
import { useRef } from "react";
import { useInViewOnce } from "@/lib/motion/useInViewOnce";
import { StrokeKanji } from "./StrokeKanji";

export function StrokeKanjiInView({ char, label, className }: { char: string; label?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInViewOnce(ref);
  return (
    <span ref={ref} className={className}>
      <StrokeKanji char={char} label={label} mode={seen ? "write" : "idle"} />
    </span>
  );
}
