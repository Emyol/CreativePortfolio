import type { ReactNode } from "react";
import { formatTrackNumber, type Track } from "@/lib/tape";
import styles from "./TrackSection.module.css";

/**
 * One track on the tape: its number, then its title lit on a screen tab that grows out of
 * the panel holding the content (orange on the table would fail contrast; on black it passes).
 */
export function TrackSection({ track, children }: { track: Track; children: ReactNode }) {
  const titleId = `${track.id}-title`;
  return (
    <section id={track.id} aria-labelledby={titleId} className={styles.track} data-track={track.id} data-side={track.side}>
      <header className={styles.head}>
        <span className={styles.number} aria-hidden="true">{formatTrackNumber(track.number)}</span>
        <div className={styles.tab}>
          <h2 id={titleId} tabIndex={-1} data-track-heading className={styles.title}>{track.label}</h2>
        </div>
      </header>
      <div className={styles.panel}>{children}</div>
    </section>
  );
}
