import { Throwable } from "@/components/motion/Throwable";
import type { About } from "@/lib/content/schema";
import { DotPhoto } from "./DotPhoto";
import styles from "./LinerNotes.module.css";

/**
 * About, set like the liner notes folded into a cassette case, with the candid shown on a
 * small dot-matrix screen (DotPhoto). As the track arrives the letter's lines rise into place
 * one by one while the screen powers on (arrivals.ts), and the screen can be picked up and
 * thrown, springing back to its place.
 */
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
        <Throwable mode="home" className={styles.throwable}>
          <figure className={styles.candid}>
            <DotPhoto photo={about.candid} dots={about.dots} />
          </figure>
        </Throwable>
      )}
    </div>
  );
}
