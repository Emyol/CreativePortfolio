import Link from "next/link";
import { KeysToggle } from "@/components/game/KeysToggle";
import { SoundToggle } from "@/components/game/SoundToggle";
import { DEVICE, type Rect } from "@/lib/device/layout";
import { knobAngle, type SideId, type Track, type TrackId } from "@/lib/tape";
import { Cassette } from "./Cassette";
import { screenLines } from "./Device";
import { Screen } from "./Screen";
import { Sprite } from "./Sprite";
import { TapeKeys } from "./TapeKeys";
import styles from "./Dock.module.css";

type Props = {
  tracks: Track[];
  side: SideId;
  current: TrackId | null;
  /** Shown and interactive; otherwise sunk below the viewport and inert. */
  visible: boolean;
  /** Overrides the screen (now playing, or LIVE on an event page). */
  screen?: string[];
  progress?: number;
  hrefBase?: string;
};

// Four keys across the dock's key bed, as fractions of that bed.
const KEY_W = 0.225;
const GAP = (1 - 4 * KEY_W) / 3;
const DOCK_KEYS: Rect[] = [0, 1, 2, 3].map((i) => ({ x: i * (KEY_W + GAP), y: 0, w: KEY_W, h: 1 }));

const knobCap = DEVICE.knob.size / DEVICE.knob.sprite;

/** The device's control strip, docked: cassette window, screen, knob, keys, and three plain switches. */
export function Dock({ tracks, side, current, visible, screen, progress, hrefBase = "" }: Props) {
  const angle = knobAngle(tracks, side, current);
  return (
    <div className={styles.dock} data-dock data-visible={visible ? "" : undefined} inert={!visible}>
      <div className={styles.window} aria-hidden="true">
        <Cassette side={side} className={styles.cassette} eager={false} />
      </div>

      <Screen lines={screen ?? screenLines(tracks, side, current)} progress={progress} className={styles.screen} />

      <span className={styles.knob} aria-hidden="true" style={{ ["--cap" as string]: String(knobCap) }}>
        <Sprite name="knob" className={styles.knobBody} width={513} height={513} />
        <span className={styles.knobMark} style={{ rotate: `${angle}deg` }} data-knob>
          <Sprite name="knob-mark" className={styles.fill} width={513} height={513} />
        </span>
      </span>

      <div className={styles.keybed}>
        <TapeKeys tracks={tracks} side={side} current={current} interactive={visible} hrefBase={hrefBase} rects={DOCK_KEYS} labels="cap" />
      </div>

      <div className={styles.switches}>
        <Link href="/tracklist" className={styles.list}>list</Link>
        <SoundToggle />
        <KeysToggle />
      </div>
    </div>
  );
}
