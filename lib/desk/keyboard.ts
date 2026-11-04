import { neighbours, shouldHandleTrackKey, trackForKey, type Track } from "@/lib/tape";
import { deskHref, type DeskLocation } from "./location";

export type KeyLike = Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "target">;

export type DeskKeyAction = { kind: "go"; href: string } | { kind: "back" } | null;

type State = {
  loc: DeskLocation;
  tracks: Track[];
  /** The track shortcuts' toggle (WCAG 2.1.4): off, the digits do nothing. */
  keysOn: boolean;
  /** "" on the site, "/admin/preview" in the preview. */
  base?: string;
};

const modified = (e: KeyLike) => e.altKey || e.ctrlKey || e.metaKey;

/**
 * On the J-card's printed frame (its title, flap and liner), not inside a device, which
 * keeps its own arrow keys, and not in a field.
 */
function onFrame(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest("[data-jcard]") && !target.closest('[data-device], [data-panel="device"]');
}

/**
 * The desk's control grammar for a key press: 1 to 6 load that track (when the track keys
 * are on and the track is on the tape), Esc and Backspace (outside fields) step back one
 * level, and ←/→ on the J-card frame move to the previous or next track.
 */
export function deskKeyAction(e: KeyLike, s: State): DeskKeyAction {
  const base = s.base ?? "";
  if (e.key === "Escape") return modified(e) ? null : { kind: "back" };
  if (e.key === "Backspace") return shouldHandleTrackKey(e) ? { kind: "back" } : null;

  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    const id = s.loc.track;
    if (!id || modified(e) || e.shiftKey || !shouldHandleTrackKey(e) || !onFrame(e.target)) return null;
    const { prev, next } = neighbours(s.tracks, id);
    const to = e.key === "ArrowLeft" ? prev : next;
    return to ? { kind: "go", href: deskHref(base, { track: to.id, event: null }) } : null;
  }

  if (!s.keysOn || !shouldHandleTrackKey(e)) return null;
  const track = trackForKey(e.key, s.tracks);
  if (!track || (track.id === s.loc.track && !s.loc.event)) return null;
  return { kind: "go", href: deskHref(base, { track: track.id, event: null }) };
}
