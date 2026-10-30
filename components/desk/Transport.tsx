"use client";
import Link from "next/link";
import { KeysToggle } from "@/components/game/KeysToggle";
import { SoundToggle } from "@/components/game/SoundToggle";
import toggleStyles from "@/components/game/SoundToggle.module.css";
import { deskHref } from "@/lib/desk/location";
import { setNight, useNight } from "@/lib/desk/night";
import { formatTrackNumber, neighbours, type Track, type TrackId } from "@/lib/tape";
import styles from "./Transport.module.css";

type Props = { tracks: Track[]; base: string; current: TrackId | null };

const name = (t: Track) => `${formatTrackNumber(t.number)} ${t.label}`;

/**
 * The player's transport in the DOM, for clarity and access: the previous track, eject and
 * the next track (the neighbours named, empty tracks skipped), then sound, night and the
 * track keys' switch. It sits in the deck's left column, between the J-card's flap and the
 * corner player, in a box of its own fixed height (`--transport-h`) that the flap leaves
 * free, so it never covers a control or text.
 */
export function Transport({ tracks, base, current }: Props) {
  if (!current) return null;
  const { prev, next } = neighbours(tracks, current);
  return (
    <nav aria-label="Transport" className={styles.transport} data-transport>
      <div className={styles.row}>
        {prev ? (
          <Link href={deskHref(base, { track: prev.id, event: null })} className={styles.skip} aria-label={`previous track, ${name(prev)}`}>
            <span aria-hidden="true">◀◀</span>
            <span className={styles.label}>{name(prev)}</span>
          </Link>
        ) : (
          <span />
        )}
        <Link href={deskHref(base, { track: null, event: null })} className={styles.eject} aria-label="eject">
          <span aria-hidden="true">⏏</span>
        </Link>
        {next ? (
          <Link href={deskHref(base, { track: next.id, event: null })} className={`${styles.skip} ${styles.next}`} aria-label={`next track, ${name(next)}`}>
            <span className={styles.label}>{name(next)}</span>
            <span aria-hidden="true">▶▶</span>
          </Link>
        ) : (
          <span />
        )}
      </div>
      <div className={styles.tools}>
        <SoundToggle />
        <NightToggle />
        <KeysToggle />
      </div>
    </nav>
  );
}

/** The transport's night key: the same switch as the lamp cord. */
function NightToggle() {
  const on = useNight();
  return (
    <button type="button" className={toggleStyles.toggle} aria-pressed={on} onClick={() => setNight(!on)}>
      Night<span aria-hidden="true">{on ? "on" : "off"}</span>
    </button>
  );
}
