"use client";
import { useEffect, useState } from "react";
import { StrokeKanji, type StrokeMode } from "./StrokeKanji";

type Props = { text: string; mode: StrokeMode; onDone?: () => void; className?: string; charClassName?: string };

export function StrokeWord({ text, mode, onDone, className, charClassName }: Props) {
  const chars = [...text];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (mode !== "write") setIndex(0);
  }, [mode]);

  const modeFor = (i: number): StrokeMode => (mode !== "write" ? mode : i < index ? "done" : i === index ? "write" : "idle");
  const next = (i: number) => () => (i === chars.length - 1 ? onDone?.() : setIndex(i + 1));

  return (
    <span className={className} aria-hidden="true">
      {chars.map((ch, i) => (
        <StrokeKanji key={`${ch}-${i}`} char={ch} mode={modeFor(i)} onDone={i === index ? next(i) : undefined} className={charClassName} />
      ))}
    </span>
  );
}
