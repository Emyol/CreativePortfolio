import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "@/lib/motion/storage";
import { DARK, NIGHT_KEY as KEY } from "./nightPrepaint";

// Night is the lamp's lighting, the site's only dark mode. A visit starts from the stored
// choice, else from the system's dark preference; the cord and the transport's night key
// share this one store, so they never disagree.
const listeners = new Set<() => void>();
let on: boolean | null = null;

/** A stored choice wins; with none, the system preference. */
export function initialNight(prefersDark: boolean): boolean {
  const stored = readStorage("local", KEY);
  if (stored === "on") return true;
  if (stored === "off") return false;
  return prefersDark;
}

/** Whether it is night now (false on the server; read on first use in the browser). */
export function nightOn(): boolean {
  if (typeof window === "undefined") return false;
  if (on === null) on = initialNight(window.matchMedia?.(DARK).matches ?? false);
  return on;
}

export function setNight(next: boolean): void {
  on = next;
  writeStorage("local", KEY, next ? "on" : "off");
  listeners.forEach((l) => l());
}

export function subscribeNight(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Night as React state. Hydration renders day (the server's snapshot), then the real value. */
export function useNight(): boolean {
  return useSyncExternalStore(subscribeNight, nightOn, () => false);
}

export function __resetNightForTests(): void {
  on = null;
  listeners.clear();
}
