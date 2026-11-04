import { useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "@/lib/motion/storage";

// The first visit's welcome (spec "First visit and discoverability"). The one-line hint
// under the player shows until the first tape is loaded, then never again in this browser.
// Storage can throw (lib/motion/storage): then module memory still keeps it gone this visit.
const KEY = "side-a:hint";
const SEEN = "seen";
const listeners = new Set<() => void>();
let seenHere = false;

export const HINT_TEXT = "drag to throw · double-click to read the back · pull the cord";

export function hintSeen(): boolean {
  return seenHere || readStorage("local", KEY) === SEEN;
}

/**
 * The hint is used up. `remember: false` uses it up for this visit only: the admin's preview
 * shares the browser with the public site, and loading a tape there isn't a first visit seen.
 */
export function markHintSeen({ remember = true }: { remember?: boolean } = {}): void {
  if (hintSeen()) return;
  seenHere = true;
  if (remember) writeStorage("local", KEY, SEEN);
  listeners.forEach((l) => l());
}

export function subscribeHint(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Whether the hint is used up, as React state. The server (and hydration) has it seen: no hint in the HTML. */
export function useHintSeen(): boolean {
  return useSyncExternalStore(subscribeHint, hintSeen, () => true);
}

const COUNT = ["none", "one", "two", "three", "four", "five", "six"];

/** The player's screen with no tape in: what to do, and how many tapes there are to pick from. */
export function deskScreenLines(tapes: number): [string, string] {
  return ["PICK A TAPE", `${COUNT[tapes] ?? tapes} on the desk`];
}

export function __resetHintForTests(): void {
  seenHere = false;
  listeners.clear();
}
