import type { CSSProperties } from "react";
import { DEVICE, pct, type Pt } from "@/lib/device/layout";
import { formatTrackNumber, knobAngle, packDiameters, sideTracks, type SideId, type Track, type TrackId } from "@/lib/tape";
import { Screen } from "./Screen";
import { Sprite } from "./Sprite";
import { TapeKeys } from "./TapeKeys";
import styles from "./Device.module.css";

type Props = {
  tracks: Track[];
  side: SideId;
  current: TrackId | null;
  interactive: boolean;
  /** Overrides what the screen shows (the dock and the deck pass the playing song). */
  screen?: string[];
  className?: string;
};

const { plate, reels, pack, knob } = DEVICE;
const aspect = plate.width / plate.height;
const sq = (size: number): { px: number } => ({ px: Math.round(size * plate.width) });

/** A square layer of `size` (fraction of the plate's width) centred on `at`. */
function centred(at: Pt, size: number): CSSProperties {
  return { left: pct(at.x - size / 2), top: pct(at.y - (size * aspect) / 2), width: pct(size), height: pct(size * aspect) };
}

// Detents sit on a ring just outside the knob's collar.
const DETENT_RING = (knob.size / 2) * 1.3;
function detent(angle: number): CSSProperties {
  const a = (angle * Math.PI) / 180;
  return { left: pct(knob.centre.x + DETENT_RING * Math.sin(a)), top: pct(knob.centre.y - DETENT_RING * Math.cos(a) * aspect) };
}

export function screenLines(tracks: Track[], side: SideId, current: TrackId | null): string[] {
  const own = sideTracks(tracks, side);
  const shown = own.find((t) => t.id === current) ?? own[0];
  const head = `SIDE ${side.toUpperCase()}`;
  return shown ? [head, `${formatTrackNumber(shown.number)} ${shown.label}`] : [head];
}

/**
 * The tape player, top down: rendered layers stacked over the plate, with live text where
 * the device prints or lights something. Reels and packs are moved by useReelMotion.
 */
export function Device({ tracks, side, current, interactive, screen, className }: Props) {
  const own = sideTracks(tracks, side).slice(0, 4);
  const start = packDiameters(0, pack);
  const angle = knobAngle(tracks, side, current);

  return (
    <div className={[styles.device, className].filter(Boolean).join(" ")} data-device data-side={side}>
      <Sprite name="shadow" className={`${styles.full} ${styles.shadow}`} eager />
      <Sprite name="plate" className={styles.full} eager />

      <span className={styles.reelSlot} style={{ ...centred(reels.left, pack.max), scale: String(start.left / pack.max) }} data-pack="left">
        <Sprite name="pack" className={styles.fill} width={sq(pack.max).px} height={sq(pack.max).px} eager />
      </span>
      <span className={styles.reelSlot} style={{ ...centred(reels.right, pack.max), scale: String(start.right / pack.max) }} data-pack="right">
        <Sprite name="pack" className={styles.fill} width={sq(pack.max).px} height={sq(pack.max).px} eager />
      </span>
      <span className={styles.reelSlot} style={centred(reels.left, reels.hub)} data-reel="left">
        <Sprite name="hub" className={styles.fill} width={sq(reels.hub).px} height={sq(reels.hub).px} eager />
      </span>
      <span className={styles.reelSlot} style={centred(reels.right, reels.hub)} data-reel="right">
        <Sprite name="hub" className={styles.fill} width={sq(reels.hub).px} height={sq(reels.hub).px} eager />
      </span>
      <Sprite
        name={side === "a" ? "shell-a" : "shell-b"}
        className={styles.layer}
        style={{ left: pct(DEVICE.cassette.x), top: pct(DEVICE.cassette.y), width: pct(DEVICE.cassette.w), height: pct(DEVICE.cassette.h) }}
        width={1077}
        height={714}
        eager
      />

      <span className={styles.knob} style={{ ...centred(knob.centre, knob.sprite), rotate: `${angle}deg` }} data-knob>
        <Sprite name="knob-mark" className={styles.fill} width={sq(knob.sprite).px} height={sq(knob.sprite).px} eager />
      </span>
      {own.map((t, i) => {
        const a = own.length === 1 ? 0 : -135 + (i * 270) / (own.length - 1);
        return <span key={t.id} className={styles.detent} style={detent(a)} data-detent data-lit={t.id === current ? "" : undefined} aria-hidden="true" />;
      })}

      <Screen
        lines={screen ?? screenLines(tracks, side, current)}
        className={styles.screen}
        style={{ left: pct(DEVICE.screen.x), top: pct(DEVICE.screen.y), width: pct(DEVICE.screen.w), height: pct(DEVICE.screen.h) }}
      />
      <span className={styles.led} style={{ left: pct(DEVICE.led.x), top: pct(DEVICE.led.y) }} data-led aria-hidden="true" />

      <h1
        className={styles.name}
        aria-label="Miel"
        style={{ left: pct(DEVICE.nameplate.x), top: pct(DEVICE.nameplate.y), width: pct(DEVICE.nameplate.w), height: pct(DEVICE.nameplate.h) }}
      >
        <span aria-hidden="true">miel</span>
      </h1>

      <TapeKeys tracks={tracks} side={side} current={current} interactive={interactive} />
    </div>
  );
}
