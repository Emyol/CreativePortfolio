import { Throwable } from "@/components/motion/Throwable";
import { Photo } from "@/components/Photo";
import type { Hobby } from "@/lib/content/schema";
import { TidyButton } from "./TidyButton";
import styles from "./Made.module.css";

// Each thing rests at a slight angle on the table; small, so the notes stay readable.
const ANGLES = [-3, 2, -1.5, 3, -2];

/**
 * Things Miel does and makes, set down on a dark table. As the track arrives they're
 * dropped on, scattered (arrivals.ts); with a mouse they can be thrown around the table,
 * a tap moves one on a touch screen, and "Tidy up" puts them all back.
 */
export function Made({ hobbies }: { hobbies: Hobby[] }) {
  return (
    <div className={styles.table}>
      <ul className={styles.grid} data-table>
        {hobbies.map((h, i) => (
          <li key={`${h.name}-${i}`} className={styles.item} data-photo={h.photo ? "" : undefined}>
            <Throwable mode="table" group="made" bounds="[data-table]" home={{ rotate: ANGLES[i % ANGLES.length] }} className={styles.thing}>
              {h.photo && <Photo photo={h.photo} sizes="(min-width: 1100px) 520px, 90vw" className={styles.photo} />}
              <div className={styles.text}>
                <h3 className={styles.name}>{h.name}</h3>
                <p className={styles.note}>{h.note}</p>
                {h.link && (
                  // The label starts with the visible word, so voice control users can say "More".
                  <a href={h.link} className={styles.link} aria-label={`More about ${h.name}`}>More</a>
                )}
              </div>
            </Throwable>
          </li>
        ))}
      </ul>
      {hobbies.length > 1 && <TidyButton group="made" className={styles.tidy} />}
    </div>
  );
}
