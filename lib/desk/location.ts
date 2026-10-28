import { TRACK_ORDER, type TrackId } from "@/lib/tape";

export type DeskLocation = { track: TrackId | null; event: string | null };

const NONE: DeskLocation = { track: null, event: null };

function isTrackId(s: string | undefined): s is TrackId {
  return TRACK_ORDER.some((t) => t.id === s);
}

/** Maps a pathname to desk state. `base` is "" (public) or "/admin/preview". */
export function parseDeskPath(pathname: string, base: string): DeskLocation {
  let rest = pathname;
  if (base) {
    if (rest !== base && !rest.startsWith(`${base}/`)) return NONE;
    rest = rest.slice(base.length);
  }
  const [seg, slug] = rest.split("/").filter(Boolean);
  if (!isTrackId(seg)) return NONE;
  return { track: seg, event: seg === "events" && slug ? slug : null };
}

/** The real path for a desk state. */
export function deskHref(base: string, loc: DeskLocation): string {
  if (!loc.track) return base || "/";
  const slug = loc.track === "events" && loc.event ? `/${loc.event}` : "";
  return `${base}/${loc.track}${slug}`;
}

/** Old `/#events` links become real paths; anything else returns null. */
export function hashRedirect(pathname: string, hash: string, base: string): string | null {
  if (pathname !== (base || "/")) return null;
  const id = hash.replace(/^#/, "");
  return isTrackId(id) ? deskHref(base, { track: id, event: null }) : null;
}
