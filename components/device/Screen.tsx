"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import styles from "./Screen.module.css";

const FLICKER_MS = 120;

type Props = {
  lines: [string, string?] | string[];
  className?: string;
  style?: CSSProperties;
  /** 0..1: draws the playhead along the bottom while a song plays. */
  progress?: number;
};

/**
 * The device's OLED. Each line is one row of lit dot-matrix text, cut with an ellipsis;
 * the full text stays in the title. Not a live region: it changes on every scroll.
 * A change of text gives one 120 ms dot-matrix flicker; the clock ticking does not.
 */
export function Screen({ lines, className, style, progress }: Props) {
  const tier = useMotionTier();
  const key = lines.join("|").replace(/\d+:\d\d/g, "");
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
      {lines.filter(Boolean).map((line, i) => (
        <p key={i} className={i === 0 ? styles.primary : styles.secondary} title={line}>
          {line}
        </p>
      ))}
      {progress !== undefined && (
        <span className={styles.playhead} aria-hidden="true">
          <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }} />
        </span>
      )}
    </div>
  );
}
