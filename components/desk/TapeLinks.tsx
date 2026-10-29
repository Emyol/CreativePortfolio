"use client";
import Link from "next/link";
import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { deskHref } from "@/lib/desk/location";
import { TRACK_INK, tapeLabel } from "@/lib/desk/tapeLabel";
import { formatTrackNumber, type Track, type TrackId } from "@/lib/tape";
import { Cassette } from "@/components/device/Cassette";
import { placeAll, unplaceAll, type OverlayHandle, type Project } from "./overlayPlace";
import { tapeInDeck, tapeOnDesk } from "./spriteLayout";
import styles from "./overlays.module.css";

type Props = {
  tracks: Track[];
  base: string;
  current: TrackId | null;
  /** The 3D's projection; null where there is no 3D, and the tapes are drawn as sprites. */
  project: Project | null;
  onHover(id: TrackId | null): void;
  /** Picks the tape up to look at (the 3D's inspect). */
  onInspect?(id: TrackId): void;
  /**
   * A pointer event on a tape link, handed to the 3D: a press, so the tape can be grabbed,
   * thrown or double-clicked; a move, so the 3D lifts the tape actually under the pointer
   * where the links' boxes overlap.
   */
  onPointer?(e: PointerEvent): void;
};

const plain = (e: { button: number; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }) =>
  e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;

/**
 * Every tape on the desk as a real link to its track, laid over the 3D tape and moved onto
 * it every frame (`place`). The keyboard and screen readers use the links; a plain mouse or
 * touch press (and the hover) goes on to the 3D (grab, throw, double-click), while a middle or modified
 * click opens the link as any link does. Without the 3D, the links carry the sprite tapes.
 * Once a tape is in, the others are put away until it comes out.
 */
export const TapeLinks = forwardRef<OverlayHandle, Props>(function TapeLinks({ tracks, base, current, project, onHover, onInspect, onPointer }, ref) {
  const layer = useRef<HTMLElement>(null);
  const latest = useRef(project);
  useEffect(() => {
    latest.current = project;
    if (!project && layer.current) unplaceAll(layer.current);
  }, [project]);

  useImperativeHandle(
    ref,
    () => ({
      place() {
        const p = latest.current;
        if (p && layer.current) placeAll(layer.current, p, (el) => el.dataset.tape as TrackId);
      },
    }),
    [],
  );

  // Only once the links sit on the 3D does the pointer belong to it; before, a link is a link.
  const live = () => !!latest.current && !!onPointer && layer.current?.dataset.placed !== undefined;
  const press = (e: ReactPointerEvent) => {
    if (!live() || !plain(e)) return;
    e.preventDefault();
    onPointer!(e.nativeEvent);
  };
  const move = (e: ReactPointerEvent) => {
    if (live()) onPointer!(e.nativeEvent);
  };
  // Over the 3D the pointer's hover is the 3D's (the moves above); focus always lifts.
  const enter = (id: TrackId | null) => {
    if (!live()) onHover(id);
  };
  // The 3D turns a pointer click into a load (or, twice, a pick-up); Enter still navigates.
  const click = (e: MouseEvent) => {
    if (live() && e.detail > 0 && plain(e)) e.preventDefault();
  };

  const inspectable = !!project && !current && !!onInspect;
  return (
    <nav ref={layer} aria-label="Tapes" className={styles.layer} data-tape-links data-sprite={project ? undefined : ""}>
      {tracks.map((t) => {
        const name = `${formatTrackNumber(t.number)} ${t.label}`;
        const here = t.id === current;
        return (
          <div
            key={t.id}
            className={styles.tape}
            style={here ? tapeInDeck() : tapeOnDesk(t.number)}
            data-box
            data-tape={t.id}
            data-away={current && !here ? "" : undefined}
            onPointerEnter={() => enter(t.id)}
            onPointerLeave={() => enter(null)}
            onFocus={() => onHover(t.id)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onHover(null);
            }}
          >
            <Link
              href={deskHref(base, { track: t.id, event: null })}
              className={styles.tapeLink}
              aria-label={`${name}, tape`}
              aria-current={here ? "page" : undefined}
              draggable={false}
              onPointerDown={press}
              onPointerMove={move}
              onClick={click}
            >
              {!project && <SpriteTape track={t} />}
            </Link>
            {inspectable && (
              <button type="button" className={styles.inspect} aria-label={`inspect ${name}`} onClick={() => onInspect!(t.id)}>
                inspect
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
});

/** A tape drawn flat: the shell and reels, with its label printed as live text. */
function SpriteTape({ track }: { track: Track }) {
  const label = tapeLabel(track);
  return (
    <span className={styles.spriteTape} style={{ "--ink": `rgb(${TRACK_INK[track.id].join(" ")})` } as CSSProperties} aria-hidden="true">
      <Cassette side={track.side} className={styles.cassette} eager={false} />
      <span className={styles.print}>
        <span className={styles.printNumber}>{label.number}</span> {label.title}
      </span>
    </span>
  );
}
