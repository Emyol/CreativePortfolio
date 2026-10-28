import type { SiteContent } from "@/lib/content/schema";
import { formatDate } from "@/lib/dates";
import { formatTrackNumber, type Track, type TrackId } from "@/lib/tape";

/** Each track's ink: its tape's shell and label band, the dot field and the J-card. */
export const TRACK_INK: Record<TrackId, [number, number, number]> = {
  about: [255, 154, 60],
  events: [70, 110, 255],
  mixtape: [255, 60, 142],
  people: [47, 214, 163],
  made: [214, 160, 70],
  "on-rotation": [150, 100, 255],
};

/** What each tape's label says it holds: UI words, never a claim about the content. */
const KIND: Record<TrackId, string> = {
  about: "liner notes",
  events: "live recordings",
  mixtape: "songs he loves",
  people: "featuring",
  made: "things made",
  "on-rotation": "manga · games · anime",
};

/** The front label printed on a track's tape. */
export function tapeLabel(track: Track): { number: string; title: string; sub: string } {
  return {
    number: formatTrackNumber(track.number),
    title: track.label,
    sub: `SIDE ${track.side.toUpperCase()} · ${KIND[track.id].toUpperCase()}`,
  };
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The B-side label: what is really on the track, counted from the content. */
export function backLabel(id: TrackId, c: SiteContent): string[] {
  switch (id) {
    case "about":
      return ["a letter"];
    case "events": {
      const lines = [count(c.events.length, "live recording", "live recordings")];
      // Dates are YYYY, YYYY-MM or YYYY-MM-DD, so the newest also sorts last as text.
      const newest = c.events.map((e) => e.date).sort().at(-1);
      if (newest) lines.push(`latest ${formatDate(newest)}`);
      return lines;
    }
    case "mixtape":
      return [count(c.music.length, "song", "songs")];
    case "people":
      return [`${c.people.length} on the channels`];
    case "made":
      return [count(c.hobbies.length, "thing", "things")];
    case "on-rotation":
      return [`${c.shelf.length} on the shelf`];
  }
}
