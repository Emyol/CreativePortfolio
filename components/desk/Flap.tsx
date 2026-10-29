import Link from "next/link";
import { deskHref } from "@/lib/desk/location";
import { TRACK_ORDER, formatTrackNumber, trackNumber, type SideId, type Track, type TrackId } from "@/lib/tape";
import styles from "./JCard.module.css";

type Props = { tracks: Track[]; base: string; current: TrackId | null };

/**
 * The J-card's left flap: the tape's tracklist printed as on a real J-card, side A then
 * side B, the playing track marked. It is the tape's navigation too: every track with
 * something on it is a link (on a track page it is how the keyboard reaches tracks the
 * player's keys don't draw); an empty track is printed, not linked, and keeps its number.
 */
export function Flap({ tracks, base, current }: Props) {
  const row = (id: TrackId, label: string) => {
    const name = `${formatTrackNumber(trackNumber(id))} ${label}`;
    if (!tracks.some((t) => t.id === id)) {
      return (
        <li key={id} className={styles.row} data-empty>
          <span className={styles.rowText}>{name}</span>
        </li>
      );
    }
    const here = id === current;
    return (
      <li key={id} className={styles.row}>
        <Link
          href={deskHref(base, { track: id, event: null })}
          className={styles.rowLink}
          aria-current={here ? "page" : undefined}
          data-current={here ? "" : undefined}
        >
          {name}
        </Link>
      </li>
    );
  };
  const side = (s: SideId) => TRACK_ORDER.filter((t) => t.side === s);
  return (
    <nav aria-label="Tape" className={styles.flap} data-panel="flap">
      <h3 className={styles.side}>SIDE A</h3>
      <ol className={styles.list}>{side("a").map((t) => row(t.id, t.label))}</ol>
      <h3 className={styles.side}>SIDE B</h3>
      <ol className={styles.list} start={side("a").length + 1}>
        {side("b").map((t) => row(t.id, t.label))}
      </ol>
    </nav>
  );
}
