import type { SiteContent } from "./content/schema";

export type TrackId = "about" | "events" | "mixtape" | "people" | "made" | "on-rotation";
export type SideId = "a" | "b";
/** `number` counts across the whole tape (1..n), closing up around empty tracks. */
export type Track = { id: TrackId; side: SideId; label: string; number: number };

export const TRACK_ORDER: readonly { id: TrackId; side: SideId; label: string }[] = [
  { id: "about", side: "a", label: "about" },
  { id: "events", side: "a", label: "events" },
  { id: "mixtape", side: "a", label: "mixtape" },
  { id: "people", side: "a", label: "people" },
  { id: "made", side: "b", label: "made" },
  { id: "on-rotation", side: "b", label: "on rotation" },
];

const KEYS = 4;
const SWEEP = 270;

function hasContent(id: TrackId, c: SiteContent): boolean {
  switch (id) {
    case "about": return c.about.letter.length > 0;
    case "events": return c.events.length > 0;
    case "mixtape": return c.music.length > 0;
    case "people": return c.people.length > 0;
    case "made": return c.hobbies.length > 0;
    case "on-rotation": return c.shelf.length > 0;
  }
}

/** Empty tracks are not on the tape: no section, no key, and the numbering closes up. */
export function visibleTracks(c: SiteContent): Track[] {
  return TRACK_ORDER.filter((t) => hasContent(t.id, c)).map((t, i) => ({ ...t, number: i + 1 }));
}

export function sideTracks(tracks: Track[], side: SideId): Track[] {
  return tracks.filter((t) => t.side === side);
}

export function sideOf(tracks: Track[], id: TrackId | null): SideId {
  return tracks.find((t) => t.id === id)?.side ?? "a";
}

export function hasSide(tracks: Track[], side: SideId): boolean {
  return tracks.some((t) => t.side === side);
}

export type KeySlot = { index: 0 | 1 | 2 | 3; track: Track | null };

/** The device has four fixed keys; they show the current side's tracks and blank the rest. */
export function keySlots(tracks: Track[], side: SideId): KeySlot[] {
  const own = sideTracks(tracks, side);
  return ([0, 1, 2, 3] as const).map((index) => ({ index, track: own[index] ?? null }));
}

/** One detent per track on the side, spread evenly over a 270° sweep; 0° points up. */
export function knobAngle(tracks: Track[], side: SideId, current: TrackId | null): number {
  const own = sideTracks(tracks, side).slice(0, KEYS);
  const i = own.findIndex((t) => t.id === current);
  if (own.length === 1 && i === 0) return 0;
  if (i < 0) return -SWEEP / 2;
  return -SWEEP / 2 + (i * SWEEP) / (own.length - 1);
}

export function trackForKey(key: string, tracks: Track[], side: SideId): Track | undefined {
  if (!/^[1-4]$/.test(key)) return undefined;
  return sideTracks(tracks, side)[Number(key) - 1];
}

type KeyLike = Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "target">;

export function shouldHandleTrackKey(e: KeyLike): boolean {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
  const t = e.target;
  if (!(t instanceof HTMLElement)) return true;
  if (t.isContentEditable || t.closest('[contenteditable]:not([contenteditable="false"])')) return false;
  return !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}

/**
 * Tape moves from the left pack to the right as the visitor reads. The packs trade area,
 * not diameter, like real tape: diameter for a fill fraction f is sqrt(min² + (max² - min²)·f).
 */
export function packDiameters(progress: number, pack: { min: number; max: number }): { left: number; right: number } {
  const p = Math.min(1, Math.max(0, progress));
  const d = (f: number) => Math.sqrt(pack.min ** 2 + (pack.max ** 2 - pack.min ** 2) * f);
  return { left: d(1 - p), right: d(p) };
}

export const formatTrackNumber = (n: number): string => String(n).padStart(2, "0");
