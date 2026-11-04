import type { EventItem } from "@/lib/content/schema";

/** The events as the screen lists them: newest first by date. */
export function newestFirst(events: readonly EventItem[]): EventItem[] {
  return [...events].sort((a, b) => b.date.localeCompare(a.date));
}

// Module memory on purpose, as lib/desk/visit.ts: a reload is a new visit. Written only in
// the browser (the screen's and the live recording's effects), never on the server.
let selected: string | null = null;
let knobShown = false;

/** The event the screen's cursor is on, or was on last, this visit. */
export function recalledEvent(): string | null {
  return selected;
}

export function rememberEvent(slug: string): void {
  selected = slug;
}

/** True only the first time it is asked in a visit: the knob's hint is given once. */
export function takeKnobHint(): boolean {
  if (knobShown) return false;
  knobShown = true;
  return true;
}

export function __resetEventsMemoryForTests(): void {
  selected = null;
  knobShown = false;
}
