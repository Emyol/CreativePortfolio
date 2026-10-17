import type { Person } from "@/lib/content/schema";
import styles from "./Featuring.module.css";

/** The people around Miel, set like the thank-you credits on an album sleeve. */
export function Featuring({ people }: { people: Person[] }) {
  return (
    <ul className={styles.credits}>
      {people.map((p, i) => (
        <li key={`${p.name}-${i}`} className={styles.credit}>
          <span className={styles.relation}>{p.relation}</span>
          <h3 className={styles.name}>{p.link ? <a href={p.link}>{p.name}</a> : p.name}</h3>
          {p.note && <p className={styles.note}>{p.note}</p>}
        </li>
      ))}
    </ul>
  );
}
