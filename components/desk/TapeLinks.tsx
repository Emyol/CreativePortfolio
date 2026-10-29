"use client";
import Link from "next/link";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
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

/** Also marks the tape the 3D lifts (`hot`), which shows its inspect button and brings it on top. */
export type TapeLinksHandle = OverlayHandle & { hot(id: TrackId | null): void };

/**
 * Every tape on the desk as a real link to its track, laid over the 3D tape and moved onto
 * it every frame (`place`). The keyboard and screen readers use the links; over the 3D a
 * plain mouse or touch press (and the hover) goes on to the 3D (grab, throw, double-click),
 * while a middle or modified click opens the link as any link does. The tape the 3D lifts,
 * or the focused one, offers an inspect button once the 3D is there. Without the 3D, the
 * links carry the sprite tapes. Once a tape is in, the others are put away until it comes out.
 */
export const TapeLinks = forwardRef<TapeLinksHandle, Props>(function TapeLinks({ tracks, base, current, project, onHover, onInspect, onPointer }, ref) {
  const layer = useRef<HTMLElement>(null);
  const latest = useRef(project);
  // The 3D has drawn a frame: its scene is ready, so inspect works and presses are its.
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  useEffect(() => {
    latest.current = project;
    if (project || !layer.current) return;
    unplaceAll(layer.current);
    layer.current.querySelectorAll<HTMLElement>("[data-hot]").forEach((el) => delete el.dataset.hot);
    readyRef.current = false;
    setReady(false);
  }, [project]);

  useImperativeHandle(
    ref,
    () => ({
      place() {
        const p = latest.current;
        if (!p || !layer.current) return;
        placeAll(layer.current, p, (el) => el.dataset.tape as TrackId);
        if (!readyRef.current) {
          readyRef.current = true;
          setReady(true);
        }
      },
      hot(id) {
        layer.current?.querySelectorAll<HTMLElement>("[data-tape]").forEach((el) => {
          const on = el.dataset.tape === id;
          if (on && el.dataset.hot === undefined) el.dataset.hot = "";
          else if (!on && el.dataset.hot !== undefined) delete el.dataset.hot;
        });
      },
    }),
    [],
  );

  // Only once the links sit on the 3D does the pointer belong to it; before, a link is a link.
  const live = () => !!latest.current && !!onPointer && layer.current?.dataset.placed !== undefined;
  // A press handed to the 3D: its click is the 3D's (a load, or twice a pick-up), so the
  // link must not navigate as well. Only that click: any other activation is the link's.
  const handed = useRef(false);
  const press = (e: ReactPointerEvent) => {
    if (!live() || !plain(e)) return;
    e.preventDefault();
    handed.current = true;
    // The click (wherever pointer capture sends it) follows the release in the same task.
    const done = () => {
      window.removeEventListener("pointerup", done, true);
      window.removeEventListener("pointercancel", done, true);
      window.setTimeout(() => (handed.current = false), 0);
    };
    window.addEventListener("pointerup", done, true);
    window.addEventListener("pointercancel", done, true);
    onPointer!(e.nativeEvent);
  };
  const click = (e: MouseEvent) => {
    if (!handed.current) return;
    handed.current = false;
    if (e.detail > 0 && plain(e)) e.preventDefault();
  };
  const move = (e: ReactPointerEvent) => {
    if (live()) onPointer!(e.nativeEvent);
  };
  // Over the 3D the pointer's hover is the 3D's (the moves above); focus always lifts.
  const enter = (id: TrackId | null) => {
    if (!live()) onHover(id);
  };

  const inspectable = ready && !!project && !current && !!onInspect;
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
              <button
                type="button"
                className={styles.inspect}
                aria-label={`inspect ${name}`}
                // On its button the pointer has left the 3D, which would drop the tape.
                onPointerEnter={() => onHover(t.id)}
                onClick={() => onInspect!(t.id)}
              >
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
      <span className={styles.print} data-print>
        <span className={styles.printNumber}>{label.number}</span> {label.title}
      </span>
    </span>
  );
}
