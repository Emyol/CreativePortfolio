import type { Person } from "@/lib/content/schema";
import styles from "./Featuring.module.css";

/**
 * The people around Miel, set like the thank-you credits on an album sleeve. As the track
 * arrives the credits roll up into their window and settle (arrivals.ts); a name lights up
 * on hover or focus, and its note opens.
 */
export function Featuring({ people }: { people: Person[] }) {
  return (
    <div className={styles.window} data-credits-window>
      <ul className={styles.credits}>
        {people.map((p, i) => (
          <li key={`${p.name}-${i}`} className={styles.credit}>
            <span className={styles.relation}>{p.relation}</span>
            <h3 className={styles.name}>{p.link ? <a href={p.link}>{p.name}</a> : p.name}</h3>
            {p.note && (
              <div className={styles.noteBox}>
                <p className={styles.note}>{p.note}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
