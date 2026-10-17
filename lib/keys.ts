import { readStorage, writeStorage } from "./motion/storage";

// Keys 1-6 are single-character shortcuts, so WCAG 2.1.4 requires a way to turn them off
// (speech input can fire them by accident). On by default; the choice is remembered.
const KEY = "kakejiku:chapter-keys";
const listeners = new Set<() => void>();
let enabled: boolean | null = null;

export function chapterKeysEnabled(): boolean {
  if (enabled === null) enabled = typeof window === "undefined" || readStorage("local", KEY) !== "off";
  return enabled;
}

export function setChapterKeysEnabled(on: boolean): void {
  enabled = on;
  writeStorage("local", KEY, on ? "on" : "off");
  listeners.forEach((l) => l());
}

export function subscribeChapterKeys(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function __resetKeysForTests(): void {
  enabled = null;
  listeners.clear();
}
