"use client";
import { setNight, useNight } from "@/lib/desk/night";
import styles from "./LampCord.module.css";

/**
 * The lamp's pull cord, hanging top right over the desk: a pull switches to night (the
 * room darkens, the lamp lights) and back. One store with the transport's night key.
 */
export function LampCord() {
  const on = useNight();
  return (
    <button type="button" className={styles.cord} aria-label="Night lamp" aria-pressed={on} onClick={() => setNight(!on)} data-lamp-cord>
      <span className={styles.string} aria-hidden="true" />
      <span className={styles.bead} aria-hidden="true" />
      <span className={styles.tag} aria-hidden="true">
        night
      </span>
    </button>
  );
}
