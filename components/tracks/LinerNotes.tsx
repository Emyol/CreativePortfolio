import { Throwable } from "@/components/motion/Throwable";
import { Photo } from "@/components/Photo";
import type { About } from "@/lib/content/schema";
import styles from "./LinerNotes.module.css";

/**
 * About, set like the liner notes folded into a cassette case, with a candid taped in. The
 * letter is folded in two: as the track arrives the lower fold swings down and open
 * (arrivals.ts), and the candid can be picked up and thrown, springing back to its tape.
 */
export function LinerNotes({ about }: { about: About }) {
  const [first, ...rest] = about.letter;
  return (
    <div className={styles.notes} data-has-photo={about.candid ? "" : undefined}>
      <article className={styles.letter} aria-label="Liner notes from Miel">
        {first !== undefined && (
          <div data-fold="top">
            <p>{first}</p>
          </div>
        )}
        <div data-fold="bottom" className={styles.fold}>
          <div className={styles.foldFace}>
            {rest.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <p className={styles.sign}>Miel</p>
          </div>
          <span className={styles.foldBack} aria-hidden="true" />
        </div>
      </article>
      {about.candid && (
        <Throwable mode="home" className={styles.throwable}>
          <figure className={styles.candid}>
            <span className={styles.tape} aria-hidden="true" />
            <Photo photo={about.candid} sizes="(min-width: 900px) 320px, 70vw" className={styles.photo} />
          </figure>
        </Throwable>
      )}
    </div>
  );
}
