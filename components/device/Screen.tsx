"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { MARQUEE, marqueePass } from "@/lib/motion/marquee";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import styles from "./Screen.module.css";

const FLICKER_MS = 120;
const CLOCK = /\d+:\d\d/g;

/** What the screen shows, less the clock: the clock ticking is not new text (nor a flicker). */
export const screenKey = (lines: readonly (string | undefined)[]) => lines.join("|").replace(CLOCK, "");

type Props = {
  lines: [string, string?] | string[];
  className?: string;
  style?: CSSProperties;
  /** 0..1: draws the playhead along the bottom while a song plays. */
  progress?: number;
};

/**
 * The device's OLED. Each line is one row of lit dot-matrix text; a row too long for it
 * comes round for as long as it shows (Row). The full text stays in the title. Not a live region: it changes on every scroll.
 * A change of text gives one 120 ms dot-matrix flicker; the clock ticking does not.
 */
export function Screen({ lines, className, style, progress }: Props) {
  const tier = useMotionTier();
  const key = screenKey(lines);
  const prev = useRef(key);
  const [flicker, setFlicker] = useState(false);
  useEffect(() => {
    if (prev.current === key) return;
    prev.current = key;
    if (tier === "none") return;
    setFlicker(true);
    const t = window.setTimeout(() => setFlicker(false), FLICKER_MS);
    return () => window.clearTimeout(t);
  }, [key, tier]);

  return (
    <div className={[styles.screen, className].filter(Boolean).join(" ")} style={style} data-screen data-flicker={flicker ? "" : undefined}>
      {(lines as (string | undefined)[]).filter((line): line is string => !!line).map((line, i) => (
        // New text is a new row, so it comes round afresh; the clock ticking is not new text.
        <Row key={`${i}|${line.replace(CLOCK, "")}`} text={line} className={i === 0 ? styles.primary : styles.secondary} still={tier === "none"} />
      ))}
      {progress !== undefined && (
        <span className={styles.playhead} aria-hidden="true">
          <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }} />
        </span>
      )}
    </div>
  );
}

/**
 * One row. Too long for the screen, its text and a copy (hidden from screen readers) move
 * left as one strip until the copy stands where the text began, again and again
 * (lib/motion/marquee.ts); under reduced motion it rests cut with an ellipsis.
 * The copy has the gap on both sides, so the strip is two equal halves and moves by half
 * its width: still exact after a resize, the dot face loading, or the clock widening.
 */
function Row({ text, className, still }: { text: string; className: string; still: boolean }) {
  const row = useRef<HTMLParagraphElement>(null);
  const own = useRef<HTMLSpanElement>(null);
  const [long, setLong] = useState(false);
  const runs = long && !still;

  // Measured before paint (no ellipsis shows first), on every render (the clock may widen
  // it), as the screen scales with the render, and once the dot face loads.
  const measure = () => {
    if (row.current && own.current) setLong(own.current.offsetWidth > row.current.clientWidth + 1);
  };
  useLayoutEffect(measure);
  const remeasure = useRef(measure);
  remeasure.current = measure;
  useEffect(() => {
    const again = () => remeasure.current();
    const resized = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(again);
    resized?.observe(row.current!);
    document.fonts?.addEventListener("loadingdone", again);
    return () => {
      resized?.disconnect();
      document.fonts?.removeEventListener("loadingdone", again);
    };
  }, []);

  useEffect(() => {
    if (!runs || !row.current || !own.current) return;
    // Timed in its own font size, so a resize mid-pass changes nothing.
    const size = parseFloat(getComputedStyle(row.current).fontSize) || 16;
    const shift = own.current.offsetWidth / size + MARQUEE.gap;
    const pass = marqueePass(shift, 1);
    const moving = own.current.parentElement!.animate(
      [
        { transform: "none" },
        { transform: "none", offset: MARQUEE.rest / pass, easing: `steps(${Math.max(1, Math.round(shift / MARQUEE.dot))})` },
        { transform: "translateX(-50%)" },
      ],
      { duration: pass, iterations: Infinity },
    );
    return () => moving.cancel();
  }, [runs]);

  return (
    <p ref={row} className={className} title={text} data-marquee={runs ? "" : undefined}>
      <span>
        <span ref={own}>{text}</span>
        {runs && (
          <span aria-hidden="true" style={{ paddingInline: `${MARQUEE.gap}em` }}>
            {text}
          </span>
        )}
      </span>
    </p>
  );
}
