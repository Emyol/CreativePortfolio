"use client";
import { useSyncExternalStore } from "react";
import { setSoundEnabled, soundEnabled, subscribeSound } from "@/lib/sound";
import styles from "./SoundToggle.module.css";

export function SoundToggle() {
  const on = useSyncExternalStore(subscribeSound, soundEnabled, () => false);
  return (
    <button type="button" className={styles.toggle} aria-pressed={on} onClick={() => setSoundEnabled(!on)}>
      Sound<span aria-hidden="true">{on ? "on" : "off"}</span>
    </button>
  );
}
