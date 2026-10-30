"use client";
import Link from "next/link";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { DEVICE, pct } from "@/lib/device/layout";
import { deskHref } from "@/lib/desk/location";
import { formatTrackNumber, keySlots, type Track, type TrackId } from "@/lib/tape";
import { Sprite } from "@/components/device/Sprite";
import { placeAll, unplaceAll, type OverlayHandle, type Project } from "./overlayPlace";
import { keyOnPlate } from "./spriteLayout";
import styles from "./overlays.module.css";

type Props = {
  tracks: Track[];
  base: string;
  current: TrackId | null;
  /** The 3D's projection; null where there is no 3D, and the keys are drawn as sprites. */
  project: Project | null;
  /** A wheel over a key, handed to the 3D's knob (the keys sit on the player). */
  onWheel?(e: WheelEvent): void;
};

// Until the six-key model lands (phase 1), only the keys the model has are drawn; the rest
// exist only in the transport.
const DRAWN = DEVICE.keys.length;

/**
 * The player's keys as real links, one per track in tape order (key N loads track N), laid
 * over the 3D keys and moved onto them every frame (`place`). An empty track's key is a
 * blank cap that does nothing. The playing track's key is latched. Without the 3D, the
 * links carry the sprite caps and their printed labels.
 */
export const PlayerKeys = forwardRef<OverlayHandle, Props>(function PlayerKeys({ tracks, base, current, project, onWheel }, ref) {
  const layer = useRef<HTMLDivElement>(null);
  const latest = useRef(project);
  useEffect(() => {
    latest.current = project;
    if (!project && layer.current) unplaceAll(layer.current);
  }, [project]);

  // Not React's onWheel: that listener is passive, and the knob's turn must stop the scroll.
  useEffect(() => {
    const el = layer.current;
    if (!el || !onWheel) return;
    const wheel = (e: WheelEvent) => {
      if (e.target instanceof Element && e.target.closest("[data-key]")) onWheel(e);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [onWheel]);

  useImperativeHandle(
    ref,
    () => ({
      place() {
        const p = latest.current;
        if (p && layer.current) placeAll(layer.current, p, (el) => `key${Number(el.dataset.key)}` as const);
      },
    }),
    [],
  );

  const slots = keySlots(tracks).slice(0, DRAWN);
  const sprite = !project;
  // A tape with nothing on these keys offers no navigation, so no landmark either.
  const Box = slots.some((s) => s.track) ? "nav" : "div";
  return (
    <div ref={layer} className={styles.layer} data-player-keys data-sprite={sprite ? "" : undefined}>
      <Box aria-label={Box === "nav" ? "Player keys" : undefined} className={styles.player} data-state={current ? "deck" : "desk"}>
        {slots.map(({ index, track }) => {
          if (!track) {
            return (
              <span key={index} className={styles.key} style={keyOnPlate(index)} aria-hidden="true" data-box data-key={index} data-blank-key>
                {sprite && <Cap />}
              </span>
            );
          }
          const latched = track.id === current;
          return (
            <Link
              key={track.id}
              href={deskHref(base, { track: track.id, event: null })}
              className={styles.key}
              style={keyOnPlate(index)}
              aria-label={`${formatTrackNumber(track.number)} ${track.label}, key`}
              aria-current={latched ? "page" : undefined}
              draggable={false}
              data-box
              data-key={index}
              data-latched={latched ? "" : undefined}
            >
              {sprite && (
                <>
                  <Cap />
                  <span className={styles.keyLabel} aria-hidden="true">
                    {track.label}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </Box>
    </div>
  );
});

// The key sprite carries its shadow beyond the cap.
const pad = { x: DEVICE.keyPad.x / DEVICE.keys[0].w, y: DEVICE.keyPad.y / DEVICE.keys[0].h };
const capSprite = { left: pct(-pad.x), top: pct(-pad.y), width: pct(1 + 2 * pad.x), height: pct(1 + 2 * pad.y) };

/** Both cap states, stacked; the latched key shows the one pressed down. */
function Cap() {
  return (
    <span className={styles.cap} aria-hidden="true">
      <Sprite name="key-up" className={styles.capUp} style={capSprite} width={324} height={251} />
      <Sprite name="key-down" className={styles.capDown} style={capSprite} width={324} height={251} />
    </span>
  );
}
