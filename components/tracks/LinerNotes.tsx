import { Photo } from "@/components/Photo";
import type { About } from "@/lib/content/schema";
import styles from "./LinerNotes.module.css";

/** About, set like the liner notes folded into a cassette case, with a candid taped in. */
export function LinerNotes({ about }: { about: About }) {
  return (
    <div className={styles.notes} data-has-photo={about.candid ? "" : undefined}>
      <article className={styles.letter} aria-label="Liner notes from Miel">
        {about.letter.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <p className={styles.sign}>Miel</p>
      </article>
      {about.candid && (
        <figure className={styles.candid}>
          <span className={styles.tape} aria-hidden="true" />
          <Photo photo={about.candid} sizes="(min-width: 900px) 320px, 70vw" className={styles.photo} />
        </figure>
      )}
    </div>
  );
}
