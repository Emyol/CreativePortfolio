"use client";
import { useSyncExternalStore } from "react";
import { chapterKeysEnabled, setChapterKeysEnabled, subscribeChapterKeys } from "@/lib/keys";
import styles from "./SoundToggle.module.css";

/** Turns the 1-6 chapter shortcuts on or off (WCAG 2.1.4). */
export function KeysToggle() {
  const on = useSyncExternalStore(subscribeChapterKeys, chapterKeysEnabled, () => true);
  return (
    <button type="button" className={styles.toggle} aria-pressed={on} onClick={() => setChapterKeysEnabled(!on)}>
      Chapter keys 1–6<span aria-hidden="true">: {on ? "on" : "off"}</span>
    </button>
  );
}
