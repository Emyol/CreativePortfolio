"use client";
import { useSyncExternalStore } from "react";
import { trackKeysEnabled, setTrackKeysEnabled, subscribeTrackKeys } from "@/lib/keys";
import styles from "./SoundToggle.module.css";

/** Turns the track shortcuts (1-4 and B) on or off (WCAG 2.1.4). */
export function KeysToggle() {
  const on = useSyncExternalStore(subscribeTrackKeys, trackKeysEnabled, () => true);
  return (
    <button type="button" className={styles.toggle} aria-pressed={on} onClick={() => setTrackKeysEnabled(!on)}>
      Track keys<span aria-hidden="true">: {on ? "on" : "off"}</span>
    </button>
  );
}
