import type { CSSProperties } from "react";
import styles from "./Screen.module.css";

type Props = {
  lines: [string, string?] | string[];
  className?: string;
  style?: CSSProperties;
};

/**
 * The device's OLED. Each line is one row of lit dot-matrix text, cut with an ellipsis;
 * the full text stays in the title. Not a live region: it changes on every scroll.
 */
export function Screen({ lines, className, style }: Props) {
  return (
    <div className={[styles.screen, className].filter(Boolean).join(" ")} style={style} data-screen>
      {lines.filter(Boolean).map((line, i) => (
        <p key={i} className={i === 0 ? styles.primary : styles.secondary} title={line}>
          {line}
        </p>
      ))}
    </div>
  );
}
