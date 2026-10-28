import type { SiteContent } from "./content/schema";

export type TrackId = "about" | "events" | "mixtape" | "people" | "made" | "on-rotation";
export type SideId = "a" | "b";
/** `number` is the track's fixed place on the tape (1..6); it never closes up around empty tracks. */
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

export function hasContent(id: TrackId, c: SiteContent): boolean {
  switch (id) {
    case "about": return c.about.letter.length > 0;
    case "events": return c.events.length > 0;
    case "mixtape": return c.music.length > 0;
    case "people": return c.people.length > 0;
    case "made": return c.hobbies.length > 0;
    case "on-rotation": return c.shelf.length > 0;
  }
}

export const KEY_COUNT = 6;

/** Fixed 1..6 by place on the tape: printed keys cannot renumber. */
export function trackNumber(id: TrackId): number {
  return TRACK_ORDER.findIndex((t) => t.id === id) + 1;
}

/** Empty tracks are not on the tape (no section, a blank key) but the others keep their numbers. */
export function visibleTracks(c: SiteContent): Track[] {
  return TRACK_ORDER.filter((t) => hasContent(t.id, c)).map((t) => ({ ...t, number: trackNumber(t.id) }));
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

export type KeySlot = { index: number; id: TrackId; track: Track | null };

/** Six keys in tape order; a key is blank (`track` null) when its track is empty. */
export function keySlots(tracks: Track[]): KeySlot[] {
  return TRACK_ORDER.map((t, index) => ({ index, id: t.id, track: tracks.find((x) => x.id === t.id) ?? null }));
}

/** The tracks before and after `id` among the visible ones, skipping empty tracks and wrapping round. */
export function neighbours(tracks: Track[], id: TrackId): { prev: Track | null; next: Track | null } {
  const i = tracks.findIndex((t) => t.id === id);
  if (i < 0 || tracks.length < 2) return { prev: null, next: null };
  return { prev: tracks[(i - 1 + tracks.length) % tracks.length], next: tracks[(i + 1) % tracks.length] };
}

export type SideKeySlot = { index: 0 | 1 | 2 | 3; track: Track | null };

/** v1 only (deleted with the v1 device): four keys showing the current side's tracks. */
export function sideKeySlots(tracks: Track[], side: SideId): SideKeySlot[] {
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

/** "1".."6" are fixed positions; an empty track's key does nothing. */
export function trackForKey(key: string, tracks: Track[]): Track | undefined {
  if (!/^[1-6]$/.test(key)) return undefined;
  const id = TRACK_ORDER[Number(key) - 1].id;
  return tracks.find((t) => t.id === id);
}

/** v1 only (deleted with the v1 device): digits follow the current side. */
export function sideTrackForKey(key: string, tracks: Track[], side: SideId): Track | undefined {
  if (!/^[1-4]$/.test(key)) return undefined;
  return sideTracks(tracks, side)[Number(key) - 1];
}

type KeyLike = Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "target">;

export function shouldHandleTrackKey(e: KeyLike): boolean {
  if (e.altKey || e.ctrlKey || e.metaKey) return false;
  // Shift only ever makes a capital B (the flip); with digits it means something else.
  if (e.shiftKey && e.key !== "B") return false;
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
