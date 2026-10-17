import type { CSSProperties } from "react";
import { DEVICE, pct, type Rect } from "@/lib/device/layout";
import { keySlots, type SideId, type Track, type TrackId } from "@/lib/tape";
import { Sprite } from "./Sprite";
import styles from "./TapeKeys.module.css";

type Props = {
  tracks: Track[];
  side: SideId;
  current: TrackId | null;
  interactive: boolean;
  /** "" on the home page; "/" elsewhere so keys go back to the tape. */
  hrefBase?: "" | "/";
  /** Positions in this box (the plate by default); the dock passes its own key rects. */
  rects?: readonly Rect[];
  /** Where the label is printed: under the key on the plate, or on the cap in the dock. */
  labels?: "under" | "cap";
  className?: string;
};

const place = (r: Rect): CSSProperties => ({ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h) });

// The key sprite carries its shadow beyond the cap; this is its overhang as a share of the cap.
const pad = {
  x: DEVICE.keyPad.x / DEVICE.keys[0].w,
  y: DEVICE.keyPad.y / DEVICE.keys[0].h,
};
const capSprite: CSSProperties = {
  left: pct(-pad.x),
  top: pct(-pad.y),
  width: pct(1 + 2 * pad.x),
  height: pct(1 + 2 * pad.y),
};

/**
 * Four fixed keys on the plate. They show the current side's tracks; a key with no track
 * is a blank cap. The track being read stays latched down, like a deck's play key.
 */
export function TapeKeys({ tracks, side, current, interactive, hrefBase = "", rects = DEVICE.keys, labels = "under", className }: Props) {
  return (
    <nav aria-label="Tape" className={[styles.keys, className].filter(Boolean).join(" ")} inert={!interactive} data-tape-keys>
      {keySlots(tracks, side).map(({ index, track }) => {
        const caps = (
          <>
            <Sprite name="key-up" className={styles.cap} style={capSprite} width={324} height={251} eager />
            <Sprite name="key-down" className={styles.capDown} style={capSprite} width={324} height={251} eager />
          </>
        );
        if (!track) {
          return (
            <span key={index} className={styles.slot} style={place(rects[index])} aria-hidden="true" data-blank-key>
              {caps}
            </span>
          );
        }
        const latched = current === track.id;
        return (
          <a
            key={track.id}
            href={`${hrefBase}#${track.id}`}
            className={styles.slot}
            style={place(rects[index])}
            aria-current={latched ? "true" : undefined}
            data-key-index={index}
            data-latched={latched ? "" : undefined}
          >
            {caps}
            <span className={labels === "cap" ? styles.capLabel : styles.label}>{track.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
