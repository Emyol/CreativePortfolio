import type { ShelfItem } from "@/lib/content/schema";
import styles from "./OnRotation.module.css";

/** Games, anime and manga Miel is into right now, as a compact list with notes. */
export function OnRotation({ items }: { items: ShelfItem[] }) {
  return (
    <ul className={styles.list}>
      {items.map((item, i) => (
        <li key={`${item.title}-${i}`} className={styles.row}>
          <span className={styles.kind}>{item.kind}</span>
          <h3 className={styles.title}>{item.title}</h3>
          <div className={styles.note}>
            {item.note.split(/\n\s*\n/).map((p, j) => (
              <p key={j}>{p}</p>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
