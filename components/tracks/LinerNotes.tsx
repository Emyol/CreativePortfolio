import { Throwable } from "@/components/motion/Throwable";
import type { About } from "@/lib/content/schema";
import { DotPhoto } from "./DotPhoto";
import styles from "./LinerNotes.module.css";

/**
 * About, set like the liner notes folded into a cassette case, with the candid shown on a
 * small dot-matrix screen (DotPhoto). The letter is folded in two: as the track arrives the
 * lower fold swings down and open while the screen powers on (arrivals.ts), and the screen
 * can be picked up and thrown, springing back to its place.
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
            <DotPhoto photo={about.candid} />
          </figure>
        </Throwable>
      )}
    </div>
  );
}
