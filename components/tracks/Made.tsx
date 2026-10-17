import { Photo } from "@/components/Photo";
import type { Hobby } from "@/lib/content/schema";
import styles from "./Made.module.css";

/** Things Miel does and makes, photo first where there is one. */
export function Made({ hobbies }: { hobbies: Hobby[] }) {
  return (
    <ul className={styles.grid}>
      {hobbies.map((h, i) => (
        <li key={`${h.name}-${i}`} className={styles.item} data-photo={h.photo ? "" : undefined}>
          {h.photo && <Photo photo={h.photo} sizes="(min-width: 1100px) 520px, 90vw" className={styles.photo} />}
          <div className={styles.text}>
            <h3 className={styles.name}>{h.name}</h3>
            <p className={styles.note}>{h.note}</p>
            {h.link && (
              // The label starts with the visible word, so voice control users can say "More".
              <a href={h.link} className={styles.link} aria-label={`More about ${h.name}`}>More</a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
