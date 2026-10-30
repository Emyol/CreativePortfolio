"use client";
import { DEVICE, pct } from "@/lib/device/layout";
import { formatTrackNumber, type Track, type TrackId } from "@/lib/tape";
import { Screen } from "@/components/device/Screen";
import { Sprite } from "@/components/device/Sprite";
import styles from "./overlays.module.css";

const place = (r: { x: number; y: number; w: number; h: number }) => ({ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h) });

/**
 * The player drawn flat (the rendered layers and layout.json), where the 3D can't run: on
 * the desk right of centre, in the deck the corner player. Never a placeholder before the
 * 3D. Its screen and LED say what the 3D's would (the lines the desk hands it, `screen`: the
 * loaded section's own, or the desk's with no tape in); the tapes and keys are the links' own sprites (TapeLinks,
 * PlayerKeys), which share this layout.
 */
export function SpriteDesk({ tracks, current, screen = null }: { tracks: Track[]; current: TrackId | null; screen?: [string, string] | null }) {
  const t = current ? tracks.find((x) => x.id === current) : null;
  const lines = screen ?? (t ? [`${formatTrackNumber(t.number)} ${t.label.toUpperCase()}`, "▶ PLAYING"] : ["NO TAPE", "PICK A TAPE"]);
  return (
    <div className={styles.stage} aria-hidden="true" data-sprite-desk>
      <div className={`${styles.player} ${styles.plate}`} data-state={current ? "deck" : "desk"}>
        <Sprite name="shadow" className={`${styles.full} ${styles.shadow}`} eager />
        <Sprite name="plate" className={styles.full} eager />
        <Screen lines={lines} className={styles.screen} style={place(DEVICE.screen)} />
        <span className={styles.led} style={{ left: pct(DEVICE.led.x), top: pct(DEVICE.led.y) }} data-on={t ? "" : undefined} />
        <span className={styles.nameplate} style={place(DEVICE.nameplate)}>
          miel
        </span>
      </div>
    </div>
  );
}
