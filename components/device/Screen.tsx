import type { CSSProperties } from "react";
import styles from "./Screen.module.css";

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
 */
export function Screen({ lines, className, style, progress }: Props) {
  return (
    <div className={[styles.screen, className].filter(Boolean).join(" ")} style={style} data-screen>
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
